// Browser side (cloud.xcalar.com)
class CloudManager {
    private static _instance: CloudManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _apiUrl: string;
    private _s3Info: {bucket: string};

    public constructor() {}

    /**
     * CloudManager.Instance.setup
     */
    public setup(): XDPromise<void> {
        if (!XVM.isCloud()) {
            return PromiseHelper.resolve();
        }
        CloudFileBrowser.setup();
        this._removeNonCloudFeature();
        this.checkCloud();
        return this.setApiUrl()
        .then(() => {
            return this._sendRequest("s3/corsconfig", {});
        });
    }

    public setApiUrl(): XDPromise<void> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        xcHelper.sendRequest("GET", "/service/getApiUrl")
        .then((apiUrl) => {
            this._apiUrl = apiUrl;
            deferred.resolve();
        })
        .fail((e) => {
            console.error("Failed to set cloud api url.", e);
            // always resolve as cloud setup failure shouldn't block other components
            deferred.resolve();
        });
        return deferred.promise();
    }
    /**
     * CloudManager.Instance.getS3BucketInfo
     */
    public getS3BucketInfo(): XDPromise<{bucket: string}> {
        if (this._s3Info != null) {
            return PromiseHelper.resolve(this._s3Info);
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._sendRequest("s3/describe", {})
        .then((res: {bucketName: string}) => {
            this._s3Info = {
                bucket: res.bucketName
            };
            deferred.resolve(this._s3Info);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * CloudManager.Instance.uploadToS3
     * Upload a file to an S3 bucket
     * @param fileName the file's name
     * @param file file to upload
     */
    public uploadToS3(fileName: string, file: File): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._sendRequest("s3/uploadurl", {
            "fileName": fileName,
            "fields": {},
            "conditions": []
        })
        .then((res: {responseDict: {url: string, fields: any}}) => {
            return this._sendFormDataRequest(res.responseDict.url,
                                             res.responseDict.fields,
                                             file);
        })
        .then(deferred.resolve)
        .fail((err) => {
            console.error("S3 upload failed: ", err);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * CloudManager.Instance.deleteS3File
     * delete a file from s3 bucket
     * @param fileName
     */
    public deleteS3File(fileName: string): XDPromise<void> {
        return this._sendRequest("s3/delete", {
            "fileName": fileName
        });
    }

    public checkCloud(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!XVM.isCloud()) {
            return PromiseHelper.resolve();
        }
        xcHelper.sendRequest("GET", "/service/checkCloud")
        .then((ret) => {
            if (!ret || ret.status !== 0 || !ret.clusterUrl) {
                // deferred.resolve();return; // XXX temporary
                if (ret.error) {
                    deferred.reject(ret.error);
                } else {
                    deferred.reject("Cluster is not started.");
                }
            } else {
                XcUser.setClusterPrice(ret.clusterPrice);
                deferred.resolve();
            }
        })
        .fail((e) => {
            deferred.reject(e);
        });
        return deferred.promise();
    }

    private _removeNonCloudFeature(): void {
        $("#shellPanel").remove();
        $("#debugViewContainer .tab[data-tab=console]").remove();
    }

    // XXX TODO: check if the implementation is correct
    private _getUserName(): string {
        return XcUser.CurrentUser.getFullName();
    }

    private _sendRequest(action: string, payload: object): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const url: string = `${this._apiUrl}/${action}`;
        let responseStatus: number;
        payload = {
            "username": this._getUserName(),
            ...payload
        }

        let txId = Transaction.start({
            "operation": action,
            "sql": {"operation": action}
        });

        fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        })
        .then(res => {
            responseStatus = res.status;
            return res.json();
        })
        .then((res: any) => {
            // XXX TODO: use a enum instead of 0
            if (responseStatus === httpStatus.OK && res.status === 0) {
                deferred.resolve(res);
            } else {
                console.error("Send request action " + action + " failed:", res.error);
                deferred.reject(res.error);
            }
            Transaction.done(txId);
        })
        .catch((e) => {
            console.error("Send request action " + action + " failed:", e);
            deferred.reject(e);
            Transaction.fail(txId {
                noAlert: true,
                noNotification: true
            });
        });

        return deferred.promise();
    }

    private _sendFormDataRequest(
        url: string,
        fields: any,
        payload: any): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const formData = new FormData();
        Object.keys(fields).forEach(key => {
            formData.append(key, fields[key]);
        });
        formData.append("file", payload);
        fetch(url, {
            method: 'POST',
            mode: 'cors',
            body: formData,
        })
        .then(res => {
            if (res.status === httpStatus.NoContent) {
                deferred.resolve(res);
            } else {
                return res.text();
            }
        })
        .then((res) => {
            if(res) {
                let errorMsg: string;
                console.error("Send formData request action failed:", res);
                try {
                    const parser = new DOMParser();
                    errorMsg = parser.parseFromString(res,"text/xml")
                                .getElementsByTagName("Message")[0].innerHTML;
                } catch(e) {
                    errorMsg = res;
                }
                deferred.reject(errorMsg);
            }
        })
        .catch((e) => {
            deferred.reject(e);
        });

        return deferred.promise();
    }
}