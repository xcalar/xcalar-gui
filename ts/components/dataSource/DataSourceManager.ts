/*
 * Manager Module for Data Source Section
 */
class DataSourceManager {
    /**
     * DataSourceManager.View
     */
    public static View =  {
        "Path": "DSForm",
        "Browser": "FileBrowser",
        "Preview": "DSConfig"
    };

    public static ImportSteps = {
        "Source": "source",
        "Preview": "preview",
        "Result": "result"
    };

    /**
     * DataSourceManager.setup
     */
    public static setup(): void {
        DS.setup();
        this._setupViews();
        DSForm.setup();
        DSConfig.setup();
        FileBrowser.setup();
        DSTargetManager.setup();
        this._setupMenus();
    }

    public static initialize(): void {
        this._toggleViewDisplay(true, true);
        DataSourceManager.startImport(DataSourceManager.isCreateTableMode());
    }

    public static isCreateTableMode(): boolean {
        return true;
    }

    /**
     * DataSourceManager.setMode
     * update the source panel top bar's text
     * @param createTableMode
     */
    public static setMode(createTableMode: boolean): void {
        if (createTableMode != null) {
            DSConfig.setMode(createTableMode);
            let $topBar = $("#datastore-in-view-topBar");
            if (createTableMode) {
                $topBar.find(".tab.result").text("3. Table");
            } else {
                $topBar.find(".tab.result").text("3. Dataset");
            }
        }
    }

    /**
     * DataSourceManager.switchToConnectorView
     */
    public static switchToConnectorView(): void {
        return this._switchToViewTarget();
    }

    /**
     * DataSourceManager.swichToImportView
     */
    public static swichToImportView(): void {
        this._switchToViewTableSource();
        DataSourceManager.startImport(true);
    }

    public static switchToLoadWizardView(): void {
        this._switchToLoadWizard();
    }

    public static switchToLoadHistoryView(): void {
        this._switchToLoadHistoryView();
    }

    /**
     * DataSourceManager.startImport
     * show the first step import screen
     * @param createTableMode
     */
    public static startImport(createTableMode: boolean): void {
        DataSourceManager.setMode(createTableMode);
        DSForm.show();
    }

    /**
     * DataSourceManager.switchStep
     * update the source panel top bar's active tab
     * @param step
     */
    public static switchStep(step: string | null): void {
        let $panel = $("#datastore-in-view");
        let $topBar = $("#datastore-in-view-topBar");
        $topBar.find(".tab").removeClass("active");
        if (step) {
            $panel.addClass("import");
            $topBar.find(".tab." + step).addClass("active");
        } else {
            $panel.removeClass("import");
        }
    }

    /**
     * DataSourceManager.switchView
     */
    public static switchView(view: string): void {
        let $cardToSwitch: JQuery = null;
        let wasInPreview = !$("#dsForm-config").hasClass("xc-hidden");
        let step = null;

        switch (view) {
            case DataSourceManager.View.Path:
                step = DataSourceManager.ImportSteps.Source;
                $cardToSwitch = $("#dsForm-path");
                break;
            case DataSourceManager.View.Browser:
                step = DataSourceManager.ImportSteps.Source;
                $cardToSwitch = $("#fileBrowser");
                break;
            case DataSourceManager.View.Preview:
                step = DataSourceManager.ImportSteps.Preview;
                $cardToSwitch = $("#dsForm-config");
                break;
            default:
                console.error("invalid view");
                return;
        }

        if (wasInPreview) {
            DSConfig.cancelLaod();
        }

        $cardToSwitch.removeClass("xc-hidden")
        .siblings().addClass("xc-hidden");

        let $dsFormView = $("#dsFormView");
        if (!$dsFormView.is(":visible")) {
            $dsFormView.removeClass("xc-hidden");
            TblSourcePreview.Instance.close();
        }

        DataSourceManager.switchStep(step);
    }

    /**
     * DataSourceManager.truncateLabelName
     * @param $labels
     * @param isListView
     */
    public static truncateLabelName(
        $labels: JQuery,
        isListView?: boolean
    ): void {
        let $gridView = $("#datastoreMenu .gridItems").eq(0);
        if (isListView == null) {
            isListView = $gridView.hasClass("listView");
        }

        const maxChar = isListView ? 18 : 8;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = isListView ? '700 12px Open Sans' : '700 9px Open Sans';

        $labels.each(function() {
            const $label = $(this);
            const $grid = $label.closest(".grid-unit");
            const name = $label.data("dsname");
            const shared = $grid.hasClass("shared");
            const maxWidth = isListView ? Math.max(165, $label.width()) : 52;
            const multiLine = !isListView && !shared;

            xcHelper.middleEllipsis(name, $label, maxChar, maxWidth,
                                    multiLine, ctx);
            if (shared) {
                $label.html($label.text() +
                            (isListView ? "" : "<br/>") +
                            "<span class='semibold'>(" + $grid.data("user") + ")</span>");
            }
        });
    }

