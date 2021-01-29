import * as xcalar from "xcalar"
// Dataflow.proto/Dataflow_pb.js
const df_pb : any = proto.xcalar.compute.localtypes.Dataflow;

// XIApi is in /xcalar-gui/ts/shared/api/xiApi.ts
// Transaction is in /xcalar-gui/ts/shared/helperClasses/transaction.ts
// Both are imported as a global var

interface UnionColInfo {
    name: string,
    rename: string,
    type: string,
    cast: boolean
}

interface UnionTableInfo {
    tableName: string,
    columns: UnionColInfo[]
}

interface ColRenameInfo {
    orig: string,
    new: string,
    type: string
}

interface JoinTableInfo {
    tableName: string,
    columns: string[],
    casts: string[],
    pulledColumns: string[],
    rename: ColRenameInfo[],
    allImmediates: string[],
    removeNulls: boolean
}

interface JoinOptions {
    newTableName: string,
    clean: boolean,
    evalString: string,
    existenceCol: string,
    keepAllColumns: boolean
}

interface TableIndexCache {
    tableName: string;
    keys: string[];
    tempCols: string[];
}

interface AggColInfo {
    operator: string,
    aggColName: string,
    newColName: string,
    isDistinct: boolean
}

interface GroupByOption {
    newTableName: string,
    groupAll: boolean,
    icvMode: boolean,
    dhtName: string,
    clean: boolean,
    isIncSample: boolean,
    sampleCols: number[],
    newKeys: string[]
}

interface KeyInfo {
    name: string,
    ordering: number,
    type: string
}

