class ClusterStatusModal {
    private static _instance: ClusterStatusModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private readonly _Logs: string = "Logs"

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true
        });

        this._addEventListeners();
    }


    /**
     * ClusterStatusModal.Instance.show
     * @param logs
     */
    public show(logs: string): void {
        this._clear();
        this._modalHelper.setup();
        this._render(logs);
        this._sizeToText();
    }

    private _close(): void {
        this._modalHelper.clear();
        this._clear();
    }

    private _clear(): void {
        this._getModal().find(".instr").empty();
        this._getModal().find(".content").empty();
    }

    private _getModal(): JQuery {
        return $("#clusterStatusModal");
    }

    private _render(logs: string): void {
        let content: HTML = logs;
        let numNodes: number = 0;
        try {
            let parsedLogs = this._parseLogs(logs);
            numNodes = parsedLogs.length;
            content = parsedLogs.map((logItems) => {
                return '<div class="section">' +
                    logItems.map((item) => {
                        let html: HTML = "";
                        if (item.key === this._Logs) {
                            html = '<div class="key row">' +
                                        item.key + ': ' +
                                    '</div>' +
                                    '<div class="val row">' +
                                        item.val +
                                    '</div>';
                        } else {
                            html = '<div class="row">' +
                                        '<span class="key">' +
                                            item.key + ': ' +
                                        '</span>' +
                                        '<span class="val">' +
                                            item.val +
                                        '</span>' +
                                    '</div>';
                        }
                        return html;
                    }).join("") +
                '</div>';
            }).join("");
        } catch (e) {
            console.error(e);
        }
        this._getModal().find(".instr").html(this._getInstruction(numNodes));
        this._getModal().find(".content").html(content);
    }

    private _parseLogs(logs: string): {key: string, val: string}[][] {
        let res: {key: string, val: string}[][] = [];
        // start from the first Host line
        logs = logs.slice(logs.indexOf("Host"));
        while (logs.length) {
            let index = logs.indexOf("Host", 1);
            if (index === -1) {
                index = logs.length;
            }
            let splitLog: string = logs.slice(0, index).trim();
            res.push(this._parseOneLog(splitLog));
            logs = logs.slice(index, logs.length);
        }
        return res;
    }

    private _parseOneLog(log: string): {key: string, val: string}[] {
        let splitLogs: string[] = log.split("\n");
        let index = 0;
        let res = [];
        while (index < splitLogs.length) {
            let splitLog: string = splitLogs[index].trim();
            if (splitLog.length) {
                let [key, val] = splitLog.split(":");
                if (key === this._Logs) {
                    val = splitLogs.slice(index + 1).join("\n").trim();
                    index = splitLogs.length;
                } else {
                    val = val.trim();
                }
                res.push({key, val});
            }
            index++;
        }
        return res;
    }

    private _getInstruction(numNodes: number): HTML {
        if (numNodes === 1) {
            return "Getting cluster status for the node";
        } else if (numNodes > 1) {
            return `Getting cluster status for all <span class="semibold">${numNodes}</span> nodes`;
        } else {
            return "Getting cluster status for all nodes";
        }
    }

    private _sizeToText(): void {
        let $modal: JQuery = this._getModal();
        let $section: JQuery = $modal.find(".modalMain");
        let diff: number = $section.find(".content").height() - $section.height();
        if (diff !== 0) {
            const minHeight = parseInt($modal.css("minHeight"));
            const maxHeight = parseInt($modal.css("maxHeight"));
            let height: number = Math.max($modal.height() + diff, minHeight);
            height = Math.min(height, maxHeight);
            $modal.height(height);
            this._modalHelper.center();
        }
    }

    private _addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });
    }
}