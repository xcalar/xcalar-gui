import { LicenseService as ApiLicense, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class LicenseService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get the license struct
     * @param
     * @description This function returns native promise
     */
    public async getLicense(): Promise<LicenseInfo> {
        try {
            const request = new ProtoTypes.License.GetRequest();
            const licenseService = new ApiLicense(this._apiClient);
            const response = await licenseService.get(request);

            // This is a hack to make branch migration work, as xcrpc naming convention is different on trunk than 2.0
            // Remove this hack once all xcrpc changes are done with cherry-pick
            let parsedResponse = null;
            try {
                // Trunk version
                parsedResponse = {
                    isLoaded: response.getLoaded(),
                    isExpired: response.getExpired(),
                    platform: response.getPlatform(),
                    product: response.getProduct(),
                    productFamily: response.getProductFamily(),
                    productVersion: response.getProductVersion(),
                    expiration: response.getExpiration(),
                    nodeCount: response.getNodeCount(),
                    userCount: response.getUserCount(),
                    attributes: response.getAttributes(),
                    licensee: response.getLicensee(),
                    compressedLicenseSize: response.getCompressedLicenseSize(),
                    compressedLicense: response.getCompressedLicense()
                };
            } catch(_) {
                // 2.0 version
                parsedResponse = {
                    isLoaded: response.getLoaded(),
                    isExpired: response.getExpired(),
                    platform: response.getPlatform(),
                    product: response.getProduct(),
                    productFamily: response.getProductfamily(),
                    productVersion: response.getProductversion(),
                    expiration: response.getExpiration(),
                    nodeCount: response.getNodecount(),
                    userCount: response.getUsercount(),
                    attributes: response.getAttributes(),
                    licensee: response.getLicensee(),
                    compressedLicenseSize: response.getCompressedlicensesize(),
                    compressedLicense: response.getCompressedlicense()
                };
            }
            return parsedResponse;
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * Update license
     * @param newLicense the string representation of a license
     * @description This function returns native promise
     */
    public async updateLicense(param: {
        newLicense: string
    }): Promise<void> {
        try {
            const { newLicense } = param;
            const licenseValue = new ProtoTypes.License.LicenseValue();
            licenseValue.setValue(newLicense);
            const request = new ProtoTypes.License.UpdateRequest();
            try {
                // Trunk version
                request.setLicenseValue(licenseValue);
            } catch(_) {
                // 2.0 version
                request.setLicensevalue(licenseValue);
            }

            const licenseService = new ApiLicense(this._apiClient);
            await licenseService.update(request);
        } catch (e) {
            throw parseError(e);
        }
    }
}

type LicenseInfo = {
    isLoaded: boolean,
    isExpired: boolean,
    platform: string,
    product: string,
    productFamily: string,
    productVersion: string,
    expiration: string,
    nodeCount: number,
    userCount: number,
    attributes: string,
    licensee: string,
    compressedLicenseSize: number,
    compressedLicense: string
};

export { LicenseService, LicenseInfo };