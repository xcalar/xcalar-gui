namespace TooltipWalkthroughs {
    export function startWorkbookBrowserWalkthrough(): void {
        setupInitialWalkthroughCheck()
        .then(() => {
            // cloud admin don't show workthrought as it's for support
            workbookWalkthrough();
        })
    }

    export function newUserPopup(): void {
        TooltipWalkthroughs.start(DemoTStr.title);
    }

    export function workbookWalkthrough(): void {
        TooltipWalkthroughs.start(WKBKTStr.Location);
    }

    /**
     * TooltipWalkthroughs.list
     * list all the available walkthroughs
     */
    export function list(): string[] {
        const names = [];
        for (let name in Walkthroughs) {
            names.push(name);
        }
        return names;
    }

    /**
     * TooltipWalkthroughs.start
     * Given a walkthrough name, starts the corresponding walkthrough.
     * @param name
     */
    export function start(name: string): string {
        // if (WorkbookPanel.isWBMode() && name !== WKBModeName) {
        //     if (WorkbookManager.getActiveWKBK() != null) {
        //         // if we're in a workbook, but on the workbook screen, we just go back to it
        //         $("#homeBtn").click();
        //     } else {
        //         // If we aren't in a workbook, we need to open one.
        //         return TooltipTStr.TooltipNoWorkbook;
        //     }
        // }
        const walkthrough = Walkthroughs[name];
        if (!walkthrough) {
            throw new Error(`Walkthrough ${name} doesn't exist`);  
        }
        const { basic, extra, steps } = walkthrough;
        TooltipManager.start(basic, steps, 0, extra);
        return "";
    }

    /**
     * Sets up to see if any tooltip walkthroughs need to be automatically started
     */
    export function setupInitialWalkthroughCheck(): JQueryPromise<void> {
        if (typeof window !== 'undefined' && window['unitTestMode']) {
            return PromiseHelper.resolve();
        }
        return PromiseHelper.resolve();

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const key: string = KVStore.getKey("gUserTooltipKey");
        const kvStore: KVStore = new KVStore(key, gKVScope.USER);
        kvStore.getAndParse()
        .then((tooltipObj) => {
            if (tooltipObj != null) {
                // showWorkbook = tooltipObj.showWorkbook;
                // seenSQL = tooltipObj.seenSQL;
                // seenDataflow = tooltipObj.seenDataflow;
            }
        })
        .fail((error) => {
            console.error('kvStore.getAndParse() error: ', error);
            // showWorkbook = false;
        })
        .always(deferred.resolve);

        return deferred.promise();
    }

    // export function setShowWorkbook(flag: boolean) {
        // showWorkbook = flag;
        // storeTooltipObj();
    // }

    // function storeTooltipObj(): JQueryPromise<void> {
        // let tooltipObj: TooltipStoredInfo = {
        //     showWorkbook: showWorkbook,
        //     seenSQL: seenSQL,
        //     seenDataflow: seenDataflow
        // }
        // const key: string = KVStore.getKey("gUserTooltipKey");
        // const kvStore: KVStore = new KVStore(key, gKVScope.USER);
        // return kvStore.put(JSON.stringify(tooltipObj), true);
    // }
}