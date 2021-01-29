interface DagSearchBasicOption {
    key: string;
    default: boolean;
    checked: boolean;
}

interface DagSearchStatusOption extends DagSearchBasicOption{
    filter: (node: DagNode) => boolean;
}

interface DagSearchTypeOption extends DagSearchBasicOption{
    selector: (keyword: string, node: DagNode) => (($node: JQuery) => JQuery);
}

class DagSearchModel {
    public statusOptions: DagSearchStatusOption[];
    public typeOptions: DagSearchTypeOption[];
    private _matchedEntries : DagSearchEntry[];
    private _searchScope: string;

    constructor(
        options: {
            statusOptions: DagSearchStatusOption[],
            typeOptions: DagSearchTypeOption[]
        }
    ) {
        this._matchedEntries = [];
        this.statusOptions = options.statusOptions;
        this.typeOptions = options.typeOptions;
    }

    /**
     * Set the search scope, in current dataflow or all
     * opened dataflows
     * make sure it keeps in sync with the radio button
     * @param scope
     */
    public setScope(scope: string): void {
        this._searchScope = scope;
    }

    /**
     * return true if searches all opened dataflows
     */
    public isGlobalSearch(): boolean {
        return this._searchScope === "all";
    }

    /**
     * Reset status options and type options to default state
     */
    public reset(options: DagSearchBasicOption[]): void {
        options.forEach((option) => {
            option.checked = option.default;
        });
    }

    /**
     * Clear
     */
    public clearMatches(): void {
        this._matchedEntries = [];
    }

    /**
     * search matched restuls
     * @param keyword
     */
    public search(keyword: string): JQuery {
        try {
            keyword = keyword.toLowerCase();
            this._findMatches(keyword);
            this._reorderMatches();
        } catch (e) {
            console.error(e);
        }
        // the format for $reorderMatches is required by SearchBar class
        // but here we don't really use it, but rely on _getMatchedEl
        const $reorderMatches = this._matchedEntries.map((match) => match.$el ? match.$el : $());
        return $($reorderMatches);
    }

    public getMatchedEntry(index: number): DagSearchEntry {
        return this._matchedEntries[index];
    }

    public hasStatusFilter(): boolean {
        const options = this.statusOptions.filter((option) => option.checked);
        return options.length !== 0;
    }

    private _findMatches(keyword: string): void {
        let matches: DagSearchEntry[] = [];
        this._getSearchableDagTabs().forEach((dagTab) => {
            matches = matches.concat(this._findMatchesInDataflow(keyword, dagTab));
        });
        this._matchedEntries = matches;
    }

    private _getSearchableDagTabs(): DagTab[] {
        if (this.isGlobalSearch()) {
            // search all opened dataflows
            return DagTabManager.Instance.getTabs();
        } else {
            // only search current dataflow
            return [DagViewManager.Instance.getActiveTab()];
        }
    }

    private _findMatchesInDataflow(
        keyword: string,
        dagTab: DagTab
    ): DagSearchEntry[] {
        const matches: DagSearchEntry[] = [];
        const graph: DagGraph = dagTab.getGraph();
        const tabId: string = graph.getTabId();
        const filterTypeOption = (
            option: DagSearchTypeOption,
            node: DagNode,
            nodeId: DagNodeId
        ) => {
            const selector = option.checked ?
                option.selector(keyword, node) : null;
                if (selector != null) {
                    const searchEntry = new DagSearchEntry({
                        tabId: tabId,
                        nodeId: nodeId,
                        selector: selector
                    });
                    matches.push(searchEntry);
                }
        };
        // search all nodes
        graph.getAllNodes().forEach((node: DagNode, nodeId: DagNodeId) => {
            if (this.hasStatusFilter() && !this._isValidStatus(node)) {
                return;
            }
            this.typeOptions.forEach((option) => {
                filterTypeOption(option, node, nodeId);
            });
        });
        return matches;
    }

    private _reorderMatches(): void {
        // find the one in view as first
        let activeTabId: string = DagViewManager.Instance.getActiveTab().getId();
        let startIndex: number = 0;
        const $container: JQuery = DagViewManager.Instance.getActiveArea();
        const matches = this._matchedEntries;
        for (let i = 0; i < matches.length; i++) {
            let entry = matches[i];
            if (entry.tabId === activeTabId) {
                let $el: JQuery = entry.getMatchElement();
                if (DagUtil.isInView($el, $container)) {
                    startIndex = i;
                    break;
                }
            }
        }
        this._matchedEntries = matches.slice(startIndex).concat(matches.slice(0, startIndex));
    }

    private _isValidStatus(node: DagNode): boolean {
        // only check all the checked options
        const options = this.statusOptions.filter((option) => option.checked);
        for (let option of options) {
            const valid: boolean = option.filter(node);
            if (valid) {
                return true;
            }
        }
        return false;
    }
}