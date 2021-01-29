class PTblSchema {
    private _$container: JQuery;

    public constructor($container: JQuery) {
        this._$container = $container;
        this._initializeSection();
    }

    public render(
        columns: PbTblColSchema[]
    ): void {
        const html: HTML = columns.map(this._renderRowContent).join("");
        this._getContentSection().html(html);
    }

    public clear(): void {
        this._getContentSection().empty();
    }

    private _getContainer(): JQuery {
        return this._$container;
    }

    private _getContentSection(): JQuery {
        return this._getContainer().find(".content");
    }

    private _initializeSection(): void {
        const html: HTML =
        '<div class="header">' +
            this._renderRowContent({
                name: "Name",
                type: "Type",
                primaryKey: "Primary Key"
            }) +
        '</div>' +
        '<div class="content"></div>';
        this._getContainer().html(html);
    }

    private _renderRowContent(column: {
        name: string,
        type: string | ColumnType,
        primaryKey: string
    }): HTML {
        const html: HTML =
        '<div class="row">' +
            '<div class="name">' +
                column.name +
            '</div>' +
            '<div class="type">' +
                column.type +
            '</div>' +
            '<div class="primaryKey">' +
                column.primaryKey +
            '</div>' +
        '</div>';
        return html;
    }
}