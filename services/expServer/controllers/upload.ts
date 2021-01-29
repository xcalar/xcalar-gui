import * as fs from "fs";
import * as xcConsole from "../utils/expServerXcConsole";
import { exec, ChildProcess } from "child_process";
import { Status } from "../utils/supportStatusFile";

interface S3Param {
    Bucket: string,
    Key: string,
    Body?: any
}

class UploadManager {
    private static _instance = null;
    public static get getInstance(): UploadManager {
        return this._instance || (this._instance = new this());
    }

    private getRandomInt(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    // Promise wrappers for exec and fs.writeFile
    private execPromise(command: string, options?: any): Promise<void> {
        let deferred: any = jQuery.Deferred();

        exec(command, options, function(err) {
            if (err) {
                deferred.reject({"status": Status.Error, "logs": err});
            } else {
                deferred.resolve();
            }
        });

        return deferred.promise();
    }

    private writeFilePromise(filePath: fs.PathLike | number,
        data: any): Promise<void> {
        let deferred: any = jQuery.Deferred();
        fs.writeFile(filePath, data, function(err) {
            if (err) {
                deferred.reject({"status": Status.Error, "logs": err});
            } else {
                deferred.resolve();
            }
        });

        return deferred.promise();
    }

    uploadContent(req: any, res): Promise<any> {
        let deferred: any = jQuery.Deferred();
        let awsTmp: any = require('aws-sdk');
        let s3Tmp: any = new awsTmp.S3({
            "accessKeyId": "AKIAIMI35A6P3BFJTDEQ",
            "secretAccessKey": "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"
        });

        let tmpPrefix: string = "/tmp/app" + this.getRandomInt(0, 1000) + "/";
        this.deleteFolderRecursive(tmpPrefix);
        xcConsole.log("Deleted local " + tmpPrefix);
        let name: string = req.body.name;
        let version: string = req.body.version;
        let jsFileText: string = req.body.jsFileText;
        let jsFilePath: string = req.body.jsFilePath;
        let jsFileName: string = name + '.ext.js';
        let jsFileObj: boolean = req.body.jsFileObj;
        let pyFileText: string = req.body.pyFileText;
        let pyFilePath: string = req.body.pyFilePath;
        let pyFileName: string = name + '.ext.py';
        let pyFileObj: boolean = req.body.pyFileObj;

        this.create(tmpPrefix)
        .then((): Promise<any> => {
            let jsPromise;
            let pyPromise;

            // Prefer file upload over file path if both are provided
            if (jsFileObj) {
                jsPromise = this.writeFilePromise(tmpPrefix + jsFileName,
                                jsFileText);
            } else {
                let copyJsFile = "cp " + jsFilePath + " " + tmpPrefix +
                                    jsFileName;
                jsPromise = this.execPromise(copyJsFile);
            }

            if (pyFileObj) {
                pyPromise = this.writeFilePromise(tmpPrefix + pyFileName,
                                                    pyFileText);
            } else {
                let copyPyFile = "cp " + pyFilePath + " " + tmpPrefix +
                                    pyFileName;
                pyPromise = this.execPromise(copyPyFile);
            }

            return jQuery.when(jsPromise, pyPromise);
        })
        .then((): Promise<number> => {
            return this.gzipAndUpload(name, version, tmpPrefix, s3Tmp);
        })
        .then((): Promise<any> => {
            return this.uploadMeta(req, res, s3Tmp);
        })
        .then((data): void => {
            deferred.resolve(data);
        })
        .fail((error): void => {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    private gzipAndUpload(name: string, version: string, tmpPrefix: string,
        s3Tmp: any): Promise<number> {
        let tmpTarGz: string = tmpPrefix+"tmp.tar.gz";
        let deferred: any = jQuery.Deferred();
        this.gzip(tmpTarGz, tmpPrefix)
        .then((): void => {
            xcConsole.log("Succeeded to tar");
            fs.readFile(tmpTarGz, (err: any, data) => {
                this.upload('extensions/' + name + "/" + version + "/" + name +
                    '-' + version + '.tar.gz', data, s3Tmp)
                .then(() => {
                    xcConsole.log("Uploaded .tar.gz");
                    this.deleteFolderRecursive(tmpPrefix);
                    xcConsole.log("Deleted local " + tmpPrefix);
                    deferred.resolve(Status.Done);
                });
            });
        });
        return deferred.promise();
    }

    private deleteFolderRecursive(path: fs.PathLike): void {
        if (fs.existsSync(path) ) {
            fs.readdirSync(path).forEach((file: fs.PathLike): void => {
                let curPath: fs.PathLike = path + "/" + file;
                if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    this.deleteFolderRecursive(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(path);
        }
    }

    private create(dir: fs.PathLike): Promise<void> {
        let deferred: any = jQuery.Deferred();
        fs.access(dir, (err) => {
            if (err) {
                fs.mkdirSync(dir);
                deferred.resolve();
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    private gzip(fileName: string, tmpPrefix: string): Promise<number> {
        let deferred: any = jQuery.Deferred();
        let execString: string = "tar -czf " + fileName + " -C " + tmpPrefix +
            " . --exclude \"*.tar.gz\" --warning=no-file-changed";
        let out: ChildProcess = exec(execString);

        out.on('close', (code: number): void => {
            // code(1) means files were changed while being archived
            if (code === 0 || code === 1) {
                xcConsole.log("Success: tar gz");
                deferred.resolve(Status.Done);
            } else {
                xcConsole.log("Failure: tar gz with code " + code);
                deferred.reject();
            }
        });
        return deferred.promise();
    }

    uploadMeta(req: any, res: any, s3Tmp: any): Promise<any> {

        let name: string = req.body.name;
        let version: string = req.body.version;
        let imageUrl: string = req.body.imageUrl;
        let description: string = req.body.description;
        let main: string = req.body.main;
        let repository_type: string = req.body.repository_type;
        let repository_url: string = req.body.repository_url;
        let author: string = req.body.author;
        let category: string = req.body.category;
        let website: string = req.body.website;
        let imagePath: string = req.body.imgPath;
        let imageBinary: any = req.body.imgBinary;
        let dataToSend: any = {
            "appName": name,
            "version": version,
            "description": description,
            "main": main,
            "repository_type": repository_type,
            "repository_url": repository_url,
            "author": author,
            "category": category,
            "imageUrl": imageUrl,
            "website": website,
            "image": ""
        };

        let file: string = 'extensions/'+name+"/"+version+"/"+name+'.txt';
        let image: string;
        // Prefer file upload over file path if both are provided
        if (imageBinary) {
            dataToSend.image = imageBinary;
            return this.upload(file, JSON.stringify(dataToSend), s3Tmp);
        } else {
            let deferred: any = jQuery.Deferred();
            fs.readFile(imagePath, (err, data) => {
                if (err) {
                    deferred.reject({"status": Status.Error, "logs": err});
                } else {
                    image = data.toString("base64");
                    dataToSend.image = image;
                    this.upload(file, JSON.stringify(dataToSend), s3Tmp)
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                }
            });
            return deferred.promise();
        }
    }

    private upload(file: string, content: any, s3Tmp: any): Promise<any> {
        let deferred: any = jQuery.Deferred();
        let params: S3Param = {
            Bucket: 'marketplace.xcalar.com',
            Key: file,
            Body: content
        };
        s3Tmp.putObject(params, (err: any, data: any): void => {
            if (err) xcConsole.log(err); // an error occurred
            else {
                deferred.resolve(data);
            }
        });
        return deferred.promise();
    }
}

const upload = UploadManager.getInstance;
export default upload;