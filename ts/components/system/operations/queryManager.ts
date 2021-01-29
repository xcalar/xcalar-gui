namespace QueryManager {
    let hasMoreQueries: boolean = true;
    let hasNoMoreQueries: boolean = false;
    let disableLoadMoreQuries: boolean = false;
    let queryLog: XcQueryLog;
    let queryCheckList: {[key: number]: number} = {}; // setTimeout timers
    let canceledQueries: {[key: number]: XcQuery} = {}; // for canceled queries that have been deleted
                              // but the operation has not returned yet
    // XXX store this as a query property
    const sysQueryTypes: string[] = [SQLOps.ProfileSort, SQLOps.ProfileBucketing,
                           SQLOps.ProfileAgg, SQLOps.ProfileStats,
                           SQLOps.QuickAgg, SQLOps.Corr, SQLOps.PreviewDS,
                           SQLOps.DestroyPreviewDS];
    const nonCancelableTypes: string[] = [SQLOps.DestroyDS, SQLOps.DestroyPreviewDS,
                            SQLOps.DeleteTable, SQLOps.DeleteAgg];
    const noOutputs: string[] = [SQLOps.DestroyDS, SQLOps.DestroyPreviewDS,
                            SQLOps.DeleteTable, SQLOps.DeleteAgg];

    // constant
    const checkInterval: number = 2000; // check query every 2s
    let hasSetup = false;

    export interface AddQueryOptions {
        numSteps?: number,
        cancelable?: boolean,
        exportName?: string,
        srcTables?: string[],
        queryMeta?: string,
        dataflowId?: string // used for dataset activation
    }

    export interface AddSubQueryOptions {
        queryName?: string,
        exportFileName?: string,
        retName?: string
    }

    export interface SubQueryDoneOptions {
        retName?: string,
        queryName?: string
    }

    export interface QueryParser {
        query: string;
        name: string;
        srcTables: string[];
        dstTable: string;
        exportFileName?: string;
    }

    /**
     * QueryManager.setup
     */
    export function setup(): void {
        if (hasSetup) {
            return;
        }
        hasSetup = true;
        queryLog = new XcQueryLog();
    };

    // if numSteps is unknown, should take in -1
    /**
     * QueryManager.addQuery
     * @param id
     * @param name
     * @param options
     */
    export function addQuery(
        id: number,
        name: string,
        options: AddQueryOptions
    ): void {
        if (Transaction.isSimulate(id)) {
            return;
        }

        options = options || {};
        const time: number = new Date().getTime();
        const fullName: string = name + "-" + time;
        const numSteps: number = options.numSteps || -1;

        if (nonCancelableTypes.indexOf(name) > -1) {
            options.cancelable = false;
        }

        const mainQuery: XcQuery = new XcQuery({
            "name": name,
            "fullName": fullName,
            "time": time,
            "type": "xcFunction",
            "id": id,
            "dataflowId": options.dataflowId,
            "numSteps": numSteps,
            "cancelable": options.cancelable,
            "srcTables": options.srcTables,
            "version": null,
            "sqlNum": null,
            "state": null,
            "elapsedTime": null,
            "opTime": null,
            "opTimeAdded": null,
            "outputTableName": null,
            "outputTableState": null,
            "queryMeta": options.queryMeta
        });

        queryLog.add(id, mainQuery, true);
        hasNoMoreQueries = false;
        updateView(id, 0, false, false);

        DebugPanel.Instance.addOutput(`Execute ${name}`);
    };

    // queryName will be empty if subquery doesn't belong to a xcalarQuery
    /**
     * QueryManager.addSubQuery
     * @param id
     * @param name
     * @param dstTable
     * @param query
     * @param options
     */
    export function addSubQuery(
        id: number,
        name: string,
        dstTable: string,
        query: string,
        options?: AddSubQueryOptions
    ): void {
        if (Transaction.isSimulate(id) ||
            !queryLog.has(id) ||
            Transaction.checkCanceled(id)) {
            return;
        }

        const mainQuery: XcQuery = queryLog.getForUpdate(id);
        const time: number = new Date().getTime();
        options = options || {};
        const subQuery: XcSubQuery = new XcSubQuery({
            "name": name,
            "time": time,
            "query": query,
            "dstTable": dstTable,
            "id": id,
            "index": mainQuery.subQueries.length,
            "queryName": options.queryName,
            "exportFileName": options.exportFileName,
            "retName": options.retName
        });
        mainQuery.addSubQuery(subQuery);

        if (mainQuery.currStep === mainQuery.subQueries.length - 1) {
            if (options.queryName) {
                xcalarQueryCheck(id);
            } else {
                // delay first check so we don't check too early before
                // the operation has been started
                operationCheck(subQuery, 10);
            }
        }
    };

    /**
     * QueryManager.showLogs
     * should be called at least once initially to show past saved logs
     */
    export function showLogs(): XDPromise<void> {
        const numMoreLogs = 20 - queryLog.size();
        let promise: XDPromise<void>;
        if (numMoreLogs > 0) {
            promise = PromiseHelper.convertToJQuery(loadMore(numMoreLogs));
        } else {
            promise = PromiseHelper.resolve();
        }
        return promise;
    }

    /**
     * QueryManager.queryDone
     * @param id
     */
    export function queryDone(id: number): void {
        if (Transaction.isSimulate(id) || !queryLog.has(id)) {
            return;
        }

        const mainQuery: XcQuery = queryLog.getForUpdate(id);
        mainQuery.setState(QueryStatus.Done);
        if (mainQuery.name === SQLOps.Aggr) {
            mainQuery.outputTableState = "unavailable";
        } else {
            mainQuery.outputTableState = "active";
        }

        mainQuery.setElapsedTime();
        clearIntervalHelper(id);
        updateView(id, 100);

        const elapsed = xcTimeHelper.getElapsedTimeStr(mainQuery.getElapsedTime(), null, true);
        const debugOutput = `Execute ${mainQuery.name} finished in ${elapsed}. ` +
                            `Query: ${mainQuery.getQuery()},`;
        DebugPanel.Instance.addOutput(debugOutput);
    };

    /**
     * QueryManager.subQueryDone
     * @param id
     * @param dstTable
     * @param time
     * @param options
     */
    export function subQueryDone(
        id: number,
        dstTable: string | null,
        time: any,
        options?: SubQueryDoneOptions
    ): void {
        if (Transaction.isSimulate(id) || !queryLog.has(id)) {
            return;
        }

        options = options || {};
        const mainQuery: XcQuery = queryLog.getForUpdate(id);
        if (time != null) {
            if (mainQuery.name === SQLOps.Retina && options.retName) {
                mainQuery.setOpTime(time);
            } else {
                mainQuery.addOpTime(time);
            }
        }

        // execute retina returned, should be on last step of the group of
        // queries
        if (options.retName) {
            const lastQueryPos: number = getLastOperationPos(mainQuery, mainQuery.currStep);
            setQueriesDone(mainQuery, mainQuery.currStep, lastQueryPos);
            mainQuery.currStep = lastQueryPos;
        }

        for (let i = 0; i < mainQuery.subQueries.length; i++) {
            let subQuery: XcSubQuery = mainQuery.subQueries[i];
            if (subQuery.dstTable === dstTable ||
                subQuery.queryName === options.queryName ||
                (options.retName && mainQuery.currStep === i)) {
                subQuery.state = QueryStatus.Done;
                if (mainQuery.currStep === i) {
                    incrementStep(mainQuery);
                    subQuery = mainQuery.subQueries[mainQuery.currStep];
                    clearIntervalHelper(id);
                    if (mainQuery.currStep !== mainQuery.numSteps) {
                        // query is not done yet
                        while (subQuery && subQuery.state === QueryStatus.Done) {
                            incrementStep(mainQuery);
                            subQuery = mainQuery.subQueries[mainQuery.currStep];
                        }
                        if (mainQuery.currStep === mainQuery.numSteps) {
                            // query is done
                        } else if (subQuery) {
                            if (subQuery.queryName) {
                                xcalarQueryCheck(id);
                            } else {
                                operationCheck(subQuery);
                            }
                        }
                    }
                }
                break;
            }
        }
    };

    /**
     * QueryManager.removeQuery
     * @param ids
     * @param userTriggered
     */
    export function removeQuery(ids: number[] | number, userTriggered?: boolean) {
        if (!(ids instanceof Array)) {
            ids = [ids];
        }

        ids.forEach(function(id) {
            if (Transaction.isSimulate(id) || !queryLog.has(id)) {
                return;
            }

            const query = queryLog.get(id);
            if (userTriggered) {
                // do not allow user to click on trash if not started or processing
                const state: number | string = query.state;
                if (state === QueryStateT.qrNotStarted ||
                    state === QueryStateT.qrProcessing) {
                    return;
                }
            }
            clearIntervalHelper(id);
            // we may not want to immediately delete canceled queries because
            // we may be waiting for the operation to return and clean up some
            // intermediate tables
            if (query.state === QueryStatus.Cancel) {
                canceledQueries[id] = query;
            }

            queryLog.remove(id);
        });

        xcTooltip.hideAll();
    };

    /**
     * QueryManager.cancelQuery
     * @param id
     */
    export function cancelQuery(id: number): XDPromise<any> {
        if (Transaction.isSimulate(id)) {
            return;
        }
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        const mainQuery: XcQuery = queryLog.get(id);
        if (mainQuery == null) {
            // error case
            console.warn('invalid operation', 'transaction id: ' + id);
            return PromiseHelper.reject("invalid operation");
        } else if (mainQuery.state === QueryStatus.Done) {
            console.warn('operation is done, cannot cancel');
            return PromiseHelper.reject('operation is done, cannot cancel');
        } else if (mainQuery.state === QueryStatus.Cancel ||
                   mainQuery.state === QueryStatus.Error) {
            return PromiseHelper.reject("already canceled");
        }

        const prevState: string | number = mainQuery.getState();

        if (!Transaction.isCancelable(id)) {
            return PromiseHelper.reject('building new table, cannot cancel');
        }

        $('.lockedTableIcon[data-txid="' + id + '"]').remove();
        xcTooltip.hideAll();
        Transaction.cancel(id);
        unlockSrcTables(mainQuery);

        // unfinished tables will be dropped when Transaction.fail is reached
        const onlyFinishedTables: boolean = true;
        dropCanceledTables(mainQuery, onlyFinishedTables);

        const currStep: number = mainQuery.currStep;

        if (!mainQuery.subQueries[currStep]) {
            if (currStep === 0 && prevState === QueryStateT.qrNotStarted) {
                deferred.resolve();
            } else if (mainQuery.subQueries[currStep - 1]) {
                // previous subquery finished but currStep hasn't started
                deferred.resolve();
            } else {
                deferred.reject('step vs operation mismatch');
            }
            return deferred.promise();
        }

        const statusesToIgnore: number[] = [StatusT.StatusOperationHasFinished];

        // this is a xcalar query
        if (mainQuery.subQueries[currStep].queryName) {
            // Query Cancel returns success even if the operation is
            // complete, unlike cancelOp. Xc4921
            XcalarQueryCancel(mainQuery.subQueries[currStep].queryName, [])
            .then(function(ret) {
                console.info('operation cancel submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp

        } else { // xcFunction
            XcalarCancelOp(mainQuery.subQueries[currStep].dstTable,
                           statusesToIgnore)
            .then(function(ret) {
                console.info('operation submitted', ret);
                deferred.resolve();
            })
            .fail(deferred.reject); // errors being handled inside XcalarCancelOp
        }
        return deferred.promise();
    };

    // this gets called after cancel is successful. It cleans up and updates
    // the query state and views
    /**
     * QueryManager.confirmCanceledQuery
     * @param id
     */
    export function confirmCanceledQuery(id: number): void {
        if (Transaction.isSimulate(id) || !queryLog.has(id)) {
            return;
        }
        clearIntervalHelper(id);

        const mainQuery: XcQuery = queryLog.getForUpdate(id);
        mainQuery.setState(QueryStatus.Cancel);
        mainQuery.outputTableState = "deleted";
        mainQuery.setElapsedTime();
        updateView(id, null, false, true);
    };

    /**
     * QueryManager.cleanUpCanceledTables
     * @param id
     */
    export function cleanUpCanceledTables(id: number): void {
        if (Transaction.isSimulate(id)) {
            return;
        }
        if (!queryLog.has(id) && !canceledQueries[id]) {
            return;
        }
        let mainQuery: XcQuery;
        if (queryLog.has(id)) {
            mainQuery = queryLog.get(id);
        } else {
            mainQuery = canceledQueries[id];
        }

        dropCanceledTables(mainQuery, false);
        delete canceledQueries[id];
    };

    /**
     * QueryManager.fail
     * @param id
     * @param error
     */
    export function fail(id: number, error: string | XCThriftError): void {
        if (Transaction.isSimulate(id) || !queryLog.has(id)) {
            return;
        }

        const mainQuery: XcQuery = queryLog.getForUpdate(id);
        mainQuery.setState(QueryStatus.Error);
        mainQuery.outputTableState = "unavailable";
        mainQuery.sqlNum = Log.getErrorLogs().length - 1;
        if (error) {
            let errorLog: string;
            if (error["log"]) {
                errorLog = error["log"];
            }
            if (typeof error === "object" && error.error) {
                error = error.error;
            }
            if (typeof error === "string") {
                mainQuery.error = error;
                if (errorLog) {
                    mainQuery.error += "\n" + errorLog;
                }
            }
        }

        mainQuery.setElapsedTime();
        clearIntervalHelper(id);
        updateView(id, null, true, false);
        const elapsed = xcTimeHelper.getElapsedTimeStr(mainQuery.getElapsedTime(), null, true);
        const debugOutput = `Execute ${mainQuery.name} fails after ${elapsed}. ` +
                            `Query: ${mainQuery.getQuery()}. ` +
                            `Error: ${mainQuery.error}.`;
        DebugPanel.Instance.addOutput(debugOutput);
    };

    /**
     * QueryManager.getAll
     */
    export function getAll(): object {
        return ({
            "queryLog": queryLog,
            "queryCheckLists": queryCheckList
        });
    };

    /**
     * QueryManager.getQuery
     * @param id
     */
    export function getQuery(id: number): XcQuery {
        return queryLog.get(id);
    };

    export function commit(): XDPromise<void> {
        return PromiseHelper.convertToJQuery(queryLog.flush());
    }

    export async function loadMore(count: number = 20): Promise<void> {
        try {
            disableLoadMoreQuries = true;
            const queries = await queryLog.loadMore(count);
            updateQueryHintSection(queries.length >= count);
            disableLoadMoreQuries = false;
        } catch(e) {
            console.warn(e);
            throw e;
        }
    }

    /**
     * QueryManager.upgrade
     * Restore logs from gInfo(for backward compatible). This should be removed after 2.2
     * @param queries
     */
    export function upgrade(queriesUnsorted: XcQueryDurable[]): void {
        if (!queriesUnsorted) {
            return;
        }
        queryLog.upgrade(queriesUnsorted);
    }

    /**
     * QueryManager.getAllDstTables
     * @param id
     * @param force
     */
    export function getAllDstTables(id: number, force?: boolean) {
        const tables: string[] = [];
        const query: XcQuery = queryLog.get(id);
        if (!query) {
            return tables;
        }
        return query.getAllTableNames(force);
    };

    // stores reused indexed table names
    /**
     * QueryManager.addIndexTable
     * @param id
     * @param tableName
     */
    export function addIndexTable(id: number, tableName: string): void {
        const query: XcQuery = queryLog.getForUpdate(id);
        if (query) {
            query.addIndexTable(tableName);
        }
    };

    /**
     * QueryManager.getIndexTables
     * @param id
     */
    export function getIndexTables(id: number): string[] {
        const tables: string[] = [];
        const query: XcQuery = queryLog.get(id);
        if (!query) {
            return tables;
        }
        return query.getIndexTables();
    };

    /**
     * used to split query into array of subqueries by semicolons
     * returns array of objects, objects contain query, name, and dstTable
     * @param query
     */
    export function parseQuery(query: string): QueryParser[] {
        let isJson: boolean = false;
        let parsedQuery: any[];
        try {
            if (query.trim().startsWith('[')) {
                parsedQuery = $.parseJSON(query);
            } else {
                parsedQuery = $.parseJSON('[' + query + ']');
            }
            isJson = true;
        } catch (err) {
            // normal if using an old extension
        }
        if (!isJson) {
            return parseQueryHelper(query);
        } else {
            const queries: QueryParser[] = [];
            for (var i = 0; i < parsedQuery.length; i++) {
                queries.push(getSubQueryObj(JSON.stringify(parsedQuery[i]), parsedQuery[i]));
            }
            return queries;
        }
    }

    function updateQueryHintSection(hasMore: boolean): void {
        hasMoreQueries = hasMore;
        hasNoMoreQueries = (queryLog.size() <= 0);
    }

    export function checkHasMoreQueries() {
        return hasMoreQueries && !hasNoMoreQueries && !disableLoadMoreQuries;
    }

    /**
     *
     * @param str
     */
    function parseSubQuery(str: string, isExport: boolean = false): QueryParser {
        str = str.trim();
        let operationName: string = str.split(' ')[0];
        let subQuery: QueryParser = {
            query: str,
            name: operationName,
            srcTables: getSrcTableFromQuery(str, operationName),
            dstTable: getDstTableFromQuery(str, operationName)
        };
        if (isExport) {
            subQuery.exportFileName = getExportFileNameFromQuery(str);
        }
        return subQuery;
    }

    /**
     * used to split query into array of subqueries by semicolons
     * XXX not checking for /n or /r delimiter, just semicolon
     * returns array of objects
     * objects contain query, name, exportFileName, srcTables and dstTable
     * @param query
     */
    function parseQueryHelper(query: string): QueryParser[] {
        let tempString: string = '';
        let inQuotes: boolean = false;
        let singleQuote: boolean = false;
        let isEscaped: boolean = false;
        let isExport: boolean = query.trim().indexOf('export') === 0;
        let queries: QueryParser[] = [];

        // export has semicolons between colnames and breaks most rules
        for (let i = 0; i < query.length; i++) {
            if (isEscaped) {
                tempString += query[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === '"' && !singleQuote) ||
                    (query[i] === '\'' && singleQuote)
                ) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === '"') {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === '\'') {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === '\\') {
                isEscaped = true;
                tempString += query[i];
            } else if (inQuotes) {
                tempString += query[i];
            } else {
                if (query[i] === ';' && !isExport) {
                    queries.push(parseSubQuery(tempString));
                    tempString = '';
                } else if (tempString === '' && query[i] === ' ') {
                    // a way of trimming the front of the string
                    continue;
                } else {
                    tempString += query[i];
                }
            }
        }

        if (tempString.trim().length) {
            queries.push(parseSubQuery(tempString, isExport));
        }

        return queries;
    }

    /**
     *
     * @param query
     * @param parsedQuery
     */
    function getSubQueryObj(query: string, parsedQuery: any): QueryParser {
        let subQuery: QueryParser = {
            query: query,
            name: null,
            srcTables: null,
            dstTable: null
        };
        try {
            const operation: string = parsedQuery.operation;
            let srcTables: string[];
            if (parsedQuery || !parsedQuery.args) {
                srcTables = [];
            } else if (operation === XcalarApisTStr[XcalarApisT.XcalarApiJoin]) {
                srcTables = parsedQuery.args.source;
            } else if (operation === XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                srcTables = [];
            } else {
                srcTables = [parsedQuery.args.source];
            }

            let dstTable: string;
            if (parsedQuery || !parsedQuery.args) {
                dstTable = "";
            } else if (operation === XcalarApisTStr[XcalarApisT.XcalarApiBulkLoad] &&
                parsedQuery.args.dest.indexOf(gDSPrefix) === -1) {
                dstTable = gDSPrefix + parsedQuery.args.dest;
            } else {
                dstTable = parsedQuery.args.dest;
            }
            subQuery = {
                query: query,
                name: operation,
                srcTables: srcTables,
                dstTable: dstTable
            };
            if (operation === XcalarApisTStr[XcalarApisT.XcalarApiExport]) {
                subQuery.exportFileName = parsedQuery.args.fileName;
            }
        } catch (error) {
            console.error("get sub query error", error);
        }
        return subQuery;
    }

        /**
     *
     * @param query
     * @param keyWord
     */
    function getTableNameFromQuery(query: string, keyWord: string): string | null {
        let index: number = getKeyWordIndexFromQuery(query, keyWord);
        if (index === -1) {
            return null;
        }
        index += keyWord.length;
        const trimmedQuery: string = query.slice(index).trim();
        return parseSearchTerm(trimmedQuery);
    }

    /**
     *
     * @param query
     * @param type
     */
    function getSrcTableFromQuery(query: string, type: string): string[] | null {
        let keyWord: string = '--srctable';
        if (type === 'join') {
            keyWord = '--leftTable';
        }

        const tableNames: string[] = [];
        let tableName: string | null = getTableNameFromQuery(query, keyWord);
        if (tableName == null) {
            return null;
        }

        tableNames.push(tableName);
        if (type === 'join') {
            let keyWord: string = '--rightTable';
            let tableName: string = getTableNameFromQuery(query, keyWord);
            if (tableName) {
                tableNames.push(tableName);
            }
        }
        return tableNames;
    }

    /**
     *
     * @param query
     * @param type
     */
    function getDstTableFromQuery(query: string, type: string): string {
        let keyWord: string = '--dsttable';
        if (type === 'join') {
            keyWord = '--joinTable';
        } else if (type === 'load') {
            keyWord = '--name';
        } else if (type === 'export') {
            keyWord = '--exportName';
        }

        let tableName: string | null = getTableNameFromQuery(query, keyWord);
        if (tableName == null) {
            return null;
        }

        if (type === "load" && tableName.indexOf(gDSPrefix) === -1) {
            tableName = gDSPrefix + tableName;
        }
        return tableName;
    }

    /**
     *
     * @param query
     */
    function getExportFileNameFromQuery(query: string): string {
        const keyWord: string = "--fileName";

        var index = getKeyWordIndexFromQuery(query, keyWord);
        if (index === -1) {
            return null;
        }

        index += keyWord.length;
        query = query.slice(index).trim();
        return parseSearchTerm(query);
    }

        /**
     *
     * @param query
     * @param keyWord
     */
    function getKeyWordIndexFromQuery(query: string, keyWord: string): number {
        let inQuotes: boolean = false;
        let singleQuote: boolean = false;
        let isEscaped: boolean = false;
        const keyLen: number = ('' + keyWord).length;

        for (let i = 0; i < query.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((query[i] === '"' && !singleQuote) ||
                    (query[i] === '\'' && singleQuote)
                ) {
                    inQuotes = false;
                }
            } else {
                if (query[i] === '"') {
                    inQuotes = true;
                    singleQuote = false;
                } else if (query[i] === '\'') {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (query[i] === '\\') {
                isEscaped = true;
            } else if (!inQuotes) {
                if (i >= keyLen && query.slice(i - keyLen, i) === keyWord) {
                    return (i - keyLen);
                }
            }
        }
        return -1;
    }

    /**
     * if passing in "tableNa\"me", will return tableNa\me and not tableNa
     * @param str
     */
    function parseSearchTerm(str: string): string {
        const quote: string = str[0];
        let wrappedInQuotes: boolean = true;
        if (quote !== '\'' && quote !== '"') {
            wrappedInQuotes = false;
        } else {
            str = str.slice(1);
        }

        let isEscaped: boolean = false;
        let result: string = '';
        for (let i = 0; i < str.length; i++) {
            if (isEscaped) {
                isEscaped = false;
                result += str[i];
                continue;
            }
            if (str[i] === '\\') {
                isEscaped = true;
                result += str[i];
            } else if (wrappedInQuotes) {
                if (str[i] === quote) {
                    break;
                } else {
                    result += str[i];
                }
            } else if (!wrappedInQuotes) {
                if (str[i] === ' ' || str[i] === ';') {
                    break;
                } else {
                    result += str[i];
                }
            }
        }
        return result;
    }


    function checkCycle(callback: Function, id: number, adjustTime: number): number {
        clearIntervalHelper(id);

        let intTime: number = checkInterval;
        if (adjustTime) { // prevents check from occuring too soon after the
            // previous check
            intTime = Math.max(checkInterval, checkInterval - adjustTime);
        }

        queryCheckList[id] = window.setTimeout(function() {
            const startTime: number = Date.now();
            callback()
            .then(function() {
                if (queryCheckList[id] != null) {
                    const elapsedTime: number = Date.now() - startTime;
                    checkCycle(callback, id, elapsedTime);
                }
            });
        }, intTime);

        return queryCheckList[id];
    }

    // get the first subquery index of a group of subqueries inside of a mainquery
    function getFirstOperationPos(mainQuery: XcQuery): number {
        const currStep: number = mainQuery.currStep;
        const subQueries: XcSubQuery[] = mainQuery.subQueries;
        const queryName: string = subQueries[currStep].queryName;
        let firstOperationPos: number = currStep;
        for (let i = mainQuery.currStep; i >= 0; i--) {
            if (subQueries[i].queryName !== queryName) {
                firstOperationPos = i + 1;
                break;
            }
        }
        return (firstOperationPos);
    }

    function getLastOperationPos(mainQuery: XcQuery, start: number): number {
        const currStep: number = mainQuery.currStep;
        const subQueries: XcSubQuery[] = mainQuery.subQueries;

        const queryName: string = subQueries[currStep].queryName;
        let lastOperationPos: number = start;
        for (let i = subQueries.length - 1; i >= 0; i--) {
            if (subQueries[i].queryName === queryName) {
                lastOperationPos = i;
                break;
            }
        }
        return (lastOperationPos);
    }

    // used for xcalarQuery subqueries since QueryManager.subQueryDone does not
    // get called
    function setQueriesDone(mainQuery: XcQuery, start: number, end: number): void {
        const subQueries: XcSubQuery[] = mainQuery.subQueries;
        for (let i = start; i < end; i++) {
            subQueries[i].state = QueryStatus.Done;
        }
    }

    // checks a group of subqueries by checking the single query name they're
    // associated with
    function xcalarQueryCheck(id: number): void {
        if (!queryLog.has(id)) {
            console.error("error case");
            return;
        }

        const mainQuery: XcQuery = queryLog.getForUpdate(id);
        const firstQueryPos: number = getFirstOperationPos(mainQuery);

        const startTime: number = Date.now();
        check()
        .then(function() {
            const elapsedTime: number = Date.now() - startTime;
            checkCycle(check, id, elapsedTime);
        });

        function check(): XDPromise<any> {
            if (mainQuery.state === QueryStatus.Error ||
                mainQuery.state === QueryStatus.Cancel ||
                mainQuery.state === QueryStatus.Done) {
                return PromiseHelper.reject();
            }
            const deferred: XDDeferred<any> = PromiseHelper.deferred();
            const currStepAtCheck = mainQuery.currStep;
            const queryName: string = mainQuery.subQueries[mainQuery.currStep].queryName;
            xcalarQueryCheckHelper(id, queryName)
            .then(function(res) {
                if (mainQuery.state === QueryStatus.Error ||
                    mainQuery.state === QueryStatus.Cancel ||
                    mainQuery.state === QueryStatus.Done) {
                    deferred.reject();
                    return;
                }
                // this can happen if subQuery done is called before
                // xcalarQueryCheckHelper returns
                if (mainQuery.currStep !== currStepAtCheck) {
                    deferred.reject();
                    return;
                }

                const numCompleted: number = res.numCompletedWorkItem;
                const lastQueryPos: number = getLastOperationPos(mainQuery, firstQueryPos);
                let currStep: number = Math.min(numCompleted + firstQueryPos,
                                        lastQueryPos);
                mainQuery.currStep = Math.max(mainQuery.currStep, currStep);
                setQueriesDone(mainQuery, firstQueryPos, currStep);
                const state: string | number = res.queryState;

                if (state === QueryStateT.qrFinished) {
                    const curSubQuery: XcSubQuery = mainQuery.subQueries[mainQuery.currStep];
                    currStep = mainQuery.currStep + 1;
                    setQueriesDone(mainQuery, firstQueryPos, currStep);
                    if (!curSubQuery.retName) {
                        // do not increment step if retina because
                        // subQueryDone() will do this when retina resolves
                        mainQuery.currStep++;
                    }
                    clearIntervalHelper(id);
                    const subQuery: XcSubQuery = mainQuery.subQueries[currStep];
                    if (subQuery) {
                        if (subQuery.queryName) {
                            xcalarQueryCheck(id);
                        } else {
                            operationCheck(subQuery);
                        }
                    }
                    deferred.reject(); // ends cycle
                } else if (state === QueryStateT.qrError ||
                           state === QueryStateT.qrCancelled) {
                    clearIntervalHelper(id);
                    updateView(id, res, true, false);
                    deferred.reject(); // ends cycle
                } else {
                    try {
                        let progress: number;
                        if (mainQuery.subQueries[currStep].retName) {
                            progress = res.progress;
                        } else {
                            progress = getQueryProgress(res);
                        }
                        const pct: number = parseFloat((100 * progress).toFixed(2));
                        updateView(id, pct, false, false);
                        mainQuery.setElapsedTime();
                    } catch (e) {
                        console.error(e);
                    }
                    deferred.resolve();// continues cycle
                }
            })
            .fail(function(error) {
                if (!error || error.status !== StatusT.StatusQrQueryNotExist) {
                    console.error("Check failed", error, queryName);
                    updateView(id, null, error, false);
                }
                clearIntervalHelper(id);
                deferred.reject();
            });

            return deferred.promise();
        }
    }

    function getQueryProgress(queryStateOutput: XcalarApiQueryStateOutputT): number {
        let progress: number = null;
        let numWorkCompleted: number = 0;
        let numWorkTotal: number = 0
        queryStateOutput.queryGraph.node.forEach((node) => {
            if (node.state === DgDagStateT.DgDagStateProcessing ||
                node.state === DgDagStateT.DgDagStateReady) {
                let numCompleted = node.numWorkCompleted;
                if (node.state === DgDagStateT.DgDagStateReady) {
                    // backend may not return full numWorkCompleted so if
                    // node is ready, then numWorkCompleted should equal
                    // numWorkTotal for 100%
                    numCompleted = node.numWorkTotal;
                }
                numWorkCompleted += numCompleted;
                numWorkTotal += node.numWorkTotal;
            }
        });
        progress = numWorkCompleted / numWorkTotal;
        if (numWorkTotal === 0) {
            progress = 0;
        }
        return progress;
    }


    function xcalarQueryCheckHelper(_id: number, queryName: string): XDPromise<any> {
        // const mainQuery: XcQuery = queryLists[id];
        // const curSubQuery: XcSubQuery = mainQuery.subQueries[mainQuery.currStep];
        return XcalarQueryState(queryName);
    }

    function incrementStep(mainQuery: XcQuery): void {
        mainQuery.currStep++;
        const id: number = mainQuery.getId();

        if (mainQuery.numSteps !== -1 &&
            mainQuery.currStep >= mainQuery.numSteps) {
            // show finished state for the entire query
            updateView(id, 100);
        }
    }

    function operationCheck(subQuery: XcSubQuery, delay?: number): void {
        const id: number = subQuery.getId();
        if (!queryLog.has(id)) {
            console.error("error case");
            return;
        }

        const startTime: number = Date.now();
        const check = () => {
            operationCheckHelper(subQuery, id, subQuery.index)
            .then(() => {
                const elapsedTime: number = Date.now() - startTime;
                checkCycle(() => operationCheckHelper(subQuery, id, subQuery.index),
                 id, elapsedTime);
            });
        };
        if (delay) {
            setTimeout(check, delay);
        } else {
            check();
        }
    }

    function operationCheckHelper(
        subQuery: XcSubQuery,
        id: number,
        step: number
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (subQuery.state === QueryStatus.Done) {
            clearIntervalHelper(id);
            return PromiseHelper.reject();
        }

        subQuery.getProgress()
        .then(function(res) {
            if (!queryLog.has(id)) {
                clearIntervalHelper(id);
                return PromiseHelper.reject();
            }
            const mainQuery: XcQuery = queryLog.get(id);
            if (mainQuery.state === QueryStatus.Cancel ||
                mainQuery.state === QueryStatus.Done ||
                mainQuery.state === QueryStatus.Error) {
                clearIntervalHelper(id);
                return PromiseHelper.reject();
            }

            const currStep: number = mainQuery.currStep;
            // check for edge case where percentage is old
            // and mainQuery already incremented to the next step
            if (currStep === step) {
                updateView(id, res, false, false);
            }

            mainQuery.setElapsedTime();
            queryLog.setUpdated(id);
            deferred.resolve();
        })
        .fail(function(error) {
            if (queryLog.has(id) && error &&
                error.status === StatusT.StatusDagNodeNotFound) {
                const mainQuery: XcQuery = queryLog.get(id);
                if (subQuery.name.indexOf("delete") > -1) {
                    clearIntervalHelper(id);
                    deferred.reject();
                } else {
                    if (mainQuery.state === QueryStatus.Cancel ||
                        mainQuery.state === QueryStatus.Done ||
                        mainQuery.state === QueryStatus.Error) {
                        clearIntervalHelper(id);
                        deferred.reject();
                    } else {
                        // could be that operation hasn't started yet, just keep
                        // trying
                        deferred.resolve();
                    }
                }
            } else {
                console.error("Check failed", error);
                clearIntervalHelper(id);
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    function updateView(
        id: number,
        progress: string | number,
        isError?: boolean,
        isCanceled?: boolean
    ): void {
        const mainQuery: XcQuery = queryLog.get(id);
        const currStep: number = mainQuery.currStep;
        const numSteps: number = mainQuery.numSteps;

        progress = Math.min(Math.max(parseFloat(progress + ""), 0), 100);
        let progressNum = progress;
        let inProgress = false;
        if (progress >= 100 && ((numSteps > 0 && currStep >= numSteps) ||
            (mainQuery.state === QueryStatus.Done))) {
            progress = "100%";
        } else if (isError || isCanceled) {
            progress = "0%";
        } else {
            progress = progress + "%";
            inProgress = true;
        }

        const progressCircles: ProgressCircle[] = [];
        const $lockIcon: JQuery = $('.lockedTableIcon[data-txid="' + id + '"]');
        $lockIcon.each(function() {
            progressCircles.push($(this).data("progresscircle"));
        });

        let interval = (isCanceled || isError) ? 0 : checkInterval;
        progressCircles.forEach(progressCircle => {
            progressCircle.update(parseInt(progress), interval);
        });

        if (mainQuery.name === "activate dataset" && mainQuery.subQueries[0]) {
            let dsName = xcHelper.parseDSName(mainQuery.subQueries[0].dstTable).dsName;
            updateDatasetActivationProgress(id, progressNum, dsName, !inProgress);
        }
    }

    export function focusOnOutput(queryId): void {
        const mainQuery: XcQuery = queryLog.get(queryId);
        const tableName: string = mainQuery.getOutputTableName();

        if (!tableName) {
            let type: string;
            if (mainQuery.getName() === SQLOps.DSImport) {
                type = "dataset";
            } else {
                type = "table";
            }
            focusOutputErrorHandler(type, mainQuery);
            return;
        }

        if (tableName.indexOf(gDSPrefix) > -1) {
            focusOutputErrorHandler('dataset', mainQuery);
            return;
        }

        const tableId: TableId = xcHelper.getTableId(tableName);

        if (tableId == null) {
            focusOutputErrorHandler('output', mainQuery);
            return;
        }
    }

    function focusOutputErrorHandler(
        type: string,
        mainQuery: XcQuery,
        status?: string
    ): void {
        const typeUpper: string = type[0].toUpperCase() + type.slice(1);
        const title: string = xcStringHelper.replaceMsg(ErrWRepTStr.OutputNotFound, {
            "name": typeUpper
        });
        let desc: string;
        if (type === "output") {
            desc =ErrTStr.OutputNotFoundMsg;
        } else {
            desc = xcStringHelper.replaceMsg(ErrWRepTStr.OutputNotExists, {
                "name": typeUpper
            });
        }

        Alert.error(title, desc);
        if (status) {
            mainQuery.outputTableState = status;
        } else {
            mainQuery.outputTableState = 'deleted';
        }
    }

    // XXX can some of the src tables be simultaneously used by another operation
    // and need to remain locked?
    function unlockSrcTables(mainQuery: XcQuery): void {
        const srcTables: object = {};

        // check original source tables
        if (mainQuery.srcTables) {
            for (let i = 0; i < mainQuery.srcTables.length; i++) {
                srcTables[mainQuery.srcTables[i]] = true;
            }
        }

        // scan query strings for other source tables in case they were missed
        const queryStr: string = mainQuery.getQuery();
        if (queryStr) {
            const queries: QueryManager.QueryParser[] = QueryManager.parseQuery(queryStr);
            for (let i = 0; i < queries.length; i++) {
                if (queries[i].srcTables) {
                    for (let j = 0; j < queries[i].srcTables.length; j++) {
                        srcTables[queries[i].srcTables[j]] = true;
                    }
                }
            }
        }

        let tableId: TableId;
        for (const table in srcTables) {
            tableId = xcHelper.getTableId(table);
            if (tableId) {
                TblFunc.unlockTable(tableId);
            }
        }
    }

    // drops all the tables generated, even the intermediate tables
    // or drops dataset if importDataSource operation
    function dropCanceledTables(
        mainQuery: XcQuery,
        onlyFinishedTables: boolean
    ): void {
        const queryStr: string = mainQuery.getQuery();
        const queries: QueryManager.QueryParser[] = QueryManager.parseQuery(queryStr);
        const dstTables: string[] = [];
        const dstDatasets: string[] = [];
        let numQueries: number;
        if (onlyFinishedTables) {
            numQueries = mainQuery.currStep;
        } else {
            numQueries = queries.length;
        }

        let dstTable: string;
        for (let i = 0; i < numQueries; i++) {
            dstTable = queries[i].dstTable;
            if (dstTable) {
                if (dstTable.indexOf(gRetSign) > -1) {
                    continue;// ignore ret:tableName tables
                }
                if (dstTable.indexOf(gDSPrefix) > -1) {
                    dstDatasets.push(dstTable);
                } else {
                    dstTables.push(dstTable);
                }
            }
        }
        let tableId: TableId;
        const orphanListTables: string[] = [];
        const backendTables: string[] = [];
        for (let i = 0; i < dstTables.length; i++) {
            tableId = xcHelper.getTableId(dstTables[i]);
            if (gTables[tableId]) {
                if (gTables[tableId].getType() === TableType.Orphan) {
                    orphanListTables.push(dstTables[i]);
                }
            } else {
                backendTables.push(dstTables[i]);
            }
        }
        // delete tables that are in the orphaned list
        if (orphanListTables.length) {

            TblManager.deleteTables(orphanListTables, TableType.Orphan,
                                    true, true);
        }

        // delete tables not found in gTables
        for (let i = 0; i < backendTables.length; i++) {
            const tableName: string = backendTables[i];
            XcalarDeleteTable(tableName);
        }

        for (let i = 0; i < dstDatasets.length; i++) {
            deleteDatasetHelper(dstDatasets[i]);
        }
    }

    function deleteDatasetHelper(dsName: string): void {
        dsName = xcHelper.stripPrefixFromDSName(dsName);
        XIApi.deleteDataset(null, dsName, true);
    }

    function clearIntervalHelper(id: number): void {
        clearTimeout(queryCheckList[id]);
        delete queryCheckList[id];
    }

    function updateDatasetActivationProgress(txId: number, progress: number, dsName: string, finished: boolean) {
        traverse(txId);
        function traverse(txId) {
            let tx: Transaction.TXLog = Transaction.get(txId);
            if (!tx) {
                return;
            }
            if (tx.tabId && tx.parentNodeInfo) {
                DagViewManager.Instance.updateDatasetProgress(tx.tabId, tx.parentNodeInfo.nodeId, {
                    progress: progress,
                    dsName: dsName,
                    elapsedTime: 0,
                    finished: finished || (progress === 100)
                });
            }
            if (tx.parentTxId != null) {
                traverse(tx.parentTxId);
            }
        }
    }

    export let __testOnly__: any = {};

    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__.queryCheckLists = queryCheckList;
        __testOnly__.canceledQueries = canceledQueries;
        __testOnly__.unlockSrcTables = unlockSrcTables;
    }
}
