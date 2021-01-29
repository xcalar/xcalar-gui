import { PublishedTableService as ApiPublishedTable, XceClient as ApiClient } from 'xcalar';
import {parseError} from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes ;
import {ColumnArgs} from '../Operator/XcalarProtoQueryInput';
import { ScopeInfo, SCOPE, createScopeMessage } from '../Common/Scope';

class PublishedTableService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     *
     * @param param
     */

    public async select (param:{
        srcTable: string, destTable: string, minBatchId: number, maxBatchId: number, filterString: string,
        limitRows:number, columnArray:  Array<ColumnArgs>, scopeInfo:ScopeInfo, scope: SCOPE
    }): Promise<string> {
        try {
            const {srcTable, destTable, minBatchId, maxBatchId,
                filterString, columnArray, scopeInfo, scope } = param;
            const request = new ProtoTypes.PublishedTable.SelectRequest();
            const evalMessage: ProtoTypes.PublishedTable.SelectEvalArgs
                = new ProtoTypes.PublishedTable.SelectEvalArgs();
            evalMessage.setFilter(filterString);
            request.setEval(evalMessage);
            const ColumnsList = columnArray.map(function(obj){
                let Column = new ProtoTypes.Operator.XcalarApiColumn();
                Column.setSourceColumn(obj.sourceColumn);
                Column.setDestColumn(obj.destColumn);
                Column.setColumnType(obj.columnType);
                return Column;
            });
            request.setColumnsList(ColumnsList);
            request.setSource(srcTable);
            request.setDest(destTable);
            request.setMinBatchId(minBatchId);
            request.setMaxBatchId(maxBatchId);
            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo}));
            let limitRows: number = param.limitRows || 0;
            request.setLimitRows(limitRows);

            const publishedTableService = new ApiPublishedTable(this._apiClient);
            const response = await publishedTableService.select(request);
            return response.getTableName()
        } catch (e) {
            throw parseError(e);
        }

    }

    public async listTables (param:{ patternStr: string, updateStartBatchId: number,
        getUpdates: boolean, getSelects: boolean
    }): Promise<listTableOutput>{
        try {
            const {patternStr, updateStartBatchId, getUpdates, getSelects} = param;
            const request = new ProtoTypes.PublishedTable.ListTablesRequest()
            request.setNamePattern(patternStr);
            request.setUpdateStartBatchId(updateStartBatchId);
            let maxUpdateCount = 128;
            let maxSelectCount = 128;
            if(!getUpdates){
                maxUpdateCount = 0;
            }
            if(!getSelects){
                maxSelectCount = 0;
            }
            request.setMaxUpdateCount(maxUpdateCount);
            request.setMaxSelectCount(maxSelectCount);

            const publishedTableService = new ApiPublishedTable(this._apiClient);
            const response = await publishedTableService.listTables(request);

            const tablesList = response.getTablesList();
            const tables: Array<TableInfo> = new Array() //returned array

            for (let tableInfo of tablesList){
                const keys = tableInfo.getKeysList();
                const values = tableInfo.getValuesList();
                const updates = tableInfo.getUpdatesList();
                const selects = tableInfo.getSelectsList();
                const indexes = tableInfo.getIndexesList();

                const keyList = keys.map(function(key){
                    let keyInfo:ColumnAttribute = {
                        name : key.getName(),
                        type: key.getType(),
                        value_array_idx: key.getValueArrayIdx()
                    }
                    return keyInfo;
                });

                const valueList = values.map(function(value){
                    let valueInfo:ColumnAttribute = {
                        name : value.getName(),
                        type: value.getType(),
                        value_array_idx: value.getValueArrayIdx()
                    };
                    return valueInfo;
                });


                const updateList = updates.map(function(update){
                    let updateInfo: UpdateInfo = {
                        source : update.getSrcTableName(),
                        batchId: update.getBatchId(),
                        numRows: update.getNumRows(),
                        numInsterts: update.getNumInserts(),
                        numUpdated: update.getNumUpdates(),
                        numDeletes: update.getNumDeletes(),
                        size: update.getSize(),
                        startTS: update.getStartTs()
                    }
                    return updateInfo;
                });

                const selectList = selects.map(function(select){
                    let selectInfo: SelectInfo = {
                        source: tableInfo.getName(),
                        dest: select.getDstTableName(),
                        minBatchId: select.getMinBatchId(),
                        maxBatchId: select.getMaxBatchId()
                    }
                    return selectInfo;
                });

                const indexList = indexes.map(function(index){
                    let colKeyInfo = index.getKey();
                    let colKey: ColumnAttribute = {
                        name: colKeyInfo.getName(),
                        type: colKeyInfo.getType(),
                        value_array_idx: colKeyInfo.getValueArrayIdx()
                    }
                    let time: Time = {milliseconds: index.getUptimeMs()};
                    let indexInfo: IndexInfo = {
                        key : colKey,
                        uptime: time,
                        sizeEstimate : index.getSizeEstimate()
                    }
                    return indexInfo
                });

                const source :Source = {
                    source: tableInfo.getSrcTableName(),
                    dest: tableInfo.getName()
                }

                const table: TableInfo = {
                    name:  tableInfo.getName(),
                    numPersistedUpdateds: tableInfo. getNumPersistedUpdates(),
                    sizeTotal: tableInfo.getSizeTotal(),
                    numRowsTotal: tableInfo.getNumRowsTotal(),
                    oldestBatchId: tableInfo.getOldestBatchId(),
                    nextBatchId: tableInfo.getNextBatchId(),
                    source: source,
                    active: tableInfo.getActive(),
                    restoring: tableInfo.getRestoring(),
                    userIdName: tableInfo.getUserIdName(),
                    sessionName: tableInfo.getSessionName(),
                    keys: keyList,
                    values: valueList,
                    updates: updateList,
                    selects: selectList,
                    indices: indexList
                }

                tables.push(table)
            }

            const output: listTableOutput = {
                numTables: tables.length,
                tables: tables
            }

            return output;
        } catch(e) {
            throw parseError(e);
        }
    }
}


type ColumnAttribute = {
    name: string,
    type: string,
    value_array_idx: number
}

type Time = {
    milliseconds: number
}

type UpdateInfo = {
    source : string,
    batchId: number,
    numRows: number,
    numInsterts: number,
    numUpdated: number,
    numDeletes: number,
    size: number,
    startTS: number
}

type SelectInfo = {
    source: string
    dest: string,
    minBatchId: number,
    maxBatchId: number
}

type IndexInfo = {
    key : ColumnAttribute,
    uptime: Time,
    sizeEstimate : number
}

type Source = {
    source: string,
    dest: string,
}

type TableInfo = {
    name: string,
    numPersistedUpdateds: number,
    sizeTotal: number,
    numRowsTotal: number,
    oldestBatchId: number,
    nextBatchId: number;
    source: Source,
    active: boolean,
    restoring: boolean,
    userIdName: string,
    sessionName: string,
    keys: ColumnAttribute[],
    values: ColumnAttribute[],
    updates: UpdateInfo[],
    selects: SelectInfo[],
    indices: IndexInfo[]
}

type listTableOutput = {
    numTables: number,
    tables : Array<TableInfo>
}

export {PublishedTableService, ColumnAttribute, Time,
    UpdateInfo, SelectInfo, IndexInfo, Source, TableInfo, listTableOutput, ScopeInfo, SCOPE, ColumnArgs}
