abstract class AbstractTabManager {
    private _container: string;
    private _key: string;
    protected _hasSetup: boolean;
    protected _tabListScroller: ListScroller;
    private _$menu; JQuery;

    constructor(container: string, key: string) {
        this._container = container;
        this._key = key;
        this._hasSetup = false;
    }


    public setup(): XDPromise<void> {
        if (this._hasSetup) {
            return PromiseHelper.resolve();
        }
        this._hasSetup = true;
        const $tabArea: JQuery = this._getTabArea();
        this._tabListScroller = new ListScroller(this._getTabsSection(),
        $tabArea, false, {
            bounds: `#${this._container}`,
            noPositionReset: true
        });
        this._$menu = $("#generalTabMenu").clone();
        this._$menu.removeAttr("id");
        this._getContainer().parent().after(this._$menu);
        this._addEventListeners();
        return this._restoreTabs();
    }

    public abstract getNumTabs(): number;
    protected abstract _restoreTabs(): XDPromise<void>;
    protected abstract _deleteTabAction(index: number, name: string, alertUnsavedChange?: boolean): void;
    protected abstract _deleteOtherTabsAction(index: number, rightOnly?: boolean): void;
    protected abstract _renameTabAction($input: JQuery): string;
    protected abstract _startReorderTabAction(): void;
    protected abstract _stopReorderTabAction(previousIndex: number, newIndex: number): void;
    protected abstract _duplicateTabAction(index: number): void;
    protected abstract _getJSON(): any;

    protected _getContainer(): JQuery {
        return $(`#${this._container}`);
    }

    protected _getTabsSection(): JQuery {
        return this._getContainer().find(".tabsSection").last();
    }

    protected _getTabArea(): JQuery {
        return this._getTabsSection().find("ul");
    }

    protected _getTabsEle(): JQuery {
        return this._getTabArea().find(".tab");
    }

    protected _getMenu(): JQuery {
        return this._$menu;
    }

    protected _getTabElByIndex(index: number): JQuery {
        return this._getTabsEle().eq(index);
    }

    protected _getTabIndexFromEl($el: JQuery): number {
        if (!$el.hasClass("tab")) {
            $el = $el.closest(".tab");
        }
        return $el.index();
    }

    protected _switchTabs(index?: number): number {
        if (index == null) {
            index = this.getNumTabs() - 1;
        }
        const $tabs: JQuery = this._getTabsEle();
        const $tab: JQuery = $tabs.eq(index);
        $tabs.removeClass("active");
        $tab.addClass("active");
        $tab.scrollintoview({duration: 0});
        return index;
    }

    public scrollToActiveTab() {
        const $tabs: JQuery = this._getTabsEle();
        $tabs.filter(".active").scrollintoview({duration: 0});
    }

    protected _getEditingName($tabName: JQuery): string {
        return $tabName.text();
    }

    protected _addEventListeners(): void {
        this._addMenuEventListeners();
        const $tabArea: JQuery = this._getTabArea();
        $tabArea.on("click", ".after", (event) => {
            if ($(event.currentTarget).hasClass("xc-unavailable")) {
                return;
            }
            event.stopPropagation();
            xcTooltip.hideAll();
            const index: number = this._getTabIndexFromEl($(event.currentTarget));
            this._deleteTabAction(index, "");
            this._tabListScroller.showOrHideScrollers();
        });

        $tabArea.on("click", ".tab", (event) => {
            const $tab: JQuery = $(event.currentTarget);
            // dragging when sorting will trigger an unwanted click
            if (!$tab.hasClass("ui-sortable-helper")) {
                this._switchTabs($tab.index());
            }
        });

        $tabArea.on("contextmenu", ".tab", (event) => {
            this._openDropdown(event);
            return false; // prevent default browser's rightclick menu
        });

        $tabArea.on("dblclick", ".dragArea", (event) => {
            let $dragArea: JQuery = $(event.currentTarget);
            this._focusTabRename($dragArea);
        });

        $tabArea.on("keypress", ".name .xc-input", (event) => {
            if (event.which === keyCode.Enter) {
                $(event.currentTarget).blur();
            }
        });

        $tabArea.on("focusout", ".name .xc-input", (event) => {
            const $input: JQuery = $(event.currentTarget);
            const newName = this._renameTabAction($input);
            $input.closest(".tab").removeClass("renaming");
            if (newName) {
                const $tabName: JQuery = $input.parent();
                $tabName.text(newName);
                xcTooltip.changeText($tabName.closest("li"), newName);
                $tabName[0].scrollLeft = 0;
            }
            $input.remove();
            this._tabListScroller.showOrHideScrollers();
        });

        $tabArea.mouseenter(() => {
            this._tabListScroller.showOrHideScrollers();
        });

        let initialIndex;
        $tabArea.sortable({
            revert: 300,
            axis: "x",
            handle: ".dragArea",
            distance: 5,
            forcePlaceholderSize: true,
            placeholder: "sortablePlaceholder",
            start: (_event, ui) => {
                // add html to the placeholder so it maintains the same width
                const html = $(ui.item).html();
                $tabArea.find(".sortablePlaceholder").html(html);
                initialIndex = $(ui.item).index();
                xcTooltip.hideAll();
                this._startReorderTabAction();
            },
            stop: (_event, ui) => {
                const newIndex = $(ui.item).index();
                this._stopReorderTabAction(initialIndex, newIndex);
            }
        });

        $tabArea.on("mouseenter", ".tooltipOverflow", function() {
            let target: HTMLElement = <HTMLElement>$(this).find(".name")[0];
            xcTooltip.auto(this, target);
        });
    }

