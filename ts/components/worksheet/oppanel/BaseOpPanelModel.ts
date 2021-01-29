abstract class BaseOpPanelModel {
    protected _title: string;
    protected _instrStr: string;
    protected _instrStrTip: string;
    protected _allColMap: Map<string, ProgCol> = new Map();

    constructor() {
        this._title = '';
        this._instrStr = '';
        this._instrStrTip = "";
    }
    public static refreshColumns(model, dagNode: DagNode) {
        model._allColMap = this._createColMap(dagNode);
        return model;
    }

    protected static _createColMap(dagNode: DagNode): Map<string, ProgCol> {
        const colMap: Map<string, ProgCol> = new Map();
        const parents = dagNode.getParents();
        if (parents != null && parents.length !== 0) {
            for (const parent of parents) {
                if (parent == null) {
                    continue;
                }
                for (const col of parent.getLineage().getColumns(false, true)) {
                    colMap.set(
                        col.getBackColName(),
                        ColManager.newPullCol(
                            col.getFrontColName(),
                            col.getBackColName(),
                            col.getType()
                        )
                    );
                }
            }
        }
        return colMap;
    }

    // different from _createColMap in that it doesn't create new ProgCols
    public static getColumnsFromDag(dagNode: DagNode): Map<string, ProgCol> {
        const allColsList: ProgCol[][] = dagNode.getParents().map((parentNode) => {
            if (parentNode == null) {
                return [];
            }
            return parentNode.getLineage().getColumns(false, true);
        });
        const allColMap: Map<string, ProgCol> = new Map();
        for (const cols of allColsList) {
            for (const col of cols) {
                allColMap.set(col.getBackColName(), col);
            }
        }
        return allColMap;
    }

    public getColumnMap(): Map<string, ProgCol> {
        return this._allColMap;
    }

    public getTitle(): string {
        return this._title;
    }

    public getInstrStr(): string {
        return this._instrStr;
    }

    public getInstrStrTip(): string {
        return this._instrStrTip;
    }
}