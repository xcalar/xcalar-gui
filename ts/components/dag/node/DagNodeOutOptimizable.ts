/**
 * @deprecated
 */
class DagNodeOutOptimizable extends DagNodeOut {
    protected optimized: boolean;

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
    }

    public isOptimized(): boolean {
        return this.optimized;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    public beErrorState(error?: string, keepRetina?: boolean): void {
        this.error = error || this.error;
        this._setState(DagNodeState.Error);
        this._clearConnectionMeta(keepRetina);
    }

    /**
     * @override
     * @returns {boolean}
     */
    public isDeprecated(): boolean {
        if (this.isOptimized()) {
            return true;
        } else {
            return false;
        }
    }

    public getOutColumns(_replaceParameters?: boolean): {columnName: string, headerAlias: string}[] {
        return null;
    }

    protected _clearConnectionMeta(keepRetina?: boolean): void {
        if (!keepRetina && this.isOptimized()) {
            this._removeRetina();
        }
        super._clearConnectionMeta();
    }

    private _removeRetina(): void {
        this.events.trigger(DagNodeEvents.RetinaRemove, {
            nodeId: this.getId(),
            node: this
        });
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeOutOptimizable = DagNodeOutOptimizable;
};
