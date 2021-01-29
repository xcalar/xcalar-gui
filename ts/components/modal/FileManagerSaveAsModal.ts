class FileManagerSaveAsModal {
    private static _instance: FileManagerSaveAsModal;

    public static get Instance(): FileManagerSaveAsModal {
        return this._instance || (this._instance = new this());
    }

    private modalHelper: ModalHelper;
    private fileManagerPanel: FileManagerPanel;
    private options: {
        onSave?: (newPath: string) => void;
    };

    private constructor() {
        const $modal: JQuery = this._getModal();
        this.modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this.fileManagerPanel = new FileManagerPanel(this._getModal());
        UDFFileManager.Instance.registerPanel(this.fileManagerPanel);
        this.fileManagerPanel.lock();
        this._getModal()
        .find(".fileManager .addressBox input")
        .prop("disabled", true);
        this._addEventListeners();
    }

    public show(
        title: string,
        filename: string,
        path: string,
        options: {
            onSave?: (newPath: string) => void;
        }
    ): void {
        this.options = options;
        this._getModalTitile().text(title);
        this._getNameInput().val(filename);
        this.fileManagerPanel.switchPathByStep(path, true);
        this.modalHelper.setup().then(() => {
            this._getNameInput().selectAll();
            this._getNameInput().range(
                0,
                filename.length - this.fileManagerPanel.fileExtension().length
            );
        });
    }

    private _addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".save", () => {
            this._submitForm();
        });

        $modal.on(
            "mousedown",
            ".mainSection .field",
            (event: JQueryEventObject) => {
                const $row: JQuery = $(event.currentTarget).parent();
                const filename: string = $row.find(".nameField .label").text();
                if (!this.fileManagerPanel.isDir(filename)) {
                    this._getNameInput().val(filename);
                }
            }
        );
    }

    private _getModal(): JQuery {
        return $("#fileManagerSaveAsModal");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find(".saveAs input");
    }

    private _getModalTitile(): JQuery {
        return this._getModal().find(".modalHeader .text");
    }

    private _close(): void {
        this.modalHelper.clear();
        this.options = null;
        this._getNameInput().val("");
    }

    protected _submitForm(): void {
        if (typeof this.options.onSave === "function") {
            let path: string = this.fileManagerPanel.getViewPath();
            const $pressed: JQuery = this._getModal().find(
                ".mainSection .pressed"
            );
            if ($pressed.length === 1) {
                const folderName: string = $pressed
                .find(".nameField .label")
                .text();
                if (this.fileManagerPanel.isDir(folderName)) {
                    path += folderName + "/";
                }
            }
            let newFilename: string = this._getNameInput().val();
            newFilename = this.fileManagerPanel.autoRename(newFilename);
            let newPath = path + newFilename;
            const $saveButton: JQuery = this._getModal().find(
                ".modalBottom .save"
            );

            const fileExtension: string = this.fileManagerPanel.fileExtension();
            if (!newPath.endsWith(fileExtension)) {
                newPath += fileExtension;
            }
            if (
                !this.fileManagerPanel.canAdd(
                    newPath,
                    this._getNameInput(),
                    $saveButton
                )
            ) {
                return;
            }

            const saveFile = () => {
                this.options.onSave(newPath);
                this._close();
            };
            if (
                this.fileManagerPanel.getViewNode().children.has(newFilename)
            ) {
                Alert.show({
                    title: FileManagerTStr.ReplaceTitle,
                    msg: newFilename + " " + FileManagerTStr.ReplaceMsg,
                    onConfirm: () => {
                        saveFile();
                    }
                });
            } else {
                saveFile();
            }
        }
    }
}
