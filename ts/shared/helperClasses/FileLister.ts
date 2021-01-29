class FileLister {
    private _fileObject: FileListerFolder; //Object holding all the datasets
    private _currentPath: string[];
    private _futurePath: string[];
    private _$section: JQuery;
    private _renderTemplate: (files: {name: string, id: string, options?: object}[], folders: string[], path?: string, sortKey?: string) => string;
    private _rootPath: string;
    private _sortKey: string;

    public constructor(
        $section: JQuery,
        options: {
            renderTemplate: (files: {name: string, id: string, options?: object}[], folders: string[], path?: string, sortKey?: string) => string,
            folderSingleClick?: boolean
        }
    ) {
        this._$section = $section;
        this._renderTemplate = options.renderTemplate;
        this._sortKey = undefined;
        this.setRootPath(null);
        this._resetPath();
        this._addEventListeners(options);
    }

    /**
     * Set the root path to show
     * @param rootPath
     */
    public setRootPath(rootPath: string): void {
        this._rootPath = rootPath || DSTStr.Home;
    }

    public getRootPath(): string {
        return this._rootPath;
    }

    /**
     * Set the file info to list
     * if the path represent a folder, do {path: /folderPath/, id: null}
     * @param fileList
     */
    public setFileObj(fileList: {path: string, id: string, options?: object}[]): void {
        this._fileObject = { folders:{}, files: [] };
        for (let i = 0; i < fileList.length; i++) {
            let obj: FileListerFolder = this._fileObject;
            const path: string = fileList[i].path;
            const splitPath: string[] = path.split("/");
            const splen: number = splitPath.length;
            for (let j = 1; j < splen - 1; j++) {
                if (obj.folders[splitPath[j]] == null) {
                    obj.folders[splitPath[j]] = {folders: {}, files: []};
                }
                obj = obj.folders[splitPath[j]];
            }
            if (splitPath[splen - 1] && fileList[i].id) {
                // when it's not a folder
                obj.files.push({
                    name: splitPath[splen - 1],
                    id: fileList[i].id,
                    options: fileList[i].options
                });
            }
        }
    }

    /**
     * Redner the file lister UI
     */
    public render(): void {
        this._resetPath();
        return this._render();
    }

    /**
     * Get the current folder's path
     */
    public getCurrentPath(): string {
        return this._currentPath.join("/");
    }

    /**
     * Go to the root path and re-render
     */
    public goToRootPath(): void {
        this._resetPath();
        this._render();
    }

    /**
     * Go to a path and re-render
     * @param path
     */
    public goToPath(path: string, ignoreError: boolean = false): void {
        this._currentPath = [];
        this._futurePath = [];
        let splitPath: string[] = path.split('/');
        for (let i = 1; i < splitPath.length - 1; i++) {
            this._currentPath.push(splitPath[i]);
        }
        if (this._currentPath.length > 0) {
            this._getBackBtn().removeClass('xc-disabled');
        } else {
            this._getBackBtn().addClass('xc-disabled');
        }
        this._render(ignoreError);
    }

    private _verifyPath(ignoreError: boolean): void {
        const pathLen: number = this._currentPath.length;
        let curObj: FileListerFolder = this._fileObject;
        for (let i = 0; i < pathLen; i++) {
            const currentPath: string = this._currentPath[i];
            if (currentPath != "" && curObj.folders[currentPath] == null) {
                // path no longer exists
                this._currentPath = this._currentPath.slice(0, i);
                if (!ignoreError) {
                    StatusBox.show("Folder does not exist: " + currentPath,
                    this._$section.find(".pathSection .path"));
                }
                break;
            }
            curObj = curObj.folders[currentPath];
        }
    }

    private _render(ignoreError: boolean = false): void {
        if (this._fileObject == null) {
            return;
        }
        this._renderSortSection(this._sortKey);
        this._verifyPath(ignoreError);
        const pathLen: number = this._currentPath.length;
        let curObj: FileListerFolder = this._fileObject;
        let path: string = "";
        let fullPath: string = "/";
        if (pathLen === 0) {
            path = this._rootPath + " /";
        } else {
            path = '<span class="path" data-path="/">' +
                        this._rootPath +
                    '</span>' + ' / ';
        }
        // Wind down the path
        for (let i = 0; i < pathLen; i++) {
            const currentPath: string = this._currentPath[i];
            fullPath += currentPath + "/";
            // Only show the last two
            if (i < pathLen - 2) {
                path += '...' + ' / ';
            } else if (i !== pathLen - 1) {
                path += '<span class="path" data-path="' + fullPath + '">' +
                            currentPath +
                        '</span>' + ' / ';
            } else {
                path += currentPath + ' /';
            }
            curObj = curObj.folders[currentPath];
        }
        if (curObj == null && pathLen > 0) {
            // when currentPath has nothing
            this.goToPath(this._rootPath);
        } else {
            const folders: string[] = Object.keys(curObj.folders);
            const currentPath = this.getCurrentPath();
            const html: HTML = this._renderTemplate(curObj.files, folders, currentPath, this._sortKey);
            this._$section.find(".pathSection .path").html(path);
            this._$section.find(".listView ul").html(html);
        }
    }

    private _resetPath(): void {
        this._currentPath = [];
        this._futurePath = [];
        this._getForwardBtn().addClass("xc-disabled");
        this._getBackBtn().addClass("xc-disabled");
    }

    private _setSortKey(key: string): void {
        if (this._sortKey === key) {
            return;
        }
        this._sortKey = (key === "none")? undefined : key;
        this._render(true);
    }

    private _renderSortSection(key: string = "none"): void {
        let $sortSection = this._$section.find(".sortSection");
        $sortSection.find(".sortOption.key").removeClass("key");
        $sortSection.find(`.sortOption[data-key="${key}"]`).addClass("key");
    }

    private _addEventListeners(options): void {
        const $listSection = this._$section.find(".listView ul");
        const self = this;
        let folderClick = "dblclick";
        if (options.folderSingleClick) {
            folderClick = "click";
        }
        // enter a folder
        $listSection.on(folderClick, ".folderName", function() {
            self._currentPath.push($(this).text());
            self._futurePath = [];
            self._render();
            self._getForwardBtn().addClass('xc-disabled');
            self._getBackBtn().removeClass('xc-disabled');
        });

        this._getBackBtn().click(() => {
            this._futurePath.push(this._currentPath.pop());
            this._render();
            this._getForwardBtn().removeClass('xc-disabled');
            if (this._currentPath.length == 0) {
                this._getBackBtn().addClass('xc-disabled');
            }
        });

        this._getForwardBtn().click(() => {
            this._currentPath.push(this._futurePath.pop());
            this._getBackBtn().removeClass('xc-disabled');
            this._render();
            if (this._futurePath.length == 0) {
                this._getForwardBtn().addClass('xc-disabled');
            }
        });

        this._$section.find(".pathSection").on("click", ".path span", (e) => {
            const path = $(e.currentTarget).data("path");
            this.goToPath(path);
        });

        this._$section.find(".sortSection").on("click", ".sortOption", (e) => {
            let key = $(e.currentTarget).data("key");
            this._setSortKey(key);
        });
    }

    private _getForwardBtn(): JQuery {
        return this._$section.find(".forwardFolderBtn");
    }

    private _getBackBtn(): JQuery {
        return this._$section.find(".backFolderBtn");
    }
}