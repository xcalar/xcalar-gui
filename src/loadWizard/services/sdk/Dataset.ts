import { Table } from './Table';
import { getThriftHandler } from './Api';
import { IXcalarSession } from './Session';

class Dataset {
    private _session: IXcalarSession;
    private _name: string;
    private _sourceArgs: any;
    private _parseArgs: any;
    private _size: number;
    private _columns: Map<string, any>;

    constructor(params: {
        session: IXcalarSession,
        name: string,
        sourceArgs: any,
        parseArgs: any,
        size: number
    }) {
        const { session, name, sourceArgs, parseArgs, size = 0 } = params;
        this._session = session;
        this._name = name;
        this._sourceArgs = sourceArgs;
        this._parseArgs = parseArgs;
        this._size = size;
        this._columns = null;
    }

    public getName() {
        return this._name;
    }

    public getDSName() {
        const DATASET_PREFIX = gDSPrefix || '.XcalarDS.';
        return DATASET_PREFIX + this._name;
    }

    public async load() {
        const option = {
            sources: this._sourceArgs,
            ...this._parseArgs
        };
        await this._session.callLegacyApi(
            () => XcalarDatasetLoad(this._name, option)
        );
    }

    private async _loadMetadata() {
        if (this._columns == null) {
            const datasetName = this.getName();
            const datasetInfo = await this._session.callLegacyApi(
                () => XcalarGetDatasetsInfo(datasetName)
            );

            const columnMap = new Map();
            for (const columnInfo of datasetInfo.datasets[0].columns) {
                columnMap.set(columnInfo.name, {});
            }
            this._columns = columnMap;
        }
    }

    public async getColumnNames() {
        await this._loadMetadata();
        return [...this._columns.keys()];
    }

    public async createPublishedTable(tableName: string) {
        const XCALAR_ROWNUM_PK_NAME = 'XcalarRowNumPk';

        const dsName = this.getDSName();
        const datasetName = this.getName();
        // Temporary table names
        const tableNames = this._createIdGenerator(`${datasetName}-table`);
        const tempTables = Array();

        try {
            const tableColumnNames = await this.getColumnNames();

            // Index Dataset
            const opIndex = () => xcalarIndex(
                getThriftHandler(),
                dsName,
                tableNames.next(),
                [new XcalarApiKeyT({
                    name: "xcalarRecordNum",
                    type:"DfInt64",
                    keyFieldName:"",
                    ordering:"Unordered"})],
                datasetName
            );
            await this._session.callLegacyApi(opIndex);
            tempTables.push(new Table({ session: this._session, tableName: tableNames.last()}));

            // Map-casting all columns to strings - make table of immediates
            const allEvals = tableColumnNames.map((name) => `string(${datasetName}::${name})`);
            const opMap = () => xcalarApiMap(
                getThriftHandler(),
                tableColumnNames,
                allEvals,
                tableNames.last(),
                tableNames.next()
            );
            await this._session.callLegacyApi(opMap);
            tempTables.push(new Table({ session: this._session, tableName: tableNames.last()}));

            // Add Xcalar Row Number PK
            const opRowNum = () => xcalarApiGetRowNum(
                getThriftHandler(),
                XCALAR_ROWNUM_PK_NAME,
                tableNames.last(),
                tableNames.next()
            );
            await this._session.callLegacyApi(opRowNum);
            tableColumnNames.push(XCALAR_ROWNUM_PK_NAME);
            tempTables.push(new Table({ session: this._session, tableName: tableNames.last()}));

            // Index on Xcalar Row Number PK
            console.log("Indexing on Xcalar Row Number Primary Key");
            const opIndex2 = () => xcalarIndex(
                getThriftHandler(),
                tableNames.last(),
                tableNames.next(),
                [new XcalarApiKeyT({
                    name: XCALAR_ROWNUM_PK_NAME,
                    type: "DfInt64",
                    keyFieldName:"",
                    ordering:"Unordered"})]
            );
            await this._session.callLegacyApi(opIndex2);
            tempTables.push(new Table({ session: this._session, tableName: tableNames.last()}));

            // Project tables...
            const opProject = () => xcalarProject(
                getThriftHandler(),
                tableColumnNames.length,
                tableColumnNames,
                tableNames.last(),
                tableNames.next()
            );
            await this._session.callLegacyApi(opProject);
            tempTables.push(new Table({ session: this._session, tableName: tableNames.last()}));

            // Map on XcalarOpCode and XcalarRankOver
            // TODO: figure out if this is actually needed, I don't think it is?
            const opMap2 = () => xcalarApiMap(
                getThriftHandler(),
                ['XcalarOpCode', 'XcalarRankOver'],
                ['int(1)', 'int(1)'],
                tableNames.last(),
                tableNames.next()
            );
            await this._session.callLegacyApi(opMap2);
            const finalTable = new Table({
                session: this._session,
                tableName: tableNames.last()
            });
            tempTables.push(finalTable);

            // Publish tables...
            return await finalTable.publish(tableName);
        } finally {
            // Delete temporary tables
            for (const table of tempTables) {
                await table.destroy();
            }
        }
    }

    async destroy() {
        try {
            this._session.callLegacyApi(
                () => XcalarDatasetDeactivate(this.getName())
            );
        } catch(e) {
            console.warn(`Destroy dataset(${this._name}) failed: `, e);
        }
    }

    _createIdGenerator(prefix) {
        const ids = new Array();
        return {
            next: () => {
                const id = `${prefix}-${ids.length}`;
                ids.push(id);
                return id;
            },
            last: () => ids[ids.length - 1]
        };
    }
}

export { Dataset };