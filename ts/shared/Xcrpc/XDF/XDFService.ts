import { XDFService as ApiXDF, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import { ScopeInfo, SCOPE, createScopeMessage } from '../Common/Scope';
import ProtoTypes = proto.xcalar.compute.localtypes;

class XDFService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get description of XDFs
     * @param param
     */
    public async listXdfs(param: {
        fnNamePattern: string, categoryPattern: string, scope: SCOPE, scopeInfo?: ScopeInfo
    }): Promise<Array<EvalFnDesc>> {
        try {
            // Deconstruct arguments
            const { fnNamePattern, categoryPattern, scope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.XDF.ListXdfsRequest();
            request.setScope(createScopeMessage({
                scope: scope, scopeInfo: scopeInfo
            }));
            request.setFnnamePattern(fnNamePattern);
            request.setCategoryPattern(categoryPattern);

            // Step #2: Call xcrpc service
            const xdfService = new ApiXDF(this._apiClient);
            const response = await xdfService.listXdfs(request);

            // Step #3: Parse xcrpc service response
            const result = new Array<EvalFnDesc>();
            for (const fnDesc of response.getFndescsList()) {
                if (fnDesc.getFnname() === 'findMinIdx') {
                    // Ported from thrift logic, which is to workaround a backend bug
                    continue;
                }
                result.push({
                    fnName: fnDesc.getFnname(),
                    displayName: fnDesc.getFnname().split("/").pop(),
                    fnDesc: fnDesc.getFndesc(),
                    category: fnDesc.getCategory(),
                    numArgs: fnDesc.getNumArgs(),
                    argDescs: fnDesc.getArgdescsList().map<EvalArgDesc>((argDesc) => ({
                        argDesc: argDesc.getArgdesc(),
                        typesAccepted: argDesc.getTypesAccepted(),
                        isSingletonValue: argDesc.getIsSingletonValue(),
                        argType: argDesc.getArgType(),
                        maxArgs: argDesc.getMaxArgs(),
                        minArgs: argDesc.getMinArgs()
                    })),
                    isSingletonOutput: fnDesc.getIsSingletonOutput(),
                    outputType: fnDesc.getOutputType()
                });
            }
            return result;
        } catch (e) {
            throw parseError(e);
        }
    }
}

declare type EvalArgDesc = {
    argDesc: string;
    argType: number;
    typesAccepted: number;
    isSingletonValue: boolean;
    minArgs: number;
    maxArgs: number;
};

declare type EvalFnDesc = {
    fnName: string,
    displayName: string,
    fnDesc: string,
    category: number,
    numArgs: number,
    argDescs: Array<EvalArgDesc>,
    isSingletonOutput: boolean,
    outputType: number
};

export { XDFService, EvalArgDesc, EvalFnDesc, SCOPE, ScopeInfo };