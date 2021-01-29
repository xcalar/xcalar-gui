// Note about Promise:
// We are using native JS promise(async/await) in the Xcrpc code.
// However, in order to incorporate with other code which still use JQuery promise,
// we need to convert promises between different types.
// 1. xcrpc JS client returns JQuery promise, which can be converted to native promise by PromiseHelper.convertToNative()
//
// 2. The code invoking Xcrpc may expect JQuery promise, so use PromiseHelper.convertToJQuery() as needed.
// import ApiQuery = xce.QueryService;
// import ApiClient = xce.XceClient;
// import ProtoTypes = proto.xcalar.compute.localtypes;
// import ServiceError = Xcrpc.ServiceError;

import { ResultSetService as ApiQuery, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import { SCOPE, ScopeInfo, createScopeMessage } from '../Common/Scope';
import ProtoTypes = proto.xcalar.compute.localtypes;

class ResultSetService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Make a new result set
     * @param param
     * @description
     */
    public async make(param: {
        name: string,
        scope?: SCOPE,
        error_dataset?: boolean,
        make_type?: MakeType,
        scopeInfo?: ScopeInfo
    }): Promise<MakeResponseInfo> {
        try {
            // Deconstruct arguments
            const { name, scope, error_dataset, make_type, scopeInfo } = param;
            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.ResultSet.ResultSetMakeRequest();
            request.setName(name);

            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo }));
            request.setErrorDataset(error_dataset);
            request.setMakeType(make_type);

            // Step #2: Call xcrpc service
            const resultSetService = new ApiQuery(this._apiClient);
            const response: ProtoTypes.ResultSet.ResultSetMakeResponse = await resultSetService.make(request);

            // Step #3: Parse xcrpc service response
            let metaProto: ProtoTypes.TableMeta.GetTableMetaProto = response.getGetTableMeta()
            let colProtos: Map<string, ProtoTypes.ColumnAttribute.ColumnAttributeProto> = metaProto.getColumnAttributesMap();
            let colAttributes = [];
            colProtos.forEach((colProto: ProtoTypes.ColumnAttribute.ColumnAttributeProto, _key: string) => {
                colAttributes.push({
                    name: colProto.getName(),
                    type: colProto.getType(),
                    index: colProto.getValueArrayIdx()
                });
            });


            let keyProtos: Map<string, ProtoTypes.ColumnAttribute.KeyAttributeProto> = metaProto.getKeyAttributesMap();
            let keyAttributes = [];
            keyProtos.forEach((keyProto: ProtoTypes.ColumnAttribute.KeyAttributeProto, _key: string) => {
                keyAttributes.push({
                    name: keyProto.getName(),
                    type: keyProto.getType(),
                    index: keyProto.getValueArrayIdx()
                });
            })

            let tableProtos: Map<number, ProtoTypes.TableMeta.TableMetaProto> = metaProto.getTableMetaMap();
            let tableInfo = [];
            tableProtos.forEach((tableProto: ProtoTypes.TableMeta.TableMetaProto, _key: number) => {
                const rps = [];
                const pps = [];
                for (let idxSlot = 0; idxSlot < tableProto.getNumSlots(); idxSlot ++) {
                    rps.push(tableProto.getRowsPerSlotMap().get(idxSlot));
                    pps.push(tableProto.getPagesPerSlotMap().get(idxSlot));
                }
                tableInfo.push({
                    status: tableProto.getStatus(),
                    num_rows: tableProto.getNumRows(),
                    num_pages: tableProto.getNumPages(),
                    num_slots: tableProto.getNumSlots(),
                    size: tableProto.getSize(),
                    rows_per_slot: rps,
                    pages_per_slot: pps,
                    pages_consumed_in_bytes: tableProto.getPagesConsumedInBytes(),
                    pages_allocated_in_bytes: tableProto.getPagesAllocatedInBytes(),
                    pages_sent: tableProto.getPagesSent(),
                    pages_received: tableProto.getPagesReceived()
                })
            });


            let info: MakeResponseInfo = {
                id: response.getResultSetId(),
                num_rows: response.getNumRows(),
                tableMeta: {
                    datasets: metaProto.getDatasetsList(),
                    result_set_ids: metaProto.getResultSetIdsList(),
                    columnsAttributes: colAttributes,
                    keyAttributes: keyAttributes,
                    tableInfo: tableInfo,
                    num_immediates: metaProto.getNumImmediates(),
                    ordering: metaProto.getOrdering()
                }
            }
            return info;
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * Get an array of queryInfos which include name, timeElapsed, and state
     * @param param
     * @description
     */
    public async release(param: {
        result_set_id: number,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<void> {
        try {
            // Deconstruct arguments
            const { result_set_id, scope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.ResultSet.ResultSetReleaseRequest();
            request.setResultSetId(result_set_id);

            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo }));

            // Step #2: Call xcrpc service
            const resultSetService = new ApiQuery(this._apiClient);
            const response = await resultSetService.release(request);

            // Step #3: Parse xcrpc service response
            return response;
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * Get an array of queryInfos which include name, timeElapsed, and state
     * @param param
     * @description
     */
    public async next(param: {
        result_set_id: number,
        num_rows: number,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<NextResponseInfo> {
        try {
            const { result_set_id, num_rows, scope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.ResultSet.ResultSetNextRequest();
            request.setResultSetId(result_set_id);

            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo }));

            request.setNumRows(num_rows);
            // Step #2: Call xcrpc service
            const resultSetService = new ApiQuery(this._apiClient);
            const response: ProtoTypes.ResultSet.ResultSetNextResponse = await resultSetService.next(request);

            const processValue = function(protoFieldValue) {
                if (protoFieldValue.hasArrayValue()) {
                    return processArray(protoFieldValue.getArrayValue().getElementsList());
                } else if (protoFieldValue.hasObjectValue()) {
                    return processValueMap(protoFieldValue.getObjectValue().getValuesMap());
                } else {
                    return protoFieldValue.array[protoFieldValue.getDatavalueCase() - 1];
                }
            }

            const processArray = function(protoFieldValueArray) {
                var arr = [];
                protoFieldValueArray.forEach((protoFieldValue) => {
                    arr.push(processValue(protoFieldValue));
                });
                return arr;
            }

            const processValueMap = function(fieldMap) {
                var obj = {};
                fieldMap.forEach((protoFieldValue, key) => {
                    obj[key] = processValue(protoFieldValue);
                });
                return obj;
            }


            let rows = response.getRowsList().map((protoRow) => {
                // Map the proto rows to be a format that we expect, ie,
                // { column_name: value }
                let rowObj = processValueMap(protoRow.getFieldsMap());
                return JSON.stringify(rowObj);
            });

            let metas: string[] = response.getMetasList().map((meta) => {
                return meta.array;
            })
            // Step #3: Parse xcrpc service response
            return {
                metas: metas,
                rows: rows
            }
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * Get an array of queryInfos which include name, timeElapsed, and state
     * @param param
     * @description
     */
    public async seek(param: {
        result_set_id: number,
        row_index: number,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<void> {
        try {
            // Deconstruct arguments
            const { result_set_id, row_index, scope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.ResultSet.ResultSetSeekRequest();
            request.setResultSetId(result_set_id);
            request.setRowIndex(row_index);

            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo }));

            // Step #2: Call xcrpc service
            const resultSetService = new ApiQuery(this._apiClient);
            const response = await resultSetService.seek(request);

            // Step #3: Parse xcrpc service response
            return response;
        } catch (e) {
            throw parseError(e);
        }
    }
}

type ResultSetTableInfo = {
    status: string,
    num_rows: number,
    num_cols: number,
    num_pages: number,
    num_slots: number,
    size: number,
    rows_per_slot: number[],
    pages_per_slot: number[],
    pages_consumed_in_bytes: number,
    pages_allocated_in_bytes: number,
    pages_sent: number,
    pages_received: number
}

type MakeResponseInfo = {
    id: number,
    num_rows: number,
    tableMeta: {
        datasets: string[],
        result_set_ids: number[],
        columnsAttributes: {
            name: string,
            type: string,
            index: number
        }[],
        keyAttributes: {
            name: string,
            type: string,
            index: number
        }[],
        tableInfo: ResultSetTableInfo[],
        num_immediates: number,
        ordering: string
    }
}

type NextResponseInfo = {
    metas: string[],
    rows: string[]
}

enum MakeType {
    TABLE = ProtoTypes.ResultSet.MakeType.TABLE,
    DATASET = ProtoTypes.ResultSet.MakeType.DATASET
}

export { ResultSetService, SCOPE, ScopeInfo, MakeType, MakeResponseInfo, NextResponseInfo };