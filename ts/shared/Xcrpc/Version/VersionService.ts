import { VersionService as ApiVersion, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';

class VersionService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }
    /**
     * General service for version apis getVersion
     * @param empty
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
    */
   public async getVersion():Promise<VersionOutput> {
       try {
            // Step #1: Construct xcrpc service input
            const request = new proto.google.protobuf.Empty();
            // Step #2: Call xcrpc service
            const versionService = new ApiVersion(this._apiClient);
            const response = await versionService.getVersion(request);

            // Step #3: Parse xcrpc service response
            const versionOutput:VersionOutput = {
                version:response.getVersion(),
                thriftVersionSignatureFull: response.getThriftVersionSignatureFull(),
                thriftVersionSignatureShort: response.getThriftVersionSignatureShort(),
                xcrpcVersionSignatureFull: response.getXcrpcVersionSignatureFull(),
                xcrpcVersionSignatureShort: response.getXcrpcVersionSignatureShort()
            }
            return(versionOutput);

        } catch (e) {
            throw parseError(e);
        }
   }
}

interface VersionOutput {
    version : string,
    thriftVersionSignatureFull : string,
    thriftVersionSignatureShort : number,
    xcrpcVersionSignatureFull : string,
    xcrpcVersionSignatureShort : number;
}

export {VersionService, VersionOutput};
