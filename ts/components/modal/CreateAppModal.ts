class CreateAppModal {
    private static _instance: CreateAppModal;
    private _modalHelper: ModalHelper;
    private _graphMap: Map<number, Set<DagNodeModule>>
    private _isOpen =false;
    private _cachedTabs: DagTabUser[];
    private _id: string;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            noBackground: true,
            offscreenDraggable: true
        });
        this._addEventListeners();
        this._cachedTabs = [];
    }

    /**
     * CreateAppModal.Instance.show
     */
    public async show(activeTab: DagTab): Promise<void> {
        if (this._isOpen) {
            return;
        }
        this._modalHelper.setup();
        this._isOpen = true;

        this._id = xcHelper.randName("modal");
        const $modal = this._getModal();
        $modal.removeClass("submit");
        const timer = setTimeout(() => {
            $modal.addClass("load");
        }, 500);
        await this._loadUnopenedTabs();
        let { disjointGraphs } = DagViewManager.Instance.getDisjointGraphs();
        disjointGraphs = this._filterDisjointGraphs(activeTab, disjointGraphs);
        this._renderGraphList(disjointGraphs);
        let index = 0;
        this._graphMap = new Map();
        disjointGraphs.forEach((moduleNodes) => {
            this._graphMap.set(index, moduleNodes);
            index++;
        });
        clearTimeout(timer);
        $modal.removeClass("load");

        if (index === 1) {
            // only one graph exist
            this._getModal().find(".graphList .checkbox").eq(0).click();
        }
    }

    private _filterDisjointGraphs(
        activeTab: DagTab,
        disjointGraphs: Set<Set<DagNodeModule>>
    ): Set<Set<DagNodeModule>> {
        if (activeTab == null) {
            return;
        }
        const filteredSet: Set<Set<DagNodeModule>> = new Set();
        disjointGraphs.forEach((graphSet) => {
            let isInTab = false;
            graphSet.forEach(( dagNode: DagNodeModule ) => {
                if (dagNode.getTabId() === activeTab.getId()) {
                    isInTab = true;
                }
            });

            if (isInTab) {
                filteredSet.add(graphSet);
            }
        });

        return filteredSet;
    }

    private _getModal(): JQuery {
        return $("#createAppModal");
    }

    private _getInstructionSection(): JQuery {
        return this._getModal().find(".modalInstruction");
    }

    private _close() {
        this._reset();
        this._modalHelper.clear();
        this._isOpen = false;
        this._cachedTabs.forEach((dagTab) => DagTabManager.Instance.removeTabCache(dagTab));
        this._cachedTabs = [];
        this._getModal().removeClass("load");
    }

    private _reset() {
        let $modal = this._getModal();
        $modal.find(".graphList").empty();
        $modal.find(".newName").val("");
        this._graphMap = null;
    }

    private _loadUnopenedTabs(): XDPromise<void> {
        const promises = [];
        DagList.Instance.getAllDags().forEach((dagTab) => {
            if (dagTab.getType() !== DagTabType.User) {
                return;
            }
            if (dagTab.getApp() !== null) {
                return;
            }
            if (DagTabManager.Instance.getTabById(dagTab.getId()) == null) {
                this._cachedTabs.push(<DagTabUser>dagTab);
                // when tab is closed it may still have the graph
                if (dagTab.getGraph() == null) {
                    promises.push(dagTab.load());
                }
            }
        });

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        PromiseHelper.when(...promises)
        .then(() => {
            this._cachedTabs.forEach((dagTab) => DagTabManager.Instance.addTabCache(dagTab));
            deferred.resolve();
        })
        .fail(() => {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _toggleDownloadOption(option: string): void {
        const $modal = this._getModal();
        const $options = $modal.find(".modalBottomMain .options");
        const $option = $options.find('.radioButton[data-option="' + option + '"]');
        $options.find(".radioButton.active").removeClass("active");
        $option.addClass("active");
        const $bucketOptions = $modal.find(".modalBottomMain .bucket, .modalBottomMain .bucketPath");
        if (option === "s3") {
            $bucketOptions.removeClass("xc-hidden");
        } else {
            $bucketOptions.addClass("xc-hidden");
        }
    }

    private _addEventListeners() {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".listWrap .listInfo", (event) => {
            const $list = $(event.currentTarget).closest(".listWrap");
            $list.toggleClass("active");
        });

        $modal.on("click", ".graphList .checkbox", (event) => {
            const $checkbox = $(event.target).closest(".checkbox");
            if ($checkbox.hasClass("checked")) {
                $checkbox.removeClass("checked");
            } else {
                // $modal.find(".graphList .checkbox").removeClass("checked");
                $checkbox.addClass("checked");
            }
        });

        $modal.on("click", ".confirm", () => {
            this._submit();
        });

        $modal.on("click", ".fn", (event) => {
            const tabId = $(event.target).closest(".fn").data("tabid");
            const dagTab = DagList.Instance.getDagTabById(tabId);
            DagTabManager.Instance.loadTab(dagTab);
        });

        xcUIHelper.optionButtonEvent($modal.find(".modalBottomMain .options"), (option) => {
            this._toggleDownloadOption(option);
        });

        const $dropdownList: JQuery = $modal.find(".modalBottomMain .bucket .dropDownList");
        // set default value
        new MenuHelper($dropdownList, {
            onOpen: ($curDropdown) => {
                this._renderS3BucketsDropdown($curDropdown);
            },
            onSelect: ($li) => {
                $dropdownList.find("input").val($li.text());
            },
            container: "#createAppModal",
            bounds: "#createAppModal"
        }).setupListeners();
    }

    private _renderS3BucketsDropdown($dropdown: JQuery): void {
        const s3Buckets = DSTargetManager.getAvailableS3Buckets();
        const html = s3Buckets.map((bucket) => `<li>${bucket}</li>`).join("");
        $dropdown.find('ul').html(html);
    }

    private _renderGraphList(disjointGraphs) {
        let html: HTML = "";
        let index = 0;
        disjointGraphs.forEach((moduleNodes) => {
            html += `<div class="row" data-index=${index}>
                        <div class="checkbox">
                            <i class="icon xi-ckbox-empty"></i>
                            <i class="icon xi-ckbox-selected"></i>
                        </div>
                        <div class="graphInfo listWrap xc-expand-list active">
                            <div class="graphName listInfo">
                                <span class="text">Plan ${index + 1}</span>
                                <span class="expand">
                                    <i class="icon xi-down fa-12"></i>
                                </span>
                            </div>
                            <ul class="graphSubList">`;

            // list all modules that are part of the disjointGraph
            moduleNodes.forEach((moduleNode) => {
                const tabId = moduleNode.getTabId();
                const fnName = moduleNode.getFnName();
                html += `<li class="fn" data-tabid="${tabId}">
                            <i class="icon xi-show"></i>
                            <div class="name">${fnName}<div>
                        </li>`;
            });
            html += `</ul></div></div>`;
            index++;
        });
        if (!html) {
            html = `<div class="emptyMsg">${AppTStr.EmptyMsg}</div>`;
        }
        this._getModal().find(".graphList").html(html);
    }

    private _showProgress(text: string): void {
        this._getInstructionSection().find(".progress .text").text(text);
    }

    private _normalizePath(path: string): string {
        // remove the starting / and add ending /
        if (path.startsWith('/')) {
            path = path.substring(1);
        }
        if (!path.endsWith('/')) {
            path = path + '/';
        }
        return path;
    }

    private _validate(): {
        $checkboxes: JQuery,
        appName: string,
        bucketPath: string
    } {
        const $modal = this._getModal();
        const $checkboxes = $modal.find(".graphList .checkbox.checked");
        const $appName = $modal.find(".newName");
        const appName = $appName.val().trim();
        const appNameError = AppList.Instance.validateName(appName);
        const checks: xcHelper.ValidateObj[] = [{
            $ele: $modal.find(".modalMain"),
            error: AppTStr.NoLogicalPlan,
            check: () => $checkboxes.length === 0
        }, {
            $ele: $appName,
            error: appNameError,
            check: () => appNameError != null
        }];

        let bucketPath = null;
        if ($modal.find('.radioButton[data-option="s3"]').hasClass('active')) {
            const $bucket = $modal.find(".bucket input");
            const $path = $modal.find(".bucketPath input");
            checks.push({ $ele: $bucket }, { $ele: $path });

            const s3Bucket = this._normalizePath($bucket.val().trim());
            const s3bucketPath = this._normalizePath($path.val().trim());
            bucketPath = `/${s3Bucket}${s3bucketPath}`;
        }

        const valid = xcHelper.validate(checks);
        if (valid) {
            return {
                $checkboxes,
                appName,
                bucketPath
            };
        } else {
            return null;
        }
    }

    private async _submit(): Promise<void> {
        const $modal = this._getModal();

        const param = this._validate();
        if (param == null) {
            // error case
            return;
        }
        const { $checkboxes, appName, bucketPath } = param;
        let moduleNodes = new Set();
        $checkboxes.each((_i, checkbox) => {
            const nodes = this._graphMap.get($(checkbox).closest(".row").data("index"));
            moduleNodes = new Set([...moduleNodes, ...nodes]);
        });

        const id = this._id;
        let appId = null;
        try {
            const activeTab = DagViewManager.Instance.getActiveTab();
            $modal.addClass("submit");
            appId = AppList.Instance.createApp(appName, moduleNodes);
            if (appId == null) {
                throw new Error("cannot create app");
            }
            this._showProgress(AppTStr.CreateValidate);
            await AppList.Instance.validate(appId, activeTab.getId());
            this._showProgress(bucketPath == null ? AppTStr.Downloading : 'Exporting');
            await AppList.Instance.download(appId, bucketPath);
            if (id === this._id) {
                this._close();
            }
        } catch (e) {
            console.error(e);
            if (id === this._id) {
                const $input = $modal.find(".newName");
                StatusBox.show(AppTStr.Incorrect, $input, false, {
                    detail: typeof e === 'string' ? e : e.message
                });
            }
        } finally {
            if (id === this._id) {
                $modal.removeClass("submit");
            }

            if (appId != null) {
                AppList.Instance.delete(appId);
            }
        }
    }
}