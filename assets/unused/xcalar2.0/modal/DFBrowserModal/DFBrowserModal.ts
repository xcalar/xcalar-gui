class DFBrowserModal {
    private static _instance: DFBrowserModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private modalHelper: ModalHelper;
    private _fileLister: FileLister;
    private _options: {
        rootPath?: string,
        defaultPath?: string,
        onConfirm?: Function,
        onClose?: Function
    };

    private constructor() {
        const $modal: JQuery = this._getModal();
        this.modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._setupFileLister();
        this._addEventListeners();
    }

    public show(
        fileObjs: {path: string, id: string}[],
        options: {
            rootPath?: string,
            defaultPath?: string,
            onConfirm?: Function,
            onCancel?: Function
        },
    ): void {
        this.modalHelper.setup();
        this._options = options;
        this._setDefaultName(options.defaultPath);
        this._fileLister.setRootPath(options.rootPath);
        this._fileLister.setFileObj(fileObjs);
        this._fileLister.render();
    }

    private _getModal(): JQuery {
        return $("#dfBrowserModal");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find(".saveAs input");
    }

    private _close(): void {
        if (typeof this._options.onClose === "function") {
            this._options.onClose();
        }
        this.modalHelper.clear();
        this._options = null;
        this._getNameInput().val("");
    }

    private _submitForm(): void {
        if (typeof this._options.onConfirm === "function") {
            const path: string = this._fileLister.getCurrentPath();
            const saveAs: string = this._getNameInput().val();
            this._options.onConfirm(path, saveAs);
        }
        this._close();
    }

    private _setDefaultName(path: string = ""): void {
        const splits: string[] = path.split("/");
        if (splits.length > 0) {
            const name: string = splits[splits.length - 1];
            this._getNameInput().val(name || "");
        }
    }

    private _setupFileLister(): void {
        const renderTemplate = (
            files: {name: string, id: string}[],
            folders: string[]
        ): string => {
            let html: HTML = "";
            // Add folders
            folders.forEach((folder) => {
                html += '<li class="folderName">' +
                            '<i class="gridIcon icon xi-folder"></i>' +
                            '<div class="name">' + folder + '</div>' +
                        '</li>';
            });
            // Add files
            files.forEach((file) => {
                html +=
                '<li class="fileName">' +
                    '<i class="gridIcon icon xi-dfg2"></i>' +
                    '<div class="name">' + file.name + '</div>' +
                '</li>';
            });
            return html;
        };
        this._fileLister = new FileLister(this._getModal().find(".fileList"), {
            renderTemplate: renderTemplate
        });
    }

    private _addEventListeners(): void {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });

        $modal.find(".fileList").on("click", ".fileName", (event) => {
            const name: string = $(event.currentTarget).find(".name").text();
            this._getNameInput().val(name);
        });
    }
}