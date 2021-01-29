class LoadScreen {
    /**
     * LoadScreen.setup
     */
    public static setup(): void {
        this._addEventListeners();
        this._swtichTab("loadWizard");
    }

    /**
     * LoadScreen.show
     */
    public static show(): void {
        const $container = this._getContainer();
        const $list = $container.find(".sourceList");
        const $li = $list.find("li.active");
        if ($li.length) {
            const tab = $li.data("tab");
            this._swtichTab(tab); // reset the tab
        }
        $container.removeClass("xc-hidden");
        window["reactHack"]["getInitialLogs"]();
        if (xcGlobal.isLegacyLoad) {
            $list.find('[data-tab="loadHistory"]').hide();
        } else {
            $list.find('[data-tab="loadHistory"]').show();
        }
    }

    public static hide(): void {
        this._getContainer().addClass("xc-hidden");
    }

    /**
     * LoadScreen.switchTab
     * @param tab
     */
    public static switchTab(tab: string): void {
        return this._swtichTab(tab);
    }

    private static _getContainer(): JQuery {
        return $("#loadScreen");
    }

    private static _swtichTab(tab: string): void {
        const $list = this._getContainer().find(".sourceList");
        $list.find("li.active").removeClass("active");
        $list.find(`li[data-tab="${tab}"]`).addClass("active");
        switch (tab) {
            case "connector":
                DataSourceManager.switchToConnectorView();
                break;
            case "import":
                DataSourceManager.swichToImportView();
                break;
            case "loadWizard":
                DataSourceManager.switchToLoadWizardView();
                break;
            case "loadHistory":
                DataSourceManager.switchToLoadHistoryView();
                break;
            default:
                break;
        }
    }

    private static _addEventListeners(): void {
        const $container = this._getContainer();
        $container.find(".sourceList").on("click", "li", (event) => {
            const tab = $(event.currentTarget).data("tab");
            this._swtichTab(tab);
        });
    }
}