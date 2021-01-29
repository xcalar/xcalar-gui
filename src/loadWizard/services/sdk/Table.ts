import { normalizeQueryString } from './Api';
import { PublishedTable } from './PublishedTable';
import { SharedTable } from './SharedTable';
import { IXcalarSession } from './Session';
import * as SchemaLoadSetting from '../SchemaLoadSetting'

type TableColumn = {
    name: string, type: string
};

type TableKey = {
    name: string, type: string, ordering: string
};

type TableMetadata = {
    columns: Array<TableColumn>,
    keys: Array<TableKey>
};

class Table {
    private _session: IXcalarSession;
    private _tableName: string;
    private _cursors: Array<Cursor>;
    private _metadata: TableMetadata;

    constructor(params: {
        session: IXcalarSession,
        tableName: string
    }) {
        const { session, tableName } = params;
        this._session = session;
        this._tableName = tableName;
        this._cursors = new Array();
        this._metadata = null;
    }

    public getSession() {
        return this._session;
    }

    public getName() {
        return this._tableName;
    }

    public createCursor(isTrack = true) {
        const cursor = new Cursor({
            session: this._session,
            table: this
        });
        if (isTrack) {
            this._cursors.push(cursor);
        }
        return cursor;
    }

    public async publish(publishedName, options?: {
        isDropSrc?: boolean
    }) {
        const { isDropSrc = false } = options || {};
        const srcTableName = this.getName();

        // Persiste creation DF for XD
        // This must happen before publish table, because the session table will be deleted
        // during publish api call if isDropSrc == true
        const pubTable = new PublishedTable({ name: publishedName, srcTable: this });
        await pubTable.saveDataflow();

        // Publish table
        try {
            await this._session.callLegacyApi(
                () => XcalarPublishTable(
                    srcTableName, publishedName, null, isDropSrc
                )
            );
        } catch(e) {
            try {
                await pubTable.deleteDataflow();
            } catch(_) {
                // Ignore errors
            }
            throw e;
        }

        return pubTable;
    }

    /**
     * Publish table and persiste creation dataflow for restoration
     * @param {string} publishedName
     * @param {any[]} query
     */
    public async publishWithQuery(publishedName, query, options?: {
        isDropSrc?: boolean
    }) {
        const { isDropSrc = false } = options || {};

        const srcTableName = this.getName();
        // Publish table
        await this._session.callLegacyApi(
            () => XcalarPublishTable(
                srcTableName, publishedName, null, isDropSrc
            )
        );

        // Persiste creation DF for XD
        const pubTable = new PublishedTable({ name: publishedName, srcTable: this });
        await pubTable.saveDataflowFromQuery(query, {
            isConvertQuery: !SchemaLoadSetting.get('isStoreQuery', false)
        });

        return pubTable;
    }

    public async publish2(publishedName) {
        const xcalarRowNumPkName = "XcalarRankOver";
        const tempTables = [];
        let srcTableName = this.getName();
        let destTableName = '';

        try {
            const queryList = [];

            const { columns } = await this.getInfo();
            const colNames = new Set(columns.map((c) => c.name));
            if (!colNames.has(xcalarRowNumPkName)) {
                // Add Xcalar Row Number PK
                destTableName = this.getName() + '_rowNum';
                let txId = Transaction.start({ simulate: true });
                await this._session.callLegacyApi(() => XcalarGenRowNum(
                    srcTableName, destTableName, xcalarRowNumPkName, txId
                ));
                queryList.push(normalizeQueryString(Transaction.done(txId,  {
                    noNotification: true,
                    noCommit: true
                })));
                tempTables.push(new Table({
                    session: this._session, tableName: destTableName
                }));
                srcTableName = destTableName;

                // Index on Xcalar Row Number PK
                destTableName = this.getName() + '_index';
                txId = Transaction.start({ simulate: true });
                await this._session.callLegacyApi(() => XcalarIndexFromTable(
                    srcTableName,
                    [{
                        name: xcalarRowNumPkName,
                        type: ColumnType.integer,
                        keyFieldName:"",
                        ordering:XcalarOrderingT.XcalarOrderingUnordered
                    }],
                    destTableName,
                    null,
                    txId
                ));
                queryList.push(normalizeQueryString(Transaction.done(txId,  {
                    noNotification: true,
                    noCommit: true
                })));
                tempTables.push(new Table({
                    session: this._session, tableName: destTableName
                }));
                srcTableName = destTableName;
            }

            const queryString = `[${queryList.join(',')}]`;
            // Run pre create query
            if (queryList.length > 0) {
                await this._session.executeQuery({
                    queryString: queryString,
                    queryName: `q_pub_${srcTableName}`
                });
            }

            // Publish table
            await this._session.callLegacyApi(
                () => XcalarPublishTable(
                    srcTableName, publishedName
                )
            );

            return new PublishedTable({ session: this.getSession(), name: publishedName, preCreateQuery: queryList.map((q) => JSON.parse(q)) });
        } finally {
            await Promise.all(tempTables.map(t => t.destroy()));
        }
    }

