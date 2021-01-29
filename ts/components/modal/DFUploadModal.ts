class DFUploadModal {
    private static _instance: DFUploadModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _file: File;
    private _modalHelper: ModalHelper;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
        this._setupDragDrop();
    }

    public show(): void {
        this._modalHelper.setup();
    }

    private _getModal(): JQuery {
        return $("#dfUploadModal");
    }

    private _getDestPathInput(): JQuery {
        return this._getModal().find(".dest .path");
    }

    private _getBrowseButton(): JQuery {
        return this._getModal().find(".source input.browse");
    }

    private _close(): void {
        const $modal: JQuery = this._getModal();
        this._modalHelper.clear();
        this._file = null;
        $modal.find("input").val("");
        $modal.find(".confirm").addClass("btn-disabled");
        $modal.find(".checkbox").removeClass("checked");
        xcTooltip.enable($modal.find(".buttonTooltipWrap"));
    }

    private _validate(): {
        tab: DagTab
    } {
        const $pathInput: JQuery = this._getDestPathInput();
        let path: string = this._getDestPath();

        let uploadTab: DagTabUser = new DagTabUser({
            name: path,
            createdTime: xcTimeHelper.now()
        });
        let shortName: string = uploadTab.getName();

        const isValid: boolean = xcHelper.validate([{
            $ele: $pathInput
        }, {
            $ele: $pathInput,
            error: DFTStr.NoEmptyDestName,
            check: () => {
                return !shortName;
            }
        },
        {
            $ele: $pathInput,
            error: DFTStr.NoSlashUpload,
            check: () => {
                return shortName.includes("/");
            }
        },{
            $ele: $pathInput,
            error: ErrTStr.DFNameIllegal,
            check: () => {
                let category = PatternCategory.Dataflow;
                return !xcHelper.checkNamePattern(category, PatternAction.Check, shortName);
            }
        }, {
            $ele: $pathInput,
            error: DFTStr.DupDataflowName,
            check: () => {
                return !DagList.Instance.isUniqueName(uploadTab.getName(), null);
            }
        }])

        if (!isValid) {
            return null;
        }
        return {
            tab: <DagTab>uploadTab
        };
    }

    protected _submitForm(): XDPromise<void> {
        const $confirmBtn: JQuery = this._getModal().find(".confirm");
        if ($confirmBtn.hasClass("btn-disabled")) {
            return PromiseHelper.reject();
        }

        const res = this._validate();
        if (res == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        xcUIHelper.disableSubmit($confirmBtn);

        const tab: DagTab = res.tab;
        const file: File = this._file;
        const overwriteUDF: boolean = this._getModal().find(".overwrite .checkboxSection")
        .find(".checkbox").hasClass("checked");
        let restoreDS: boolean = this._getModal().find(".restoreDS .checkboxSection").find(".checkbox").hasClass("checked");
        let resultTab: DagTab = null;
        let timer: number = null;

        this._checkFileSize(file)
        .then(() => {
            timer = window.setTimeout(() => {
                this._lock();
            }, 1000);
            return this._readFile(file);
        })
        .then((fileContent) => {
            return tab.upload(fileContent, overwriteUDF);
        })
        .then(({tabUploaded, alertOption}) => {
            resultTab = tabUploaded;

            if (alertOption != null) {
                // error case;
                this._submitDone(resultTab);
                Alert.show(alertOption);
                deferred.reject();
            } else {
                if (resultTab instanceof DagTabSQLFunc) {
                    restoreDS = false;
                }
                if (restoreDS) {
                    this._restoreSource(resultTab);
                }
                xcUIHelper.showSuccess(SuccessTStr.Upload);
                this._submitDone(resultTab);
                deferred.resolve();
            }
        })
        .fail((error, cancel) => {
            try {
                if (!cancel) {
                    if (this._file && !this._file.name.includes(gDFSuffixFirst)) {
                        error.error += ". " + DFTStr.InvalidUploadExt;
                    }
                    StatusBox.show(error.error, $confirmBtn, false, {
                        detail: error.log
                    });
                }
            } catch (e) {
                console.error(e);
            }
            deferred.reject(error);
        })
        .always(() => {
            clearTimeout(timer);
            this._unlock();
            xcUIHelper.enableSubmit($confirmBtn);
        });

        return deferred.promise();
    }

    private _submitDone(tab: DagTab): void {
        this._close();
        DagList.Instance.addDag(tab);
        DagTabManager.Instance.loadTab(tab, true);
    }

    private _lock() {
        this._getModal().addClass("locked");
    }

    private _unlock() {
        this._getModal().removeClass("locked");
    }

    // XXX TODO: generalize the file uploader of this one and the one
    // in workbookPanel.ts
    private _checkFileSize(file: File): XDPromise<void> {
        if (file == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const size: number = file.size;
        const sizeLimit: number = 5 * MB; // 5MB
        if (size <= sizeLimit) {
            deferred.resolve();
        } else {
            const msg: string = xcStringHelper.replaceMsg(ErrWRepTStr.LargeFileUpload, {
                size: xcHelper.sizeTranslator(sizeLimit)
            });
            Alert.show({
                title: null,
                msg: msg,
                onConfirm: deferred.resolve,
                onCancel: function() {
                    deferred.reject(null, true);
                }
            });
        }
        return  deferred.promise();
    }

    // XXX TODO: generalize the file uploader of this one and the one
    // in workbookManager.ts
    private _readFile(file: File): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred(); //string or array buffer
        try {
            const reader: FileReader = new FileReader();

            reader.onload = function(event: any) {
                deferred.resolve(event.target.result);
            };

            reader.onloadend = function(event: any) {
                const error: DOMException = event.target.error;
                if (error != null) {
                    deferred.reject(error);
                }
            };

            reader.readAsBinaryString(file);
        } catch (e) {
            console.error(e);
            deferred.reject({"error": e.message});
        }

        return deferred.promise();
    }

    private _restoreSource(tab: DagTab): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        tab.load()
        .then(() => {
            const graph: DagGraph = tab.getGraph();
            const tableNodes: DagNodeIMDTable[] = [];
            graph.getAllNodes().forEach((dagNode: DagNode) => {
                if (dagNode instanceof DagNodeIMDTable) {
                    tableNodes.push(dagNode);
                }
            });
            const promises: XDPromise<any>[] = tableNodes.map((node) => {
                const promise = PTblManager.Instance.restoreTableFromNode(node);
                return PromiseHelper.convertToJQuery(promise);
            });
            return PromiseHelper.when(...promises);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _addEventListeners() {
        const $modal: JQuery = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close();
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        // click source's browse button
        const $browseBtn: JQuery = this._getBrowseButton();
        $modal.find(".source button.browse").click((event) => {
            $(event.currentTarget).blur();
            $browseBtn.click();
            return false;
        });

        $modal.find(".source .path").mousedown(() => {
            $browseBtn.click();
            return false;
        });

        $modal.on("click", ".checkbox, .text", (event) => {
            let $checkboxSection = $(event.currentTarget).closest(".checkboxSection");
            let $checkbox = $checkboxSection.find(".checkbox");
            $checkbox.toggleClass("checked");
        });

        // display the chosen file's path
        // NOTE: the .change event fires for chrome for both cancel and select
        // but cancel doesn't necessarily fire the .change event on other
        // browsers
        $browseBtn.change((event) => {
            const path: string = $(event.currentTarget).val();
            if (path === "") {
                // This is the cancel button getting clicked. Don't do anything
                event.preventDefault();
                return;
            }
            this._changeFilePath(path);
        });
    }

    private _changeFilePath(path: string, fileInfo?: File) {
        path = path.replace(/C:\\fakepath\\/i, '');
        this._file = fileInfo || (<any>this._getBrowseButton()[0]).files[0];
        let fileName: string = path.substring(0, path.indexOf(".")).trim();
        const $modal: JQuery = this._getModal();
        const $sourcePathInput: JQuery = $modal.find(".source .path");
        $sourcePathInput.val(path);
        this._setDestPath(fileName);
        const $confirmBtn: JQuery = $modal.find(".confirm");
        const $tooltipWrap: JQuery = $modal.find(".buttonTooltipWrap");
        if (path.endsWith(".tar.gz")) {
            $confirmBtn.removeClass("btn-disabled");
            xcTooltip.disable($tooltipWrap);
        } else {
            $confirmBtn.addClass("btn-disabled");
            xcTooltip.enable($tooltipWrap);
            StatusBox.show(ErrTStr.RetinaFormat, $sourcePathInput, false, {
                side: "bottom"
            });
        }
    }

    private _getDestPath(): string {
        let $pathInput: JQuery = this._getDestPathInput();
        let path: string = $pathInput.val().trim();
        return path;
    }

    private _setDestPath(name: string): void {
        let category = PatternCategory.Dataflow;
        name = <string>xcHelper.checkNamePattern(category, PatternAction.Fix, name);
        const path: string = this._getUniquePath(name);
        this._getDestPathInput().val(path);
    }

    private _getUniquePath(name: string): string {
        let path: string = name;
        let cnt = 0;
        while (!DagList.Instance.isUniqueName(path, null)) {
            path = `${name}${++cnt}`;
        }
        return path;
    }

    private _setupDragDrop(): void {
        new DragDropUploader({
            $container: this._getModal(),
            text: `Drop a ${gDFSuffix} file to upload`,
            onDrop: (file) => {
                this._changeFilePath(file.name, file);
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
