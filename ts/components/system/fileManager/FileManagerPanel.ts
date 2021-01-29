class FileManagerPanel {
    private rootPathNode: FileManagerPathNode;
    private $panel: JQuery;
    private curFileType: string;
    private managers: Map<string, UDFFileManager>;
    private viewPathNode: FileManagerPathNode;
    private selectedPathNodes: Set<FileManagerPathNode>;
    private curHistoryNode: FileManagerHistoryNode;
    private savedPathNodes: Map<string, FileManagerPathNode>;
    private savedHistoryNodes: Map<string, FileManagerHistoryNode>;
    private locked: boolean;

    /**
     * Setup FileManager.
     * @param  {JQuery} $panel
     * @returns void
     */
    public constructor($panel: JQuery) {
        this.$panel = $panel;
        this.managers = new Map();
        this.rootPathNode = {
            pathName: null,
            isDir: null,
            timestamp: null,
            size: null,
            isSelected: null,
            sortBy: null,
            sortDescending: null,
            isSorted: false,
            parent: null,
            children: new Map()
        };

        this.selectedPathNodes = new Set();
        this.savedPathNodes = new Map();
        this.savedHistoryNodes = new Map();
        this.locked = false;

        this._addFileTypeAreaEvents();
        this._addNavigationAreaEvents();
        this._addAddressAreaEvents();
        this._addUploadEvents();
        this._addSearchBarEvents();
        this._addTitleSectionEvents();
        this._addActionAreaEvents();
        this._addMainSectionEvents();
    }

    /**
     * Common interface to send a list of files and dirs to the panel.
     * @param  {FileManagerPathItem[]} fileList
     * @param  {FileManagerPathItem[]} dirList
     * @param  {string} fileType
     * @param  {boolean} isDelete?
     * @returns void
     */
    public update(
        fileList: FileManagerPathItem[],
        dirList: FileManagerPathItem[],
        manager: UDFFileManager,
        isDelete: boolean
    ): void {
        this.managers.set(manager.fileType(), manager);
        this._buildPathTree(fileList, manager.fileType(), false);
        this._buildPathTree(dirList, manager.fileType(), true);
        if (isDelete) {
            this._cleanupPathTree(
                new Set(
                    fileList.map((value: FileManagerPathItem) => {
                        return value.pathName;
                    })
                ),
                new Set(
                    dirList.map((value: FileManagerPathItem) => {
                        return value.pathName;
                    })
                ),
                this.rootPathNode.children.get(manager.fileType())
            );
        }

        // This is the first update.
        if (this.viewPathNode == null) {
            this.curFileType = manager.fileType();
            this.viewPathNode = this.rootPathNode.children.get(
                manager.fileType()
            );
            this.curHistoryNode = {
                path: this.getViewPath(),
                prev: null,
                next: null
            };
        }

        if (isDelete) {
            this._refreshNodeReference();
        }

        this._renderList();
    }

    /**
     * @param  {string} fileType
     */
    public switchType(fileType: string) {
        this._eventSwitchType(fileType);
    }

    /**
     * @param  {string} path
     * @returns void
     */
    public switchPath(path: string): void {
        this._eventSwitchPath(path);
    }

    /**
     * @param  {string} path
     * @param  {boolean} clear?
     * @returns void
     */
    public switchPathByStep(path: string, clear?: boolean): void {
        if (clear) {
            this.curHistoryNode = {
                path: "/",
                prev: null,
                next: null
            };
        }

        // When workbook is not activated, curWorkbookDisplayPath is null.
        if (!path) {
            path = "";
        }

        const pathSplit: string[] = path.split("/");
        let curPath: string = "/" + pathSplit.shift();
        while (pathSplit.length !== 0) {
            const nextPath = pathSplit.shift();
            if (nextPath === "") {
                continue;
            }
            curPath += nextPath + "/";
            this.switchPath(curPath);
        }
    }

    /**
     * @param  {string} path
     * @returns void
     */
    public isDir(path: string): boolean {
        if (!path.startsWith("/")) {
            path = this.getViewPath() + path;
        }
        return this._pathToNode(path).isDir;
    }

    /**
     * @returns void
     */
    public lock(): void {
        this.locked = true;
    }

    /**
     * @returns void
     */
    public unlock(): void {
        this.locked = false;
    }

    /**
     * @returns FileManagerPathNode
     */
    public getViewNode(): FileManagerPathNode {
        return this.viewPathNode;
    }

    /**
     * @returns string
     */
    public getViewPath(): string {
        return this._nodeToPath(this.viewPathNode);
    }

    /**
     * @param  {string} displayPath
     * @param  {JQuery} $inputSection?
     * @param  {JQuery} $actionButton?
     * @param  {string} side?
     * @returns boolean
     */
    public canAdd(
        displayPath: string,
        $inputSection?: JQuery,
        $actionButton?: JQuery,
        side?: string
    ): boolean {
        return this.manager.canAdd(
            displayPath,
            $inputSection,
            $actionButton,
            side
        );
    }

    /**
     * @returns string
     */
    public fileExtension(): string {
        return this.manager.fileExtension();
    }

    public autoRename(fileName: string): string {
        return this.manager.autoRename(fileName);
    }

    private get manager(): UDFFileManager {
        return this.managers.get(this.curFileType);
    }

    private _buildPathTree(
        fileList: FileManagerPathItem[],
        fileType: string,
        isDir: boolean
    ): void {
        if (!this.rootPathNode.children.has(fileType)) {
            this.rootPathNode.children.set(fileType, {
                pathName: fileType,
                isDir: true,
                timestamp: null,
                size: null,
                isSelected: false,
                sortBy: FileManagerField.Name,
                sortDescending: false,
                isSorted: false,
                parent: this.rootPathNode,
                children: new Map()
            });
        }

        const fileTypeRootPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            fileType
        );

        for (const fileItem of fileList) {
            const pathSplit: string[] = fileItem.pathName.split("/");
            let curPathNode: FileManagerPathNode = fileTypeRootPathNode;

            for (const path of pathSplit) {
                if (path === "") {
                    continue;
                }

                if (curPathNode.children.has(path)) {
                    curPathNode = curPathNode.children.get(path);
                } else {
                    curPathNode.isSorted = false;
                    const childPathNode: FileManagerPathNode = {
                        pathName: path,
                        isDir: true,
                        timestamp: null,
                        size: null,
                        isSelected: false,
                        sortBy: FileManagerField.Name,
                        sortDescending: false,
                        isSorted: false,
                        parent: curPathNode,
                        children: new Map()
                    };
                    curPathNode.children.set(path, childPathNode);
                    curPathNode = childPathNode;
                }
            }
            curPathNode.isDir = isDir;
            curPathNode.timestamp = fileItem.timestamp;
            curPathNode.size = fileItem.size;
        }
    }

    private _cleanupPathTree(
        fileListSet: Set<string>,
        dirListSet: Set<string>,
        curPathNode: FileManagerPathNode
    ): void {
        // It's safe to delete elements from an ES6 Map while iterating.
        curPathNode.children.forEach((childPathNode: FileManagerPathNode) => {
            this._cleanupPathTree(fileListSet, dirListSet, childPathNode);
        });

        if (curPathNode.parent === this.rootPathNode) {
            return;
        }

        if (
            (curPathNode.isDir &&
                curPathNode.children.size === 0 &&
                !dirListSet.has(this._nodeToPath(curPathNode))) ||
            (!curPathNode.isDir &&
                !fileListSet.has(this._nodeToPath(curPathNode)))
        ) {
            curPathNode.parent.children.delete(curPathNode.pathName);
        }
    }

    private _renderList(): void {
        let html: string = "";
        const newSelectedPathNodes: Set<FileManagerPathNode> = new Set();

        if (!this.viewPathNode.isSorted) {
            this._sortList(this.viewPathNode);
        }

        for (const [childPath, childPathNode] of this.viewPathNode.children) {
            if (childPathNode.isSelected) {
                newSelectedPathNodes.add(childPathNode);
            }
            const selectIcon: string = childPathNode.isSelected
                ? "xi-ckbox-selected"
                : "xi-ckbox-empty";
            const folderIcon: string = childPathNode.isDir
                ? "xi-folder"
                : this.manager.fileIcon();

            html +=
                '<div class="row">' +
                '  <div class="checkBox">' +
                '    <i class="icon ' +
                selectIcon +
                '"></i>' +
                "  </div>" +
                '  <div class="field nameField">' +
                '    <i class="icon ' +
                folderIcon +
                '"></i>' +
                '    <span class="label">' +
                childPath +
                "</span>" +
                "  </div>" +
                '  <div class="field dateField">' +
                '    <span class="label">' +
                childPathNode.timestamp +
                "</span>" +
                "  </div>" +
                '  <div class="field typeField">' +
                '    <span class="label">' +
                childPathNode.size +
                "</span>" +
                "  </div>" +
                "</div>";
        }

        this.selectedPathNodes = newSelectedPathNodes;
        this.$panel.find(".mainSection").get(0).innerHTML = html;
        this._renderAddress();
        this._renderUploadArea();
        this._renderSelectAllButton();
        this._renderSortIcon();
    }

    private _addFileTypeAreaEvents(): void {
        const $fileTypeMenu: JQuery = this.$panel.find(".fileTypeMenu");
        const $fileTypeIcon: JQuery = this.$panel.find(".fileTypeIcon");
        const $fileTypeMenuSection: JQuery = $fileTypeMenu.find(
            ".fileTypeMenuSection"
        );

        xcMenu.add($fileTypeMenu);

        $fileTypeIcon.on({
            mouseup: (event: JQueryEventObject) => {
                event.stopPropagation();

                $fileTypeMenu.toggle();
            },
            click: (event: JQueryEventObject) => {
                event.stopPropagation();
            }
        });

        $fileTypeMenuSection.on({
            mouseup: (event: JQueryEventObject) => {
                const fileType: string = $(event.currentTarget)
                .children(".label")
                .html()
                .replace(/(^\n)|(\n$)/g, "");

                this._eventSwitchType(fileType);
                $fileTypeMenu
                .siblings()
                .children(".fileTypeContent")
                .html(fileType);
            }
        });
    }

    private _addNavigationAreaEvents(): void {
        const $navigationButton: JQuery = this.$panel.find(
            ".navigationArea .navigationButton"
        );

        $navigationButton.on({
            mouseup: (event: JQueryEventObject) => {
                event.stopPropagation();
                const $navigationIcon: JQuery = $(
                    event.currentTarget
                ).children(".icon");

                if ($navigationIcon.hasClass("xi-previous2")) {
                    this._eventNavigatePath(true);
                } else if ($navigationIcon.hasClass("xi-next2")) {
                    this._eventNavigatePath(false);
                } else if ($navigationIcon.hasClass("xi-refresh")) {
                    this.manager.refresh(true, true);
                    this._renderList();
                }
            }
        });
    }

    private _addAddressAreaEvents(): void {
        const $addressBox: JQuery = this.$panel.find(
            ".addressArea .addressBox"
        );

        $addressBox.on({
            keydown: (event: JQueryEventObject) => {
                if (event.which !== keyCode.Enter) {
                    return;
                }

                // For example, the saveAsModal is also listening to this event.
                event.stopPropagation();

                let newPath: string = $addressBox
                .children(".addressContent")
                .val();

                if (!newPath.endsWith("/")) {
                    newPath += "/";
                }

                if (newPath !== this.getViewPath()) {
                    this._eventSwitchPath(newPath);
                }
            },
            click: () => {
                $addressBox.children("input").selectAll();
            }
        });
    }

    private _addActionAreaEvents(): void {
        const $actionMenu: JQuery = this.$panel.find(".actionMenu");
        const $actionBox: JQuery = this.$panel.find(".actionBox");
        const $actionMenuSection: JQuery = $actionMenu.find(
            ".actionMenuSection"
        );

        xcMenu.add($actionMenu);

        $actionBox.on({
            mousedown: (event: JQueryEventObject) => {
                event.stopPropagation();
            },
            mouseup: (event: JQueryEventObject) => {
                event.stopPropagation();

                this._renderActionArea();
                $actionMenu.toggle();
            },
            click: (event: JQueryEventObject) => {
                event.stopPropagation();
            }
        });

        $actionMenuSection.on({
            mouseup: (event: JQueryEventObject) => {
                const action: string = $(event.currentTarget)
                .children(".label")
                .html()
                .replace(/(^\n)|(\n$)/g, "");

                switch (action) {
                    case FileManagerAction.Open:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.open(
                            this._getSelectedPathNodesArray()[0]
                        );
                        break;
                    case FileManagerAction.Download:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.download(
                            this._getSelectedPathNodesArray()
                        );
                        break;
                    case FileManagerAction.Delete:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        const deleteFiles = () =>
                            this.manager
                            .delete(this._getSelectedPathNodesArray())
                            .then(() =>
                                xcUIHelper.showSuccess(
                                    this.curFileType + SuccessTStr.DelFile
                                )
                            );

                        Alert.show({
                            title: FileManagerTStr.DelTitle,
                            msg:
                                this.selectedPathNodes.size > 1
                                    ? FileManagerTStr.DelMsgs
                                    : FileManagerTStr.DelMsg,
                            onConfirm: () => {
                                deleteFiles();
                            }
                        });

                        break;
                    case FileManagerAction.Duplicate: {
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        const oldPath: string = this._nodeToPath(
                            [...this.selectedPathNodes.entries()][0][0]
                        );
                        const newPath: string = this._getDuplicateFileName(
                            oldPath
                        );
                        this.manager.copyTo(oldPath, newPath).fail((error) => {
                            Alert.error(FileManagerTStr.DuplicateFail, error);
                        });
                        break;
                    }
                    case FileManagerAction.CopyTo: {
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        const oldPathNode: FileManagerPathNode = [
                            ...this.selectedPathNodes.entries()
                        ][0][0];
                        const oldPath: string = this._nodeToPath(oldPathNode);
                        const options = {
                            onSave: (newPath: string) => {
                                this.manager
                                .copyTo(oldPath, newPath)
                                .fail((error) => {
                                    Alert.error(
                                        FileManagerTStr.DuplicateFail,
                                        error
                                    );
                                });
                            }
                        };
                        FileManagerSaveAsModal.Instance.show(
                            FileManagerTStr.COPYTO,
                            oldPath.split("/").pop(),
                            // Should not use getViewPath, otherwise won't work
                            // in search results.
                            this._nodeToPath(oldPathNode.parent),
                            options
                        );
                        break;
                    }
                    case FileManagerAction.Share:
                        if (!this._isValidAction(action)) {
                            return;
                        }
                        this.manager.share(
                            this._nodeToPath(
                                [...this.selectedPathNodes.entries()][0][0]
                            )
                        );
                        break;
                }
            }
        });
    }

    private _getSelectedPathNodesArray(): string[] {
        return [...this.selectedPathNodes.entries()].map(
            (value: [FileManagerPathNode, FileManagerPathNode]) => {
                return this._nodeToPath(value[0]);
            }
        );
    }

    private _getSelectedDirPathNodesArray(): string[] {
        return [...this.selectedPathNodes.entries()]
        .filter((value: [FileManagerPathNode, FileManagerPathNode]) => {
            return value[0].isDir;
        })
        .map((value: [FileManagerPathNode, FileManagerPathNode]) => {
            return this._nodeToPath(value[0]);
        });
    }

    private _getDuplicateFileName(path: string): string {
        const curPathNode: FileManagerPathNode = this._pathToNode(path, true);
        if (!curPathNode) {
            return null;
        }

        const fileName: string = curPathNode.pathName.substring(
            0,
            curPathNode.pathName.lastIndexOf(".")
        );
        const fileNameSet: Set<string> = new Set(
            [...curPathNode.parent.children.values()]
            .filter((value: FileManagerPathNode) => {
                return !value.isDir;
            })
            .map((value: FileManagerPathNode) => {
                return value.pathName.substring(
                    0,
                    value.pathName.lastIndexOf(".")
                );
            })
        );

        let i: number = 1;
        while (fileNameSet.has(fileName + "_" + i++));
        --i;

        return (
            this._nodeToPath(curPathNode.parent) +
            fileName +
            "_" +
            i +
            this.manager.fileExtension()
        );
    }

    private _renderActionArea(): void {
        const $actionMenuSection: JQuery = this.$panel.find(
            ".actionMenu .actionMenuSection"
        );

        $actionMenuSection.each((_index: number, elem: Element) => {
            const action: string = $(elem)
            .children(".label")
            .html()
            .replace(/(^\n)|(\n$)/g, "");

            if (!this._isValidAction(action as FileManagerAction)) {
                $(elem).addClass("disabled");
            } else {
                $(elem).removeClass("disabled");
            }
            if (action === FileManagerAction.CopyTo) {
                let $elem = $(elem);
                if (WorkbookManager.getActiveWKBK() == null) {
                    $elem.addClass("unavailable");
                    xcTooltip.add($elem, {title: TooltipTStr.MustBeInWorkbook});
                } else {
                    $elem.removeClass("unavailable");
                    xcTooltip.remove($elem);
                }
            }
        });
    }

    private _isValidAction(action: FileManagerAction) {
        if (this.locked) {
            return false;
        }
        switch (action) {
            case FileManagerAction.Open:
                return (
                    this.selectedPathNodes.size === 1 &&
                    this._getSelectedDirPathNodesArray().length === 0
                );
            case FileManagerAction.Download:
                return (
                    this.selectedPathNodes.size > 0 &&
                    this._getSelectedDirPathNodesArray().length === 0
                );
            case FileManagerAction.Delete:
                return (
                    this.selectedPathNodes.size > 0 &&
                    this._getSelectedDirPathNodesArray().length === 0 &&
                    this.manager.canDelete(this._getSelectedPathNodesArray())
                );
            case FileManagerAction.Duplicate:
                return (
                    this.selectedPathNodes.size === 1 &&
                    ![...this.selectedPathNodes.entries()][0][0].isDir &&
                    this.manager.canDuplicate(
                        this._nodeToPath(
                            [...this.selectedPathNodes.entries()][0][0]
                        )
                    )
                );
            case FileManagerAction.CopyTo:
                return (
                    this.selectedPathNodes.size === 1 &&
                    this._getSelectedDirPathNodesArray().length === 0 &&
                    WorkbookManager.getActiveWKBK() != null
                );
            case FileManagerAction.Share:
                return (
                    this.selectedPathNodes.size === 1 &&
                    this._getSelectedDirPathNodesArray().length === 0 &&
                    this.manager.canShare(
                        this._nodeToPath(
                            [...this.selectedPathNodes.entries()][0][0]
                        )
                    )
                );
            default:
                return false;
        }
    }

    private _addUploadEvents(): void {
        const $operationAreaUpload: JQuery = this.$panel.find(
            ".operationArea"
        );
        $operationAreaUpload.children(".operationContent").on({
            mouseup: () => {
                this._eventClickUpload();
            }
        });

        const $uploadButton: JQuery = this.$panel.find(
            ".operationArea .uploadButton"
        );
        $uploadButton.change((event: JQueryEventObject) => {
            this._eventUpload($(event.currentTarget).val());
        });
    }

    private _addSearchBarEvents(): void {
        const $searchInput: JQuery = this.$panel.find(
            ".searchBox .searchInput"
        );

        $searchInput.on({
            keydown: (event: JQueryEventObject) => {
                if (event.which !== keyCode.Enter) {
                    return;
                }

                const keyword: string = $searchInput.val();
                this._eventSearch(keyword);
            },
            input: (_event: JQueryEventObject) => {
                const keyword: string = $searchInput.val();
                this._eventSearch(keyword);
            }
        });
    }

    private _addTitleSectionEvents(): void {
        this.$panel.on(
            "mouseup",
            ".titleSection .field",
            (event: JQueryEventObject) => {
                event.stopPropagation();

                const sortBy: string = $(event.currentTarget)
                .children(".label")
                .html()
                .replace(/(^\n)|(\n$)/g, "");

                this._eventSort(sortBy);
            }
        );

        this.$panel.on(
            "mouseup",
            ".titleSection .checkBox",
            (event: JQueryEventObject) => {
                event.stopPropagation();

                this._eventSelectAll();
            }
        );
    }

    private _addMainSectionEvents(): void {
        this.$panel.on(
            "mouseup",
            ".mainSection .checkBox",
            (event: JQueryEventObject) => {
                event.stopPropagation();

                const $selectedPathLabel: JQuery = $(event.currentTarget)
                .next()
                .find(".label");

                this._eventSelectRow($selectedPathLabel);
            }
        );

        this.$panel.on(
            "mousedown",
            ".mainSection .field",
            (event: JQueryEventObject) => {
                const $row: JQuery = $(event.currentTarget).parent();
                $row.toggleClass("pressed");
                $row.siblings().removeClass("pressed");
            }
        );

        this.$panel.on(
            "dblclick",
            ".mainSection .field",
            (event: JQueryEventObject) => {
                const childPath: string = $(event.currentTarget)
                .parent(".row")
                .children(".field")
                .children(".label")
                .html();

                const newPath: string =
                    this.viewPathNode ===
                    this.rootPathNode.children.get("Search")
                        ? childPath
                        : this.getViewPath() + childPath + "/";
                this._eventSwitchPath(newPath);
            }
        );
    }

    private _eventSwitchType(fileType: string): void {
        if (fileType === this.curFileType) {
            return;
        }

        this.savedHistoryNodes.set(this.curFileType, this.curHistoryNode);
        this.savedPathNodes.set(this.curFileType, this.viewPathNode);

        this.viewPathNode =
            this.savedPathNodes.get(fileType) ||
            this.rootPathNode.children.get(fileType);
        this.curHistoryNode = this.savedHistoryNodes.get(fileType) || {
            path: this.getViewPath(),
            prev: null,
            next: null
        };

        this.curFileType = fileType;
        this._renderList();
    }

    private _eventNavigatePath(back: boolean): void {
        let futureHistoryNode: FileManagerHistoryNode = null;
        if (back) {
            futureHistoryNode = this.curHistoryNode.prev;
        } else {
            futureHistoryNode = this.curHistoryNode.next;
        }

        if (!futureHistoryNode) {
            return;
        }

        this.curHistoryNode = futureHistoryNode;
        this.viewPathNode =
            this.curHistoryNode.path === "Search"
                ? this.rootPathNode.children.get("Search")
                : this._pathToNode(this.curHistoryNode.path);
        this._renderList();
    }

    private _eventSwitchPath(newPath: string): void {
        let newNode: FileManagerPathNode = this._pathToNode(newPath, true);
        if (!newNode) {
            const options: {side: string; offsetY: number} = {
                side: "bottom",
                offsetY: 0
            };
            StatusBox.show(
                FileManagerTStr.InvalidPath,
                this.$panel.find(".addressArea .addressContent"),
                true,
                options
            );
            return;
        }

        if (!newNode.isDir) {
            newPath = newPath.replace(/\/$/, "");
            if (!this.locked) {
                this.manager.open(newPath);
            }
            newNode = newNode.parent;
            newPath = this._nodeToPath(newNode);

            if (
                this.viewPathNode === this.rootPathNode.children.get("Search")
            ) {
                return;
            }
        }

        if (newPath !== this.curHistoryNode.path) {
            this.curHistoryNode.next = {
                path: newPath,
                prev: this.curHistoryNode,
                next: null
            };
            this.curHistoryNode = this.curHistoryNode.next;
        }

        this.viewPathNode = newNode;
        this._renderList();
    }

    private _renderAddress(): void {
        const address: string = this.getViewPath();
        this.$panel.find(".addressArea .addressContent").val(address);
    }

    private _eventClickUpload(): void {
        if (
            !this.manager.canAdd(
                this.getViewPath() + "a" + this.manager.fileExtension()
            )
        ) {
            return;
        }

        const $uploadButton: JQuery = this.$panel.find(
            ".operationArea .uploadButton"
        );
        $uploadButton.val("");
        $uploadButton.click();
    }

    private _eventUpload(path: string): void {
        if (path.trim() === "") {
            return;
        }

        path =
            this.getViewPath() +
            path
            .replace(/C:\\fakepath\\/i, "")
            .toLowerCase()
            .replace(/ /g, "");

        const $uploadButton: JQuery = this.$panel.find(
            ".operationArea .uploadButton"
        );
        const $uploadVisibleButton: JQuery = this.$panel.find(
            ".operationAreaUpload .operationContent"
        );
        const file: File = ($uploadButton[0] as HTMLInputElement).files[0];

        const reader: FileReader = new FileReader();
        reader.onload = (readerEvent: any) => {
            const entireString = readerEvent.target.result;
            if (
                this.manager.canAdd(path, $uploadVisibleButton, null, "left")
            ) {
                this.manager.add(path, entireString);
            }
        };
        reader.readAsText(file);
    }

    private _renderUploadArea(): void {
        const $uploadArea: JQuery = this.$panel.find(".operationAreaUpload");
        const canUpload: boolean = this.manager.canAdd(
            this.getViewPath() + "a" + this.manager.fileExtension(),
            null,
            null,
            "left"
        );

        $uploadArea
        .children(".operationContent")
        .toggleClass("btn-disabled", !canUpload);

        if (!canUpload) {
            xcTooltip.changeText($uploadArea, FileManagerTStr.DirReadOnly);
            xcTooltip.enable($uploadArea);
        } else {
            xcTooltip.disable($uploadArea);
        }
    }

    private _eventSearch(keyword: string): void {
        let keywordSearch: string = xcStringHelper
        .escapeRegExp(keyword)
        .replace(/\\\*/g, ".*")
        .replace(/\\\?/g, ".");
        keywordSearch = xcStringHelper.containRegExKey(keywordSearch);
        const keywordReg: RegExp = new RegExp(keywordSearch, "i");

        if (!this.rootPathNode.children.has("Search")) {
            this.rootPathNode.children.set("Search", {
                pathName: "Search",
                isDir: true,
                timestamp: null,
                size: null,
                isSelected: false,
                sortBy: FileManagerField.Name,
                sortDescending: false,
                isSorted: false,
                parent: this.rootPathNode,
                children: new Map()
            });
        }

        this.rootPathNode.children.get("Search").children = new Map();
        this.rootPathNode.children.get("Search").isSorted = false;
        const rootTypePathNode: FileManagerPathNode = this.rootPathNode.children.get(
            this.curFileType
        );
        const rootSearchPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "Search"
        );

        if (keyword !== "") {
            const searchQueue: FileManagerPathNode[] = [];
            searchQueue.push(rootTypePathNode);

            while (searchQueue.length !== 0) {
                const curPathNode: FileManagerPathNode = searchQueue.shift();

                if (keywordReg.test(curPathNode.pathName)) {
                    rootSearchPathNode.children.set(
                        this._nodeToPath(curPathNode),
                        curPathNode
                    );
                }

                for (const childPathNode of curPathNode.children.values()) {
                    searchQueue.push(childPathNode);
                }
            }
        }

        if (this.curHistoryNode.path !== "Search") {
            this.curHistoryNode.next = {
                path: "Search",
                prev: this.curHistoryNode,
                next: null
            };
            this.curHistoryNode = this.curHistoryNode.next;
        }

        this.viewPathNode = rootSearchPathNode;
        this._renderList();
    }

    private _eventSelectAll(): void {
        const toSelectAll: boolean = this.selectedPathNodes.size === 0;

        for (const [childPath, childPathNode] of this.viewPathNode.children) {
            childPathNode.isSelected = toSelectAll;
            if (childPathNode.isSelected) {
                this.selectedPathNodes.add(childPathNode);
            } else {
                this.selectedPathNodes.delete(childPathNode);
            }
            const $selectedPathLabel: JQuery = this.$panel.find(
                ".mainSection .field .label:contains('" + childPath + "')"
            );
            this._renderSelectRowButton($selectedPathLabel);
        }

        this.selectedPathNodes = toSelectAll
            ? new Set(this.viewPathNode.children.values())
            : new Set();

        this._renderSelectAllButton();
    }

    private _renderSelectAllButton(): void {
        let html: string = "";
        if (this.selectedPathNodes.size === 0) {
            html = '<i class="icon xi-ckbox-empty"></i>';
        } else if (
            this.selectedPathNodes.size === this.viewPathNode.children.size
        ) {
            html = '<i class="icon xi-ckbox-selected"></i>';
        } else {
            html = '<i class="icon xi-checkbox-select"></i>';
        }
        this.$panel.find(".titleSection .checkBox").html(html);
    }

    private _eventSelectRow($selectedPathLabel: JQuery): void {
        const selectedPath: string = $selectedPathLabel.html();
        const selectedPathNode: FileManagerPathNode = this.viewPathNode.children.get(
            selectedPath
        );
        selectedPathNode.isSelected = !selectedPathNode.isSelected;
        if (selectedPathNode.isSelected) {
            this.selectedPathNodes.add(selectedPathNode);
        } else {
            this.selectedPathNodes.delete(selectedPathNode);
        }

        this._renderSelectRowButton($selectedPathLabel);
        this._renderSelectAllButton();
    }

    private _renderSelectRowButton($selectedPathLabel: JQuery): void {
        const selectedPath: string = $selectedPathLabel.html();
        const selectedPathNode: FileManagerPathNode = this.viewPathNode.children.get(
            selectedPath
        );
        const icon: string = selectedPathNode.isSelected
            ? "xi-ckbox-selected"
            : "xi-ckbox-empty";
        const html: string = '<i class="icon ' + icon + '"></i>';
        $selectedPathLabel
        .parent()
        .siblings(".checkBox")
        .html(html);
    }

    private _eventSort(sortBy: string): void {
        this.viewPathNode.isSorted = false;
        this.viewPathNode.sortDescending =
            sortBy === this.viewPathNode.sortBy
                ? !this.viewPathNode.sortDescending
                : false;

        switch (sortBy) {
            case "Name":
                this.viewPathNode.sortBy = FileManagerField.Name;
                break;
            case "Date":
                this.viewPathNode.sortBy = FileManagerField.Date;
                break;
            case "Size":
                this.viewPathNode.sortBy = FileManagerField.Size;
                break;
            default:
                this.viewPathNode.sortBy = FileManagerField.Name;
        }

        this._renderSortIcon();
        this._renderList();
    }

    private _sortList(curPathNode: FileManagerPathNode): void {
        const childPathEntryList: [string, FileManagerPathNode][] = [
            ...curPathNode.children.entries()
        ].sort(
            (
                a: [string, FileManagerPathNode],
                b: [string, FileManagerPathNode]
            ) => {
                let compare: number = 0;
                switch (curPathNode.sortBy) {
                    case FileManagerField.Name:
                        if (a[1].isDir && !b[1].isDir) {
                            compare = -1;
                        } else if (!a[1].isDir && b[1].isDir) {
                            compare = 1;
                        } else {
                            compare = a[0] < b[0] ? -1 : 1;
                        }
                        break;
                    case FileManagerField.Date:
                        compare = a[1].timestamp - b[1].timestamp;
                        break;
                    case FileManagerField.Size:
                        compare = a[1].size - b[1].size;
                        break;
                }
                return curPathNode.sortDescending ? -compare : compare;
            }
        );
        curPathNode.children = new Map(childPathEntryList);
        curPathNode.isSorted = true;
    }

    private _renderSortIcon(): void {
        this.$panel
        .find(".titleSection .field .icon")
        .each((_index: number, elem: Element) => {
            const sortBy: string = $(elem)
            .siblings(".label")
            .html()
            .replace(/(^\n)|(\n$)/g, "");

            if (sortBy === this.viewPathNode.sortBy) {
                $(elem).removeClass("xi-sort");
                $(elem).removeClass("xi-arrow-up");
                $(elem).removeClass("xi-arrow-down");
                const newClass: string = this.viewPathNode.sortDescending
                    ? "xi-arrow-down"
                    : "xi-arrow-up";
                $(elem).addClass(newClass);
            } else {
                $(elem).removeClass("xi-arrow-up");
                $(elem).removeClass("xi-arrow-down");
                $(elem).addClass("xi-sort");
            }
        });
    }

    private _refreshNodeReference(): void {
        if (this.viewPathNode === this.rootPathNode.children.get("Search")) {
            return;
        }

        this.viewPathNode = this._pathToNode(this.getViewPath());
    }

    private _nodeToPath(curPathNode: FileManagerPathNode): string {
        const rootSearchPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            "Search"
        );
        if (curPathNode === rootSearchPathNode) {
            return "Search results";
        }

        let res: string = curPathNode.isDir ? "/" : "";
        while (curPathNode.parent !== this.rootPathNode) {
            res = "/" + curPathNode.pathName + res;
            curPathNode = curPathNode.parent;
        }
        return res;
    }

    private _pathToNode(
        path: string,
        returnNull?: boolean
    ): FileManagerPathNode {
        let curPathNode: FileManagerPathNode = this.rootPathNode.children.get(
            this.curFileType
        );
        const paths: string[] = path.split("/");

        for (const curPath of paths) {
            if (curPath === "") {
                continue;
            }

            if (curPathNode.children.has(curPath)) {
                curPathNode = curPathNode.children.get(curPath);
            } else {
                return returnNull ? null : curPathNode;
            }
        }

        return curPathNode;
    }
}
