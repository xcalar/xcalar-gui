import * as xcConsole from "../utils/expServerXcConsole";
import { Status } from "../utils/supportStatusFile";

class TutorialManager {
    private static _instance = null;
    public static get getInstance(): TutorialManager{
        return this._instance || (this._instance = new this());
    }

    private _s3: any;

    private constructor() {
        try {
            let aws: any = require("aws-sdk");
            aws.config.update({
                accessKeyId: 'AKIAJIVAAB7VSKQBZ6VQ',
                secretAccessKey: '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',
                region: 'us-west-2'
            });
            // have to use var here
            this._s3 = new aws.S3();
        } catch (error) {
            this._s3 = {};
            xcConsole.error("Failure: set up AWS! " + error);
        }
    }

    s3Initialize(): boolean {
        return Boolean(this._s3);
    }

    downloadTutorial(tutName: string, version: string): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        let params = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Key: 'tutorials/' + tutName + "/" + version + "/" + tutName +
                '-' + version + '.xlrwb.tar.gz'
        };
        this._s3.getObject(params, (err, data) => {
            if (err) {
                let error = "Download tutorial failed with error: " + err;
                xcConsole.error(error);
                deferred.reject(error);
            } else {
                let ret = {
                    status: Status.Ok,
                    data: data.Body.toString('base64')
                };
                deferred.resolve(ret);
            }
        });
        return deferred.promise();
    }

    private processItem(ret: any[], fileName: string): XDPromise<any> {
        let deferredOnProcessItem: XDDeferred<any> = PromiseHelper.deferred();
        let getTutorial = function(file: string): XDPromise<string> {
            let deferredOnGetFile: XDDeferred<any> = PromiseHelper.deferred();
            let params = {
                Bucket: 'marketplace.xcalar.com', /* required */
                Key: file
            };
            let self = TutorialManager.getInstance;
            self._s3.getObject(params, (err, data) => {
                if (err) {
                    deferredOnGetFile.reject(err);
                } else {
                    deferredOnGetFile.resolve(data.Body.toString('utf8'));
                }
            });
            return deferredOnGetFile.promise();
        };
        if (fileName.endsWith(".txt")) {
            getTutorial(fileName)
            .then((data) => {
                ret.push(JSON.parse(data));
                deferredOnProcessItem.resolve("processItem succeeds");
            })
            .fail((err) => {
                deferredOnProcessItem.reject(err);
            });
        } else {
            deferredOnProcessItem.resolve("processItem succeeds");
        }
        return deferredOnProcessItem.promise();
    }

    fetchAllTutorials(): XDPromise<any> {
        let deferredOnFetch: XDDeferred<any> = PromiseHelper.deferred();
        let params = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Prefix: 'tutorials/'
        };
        let processItemsDeferred = [];
        this._s3.listObjects(params, (err, data) => {
            if (err) {
                xcConsole.error('fetch tutorials', err); // an error occurred
                deferredOnFetch.reject(err);
            } else {
                let ret = [];
                let items = data.Contents;
                items.forEach((item) => {
                    let fileName = item.Key;
                    processItemsDeferred.push(this.processItem(ret, fileName));
                });
                PromiseHelper.when(...processItemsDeferred)
                .then(() => {
                    deferredOnFetch.resolve(ret);
                })
                .fail((err) => {
                    xcConsole.error('fetch tutorials', JSON.stringify(arguments));
                    deferredOnFetch.reject(err);
                });
            }
        });
        return deferredOnFetch.promise();
    }
}

const tutorialManager = TutorialManager.getInstance;
export default tutorialManager;