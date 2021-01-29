class TableComponent {
    private static menuManager: TableMenuManager;
    /**
     * Setup the Table Manager
     */
    public static setup(): void {
        try {
            TableComponent.menuManager = TableMenuManager.Instance;
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * @returns {TableMenuManager} return menu manager
     */
    public static getMenu(): TableMenuManager {
        return TableComponent.menuManager;
    }

    public static empty(): void {
        gActiveTableId = null;
    }
}