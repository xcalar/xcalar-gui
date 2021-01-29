import { SchemaLoadService as ApiSchemaLoad, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class SchemaLoadService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    public async appRun(jsonStr): Promise<string> {
        try {
            const appRequest = new ProtoTypes.SchemaLoad.AppRequest();
            appRequest.setJson(jsonStr);

            const service = new ApiSchemaLoad(this._apiClient);
            const response = await service.appRun(appRequest);

            return response.getJson();
        } catch(e) {
            throw parseError(e);
        }
    }
}

export { SchemaLoadService }