function indexFromDataset(indexRequest: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let dsName: string = indexRequest.getDsname();
    let prefix: string = indexRequest.getPrefix();
    let newTableName: string = indexRequest.getDsttablename();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.indexFromDataset(txId, dsName, newTableName, prefix)
        .then(function (ret: any) {
            const dstTable: string = ret.newTableName;
            const prefix: string = ret.prefix;
            let indexResponse: any
                = new df_pb.IndexFromDatasetResponse();
            indexResponse.setQuerystr(Transaction.done(txId));
            indexResponse.setNewtablename(dstTable);
            indexResponse.setPrefix(prefix);
            deferred.resolve(indexResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { indexFromDataset as IndexFromDataset }

function filter(filterRequest: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let fltStr: string = filterRequest.getFilterstr();
    let tableName: string = filterRequest.getSrctablename();
    let newTableName: string = filterRequest.getDsttablename();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.filter(txId, fltStr, tableName, newTableName)
        .then(function (dstTable: string): void {
            let filterResponse: any =
                new df_pb.FilterResponse();
            filterResponse.setQuerystr(Transaction.done(txId));
            filterResponse.setNewtablename(dstTable);
            deferred.resolve(filterResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { filter as Filter }

function aggregate(aggRequest: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let aggOp: string = aggRequest.getAggop();
    let colName: string = aggRequest.getColname();
    let tableName: string = aggRequest.getSrctablename();
    let dstAggName: string = aggRequest.getDstaggname();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName)
        .then(function (aggVal: string | number, dstAggName: string,
            toDelete: boolean): void {
                let aggResponse: any =
                    new df_pb.AggregateResponse();
                aggResponse.setQuerystr(Transaction.done(txId));
                aggResponse.setAggval(aggVal);
                aggResponse.setDstaggname(dstAggName);
                aggResponse.setTodelete(toDelete);
                deferred.resolve(aggResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { aggregate as Aggregate }

function map(mapRequest: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let mapStrs: string[] = mapRequest.getMapstrsList();
    let newColNames: string[] = mapRequest.getNewcolnamesList();
    let tableName: string = mapRequest.getSrctablename();
    let newTableName: string = mapRequest.getDsttablename();
    let icvMode: boolean = mapRequest.getIcvmode();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.map(txId, mapStrs, tableName, newColNames, newTableName, icvMode)
        .then(function (dstTable: string): void {
            let mapResponse: any = new df_pb.MapResponse();
            mapResponse.setQuerystr(Transaction.done(txId));
            mapResponse.setNewtablename(dstTable);
            deferred.resolve(mapResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { map as Map }

function genRowNum(genRowNumRequest: any):
    Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let newColName: string = genRowNumRequest.getNewcolname();
    let tableName: string = genRowNumRequest.getSrctablename();
    let newTableName: string = genRowNumRequest.getDsttablename();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.genRowNum(txId, tableName, newColName, newTableName)
        .then(function (dstTable: string): void {
            let genRowResponse: any = new df_pb.GenRowNumResponse();
            genRowResponse.setQuerystr(Transaction.done(txId));
            genRowResponse.setNewtablename(dstTable);
            deferred.resolve(genRowResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { genRowNum as GenRowNum }

function project(projectReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    let columns: string[] = projectReq.getColumnsList();
    let tableName: string = projectReq.getSrctablename();
    let newTableName: string = projectReq.getDsttablename();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.project(txId, columns, tableName, newTableName)
        .then(function (dstTable: string): void {
            let projectResponse: any = new df_pb.ProjectResponse();
            projectResponse.setQuerystr(Transaction.done(txId));
            projectResponse.setNewtablename(dstTable);
            deferred.resolve(projectResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { project as Project }

function unionOp(unionReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    let tableInfoMsgs: any[] = unionReq.getTableinfosList();
    let tableInfos: UnionTableInfo[]  = [];
    tableInfoMsgs.forEach(tableInfoMsg => {
        let columnMsgs: any[] = tableInfoMsg.getColumnsList();
        let columns: UnionColInfo[] = [];
        columnMsgs.forEach((columnMsg) => {
            columns.push({
                "name": columnMsg.getName(),
                "rename": columnMsg.getRename(),
                "type": columnMsg.getType(),
                "cast": columnMsg.getCast()
            })
        });
        let tableInfoStruct: UnionTableInfo = {
            "tableName": tableInfoMsg.getTablename(),
            "columns": columns
        };
        tableInfos.push(tableInfoStruct);
    });
    let dedup: boolean = unionReq.getDedup();
    let unionType: number = unionReq.getUniontype();
    let tableName: string = unionReq.getNewtablename();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.union(txId, tableInfos, dedup, tableName, unionType)
            .then(function(ret: any): void {
                const newTableName: string = ret.newTableName;
                const newTableCols: {rename: string, type: ColumnType[]}[] =
                    ret.newTableCols;
                let unionRes: any = new df_pb.UnionResponse();
                unionRes.setQuerystr(Transaction.done(txId));
                unionRes.setNewtablename(newTableName);
                let newTablesColsMsgs: any =
                    newTableCols.map(function (renameCol:
                        {rename: string, type: ColumnType}) {
                            let colRenameMsg: any = new df_pb.UnionResponse.RenameInfo();
                            colRenameMsg.setRename(renameCol.rename);
                            colRenameMsg.setType(renameCol.type);
                            return colRenameMsg;
                        });
                unionRes.setNewtablecolsList(newTablesColsMsgs);
                deferred.resolve(unionRes);
            })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { unionOp as UnionOp }

function getJoinTableInfoAsDict(tableInfo: any): JoinTableInfo{
    let renameMsgs: any = tableInfo.getRenameList();
    let renames: ColRenameInfo[] = [];
    renameMsgs.forEach((renameMsg) => {
        renames.push({
            "orig": renameMsg.getOrig(),
            "new": renameMsg.getNew(),
            "type": renameMsg.getType()
        });
    });
    let tableInfoDict: JoinTableInfo = {
        "tableName": tableInfo.getTablename(),
        "columns": tableInfo.getColumnsList(),
        "casts": tableInfo.getCastsList(),
        "pulledColumns": tableInfo.getPulledcolumnsList(),
        "rename": renames,
        "allImmediates": tableInfo.getAllimmediatesList(),
        "removeNulls": tableInfo.getRemovenulls()
    };
    return tableInfoDict;
}

function getColRenameMsg(colRenames: ColRenameInfo[]): any[] {
    let ret: any[] = [];
    colRenames.forEach((colRename) => {
        let colRenameMsg: any = new df_pb.ColRenameInfo();
        colRenameMsg.setOrig(colRename['orig']);
        colRenameMsg.setNew(colRename['new']);
        colRenameMsg.setType(colRename['type']);
        ret.push(colRenameMsg);
    });
    return ret
}

function getColRenameMsg2(colRename) {
    var colRenameMsg = new df_pb.ColRenameInfo();
    colRenameMsg.setOrig(colRename['orig']);
    colRenameMsg.setNew(colRename['new']);
    colRenameMsg.setType(colRename['type']);
    return colRenameMsg;
}

function join(joinReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    let joinType: number = joinReq.getJointype();
    let lTableInfo: any =
        getJoinTableInfoAsDict(joinReq.getLtableinfo());
    let rTableInfo: any =
        getJoinTableInfoAsDict(joinReq.getRtableinfo());
    let optionsMsg: any = joinReq.getOptions();
    let options: JoinOptions = {
        "newTableName": optionsMsg.getNewtablename(),
        "clean": optionsMsg.getClean(),
        "evalString": optionsMsg.getEvalstr(),
        "existenceCol": optionsMsg.getExistencecol(),
        "keepAllColumns": optionsMsg.getKeepallcolumns()
    };
    let txId: number = Transaction.start({ "simulate": true });
    // Delete index table for SDK
    let lIndexCache: TableIndexCache =
        XIApi.getIndexTable(lTableInfo.tableName, lTableInfo.columns);
    if (lIndexCache != null) {
        XIApi.deleteIndexTable(lIndexCache.tableName);
    }
    let rIndexCache: TableIndexCache =
        XIApi.getIndexTable(rTableInfo.tableName, rTableInfo.columns);
    if (rIndexCache != null) {
        XIApi.deleteIndexTable(rIndexCache.tableName);
    }
    XIApi.join(txId, joinType, lTableInfo, rTableInfo, options)
            .then(function(ret: any): void {
                const newTableName: string = ret.newTableName;
                const lRename: ColRenameInfo[] = ret.lRename;
                const rRename: ColRenameInfo[] = ret.rRename;
                let joinRes: any = new df_pb.JoinResponse();
                if (typeof joinRes.setRrename === 'function') {
                    // XXX TODO: Source Tree Merge backward compatible
                    // remove this after protobuf def is ported
                    const tempCols = ret.tempCols;
                    joinRes.setQuerystr(Transaction.done(txId));
                    joinRes.setNewtablename(newTableName);
                    joinRes.setTempcolsList(tempCols);
                    joinRes.setLrename(getColRenameMsg2(lRename));
                    joinRes.setRrename(getColRenameMsg2(rRename));
                } else {
                    joinRes.setQuerystr(Transaction.done(txId));
                    joinRes.setNewtablename(newTableName);
                    joinRes.setLrenameList(getColRenameMsg(lRename));
                    joinRes.setRrenameList(getColRenameMsg(rRename));
                }
                deferred.resolve(joinRes);
            })
        .fail(function (err: any): void {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { join as Join }

function groupBy(groupByReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    let aggArgs: AggColInfo[] = [];
    let aggArgsMsgs: any = groupByReq.getAggargsList();
    aggArgsMsgs.forEach(aggArgMsg => {
        let aggArgStruct: AggColInfo = {
            "operator": aggArgMsg.getOperator(),
            "aggColName": aggArgMsg.getAggcolname(),
            "newColName": aggArgMsg.getNewcolname(),
            "isDistinct": aggArgMsg.getIsdistinct()
        };
        aggArgs.push(aggArgStruct);
    });
    let groupByCols: any = groupByReq.getGroupbycolsList();
    let optionsMsg: any = groupByReq.getOptions();
    let options: GroupByOption = {
        "newTableName": optionsMsg.getNewtablename(),
        "groupAll": optionsMsg.getGroupall(),
        "icvMode": optionsMsg.getIcvmode(),
        "dhtName": optionsMsg.getDhtname(),
        "clean": optionsMsg.getClean(),
        "isIncSample": optionsMsg.getIsincsample(),
        "sampleCols": optionsMsg.getSamplecolsList(),
        "newKeys": optionsMsg.getNewkeysList()
    };
    let tableName: any = groupByReq.getSrctablename();
    let txId: number = Transaction.start({ "simulate": true });
    //Delete index table for SDK
    let indexCache: TableIndexCache = XIApi.getIndexTable(tableName, groupByCols);
    if (indexCache != null) {
        XIApi.deleteIndexTable(indexCache.tableName);
    }
    XIApi.groupBy(txId, aggArgs, groupByCols, tableName, options)
            .then(function (ret: any): void {
                const finalTable: string = ret.finalTable;
                const newKeyFieldName: string = ret.newKeyFieldName;
                const newKeys: string[] = ret.newKeys;
                let groupByRes = new df_pb.GroupByResponse();
                groupByRes.setQuerystr(Transaction.done(txId));
                groupByRes.setNewtablename(finalTable);
                groupByRes.setNewkeyfieldname(newKeyFieldName);
                groupByRes.setNewkeysList(newKeys);
                deferred.resolve(groupByRes);
            })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { groupBy as GroupBy }

function index(indexReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    let colNames: string[] = indexReq.getColnamesList();
    let tableName: string = indexReq.getSrctablename();
    let newTableName: string = indexReq.getDsttablename();
    let newKeys: string[] = indexReq.getNewkeysList();
    let dhtName: string = indexReq.getDhtname();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.index(txId, colNames, tableName, newTableName, newKeys, dhtName)
            .then(function (ret: any): void {
                const newTableName: string = ret.newTableName;
                const isCache: boolean = ret.isCache;
                const newKeys: string[] = ret.newKeys;
                let indexRes = new df_pb.IndexResponse();
                indexRes.setQuerystr(Transaction.done(txId));
                indexRes.setNewtablename(newTableName);
                indexRes.setIscache(isCache);
                indexRes.setNewkeysList(newKeys);
                deferred.resolve(indexRes);
            })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { index as Index}

function sort(sortReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    let keyInfoMessages: any = sortReq.getKeyinfosList();
    let keyInfos: KeyInfo[] = [];
    keyInfoMessages.forEach(msg => {
        let keyInfo: KeyInfo = {
            "name": msg.getName(),
            "ordering": msg.getOrdering(),
            "type": msg.getType()
        };
        keyInfos.push(keyInfo);
    });
    let tableName: string = sortReq.getSrctablename();
    let newTableName: string = sortReq.getDsttablename();
    let dhtName: string = sortReq.getDhtname();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.sort(txId, keyInfos, tableName, newTableName, dhtName)
        .then(function (ret: any): void {
            const newTableName: string = ret.newTableName;
            const newKeys: string = ret.newKeys;
            let sortRes: any = new df_pb.SortResponse();
            sortRes.setQuerystr(Transaction.done(txId));
            sortRes.setNewtablename(newTableName);
            sortRes.setNewkeysList(newKeys);
            deferred.resolve(sortRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { sort as Sort }

function synthesize(synthesizeReq: any): Promise<any> {
    let deferred: any = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    let colInfosMsgs: any = synthesizeReq.getColinfosList();
    let colInfos: ColRenameInfo[] = [];
    colInfosMsgs.forEach(col => {
        let colRenameInfo: ColRenameInfo = {
            "orig": col.getOrig(),
            "new": col.getNew(),
            "type": col.getType().startsWith('Df') ? DfFieldTypeTFromStr[col.getType()] : xcHelper.convertColTypeToFieldType(col.getType())
        };
        colInfos.push(colRenameInfo);
    });
    let tableName: string = synthesizeReq.getSrctablename();
    let newTableName: string = synthesizeReq.getDsttablename();
    let sameSession: boolean = synthesizeReq.getSamesession();
    let txId: number = Transaction.start({ "simulate": true });
    XIApi.synthesize(txId, colInfos, tableName, newTableName, sameSession)
        .then(function (newTableName: string): void {
            let synthesizeRes: any = new df_pb.SynthesizeResponse();
            synthesizeRes.setQuerystr(Transaction.done(txId));
            synthesizeRes.setNewtablename(newTableName);
            deferred.resolve(synthesizeRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
export { synthesize as Synthesize }