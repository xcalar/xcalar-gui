namespace FileBrowser {
    interface XcFile {
        name: string;
        attr: {
            isDirectory: boolean;
            extension: string;
            size: number;
            ctime: number;
            mtime: number;
        };
        isSelected: boolean;
        isPicked: boolean;
        isLoading: boolean;
    }

    let $fileBrowser: JQuery;     // $("#fileBrowser")
    let $container: JQuery;       // $("#fileBrowserContainer")
    let $containerWrapper: JQuery;// $("#fileBrowserContainer .wrapper")
    let $innerContainer: JQuery;  // $("#innerFileBrowserContainer")
    let $fileBrowserMain: JQuery; // $("#fileBrowserMain")
    let $infoContainer: JQuery;   // $("#fileInfoContainer")
    let $pickedFileList: JQuery; // $("#fileBrowserContainer .pickedFileList")

    let $pathSection: JQuery;     // $("#fileBrowserPath")
    let $pathLists: JQuery;       // $("#fileBrowserPathMenu")
    let $searchSection: JQuery;    // $("#fileBrowserSearch");
    let $searchDropdown: JQuery;  // $("#fileSearchDropdown")
    let $visibleFiles: JQuery;   // will hold non hidden files

    let fileBrowserId: string;
    let searchId: string;

    let _options: {backCB?: Function, cloud?: boolean};
    let dragInfo: any = {};
    let defaultPath: string = "/";

    /* Constants */
    const defaultSortKey: string = "name"; // default is sort by name;
    let dsIconHeight: number = 77;
    let dsIconWidth: number = 70; // width height get calculated later but default to this
    let dsListHeight: number = 29;
    let lowerFileLimit: number = 800; // when we start hiding files
    let upperFileLimit: number = 110000; // show error if over 110K
    const subUpperFileLimit: number = 25000; // file limit if not chrome
    const sortFileLimit: number = 25000; // do not allow sort if over 25k
    const oldBrowserError: string = "Deferred From Old Browser";
    const oldSearchError: string = "Deferred From Old Search";
    const listFormatMap = {
        "JSON": "xi-json-big-file",
        "CSV": "xi-csv-big-file",
        "Excel": "xi-xls-big-file",
        "TEXT": "xi-text-big-file",
        "XML": "xi-xml-big-file",
        "HTML": "xi-html-big-file",
        "TAR": "xi-tar-big-file",
        "ZIP": "xi-zip-big-file",
        "PDF": "xi-pdf-big-file",
        "JPG": "xi-jpg-big-file",
        "PNG": "xi-png-big-file",
        "GIF": "xi-gif-big-file",
        "BMP": "xi-bmp-big-file"
    };
    export const gridFormatMap = {
        "JSON": "xi-json-file",
        "CSV": "xi-csv-file",
        "Excel": "xi-xls-file",
        "TEXT": "xi-text-file",
        "XML": "xi-xml-file",
        "HTML": "xi-html-file",
        "TAR": "xi-tar-file",
        "ZIP": "xi-zip-file",
        "PDF": "xi-pdf-file",
        "JPG": "xi-jpg-file",
        "PNG": "xi-png-file",
        "GIF": "xi-gif-file",
        "BMP": "xi-bmp-file-1"
    };
    /* End Of Constants */

    let curFiles: XcFile[] = [];
    let curPathFiles = [];
    let allFiles: XcFile[] = [];
    let sortKey = defaultSortKey;
    let sortRegEx;
    let reverseSort = false;
    let $lastSelectedFile: JQuery; // last file that was clicked
    let pathDropdownMenu: MenuHelper;
    let searchDropdownMenu: MenuHelper;
    let searchInfo: string = "";
    let isS3: boolean = false;
    const PAGE_SIZE = 100;

    let initialState = {
        isLoading: true,
        path: "",
        fileMapViewing: new Map(),
        fileNamePattern: "",
        loadingFiles: new Set(),
        showForensics: false,
        forensicsMessage: [],
        isForensicsLoading: false,
        forensicsPath: "",
        offset: 0,
        maxOffset: Number.MAX_VALUE,
        numFiles: 0,
        hasMoreFiles: false
    };

    let state = {...initialState};

    let filesCursor = null;

    /**
     * FileBrowser.setup
     */
    export function setup(): void {
        $fileBrowser = $("#fileBrowser");
        $container = $("#fileBrowserContainer");
        $containerWrapper = $("#fileBrowserContainer .wrapper").eq(0);
        $innerContainer = $("#innerFileBrowserContainer");
        $fileBrowserMain = $("#fileBrowserMain");
        $pathSection = $("#fileBrowserPath");
        $pathLists = $("#fileBrowserPathMenu");
        $searchSection = $("#fileBrowserSearch");
        $searchDropdown = $("#fileSearchDropdown");
        $infoContainer = $("#fileInfoContainer");
        $pickedFileList = $("#fileInfoContainer .pickedFileList").eq(0);
        $visibleFiles = $();

        $fileBrowser.find(".searchLoadingSection")
                    .html(xcUIHelper.getLockIconHtml(undefined, undefined, false,
                                                   false, true));

        if (!window["isBrowserChrome"]) {
            lowerFileLimit = 600;
            upperFileLimit = subUpperFileLimit;
        }

        addContainerEvents();
        addSortMenuEvents();
        addPathSectionEvents();
        addSearchSectionEvents();
        addInfoContainerEvents();
        setupRightClickMenu();

        fileBrowserScrolling();
    }

    /**
     * FileBrowser.restore
     */
    export function restore(): void {
        toggleView(true, true);
    }

    /**
     * FileBrowser.clear
     */
    export function clear(): void {
        state = {...initialState};
        setState({});
        $("#fileBrowserUp").addClass("disabled");
        setPath("");
        updateActiveFileInfo(null);
        $pathLists.empty();
        // performance when there's 1000+ files, is the remove slow?
        $container.removeClass("manyFiles");
        $fileBrowser.removeClass("unsortable");
        clearSearch();
        cleanContainer();

        $visibleFiles = $();
        curFiles = [];
        curPathFiles = [];
        sortRegEx = undefined;

        document.getElementById("innerFileBrowserContainer").innerHTML = "";

        $(document).off(".fileBrowser");
        $(window).off(".fileBrowserResize");
        $fileBrowser.removeClass("loadMode errorMode");
        $fileBrowserMain.find(".searchLoadingSection").hide();
        fileBrowserId = null;
        if (_options && _options.cloud) {
            CloudFileBrowser.clear();
        }
        _options = undefined;
    }

    /**
     * FileBrowser.close
     */
    export function close(): void {
        let cb = _options ? _options.backCB : null;
        FileBrowser.clear();
        if (typeof cb === "function") {
            cb();
        } else {
            DSForm.show();
        }
    }

    /**
     * FileBrowser.show
     * @param targetName
     * @param path
     * @param restore
     * @param options
     */
    export function show(
        targetName: string,
        path: string,
        restore: boolean,
        options?: {
            backCB?: Function
            cloud?: boolean
        }
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!restore) {
            FileBrowser.clear();
        }

        setMode();
        path = setDefaultPath(targetName, path);
        updateActiveFileInfo(null);
        DataSourceManager.switchView(DataSourceManager.View.Browser);

        addKeyBoardEvent();
        addResizeEvent();
        fileBrowserId = xcHelper.randName("browser");
        _options = options || {};

        setTarget(targetName);
        if (!xcGlobal.isLegacyLoad && targetName.startsWith("Xcalar S3 Connector")) {
            $fileBrowser.addClass("s3");
            isS3 = true;
        } else {
            $fileBrowser.removeClass("s3");
            isS3 = false;
        }
        // let def = _options.cloud ? CloudFileBrowser.getCloudPath() : PromiseHelper.resolve(path);
        let def = PromiseHelper.resolve(path);
        def
        .then(function(res: string) {
            path = res;
            let paths = parsePath(path);
            setPath(paths[paths.length - 1]);
            return retrievePaths(path, null, restore);
        })
        .then(function() {
            measureDSIcon();
            measureDSListHeight();
            deferred.resolve();
        })
        .fail(function(error) {
            error = error || {};
            if (error.error === oldBrowserError) {
                // when it's an old deferred
                deferred.reject(error);
                return;
            } else if (error.status === StatusT.StatusIO ||
                        path === defaultPath ||
                        _options.cloud) {
                loadFailHandler(error, path);
                deferred.reject(error);
            } else {
                retrievePaths(defaultPath, false, false)
                .then(function() {
                    redirectHandler(path);
                    deferred.resolve();
                })
                .fail(function(innerError) {
                    if (innerError.error !== oldBrowserError) {
                        loadFailHandler(innerError, path);
                    }
                    deferred.reject(innerError);
                });
            }
        });

        return deferred.promise();
    }

    /**
     * FileBrowser.addFileToUpload
     * @param fileName
     */
    export function addFileToUpload(fileName: string): void {
        let path: string = getCurrentPath();
        let file: XcFile = {
            name: fileName,
            attr: {
                isDirectory: false,
                extension: getFileExtension(fileName),
                size: undefined,
                ctime: undefined,
                mtime: undefined
            },
            isSelected: false,
            isPicked: false,
            isLoading: true
        };

        filterFile(fileName);
        allFiles.push(file);
        renderFiles(path, true);
    }

    /**
     * FileBrowser.removeFileToUpload
     * @param fileName
     */
    export function removeFileToUpload(fileName: string): void {
        filterFile(fileName);
    }

    /**
     * FileBrowser.hasFile
     */
    export function hasFile(fileName: string): boolean {
        return allFiles.some((file) => file.name === fileName);
    };

    /**
     * FileBrowser.refresh
     */
    export function refresh(): void {
        // the first option in pathLists
        let $curPath = $pathLists.find("li").eq(0);
        goToPath($curPath);
    }

    function setMode(): void {
        let $switch = $("#fileInfoBottom .switchWrap");
        if (DSConfig.isCreateTableMode()) {
            $switch.find(".switch").removeClass("on");
            $switch.addClass("xc-hidden");
            $switch.siblings(".infoTitle").addClass("xc-hidden");
        } else {
            $switch.removeClass("xc-hidden");
            $switch.siblings(".infoTitle").removeClass("xc-hidden");
        }
    }

    function setDefaultPath(targetName: string, path: string): string {
        if (!xcGlobal.isLegacyLoad && path && DSTargetManager.isAWSConnector(targetName)) {
            if (path[0] === '/') {
                path = path.substring(1);
            }
            const splits = path.split('/');
            defaultPath = '/' + splits[0] + '/';
            return splits.slice(1).join('/');
        } else {
            defaultPath = '/';
            return path;
        }
    }

    function addContainerEvents(): void {
        $fileBrowser.on("click", "input", function() {
            hideBrowserMenu();
        });

        // click blank space to remove focus on folder/ds
        $fileBrowser.on("click", function() {
            cleanContainer({keepPicked: true});
        });

        $("#fileInfoContainer").on("click", function(event) {
            // Click on infoContainer should not clean container
            event.stopPropagation();
        });

        $fileBrowser.on({
            "click": function(event) {
                // click to focus
                let $grid = $(this);
                event.stopPropagation();
                cleanContainer({keepPicked: true});
                selectSingleFile($grid);
                $lastSelectedFile = $grid;
            },
            "dblclick": function() {
                let $grid = $(this);
                if (isDS($grid)) {
                    if (!$grid.hasClass("picked")) {
                        // dblclick on a non-picked file will import it
                        submitForm($grid);
                    }
                    return;
                }
                let path = getCurrentPath() + getGridUnitName($grid) + '/';
                displayFiles(path);
            },
            "mouseenter": function() {
                let $grid = $(this);
                $grid.addClass("hovering");
            },
            "mouseleave": function() {
                let $grid = $(this);
                $grid.removeClass("hovering");
            },
        }, ".grid-unit");

        $innerContainer.on({
            "click": function(event) {
                // This behavior is in essence the same as a ctrl+click
                event.stopPropagation();
                let $grid = $(this).closest(".grid-unit");
                if (event.shiftKey) {
                    // ctrl + shift at same time = ctrl
                    // This is only for shift-click
                    if ($grid.hasClass("picked")) {
                        deselectMultiFiles($grid);
                        uncheckSelectAll();
                        $lastSelectedFile = $grid;
                        return;
                    } else {
                        selectMultiFiles($grid);
                    }
                } else {
                    cleanContainer({keepPicked: true,
                                    keepAnchor: true});
                    selectSingleFile($grid);
                }

                togglePickedFiles($grid);
                if ($grid.hasClass("picked")) {
                    updatePickedFilesList(null, null);
                } else {
                    updatePickedFilesList(null, {isRemove: true});
                    uncheckSelectAll();
                }
                $lastSelectedFile = $grid;
            },
            "dblclick": function(event) {
                // double click on checkbox does nothing and should stopPropagation
                event.stopPropagation();
                return;
            },
        }, ".checkBox");

        $fileBrowser.find(".titleSection .selectAll").click(function() {
            const $checkbox = $(this).find(".icon");
            const $grids = $container.find(".grid-unit");
            if ($checkbox.hasClass("xi-ckbox-selected")) {
                cleanContainer(null);
                $fileBrowser.find(".pickedFileList").empty();
                uncheckSelectAll();
            } else {
                $grids.addClass("selected picked");
                $grids.find(".xi-ckbox-empty").addClass("xi-ckbox-selected");
                $grids.each(function() {
                    let $cur = $(this);
                    curFiles[$cur.data("index")].isSelected = true;
                    curFiles[$cur.data("index")].isPicked = true;
                });

                $pickedFileList.empty();
                updatePickedFilesList(null, null);
                checkSelectAll();
            }
        });

        $("#fileBrowserRefresh").click(function(event) {
            $(this).blur();
            event.stopPropagation();
            FileBrowser.refresh();
        });

        // Up to parent folder
        $("#fileBrowserUp").click(function(event) {
            $(this).blur();
            event.stopPropagation();
            goUpPath();
        });

        // toggle between list view and grid view
        $("#fileBrowserGridView").click(function(event) {
            event.stopPropagation();
            toggleView(null, false);
        });

        // click on title to sort
        let titleLabel = ".title";
        $fileBrowserMain.on("click", titleLabel, function(event) {
            let $title = $(this).closest(".title");

            event.stopPropagation();
            if ($fileBrowser.hasClass('unsortable')) {
                return;
            }
            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                reverseFiles();
                let $icon = $title.find(".icon").eq(0);
                toggleSortIcon($icon, false);
            } else {
                sortAction($title, false);
            }
        });
        $fileBrowserMain.find(".titleSection").on("mousedown", ".colGrab", function(event) {
            startColResize($(this), event);
        });
        $fileBrowserMain.on("click", ".cancelSearch .xi-close", function() {
            clearSearch();
            $fileBrowser.removeClass("loadMode");
            $fileBrowserMain.find(".searchLoadingSection").hide();
        });

        $fileBrowser.on('click', ".pageBtn", (e) => {
            let $btn = $(e.currentTarget);
            if ($btn.hasClass("xc-unavailable")) {
                return;
            }
            _pageNavigation($btn.hasClass("next"));
        });
    }

    function addInfoContainerEvents(): void {
        $infoContainer.find(".clearAll").on("click", function() {
            // Clear all
            cleanContainer(null);
            $fileBrowser.find(".pickedFileList").empty();
            uncheckSelectAll();
        });

        $infoContainer.find(".addRegex").on("click", function() {
            // Add a regex pattern to list
            $(this).blur();
            let html = createListElement(null);
            let $span = $(html).appendTo($pickedFileList).find(".text");
            refreshFileListEllipsis($span, true);
            updateButtons();
            updateFileCount();
            updateSelectAll();
        });

        $infoContainer.on("click", ".selectAll", function() {
            // Toggle all recursive flags
            let $unchecked = $infoContainer.find(".fileList .checkbox:not(.checked):not(.xc-disabled)");
            if ($unchecked.length > 0) {
                $unchecked.addClass("checked");
            } else {
                $infoContainer.find(".fileList .checkbox.checked").removeClass("checked");
            }
            updateSelectAll();
        });

        $infoContainer.on("click", ".fileList .checkbox", function() {
            // Uncheck single recursive flag
            $(this).toggleClass("checked");
            updateSelectAll();
        });

        $infoContainer.on("click", ".pickedFileList .close", function() {
            let $li = $(this).closest("li");
            let fileName = String($li.data("name"));
            let concatPath = getCurrentPath() + fileName;
            let fullPath = $li.data("fullpath");
            if (!$li.hasClass("regex") && (fullPath === concatPath)) {
                // Unselect single file from pickedFileList
                let escName = xcStringHelper.escapeDblQuote(fileName);
                let $grid = $fileBrowser
                            .find('.fileName[data-name="' + escName + '"]')
                            .closest(".grid-unit");
                unselectSingleFile($grid);
                return;
            }
            // This for when there is no $grid, i.e. either it's regex or
            // you are on another path
            $li.remove();
            updateButtons();
            updateSelectAll();
            updateFileCount();
        });

        $infoContainer.on("click", ".switch", function() {
            let $switch = $(this);
            if ($switch.hasClass("on")) {
                $switch.removeClass("on");
                $switch.next().removeClass("highlighted");
                $switch.prev().addClass("highlighted");
            } else {
                $switch.addClass("on");
                $switch.prev().removeClass("highlighted");
                $switch.next().addClass("highlighted");
            }
        });

        $infoContainer.on("click", ".switchLabel", function() {
            let $label = $(this);
            if (!$label.hasClass("highlighted")) {
                let $switch = $label.siblings(".switch");
                if ($label.is(":first-child")) {
                    $switch.removeClass("on");
                } else {
                    $switch.addClass("on");
                }
                $label.siblings(".switchLabel").removeClass("highlighted");
                $label.addClass("highlighted");
            }
        });

        $infoContainer.on("click", ".fileRawData .btn", function() {
            var $grid = getFocusedGridEle();
            previewDS(getGridUnitName($grid));
        });

        // confirm to open a ds
        $infoContainer.on("click", ".confirm", function() {
            submitForm(null);
        });

        // close file browser
        $infoContainer.on("click", ".cancel", function() {
            FileBrowser.close();
        });

        // goes to folder location of file on click
        $infoContainer.on("click", ".pickedFileList li span", function() {
            let filePath = $(this).parent().attr("data-fullpath");
            if (filePath) {
                if (filePath.endsWith("/")) {
                    filePath = filePath.substring(0, filePath.length - 1);
                }
                filePath = filePath.substring(0, filePath.lastIndexOf("/") + 1);
                displayFiles(filePath);
            }
        });
    }

    function displayFiles(filePath: string): void {
        resetFileCursor();
        listFiles(filePath, null)
        .then(function() {
            appendPath(filePath, false);
            checkIfCanGoUp();
        })
        .fail(function(error) {
            if (error.error !== oldBrowserError) {
                Alert.error(ThriftTStr.ListFileErr, error);
            }
        });
    }

    function addSortMenuEvents(): void {
        // toggle sort menu, should use mousedown for toggle
        let $sortMenu = $("#fileBrowserSortMenu");
        let $sortSection = $("#fileBrowserSort");

        xcMenu.add($sortMenu);
        $sortSection.on({
            "mouseup": function(event){
                if (event.which !== 1) {
                    return;
                }

                event.stopPropagation();
                if ($fileBrowser.hasClass("unsortable")) {
                    return;
                }

                $sortMenu.toggle();
            },
            // prevent clear event to be trigger
            "click": function(event) {
                event.stopPropagation();
            }
        });

        // // click sort option to sort
        $sortMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            let $li = $(this);

            event.stopPropagation();
            $sortMenu.hide();
            // already sort
            if (!$li.hasClass("select")) {
                sortAction($li, true);
            }
        });

        pathDropdownMenu = new MenuHelper($pathSection, {
            "onlyClickIcon": true,
            "onSelect": goToPath,
            "container": "#fileBrowser"
        }).setupListeners();
    }

    function addPathSectionEvents(): void {
        let timer;
        $pathSection.on({
            "keyup": function(event) {
                clearTimeout(timer);

                let key = event.which;
                if (key === keyCode.Up || key === keyCode.Down ||
                    key === keyCode.Left || key === keyCode.Right)
                {
                    return true;
                }

                let $input = $(this);
                let currentVal = $input.val();
                let path = currentVal;

                if (key === keyCode.Enter) {
                    if (!path.endsWith("/")) {
                        path += "/";
                    }

                    pathInput(path);
                    return false;
                }

                timer = setTimeout(function() {
                    // check if value has changed in timeout
                    if ($input.val() === currentVal && path.endsWith("/")) {
                        pathInput(path);
                    }
                }, 400);

                return false;
            },

            "focus": function() {
                $pathSection.addClass("focused");
            },

            "blur": function() {
                $pathSection.removeClass("focused");
            }
        }, ".text");
    }

    function pathInput(path: string): XDPromise<void> {
        if (path === getCurrentPath()) {
            // when the input path is still equal to current path
            // do not retrievePath
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        retrievePaths(path, false ,false)
        .then(deferred.resolve)
        .fail(function(error) {
            showPathError();
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function showPathError(): void {
        let $input = $("#fileBrowserPath .text");
        let width: number = $input.width();
        let textWidth = xcUIHelper.getTextWidth($input);
        let offset: number = width - textWidth - 50; // padding 50px

        StatusBox.show(ErrTStr.InvalidFilePath, $input, false, {
            "side": "right",
            "offsetX": offset
        });
    }

    function addSearchSectionEvents(): void {
        searchDropdownMenu = new MenuHelper($searchSection, {
            "onlyClickIcon": false,
            "onSelect": applySearchPattern,
            "container": "#fileBrowser"
        }).setupListeners();

        $searchSection.on("input", "input", function() {
            // Refreshing the dropdown options
            let searchKey = $(this).val();
            refreshSearchDropdown(searchKey);
            if ((searchKey.length > 0 && !$searchSection.hasClass("open")) ||
                (searchKey.length === 0 && $searchSection.hasClass("open"))) {
                searchDropdownMenu.toggleList($searchSection);
            }
            if (searchKey.length === 0) {
                searchFiles(null, null);
            }
        });

        $searchSection.on("keyup", "input", function(e) {
            if (e.which === keyCode.Enter) {
                // Do a regular search
                let searchKey = $(this).val();
                if (searchKey.length > 0) {
                    if ($searchSection.hasClass("open")) {
                        searchDropdownMenu.toggleList($searchSection);
                    }
                    $(this).blur();
                    searchFiles(searchKey, null);
                }
            }
        });
        $searchSection.on("mousedown", ".clear", function() {
            $(this).siblings("input").val("").trigger("input");
        });
    }

    function refreshSearchDropdown(key: string): void {
        if (key != null) {
            $searchDropdown.find("span").text(key);
        }
    }

    function applySearchPattern($pattern: JQuery): XDPromise<void> {
        $searchDropdown.find("li").removeClass("selected");
        $pattern.addClass("selected");
        let type: string = $pattern.find("span").attr("class");
        let searchKey: string = $pattern.find("span").text() || null;
        return searchFiles(searchKey, type);
    }

    function hideBrowserMenu(): void {
        getRightClickMenu().hide();
        $("#fileBrowserSortMenu").hide();
    }

    function getRightClickMenu(): JQuery {
        return $("#fileBrowserMenu");
    }

    function setupRightClickMenu(): void {
        let $menu = getRightClickMenu();
        xcMenu.add($menu);
        // set up click right menu
        let el: HTMLElement = <HTMLElement>$container[0];
        el.oncontextmenu = function(event) {
            let $target = $(event.target);
            let $grid = $target.closest(".grid-unit");
            $menu.removeData();
            if ($grid.length === 0) {
                return false;
            }
            let classes: string[] = ["noBorder"];
            let $rawDataLi = $menu.find(".rawData");
            if ($grid.hasClass("folder")) {
                $rawDataLi.addClass("unavailable");
                xcTooltip.add($rawDataLi, {title: "Cannot view raw data of a folder"});
            } else {
                $rawDataLi.removeClass("unavailable");
                xcTooltip.remove($rawDataLi);
            }

            let $deleteLi = $menu.find(".delete");
            if ($fileBrowser.hasClass("cloud")) {
                $deleteLi.show();
            } else {
                $deleteLi.hide();
            }

            $menu.data("file", getGridUnitName($grid))
                .data("index", Number($grid.data("index")));

            MenuHelper.dropdownOpen($target, $menu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes.join(" "),
                "floating": true
            });
            return false;
        };

        setupRightClickMenuActions();
    }

    function setupRightClickMenuActions(): void {
        let $menu = getRightClickMenu();
        $menu.on("mouseup", ".rawData", function(event) {
            if (event.which !== 1) {
                return;
            }
            previewDS($menu.data("file"));
        });

        $menu.on("mouseup", ".copyPath", function(event) {
            if (event.which !== 1) {
                return;
            }
            copyFilePath($menu.data("file"));
        });

        $menu.on("mouseup", ".getInfo", function(event) {
            if (event.which !== 1) {
                return;
            }
            let index: number = $menu.data("index");
            if (index != null) {
                showFileInfo(curFiles[index]);
            }
        });

        $menu.on("mouseup", ".delete", function(event) {
            if (event.which !== 1) {
                return;
            }
            let index: number = $menu.data("index");
            if (index != null
            ) {
                deleteFile(curFiles[index]);
            }
        });
    }

    function filterFile(fileName: string): void {
        allFiles = allFiles.filter((file) => file.name !== fileName);
    }

    function deleteFile(file: XcFile): XDPromise<void> {
        if (!$fileBrowser.hasClass("cloud") || file == null) {
            return PromiseHelper.reject();
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let fileName: string = file.name;
        Alert.show({
            title: "Delete file",
            msg: `Are you sure you want to delete file "${fileName}"?`,
            onConfirm: () => {
                deleteFileHelper(file);
            },
            onCancel: () => deferred.reject()
        });

        return deferred.promise();
    }

    function deleteFileHelper(file: XcFile): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let path: string = getCurrentPath();
        let id: string = fileBrowserId;
        let fileName: string = file.name;
        file.isLoading = true;
        renderFiles(path, true);

        CloudManager.Instance.deleteS3File(fileName)
        .then(() => {
            filterFile(fileName);
            deferred.resolve();
        })
        .fail((error) => {
            file.isLoading = false;
            if (id === fileBrowserId && path === getCurrentPath()) {
                Alert.error(ErrTStr.Error, error);
            }
            deferred.reject(error);
        })
        .always(() => {
            if (id === fileBrowserId && path === getCurrentPath()) {
                renderFiles(path, true);
            }
        });

        return deferred.promise();
    }

    function copyFilePath(fileName: string): void {
        let path = getCurrentPath() + fileName;
        xcUIHelper.copyToClipboard(path);
        xcUIHelper.showSuccess("File path has copied to clipboard");
    }

    function showFileInfo(file) {
        FileInfoModal.Instance.show(file);
    }

    function fileBrowserScrolling(): void {
        let scrollTimer;
        $containerWrapper.scroll(function() {
            hideBrowserMenu();
            if ($(this).hasClass('noScrolling') ||
                (curFiles.length <= lowerFileLimit ||
                curFiles.length > upperFileLimit)) {
                return;
            }

            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(turnOffScrollingFlag, 100);
        });

        function turnOffScrollingFlag() {
            showScrolledFiles();
        }
    }

    function showScrolledFiles(): void {
        $innerContainer.height(getScrollHeight());

        let scrollTop: number = $containerWrapper.scrollTop();
        let startIndex: number;
        let endIndex: number;
        if ($fileBrowserMain.hasClass("gridView")) {
            let visibleRowsBelow: number = 5; // number of rows that have display:block
            let visibleRowsAbove: number = 7;
            let rowNum: number = Math.floor(scrollTop / dsIconHeight) - visibleRowsBelow;

            let filesPerRow = getFilesPerRow();
            let filesBelow: number = rowNum * filesPerRow;

            let numVisibleRows: number = Math.ceil($container.height() / dsIconHeight);

            startIndex = Math.max(0, filesBelow);
            endIndex = startIndex + (filesPerRow *
                    (numVisibleRows + visibleRowsBelow + visibleRowsAbove));
            $container.find(".sizer").show().height(rowNum * dsIconHeight);
        } else {
            let visibleRowsBelow: number = 20;
            let visibleRowsAbove: number = 25;
            let rowNum: number = Math.floor(scrollTop / dsListHeight) - visibleRowsBelow;
            let numVisibleRows: number = Math.ceil($container.height() / dsListHeight);
            startIndex = Math.max(0, rowNum);
            endIndex = startIndex + numVisibleRows + visibleRowsBelow +
                            visibleRowsAbove;
            $container.find(".sizer").show().height(rowNum * dsListHeight);
        }

        $visibleFiles.removeClass("visible");
        $visibleFiles = $container.find(".grid-unit")
                                  .slice(startIndex, endIndex)
                                  .addClass("visible");
        $containerWrapper.scrollTop(scrollTop);
    }

    function getFilesPerRow(): number {
        const scrollBarWidth: number = 11;
        return Math.floor(($containerWrapper.width() - scrollBarWidth) / dsIconWidth);
    }

    function getScrollHeight(): number {
        let scrollHeight: number;
        if ($fileBrowserMain.hasClass('listView')) {
            scrollHeight = Math.max(dsListHeight *
                                    $container.find('.grid-unit').length,
                                    $containerWrapper.height());
        } else {
            let iconsPerRow = getFilesPerRow();
            let rows: number = Math.ceil($container.find('.grid-unit').length / iconsPerRow);
            scrollHeight = rows * dsIconHeight;
            scrollHeight = Math.max(scrollHeight, $containerWrapper.height());
        }

        return scrollHeight;
    }

    function toggleView(
        toListView: boolean,
        noRefreshTooltip: boolean
    ): void {
        let $btn: JQuery = $("#fileBrowserGridView");
        if (toListView == null) {
            // if current is gridView, change to listView;
            toListView = $fileBrowserMain.hasClass("gridView");
        }

        if (toListView) {
            $fileBrowserMain.removeClass("gridView").addClass("listView");
            measureDSListHeight();
            sizeFileNameColumn();
        } else {
            // change to grid view
            $fileBrowserMain.removeClass("listView").addClass("gridView");
            measureDSIcon();
        }

        xcUIHelper.toggleListGridBtn($btn, toListView, noRefreshTooltip);
        if ($container.hasClass("manyFiles")) {
            $innerContainer.height(getScrollHeight());
        } else {
            $innerContainer.height("auto");
        }

        centerUnitIfHighlighted(toListView);
        refreshEllipsis();
        refreshIcon();
    }

    // centers a grid-unit if it is highlighted
    function centerUnitIfHighlighted(isListView: boolean): void {
        let unitHeight: number = isListView ? dsListHeight : dsIconHeight;
        let $unit = $container.find('.grid-unit.active');
        if ($unit.length) {
            let containerHeight: number = $container.height();
            if ($container.hasClass('manyFiles')) {
                let index: number = $unit.index() - 1; // $('.sizer') is at 0 index
                let filesPerRow: number;
                if (isListView) {
                    filesPerRow = 1;
                } else {
                    filesPerRow = getFilesPerRow();
                }
                let row: number = Math.floor(index / filesPerRow);
                $container.addClass('noScrolling');
                $containerWrapper.scrollTop(row * unitHeight - (containerHeight / 2));
                showScrolledFiles();
                // browser's auto scrolling will be triggered here but will
                // return when it finds that $container has class noScrolling;
                setTimeout(function() {
                    $container.removeClass('noScrolling');
                });
            } else {
                let unitOffSetTop = $unit.position().top;
                let scrollTop = $containerWrapper.scrollTop();
                $containerWrapper.scrollTop(scrollTop + unitOffSetTop -
                                    (containerHeight - unitHeight) / 2);
            }
        }
    }

    function getCurrentTarget(): string {
        return $pathSection.find(".targetName").text();
    }

    function getCurrentPath(): string {
        return $pathLists.find("li:first-of-type").text();
    }

    function getGridUnitName($grid: JQuery): string {
        // edge case: null should be "null"
        return String($grid.find('.label').data("name"));
    }

    function setPath(path: string): void {
        path = path || "";
        $pathSection.find(".text").val(path);
    }

    function appendPath(
        path: string,
        noPathUpdate: boolean
    ): void {
        if (!noPathUpdate) {
            setPath(path);
        }
        $pathLists.prepend('<li>' + path + '</li>');
        updateActiveFileInfo(null);
    }

    function cleanContainer(
        options?: {
            keepSelected?: boolean
            removeUnpicked?: boolean
            keepAnchor?: boolean
            keepPicked?: boolean
        }
    ): void {
        options = options || {};
        $container.find(".active").removeClass("active");
        updateActiveFileInfo(null);
        if (!options.keepSelected) {
            var $allGrids;
            if (options.removeUnpicked) {
                $allGrids = $innerContainer.find(".selected:not(.picked)");
            } else {
                $allGrids = $innerContainer.find(".selected");
            }
            $allGrids.each(function() {
                var $grid = $(this);
                $grid.removeClass("selected");
                curFiles[$grid.data("index")].isSelected = false;
            });
        }

        if (!options.keepPicked) {
            togglePickedFiles(null);
            // clearAll flag
            updatePickedFilesList(null, {clearAll: true});
        }
    }

    function redirectHandler(path: string): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        setTimeout(function() {
            // do this because fadeIn has 300 delay,
            // if statusBox show before the fadeIn finish, it will fail
            let error = xcStringHelper.replaceMsg(ErrWRepTStr.NoPath, {
                "path": path
            });
            StatusBox.show(error, $pathSection, false, {side: 'top'});
            deferred.resolve();
        }, 300);

        return deferred.promise();
    }

    function normalizeError(error: any): string {
        try {
            if (error && typeof error === "object" && error.log) {
                const err_str = error.log.toLowerCase();
                if (err_str.includes('no files found')) {
                    return 'No files found';
                } else if (err_str.includes('access denied')) {
                    return 'Access Denied';
                } else if (err_str.includes('s3environ.py')) {
                    return 'Cannot access the S3 bucket';
                }
            }
        } catch (e) {
        }
        return null;
    }

    function loadFailHandler(error: any, path: string): void {
        $pathLists.empty();
        appendPath(path, false);

        console.error(error);
        error = normalizeError(error);
        let msg = xcStringHelper.replaceMsg(ErrWRepTStr.NoPathInLoad, {
            "path": path
        });
        if (error) {
            msg = error;
        }
        let html: HTML =
        '<div class="error">' +
            '<div>' + msg + '</div>' +
            '<div>' + DSTStr.DSSourceHint + '</div>' +
        '</div>';
        $innerContainer.html(html);
        $innerContainer.height("auto");
        $container.removeClass('manyFiles');
        $fileBrowser.removeClass('unsortable').addClass("errorMode");
    }

    function parsePath(path: string): string[] {
        let paths: string[] = [];
        // parse path
        for (let i = path.length - 1; i >= (defaultPath.length - 1); i--) {
            // XXX Does not handle file paths with escaped slashes
            if (path.charAt(i) === "/") {
                paths.push(path.substring(0, i + 1));
            }
        }

        return paths;
    }

    function setTarget(targetName: string): void {
        $pathSection.find(".targetName").text(targetName);
    }

    function setHistoryPath(): void {
        var path = getCurrentPath();
        if (path !== defaultPath) {
            var targetName = getCurrentTarget();
            DSForm.addHistoryPath(targetName, path);
        }
    }

    function deDupFiles(
        targetName: string,
        files: XcFile[]
    ): XcFile[] {
        if (DSTargetManager.isPreSharedTarget(targetName)) {
            let deDupedFiles: XcFile[] = [];
            let nameSet = {};
            files.forEach(function(file) {
                if (!nameSet.hasOwnProperty(file.name)) {
                    nameSet[file.name] = true;
                    deDupedFiles.push(file);
                }
            });
            return deDupedFiles;
        } else {
            return files;
        }
    }

    function addFileExtensionAttr(files: XcFile[]): void {
        files.forEach(function(file) {
            if (!file.attr.isDirectory) {
                file.attr.extension = getFileExtension(file.name);
            }
        });
    }

    function getFileExtension(fileName: string): string {
        let index: number = fileName.lastIndexOf(".");
        if (index === -1) {
            return "";
        } else {
            return fileName.slice(index + 1).toUpperCase();
        }
    }

    function listFiles(path: string, options: any): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $loadSection: JQuery = $fileBrowserMain.find(".loadingSection");
        let $searchLoadingSection: JQuery = $fileBrowserMain.find(".searchLoadingSection");
        let targetName: string = getCurrentTarget();
        let curBrowserId: string = fileBrowserId;
        let curSearchId: string = null;
        if (options) {
            curSearchId = searchId;
        }

        $fileBrowser.addClass("loadMode");
        let timer = setTimeout(function() {
            if (options) {
                // If it's a search
                $searchLoadingSection.show();
            } else {
                $loadSection.show();
            }
        }, 500);

        let args = {
            targetName: targetName,
            path: path,
            recursive: undefined,
            fileNamePattern: undefined
        };
        if (options && options.hasOwnProperty("recursive") &&
                       options.hasOwnProperty("fileNamePattern")) {
            args.recursive = options.recursive;
            args.fileNamePattern = options.fileNamePattern;
        }
        _fetchFileList(args)
        .then((listFilesOutput) => {
            /**
             * {files: XcalarApiFileT[], numFiles: string}
             *
             * XcalarApiFileT {
             *  attr: {isDirectory: true, mtime: 0, size: 0}
             *  name: string
             * }
             */

            if (curBrowserId === fileBrowserId) {
                if (options && curSearchId !== searchId) {
                    // If it is a search but not current search
                    deferred.reject({"error": oldSearchError, "oldSearch": true});
                    return;
                }
                allFiles = deDupFiles(targetName, listFilesOutput.files);
                renderFiles(path, !options);
                deferred.resolve();
            } else {
                deferred.reject({"error": oldBrowserError, "oldBrowser": true});
            }
        })
        .catch(function(error) {
            if (curBrowserId === fileBrowserId) {
                if (options && curSearchId !== searchId) {
                    // If it is a search but not current search
                    deferred.reject({"error": oldSearchError, "oldSearch": true});
                    return;
                }
                deferred.reject(error);
            } else {
                deferred.reject({"error": oldBrowserError, "oldBrowser": true});
            }
        })
        .finally(function() {
            if (curBrowserId === fileBrowserId) {
                if (options && curSearchId !== searchId) {
                    return;
                }
                $fileBrowser.removeClass("loadMode");
                clearTimeout(timer);
                $loadSection.hide();
                $searchLoadingSection.hide();
                searchId = null;
            }
        });

        return deferred.promise();
    }

    function setState(obj) {
        state = {...state, ...obj};
        if (state.isLoading) {
            $fileBrowser.find(".pageBtn").addClass("xc-unavailable");
        } else {
            if (state.offset + PAGE_SIZE <= state.maxOffset) {
                $fileBrowser.find(".pageBtn.next").removeClass("xc-unavailable");
            } else {
                $fileBrowser.find(".pageBtn.next").addClass("xc-unavailable");
            }
            if (state.offset > 0) {
                $fileBrowser.find(".pageBtn.prev").removeClass("xc-unavailable");
            } else {
                $fileBrowser.find(".pageBtn.prev").addClass("xc-unavailable");
            }
        }
    }

    function resetFileCursor() {
        filesCursor = null;
        setState({offset: 0, fileNamePattern: ""});
    }


    function _pageNavigation(forward) {
        if (forward) {
            setState({offset: state.offset + PAGE_SIZE})
            return listFiles(state.path, {fileNamePattern: state.fileNamePattern, recursive: state.fileNamePattern && state.fileNamePattern !== "*"});
        } else {
            setState({offset: Math.max(state.offset - PAGE_SIZE, 0)});
            return listFiles(state.path, {fileNamePattern: state.fileNamePattern, recursive: state.fileNamePattern && state.fileNamePattern !== "*"})
        }
    }

    async function _fetchFileList(args): Promise<any> {
        if (xcGlobal.isLegacyLoad || args.targetName === "Default Shared Root") {
            return XcalarListFiles(args);
        }

        try {
            setState({ isLoading: true });
            let cursorOffset = state.offset || 0;
            cursorOffset = Math.max(0, cursorOffset);
            let fileNamePattern = args.fileNamePattern || state.fileNamePattern || "*";
          // this was stored in the class
            if (filesCursor == null || fileNamePattern !== state.fileNamePattern) {
                filesCursor = LoadServices.S3Service.createListFilesCursor({
                    targetName: args.targetName,
                    path: args.path,
                    fileNamePattern: fileNamePattern,
                    isRecursive: args.recursive || false
                });
                cursorOffset = 0;
                setState({ fileNamePattern: fileNamePattern, offset: 0, maxOffset: Number.MAX_VALUE , path: args.path});
                await filesCursor.preFetch();
            }
            const files = await filesCursor.fetchData({ offset: cursorOffset, count: PAGE_SIZE });
            let fileList = files.map((file) => {
                return {
                    name: file.name,
                    attr: {
                        ...file,
                        isDirectory: file.directory,
                        mtime: file.mtime,
                        size: file.sizeInBytes
                    }
                }
            });
            if (files.length < PAGE_SIZE) {
                setState({ maxOffset: filesCursor.getSize() - 1 });
            }

            const { numFiles, hasMoreFiles } = _getListFileStats();
            setState({numFiles, hasMoreFiles, fileNamePattern});
            _updateNumItems();
            $fileBrowser.find(".pageNumber .text").text(Math.floor(state.offset / PAGE_SIZE) + 1);

            return {files: fileList, numFiles: fileList.length};
        } finally {
            setState({ isLoading: false });
        }
    }

    function _getListFileStats() {
        try {
            return {
                numFiles: filesCursor.getSize(),
                hasMoreFiles: filesCursor.hasMore()
            };
        } catch(_) {
            return {
                count: 0, hasMore: false
            };
        }
    }


    function renderFiles(path: string, toClearSearch: boolean): void {
        cleanContainer({keepPicked: true});
        checkPicked(allFiles, path);
        addFileExtensionAttr(allFiles);
        if (toClearSearch) {
            // If it is not a search, save all files under current path
            curPathFiles = allFiles;
            clearSearch();
        }
        sortFilesBy(sortKey, sortRegEx, false);
        if ($container.find(".picked").length === curFiles.length) {
            checkSelectAll();
        } else {
            uncheckSelectAll();
        }
    }

    function goIntoFolder(): void {
        let $grid = getFocusedGridEle();
        if ($grid.hasClass("folder")) {
            $grid.trigger("dblclick");
        }
    }

    function goUpPath(): void {
        // the second option in pathLists
        let $newPath = $pathLists.find("li").eq(1);
        goToPath($newPath);
    }

    function goToPath($newPath: JQuery): XDPromise<void> {
        // for unit test, use promise
        if ($newPath == null || $newPath.length === 0) {
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if ($pathSection.hasClass("open")) {
            pathDropdownMenu.toggleList($pathSection);
        }

        var oldPath = getCurrentPath();
        var path = $newPath.text();
        resetFileCursor();

        listFiles(path, null)
        .then(function() {
            setPath(path);
            $pathLists.find("li").removeClass("select");
            $newPath.addClass("select");
            // remove all previous siblings
            $newPath.prevAll().remove();

            // find the parent folder and focus on it
            var folder = oldPath.substring(path.length, oldPath.length);
            folder = folder.substring(0, folder.indexOf('/'));
            focusOn(folder);
            checkIfCanGoUp();
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.error !== oldBrowserError) {
                Alert.error(ThriftTStr.ListFileErr, error);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function checkIfCanGoUp(): void {
        if (getCurrentPath() === defaultPath) {
            $("#fileBrowserUp").addClass("disabled");
        } else {
            $("#fileBrowserUp").removeClass("disabled");
        }
    }

    function submitForm($ds: JQuery): void {
        let curDir = getCurrentPath();
        let targetName = getCurrentTarget();
        let size: number = 0;
        let files = [];
        let invalidRegex: boolean = false;
        // load dataset
        if ($ds != null && $ds.length > 0) {
            let fileName = getGridUnitName($ds);
            let path: string = curDir + fileName;
            files.push({
                path: path,
                recursive: false,
                isFolder: false
            });
        } else {
            let $fileList = $fileBrowser.find(".pickedFileList li");
            $fileList.each(function () {
                let $li = $(this);
                let path: string
                if ($li.hasClass("regex")) {
                    path = $li.data("path");
                    let recursive: boolean = $li.find(".checkbox")
                                           .hasClass("checked");
                    recursive = true; // XXX making always true;
                    let searchKey: string = $li.find("input").val();

                    let pattern: string;
                    if (searchKey === "") {
                        invalidRegex = true;
                    } else {
                        try {
                            // Check if it's valid regex
                            new RegExp(searchKey);
                        } catch (e) {
                            invalidRegex = true;
                        }
                        pattern = xcStringHelper.getFileNamePattern(searchKey, true);
                    }
                    if (invalidRegex) {
                        StatusBox.show(ErrTStr.InvalidRegEx, $li.find("input"),
                                       false, {"side": "left"});
                        return;
                    }
                    files.push({
                        path: path,
                        recursive: recursive,
                        fileNamePattern: pattern
                    });
                } else {
                    path = $li.data("fullpath");
                    let recursive: boolean = $li.find(".checkbox")
                                                .hasClass("checked");
                    let isFolder: boolean = ($li.data("type") === "Folder");
                    recursive = isFolder ? true : false; // XXX making always true if it's folder
                    files.push({
                        path: path,
                        recursive: recursive,
                        isFolder: isFolder
                    });
                }
                // Estimate the size of payload to avoid exceeding limits
                size += path.length * 2; // Each char takes 2 bytes
                size += 4 * 2;  // Each boolean takes 4 bytes
            });
        }
        // Check all invalid cases
        if (invalidRegex) {
            return;
        }
        var $confirmBtn = $fileBrowser.find(".confirm");
        if (size > 4000000 || files.length > 128) {
            // If it exceeds payload limits, display an error
            StatusBox.show(ErrTStr.MaxPayload, $confirmBtn, false, {
                "side": "left"
            });
            return;
        }
        if (files.length === 0) {
            // If no file is selected
            StatusBox.show(ErrTStr.InvalidFile, $confirmBtn, false, {
                "side": "left"
            });
            return;
        }
        let multiDS: boolean = $("#fileInfoBottom").find(".switch").hasClass("on");
        let options = {
            "targetName": targetName,
            "files": files,
            "multiDS": multiDS
        };
        setHistoryPath();

        let cb: Function;
        if (_options && _options.cloud) {
            cb = () => CloudFileBrowser.show(true, curDir);
        } else {
            cb = () => FileBrowser.show(targetName, curDir, true);
        }
        DSConfig.show(options, cb, false);
    }

    function searchFiles(
        searchKey: string,
        type: string
    ): XDPromise<void> {
        // for unit test, use promise
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $input = $("#fileBrowserSearch input").removeClass("error");
        if (type == null) {
            $searchDropdown.find("li").removeClass("selected");
        }
        if (searchKey == null) {
            // restore case
            sortFilesBy(sortKey, sortRegEx, true);
            searchInfo = "";
            $container.find(".filePathBottom .content").text(searchInfo);
            return deferred.resolve().promise();
        }
        let fullTextMatch: boolean = false;
        searchInfo = "Searching";
        let origKey: string = searchKey;
        if (type == null) {
            // Do a regular text search
            searchKey = xcStringHelper.escapeRegExp(searchKey);
        } else {
            searchInfo += "(" + type + ")";
            switch (type) {
                case ("regMatch"):
                    fullTextMatch = true;
                    break;
                case ("regContain"):
                    break;
                case ("globMatch"):
                    fullTextMatch = true;
                case ("globContain"):
                    searchKey = xcStringHelper.escapeRegExp(searchKey);
                    searchKey = searchKey.replace(/\\\*/g, ".*")
                                         .replace(/\\\?/g, ".");
                    break;
                default:
                    console.error("File search type not supported");
                    break;
            }
        }
        searchInfo += ": " + getCurrentPath() + origKey;
        $container.find(".filePathBottom .content").text(searchInfo);
        if (fullTextMatch) {
            searchKey = xcStringHelper.fullTextRegExKey(searchKey);
        } else {
            searchKey = xcStringHelper.containRegExKey(searchKey);
        }
        let isValidRegex: boolean = true;
        try {
            // Check if it's valid regex
            new RegExp(searchKey);
        } catch (e) {
            isValidRegex = false;
        }
        let pattern = xcStringHelper.getFileNamePattern(searchKey, true);
        let path = getCurrentPath();
        $("#fileBrowserSearch input").addClass("xc-disabled");
        $innerContainer.hide();

        searchId = xcHelper.randName("search");
        let cancelSearch: boolean = false;
        listFiles(path, {recursive: true, fileNamePattern: pattern})
        .fail(function(error) {
            if (error && (error.oldBrowser || error.oldSearch)) {
                cancelSearch = true;
            } else {
                $input.addClass("error");
                if (isValidRegex) {
                    handleSearchError(ErrTStr.MaxFiles);
                    deferred.reject(ErrTStr.MaxFiles);
                } else {
                    handleSearchError(ErrTStr.InvalidRegEx);
                    deferred.reject(ErrTStr.InvalidRegEx).promise();
                }
            }
        })
        .always(function() {
            if (!cancelSearch) {
                $("#fileBrowserSearch input").removeClass("xc-disabled");
                $innerContainer.show();
                refreshEllipsis();
                if ($searchSection.hasClass("open")) {
                    searchDropdownMenu.toggleList($searchSection);
                }
                deferred.resolve();
            } else {
                deferred.reject(ErrTStr.CancelSearch);
            }
        });
        return deferred.promise();
    }

    function clearSearch(): void {
        searchId = null;
        $("#fileBrowserSearch input").removeClass("error xc-disabled").val("");
        $searchDropdown.find("li").removeClass("selected");
        refreshSearchDropdown("");
        sortRegEx = undefined;
        searchInfo = "";
        $innerContainer.show();
        if ($searchSection.hasClass("open")) {
            searchDropdownMenu.toggleList($searchSection);
        }
    }

    function handleSearchError(error: string): void {
        let html = '<div class="error">' +
                        '<div>' + error + '</div>' +
                    '</div>';
        $innerContainer.html(html);
    }

    function sortAction(
        $option: JQuery,
        isFromSortOption: boolean
    ): void {
        let grid = getFocusGrid();
        let key: string = $option.data("sortkey");

        $option.siblings(".select").each(function() {
            let $currOpt = $(this);
            $currOpt.removeClass("select");
            toggleSortIcon($currOpt.find(".icon").eq(0), true);
        });
        $option.addClass("select");
        toggleSortIcon($option.find(".icon").eq(0), false);

        reverseSort = false;
        sortFilesBy(key, sortRegEx, false);

        if (isFromSortOption) {
            $fileBrowserMain.find(".titleSection .title").each(function() {
                let $title = $(this);
                let $icon = $title.find(".icon").eq(0);
                if ($title.data("sortkey") === key) {
                    $title.addClass("select");
                    toggleSortIcon($icon, false);
                } else {
                    $title.removeClass("select");
                    toggleSortIcon($icon, true);
                }
            });
        } else {
            // mark sort key on li
            $("#fileBrowserSortMenu").find("li").each(function() {
                let $li = $(this);
                if ($li.data("sortkey") === key) {
                    $li.addClass("select");
                } else {
                    $li.removeClass("select");
                }
            });
        }
        // focus on select grid
        focusOn(grid);
        centerUnitIfHighlighted($fileBrowserMain.hasClass('listView'));
    }

    function sortFilesBy(
        key: string,
        regEx: RegExp,
        isRestore: boolean
    ): void {
        if (allFiles.length > upperFileLimit) {
            oversizeHandler();
            return;
        }
        if (isRestore) {
            curFiles = curPathFiles;
        } else {
            curFiles = allFiles;
        }
        if (regEx) {
            sortRegEx = regEx;
            curFiles = filterFiles(curFiles, regEx);
        } else {
            sortRegEx = undefined; // default
        }

        if (key) {
            sortKey = key;
            curFiles = sortFiles(curFiles, key);
        } else {
            sortKey = "name"; // default
        }
        if (reverseSort) {
            curFiles.reverse();
        }
        getHTMLFromFiles(curFiles);
    }

    function oversizeHandler(): void {
        let html = '<div class="error">' +
                    '<div>' + DSTStr.FileOversize + '</div>' +
                   '</div>';
        $innerContainer.html(html);
        $innerContainer.height("auto");
        $container.removeClass('manyFiles');
        $fileBrowser.removeClass('unsortable');
    }

    function filterFiles(files: XcFile[], regEx: RegExp): XcFile[] {
        let result: XcFile[] = [];
        for (let i = 0, len = files.length; i < len; i++) {
            let fileObj = files[i];
            let name = fileObj.name;
            if (regEx.test(name) === true)
            {
                result.push(fileObj);
            }
        }
        return result;
    }

    function sortFiles(files: XcFile[], key: string): XcFile[] {
        let folders: XcFile[] = [];
        let datasets: XcFile[] = [];

        files.forEach(function(file) {
            // folders sort by name
            if (file.attr.isDirectory) {
                folders.push(file);
            } else {
                datasets.push(file);
            }
        });

        if (key === "size") {
            folders.sort(function(a, b) {
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });

            datasets.sort(function(a, b) {
                return (a.attr.size - b.attr.size);
            });
        } else if (key === "cdate") {
            if (!(files.length > 0 && files[0].attr && files[0].attr.ctime)) {
                // If files have no ctime
                return;
            }
            // sort by ctime
            folders.sort(function(a, b) {
                return (a.attr.ctime - b.attr.ctime);
            });
            datasets.sort(function(a, b) {
                return (a.attr.ctime - b.attr.ctime);
            });

        } else if (key === "mdate") {
            // sort by mtime
            folders.sort(function(a, b) {
                return (a.attr.mtime - b.attr.mtime);
            });
            datasets.sort(function(a, b) {
                return (a.attr.mtime - b.attr.mtime);
            });
            files = folders.concat(datasets);
        } else if (key === "type") {
            folders.sort(function(a, b) {
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });
            datasets.sort(function(a, b) {
                if (a.attr.extension === b.attr.extension) {
                    var aName = a.name.toLowerCase();
                    var bName = b.name.toLowerCase();
                    return (aName < bName ? -1 : (aName > bName ? 1 : 0));
                } else {
                    return a.attr.extension < b.attr.extension ? -1 : 1;
                }
            });
        } else {
            // default is sort by name
            folders.sort(function(a, b) {
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });
            datasets.sort(function(a, b) {
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });
        }

        files = folders.concat(datasets);

        return files;
    }

    function reverseFiles(): void {
        let grid = getFocusGrid();
        reverseSort = !reverseSort;
        curFiles.reverse();
        getHTMLFromFiles(curFiles);
        focusOn(grid);
        centerUnitIfHighlighted($fileBrowserMain.hasClass('listView'));
    }

    function focusOn(
        grid: any,
        isAll = false,
        showError = false
    ): void {
        if (grid == null) {
            $lastSelectedFile = null;
            return;
        }

        let str: string;
        let name: string;

        if (typeof grid === "string") {
            name = xcStringHelper.escapeRegExp(grid);
            name = xcStringHelper.escapeDblQuote(name);
            if (isAll) {
                str = '.grid-unit .label[data-name="' + name + '"]';
            } else {
                str = '.grid-unit.folder .label[data-name="' + name + '"]';
            }
        } else {
            name = xcStringHelper.escapeRegExp(grid.name);
            name = xcStringHelper.escapeDblQuote(name);
            let type: string = grid.type;

            if (type == null) {
                str = '.grid-unit' + ' .label[data-name="' + name + '"]';
            } else {
                str = '.grid-unit.' + type + ' .label[data-name="' + name + '"]';
            }
        }

        $container.find(".grid-unit").removeClass("active");
        var $grid = $container.find(str).eq(0).closest('.grid-unit');
        if ($grid.length > 0) {
            selectSingleFile($grid);
            $lastSelectedFile = $grid;

            if ($fileBrowserMain.hasClass("listView")) {
                scrollIconIntoView($grid, false);
            } else {
                scrollIconIntoView($grid, true);
            }
        } else if (name !== "" && showError) {
            showNoFileError();
        }
    }

    function showNoFileError(): void {
        StatusBox.show(ErrTStr.NoFile, $container, false, {side: "top"});
    }

    function getFocusGrid(): {
        name: string,
        type: string
    } | null {
        let $grid = getFocusedGridEle();
        let grid = null;

        if ($grid.length > 0) {
            grid = {
                "name": getGridUnitName($grid),
                "type": $grid.hasClass("folder") ? "folder" : "ds"
            };
        }

        return grid;
    }

    function getFocusedGridEle(): JQuery {
        return $container.find(".grid-unit.active");
    }

    function retrievePaths(
        path: string,
        noPathUpdate: boolean,
        restore: boolean
    ): XDPromise<void> {
        if (restore) {
            // This is a restore case
            setPath(path);
            updateActiveFileInfo(null);
            return PromiseHelper.resolve();
        }
        if (!path.startsWith(defaultPath)) {
            path = defaultPath + path;
        }
        let paths = parsePath(path);
        // cannot parse the path
        if (paths.length === 0) {
            return PromiseHelper.reject({"error": ErrTStr.InvalidFilePath});
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        resetFileCursor();

        listFiles(paths[0], null)
        .then(function() {
            $pathLists.empty();

            for (var j = paths.length - 1; j >= 0; j--) {
                appendPath(paths[j], noPathUpdate);
            }
            // focus on the grid specified by path
            if (path) {
                var name = path.substring(path.lastIndexOf("/") + 1,
                                            path.length);
                focusOn({"name": name}, true, true);
            }
            checkIfCanGoUp();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function genDateHtml(fileTime: number, type: string): HTML {
        let time = moment(fileTime * 1000);
        let date = time.calendar(null, {
            sameElse: 'll LT'
        }) || "-";
        let dateTip = xcTimeHelper.getDateTip(time);
        return '<div class="fileDate ' + type + '">' +
                    '<span ' + dateTip + '>' +
                        date +
                    '</span>' +
                '</div>';

    }
    function getHTMLFromFiles(files: XcFile[]): void {
        let html: HTML = '<div class="sizer"></div>';
            // used to keep file position when
            // files before it are hidden
        let hasCtime: boolean = false;
        let len: number = files.length;
        for (let i = 0; i < len; i++) {
            // fileObj: {name, isSelected, isPicked, attr{isDirectory, size}}
            let fileObj = files[i];
            let isDirectory = fileObj.attr.isDirectory;
            let name = fileObj.name;
            let ctime = fileObj.attr.ctime;
            let mtime = fileObj.attr.mtime; // in unix time
            let isSelected = fileObj.isSelected;
            let isPicked = fileObj.isPicked;
            let isLoading = fileObj.isLoading || false;

            if (isDirectory && (name === '.' || name === '..')) {
                continue;
            }

            let visibilityClass: string = "visible";
            if (len > lowerFileLimit && i > 200) {
                visibilityClass = "";
            }

            let gridClass: string = isDirectory ? "folder" : "ds";
            let classNames: string[] = ["grid-unit", gridClass, visibilityClass];
            let iconClass: string = isDirectory ? "xi-folder" : "xi-documentation-paper";
            let size = isDirectory ? "" :
                        xcHelper.sizeTranslator(fileObj.attr.size) || "N/A";
            let escName = xcStringHelper.escapeDblQuoteForHTML(name);
            let ckBoxClass: string = isPicked ? "xi-ckbox-selected" : "xi-ckbox-empty";
            let waitIcon: string = "";

            if (isSelected) {
                classNames.push("selected");
            }

            if (isPicked) {
                classNames.push("picked");
            }

            if (isLoading) {
                classNames.push("loading");
                waitIcon = '<div class="refreshIcon">' +
                                '<img src="' + paths.waitIcon + '">' +
                            '</div>';
            }

            html +=
            '<div title="' + escName + '" class="' + classNames.join(" ") + '" ' +
                'data-index="' + i + '">' +
                '<div class="checkBox' + (isLoading ? ' xc-disabled' : '') + '">' +
                    '<i class="icon ' + ckBoxClass + '"></i>' +
                '</div>' +
                '<i class="gridIcon icon ' + iconClass + '">' +
                    waitIcon +
                '</i>' +
                '<div class="label fileName" data-name="' + escName + '">' +
                    name +
                '</div>';

            if (ctime) {
                hasCtime = true;
                html += genDateHtml(ctime, "ctime");
            }
            if (mtime) {
                html += genDateHtml(mtime, "mtime");
            }
            if (isLoading && !ctime && !mtime) {
                html += '<div class="fileDate">N/A</div>';
            }
            html += '<div class="fileSize">' + size + '</div></div>';
        }

        // this is faster than $container.html

        if (len === 0) {
            var emptyMsg = searchId == null ?
                           DSTStr.EmptyDirectory : DSTStr.EmptySearch;
            html += '<div class="hint">' + emptyMsg + '</div>';
        }
        document.getElementById('innerFileBrowserContainer').innerHTML = html;
        refreshEllipsis();
        refreshIcon();

        if (!hasCtime) {
            // Hide "Date Created" if the returned file obj has no such info
            $fileBrowser.find(".cdate:not(.fileInfo)").addClass("hideCdate");
            $("#fileBrowserSortMenu").find(".cdate").hide();
        } else {
            $fileBrowser.find(".cdate:not(.fileInfo)").removeClass("hideCdate");
            $("#fileBrowserSortMenu").find(".cdate").show();
        }

        if (len > lowerFileLimit) {
            $visibleFiles = $container.find('.visible');
            $container.addClass('manyFiles');
            $innerContainer.height(getScrollHeight());
            showScrolledFiles();
        } else {
            $visibleFiles = $();
            $container.removeClass('manyFiles');
            $innerContainer.height("auto");
        }

        if (len > sortFileLimit) {
            $fileBrowser.addClass('unsortable');
        } else {
            $fileBrowser.removeClass('unsortable');
        }
        sizeFileNameColumn();

    }

    function sizeFileNameColumn(): void {
        let containerWidth = $fileBrowserMain.find(".titleSection").width();
        let fileNameWidth = $fileBrowserMain.find(".titleSection")
                                            .find(".fileName").outerWidth();
        let fileNamePct = 100 * (fileNameWidth + 20 ) / containerWidth;
        let siblingPct = (100 - fileNamePct) / 2;
        $innerContainer.find(".fileName").css("width", "calc(" + fileNamePct +
                                              "% - 20px)");
        $innerContainer.find(".fileDate, .fileSize").css("width", "calc(" +
                                                    siblingPct + "% - 20px)");
    }

    function refreshIcon(): void {
        let isListView: boolean = $fileBrowserMain.hasClass("listView");
        $container.find(".grid-unit.ds").each(function() {
            let $grid = $(this);
            let $icon = $grid.find(".gridIcon");
            let name = getGridUnitName($grid);
            let fileType = xcHelper.getFormat(name);
            if (fileType && listFormatMap.hasOwnProperty(fileType) &&
                gridFormatMap.hasOwnProperty(fileType)) {
                $icon.removeClass();
                $icon.addClass("gridIcon icon");
                if (isListView) {
                    // Change icons to listView version
                    $icon.addClass(listFormatMap[fileType]);
                } else {
                    // Change icons to gridView version
                    $icon.addClass(gridFormatMap[fileType]);
                }
            }
        });
    }

    function refreshEllipsis(): void {
        // do not use middle ellipsis if too many files, it's slow
        if (curFiles.length > lowerFileLimit) {
            return;
        }

        // note: we are handling listView width as static when the modal width
        // is not static
        let isListView: boolean = $fileBrowserMain.hasClass("listView");
        const maxChar: number = isListView ? 40 : 8;
        const maxWidth: number = isListView ? $innerContainer.find(".fileName").width() : 52;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = isListView ? '700 12px Open Sans' : '700 9px Open Sans';

        $innerContainer.find(".grid-unit").each(function() {
            let $grid = $(this);
            let $label = $grid.find(".label").eq(0);
            let name = getGridUnitName($grid);
            let ellipsis = xcHelper.middleEllipsis(name, $label, maxChar,
                                                   maxWidth, !isListView, ctx);
            toggleTooltip($label, name, ellipsis);
        });
    }
    function refreshFileListEllipsis(
        $fileName: JQuery,
        hasRegex: boolean
    ): void {
        const maxChar: number = hasRegex? 20 : 30;
        const maxWidth: number = hasRegex? 160 : 240;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = '700 13px Open Sans';
        let ellipsis: boolean = false;
        let name: string = $fileName.text();
        if ($fileName && $fileName.length > 0) {
            ellipsis = xcHelper.middleEllipsis(name, $fileName, maxChar,
                                               maxWidth, false, ctx);
            toggleTooltip($fileName, name, ellipsis);
        } else {
            $pickedFileList.find("span").each(function() {
                let $span = $(this);
                name = $span.text();
                ellipsis = xcHelper.middleEllipsis(name, $span, maxChar,
                                                   maxWidth, false, ctx);
                toggleTooltip($span, name, ellipsis);
            });
        }
    }

    function refreshFilePathEllipsis(emptyTooltip: boolean): void {
        let $path = $container.find(".filePathBottom .content");

        if (emptyTooltip) {
            xcTooltip.remove($path);
        }

        let name: string = $path.attr("data-original-title") || $path.text();
        const maxChar: number = 38;
        let maxWidth = $path.parent().width();

        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        ctx.font = '700 13px Open Sans';
        let ellipsis: boolean = false;
        ellipsis = xcHelper.middleEllipsis(name, $path, maxChar,
                                           maxWidth, false, ctx);
        toggleTooltip($path, name, ellipsis);
    }

    function toggleTooltip(
        $text: JQuery,
        name: string,
        isEllipsis: boolean
    ): void {
        // GridView may have different ellipsis than listView
        if (isEllipsis) {
            xcTooltip.add($text, {title: name});
        } else {
            xcTooltip.remove($text);
        }
    }

    function addKeyBoardEvent(): void {
        let fileNavigator: any = createFileNavigator();

        $(document).on("keydown.fileBrowser", function(event) {
            // up to parent folder
            let $target = $(event.target);
            let code = event.which;
            let $lastTarget = gMouseEvents.getLastMouseDownTarget();
            let $lastTargetParents = gMouseEvents.getLastMouseDownParents();

            hideBrowserMenu();
            let $activeEl = $(document.activeElement);
            if ($fileBrowser.is(":visible") && !$activeEl.is("textarea") &&
                !$activeEl.is("input")) {
                // file browser is visible and there's no cursor in an input so
                // we assume user is trying to navigate folders
            } else if ($target.is("input") ||
                ($lastTarget != null &&
                $lastTarget.length > 0 &&
                !$lastTargetParents.filter("#fileBrowser").length &&
                !$lastTargetParents.filter("#dsForm-path").length &&
                !$lastTargetParents.filter("#importDataForm").length))
            {
                // last click did not come from fileBrowser, dsFormPath, or
                // importData form
                // input does trigger keyboard event
                return true;
            } else {
                // Should always return true, in case fileBrowser is invisible
                // Is this true?

                // hack for text areas in importData form
                if ($target.is('textarea') &&
                    $lastTarget != null &&
                    $lastTargetParents.filter('#importDataForm').length) {
                    return true;
                }
            }

            if (code === keyCode.Backspace) {
                goUpPath();
                return false;
            }

            if (code === keyCode.Enter) {
                var $grid = getFocusedGridEle();
                $grid.trigger("dblclick");
                return false;
            }

            if (isSystemMac && event.metaKey ||
                !isSystemMac && event.altKey)
            {
                if (code === keyCode.Up ||
                    code === keyCode.Down) {
                    keyBoardInBackFolder(code);
                }
            } else if (code === keyCode.Left ||
                code === keyCode.Right ||
                code === keyCode.Up ||
                code === keyCode.Down) {
                keyBoardNavigate(code, event);
            } else {
                let file = fileNavigator.navigate(code, curFiles);
                if (file != null) {
                    // Clean selected files in browser
                    cleanContainer({keepPicked: true});
                    focusOn(file, true);
                }
            }
        });
    }

    function addResizeEvent(): void {
        let timeout;
        $(window).on("resize.fileBrowserResize", function() {
            refreshFilePathEllipsis(false);
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                if ($container.hasClass("manyFiles")) {
                    showScrolledFiles();
                }
            }, 400);
        });
    }

    // A singleton to do file search
    function createFileNavigator(): void {
        return new FileNavigator();

        function FileNavigator() {
            let self = this;
            self.timer = null;
            self.searchString = "";
            self.navigate = function(code, files) {
                var c = String.fromCharCode(code).toLowerCase();
                var fileName = null;

                if (c >= 'a' && c <= 'z' ||
                    c >= '0' && c <= '9') {
                    self.searchString += c;

                    // use .some so that when it's true, can stop loop
                    files.some(function(file) {
                        var name = file.name;
                        if (name.toLowerCase().startsWith(self.searchString)) {
                            // filename do not use lowercase, otherwise
                            // search may fail in focusOn();
                            fileName = name;
                            return true;
                        }

                        return false;
                    });

                    if (fileName == null) {
                        self.searchString = "";
                    }
                } else {
                    // invalid char, empty the search str
                    self.searchString = "";
                }

                clearTimeout(self.timer);
                self.timer = setTimeout(function() {
                    // when timeOut, reset the search string
                    self.searchString = "";
                }, 1000);

                return fileName;
            };
        }
    }

    function keyBoardInBackFolder(code: number): void {
        if (code === keyCode.Up) {
            goUpPath();
        } else if (code === keyCode.Down) {
            goIntoFolder();
        }
    }

    function keyBoardNavigate(code: number, event): void {
        let $nextIcon;
        let $curIcon = $container.find('.grid-unit.active');
        if (!$curIcon.length) {
            $container.find('.grid-unit:visible').eq(0).click();
            return;
        }
        let isGridView: boolean = $fileBrowserMain.hasClass("gridView");
        if (isGridView) {
            if (code === keyCode.Left) {
                $nextIcon = $curIcon.prev();
            } else if (code === keyCode.Right) {
                $nextIcon = $curIcon.next();
            } else if (code === keyCode.Up || code === keyCode.Down) {
                $nextIcon = findVerticalIcon($curIcon, code);
            }
        } else {
            if (code === keyCode.Down) {
                $nextIcon = $curIcon.next();
            } else if (code === keyCode.Up) {
                $nextIcon = $curIcon.prev();
            }
        }
        if ($nextIcon && $nextIcon.length && !$nextIcon.hasClass('sizer')) {
            $nextIcon.click();
            scrollIconIntoView($nextIcon, isGridView);
            event.preventDefault();
        }
    }

    function findVerticalIcon($curIcon: JQuery, code: number): JQuery {
        let $targetIcon: JQuery;
        let curIndex: number = $curIcon.index() - 1; // .sizer is at 0 index
        let containerWidth = $innerContainer.width();
        let gridsPerRow = Math.floor(containerWidth / dsIconWidth);
        if (code === keyCode.Up) {
            let newIndex: number = curIndex - gridsPerRow;
            if (newIndex < 0) {
                $targetIcon = $curIcon;
            } else {
                $targetIcon = $innerContainer.find('.grid-unit')
                                         .eq(curIndex - gridsPerRow);
            }
        } else if (code === keyCode.Down) {

            $targetIcon = $innerContainer.find('.grid-unit')
                                         .eq(curIndex + gridsPerRow);
            if (!$targetIcon.length) {
                // when there isn't an icon directly below
                $targetIcon = $innerContainer.find('.grid-unit').last();
                // pick the last icon of the last row, unless it's on the same
                // row (position().top === curIconTop)
                var curIconTop = $curIcon.position().top;
                if ($targetIcon.length &&
                    $targetIcon.position().top === curIconTop)
                {
                    $targetIcon = $curIcon;
                }
            }
        }
        return $targetIcon;
    }

    function scrollIconIntoView($icon: JQuery, isGridView: boolean): void {
        let iconHeight: number = isGridView ? dsIconHeight : dsListHeight;
        let containerHeight = $containerWrapper.height();
        let scrollTop = $containerWrapper.scrollTop();

        if ($container.hasClass('manyFiles')) {
            let index: number = $icon.index() - 1; // .sizer is at 0
            let filesPerRow: number;
            if (isGridView) {
                filesPerRow = getFilesPerRow();
            } else {
                filesPerRow = 1;
            }
            let containerBottom: number = scrollTop + containerHeight;

            let row: number = Math.floor(index / filesPerRow);
            let iconPosition: number = row * iconHeight;

            let newScrollTop: number;
            if (iconPosition < scrollTop) {
                newScrollTop = row * iconHeight;
            } else if (iconPosition + iconHeight > containerBottom) {
                newScrollTop = (row * iconHeight) - containerHeight + iconHeight;
            }

            if (newScrollTop != null) {
                $container.addClass('noScrolling');

                $containerWrapper.scrollTop(newScrollTop);
                showScrolledFiles();
                // browser's auto scrolling will be triggered here
                // but will return when it finds that $container
                // has class noScrolling;
                setTimeout(function() {
                    $container.removeClass('noScrolling');
                });
            }
        } else {
            let iconOffsetTop: number = $icon.position().top;
            let iconBottom: number = iconOffsetTop + iconHeight;

            if (iconBottom > containerHeight) {
                $containerWrapper.scrollTop(scrollTop + (iconBottom - containerHeight));
            } else if (iconOffsetTop < 0) {
                $containerWrapper.scrollTop(scrollTop + iconOffsetTop);
            }
        }

    }

    function measureDSIcon(): void {
        if (!$fileBrowserMain.hasClass("gridView")) {
            return;
        }
        let $grid = $container.find(".grid-unit").eq(0);
        let iconHeight = $grid.outerHeight();
        if (iconHeight) {
            dsIconHeight = iconHeight +
                           parseInt($grid.css('margin-top')) +
                           parseInt($grid.css('margin-bottom'));
            dsIconWidth = $grid.outerWidth() +
                           parseInt($grid.css('margin-left')) +
                           parseInt($grid.css('margin-right'));
        }
    }

    function measureDSListHeight(): void {
        if (!$fileBrowserMain.hasClass("listView")) {
            return;
        }
        let $grid = $container.find(".grid-unit").eq(0);
        let iconHeight = $grid.outerHeight();
        if (iconHeight) {
            dsListHeight = iconHeight +
                           parseInt($grid.css('margin-top')) +
                           parseInt($grid.css('margin-bottom'));
        }
    }

    function isDS($grid: JQuery): boolean {
        return $grid.hasClass("ds");
    }

    function previewDS(fileName): void {
        RawFileModal.Instance.show({
            targetName: getCurrentTarget(),
            path: getCurrentPath() + fileName,
            fileName
        });
    }

    function toggleSortIcon($icon: JQuery, restoreDefault: boolean): void {
        if (restoreDefault) {
            // If restore to non-sorted
            $icon.removeClass("xi-arrow-up xi-arrow-down fa-8");
            $icon.addClass("xi-sort fa-15");
        } else if ($icon.hasClass("xi-arrow-up")) {
            // ascending > descending
            $icon.removeClass("xi-sort xi-arrow-up fa-15");
            $icon.addClass("xi-arrow-down fa-8");
        } else {
            // Two cases: 1.first time sort & 2.descending > ascending
            $icon.removeClass("xi-sort xi-arrow-down fa-15");
            $icon.addClass("xi-arrow-up fa-8");
        }
    }

    function _updateNumItems() {
        const $fileInfoTop = $infoContainer.find(".fileInfoTop");
        let numItems;
        if (isS3) {
            numItems = xcStringHelper.numToStr(state.numFiles);
            if (state.hasMoreFiles) {
                numItems += "+";
            }
        } else {
            numItems = xcStringHelper.numToStr(curFiles.length);
        }

        $fileInfoTop.find(".numItems .content").text(numItems);
    }

    function updateActiveFileInfo($grid: JQuery): void {
        const $fileInfoTop = $infoContainer.find(".fileInfoTop");
        if (!$grid) {
            $fileInfoTop.addClass("pathInfoMode");
            if (searchInfo) {
                $fileInfoTop.find(".path .label").text("Searching:");
            } else {
                $fileInfoTop.find(".path .label").text("Location:");
            }
            // &lrm; is used to fix direction: rtl issue where slashes get moved
            const path = xcStringHelper.escapeHTMLSpecialChar(getCurrentPath());
            $fileInfoTop.find(".path .content").html("&lrm;" + path + "&lrm;");
            _updateNumItems();
            return;
        }
        $fileInfoTop.removeClass("pathInfoMode");
        var index = Number($grid.data("index"));
        var file = curFiles[index];
        var name = file.name;
        var path = getCurrentPath() + name;
        let mTime  = "- -";
        if (file.attr.mtime) {
            mTime = moment(file.attr.mtime * 1000).format("h:mm:ss A ll");
        }
        // var cTime = file.attr.ctime ?
        //             moment(file.attr.ctime * 1000).format("h:mm:ss A ll") :
        //             "--";
        var isFolder = file.attr.isDirectory;
        const size: string = isFolder ? "--" : <string>xcHelper.sizeTranslator(file.attr.size);
        var fileType = isFolder ? "Folder" : xcHelper.getFormat(name);
        var $fileIcon = $infoContainer.find(".fileIcon").eq(0);
        // Update file name & type
        if (name.length > 30) {
            name = name.substring(0, 30) + "...";
        }
        $infoContainer.find(".fileName").text(name);
        if (!fileType) {
            // Unknown type
            fileType = "File";
        }
        $infoContainer.find(".fileType").text(fileType);
        // Update file icon
        $fileIcon.removeClass();
        if (isFolder) {
            $fileIcon.addClass("xi-folder");
            $infoContainer.find(".fileRawData").addClass("xc-hidden");
            $infoContainer.find(".folderNumItems").removeClass("xc-hidden");
        }
        else {
            $infoContainer.find(".fileRawData").removeClass("xc-hidden");
            $infoContainer.find(".folderNumItems").addClass("xc-hidden")
            if (fileType && listFormatMap.hasOwnProperty(fileType) &&
                gridFormatMap.hasOwnProperty(fileType)) {
                $fileIcon.addClass(gridFormatMap[fileType]);
            }
            else {
                $fileIcon.addClass("xi-documentation-paper");
            }
        }
        $fileIcon.addClass("icon fileIcon");
        // Update file info
        $infoContainer.find(".mdate .content").text(mTime);
        // $infoContainer.find(".cdate .content").text(cTime);
        $infoContainer.find(".fileSize .content").text(size);
        // Update bottom file path
        $container.find(".filePathBottom .content").text(path);
        refreshFilePathEllipsis(true);
    }


    function selectMultiFiles($curActiveGrid: JQuery): void {
        // Select but not pick
        let startIndex: number;
        if (!$lastSelectedFile) {
            startIndex = 0;
        } else {
            startIndex = $lastSelectedFile.data("index");
        }
        let endIndex: number = $curActiveGrid.data("index");
        let $grids: JQuery;
        if (startIndex > endIndex) {
            $grids = $container.find(".grid-unit")
                               .slice(endIndex, startIndex + 1);
        } else {
            $grids = $container.find(".grid-unit").slice(startIndex, endIndex);
        }
        $grids.each(function() {
            let $cur = $(this);
            $cur.addClass("selected");
            curFiles[$cur.data("index")].isSelected = true;
        });

        $curActiveGrid.addClass('active selected');
        curFiles[$curActiveGrid.data("index")].isSelected = true;
        updateActiveFileInfo($curActiveGrid);
    }

    function deselectMultiFiles($curActiveGrid: JQuery): void {
        // Select but not pick
        let startIndex: number;
        if (!$lastSelectedFile) {
            startIndex = 0;
        } else {
            startIndex = $lastSelectedFile.data("index");
        }
        let endIndex: number = $curActiveGrid.data("index");
        let $grids: JQuery;
        if (startIndex > endIndex) {
            $grids = $container.find(".grid-unit")
                               .slice(endIndex, startIndex + 1);
        } else {
            $grids = $container.find(".grid-unit").slice(startIndex, endIndex);
        }
        let path = getCurrentPath();
        let escPath = xcStringHelper.escapeDblQuote(path);
        $grids.each(function() {
            let $cur = $(this);
            $cur.removeClass("picked selected");
            curFiles[$cur.data("index")].isSelected = false;
            curFiles[$cur.data("index")].isPicked = false;
            uncheckCkBox($cur.find(".checkBox .icon"));
            let name = getGridUnitName($cur);
            let escName = xcStringHelper.escapeDblQuote(name);
            let isFolder: boolean = $cur.hasClass("folder");
            let fullPath = getFullPath(escPath + escName, isFolder);
            $pickedFileList.find('li[data-fullpath="' + fullPath + '"]').remove();
        });


        $curActiveGrid.addClass('active');
        $curActiveGrid.removeClass('picked selected');
        curFiles[$curActiveGrid.data("index")].isSelected = false;
        curFiles[$curActiveGrid.data("index")].isPicked = false;
        uncheckCkBox($curActiveGrid.find(".checkBox .icon"));
        let name = getGridUnitName($curActiveGrid);
        let escName = xcStringHelper.escapeDblQuote(name);
        let isFolder: boolean = $curActiveGrid.hasClass("folder");
        let fullpath = getFullPath(escPath + escName, isFolder);
        $pickedFileList.find('li[data-fullpath="' + fullpath + '"]').remove();
        updateActiveFileInfo($curActiveGrid);
        updateFileCount();
    }


    function getFullPath(path: string, isFolder: boolean): string {
        return isFolder ? path + '/' : path;
    }

    function createListElement($grid: JQuery): HTML {
        // e.g. path can be "/netStore" and name can be "/datasets/test.txt"
        let curDir = getCurrentPath();
        let escDir = xcStringHelper.escapeDblQuoteForHTML(curDir);
        if ($grid != null) {
            let index: number = $grid.data("index");
            let file = curFiles[index];
            file.isPicked = true;
            let name = file.name;
            let escName = xcStringHelper.escapeDblQuoteForHTML(name);
            let isFolder = file.attr.isDirectory;
            let fileType: string = isFolder ? "Folder" : xcHelper.getFormat(name);
            let fullPath = getFullPath(escDir + escName, isFolder);
            let displayPath = getFullPath(curDir + name, isFolder);

            return '<li data-name="' + escName + '"' +
                   ' data-fullpath="' + fullPath + '"' +
                   ' data-type="' + fileType + '">' +
                        '<span class="text">' + displayPath + '</span>' +
                        '<span class="close xc-action">' +
                            '<i class="icon xi-trash"></i>' +
                        '</span>' +
                    '</li>';
        } else {
            // For the case where we add input box for regex
            return '<li class="regex" data-path="' + escDir + '">' +
                        '<span class="text">' + curDir + '</span>' +
                        '<input class="xc-input" value=".*$"></input>' +
                        '<span class="close xc-action">' +
                            '<i class="icon xi-trash"></i>' +
                        '</span>' +
                    '</li>';
        }
    }

    function updatePickedFilesList(
        $grid: JQuery,
        options: {
            clearAll?: boolean
            isRemove?: boolean
        }
    ): void {
        options = options || {};
        let path = getCurrentPath();
        let escPath = xcStringHelper.escapeDblQuote(path);
        if (options.clearAll) {
            $pickedFileList.empty();
        } else if (!$grid || $grid.length === 0) {
            // Multiple files
            $innerContainer.find(".grid-unit.selected").each(function() {
                let $ele = $(this);
                let name = getGridUnitName($ele);
                let escName = xcStringHelper.escapeDblQuote(name);
                let isFolder: boolean = $ele.hasClass("folder");
                let fullpath = getFullPath(escPath + escName, isFolder);
                if (options.isRemove) {
                    $pickedFileList.find('li[data-fullpath="' + fullpath + '"]').remove();
                } else if ($pickedFileList.find('li[data-fullpath="' + fullpath + '"]').length === 0) {
                    // If it doesn't exist, append the file
                    let html = createListElement($ele);
                    let $span = $(html).appendTo($pickedFileList).find(".text");
                    refreshFileListEllipsis($span, false);
                }
            });
        } else {
            // Single file
            let name = getGridUnitName($grid);
            let escName = xcStringHelper.escapeDblQuote(name);
            let isFolder: boolean = $grid.hasClass("folder");
            let fullpath = getFullPath(escPath + escName, isFolder);
            if (options && options.isRemove) {
                $pickedFileList.find('li[data-fullpath="' + fullpath + '"]').remove();
            } else if ($pickedFileList.find('li[data-fullpath="' + fullpath + '"]').length === 0) {
                // If it doesn't exist, append the file
                let html = createListElement($grid);
                let $span = $(html).appendTo($pickedFileList).find(".text");
                refreshFileListEllipsis($span, false);
            }
        }
        updateButtons();
        updateSelectAll();
        updateFileCount();
    }

    function updateSelectAll(): void {
        let $checkbox = $infoContainer.find(".selectAll");
        if ($infoContainer.find("li .checkbox:not(.xc-disabled)").length === 0) {
            $checkbox.removeClass("checked");
            return;
        }
        let $unchecked = $infoContainer.find("li .checkbox:not(.checked):not(.xc-disabled)");
        if ($unchecked.length === 0) {
            // all checked
            $checkbox.addClass("checked");
        } else {
            $checkbox.removeClass("checked");
        }
    }

    function updateButtons(): void {
        let len = $pickedFileList.find("li").length;
        let $switch = $infoContainer.find(".switch").eq(0);
        // Enable / disable switch
        if (len === 0 || len === 1) {
            if ($switch.hasClass("on")) {
                $switch.removeClass("on");
                $switch.next().removeClass("highlighted");
                $switch.prev().addClass("highlighted");
            }
            $switch.closest(".switchWrap").addClass("xc-disabled");
        } else {
            $switch.closest(".switchWrap").removeClass("xc-disabled");
        }
        // Enable / disable buttons
        if (len === 0) {
            $infoContainer.find(".fileInfoBottom .confirm").addClass("xc-disabled");
        } else {
            $infoContainer.find(".fileInfoBottom .confirm").removeClass("xc-disabled");
        }
    }

    function selectSingleFile($grid: JQuery): void {
        $grid.addClass('active selected');
        if ($grid.data("index") != null) {
            curFiles[$grid.data("index")].isSelected = true;
            updateActiveFileInfo($grid);
        }
    }

    function unselectSingleFile($grid: JQuery): void {
        if ($grid.length > 0) {
            curFiles[$grid.data("index")].isSelected = false;
            if ($grid.hasClass("active")) {
                // If it is an active file, remove file info
                updateActiveFileInfo(null);
            }
            $grid.removeClass("selected active picked");
            // A picked file must be a selected file. So we unpick when unselect
            curFiles[$grid.data("index")].isPicked = false;
            uncheckCkBox($grid.find(".checkBox .icon"));
            updatePickedFilesList($grid, {isRemove: true});
        }
    }

    function checkCkBox($checkBox: JQuery): void {
        $checkBox.removeClass("xi-ckbox-empty").addClass("xi-ckbox-selected");
    }

    function uncheckCkBox($checkBox: JQuery): void {
        $checkBox.removeClass("xi-ckbox-selected").addClass("xi-ckbox-empty");
    }

    function checkSelectAll() {
        const $checkbox = $fileBrowser.find(".titleSection .selectAll .icon");
        $checkbox.removeClass("xi-ckbox-empty").addClass("xi-ckbox-selected");
    }

    function uncheckSelectAll() {
        const $checkbox = $fileBrowser.find(".titleSection .selectAll .icon");
        $checkbox.removeClass("xi-ckbox-selected").addClass("xi-ckbox-empty");
    }

    function updateFileCount(): void {
        const numSelectedFiles = $infoContainer.find("li").length;
        const num = xcStringHelper.numToStr(numSelectedFiles);
        const text = numSelectedFiles === 1 ? (num + " item selected") : (num + " items selected");
        $infoContainer.find(".numSelectedFiles").text(text);
    }

    function togglePickedFiles($grid: JQuery): void {
        let $allSelected = $innerContainer.find(".grid-unit.selected");
        if (!$grid) {
            // For the case when we clear all
            $allSelected = $innerContainer.find(".grid-unit.picked");
        }
        if (!$grid || $grid.hasClass("picked")) {
            $allSelected.each(function() {
                let $cur = $(this);
                $cur.removeClass("picked");
                curFiles[$cur.data("index")].isPicked = false;
            });
            uncheckCkBox($allSelected.find(".checkBox .icon"));

        } else {
            $allSelected.each(function() {
                let $cur = $(this);
                $cur.addClass("picked");
                curFiles[$cur.data("index")].isPicked = true;
            });
            checkCkBox($allSelected.find(".checkBox .icon"));
        }
        if (($container.find(".picked").length === curFiles.length) && curFiles.length > 0) {
            checkSelectAll();
        } else {
            uncheckSelectAll();
        }
    }

    function checkPicked(files: XcFile[], path: string): void {
        // Can be optimized later
        let escPath = xcStringHelper.escapeDblQuote(path);
        for (let i = 0; i < files.length; i++) {
            let name = files[i].name;
            let escName = xcStringHelper.escapeDblQuote(name);
            let isFolder = files[i].attr.isDirectory;
            let fullPath = getFullPath(escPath + escName, isFolder);
            if (name !== "\\" &&
                $pickedFileList.find('li[data-fullpath="' + fullPath +
                                 '"]').length > 0) {
                files[i].isPicked = true;
            }
        }
    }

    function startColResize($el: JQuery, event: any): void {
        dragInfo.$header = $el.closest(".title");
        dragInfo.$header.addClass("dragging");
        dragInfo.$headerSiblings = $fileBrowserMain.find(".titleSection").find(".mdate, .fileSize");
        dragInfo.$bodyCols = $innerContainer.find(".fileName");
        dragInfo.$bodySiblings = $innerContainer.find(".fileDate, .fileSize");

        event.preventDefault();
        dragInfo.mouseStart = event.pageX;
        dragInfo.startWidth = dragInfo.$header.outerWidth();
        dragInfo.containerWidth = $fileBrowserMain.find(".titleSection").width();
        dragInfo.minWidth = 80;
        dragInfo.maxWidth = dragInfo.containerWidth - 200;

        let cursorStyle = '<div id="resizeCursor"></div>';
        $('body').addClass('tooltipOff').append(cursorStyle);
        $(document).on('mousemove.onColResize', onColResize);
        $(document).on('mouseup.endColResize', endColResize);
    }

    function onColResize(event: any): void {
        let newWidth = (event.pageX - dragInfo.mouseStart) + dragInfo.startWidth;
        newWidth = Math.min(dragInfo.maxWidth, Math.max(newWidth, dragInfo.minWidth));
        let pct = 100 * (newWidth + 20) / dragInfo.containerWidth;
        let siblingPct = (100 - pct) / 2;
        dragInfo.$header.css("width", "calc(" + pct + "% - 20px)");
        dragInfo.$bodyCols.css("width", "calc(" + pct + "% - 20px)");
        dragInfo.$headerSiblings.css("width", "calc(" + siblingPct + "% - 20px)");
        dragInfo.$bodySiblings.css("width", "calc(" + siblingPct + "% - 20px)");
    }

    function endColResize(): void {
        dragInfo.$header.removeClass("dragging");
        dragInfo = {};
        $(document).off('mousemove.onColResize');
        $(document).off('mouseup.endColResize');
        $('#resizeCursor').remove();
        $('body').removeClass('tooltipOff');
        $('.tooltip').remove();
        refreshEllipsis();
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.getCurFiles = function() {
            return curFiles;
        };
        __testOnly__.setCurFiles = function(files) {
            curFiles = files;
        };
        __testOnly__.setTarget = setTarget;
        __testOnly__.getCurrentTarget = getCurrentTarget;
        __testOnly__.getCurrentPath = getCurrentPath;
        __testOnly__.getGridUnitName = getGridUnitName;
        __testOnly__.appendPath = appendPath;
        __testOnly__.filterFiles = filterFiles;
        __testOnly__.sortFiles = sortFiles;
        __testOnly__.goToPath = goToPath;
        __testOnly__.focusOn = focusOn;
        __testOnly__.isDS = isDS;
        __testOnly__.previewDS = previewDS;
        __testOnly__.showPathError = showPathError;
        __testOnly__.findVerticalIcon = findVerticalIcon;
        __testOnly__.redirectHandler = redirectHandler;
        __testOnly__.oversizeHandler = oversizeHandler;
        __testOnly__.submitForm = submitForm;
        __testOnly__.showScrolledFiles = showScrolledFiles;
        __testOnly__.applySearchPattern = applySearchPattern;
        __testOnly__.selectMultiFiles = selectMultiFiles;
        __testOnly__.selectSingleFile = selectSingleFile;
        __testOnly__.unselectSingleFile = unselectSingleFile;
        __testOnly__.updatePickedFilesList = updatePickedFilesList;
        __testOnly__.togglePickedFiles = togglePickedFiles;
        __testOnly__.checkPicked = checkPicked;
        __testOnly__.getHTMLFromFiles = getHTMLFromFiles;
        __testOnly__.searchFiles = searchFiles;
        __testOnly__.startColResize = startColResize;
        __testOnly__.onColResize = onColResize;
        __testOnly__.endColResize = endColResize;
        __testOnly__.getDragInfo = function() {
            return dragInfo;
        };

    }
    /* End Of Unit Test Only */
}
