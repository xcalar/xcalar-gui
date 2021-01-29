class SQLOpPanelModel extends BaseOpPanelModel {
    protected _dagNode: DagNodeSQL;
    private _sqlQueryStr: string;
    private _identifiers: Map<number, string>;
    private _dropAsYouGo: boolean;
    private _outputTableName: string;
    private _sourceMapping: any[];

    public constructor(dagNode: DagNodeSQL) {
        super();
        this._dagNode = dagNode;
        const params = this._dagNode.getParam();
        this._initialize(params);
    }

    private _initialize(params: DagNodeSQLInputStruct): void {
        this._sqlQueryStr = params.sqlQueryStr;
        if (!params.mapping || (Object.keys(params.identifiers).length > params.mapping.length)) {
            this._sourceMapping = [];
            if (params.identifiers) {
                let identifiersArray = [];

                for (let i in params.identifiers) {
                    identifiersArray.push({
                        key: parseInt(i),
                        value: params.identifiers[i]
                    });
                }
                identifiersArray.sort((a, b) => {
                    return a.key - b.key
                });
                identifiersArray.forEach((identifier, i) => {
                    this._sourceMapping.push({
                        "identifier": identifier.value,
                        "source": this._dagNode.getParents()[i] ? (i + 1) : null
                    });
                });
            }
        } else {
            this._sourceMapping = params.mapping;
        }
        this._dagNode.getParents().forEach((parentNode, index) => {
            const found = this._sourceMapping.find((connector) => {
                return connector.source === (index + 1)
            });
            if (!found) {
                let empty = this._sourceMapping.find((connector) => {
                    return connector.source === null
                });
                if (empty) {
                    empty.source = index + 1;
                } else {
                    this._sourceMapping.push({
                        identifier: null,
                        source: index + 1
                    });
                }
            }
        });
        this._dropAsYouGo = params.dropAsYouGo;
        this._outputTableName = params.outputTableName;
    }

    public setDataModel(
        sqlQueryStr: string,
        sourceMapping: any[],
        dropAsYouGo: boolean,
        outputTableName?: string
    ): void {
        this._sqlQueryStr = sqlQueryStr;
        this._dropAsYouGo = dropAsYouGo;
        this._outputTableName = outputTableName;
        this._sourceMapping = sourceMapping;
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(noAutoExecute?: boolean): void {
        const param = this._getParam();
        const identifiers = new Map();
        this._sourceMapping.forEach((connector, i) => {
            identifiers.set(i + 1, connector.identifier);
        })
        this._dagNode.setIdentifiers(identifiers);
        this._dagNode.setParam(param, noAutoExecute);
    }

    private _getParam(): DagNodeSQLInputStruct {
        return {
            sqlQueryStr: this._sqlQueryStr,
            dropAsYouGo: this._dropAsYouGo,
            outputTableName: this._outputTableName,
            mapping: this._sourceMapping
        }
    }

    public getSqlQueryString(): string {
        return this._sqlQueryStr;
    }

    public getOutputTableName(): string {
        return this._outputTableName;
    }


    public isDropAsYouGo(): boolean {
        return this._dropAsYouGo;
    }

    public getSourceMapping() {
        return this._sourceMapping;
    }

    // XXX still used in sqlTest
    public getIdentifiers(): Map<number, string> {
        return this._identifiers;
    }

      // XXX still used in sqlTest
    public setIdentifiers(identifiers: Map<number, string>): void {
        this._identifiers = identifiers;
    }
}