// a read only tab to test SQL's execution plan
class DagTabMain extends DagTabUser {
    constructor(options) {
        super(options)
        this._type = DagTabType.Main;
    }

    /**
     * @override
     */
    public getName(): string {
        return "OverView";
    }
}