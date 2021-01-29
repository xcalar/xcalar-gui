import { callApiInSession, randomName } from './Api';
import { IXcalarUser, LoginUser, User } from './User';
import { Table } from './Table';
import { Dataset } from './Dataset';
import { PublishedTable } from './PublishedTable';
import { SharedTable } from './SharedTable';

class GlobalSession {
    public user: IXcalarUser;

    constructor({ user }) {
        this.user = user;
    }
}

function replaceParams(query, params = new Map()) {
    let queryString = query;
    for (const [key, value] of params) {
        const replacementKey = `<${key}>`;
        queryString = queryString.replace(replacementKey, value);
    }
    return queryString;
}

interface IXcalarSession {
    user: IXcalarUser,
    sessionName: string,
    sessionId: string,

    create(): Promise<void>,
    delete(): Promise<void>,
    activate(): Promise<void>,
    deactivate(): Promise<void>,
    destroy(): Promise<void>,

    callLegacyApi<T>(apiCall: () => Promise<T>): Promise<T>;

    executeSql(sql: string, tableName?: string): Promise<Table>;

    createDataset(params: {
        name: string,
        sourceArgs: any,
        parseArgs: any,
        size?: number
    }): Promise<Dataset>;

    getPublishedTable(params: { name: string }): Promise<PublishedTable>;

    listTables(params?: {
        namePattern?: string,
        isGlobal?: boolean
    }): Promise<Array<Table> | Array<SharedTable>>;

    deleteTables(params: { namePattern: string }): Promise<void>;

    executeQuery(args: {
        queryString: string,
        queryName: string,
        params?: Map<string, string>
    }): Promise<void>;

    executeQueryOptimized(args: {
        queryStringOpt: string,
        queryName: string,
        tableName: string,
        params?: Map<string, string>
    }): Promise<void>;
}

class BaseSession implements IXcalarSession {
    public user: IXcalarUser;
    public sessionName: string;
    public sessionId: string;
    private _tables: Array<Table>;
    private _datasets: Array<Dataset>;

    constructor(params: {
        user: IXcalarUser,
        sessionName: string
    }) {
        const { user, sessionName } = params;
        this.user = user;
        this.sessionName = sessionName;
        this.sessionId = null;
        this._tables = new Array();
        this._datasets = new Array();
    }

    public async create() {
        this.sessionId = await PromiseHelper.convertToNative(XcalarNewWorkbook(this.sessionName));
    }

    public async delete() {
        await PromiseHelper.convertToNative(XcalarDeleteWorkbook(this.sessionName));
    }

    public async activate() {
        await PromiseHelper.convertToNative(XcalarActivateWorkbook(this.sessionName));
    }

    public async deactivate() {
        await PromiseHelper.convertToNative(XcalarDeactivateWorkbook(this.sessionName, false));
    }

    public async destroy() {
        try {
            // Cleanup tables
            while (this._tables.length > 0) {
                const table = this._tables.pop();
                await table.destroy();
            }
            // Cleanup datasets
            while (this._datasets.length > 0) {
                const dataset = this._datasets.pop();
                await dataset.destroy();
            }
            await this.deactivate();
            await this.delete();
        } catch(e) {
            console.warn(`Destroy session ${this.sessionName} failed:`, e);
        }
    }

    public callLegacyApi<T>(apiCall: () => Promise<T>) {
        return callApiInSession(this.sessionName, this.user.getUserName(), this.user.getUserId(), apiCall, this.user.getHashFunc());
    }

    public async executeSql(sql: string, tableName: string = null): Promise<Table> {
        const resultTableName = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSqlService().executeSql({
            sqlQuery: sql,
            tableName: tableName,
            queryName: `XcalarLW-${Date.now()}`,
            userName: this.user.getUserName(),
            userId: this.user.getUserId(),
            sessionName: this.sessionName
        });

        const table = new Table({ session: this, tableName: resultTableName });
        this._tables.push(table);
        return table;
    }