    public async share() {
        const scope = Xcrpc.Table.SCOPE.WORKBOOK;
        const scopeInfo = { userName: this._session.user.getUserName(), workbookName: this._session.sessionName }

        const sharedName = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getTableService().publishTable({
            tableName: this.getName(),
            scope: scope,
            scopeInfo: scopeInfo
        });

        return new SharedTable({ name: sharedName});
    }

    public async rename(params: { newName: string }) {
        const { newName } = params;
        await this._session.callLegacyApi(
            () => XcalarRenameTable(this.getName(), newName)
        );
        this._tableName = newName;
    }

    public async destroy(params?: { isCleanLineage?: boolean }) {
        const {isCleanLineage = true} = params || {};
        try {
            while (this._cursors.length > 0) {
                const cursor = this._cursors.pop();
                await cursor.close();
            }
            await this._session.callLegacyApi(
                () => XcalarDeleteTable(this._tableName, null, false, isCleanLineage)
            );
        } catch(e) {
            console.warn(`Destroy table(${this._tableName}) fail`, e);
        }
    }

    public async getInfo() {
        if (this._metadata == null) {
            const metadata = await this._session.callLegacyApi(() => XcalarGetTableMeta(this._tableName));
            this._metadata = {
                columns: metadata.valueAttrs.map(({name, type}) => ({ name: name, type: type })),
                keys: metadata.keyAttr.map(({name, type, ordering}) => ({ name: name, type: type, ordering: ordering }))
            };
        }
        return {
            columns: this._metadata.columns.map((v) => ({...v})),
            keys: this._metadata.columns.map((v) => ({...v}))
        };
    }
}

class Cursor {
    private _session: IXcalarSession;
    private _srcTable: Table;
    private _resultSetId: string;
    private _numRows: number;

    constructor(params: {
        session: IXcalarSession,
        table: Table
    }) {
        const { session, table } = params;
        this._session = session;
        this._srcTable = table;
        this._resultSetId = null;
        this._numRows = null;
    }

    public async open() {
        if (this._resultSetId == null) {
            // resultSetInfo: XcalarApiMakeResultSetOutputT
            const tableName = this._srcTable.getName();
            const resultSetInfo = await this._session.callLegacyApi(
                () => XcalarMakeResultSetFromTable(tableName)
            );
            this._resultSetId = resultSetInfo.resultSetId;
            this._numRows = resultSetInfo.numEntries;
        }
    }

    public isReady() {
        return this._resultSetId !== null;
    }

    public getNumRows() {
        if (this._resultSetId == null) {
            throw new Error('Cursor not open');
        }
        return this._numRows;
    }

    public async position(pos) {
        if (this._resultSetId == null) {
            throw new Error('Cursor not open');
        }
        if (pos >= this._numRows) {
            return false;
        }
        const resultSetId = this._resultSetId;
        await this._session.callLegacyApi(
            () => XcalarSetAbsolute(resultSetId, pos)
        );
        return true;
    }

    public async fetch(numRows) {
        if (this._resultSetId == null) {
            throw new Error('Cursor not open');
        }
        try {
            const resultSetId = this._resultSetId;
            const fetchResult = await this._session.callLegacyApi(
                () => XcalarGetNextPage(resultSetId, numRows)
            );
            return [...fetchResult.values];
        } catch(e) {
            console.error('Cursor.fetch error: ', e);
            return [];
        }
    }

    public async fetchJson(numRows) {
        const stringList = await this.fetch(numRows);
        return stringList.map((s) => JSON.parse(s));
    }

    public async close() {
        try {
            if (this._resultSetId != null) {
                const resultSetId = this._resultSetId;
                this._resultSetId = null;
                this._numRows = null;
                await this._session.callLegacyApi(
                    () => XcalarSetFree(resultSetId)
                );
            }
        } catch(e) {
            console.warn(e);
        }
    }
}

export { Table, Cursor };