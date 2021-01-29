class DagSearchEntry {
    public tabId: string;
    public nodeId: DagNodeId;
    public selector: ($node: JQuery) => JQuery;
    public $el: JQuery;

    constructor(
        options: {
            tabId: string,
            nodeId: DagNodeId,
            selector: ($node: JQuery) => JQuery;    
        }
    ) {
        this.tabId = options.tabId;
        this.nodeId = options.nodeId;
        this.selector = options.selector;
    }

    public getMatchElement(): JQuery {
        if (this.$el != null) {
            return this.$el;
        }

        try {
            const dagView = DagViewManager.Instance.getDagViewById(this.tabId);
            if (dagView != null && this.selector != null) {
                // if can find the element, then cache it
                const $node: JQuery = dagView.getNodeElById(this.nodeId);
                const $match: JQuery = this.selector($node);
                if ($match.length) {
                    this.$el = $match;
                }
                return $match;
            } else {
                return $(); // invalid case 2
            }
        } catch (e) {
            console.error(e);
            return $();
        }
    }
}