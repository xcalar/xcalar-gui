class XcPbTableViewer extends XcTableViewer {
    private _pbTableName: string;

    public constructor(table: TableMeta, pbTableName: string) {
        super(table, {
            fromSQL: true
        });
        this._pbTableName = pbTableName;
    }

    public getPbTableName():string {
        return this._pbTableName;
    }

    public getTitle(): string {
        const tableName: string = this.table.getName();
        return xcHelper.getTableName(tableName);
    }

    public updateTotalNumRows(totalRows: number): void {
        const displayRows: number = this.rowManager.getTotalRowNum();
        const displayRowsStr: string = xcStringHelper.numToStr(displayRows);
        const totalRowsStr: string = xcStringHelper.numToStr(totalRows);
        const text: string = `${totalRowsStr} (show first ${displayRowsStr} rows)`;
        this.rowInput.updateTotalRowsText(text);
    }

    public replace(table: TableMeta): XcPbTableViewer {
        return new XcPbTableViewer(table, this._pbTableName);
    }
}
