class UDFTabManager extends AbstractTabManager {
    private static _instance: UDFTabManager;
    private _activeTabs: {name: string, isNew: boolean}[];
    private _moduleCache: Map<string, string>;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        super("udfTabView", "gUDFManagerKey");
        this._activeTabs = [];
        this._moduleCache = new Map();
    }

    /**
     * Public events that inherits from Parent:
     * UDFTabManager.Instance.setup
     *
     */

    /**
     * UDFTabManager.Instance.getNumTabs
     */
    public getNumTabs(): number {
        return this._activeTabs.length;
    }

    /**
     * UDFTabManager.Instance.newTab
     */
    public newTab(): string {
        const name: string = this._getNewName();
        this.openTab(name, true);
        return name;
    }

    /**
     * UDFTabManager.Instance.openTab
     * @param name
     * @return {boolean} true if load a new, false otherwise
     */
    public openTab(name: string, newModule?: boolean): void {
        const index: number = this._getTabIndexByName(name);
        if (index > -1) {
            this._switchTabs(index);
        } else {
            this._loadTab(name, undefined, newModule);
            this._updateList();
            this._switchTabs();
            this._save();
        }
    }

    /**
     * UDFTabManager.Instance.closeTab
     * @param name
     */
    public closeTab(name: string): void {
        const index: number = this._getTabIndexByName(name);
        if (index > -1) {
            this._deleteTabAction(index, undefined, false);
            this._tabListScroller.showOrHideScrollers();
        }
    }

    /**
     * UDFTabManager.Instance.isOpen
     * @param name
     */
    public isOpen(name: string): boolean {
        for (let i = 0; i < this._activeTabs.length; i++) {
            const tab = this._activeTabs[i];
            if (!tab.isNew && tab.name === name) {
                return true;
            }
        }
        return false;
    }

    /**
     * UDFTabManager.Instance.getActiveTab
     */
    public getActiveTab(): {name: string, isNew: boolean} | null {
        const currentIndex = this._getTabArea().find(".tab.active").index();
        const currentTab = this._activeTabs[currentIndex];
        if (currentTab) {
            return currentTab;
        } else {
            return null;
        }
    }

    /**
     * UDFTabManager.Instance.renameTab
     * @param oldName
     * @param newName
     */
    public renameTab(oldName: string, newName: string): void {
        let tabToRename = null;
        let index: number;
        for (let i = 0; i < this._activeTabs.length; i++) {
            const tab = this._activeTabs[i];
            if (tab.isNew && tab.name === oldName) {
                tabToRename = tab;
                index = i;
            }
        }

        if (tabToRename) {
            tabToRename.isNew = false;
            tabToRename.name = newName;
            this._getTabElByIndex(index).find(".name").text(newName);
            this._save();
            this._updateList();
        }
    }

    /**
     * UDFTabManager.Instance.toggleUnSaved
     * @param name
     * @param unsaved
     */
    public toggleUnSaved(tab: UDFTabDurable, unsaved: boolean): void {
        const index: number = this._activeTabs.findIndex((v) => {
            return v.name === tab.name && v.isNew === tab.isNew
        });
        if (index > -1) {
            const $tab = this._getTabElByIndex(index);
            if (unsaved) {
                $tab.addClass("unsaved");
            } else {
                $tab.removeClass("unsaved");
            }
        }
    }

    /**
     * @override
     * @param index
     */
    protected _switchTabs(index?: number): number {
        this._cacheNewModule();
        index = super._switchTabs(index);
        const tab = this._activeTabs[index];
        const { name, isNew } = tab;
        const cache = this._moduleCache.get(name);
        if (cache) {
            UDFPanel.Instance.getEditor().setValue(cache);
            UDFPanel.Instance.checkErrorUDF(name, isNew);
        } else {
            UDFPanel.Instance.openUDF(name, isNew)
            .then(() => {
                UDFPanel.Instance.checkErrorUDF(name, isNew);
            });
        }
        this._focusOnList(tab);
        return index;
    }

    protected _restoreTabs(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getKVStore().getAndParse()
        .then((restoreData: {tabs: UDFTabDurable[]}) => {
            if (restoreData != null) {
                restoreData.tabs.forEach((tab) => {
                    if (typeof tab === 'string') {
                        // this is the old version of data
                        this._loadTab(<string>tab, undefined, false);
                    } else {
                        this._loadTab(tab.name, undefined, tab.isNew);
                    }
                });
            }

            if (this._activeTabs.length) {
                this._switchTabs(0);
            }
            this._updateList();
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            deferred.reject(error);
        });

        return deferred.promise();
    }

    protected async _deleteTabAction(
        index: number,
        _name?: string,
        alertUnsavedChange: boolean = true
    ): Promise<void> {
        try {
            const $tab: JQuery = this._getTabElByIndex(index);
            const tab = this._activeTabs[index];
            if (alertUnsavedChange && $tab.hasClass('unsaved')) {
                await this._alertUnsavedSnippet(
                    async () => {
                        return UDFPanel.Instance.updateUnSavedChange(tab, true);
                    },
                    async () => {
                        return UDFPanel.Instance.updateUnSavedChange(tab, false);
                    },
                );
            }

            if ($tab.hasClass("active")) {
                // when this is the current active table
                if (index > 0) {
                    this._switchTabs(index - 1);
                } else if (this.getNumTabs() > 1) {
                    this._switchTabs(index + 1);
                }
            }
            this._activeTabs.splice(index, 1);
            this._moduleCache.delete(tab.name);
            this._save();

            $tab.remove();
            this._updateList();
        } catch {
            // it's normal to have code here when cancel from alert
        }
    }

    protected _deleteOtherTabsAction(index: number, rightOnly?: boolean): void {
        let start = rightOnly ? (index + 1) : 0;
        for (let i = start; i < this._activeTabs.length; i++) {
            if (i !== index) {
                const tab = this._activeTabs.splice(i, 1);
                this._moduleCache.delete(tab[0].name);
                const $tab: JQuery = this._getTabElByIndex(i);
                $tab.remove();
                if (i < index) {
                    index--;
                }
                i--;
            }
        }
        const $tab: JQuery = this._getTabElByIndex(index);
        if (!$tab.hasClass("active")) {
            this._switchTabs(index);
        }
        this._save();
        this._updateList();
    }

    // do nothing
    protected _renameTabAction(_$input: JQuery): string {
        return null;
    }

    // do nothing
    protected _duplicateTabAction(_index: number): void {
        return null;
    }

    protected _startReorderTabAction(): void {};
    protected _stopReorderTabAction(previousIndex: number, newIndex: number): void {
        if (previousIndex !== newIndex) {
            // update activeUserDags order as well as dataflowArea
            const tab = this._activeTabs.splice(previousIndex, 1)[0];
            this._activeTabs.splice(newIndex, 0, tab);
            this._save();
        }
    }

    protected _getJSON(): {tabs: UDFTabDurable[]} {
        return {
            tabs: [...this._activeTabs]
        };
    }

    protected _addEventListeners(): void {
        super._addEventListeners();

        this._getContainer().find(".addTab").click(() => {
            this.newTab();
        });

        $("#udfSection").find(".hintSection .action").click(() => {
            this.newTab();
        });

        const $tabArea: JQuery = this._getTabArea();
        $tabArea.off("dblclick", ".dragArea"); // turn off dblick to rename
        $tabArea.on("dblclick", ".dragArea", (event) => {
            const activeTab = UDFTabManager.Instance.getActiveTab();
            if (activeTab == null) {
                // error case
                return;
            }
            let title = activeTab.isNew ? TooltipTStr.SaveUDFToName : TooltipTStr.NoUDFRename;

            xcTooltip.transient($(event.currentTarget), {
                title: title
            }, 4000);
        });
        const $menu: JQuery = this._getMenu();
        $menu.find(".rename").addClass("unavailable");
        $menu.find(".duplicate").remove();
    }

    protected _openDropdown(event) {
        super._openDropdown(event);
        const $menu: JQuery = this._getMenu();
        const $rename = $menu.find(".rename");
        const activeTab = UDFTabManager.Instance.getActiveTab();
        if (activeTab == null) {
            // error case
            return;
        }
        let title = activeTab.isNew ? TooltipTStr.SaveUDFToName : TooltipTStr.NoUDFRename;
        xcTooltip.add($rename, {title: title});
    }

    private _getTabIndexByName(name: string): number {
        return this._activeTabs.findIndex((tab) => !tab.isNew && tab.name === name);
    }

    private _loadTab(name: string, index?: number, newModule?: boolean): void {
        let tabIndex: number = null;
        if (index == null) {
            index = this.getNumTabs();
        } else {
            tabIndex = index;
        }
        this._activeTabs.splice(index, 0, {name, isNew: newModule});
        this._addTabHTML(name, tabIndex, newModule);
    }

    private _addTabHTML(
        name: string,
        tabIndex?: number,
        newModule?: boolean
    ): void {
        name = xcStringHelper.escapeHTMLSpecialChar(name);
        const classNames: string[] = ["tab", "tooltipOverflow"];
        if (newModule) {
            classNames.push("new");
        }
        let html: HTML =
            '<li class="' + classNames.join(" ") + '" ' +
            xcTooltip.Attrs +
            ' data-title="' + name + '.py"' +
            '>' +
                '<div class="dragArea">' +
                    '<i class="icon xi-ellipsis-v" ' + xcTooltip.Attrs +
                    ' data-original-title="' + CommonTxtTstr.HoldToDrag+ '"></i>' +
                '</div>' +
                '<div class="name">' +
                    name + '.py' +
                '</div>' +
                '<div class="after">' +
                    '<i class="icon xi-close-no-circle close" ' +
                    xcTooltip.Attrs +
                    ' data-original-title="' + AlertTStr.Close + '" ' +
                    '></i>' +
                    '<i class="icon xi-solid-circle dot"></i>' +
                '</div>' +
            '</li>';

        this._getTabArea().append(html);
        if (tabIndex != null) {
            // Put the tab and area where they should be
            const numTabs: number = this.getNumTabs();
            const $tabs = this._getTabsEle();
            let $newTab: JQuery = $tabs.eq(numTabs - 1);
            $newTab.insertBefore($tabs.eq(tabIndex));
        }
    }

    private _updateList(): void {
        ResourceMenu.Instance.render(ResourceMenu.KEY.UDF);
        const $view = $("#udfViewContainer");
        if (this._activeTabs.length === 0) {
            $view.addClass("hint");
        } else {
            $view.removeClass("hint");
        }
        this._tabListScroller.showOrHideScrollers();
    }

    private _getNewName(): string {
        const set = new Set();
        this._activeTabs.forEach((tab) => { set.add(tab.name); });
        let startName: string = "Untitled";
        let name: string = startName;
        let cnt = 0;
        while (set.has(name)) {
            cnt++;
            name = startName + cnt;
        }
        return name;
    }

    private _cacheNewModule(): void {
        const currentIndex = this._getTabArea().find(".tab.active").index();
        const currentTab = this._activeTabs[currentIndex];
        if (currentTab) {
            const editor = UDFPanel.Instance.getEditor();
            this._moduleCache.set(currentTab.name, editor.getValue());
        }
    }

    private _focusOnList(tab: {name: string, isNew: boolean}): void {
        const $list: JQuery = ResourceMenu.Instance.getContainer().find(".udf.listWrap");
        $list.find("li.active").removeClass("active");
        if (!tab.isNew) {
            const udfPath = tab.name + ".py";
            const $li: JQuery = $list.find('li.open').filter((_index, e) => {
                return $(e).find(".name").text() === udfPath;
            });
            if ($li.length) {
                $li.addClass("active");
                ResourceMenu.Instance.focusOnList($li);
            }
        }
    }
}