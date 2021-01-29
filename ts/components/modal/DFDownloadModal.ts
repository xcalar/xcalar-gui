class DFDownloadModal {
    private static _instance: DFDownloadModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _downloadType: string;
    private _dagTab: DagTab;
    private _selectedNodes: DagNodeId[];
    private _modalHelper: ModalHelper;
    private _model: {type: string, text: string, suffix: string}[];
    private readonly _DownloadTypeEnum = {
        DF: "DF",
        OptimizedDF: "OptimizedDF",
        Image: "Image",
        OperationStats: "Operation Statistics"
    };

    private constructor() {
        const $modal: JQ_setupModeluery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

    public show(dagTab: DagTab, nodeIds?: DagNodeId[]): void {
        if (nodeIds != null) {
            this._selectedNodes = nodeIds;
        }

        this._dagTab = dagTab;
        this._modalHelper.setup();
        this._setupModel();
        this._renderDropdown();
        this._initialize();
    }

    private _close() {
        const $modal: JQuery = this._getModal();
        this._modalHelper.clear();
        this._dagTab = null;
        this._selectedNodes = null;
        this._downloadType = null;
        $modal.find("input").val("");
        xcTooltip.hideAll();
    }

    private _getModal(): JQuery {
        return $("#dfDownloadModal");
    }

    private _getDownloadTypeList(): JQuery {
        return this._getModal().find(".format .dropDownList");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find(".name input");
    }

    private _setupModel(): void {
        this._model = [{
            type: this._DownloadTypeEnum.DF,
            text: DFTStr.DF,
            suffix: gDFSuffix
        },
        {
            type: this._DownloadTypeEnum.OptimizedDF,
            text: DFTStr.OptimizedDF,
            suffix: DagTabOptimized.FILE_EXT
        },
        {
            type: this._DownloadTypeEnum.Image,
            text: "Image",
            suffix: ".png"
        },
        {
            type: this._DownloadTypeEnum.OperationStats,
            text: "Operation Statistics",
            suffix: ".json"
        }];
    }

    private _renderDropdown(): void {
        const lis: HTML = this._model.map((typeInfo) => {
            return `<li data-type="${typeInfo.type}">${typeInfo.text} (${typeInfo.suffix})`;
        }).join("");
        const $dropdown: JQuery = this._getDownloadTypeList();
        $dropdown.find("ul").html(lis);
    }

    private _initialize(): void {
        const $dropdown: JQuery = this._getDownloadTypeList();
        const $lis: JQuery = $dropdown.find("li");
        $lis.removeClass("xc-disabled");
        if (!(this._dagTab instanceof DagTabUser)) {
            $lis.filter((_index, el) => {
                return ($(el).data("type") !== this._DownloadTypeEnum.Image &&
                        $(el).data("type") !== this._DownloadTypeEnum.OperationStats
                    );
            }).addClass("xc-disabled");
        }

        if (this._dagTab instanceof DagTabOptimized) {
            this._toggleOptimizedOption(true);
        } else {
            this._toggleOptimizedOption(false);
        }

        // XXX TODO: support download partial dataflow as image
        if (this._selectedNodes != null) {
            // when select partial nodes, disable download as image
            $lis.filter((_index, el) => {
                return $(el).data("type") === this._DownloadTypeEnum.Image;
            }).addClass("xc-disabled");
        }
        // select the first valid option by default
        $dropdown.find("li:not(.xc-disabled)").eq(0).trigger(fakeEvent.mouseup);
        this._getNameInput().val(this._dagTab.getName().replace(/\//g, "_"));
    }

    private _toggleOptimizedOption(show: boolean): void {
        const $dropdown: JQuery = this._getDownloadTypeList();
        const $lis: JQuery = $dropdown.find("li");
        const $optimizedLi = $lis.filter((_index, el) => {
            return $(el).data("type") === this._DownloadTypeEnum.OptimizedDF;
        });
        const $dfLi = $lis.filter((_index, el) => {
            return $(el).data("type") === this._DownloadTypeEnum.DF;
        });

        if (show) {
            $optimizedLi.removeClass("xc-hidden").removeClass("xc-disabled");
            $dfLi.addClass("xc-hidden");
        } else {
            $optimizedLi.addClass("xc-hidden");
            $dfLi.removeClass("xc-hidden");
        }
    }

    private _validate(): {name: string} {
        const $nameInput: JQuery = this._getNameInput();
        const name: string = $nameInput.val().trim();
        const isValid: boolean = xcHelper.validate([{
            $ele: this._getDownloadTypeList().find(".text")
        }, {
            $ele: $nameInput
        }]);

        if (!isValid) {
            return null;
        }
        return {
            name: name
        };
    }

    protected _submitForm(): XDPromise<void> {
        const res: {name: string} = this._validate();
        if (res == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $confirmBtn: JQuery = this._getModal().find(".confirm");
        xcUIHelper.toggleBtnInProgress($confirmBtn, false);
        this._lock();

        this._loadTab()
        .then(() => {
            return this._download(res.name);
        })
        .then(() => {
            this._close();
            deferred.resolve();
        })
        .fail((error) => {
            const errMsg: string = xcHelper.parseError(error);
            StatusBox.show(errMsg, $confirmBtn, false, {
                detail: error.log
            });
            deferred.reject(error);
        })
        .always(() => {
            this._unlock();
            xcUIHelper.toggleBtnInProgress($confirmBtn, false);
        });

        return deferred.promise();
    }

    private _lock() {
        this._getModal().addClass("locked");
    }

    private _unlock() {
        this._getModal().removeClass("locked");
    }

    private _loadTab(): XDPromise<void> {
        if (this._downloadType === this._DownloadTypeEnum.Image) {
            // download image require the tab to open first and focused
            return DagTabManager.Instance.loadTab(this._dagTab);
        } else if (!this._dagTab.isLoaded()) {
            return this._dagTab.load();
        } else {
            return PromiseHelper.resolve();
        }
    }

    private _download(name): XDPromise<void> {
        switch (this._downloadType) {
            case this._DownloadTypeEnum.DF:
                return this._downloadDataflow(name);
            case this._DownloadTypeEnum.OptimizedDF:
                return this._downloadOptimizedDataflow(name);
            case this._DownloadTypeEnum.Image:
                return this._downloadImage(name);
            case this._DownloadTypeEnum.OperationStats:
                return this._downloadStats(name);
            default:
                return PromiseHelper.reject("Invalid download type");
        }
    }

    private _downloadDataflow(name: string): XDPromise<void> {
        const tab: DagTab = this._dagTab;
        if (tab instanceof DagTabUser) {
            return this._downloadUserDataflow(name);
        } else {
            return PromiseHelper.reject({error: ErrTStr.InvalidDFDownload});
        }
    }

    private _downloadOptimizedDataflow(name: string): XDPromise<void> {
        const tab: DagTabOptimized = <DagTabOptimized>this._dagTab;
        return tab.download(name);
    }

    private _downloadUserDataflow(name: string): XDPromise<void> {
        const tab: DagTabUser = <DagTabUser>this._dagTab;
        const clonedTab: DagTabUser = tab.clone();
        this._cleanupNodes(clonedTab.getGraph(), this._selectedNodes);
        return clonedTab.download(name);
    }

    private _cleanupNodes(graph: DagGraph, selectedNodes: DagNodeId[]): void {
        let partialSelection = (selectedNodes != null);
        let nodeToInclude: Map<DagNodeId, DagNode>;
        if (partialSelection) {
            nodeToInclude = graph.backTraverseNodes(selectedNodes).map;
            graph.getAllNodes().forEach((_node, nodeId) => {
                if (!nodeToInclude.has(nodeId)) {
                    graph.removeNode(nodeId);
                }
            });
        }

        graph.clear();
    }

    private _downloadImage(name: string): XDPromise<void> {
        const $dataflowArea: JQuery = DagViewManager.Instance.getAreaByTab(this._dagTab.getId());
        if ($dataflowArea.length === 0) {
            return PromiseHelper.reject(ErrTStr.InvalidDFDownload);
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // this is necessary for correct image rendering
        const $svg: JQuery = $("#cut-off-right").closest("svg").clone();
        $dataflowArea.prepend($svg);
        // setTimeout to help lag
        setTimeout(() => {
            // .toBlob allows larger size than .toPng
            domtoimage.toBlob($dataflowArea.get(0), {
                width: $dataflowArea.find(".dataflowAreaWrapper").width(),
                height: $dataflowArea.find(".dataflowAreaWrapper").height(),
                style: {
                    left: 0,
                    top: 0
                }
            })
            .then((blob) => {
                const fileName: string = `${name}.png`;
                window["saveAs"](blob, fileName);
                deferred.resolve();
            })
            .catch((error) => {
                if (typeof error !== "string") {
                    error = JSON.stringify(error);
                }
                deferred.reject({error: error});
            })
            .finally(() => {
                $svg.remove();
            });
        }, 1);

        return deferred.promise();
    }

    private _downloadStats(name: string): XDPromise<void> {
        const tab: DagTabUser = <DagTabUser>this._dagTab;
        return tab.downloadStats(name);
    }

    private _addEventListeners() {
        const $modal: JQuery = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close();
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        const $downloadTypeDropdown: JQuery = this._getDownloadTypeList();
        new MenuHelper($downloadTypeDropdown, {
            onSelect: ($li) => {
                $downloadTypeDropdown.find(".text").text($li.text());
                this._downloadType = $li.data("type");
            }
        }).setupListeners();
    }
}