    protected _focusTabRename($dragArea: JQuery) {
        let $tabName: JQuery = $dragArea.parent().find(".name");
        if ($tabName.hasClass('nonedit')) {
            return;
        }
        let editingName = this._getEditingName($tabName);
        $tabName.text("");
        let inputArea: string =
            "<span spellcheck='false' contentEditable='true' class='xc-input'></span>";
        $(inputArea).appendTo($tabName);
        let $input: JQuery = $tabName.find('.xc-input');
        $input.text(editingName);
        $input.focus();
        $input.closest(".tab").addClass("renaming");
        document.execCommand('selectAll', false, null);
    }

    protected _addMenuEventListeners(): void {
        const $menu = this._getMenu();
        xcMenu.add($menu);
        $menu.on("click", "li", (event) => {
            const $li = $(event.target).closest("li");
            const action = $li.data("action");
            if ($li.hasClass("unavailable") || !action) {
                return;
            }
            const index: number = $menu.data("index");

            switch (action) {
                case ("close"):
                    this._deleteTabAction(index, "");
                    break;
                case ("closeOthers"):
                    this._deleteOtherTabsAction(index);
                    break;
                case ("closeOthersRight"):
                    this._deleteOtherTabsAction(index, true);
                    break;
                case ("rename"):
                    const $tabs: JQuery = this._getTabsEle();
                    const $dragArea: JQuery = $tabs.eq(index).find(".dragArea");
                    this._focusTabRename($dragArea);
                    break;
                case ("duplicate"):
                    this._duplicateTabAction(index);
                    break;
                default:
                    break;
            }

            this._tabListScroller.showOrHideScrollers();
        });
    }

    protected _getKVStore(): KVStore {
        const key: string = KVStore.getKey(this._key);
        return new KVStore(key, gKVScope.WKBK);
    }

    protected _save(): XDPromise<void> {
        let jsonStr: string = JSON.stringify(this._getJSON());
        return this._getKVStore().put(jsonStr, true, true);
    }

    protected _openDropdown(event) {
        const $menu = this._getMenu();
        const index: number = this._getTabIndexFromEl($(event.currentTarget));
        $menu.data("index", index);
        this._tabDropdownBeforeOpen(index, $menu);
        MenuHelper.dropdownOpen($(event.target), $menu, {
            floating: true,
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetX: 2,
            offsetY: 4
        });
    }

    protected _tabDropdownBeforeOpen(index: number, $menu: JQuery) {
        return null;
    }

    protected _alertUnsavedSnippet(onSave: Function, onDiscard: Function): Promise<void> {
        return new Promise((resolve, reject) => {
            Alert.show({
                title: "Unsaved change",
                instr: "Your changes will be lost if you don't save them.",
                msg: "Do you want to save the changes you made?",
                buttons: [{
                    name: "Don't save",
                    className: 'btn-submit',
                    func: () => {
                        onDiscard()
                        .then(() => {
                            resolve();
                        })
                        .catch(() => {
                            reject();
                        });

                    }
                }, {
                    name: CommonTxtTstr.Save,
                    className: 'btn-submit',
                    func: () => {
                        onSave()
                        .then(() => {
                            resolve();
                        })
                        .catch(() => {
                            reject();
                        });
                    }
                }],
                onCancel: () => {
                    reject();
                }
            })
        });
    }
}