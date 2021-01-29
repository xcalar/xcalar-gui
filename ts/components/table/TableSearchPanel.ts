class TableSearchPanel {
    private static _instance: TableSearchPanel;
    private _isShowing: boolean;
    private _sqlResults: {name: string,id: string}[];
    private _moduleResults: {name: string,id: string}[];
    private _searchId: string;

    public static get Instance() {
        return this._instance || (this._instance = new TableSearchPanel());
    }

    private constructor() {
        this._isShowing = false;
        this._clear();
        this._addEventListeners();
    }

    /**
     * TableSearchPanel.Instance.show
     */
    public show(): void {
        if (this._isShowing) {
            return;
        }
        this._isShowing = true;
        this._getPanelParentEl().addClass("showingSearch");
    }

    private _close(): void {
        this._clear();
        this._getPanelParentEl().removeClass("showingSearch");
        this._isShowing = false;
    }

    private _clear(): void {
        this._searchId = null;
        this._sqlResults = [];
        this._moduleResults = [];
        this._getInputEL().val("");
        this._renderResult();
    }

    private _getPanel(): JQuery {
        return $("#tableSearchPanel");
    }

    private _getPanelParentEl(): JQuery {
        return $("#dataflowMenu"); 
    }

    private _getInputEL(): JQuery {
        return this._getPanel().find("input");
    }

    private _getSummarySection(): JQuery {
        return this._getPanel().find(".summary");
    }

    private _getListSection(): JQuery {
        return this._getPanel().find(".listSection");
    }

    private _renderResult(): void {
        this._renderSummary();
        this._renderSQLResults();
        this._renderModuleResults();
    }

    private _renderSummary(): void {
        let msg: string;
        const len = this._sqlResults.length + this._moduleResults.length;
        const keyword = this._getInputEL().val();
        if (!keyword) {
            msg = "";
        } else if (len === 0) {
            msg = CommonTxtTstr.NoResult
        } else if (len === 1) {
            msg = "1 result found";
        } else {
            msg = `${len} results found`;
        }

        if (keyword && this._searchId != null) {
            msg = " (Searching...)";
        }
        this._getSummarySection().text(msg);
    }

    private _renderSQLResults(): void {
        const $list = this._getListSection().find(".sqlList");
        this._renderResults($list, this._sqlResults);
    }

    private _renderModuleResults(): void {
        const $list = this._getListSection().find(".moduleList");
        this._renderResults($list, this._moduleResults);
    }

    private _renderResults(
        $list: JQuery, 
        results: {name: string, id: string}[]
    ): void {
        let html: HTML = "";
        html = results.map(this._getHTMLFromResult).join("");
        if (html === "") {
            $list.addClass("xc-hidden");
            $list.find("ul").empty();
        } else {
            $list.removeClass("xc-hidden");
            $list.find("ul").html(html);
            $list.addClass("active");
        }
    }
    
    private _getHTMLFromResult(result: {name: string, id: string}): HTML {
        return `<li class="selectable" data-id="${result.id}">` +
                    result.name +
                '</li>';
    }

    private _search(keyword: string): void {
        keyword = keyword.trim().toLowerCase();
        if (!keyword) {
            this._clear();
            return;
        }
        this._sqlResults = [];
        this._moduleResults = [];
        this._searchInSQLSnippets(keyword);
        this._searchInModules(keyword);
    }

    private _searchInSQLSnippets(keyword: string): void {
        this._sqlResults = SQLSnippet.Instance.list()
        .filter((snippetObj: SQLSnippetDurable) => {
            return snippetObj.snippet.toLowerCase().includes(keyword);
        })
        .map((snippetObj: SQLSnippetDurable) => {
            return {
                name: SQLSnippet.getAppPath(snippetObj),
                id: snippetObj.id
            }
        });
        this._renderSummary();
        this._renderSQLResults();
    }

    private async _searchInModules(keyword: string): Promise<void> {
        this._searchId = xcHelper.randName("search");
        const promises: Promise<void>[] = [];
        DagList.Instance.getAllDags().forEach((tab) => {
            if (tab.getType() === DagTabType.User) {
                promises.push(this._searchOneModue(tab, keyword, this._searchId));
            }
        });

        DagTabManager.Instance.getTabs().forEach((tab) => {
            if (tab.getType() === DagTabType.SQLExecute) {
                promises.push(this._searchOneModue(tab, keyword, this._searchId));
            }
        });
        await Promise.all(promises);
        this._searchId = null; // finishing search
        this._renderSummary(); // update summart
    }

    private async _searchOneModue(
        tab: DagTab,
        keyword: string,
        searchId: string
    ): Promise<void> {
        try {
            let graph = tab.getGraph();
            if (graph == null) {
                await tab.load();
                if (this._searchId !== searchId) {
                    // it's not the original search job anymore
                    return;
                }
                graph = tab.getGraph();
            }
            const sourceNodes: DagNodeIMDTable[] = <DagNodeIMDTable[]>graph.getNodesByType(DagNodeType.IMDTable);
            for (let node of sourceNodes) {
                const source = node.getSource();
                if (source && source.toLowerCase().includes(keyword)) {
                    this._moduleResults.push({
                        id: tab.getId(),
                        name: DagList.getAppPath(tab)
                    });
                    this._renderSummary();
                    this._renderModuleResults();
                    break;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _addEventListeners(): void {
        const $panel = this._getPanel();
        $panel.find(".close").click(() => {
            this._close();
        });

        // search when press enter
        this._getInputEL().on("keyup", (event) => {
            if (event.which === keyCode.Enter) {
                const keyword: string = $(event.currentTarget).val();
                this._search(keyword);
            }
        });

        $panel.find(".clear").click((event) => {
            event.stopPropagation();
            this._search("");
            this._getInputEL().val("");
        });

        // expand/collapse the list
        $panel.on("click", ".listWrap .listInfo", (event) => {
            const $list = $(event.currentTarget).closest(".listWrap");
            $list.toggleClass("active");
            if ($list.hasClass("active")) {
                $list.scrollintoview({duration: 0, padding: 0});
            }
        });

        $panel.on("click", "li", (event) => {
            const $li = $(event.currentTarget);
            const id = $li.data("id");
            if ($li.closest(".listWrap").hasClass("sqlList")) {
                SQLTabManager.Instance.openTab(id);
            } else {
                const dagTab = DagTabManager.Instance.getTabById(id) || DagList.Instance.getDagTabById(id);
                DagTabManager.Instance.loadTab(dagTab);
            }
        });
    }
}