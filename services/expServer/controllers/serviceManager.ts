class ServiceManager {
    private static _instance = null;
    public static get getInstance(): ServiceManager{
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    convertToBase64(logs: string): string {
        return Buffer.from(logs).toString('base64');
    }
}

const serviceManager = ServiceManager.getInstance;
export default serviceManager;