import { DagNodeService as ApiDagNode, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import {
    SCOPE as DAGSCOPE,
    ScopeInfo as DagScopeInfo,
    createScopeMessage
} from '../Common/Scope';
import ProtoTypes = proto.xcalar.compute.localtypes;

class DagNodeService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Delete a dag node
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */

    public async delete(param: {
        namePattern: string,
        srcType: number,
        deleteCompletely?: boolean,
        dagScope: DAGSCOPE
        scopeInfo?: DagScopeInfo
    }): Promise<DeleteDagNodesOutput> {
        try {
            const { namePattern, srcType, deleteCompletely, dagScope, scopeInfo } = param;
            const request = new ProtoTypes.DagNode.DeleteRequest();
            request.setNamePattern(namePattern);
            request.setSrcType(srcType);
            request.setDeleteCompletely(deleteCompletely);
            request.setScope(createScopeMessage({scope: dagScope, scopeInfo:scopeInfo}));

            const dagNodeService = new ApiDagNode(this._apiClient);
            const response = await dagNodeService.deleteObjects(request);

            const statuses: DeleteDagNodeStatus[] = [];
            for (const responseStatus of response.getStatusesList()) {
                const responseNodeInfo = responseStatus.getNodeInfo();
                const nodeInfo: DagNodeInfo = {
                    name: responseNodeInfo.getName(),
                    dagNodeId: responseNodeInfo.getDagNodeId().toString(),
                    state: responseNodeInfo.getState(),
                    size: responseNodeInfo.getSize(),
                    api: responseNodeInfo.getApi()
                }
                const refs: DagRef[] = [];
                for (const responseDagRef of responseStatus.getRefsList()) {
                    const dagRef: DagRef = {
                        type: responseDagRef.getType(),
                        name: responseDagRef.getName(),
                        xid: responseDagRef.getXid()
                    }
                    refs.push(dagRef);
                }
                const dagNodeStatus: DeleteDagNodeStatus = {
                    nodeInfo: nodeInfo,
                    status: responseStatus.getStatus(),
                    numRefs: responseStatus.getNumRefs(),
                    refs: refs
                }
                statuses.push(dagNodeStatus);
            }
            const deleteDagNodesOutput: DeleteDagNodesOutput = {
                numNodes: response.getNumNodes(),
                statuses: statuses
            }
            return deleteDagNodesOutput;
        } catch (e) {
            throw parseError(e);
        }
    }

     /**
     * Pin a dag node
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */

    public async pin(param: {
        tableName: string,
        dagScope: DAGSCOPE
        scopeInfo?: DagScopeInfo
    }): Promise<void> {
        try {
            const { tableName, dagScope, scopeInfo } = param;
            const request = new ProtoTypes.DagNode.DagNodeInputMsg();
            request.setDagNodeName(tableName);
            request.setScope(createScopeMessage({ scope: dagScope, scopeInfo: scopeInfo }));
            const dagNodeService = new ApiDagNode(this._apiClient);

            await dagNodeService.pin(request);
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * Unpin a dag node
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */

    public async unpin(param: {
        tableName: string,
        dagScope: DAGSCOPE
        scopeInfo?: DagScopeInfo
    }): Promise<void> {
        try {
            const { tableName, dagScope, scopeInfo } = param;
            const request = new ProtoTypes.DagNode.DagNodeInputMsg();
            request.setDagNodeName(tableName);
            request.setScope(createScopeMessage({ scope: dagScope, scopeInfo: scopeInfo }));
            const dagNodeService = new ApiDagNode(this._apiClient);

            await dagNodeService.unpin(request);
        } catch (e) {
            throw parseError(e);
        }
    }
}

type DagNodeInfo = {
    name: string,
    dagNodeId: string,
    state: string,
    size: number,
    api: string
}
type DagRef = {
    type: string,
    name: string,
    xid: string
}
type DeleteDagNodeStatus = {
    nodeInfo: DagNodeInfo,
    status: number,
    numRefs: number,
    refs: Array<DagRef>
}
type DeleteDagNodesOutput = {
    numNodes: number,
    statuses: Array<DeleteDagNodeStatus>
};

export { DagNodeService, DagScopeInfo, DAGSCOPE, DeleteDagNodesOutput};