    public async createDataset(params: {
        name: string,
        sourceArgs: any,
        parseArgs: any,
        size?: number
    }): Promise<Dataset> {
        const { name, sourceArgs, parseArgs, size = 0 } = params;
        const dataset = new Dataset({
            session: this,
            name: name,
            sourceArgs: sourceArgs,
            parseArgs: parseArgs,
            size: size
        });
        await dataset.load();
        this._datasets.push(dataset);

        return dataset;
    }

    async getPublishedTable(params: { name: string }): Promise<PublishedTable> {
        const { name } = params;
        const result = await PromiseHelper.convertToNative(XcalarListPublishedTables(name));
        if (result.tables.length === 0) {
            return null;
        }
        for (const tableInfo of result.tables) {
            if (tableInfo.name === name) {
                return new PublishedTable({
                    session: this,
                    name: name,
                    isActive: tableInfo.active
                });
            }
        }
    }

    async listTables(params?: {
        namePattern?: string,
        isGlobal?: boolean
    }): Promise<Array<Table> | Array<SharedTable>> {
        const { namePattern = '*', isGlobal = false } = params || {};
        const scope = isGlobal
            ? Xcrpc.Table.SCOPE.GLOBAL
            : Xcrpc.Table.SCOPE.WORKBOOK;
        const scopeInfo = isGlobal
            ? null
            : { userName: this.user.getUserName(), workbookName: this.sessionName }

        // Call service
        const tableRes = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getTableService().listTables({
            namePattern: namePattern,
            scope: scope,
            scopeInfo: scopeInfo
        });

        // Parse response
        const tableList = [];
        for (let tableName in tableRes) {
            tableList.push(isGlobal
                ? new SharedTable({ name: tableName })
                : new Table({session: this, tableName: tableName})
            );
        }
        return tableList;
    }

    async deleteTables(params: { namePattern: string }): Promise<void> {
        const { namePattern } = params;
        await this.callLegacyApi(() => XcalarDeleteTable(namePattern));
    }

    async executeQuery(args: {
        queryString: string,
        queryName: string,
        params?: Map<string, string>
    }): Promise<void> {
        const { queryString, queryName, params = new Map() } = args;
        return await this.callLegacyApi(() => XcalarQueryWithCheck(
            queryName,
            replaceParams(queryString, params)
        ));
    }

    async executeQueryOptimized(args: {
        queryStringOpt: string,
        queryName: string,
        tableName: string,
        params?: Map<string, string>
    }): Promise<void> {
        const { queryStringOpt, queryName, tableName, params = new Map() } = args;
        // XXX TODO: use DataflowService.execute instead
        const queryString = replaceParams(queryStringOpt, params);
        await this.callLegacyApi(() => XcalarImportRetina(
            queryName, true, null, queryString, this.user.getUserName(), this.sessionName
        ));
        const retinaParams = [];
        // for (const [key, value] of params) {
        //     retinaParams.push(new XcalarApiParameterT({
        //         paramName: key,
        //         paramValue: value
        //     }));
        // }
        try {
            await this.callLegacyApi(() => XcalarExecuteRetina(queryName, retinaParams, {
                activeSession: true,
                newTableName: tableName,
                udfUserName: this.user.getUserName(),
                udfSessionName: this.sessionName
            }));
        } finally {
            try {
                await this.callLegacyApi(() => XcalarDeleteRetina(queryName));
            } catch(e) {
                console.error('Session.executeQueryOptimized error: ', e);
                // Do nothing
            }
        }
    }
}

class XDSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: WorkbookManager.getXDInternalSessionName()
        });
    }

    async create() {}
    async delete() {}
    async activate() {}
    async deactivate() {}
}

const SESSION_PREFIX = 'LWS';
class RandomSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: `${SESSION_PREFIX}_${randomName()}`
        });
    }
}

const loadSessionName = '.XcalarLoad';
class LoadSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: loadSessionName
        });
    }
}

class CurrentSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: sessionName // XD's global sessionName
        });
    }
}

class LoginSession extends BaseSession {
    constructor({ sessionName }) {
        super({
            user: new LoginUser(),
            sessionName: sessionName
        });
    }
}

export {
    IXcalarSession,
    XDSession, RandomSession, GlobalSession, LoadSession, CurrentSession, LoginSession,
    loadSessionName
};