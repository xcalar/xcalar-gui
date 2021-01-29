class SQLTableSchema extends AbstractSQLResultView {
    private _schemaSection: PTblSchema;

    public constructor(container: string) {
        super(container);
        this._initializeMainSection();
        this._addEventListeners();
    }

    public show(tableInfo: PbTblInfo): void {
        this._getContainer().removeClass("xc-hidden");
        this._updateTableName(tableInfo.name);
        this._render(tableInfo);
        const $schemaHeader = this._getMainSection().find(".header");
        $schemaHeader.find(".row > div").css({"width": ""});
    }

    public showError(errorString: string): void {
        this._getContainer().removeClass("xc-hidden");
        this._updateTableName("");
        this._schemaSection.render([]);
        this._getContainer().find(".content").append('<div class="msgRow error">' + errorString + '</div>');
    }

    public close(): void {
        this._getContainer().addClass("xc-hidden");
        this._schemaSection.clear();
        this._getSearchInput().val("");
    }

    protected _addEventListeners(): void {
        super._addEventListeners();

        this._getContainer().find(".actionArea .back").click(() => {
            SQLResultSpace.Instance.showTables(false);
        });

        const $schemaHeader = this._getMainSection().find(".header");
        this._resizeEvents($schemaHeader);
    }

    private _initializeMainSection(): void {
        const $section = this._getMainSection();
        this._schemaSection = new PTblSchema($section);
    }

    private _render(tableInfo: PbTblInfo): void {
        let columns: PbTblColSchema[] = [];
        if (tableInfo) {
            columns = tableInfo.getSchema();
        }
        this._schemaSection.render(columns);
        this._resizeEvents(this._getMainContent());
    }

    private _updateTableName(tableName: string): void {
        this._getContainer().find(".topSection .name").text(tableName);
    }

    private _resizeEvents($section: JQuery): void {
        $section.find(".row").each((_i, el) => {
            let $row = $(el);
            $row.find("> div").each((index, el) => {
                if (index !== 0) {
                    this._addResizeEvent($(el));
                }
            });
        });
    }
}