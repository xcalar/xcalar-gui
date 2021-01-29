enum DFNodeLineageType {
    Node = "node",
    DF = "dataflow",
    Custom = "custom node",
    SQL = "SQL node",
    Dest = "dest"
}

interface DFNodeLineage {
    type: DFNodeLineageType,
    nodeId: DagNodeId,
    tabId: string,
    tableName?: string
}

class DFNodeLineagePopup {
    private static _instance: DFNodeLineagePopup;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    // it's a list of lineage infos.
    // the first element represent the dest node info,
    // the last element represent the deepest source node info
    private _lineages: DFNodeLineage[];
    private _modalHelper: ModalHelper;
    private _onUpdate: Function;

    private constructor() {
        const $modal: JQuery = this._getPopup();
        this._lineages = [];
        this._modalHelper = new ModalHelper($modal, {
            noResize: true,
            noBackground: true,
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

    /**
     * DFNodeLineagePopup.Instance.show
     * @param destNodeInfo node info of the dest node
     */
    public show(destNodeInfo: DagTagInfo): void {
        this._clear();
        this._modalHelper.setup();
        this._positionPopup();

        this._getLineagesFromDest(destNodeInfo);
        this._renderLineagesView();
    }

    /**
     * DFNodeLineagePopup.Instance.update
     * @param tabId
     */
    public update(tabId: string): void {
        if (typeof this._onUpdate === "function") {
            this._onUpdate(tabId);
        }
    }

    private _close(): void {
        this._modalHelper.clear();
        this._removeHilights();
        this._clear();
    }

    private _clear(): void {
        this._lineages = [];
        this._onUpdate = undefined;
        this._getPopupMain().empty();
        this._adjustPopupHeight();
    }

    private _positionPopup(): void {
        const $popUp: JQuery = this._getPopup();
        let left: number = 135;
        let top: number = 180;

        try {
            left = $("#menuBar")[0].getBoundingClientRect().right + 15;
            top = $("#dagView .dataflowMainArea")[0].getBoundingClientRect().top + 15;
        } catch (e) {
            console.error()
        }
        $popUp.css("top", top)
            .css("left", left);
    }

    private _adjustPopupHeight(): void {
        const baseHeight: number = 210;
        let height: number = baseHeight;
        // overflow occur when there are more than 4 level of lineages
        for (let i = 4; i < this._lineages.length; i++) {
            height += 28; // row height (20px) + margin bottom (8px)
        }

        height = Math.min(height, 350);
        this._getPopup().outerHeight(height);
    }

    private _getPopup(): JQuery {
        return $("#dfNodeLineagePopup");
    }

    private _getPopupMain(): JQuery {
        return this._getPopup().find(".modalMain");
    }

    private _getLineagesFromDest(destNodeInfo: DagTagInfo): void {
        try {
            const {nodeId, tabId} = destNodeInfo;
            const destTab: DagTabOptimized = <DagTabOptimized>DagTabManager.Instance.getTabById(tabId);
            const destNode: DagNode = destTab.getGraph().getNode(nodeId);

            this._addLevel0Lineage(destNodeInfo, destNode.getDescription());
            let succeed: boolean = this._addLineagesFromTag(destNode.getTag());
            if (!succeed) {
                console.warn("parse comment tag of source node lineage not work!");
                this._addLineagesFromDestMeta(destNode, tabId);
            }
        } catch (e) {
            console.error(e);
        }
    }

    // level 0 show dest node info
    private _addLevel0Lineage(destNodeInfo: DagTagInfo, description: string): void {
        let tableName: string = "";
        try {
            tableName = JSON.parse(description).dest;
        } catch (e) {
            console.error(e);
        }
        this._lineages[0] = {
            type: DFNodeLineageType.Dest,
            nodeId: destNodeInfo.nodeId,
            tabId: destNodeInfo.tabId,
            tableName
        };
    }

    // level 1 show the source dataflow info
    private _addLevel1Lineage(tabId: string): void {
        // level 1 show dataflow name
        this._lineages[1] = {
            type: DFNodeLineageType.DF,
            tabId: tabId,
            nodeId: null
        };
    }

    private _addSQLSubTabLineage(tabId: string, level: number): void {
        this._lineages[level] = {
            type: DFNodeLineageType.Node,
            tabId: tabId,
            nodeId: null
        };
    }

    /**
     * a sample of tag:
     * [
     *  {nodeId: "dag_5CCB3F1427FA88D5_1574286026344_146", tabId: "DF2_5CCB3F1427FA88D5_1574284918413_0"}
     *  {nodeId: "dag_5CCB3F1427FA88D5_1574286175636_37"}
     *  {nodeId: "dag_5CCB3F1427FA88D5_1574286175637_38"}
     * ]
     * @param tag
     */
    private _addLineagesFromTag(tag: DagTagInfo[]): boolean {
        // try to get source node from tag
        if (tag && tag.length) {
            let i = tag.length - 1;
            // find the first tag that has tab id, the rest are from custom node
            for (; i >= 0; i--) {
                const srcTabId: string = tag[i].tabId;
                if (srcTabId != null) {
                    this._addLevel1Lineage(srcTabId);
                    break;
                }
            }
            if (i >= 0) {
                const lineages = tag.slice(i).map((tag: DagTagInfo) => {
                    return {
                        type: DFNodeLineageType.Node,
                        ...tag
                    }
                });
                this._lineages = this._lineages.concat(lineages);
                return true;
            }
        }
        return false;
    }

    // TODO: deprecate this backup function as it should never be used
    private _addLineagesFromDestMeta(
        destNode: DagNode,
        destTabId: string
    ): void {
        // check if it's the final node
        const tableName: string = destNode.getTable();
        if (tableName) {
            const res = DagTabOptimized.parseOutputTableName(tableName);
            const srcTabId: string = res.tabId;
            const srcNodeId = res.nodeId;
            this._addLevel1Lineage(srcTabId);
            this._lineages.push({
                type: DFNodeLineageType.Node,
                tabId: srcTabId,
                nodeId: srcNodeId
            });
        } else if (destTabId.startsWith("xcRet")) {
            let srcTabId: string = destTabId.slice("xcRet_".length, destTabId.indexOf("_dag"));
            this._addLevel1Lineage(srcTabId);
        }
    }

    private _renderLineagesView(): void {
        try {
            for (let i = 0; i < this._lineages.length; i++) {
                const hasNextLevel: boolean = this._render(i);
                // level 1 and level 0 should always be rendered
                if (i >= 1 && !hasNextLevel) {
                    break;
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _render(level: number): boolean {
        const $section: JQuery = this._getPopupMain();
        if ($section.find(".row[data-level=\"" + level + "\"]").length) {
            // already render
            return true;
        }

        let html: HTML = "";
        let isNextLevelOpen: boolean = false;
        try {
            const lineage: DFNodeLineage = this._lineages[level];
            if (!lineage.tabId) {
                // when no tabId, this level is not ready to render
                return false;
            }
            isNextLevelOpen = this._isNextLevelOpen(level);
            this._updateLineage(lineage);

            const classNames: string[] = ["row"];
            if (!isNextLevelOpen && level !== 0) {
                classNames.push("collapse");
            }
            html = '<div class="' + classNames.join(" ") + '" data-level="' + level + '">' +
                        this._getPaddingHTML(level) +
                        this._getIconHTML(lineage, isNextLevelOpen) +
                        this._getContentHTML(lineage) +
                        this._getFindAllIcon(lineage) +
                    '</div>';
        } catch (e) {
            console.error(e);
            html = this._getErrorHTML(DFNodeLineageTStr.NoSourceNode);
        }

        $section.append(html);
        this._adjustPopupHeight();

        return isNextLevelOpen;
    }

    private _isNextLevelOpen(level: number): boolean {
        const nextLineage = this._lineages[level + 1];
        if (nextLineage) {
            const { tab } = this._getNodeAndTabFromLineage(nextLineage);
            if (tab && tab.isOpen()) {
                return true;
            }
        }
        return false;
    }

    private _updateLineage(lineage: DFNodeLineage): void {
        const {node} = this._getNodeAndTabFromLineage(lineage);
        if (node) {
            if (node instanceof DagNodeSQL) {
                lineage.type = DFNodeLineageType.SQL;
            } else if (node instanceof DagNodeCustom) {
                lineage.type = DFNodeLineageType.Custom;
            }
        }
    }

    private _getNodeAndTabFromLineage(
        lineage: DFNodeLineage
    ): {node: DagNode, tab: DagTab} {
        let node: DagNode = null;
        const tabId: string = lineage.tabId;
        const tab: DagTab = DagTabManager.Instance.getTabById(tabId) ||
        DagList.Instance.getDagTabById(tabId);
        try {
            let nodeId: string;
            if (tab instanceof DagTabSQL) {
                nodeId = this._findNodeInSQLTab(tab);
            } else {
                nodeId = lineage.nodeId;
            }
            if (nodeId != null) {
                node = tab.getGraph().getNode(nodeId);
            }
        } catch (e) {
            // code can go there if tab id or node id is empty
            // which are normal cases
        }
        return {
            tab,
            node
        };
    }

    private _getPaddingHTML(level: number): HTML {
        let html = "";
        for (let i = 0; i < level; i ++) {
            html += '<span class="padding"></span>';
        }
        return html;
    }

    private _getIconHTML(lineage: DFNodeLineage, isNextLevelOpen: boolean): HTML {
        if (lineage.type === DFNodeLineageType.Dest) {
            // a normal node or the optimized node
            return "";
        }

        if (lineage.type === DFNodeLineageType.Node) {
            return this._getPaddingHTML(1);
        }

        const classNames: string[] = ["toggle", "xc-action"];
        if (!isNextLevelOpen) {
            classNames.push("load");
        }
        return '<span class="' + classNames.join(" ") + '">' +
                    '<i class="icon xi-down"></i>' +
                    '<i class="icon xi-next"></i>' +
                '</span>';
    }

    private _getContentHTML(lineage: DFNodeLineage): HTML {
        const {tab, node} = this._getNodeAndTabFromLineage(lineage);
        return (lineage.type === DFNodeLineageType.DF)
            ? this._getDataflowRowHTML(tab)
            : this._getNodeRowHTML(node);
    }

    private _getDataflowRowHTML(dagTab: DagTab): HTML {
        return  '<i class="icon xi-dataflow-thin"></i>' +
                '<span class="link"' +
                ' data-toggle="tooltip"' +
                ' data-container="body"' +
                ' data-placement="auto top"' +
                ' data-title="' + DFNodeLineageTStr.DFTooltip + '">' +
                    dagTab.getName() +
                '</span>';
    }

    private _getNodeRowHTML(node: DagNode): HTML {
        return '<div class="nodeIcon"></div>' +
                '<span class="link"' +
                ' data-toggle="tooltip"' +
                ' data-container="body"' +
                ' data-placement="auto top"' +
                ' data-title="' + DFNodeLineageTStr.NodeTooltip + '">' +
                    node.getDisplayNodeType() +
                '</span>' +
                '<span class="label">' +
                    node.getTitle() +
                '</span>';
    }

    private _getFindAllIcon(lineage: DFNodeLineage): HTML {
        let html: HTML = "";
        if (lineage.type === DFNodeLineageType.SQL ||
            lineage.type === DFNodeLineageType.Custom
        ) {
            let tooltip: string = "";
            if (lineage.type === DFNodeLineageType.SQL) {
                tooltip = DFNodeLineageTStr.FindRelatedSQL;
            } else if (lineage.type === DFNodeLineageType.Custom) {
                tooltip = DFNodeLineageTStr.FindRelatedCustom;
            }
            html = '<span class="highlightRelated xc-action"' +
                    ' data-toggle="tooltip"' +
                    ' data-container="body"' +
                    ' data-placement="auto top"' +
                    ' data-title="' + tooltip + '">' +
                        '<i class="icon xi-search"></i>' +
                    '</span>';
        }
        return html;
    }

    private _getErrorHTML(error: string): HTML {
        return '<div class="row error">' + error + '</div>';
    }

    private _getSQLTag(): string {
        const tableName: string = this._lineages[0].tableName;
        // XXX TODO: use a global enum to replace all occurrance of SQLTAG
        let startIdx: number = tableName.indexOf("SQLTAG");
        if (startIdx < 0) {
            // no sql tag, not continue
            throw new Error(DFNodeLineageTStr.NoSQLNode);
        }
        let endIdx: number = tableName.indexOf("#", startIdx);
        let sqlTag: string = tableName.substring(startIdx, endIdx);
        if (!sqlTag) {
            throw new Error(DFNodeLineageTStr.NoSQLNode);
        }
        return sqlTag;
    }

    private _findNodeInSQLTab(tab: DagTabSQL): string {
        const sqlTag: string = this._getSQLTag();
        return this._findNodeByTagInTab(tab, sqlTag, false);
    }

    private _findNodeInOptimizedTab(tab: DagTab): string {
        const tableName: string = this._lineages[0].tableName;
        return this._findNodeByTagInTab(tab, tableName, true);
    }

    private _findNodeByTagInTab(
        tab: DagTab,
        tag: string,
        shouldEqual: boolean
    ): DagNodeId {
        let candiateNodes: DagNode[] = [];
        // description includes source table name and dest name
        // we'll do a rough filter first the look at if the dest table name matches
        tab.getGraph().getAllNodes().forEach((node: DagNode) => {
            if (node.getDescription().includes(tag)) {
                candiateNodes.push(node);
            }
        });

        candiateNodes = candiateNodes.filter((node) => {
            try {
                let dest: string = JSON.parse(node.getDescription()).dest;
                return shouldEqual ? dest === tag : dest.includes(tag);
            } catch (e) {
                console.error(e);
            }
        });

        if (candiateNodes.length > 1) {
            // error case, should never happen
            throw new Error(this._getMulipleSourceError(candiateNodes));
        } else if (candiateNodes.length === 0) {
            throw new Error(DFNodeLineageTStr.NoSourceNode);
        }

        return candiateNodes[0].getId();
    }

    private _getMulipleSourceError(nodes: DagNode[]): string {
        let nodeTitles: string[] = nodes.map((node) => node.getTitle());
        let error: string = DFNodeLineageTStr.MultipleNode + ": " +
        nodeTitles.join(",");
        return error;
    }

    private async _focusOnLevel(level: number): Promise<void> {
        const lineage: DFNodeLineage = this._lineages[level];
        const tab: DagTab = await this._openTabInLevel(level);
        DagTabManager.Instance.switchTab(tab.getId());

        if (level === 1) {
            // dataflow level do nothing
            return;
        }
        let nodeId: DagNodeId;
        if (level === 0) {
            nodeId = this._findNodeInOptimizedTab(tab);
            this._dealyFocusOnLevel0(tab);
        } else if (tab instanceof DagTabSQL) {
            nodeId = this._findNodeInSQLTab(tab);
        } else {
            nodeId = lineage.nodeId;
        }
        this._focusOnNode(nodeId, tab.getId());
    }

    private async _openTabInLevel(level: number): Promise<DagTab> {
        const lineage: DFNodeLineage = this._lineages[level];
        const tabId: string = lineage ? lineage.tabId : null;
        const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
        if (tab && tab.isOpen()) {
            // resue case
            return tab;
        }

        if (level <= 1) {
            // level 0 or 1 should directly open
            return this._openTabById(tabId);
        }

        // recurisve call to open previous level's tab first
        await this._openTabInLevel(level - 1);

        const parentLineage: DFNodeLineage = this._lineages[level -1];
        if (parentLineage.type === DFNodeLineageType.Custom) {
            // when current level is a custom sub tab
            const subTab = await this._inspectCustomNode(parentLineage.tabId, parentLineage.nodeId);
            this._lineages[level].tabId = subTab.getId();
            return subTab;
        } else if (parentLineage.type === DFNodeLineageType.SQL) {
            // when current level is a sql sub tab
            const subTab = await this._inspectSQLNode(parentLineage.tabId, parentLineage.nodeId);
            this._addSQLSubTabLineage(subTab.getId(), level);
            return subTab;
        } else {
            // normal tab
            return this._openTabById(tabId);
        }
    }

    private async _openTabById(tabId: string): Promise<DagTab> {
        const tab: DagTab = DagList.Instance.getDagTabById(tabId);
        if (!tab) {
            throw new Error(DFNodeLineageTStr.NoSourceTab);
        }

        try {
            await DagTabManager.Instance.loadTab(tab);
            return tab;
        } catch (e) {
            throw new Error(DFNodeLineageTStr.SourceTabLoadErr);
        }
    }

    private async _inspectCustomNode(
        tabId: string,
        nodeId: DagNodeId
    ): Promise<DagTab> {
        try {
            const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
            const customNode: DagNodeCustom = <DagNodeCustom>tab.getGraph().getNode(nodeId);
            const subTabId: string = DagTabManager.Instance.newCustomTab(customNode);
            const subTab: DagTab = DagTabManager.Instance.getTabById(subTabId);
            return subTab;
        } catch (e) {
            console.error(e);
            throw new Error(DFNodeLineageTStr.NoSourceTab);
        }
    }

    private async _inspectSQLNode(
        tabId: string,
        nodeId: DagNodeId
    ): Promise<DagTab> {
        try {
            const subTabId: string = await DagViewManager.Instance.inspectSQLNode(nodeId, tabId);
            return DagTabManager.Instance.getTabById(subTabId);
        } catch (e) {
            throw new Error(DFNodeLineageTStr.NoSourceTab);
        }
    }

    // optimized dataflow will re-render,  so need to dealy the focus
     private _dealyFocusOnLevel0(tab: DagTab): void {
        this._onUpdate = (tabId) => {
            if (tab.getId() === tabId) {
                this._onUpdate = undefined;
                const nodeId: DagNodeId = this._findNodeInOptimizedTab(tab);
                this._focusOnNode(nodeId, tab.getId());
            }
        };
    }

    private _focusOnNode(nodeId: DagNodeId, tabId: string): void {
        let $node = DagViewManager.Instance.selectNodes(tabId, [nodeId]);
        $node.scrollintoview({duration: 0});
    }

    private _getLevelFromRowEl($row: JQuery): number {
        return Number($row.data("level"));
    }

    private _higilightRelatedNodes(level): void {
        let lineage: DFNodeLineage = this._lineages[level];
        let destTabId: string = this._lineages[0].tabId;
        let destTab: DagTabOptimized = <DagTabOptimized>DagTabManager.Instance.getTabById(destTabId);
        // find all related nodes
        let relatedNodes: DagNode[] = [];
        destTab.getGraph().getAllNodes().forEach((node) => {
            let tag = node.getTag() || [];
            // we are not checking tabId here because in the case of
            // nested SQL node in a custom node, the tag doesn't have the tabId
            // while the lineage's tab id is the temp custom node tab
            for (let nodeInfo of tag) {
                if (nodeInfo &&
                    nodeInfo.nodeId === lineage.nodeId
                ) {
                    relatedNodes.push(node);
                    break;
                }
            }
        });

        this._removeHilights();

        // switch back to optimized dataflow
        DagTabManager.Instance.switchTab(destTabId);
        let dagView = DagViewManager.Instance.getActiveDagView();
        relatedNodes.forEach((node) => {
            let $node = dagView.getNodeElById(node.getId());
            DagView.addSelection($node, "graphHighLightSelection");
        });
    }

    private _removeHilights(): void {
        let lineage = this._lineages[0];
        if (lineage == null) {
            return;
        }
        let destTabId: string = lineage.tabId;
        let $dfArea = DagViewManager.Instance.getAreaByTab(destTabId);
        if ($dfArea) {
            $dfArea.find(".graphHighLightSelection").remove();
        }
    }

    private _addEventListeners(): void {
        const $popUp: JQuery = this._getPopup();
        $popUp.on("click", ".close", () => {
            this._close();
        });

        $popUp.on("click", ".link", async (e) => {
            const $row: JQuery = $(e.currentTarget).closest(".row");
            try {
                const level: number = this._getLevelFromRowEl($row);
                await this._focusOnLevel(level);
            } catch(e) {
                StatusBox.show(e.message, $row);
            }
        });

        $popUp.on("click", ".load", async (e) => {
            const $span: JQuery = $(e.currentTarget);
            const $row: JQuery = $span.closest(".row");
            try {
                const level: number = this._getLevelFromRowEl($row);
                await this._focusOnLevel(level + 1);
                this._render(level + 1);
                $span.replaceWith(this._getIconHTML(this._lineages[level], true));
                $row.removeClass("collapse");
                xcUIHelper.scrollToBottom(this._getPopupMain());
            } catch(e) {
                StatusBox.show(e.message, $row);
            }
        });

        $popUp.on("click", ".toggle", (e) => {
            const $span: JQuery = $(e.currentTarget);
            if ($span.hasClass("load")) {
                // not handle it
                return;
            }
            $span.closest(".row").toggleClass("collapse");
        });

        $popUp.on("click", ".highlightRelated", (e) => {
            const $span: JQuery = $(e.currentTarget);
            const $row: JQuery = $span.closest(".row");
            try {
                const level: number = this._getLevelFromRowEl($row);
                this._higilightRelatedNodes(level);
            } catch (e) {
                console.error(e);
                StatusBox.show(e.message, $row);
            }
        });
    }
}