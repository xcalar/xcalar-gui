namespace CloudFileBrowser {
    let uploader: DragDropUploader;
    /**
     * CloudFileBrowser.setup
     */
    export function setup(): void {
        _addEventListeners();
    }

    /**
     * CloudFileBrowser.show
     */
    export function show(restore: boolean, path: string): void {
        this.clear(); // necessary to reset first
        let targetName = DSTargetManager.getS3Connector();
        let options = {
            cloud: true,
            backCB: () => DSForm.show()
        };
        FileBrowser.show(targetName, path, restore, options);
        _getFileBrowser().addClass("cloud");
        $("#fileBrowserPath .text").attr("readonly", "readonly");
        uploader.toggle(true);
    }

    /**
     * CloudFileBrowser.getCloudPath
     * @param path
     */
    export function getCloudPath(): XDPromise<string> {
        let deferred: XDDeferred<string> = PromiseHelper.deferred();
        CloudManager.Instance.getS3BucketInfo()
        .then((res) => {
            let path: string = "/" + res.bucket + "/";
            deferred.resolve(path);
        })
        .fail((e) => {
            console.error(e);
            deferred.reject();
        });

        return deferred.promise();
    }

    /**
     * CloudFileBrowser.clear
     */
    export function clear(): void {
        uploader.toggle(false);
        _getFileBrowser().removeClass("cloud");
        $("#fileBrowserPath .text").removeAttr("readonly");
    }

    function _getFileBrowser(): JQuery {
        return $("#fileBrowser");
    }

    function _overwriteCheck(fileName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (FileBrowser.hasFile(fileName)) {
            Alert.show({
                "title": "Overwriting file",
                "msg": `File "${fileName}" alredy exists, do you want to overwrite it?`,
                "onConfirm": () => deferred.resolve(),
                "onCancel": () => deferred.reject()
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function _uploadFile(file?: File, callback?: Function, customOverwriteCheck?: Function): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let fileName: string = file.name.replace(/C:\\fakepath\\/i, '').trim();
        if (fileName.endsWith(".xlsx")) {
            _handleUploadError("Upload xlsx file is not supported in this version, please convert the file to CSV.");
            return PromiseHelper.reject();
        }
        if (file.size && (file.size / GB) > 4) {
            _handleUploadError("Please ensure your file is under 4GB.");
            return PromiseHelper.reject();
        }
        let isChecking: boolean = true;
        const overwriteCheck = customOverwriteCheck || _overwriteCheck;
        overwriteCheck(fileName)
        .then(() => {
            isChecking = false;
            FileBrowser.addFileToUpload(fileName);
            if (callback) {
                callback(fileName);
            }
            return CloudManager.Instance.uploadToS3(fileName, file);
        })
        .then(() => {
            FileBrowser.refresh();
            deferred.resolve();
        })
        .fail((error) => {
            if (!isChecking) {
                FileBrowser.removeFileToUpload(fileName);
                FileBrowser.refresh();
                console.error(error);
                _handleUploadError("Upload file failed: " + error);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }
    export function uploadFile(file, callback, customOverwriteCheck) {
        return _uploadFile(file, callback, customOverwriteCheck);
    }

    function _handleUploadError(error: string): void {
        Alert.error("Upload file failed", error);
    }

    function _addEventListeners(): void {
        let $section = _getFileBrowser();
        let $uploadInput = $("#dsForm-source-upload");

        $section.find(".cloudUploadSection .upload").click(() => {
            $uploadInput.click();
        });

        $uploadInput.change(() => {
            if ($uploadInput.val() !== "") {
                let file = (<HTMLInputElement>$uploadInput[0]).files[0];
                _uploadFile(file)
                .always(() => {
                    $uploadInput.val("");
                });
            }
        });

        uploader = new DragDropUploader({
            $container: $section,
            text: "Drop a file to upload",
            onDrop: (file) => {
                if (!_getFileBrowser().hasClass("errorMode")) {
                    _uploadFile(file);
                }
            },
            onError: (error) => {
                switch (error) {
                    case ('invalidFolder'):
                        Alert.error(UploadTStr.InvalidUpload,
                                    UploadTStr.InvalidFolderDesc);
                        break;
                    case ('multipleFiles'):
                        Alert.show({
                            title: UploadTStr.InvalidUpload,
                            msg: UploadTStr.OneFileUpload
                        });
                        break;
                    default:
                        break;
                }
            }
        });
    }
}