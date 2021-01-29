// General Class for Source Node
abstract class DagNodeIn extends DagNode {
    protected schema: ColSchema[];
    private lastSchema: ColSchema[];
    private headName: string | null;
    public constructor(options: DagNodeInInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.maxParents = 0;
        this.minParents = 0;
        if (options && options.schema) {
            this.setSchema(options.schema);
        } else {
            this.setSchema([]);
        }
        this.lastSchema = this.schema;
        if (options && options.headName) {
            this.headName = options.headName
        } else {
            this.headName = null;
        }
    }

    public setParam(_param?: any, noAutoExecute?: boolean): boolean | void {
        let hasSetParam = super.setParam(_param, noAutoExecute);
        if (hasSetParam) {
            return true;
        } else if (this._hasSchemaChanges()) {
            this._setParam(noAutoExecute);
            return true;
        } else {
            // nothing to set
            return false;
        }
    }

    public getSchema(): ColSchema[] {
        return this.schema;
    }

    public setSchema(schema: ColSchema[], refresh: boolean = false) {
        this.lastSchema = this.schema;
        this.schema = schema;
        if (refresh) {
            // lineage reset is done in DagView
            this.events.trigger(DagNodeEvents.LineageSourceChange, {
                node: this
            });
        }
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        const schema: ColSchema[] = this.getSchema(); // DagNodeDataset overide the function
        const columns: ProgCol[] = schema.map((colInfo) => {
            const colName: string = colInfo.name;
            const frontName: string = xcHelper.parsePrefixColName(colName).name;
            return ColManager.newPullCol(frontName, colName, colInfo.type);
        });

        return {
            columns: columns,
            changes: []
        };
    }

    public setHead(name: string, isChange?: boolean): void {
        const oldName: string = this.headName;
        this.headName = name;
        if (isChange) { // prevents event from firing when title is set when
            // new node is created
            this.events.trigger(DagNodeEvents.HeadChange, {
                id: this.getId(),
                oldName,
                name,
                node: this
            });
        }
    }

    public getHead(): string {
        return this.headName;
    }

    public canHaveParents(): boolean {
        return this.maxParents !== 0;
    }

    protected _getSerializeInfo(includeStats?: boolean, forCopy?: boolean):DagNodeInInfo {
        const serializedInfo: DagNodeInInfo = <DagNodeInInfo>super._getSerializeInfo(includeStats);
        serializedInfo.schema = this.schema; // should save the schema directly, should not call getSchema
        serializedInfo.headName = this.headName;
        return serializedInfo;
    }

    private _hasSchemaChanges(): boolean {
        return JSON.stringify(this.lastSchema) !== JSON.stringify(this.schema);
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeIn = DagNodeIn;
};
