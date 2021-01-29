
import { UserDefinedFunctionService as ApiUDF, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import { SCOPE, ScopeInfo, createScopeMessage } from '../Common/Scope';
import ProtoTypes = proto.xcalar.compute.localtypes;

class UDFService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get UDF resolution
     * @param
     * @description This function returns native promise
     */
    public async getRes(param: {
        udfScope: SCOPE,
        moduleName: string,
        scopeInfo?: ScopeInfo
    }): Promise<string> {
        try {
            const udfModule = this.__createUdfModule(param);

            const request = new ProtoTypes.UDF.GetResolutionRequest();
            request.setUdfModule(udfModule);
            const udfService = new ApiUDF(this._apiClient);
            const response = await udfService.getResolution(request);

            return response.getFqModName().getText();
        } catch (e) {
            throw parseError(e);
        }
    }
    // XXX TO-DO Need backend to migrate from thrift to protobuf first
    // /**
    //  * Get UDF
    //  * @param
    //  * @description This function returns native promise
    //  */
    // public async get(param: {
    //     udfScope: SCOPE,
    //     moduleName: string,
    //     scopeInfo?: ScopeInfo
    // }): Promise<string> {
    //     try {
    //         const udfModule = this.__createUdfModule(param);
    //         const request = new ProtoTypes.UDF.GetRequest();
    //         request.setUdfModule(udfModule);
    //         const udfService = new ApiUDF(this._apiClient);
    //         const response = await udfService.get(request);

    //         return response.getUdfModuleSrc().getSource();
    //     } catch (e) {
    //         throw parseError(e);
    //     }
    // }

    // /**
    //  * Add UDF
    //  * @param newLicense the string representation of a license
    //  * @description This function returns native promise
    //  */
    // public async add(param: {
    //     udfScope: SCOPE,
    //     moduleName: string,
    //     scopeInfo?: ScopeInfo
    // }): Promise<void> {
    //     try {
    //         const udfModule = this.__createUdfModule(param);
    //         const request = new ProtoTypes.UDF.AddUpdateRequest();
    //         request.setUdfModule(udfModule);
    //         const udfService = new ApiUDF(this._apiClient);
    //         await udfService.add(request);
    //     } catch (e) {
    //         throw parseError(e);
    //     }
    // }

    // /**
    //  * Update UDF
    //  * @param
    //  * @description This function returns native promise
    //  */
    // public async update(param: {
    //     udfScope: SCOPE,
    //     moduleName: string,
    //     scopeInfo?: ScopeInfo
    // }): Promise<void> {
    //     try {
    //         const udfModule = this.__createUdfModule(param);
    //         const request = new ProtoTypes.UDF.AddUpdateRequest();
    //         request.setUdfModule(udfModule);
    //         const udfService = new ApiUDF(this._apiClient);
    //         await udfService.update(request);
    //     } catch (e) {
    //         throw parseError(e);
    //     }
    // }

    // /**
    //  * Delete UDF
    //  * @param
    //  * @description This function returns native promise
    //  */
    // public async delete(param: {
    //     udfScope: SCOPE,
    //     moduleName: string,
    //     scopeInfo?: ScopeInfo
    // }): Promise<void> {
    //     try {
    //         const udfModule = this.__createUdfModule(param);
    //         const request = new ProtoTypes.UDF.DeleteRequest();
    //         request.setUdfModule(udfModule);
    //         const udfService = new ApiUDF(this._apiClient);
    //         await udfService.delete(request);
    //     } catch (e) {
    //         throw parseError(e);
    //     }
    // }

    private __createUdfModule(param: {
        udfScope: SCOPE,
        type?: UdfTypeT,
        moduleName: string,
        sourceCode?: string,
        scopeInfo?: ScopeInfo
    }): ProtoTypes.UDF.UdfModule {
        const { udfScope, moduleName, scopeInfo } = param;
        // XXX need to assing default value correctly
        const { userName = null, workbookName = null } = scopeInfo || {};

        const scope = createScopeMessage({
            scope: udfScope,
            scopeInfo: { userName: userName, workbookName: workbookName }
        });
        const udfModule = new ProtoTypes.UDF.UdfModule();
        udfModule.setScope(scope);
        udfModule.setName(moduleName);
        return udfModule;
    }
}

export { UDFService, ScopeInfo, SCOPE };