    private static _getPanel(): JQuery {
        return $("#datastorePanel");
    }

    private static _getMenu(): JQuery {
        return $("#datastoreMenu");
    }

    private static _getTitleEl(): JQuery {
        return this._getPanel().find(".topBar .title");
    }

    private static _setupViews(): void {
        // main menu
        $("#dataStoresTab").find(".subTab").click((event) => {
            let $button: JQuery = $(event.currentTarget);
            if ($button.hasClass("active")) {
                return;
            }
            let id: string = $button.attr("id");
            switch (id) {
                case "targetButton":
                    this._switchToViewTarget();
                    break;
                case "sourceTblButton":
                    this._switchToViewTableSource();
                    break;
                default:
                    console.error("invalid view");
                    return;
            }
        });
    }

    private static _setupMenus(): void {
         // click to toggle list view and grid view
        const $switchViews: JQuery = $("#datastoreMenu .iconSection .switchView");
        $switchViews.click((event) => {
            let $btn: JQuery = $(event.currentTarget);
            let isListView: boolean;

            if ($btn.hasClass("gridView")) {
                isListView = true;
            } else {
                isListView = false;
            }

            this._toggleViewDisplay(isListView, false);
        });

        // set up the import button
        $("#datastoreMenu .buttonSection .import").click(function() {
            let $btn = $(this);
            $btn.blur();
            let createTableMode: boolean = $btn.hasClass("createTable");
            DataSourceManager.startImport(createTableMode);
        });
    }

    // toggle between list view and grid view
    private static _toggleViewDisplay(
        isListView: boolean,
        noRefreshTooltip: boolean
    ): void {
        let $menu: JQuery = $("#datastoreMenu");
        let $btns: JQuery = $menu.find(".iconSection .switchView");
        let $allGrids = $menu.find(".gridItems");
        xcUIHelper.toggleListGridBtn($btns, isListView, noRefreshTooltip);

        if (isListView) {
            // show list view
            $allGrids.removeClass("gridView").addClass("listView");
        } else {
            $allGrids.removeClass("listView").addClass("gridView");
        }

        let $labels = $allGrids.find(".label:visible");
        DataSourceManager.truncateLabelName($labels, isListView);
    }

    // button switch styling handled in mainMenu.js
    private static _readOnlyForNoAdmin(): boolean {
        let isAdmin: boolean = Admin.isAdmin() || XVM.isOnAWS();
        let $panel = this._getPanel();
        let $menu = this._getMenu();
        if (!isAdmin) {
            $panel.addClass("noAdmin");
            $menu.addClass("noAdmin");
            xcTooltip.add($("#dsTarget-create"), {
                title: DSTargetTStr.AdminOnly
            });
        } else {
            $panel.removeClass("noAdmin");
            $menu.removeClass("noAdmin");
            xcTooltip.remove($("#dsTarget-create"));
        }
        return isAdmin;
    }

    private static _switchToViewTableSource(): void {
        let $panel = this._getPanel();
        let wasInDatasetScreen: boolean = $panel.hasClass("in");
        this._restPanelView();
        let $menu = this._getMenu();
        let $title = this._getTitleEl();
        $panel.addClass("table");
        $("#sourceTblButton").removeClass("xc-hidden");

        const text: string = "Source & Load Data";
        $title.text(text);
        $menu.find(".table").removeClass("xc-hidden");

        if (wasInDatasetScreen) {
            DataSourceManager.startImport(true);
        }
    }

    private static _switchToLoadWizard(): void {
        const $panel = this._getPanel();
        this._restPanelView();
        $panel.addClass("load");
    }

    private static _switchToLoadHistoryView(): void {
        const $panel = this._getPanel();
        this._restPanelView();
        $panel.addClass("loadHistory");
    }

    private static _switchToViewTarget(): void {
        this._restPanelView();
        let isAdmin: boolean = this._readOnlyForNoAdmin();
        let $panel = this._getPanel();
        let $menu = this._getMenu();
        let $title = this._getTitleEl();

        $panel.addClass("target");
        $menu.find(".target").removeClass("xc-hidden");
        $title.text(DSTStr.TARGET);

        let $targetView: JQuery = $("#datastore-target-view");
        if ($targetView.hasClass("firstTouch")) {
            DSTargetManager.getTargetTypeList()
            .always(function() {
                DSTargetManager.clickFirstGrid();
            });
            $targetView.removeClass("firstTouch");
        }
    }

    private static _restPanelView(): void {
        let $panel: JQuery = this._getPanel();
        let $menu: JQuery = this._getMenu();
        $panel.removeClass("in")
            .removeClass("table")
            .removeClass("target")
            .removeClass("load")
            .removeClass("loadHistory")
        $menu.removeClass("xc-hidden");
        $menu.find(".menuSection").addClass("xc-hidden");
    }
}
