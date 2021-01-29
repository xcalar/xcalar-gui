import { TargetService as ApiTarget, XceClient as ApiClient } from 'xcalar';
import { ScopeInfo, SCOPE, createScopeMessage } from '../Common/Scope';
import { parseError } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class TargetService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * General service for target apis create, delete, list and typeList
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async run(param: {
        inputJson: TargetCreateObject | TargetDeleteObject | TargetListObject | TargetTypeListObject,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<string> {
        try {
            // Deconstruct arguments
            const { inputJson, scope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Target.TargetRequest();
            request.setInputJson(JSON.stringify(inputJson));
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });
            request.setScope(apiScope);

            // Step #2: Call xcrpc service
            const targetService = new ApiTarget(this._apiClient);
            const response = await targetService.run(request);

            // Step #3: Parse xcrpc service response
            return response.getOutputJson();
        } catch (e) {
            throw parseError(e);
        }
    }
}

interface TargetCreateObject {
    func: string,
    targetTypeId: string,
    targetName: string,
    targetParams: object
}

interface TargetDeleteObject {
    func: string,
    targetName: string
}

interface TargetListObject {
    func: string
}

interface TargetTypeListObject {
    func: string
}

export { TargetService, SCOPE, ScopeInfo, TargetCreateObject, TargetDeleteObject, TargetListObject, TargetTypeListObject };