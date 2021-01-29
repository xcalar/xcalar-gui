class DagPanel {
    private static _instance: DagPanel;
    private _setup: boolean = false;
    private _popup: PopupPanel;
    private _bottomContainerPopup: PopupPanel;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }
    /**
     * DagPanel.Instance.setup
     */
    public setup(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let hasAfterLoadCalled: boolean = false;

        this._beforeLoad();
        DagTabManager.Instance.on("afterFirstTabLoad", () => {
            // when the first tab loaded, can go into afterLoad State
            hasAfterLoadCalled = true;
            this._afterLoad();
        });

        this._basicSetup()
        .then(() => {
            return this._loadTabs();
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error("DagPanel initialize fails", error);
            Alert.show({
                title: DFTStr.SetupFail,
                msg: DFTStr.SetupFailsMsg,
                isAlert: true,
                detail: xcHelper.parseError(error)
            });
            deferred.reject(error);
        })
        .always(() => {
            this._setup = true;
            if (!hasAfterLoadCalled) {
                this._afterLoad();
            }
        });

        return deferred.promise();
    }

    /**
     * DagPanel.hasSetup
     */
    public hasSetup(): boolean {
        return this._setup;
    }

    public isDocked(): boolean {
        return this._popup.isDocked();
    }

    public toggleDisplay(display?: boolean): void {
        const $container = $("#dagViewContainer").parent();
        if (display == null) {
            display = $container.hasClass("xc-hidden");
        }

        const $tab = $("#appBuilderTab");
        if (display) {
            $tab.addClass("active");
            $container.removeClass("xc-hidden");
            PopupManager.checkAllContentUndocked();
            this._popup.trigger("Show_BroadCast");
            DagCategoryBar.Instance.showOrHideArrows();
        } else {
            $tab.removeClass("active");
            $container.addClass("xc-hidden");
            PopupManager.checkAllContentUndocked();
            this._popup.trigger("Hide_BroadCast");
        }
    }

    private _basicSetup(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        DagParamPopup.Instance.setup();
        this._updateSetupStatus("Initializing Aggregates");

        DagAggManager.Instance.setup()
        .then(() => {
            this._updateSetupStatus("Initializing Modules");
            return DagTblManager.Instance.setup();
        })
        .then(() => {
            DagViewManager.Instance.setup();
            DagSearch.Instance.setup();
            return DagList.Instance.setup();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _loadTabs(): XDPromise<void> {
        return PromiseHelper.alwaysResolve(DagTabManager.Instance.setup());
    }

    private _getDagViewEl(): JQuery {
        return $("#dagView");
    }

    private _getLoadSectionEl(): JQuery {
        return this._getDagViewEl().find(".loadingSection");
    }

    private _beforeLoad(): void {
        DagList.Instance.toggleDisable(true);
        DagGraphBar.Instance.toggleDisable(true);
        DagTabManager.Instance.toggleDisable(true);
        this._getDagViewEl().append(this._generateLoadingSection());
    }

    private _afterLoad(): void {
        DagList.Instance.toggleDisable(false);
        DagGraphBar.Instance.toggleDisable(false);
        DagTabManager.Instance.toggleDisable(false);
        DagTabManager.Instance.scrollToActiveTab();
        this._getLoadSectionEl().remove();
    }

    private _updateSetupStatus(msg: string): void {
        this._getLoadSectionEl().find(".text").text(msg);
    }

    private _generateLoadingSection(): HTML {
        let html: HTML = xcUIHelper.getLoadingSectionHTML("", "loadingSection");
        return html;
    }

    public setupPopup() {
        this._popup = new PopupPanel("dagViewContainer", {
            draggableHeader: ".draggableHeader"
        });
        this._popup
        .on("Undock", () => {
            DagCategoryBar.Instance.showOrHideArrows();
        })
        .on("Dock", () => {
            DagCategoryBar.Instance.showOrHideArrows();
        })
        .on("Show", () => {
            this.toggleDisplay(true);
        });

        this._bottomContainerPopup = new PopupPanel("notebookBottomContainer", {
            noUndock: true
        });

        this._bottomContainerPopup
        .on("ResizeDocked", (state) => {
            $("#notebookBottomContainer").css("height", `${state.dockedHeight}%`);
        });

        $("#dagView .categoryBar").find(".close").click(() => {
            this.toggleDisplay(false);
        });
    }

    public getBottomContainerPopup() {
        return this._bottomContainerPopup;
    }

    /* Unit Test Only */
    public __testOnly__: any = {};
}