// Note about Promise:
// We are using native JS promise(async/await) in the Xcrpc code.
// However, in order to incorporate with other code which still use JQuery promise,
// we need to convert promises between different types.
// 1. xcrpc JS client returns JQuery promise, which can be converted to native promise by PromiseHelper.convertToNative()
//
// 2. The code invoking Xcrpc may expect JQuery promise, so use PromiseHelper.convertToJQuery() as needed.
// import ApiTable = xce.TableService;
// import ApiClient = xce.XceClient;
// import ProtoTypes = proto.xcalar.compute.localtypes;
// import ServiceError = Xcrpc.ServiceError;

import { TableService as ApiTable, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import {
    ScopeInfo,
    SCOPE,
    createScopeMessage
} from '../Common/Scope';
import ProtoTypes = proto.xcalar.compute.localtypes;

class TableService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get an array of queryInfos which include name, timeElapsed, and state
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async addIndex(tableName: string, keyName: string): Promise<proto.google.protobuf.Empty> {
        try {
            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Table.IndexRequest();
            request.setTableName(tableName);
            request.setKeyName(keyName);

            // Step #2: Call xcrpc service
            const tableService = new ApiTable(this._apiClient);
            const response = await tableService.addIndex(request);

            // Step #3: Parse xcrpc service response
            return response;
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * List session/shared tables
     * @param param
     */
    public async listTables(param: {
        namePattern?: string,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<any> {
        try {
            const { namePattern = '*', scope, scopeInfo } = param;
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });

            // Construct api request object
            const request = new ProtoTypes.Table.ListTablesRequest();
            request.setPattern(namePattern);
            request.setScope(apiScope);

            // Call api service
            const tableService = new ApiTable(this._apiClient);
            const response = await tableService.listTables(request);

            // Parse response
            return this.parseTableList(response);
        } catch (e) {
            console.error('TableService.listTables', e);
            throw parseError(e);
        }
    }

    private parseTableList(
        response: ProtoTypes.Table.ListTablesResponse
    ): any {
        const res = {};
        const tableNames = response.getTableNamesList();
        for (let tableName of tableNames) {
            const tableMeta = response.getTableMetaMapMap().get(tableName);
            res[tableName] = this.parseTableMeta(tableMeta);
        }
        return res;
    }

    private parseTableMeta(
        tableMeta: ProtoTypes.Table.TableMetaResponse
    ) {
        const tableStruct = {
            attributes: null,
            schema: null,
            aggregatedStats: null,
            statsPerNode: null,
            status: tableMeta.getStatus()
        };
        if (tableStruct.status.indexOf('XCE-00000000') < 0) {
            return tableStruct;
        }

        // Attributes
        const tableAttributes = tableMeta.getAttributes();
        if (tableAttributes != null) {
            tableStruct.attributes = {
                tableName: tableAttributes.getTableName(),
                tableId: tableAttributes.getTableId(),
                xdbId: tableAttributes.getXdbId(),
                state: tableAttributes.getState(),
                pinned: tableAttributes.getPinned(),
                shared: tableAttributes.getShared(),
                datasets: [...tableAttributes.getDatasetsList()],
                resultSetIds: [...tableAttributes.getResultSetIdsList()]
            };
        }

        // Schema
        const tableSchema = tableMeta.getSchema();
        if (tableSchema != null) {
            tableStruct.schema = {
                columnAttributes: tableSchema.getColumnAttributesList().map((column) => ({
                    name: column.getName(),
                    type: column.getType(),
                    valueArrayIdx: column.getValueArrayIdx()
                })),
                keyAttributes: tableSchema.getKeyAttributesList().map((key) => ({
                    name: key.getName(),
                    type: key.getType(),
                    valueArrayIdx: key.getValueArrayIdx(),
                    ordering: key.getOrdering()
                }))
            };
        }

        // Aggregrated Stats
        const tableAggregatedStats = tableMeta.getAggregatedStats();
        if (tableAggregatedStats != null) {
            tableStruct.aggregatedStats = {
                totalRecordsCount: tableAggregatedStats.getTotalRecordsCount(),
                totalSizeInBytes: tableAggregatedStats.getTotalSizeInBytes(),
                rowsPerNode: [...tableAggregatedStats.getRowsPerNodeList()],
                sizeInBytesPerNode: [...tableAggregatedStats.getSizeInBytesPerNodeList()]
            };
        }

        // Stats per node
        const tableStatsPerNodeMap = tableMeta.getStatsPerNodeMap();
        if (tableStatsPerNodeMap != null) {
            const retStatsPerNode = {};
            for (const [node, nodeStats] of tableStatsPerNodeMap.entries()) {
                retStatsPerNode[node] = {
                    status: nodeStats.getStatus(),
                    numRows: nodeStats.getNumRows(),
                    numPages: nodeStats.getNumPages(),
                    numSlots: nodeStats.getNumSlots(),
                    sizeInBytes: nodeStats.getSizeInBytes(),
                    pagesConsumedInBytes: nodeStats.getPagesConsumedInBytes(),
                    pagesAllocatedInBytes: nodeStats.getPagesAllocatedInBytes(),
                    pagesSent: nodeStats.getPagesSent(),
                    pagesReceived: nodeStats.getPagesReceived(),
                    rowsPerSlot: [...nodeStats.getRowsPerSlotMap().entries()].reduce((result, [k, v]) => {
                        result[k] = v;
                        return result;
                    }, {}),
                    pagesPerSlot: [...nodeStats.getPagesPerSlotMap().entries()].reduce((result, [k, v]) => {
                        result[k] = v;
                        return result;
                    }, {})
                };
            }
            tableStruct.statsPerNode = retStatsPerNode;
        }

        return tableStruct;
    }

    /**
     * Make a table shared, for test only, comment out before stage 1 release
     * @param tableName, name of the target table
     * @param scope, scope code of this call
     * @param scopeInfo, scope detail of this call
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     * */
    public async publishTable(param: {
        tableName: string,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<string> {
        try {
            const { tableName, scope, scopeInfo } = param;
            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Table.PublishRequest();
            request.setTableName(tableName);
            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo}));

            // Step #2: Call xcrpc service
            const tableService = new ApiTable(this._apiClient);
            const response = await tableService.publishTable(request);

            // Step #3: Parse xcrpc service response
            return response.getFullyQualTableName();
        } catch (e) {
            throw parseError(e);
        }
    }
}

export { TableService, SCOPE, ScopeInfo };