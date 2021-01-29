class MemoryAlert {
    private static _instance: MemoryAlert;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _turnOffRedMemoryAlert: boolean;
    private _isCheckingMem: boolean;
    private _disableRedMemoryAlert: boolean;

    private constructor() {
        this._turnOffRedMemoryAlert = true;
        this._isCheckingMem = false;
        this._disableRedMemoryAlert = false;
    }

    public setup(): void {
        this._getMemoryAlertEl().click((e) => {
            if ($("#container").hasClass("noWorkbook") ||
                $("#container").hasClass("switchingWkbk")) {
                return;
            }
            let $el = $(e.currentTarget);
            $el.blur();

            $("#monitor-delete").click();
        });
    }

    /**
     * MemoryAlert.Instance.detectUsage
     * @param topOutput
     */
    public detectUsage(topOutput: any): XDPromise<void> {
        let highestMemUsage: number = 0;
        let used: number = 0;
        let total: number = 0;
        let numNodes: number = topOutput.numNodes;

        for (let i = 0; i < numNodes; i++) {
            const node: any = topOutput.topOutputPerNode[i];
            const xdbUsage: number = node.xdbUsedBytes / node.xdbTotalBytes;

            used += node.xdbUsedBytes;
            total += node.xdbTotalBytes;

            highestMemUsage = Math.max(highestMemUsage, xdbUsage);
        }

        let avgUsg: number = used / total;
        if (isNaN(avgUsg)) {
            avgUsg = 0;
        }

        const shouldAlert: boolean = this.handleMemoryUsage(highestMemUsage, avgUsg);
        if (shouldAlert) {
            return PromiseHelper.alwaysResolve(TblManager.refreshOrphanList());
        } else {
            return PromiseHelper.resolve();
        }
    }

    /**
    *  MemoryAlert.Instance.check
    * @param onlyCheckOnWarn
    */
    public check(onlyCheckOnWarn: boolean = false): XDPromise<void> {
        if (this._isCheckingMem) {
            console.warn("Last time's memory check not finish yet");
            return PromiseHelper.resolve();
        } else if (onlyCheckOnWarn && !this.hasMemoryWarn()) {
            // this case no need to check
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._isCheckingMem = true;

        this.refreshTables()
            .then(XcalarApiTop)
            .then((topOutPut) => {
                return this.detectUsage(topOutPut);
            })
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(() => {
                this._isCheckingMem = false;
            });

        return deferred.promise();
    }

    private _getMemoryAlertEl(): JQuery {
        return $("#memoryAlert");
    }

    private hasMemoryWarn(): boolean {
        let $memoryAlert: JQuery = this._getMemoryAlertEl();
        return ($memoryAlert.hasClass("yellow") ||
            $memoryAlert.hasClass("red"));
    }

    private refreshTables(): XDPromise<void> {
        if (WorkbookManager.getActiveWKBK() == null) {
            return PromiseHelper.resolve();
        } else if (this.hasNoTables()) {
            // no tables, need a refresh
            var promise = TblManager.refreshOrphanList();
            return PromiseHelper.alwaysResolve(promise);
        } else {
            return PromiseHelper.resolve();
        }
    }

    private redMemoryAlert(): void {
        if (this._turnOffRedMemoryAlert ||
            this._disableRedMemoryAlert ||
            Alert.isOpen()
        ) {
            return;
        }

        const instr: string = xcStringHelper.replaceMsg(MonitorTStr.LowMemInstr, {
            link: paths.memory
        });
        Alert.show({
            title: MonitorTStr.LowMem,
            instrTemplate: instr,
            msg: MonitorTStr.LowMemMsg,
            isAlert: true,
            isCheckBox: true,
            buttons: [{
                name: MonitorTStr.ClearMemOption,
                className: "clear memory",
                func: (checked) => {
                    this._turnOffRedMemoryAlert = checked;
                    DagTblManager.Instance.emergencyClear()
                    .always(() => {
                        MemoryAlert.Instance.check();
                    });
                    this.disableAlertInPeriod();
                }
            }],
            onCancel: (checked) => {
                this._turnOffRedMemoryAlert = checked;
                this.disableAlertInPeriod();
            }
        });
    }

    private disableAlertInPeriod(): void {
        // in case user is in the memory panel and always see the alert
        this._disableRedMemoryAlert = true;
        let time: number = 60000; // disable for 1min
        setTimeout(() => {
            this._disableRedMemoryAlert = false;
        }, time);
    }

    private handleMemoryUsage(
        highestMemUsage: number,
        avgMemUsage: number
    ): boolean {
        const autoTableThreshold: number = 0.3;
        const yellowThreshold: number = 0.6;
        const redThreshold: number = 0.8;

        let $memoryAlert: JQuery = this._getMemoryAlertEl();
        $memoryAlert.removeClass("inActive");

        let shouldAlert: boolean = false;
        if (highestMemUsage > redThreshold) {
            DagTblManager.Instance.setClockTimeout(60);
            // when it's red, can stop loop immediately
            $memoryAlert.addClass("red").removeClass("yellow");
            shouldAlert = true;
            this.redMemoryAlert();
        } else if (highestMemUsage > yellowThreshold) {
            DagTblManager.Instance.setClockTimeout(120);
            // when it's yellow, should continue loop
            // to see if it has any red case
            $memoryAlert.addClass("yellow").removeClass("red");
            shouldAlert = true;
        } else {
            if (highestMemUsage > autoTableThreshold) {
                DagTblManager.Instance.setClockTimeout(240);
            } else {
                DagTblManager.Instance.setClockTimeout(-1);
            }
            $memoryAlert.removeClass("red").removeClass("yellow");
        }

        const highPercent: string = Math.round(highestMemUsage * 100) + "%";
        const percent: string = Math.round(avgMemUsage * 100) + "%";
        const highestUsageText: string = "<br>" +
            CommonTxtTstr.HighXcalarMemUsage + ": " + highPercent;
        const avgUsageText: string = "<br>" + CommonTxtTstr.AverageXcalarMemUsage + ": " + percent;

        let text: string;
        if (shouldAlert) {
            // we want user to drop table first and only when no tables
            // let them drop ds
            text = TooltipTStr.LowMemInTable + highestUsageText + avgUsageText;
            $memoryAlert.addClass("tableAlert");
        } else {
            text = CommonTxtTstr.XcalarMemUsage + ": " + percent;
        }

        let iconPct = Math.round(Math.max(15, 100 - (avgMemUsage * 100))) + "%";
        $memoryAlert.find(".memoryBoxFill").css("height", iconPct);

        xcTooltip.changeText($memoryAlert, text);
        return shouldAlert;
    }

    private hasNoTables(): boolean {
        let noTable: boolean = false;
        try {
            noTable = jQuery.isEmptyObject(gTables) &&
                gOrphanTables.length === 0 &&
                !DagTblManager.Instance.hasTables();
        } catch (e) {
            console.error(e);
        }
        return noTable;
    }
}

if (typeof runEntity !== "undefined") {
    runEntity.MemoryAlert = MemoryAlert;
}