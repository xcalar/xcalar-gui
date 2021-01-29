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

import { SessionService as ApiSession, XceClient as ApiClient } from 'xcalar';
import {
    ScopeInfo,
    SCOPE,
    createScopeMessage
} from '../Common/Scope';
import { parseError } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class SessionService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Session create service for creating new workbook
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async create(param: {
        sessionName: string,
        fork: boolean,
        forkedSessionName: string
        scope: SCOPE,
        scopeInfo?: ScopeInfo,
    }): Promise<string> {
        try {
            // Deconstruct arguments
            const { sessionName, fork, forkedSessionName, scope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Session.CreateRequest();
            const sessionNewInput = new ProtoTypes.Session.SessionNewInput();
            sessionNewInput.setSessionName(sessionName);
            sessionNewInput.setFork(fork);
            sessionNewInput.setForkedSessionName(forkedSessionName);
            request.setSessionNewInput(sessionNewInput);
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });
            request.setScope(apiScope);

            // Step #2: Call xcrpc service
            const sessionService = new ApiSession(this._apiClient);
            const response = await sessionService.create(request);

            // Step #3: Parse xcrpc service response
            // Here convert number to hexadecimal string, we need to do it for other apis
            return response.getSessionNewOutput().getSessionId().toString(16).toUpperCase();
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * Session create service for creating new workbook
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async activate(param: {
        sessionName: string,
        scope: SCOPE,
        scopeInfo?: ScopeInfo,
    }): Promise<{success: boolean}> {
        try {
            // Deconstruct arguments
            const { sessionName, scope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Session.ActivateRequest();
            const sessionInfoInput = new ProtoTypes.Session.SessionInfoInput();
            sessionInfoInput.setSessionName(sessionName);
            request.setSessionInfoInput(sessionInfoInput);
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });
            request.setScope(apiScope);

            // Step #2: Call xcrpc service
            const sessionService = new ApiSession(this._apiClient);
            await sessionService.activate(request);

            // Step #3: Parse xcrpc service response
            return {success: true};
        } catch (e) {
            throw parseError(e);
        }
    }
}

export { SessionService, SCOPE, ScopeInfo };