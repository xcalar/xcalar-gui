import { KvStoreService as ApiKVStore, XceClient as ApiClient } from 'xcalar';
import {
    SCOPE as KVSCOPE,
    ScopeInfo as KvScopeInfo,
    createScopeMessage
} from '../Common/Scope';
import {parseError} from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class KVStoreService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get the stirng value of a KVStore key
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */

    public async lookup(param: {
        keyName: string, kvScope: number, scopeInfo?: KvScopeInfo
    }): Promise<Value> {
        try {
            // Deconstruct arguments
            const { keyName, kvScope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(keyName);

            const scope = createScopeMessage({scope: kvScope, scopeInfo:scopeInfo});
            const request = new ProtoTypes.KvStore.LookupRequest();
            scopeKey.setScope(scope);
            request.setKey(scopeKey);

            // Step #2: Call xcrpc service
            const kvService = new ApiKVStore(this._apiClient);
            const response = await kvService.lookup(request);

            // Step #3: Parse xcrpc service response
            const value:Value = {
                value: response.getValue().getText()
            }
            return value;
        } catch (e) {
            this._parseError(e, "lookup");
            return null;
        }
    }

    // This will be replaced by multiAddOrReplace
    // But multiAddOrReplace doesn't support global scope for now
    public async addOrReplace(param: {
        key: string, value: string, persist: boolean, kvScope: number,
        scopeInfo?: KvScopeInfo
    }):Promise<void> {
        try {
            const {key, value, persist, kvScope, scopeInfo} = param;

            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(key);

            const scope = createScopeMessage({scope: kvScope, scopeInfo:scopeInfo});
            scopeKey.setScope(scope);

            const keyValue = new ProtoTypes.KvStore.KeyValue();
            keyValue.setText(value);

            const request = new ProtoTypes.KvStore.AddOrReplaceRequest();
            request.setKey(scopeKey);
            request.setPersist(persist);
            request.setValue(keyValue);

            const kvService = new ApiKVStore(this._apiClient);
            await kvService.addOrReplace(request);
        } catch (e) {
            this._parseError(e, "addOrReplace");
        }
    }

    /**
     * Add/Replace multiple keys.
     * !!! It doesn't support global scope for now !!!
     * @param param
     */
    public async multiAddOrReplace(param: {
        kvMap: Map<string, string>, persist: boolean,
        kvScope: number, scopeInfo?: KvScopeInfo
    }): Promise<void> {
        try {
            // Destruct arguments
            const { kvMap, persist, kvScope, scopeInfo } = param;
            const keyList: Array<string> = [];
            const valueList: Array<string> = [];
            kvMap.forEach((value, key) => {
                keyList.push(key);
                valueList.push(value);
            });

            // Limitation: only support wb scope for now, should be removed later
            if (kvScope === KVSCOPE.GLOBAL) {
                throw new Error('global scope multiAddOrReplace not supported');
            }

            // Create reqeust object
            const request = new ProtoTypes.KvStore.MultiAddOrReplaceRequest();
            request.setKeysList(keyList);
            request.setValuesList(valueList.map((value) => {
                const vObj = new ProtoTypes.KvStore.KeyValue();
                vObj.setText(value);
                return vObj;
            }));
            request.setPersist(persist);
            request.setScope(createScopeMessage({
                scope: kvScope, scopeInfo: scopeInfo
            }));

            // Call the service api
            const kvService = new ApiKVStore(this._apiClient);
            await kvService.multiAddOrReplace(request);
        } catch(e) {
            this._parseError(e, 'multiAddOrReplace');
        }
    }

    public async deleteKey(param:{
        keyName: string, kvScope: number, scopeInfo?: KvScopeInfo
    }): Promise<void> {
        try {
            const { keyName, kvScope, scopeInfo } = param;
            // Step #1: Construct xcrpc service input
            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(keyName);

            const scope = createScopeMessage({scope: kvScope, scopeInfo:scopeInfo});
            scopeKey.setScope(scope);

            const request = new ProtoTypes.KvStore.DeleteKeyRequest();
            request.setKey(scopeKey);

            const kvService = new ApiKVStore(this._apiClient);
            await kvService.deleteKey(request);
        } catch (e) {
            this._parseError(e, "deleteKey");
        }
    }


    public async append(
        param:{
            keyName: string,
            kvScope: number,
            scopeInfo?: KvScopeInfo,
            persist:boolean,
            kvSuffix: string
        }
    ) : Promise<void>
    {
        try {
            const { keyName, kvScope, scopeInfo, kvSuffix} = param;
            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(keyName);

            const scope = createScopeMessage({scope: kvScope, scopeInfo:scopeInfo});
            const request = new ProtoTypes.KvStore.AppendRequest();
            scopeKey.setScope(scope);
            request.setKey(scopeKey);
            request.setSuffix(kvSuffix);

            const kvService = new ApiKVStore(this._apiClient);
            await kvService.append(request);
        } catch(e) {
            this._parseError(e, "append");
            try {
                const { keyName, kvScope, scopeInfo,persist,kvSuffix} = param;
                await this.addOrReplace({key: keyName, value: kvSuffix, persist: persist,
                    kvScope: kvScope, scopeInfo: scopeInfo});
            } catch(e) {
                this._parseError(e, "addOrReplace")
            }
        }
    }


    public async setIfEqual (params: {kvScope: number, scopeInfo?: KvScopeInfo,
        persist:boolean, countSecondaryPairs: number, kvKeyCompare: string, kvValueCompare: string, kvValueReplace: string, kvKeySecondary: string,
        kvValueSecondary: string}): Promise<{noKV:boolean}>{
            try {
                const {kvScope, scopeInfo, persist, countSecondaryPairs, kvKeyCompare, kvValueCompare, kvValueReplace, kvKeySecondary,
                    kvValueSecondary} = params

                const scope = createScopeMessage({scope: kvScope, scopeInfo:scopeInfo});
                const request = new ProtoTypes.KvStore.SetIfEqualRequest()
                request.setScope(scope);
                request.setPersist(persist);
                request.setCountSecondaryPairs(countSecondaryPairs);
                request.setKeyCompare(kvKeyCompare);
                request.setValueCompare(kvValueCompare);
                request.setValueReplace(kvValueReplace);
                request.setKeySecondary(kvKeySecondary);
                request.setValueSecondary(kvValueSecondary);

                const kvService = new ApiKVStore(this._apiClient);
                await kvService.setIfEqual(request);
                return {noKV:false};
            } catch (e) {
                this._parseError(e, "setIfEqual")
                return {noKV:true};
            }

    }

    public async list (param:{kvScope: number, scopeInfo?: KvScopeInfo,
        kvKeyRegex: string}) : Promise<keyListResponse>
    {
        try {
            const {kvScope, scopeInfo, kvKeyRegex} = param;
            const scope = createScopeMessage({scope: kvScope, scopeInfo:scopeInfo});

            const request = new ProtoTypes.KvStore.ListRequest();
            request.setScope(scope);
            request.setKeyRegex(kvKeyRegex);

            const kvService = new ApiKVStore(this._apiClient);
            const response = await kvService.list(request);

            const keys = response.getKeysList();
            const keysList: keyListResponse = {
                numKeys : keys.length,
                keys: keys
            }
            return keysList;
        } catch(e) {
            this._parseError(e, "list");
            return null;
        }
    }

    private _parseError(error:any, method:string):void {
        switch(method) {
            case "lookup":
            case "deleteKey":
            case "setIfEqual": {
                if (error.status === ProtoTypes.XcalarEnumType.Status.STATUS_KV_ENTRY_NOT_FOUND) {
                    // console.warn("Status", error.error, "Key, not found");
                    return;
                } else if (error.status === ProtoTypes.XcalarEnumType.Status.STATUS_KV_STORE_NOT_FOUND) {
                    // console.warn(error.error, "kvStore, not found");
                    return;
                }
                break;
            }
            case "append": {
                if (error.status === ProtoTypes.XcalarEnumType.Status.STATUS_KV_ENTRY_NOT_FOUND ||
                    error.status === ProtoTypes.XcalarEnumType.Status.STATUS_KV_STORE_NOT_FOUND)
                {
                    // console.info("Append fails as key or kvStore not found, put key instead");
                    return;
                }
                break;
            }
        }
        throw parseError(error);
    }
}

type Value = {
    value: string
};

type keyListResponse = {
    numKeys: number,
    keys: Array<string>
};

export {
    KVStoreService,
    KvScopeInfo as ScopeInfo,
    KVSCOPE,
    Value,
    keyListResponse
};
