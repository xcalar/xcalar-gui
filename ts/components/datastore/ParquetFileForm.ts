class ParquetFileForm {
    private static _instance: ParquetFileForm;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    // first parser will be the default value
    private readonly parsers: {name: string, text: string}[] = [{
        name: "native",
        text: "Native"
    }, {
        name: "pyArrow",
        text: "PyArrow"
    }, {
        name: "parquetTools",
        text: "ParquetTools"
    }];

    private constructor() {}

    /**
     * Setup events of parquet file form and populate the parsers list
     */
    public setup(): void {
        this._populateList();
        this._addEvents();
    }

    /**
     * Rest the parquet file form to default value
     */
    public reset(): void {
        const $dropdownList: JQuery = this._getDropdownEle();
        this._setParserValue($dropdownList.find("li").eq(0));
    }

    /**
     * Restore parquet file form
     * @param udfQuery query used to restore the parquet file form
     */
    public restore(udfQuery: {parquetParser: string}): void {
        const $dropdownList: JQuery = this._getDropdownEle();
        let $li: JQuery;
        try {
            $li = $dropdownList.find("li").filter(function() {
                return $(this).attr("name") === udfQuery.parquetParser;
            });
        } catch (e) {
            console.error(e);
        }
        if ($li.length === 0) {
            this.reset();
        } else {
            this._setParserValue($li);
        }
    }

    /**
     * return parser value in the format of {parquetParser: value}
     */
    public getParser(): {parquetParser: string} {
        const $input: JQuery = this._getInputEle();
        return {parquetParser: $input.data("name")};
    }

    private _getDropdownEle(): JQuery {
        return $("#dsForm-parquetParser");
    }

    private _getInputEle(): JQuery {
        return this._getDropdownEle().find("input.text");
    }

    private _populateList(): void {
        const $dropdownList: JQuery = this._getDropdownEle();
        const html = this.parsers.map((parser) => {
            return `<li name="${parser.name}">${parser.text}</li>`;
        }).join("");
        $dropdownList.find("ul").html(html);
    }

    private _setParserValue($li) {
        const $input: JQuery = this._getInputEle();
        $input.val($li.text());
        $input.data("name", $li.attr("name"));
    }

    private _addEvents(): void {
        const $dropdownList: JQuery = $("#dsForm-parquetParser");
        // set default value
        new MenuHelper($dropdownList, {
            onSelect: ($li) => {
                this._setParserValue($li);
            },
            container: "#importDataForm-content",
            bounds: "#importDataForm-content"
        }).setupListeners();
    }
}
