// a read only tab to test SQL's execution plan
class DagTabScalarFnExecute extends DagTabExecuteOnly {
    public static readonly ID = "DF_ScalarFnExecute";
    public static readonly Name = "Scalar Fn Test";

    public constructor() {
        super(DagTabScalarFnExecute.ID, DagTabScalarFnExecute.Name, "noDagTabScalarFnExecuteAlert");
        this._type = DagTabType.SQLExecute;
    }

    // XXX test only
    // DagTabScalarFnExecute.test
    public static test(sqlNode, mapNode): DagTabScalarFnExecute {
        const dagTab: DagTabScalarFnExecute = DagTabManager.Instance.openAndResetExecuteOnlyTab(new DagTabScalarFnExecute()) as DagTabScalarFnExecute;
        const graph = dagTab.getGraph();
        graph.addNode(sqlNode);
        graph.addNode(mapNode);
        graph.connect(sqlNode.getId(), mapNode.getId());
        DagViewManager.Instance.getActiveDagView().rerender();
        DagViewManager.Instance.autoAlign(dagTab.getId());
        return dagTab;
    }

    /**
     * @override
     */
    public isEditable(): boolean {
        return false;
    }

    public load(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    public save(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    public getIcon(): string {
        return 'xi-menu-udf';
    }
}