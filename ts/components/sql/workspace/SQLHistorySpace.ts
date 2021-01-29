class SQLHistorySpace {
    private static _instance: SQLHistorySpace;
    private _historyComponent: SqlQueryHistoryPanel.ExtCard;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._historyComponent = new SqlQueryHistoryPanel.ExtCard();
    }

    public setup(): void {
        const $histSection = $('#sqlWorkSpacePanel');
        this._historyComponent.setup({
            $container: $histSection,
            isShowAll: true,
            checkContainerVisible: () => {
                return $histSection.hasClass('active');
            }
        });
    }

    /**
     * SQLHistorySpace.Instance.update
     * @param updateInfo
     */
    public update(updateInfo): XDPromise<void> {
        return this._historyComponent.update(updateInfo);
    }

    public refresh(): void {
        // Refresh = false to trigger query status recovery
        this._historyComponent.show(false);
    }
}