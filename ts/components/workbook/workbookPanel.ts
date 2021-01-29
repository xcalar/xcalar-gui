namespace WorkbookPanel {
    let $workbookPanel: JQuery; // $("#workbookPanel")
    let $workbookSection: JQuery; // $workbookPanel.find(".bottomSection")
    let $wkbkMenu: JQuery; //$workbookPanel.find("#wkbkMenu")
    let sortkey: string = "modified";
    let sortAsc: boolean = true;
    const newBoxSlideTime: number = 700;
    let $fileUpload: JQuery;
    let $dropDownCard: JQuery;   //stores the most recently clicked parent of the dropDown Menu

    let downloadingWKBKs: string[];
    let duplicatingWKBKs: string[];
    let hasSetup = false;

    /**
    * WorkbookPanel.setup
    * initial set up variables and event listeners
    */
    export function setup(): void {
        if (hasSetup) {
            return;
        }
        hasSetup = true;
        $workbookPanel = $("#workbookPanel");
        $workbookSection = $workbookPanel.find(".bottomSection");
        $fileUpload = $("#WKBK_uploads");
        $wkbkMenu = $workbookPanel.find("#wkbkMenu");
        xcMenu.add($wkbkMenu);
        downloadingWKBKs = [];
        duplicatingWKBKs = [];

        _renderHeader();
        addWorkbookEvents();
        setupDragDrop();

        let closeTimer: number = null;
        let doneTimer: number = null;
        // open or close workbook view
        $("#projectTab").click(function() {
            if (!WorkbookManager.hasSetup()) {
                return;
            }
            $(this).blur();
            const $container: JQuery = $("#container");
            const $dialogWrap: JQuery = $("#dialogWrap");

            if (WorkbookPanel.isWBMode()) {
                if (!$workbookPanel.is(":visible")) {
                    // on monitor view or something else
                    $container.removeClass("monitorMode setupMode");
                    $container.addClass("wkbkViewOpen");
                } else if ($container.hasClass("noWorkbook") ||
                           $container.hasClass("switchingWkbk")) {
                    let msg: string = "";
                    if ($container.hasClass("switchingWkbk")) {
                        msg = WKBKTStr.WaitActivateFinish;
                    } else {
                        msg = WKBKTStr.NoActive;
                    }
                    $dialogWrap.find("span").text(msg);
                    // do not allow user to exit without entering a workbook
                    $workbookPanel.addClass("closeAttempt");
                    $dialogWrap.removeClass("doneCloseAttempt");
                    $dialogWrap.addClass("closeAttempt");
                    clearTimeout(closeTimer);
                    clearTimeout(doneTimer);
                    closeTimer = <any>setTimeout(function() {
                        $workbookPanel.removeClass("closeAttempt");
                    }, 200);
                    doneTimer = <any>setTimeout(function() {
                        $dialogWrap.removeClass("closeAttempt")
                                    .addClass("doneCloseAttempt");
                    }, 2000);
                } else {
                    // default, exit the workbook
                    WorkbookPanel.hide();
                    $container.removeClass("monitorMode setupMode");
                }
            } else {
                WorkbookPanel.show();
            }
        });

        $workbookPanel.find(".mainContent").on("scroll", function() {
            if ($workbookPanel.is(":visible")) {
                // this is to fix the issue when scroll, status box will be off position
                StatusBox.forceHide();
            }

            if ($wkbkMenu.is(":visible")) {
                // This closes the workbook menu when scrolling
                xcMenu.close();
            }
        });
    }

    /**
    * WorkbookPanel.show
    * Shows the workbook panel
    * @param isForceShow - boolean, if true no transition animation is shown
    */
    export function show(isForceShow: boolean = false): void {
        $workbookPanel.show();
        $("#container").addClass("workbookMode");
        $("#container").addClass("workbookPanelAnimating");

        if (isForceShow) {// no animation if force show
            resolve();
        } else {
            setTimeout(function() {
                resolve();
            }, 100);
        }

        function resolve() {
            $workbookPanel.removeClass("hidden"); // no animation if force show
            $("#container").addClass("wkbkViewOpen");
            $("#container").removeClass("workbookPanelAnimating");
        }

        WorkbookPanel.listWorkbookCards();
    };

    /**
    * WorkbookPanel.hide
    * hides the workbook panel
    * @param immediate - boolean, if true no transition animation is shown
    */
    export function hide(immediate: boolean = false): void {
        if (!hasSetup || $workbookPanel.hasClass("hidden")) {
            return;
        }
        $workbookPanel.addClass("hidden");
        $workbookSection.find(".workbookBox").remove();
        $("#container").removeClass("wkbkViewOpen workbookMode");
        $("#container").addClass("workbookPanelAnimating");
        if (immediate) {
            resolve();
        } else {
            setTimeout(function() {
                resolve();
            }, 400);
        }

        function resolve() {
            $workbookPanel.hide();
            $("#container").removeClass("workbookPanelAnimating");
        }

        xcTooltip.hideAll();
        StatusBox.forceHide();
    }

    /**
    * WorkbookPanel.forceShow
    * forces the workbook panel to show
    */
    export function forceShow(): void {
        // When it's forceShow, no older workbooks are displayed
        $("#container").addClass("noWorkbook");
        $("#container").removeClass("wkbkViewOpen");
        WorkbookPanel.show(true);
    };

    /**
    * WorkbookPanel.isWBMode
    * checks if the window is in the workbook panel
    */
    export function isWBMode(): boolean {
        return $("#container").hasClass("workbookMode");
    };

    /**
    * WorkbookPanel.edit
    * Edits the name and description of a workbook
    * @param workbookId - the id of the workbook to edit
    * @param newName - the new name for the workbook
    * @param description - the new description, optional
    * @param isNew - if it is a new workbook focus the name for inline editing
    */
    export function edit(
        workbookId: string,
        newName: string,
        description?: string,
        isNew: boolean = false
    ): XDPromise<void> {
        const $workbookBox: JQuery = getWorkbookBoxById(workbookId);
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        if (workbook == null) {
            // error case
            return PromiseHelper.reject();
        }
        const oldWorkbookName: string = workbook.getName();
        const oldDescription: string = workbook.getDescription() || "";
        if (oldWorkbookName === newName &&
            oldDescription === description &&
            !isNew
        ) {
            return PromiseHelper.resolve();
        } else {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            let promise: XDPromise<string>;
            if (oldWorkbookName === newName) {
                // only update description
                promise = WorkbookManager.updateDescription(workbookId, description);
            } else {
                promise = WorkbookManager.renameWKBK(workbookId, newName, description);
            }
            $workbookBox.addClass("loading")
                            .find(".loadSection .text").text(WKBKTStr.Updating);
            const loadDef: XDDeferred<void> = PromiseHelper.deferred();
            setTimeout(function() {
                // if only update description, it could blink the UI if update
                // is too fast, so use this to slow it down.
                loadDef.resolve();
            }, 500);

            PromiseHelper.when(promise, loadDef.promise())
            .then(function(res) {
                const curWorkbookId = res[0];
                updateWorkbookInfo($workbookBox, <string>curWorkbookId);
                deferred.resolve();
            })
            .fail(function(errors) {
                handleError(errors[0], $workbookBox);
                deferred.reject(errors[0]);
            })
            .always(function() {
                $workbookBox.removeClass("loading")
                            .find(".loadSection .text").text(WKBKTStr.Creating);
                if (isNew) {
                    $workbookBox.find(".workbookName").focus().select();
                    $workbookBox.find(".workbookName").addClass("focused");
                }
            })

            return deferred.promise();
        }
    };

    /**
    * WorkbookPanel.listWorkbookCards
    * Creates the list of workbook cards
    */
    export function listWorkbookCards(): void {
        _listWorkbookCards();
        _updateMemUsage();
    }

    function _listWorkbookCards(): void {
        const $contentSection = _getContentSection();
        let html: string = "";
        let sorted: WKBK[] = [];
        const workbooks: object = WorkbookManager.getWorkbooks();
        for (let id in workbooks) {
            sorted.push(workbooks[id]);
        }
        $contentSection.empty();

        const activeWKBKId: string = WorkbookManager.getActiveWKBK();
        // sort by workbook.name
        const isNum: boolean = (sortkey === "created" || sortkey === "modified" || sortkey === "memUsed");
        let activeWorkbook: WKBK;

        let isRevSort = !sortAsc;
        sorted = sortObj(sorted, sortkey, isNum, isRevSort);
        sorted.forEach(function(workbook) {
            html = _renderWorkbookHTML(workbook) + html;
        });

        if (!html) {
            html = `<div class="hintSection">Create or upload a new project to get started.</div>`;
        }
        _renderHeader();
        $contentSection.html(html);
    }

    async function _updateMemUsage() {
        try {
            await WorkbookManager.updateMemUsage();
            _listWorkbookCards();
        } catch (e) {
            console.error(e);
        }
    }

    /**
    * WorkbookPanel.updateWorkbooks
    * Updates workbook info from a socket call
    * @param info - The information passed from socket including operation and workbook id
    */
    export function updateWorkbooks(info: any): void {
        if ($dropDownCard &&
            $dropDownCard.attr("data-workbook-id") === info.triggerWkbk) {
            if (info.action === "rename") {
                $dropDownCard.attr("data-workbook-id",
                                WorkbookManager.getIDfromName(info.newName));
            } else if (info.action === "delete") {
                if ($wkbkMenu.is(":visible")) {
                    xcMenu.close($wkbkMenu);
                }
            }
        }
    }

    function addWorkbookEvents(): void {
        // New Workbook card
        $("#createWKBKbtn").click(function() {
            StatusBox.forceHide();
            let wbName: string;
            const workbooks: object = WorkbookManager.getWorkbooks();
            wbName = wbDuplicateName('New Project', workbooks, 0);
            const $btn: JQuery = $(this);
            $btn.addClass("inActive").blur();
            WorkbookPanel.createNewWorkbook(wbName)
            .always(function() {
                $btn.removeClass("inActive");
            });
        });

        $("#browseWKBKbtn").click(function() {
            StatusBox.forceHide();
            $("#WKBK_uploads").click();
        });

        $fileUpload.change(function() {
            if ($fileUpload.val() !== "") {
                changeFilePath();
            }
        });

        $workbookSection.on("blur", ".workbookName", function() {
            const $this: JQuery = $(this);
            const $workbookBox: JQuery = $this.closest(".workbookBox");
            let val = $this.val();
            if (val === $this.parent().attr("data-original-title")) {
                _changeInputToDiv($this);
                return;
            }

            let workbookId = $workbookBox.attr("data-workbook-id");
            if (!validateName(val, workbookId, $this)) {
                $this.addClass("error");
                $this.val($this.parent().attr("data-original-title"));
            } else {
                WorkbookPanel.edit(workbookId, val)
                .then(function() {
                    _changeInputToDiv($this);
                })
                .fail(function() {
                    $this.addClass("error");
                    $this.val($this.parent().attr("data-original-title"));
                });
            }
        });

        $workbookSection.on("keypress", ".workbookName", function(event) {
            $(this).removeClass("error");
            if (event.which === keyCode.Enter) {
                $(this).blur();
            }
        });

        $workbookSection.on("click", ".sessionId .icon", function(event) {
            event.stopPropagation();
            const sessionId = $(this).prev().text();
            xcUIHelper.copyToClipboard(sessionId);
            xcUIHelper.showSuccess(undefined);
        });

        // Events for the actual workbooks
        // anywhere on workbook card
        $workbookSection.on("click", ".activate", function(event) {
            if ($(event.target).hasClass("dropDown") || $(event.target).hasClass("focused")) {
                return;
            }
            activateWorkbook($(this).closest(".workbookBox"));
        });

        // Edit button
        $wkbkMenu.on("click", ".modify", function() {
            const workbookId: string = $dropDownCard.attr("data-workbook-id");
            WorkbookInfoModal.show(workbookId);
        });

        //Download Button
        $wkbkMenu.on("click", ".download", function() {
            alertDownloadWorkbook()
            .then(() => {
                return downloadWorkbook();
            });
        });

        // Duplicate button
        $wkbkMenu.on("click", ".duplicate", function() {
            const workbookId: string = $dropDownCard.attr("data-workbook-id");
            // Create workbook names in a loop until we find a workbook name
            // that we can use
            const $dropDownMenu: JQuery = $dropDownCard.find(".dropDown");
            const $workbookName: JQuery = $dropDownCard.find(".workbookName");
            let currentWorkbookName: string = $workbookName.is("input") ? $workbookName.val() : $workbookName.text();
            const currentWorkbooks: object = WorkbookManager.getWorkbooks();
            currentWorkbookName = wbDuplicateName(currentWorkbookName, currentWorkbooks, 0);

            duplicatingWKBKs.push(currentWorkbookName);

            const deferred1: XDPromise<JQuery> = createLoadingCard($dropDownCard, WKBKTStr.Duplicating);
            const deferred2: XDPromise<string> = WorkbookManager.copyWKBK(workbookId,
                                                    currentWorkbookName);

            PromiseHelper.when(deferred1, deferred2)
            .then(function(res: [JQuery, string]) {
                replaceLoadingCard(<JQuery>res[0], res[1]);
            })
            .fail(function(ret) {
                const $fauxCard = ret[0];
                const error = ret[1];
                handleError(error, $dropDownMenu);
                removeWorkbookBox($fauxCard);
            })
            .always(function() {
                const index: number = duplicatingWKBKs.indexOf(currentWorkbookName);
                if (index !== -1) {
                    duplicatingWKBKs.splice(index, 1);
                }
            });
        });

        // Delete button
        $wkbkMenu.on("click", ".delete", function() {
            let workbookId: string = $dropDownCard.attr("data-workbook-id");
            _deleteWorkbook(workbookId);
        });

        // deactivate button
        $wkbkMenu.on("click", ".deactivate", function() {
            let workbookId: string = $dropDownCard.attr("data-workbook-id");
            _deactivateWorkbook(workbookId);
        });

        $wkbkMenu.on("click", ".newTab", function() {
            activateWorkbook($dropDownCard, true);
        });

        $workbookSection.on("contextmenu", ".workbookBox", function(event) {
            event.preventDefault();
            $dropDownCard = $(this);

            openDropDown(event);
        });

        $workbookSection.on("click", ".dropDown", function(event) {
            $dropDownCard = $(this).closest(".workbookBox");

            openDropDown(event);
        });

        $("#workbookTopBar").find(".searchbarArea input").on("input", function() {
            if (!$("#workbookTopBar").find(".searchbarArea input").is(":visible")) return; // ENG-8642
            const searchStr = $(this).val();
            _searchWorkbooks(searchStr);
        });

        $workbookSection.on("mouseenter", ".tooltipOverflow", function() {
            const $div: JQuery = $(this).find(".workbookName");
            xcTooltip.auto(this, <HTMLElement>$div[0]);
        });

        $workbookSection.on("click", ".header .refreshMemUsed", () => {
            xcUIHelper.showRefreshIcon($workbookSection, false, null);
            _updateMemUsage();
        });

        $workbookSection.on("click", ".header .title", function(e) {
            if ($(e.target).closest(".refreshMemUsed").length) {
                return;
            }
            let key = $(this).data("key");
            if (key === sortkey) {
                sortAsc = !sortAsc;
            } else {
                sortAsc = true;
            }
            sortkey = key;
            _listWorkbookCards();
        });
    }

    function _changeInputToDiv($input: JQuery): void {
        const div = '<div class="workbookName">' +
                        $input.val() +
                    '<div>';
        $input.replaceWith(div);
    }

    function updateWorkbookInfo($workbookBox: JQuery, workbookId: string): void {
        $workbookBox.attr("data-workbook-id", workbookId);
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        if (workbook == null) {
            // error case
            return;
        }
        let modified: number = workbook.getModifyTime();
        let modifiedStr: string = "";
        const description: string = workbook.getDescription() || "";
        const name: string = workbook.getName();
        if (modified) {
            modifiedStr = moment(modified).fromNow();
        }

        $workbookBox.find(".modifiedTime").text(modifiedStr);
        $workbookBox.find(".description").text(description);

        let $workbookName = $workbookBox.find(".workbookName");
        if ($workbookName.is("input")) {
            $workbookName.val(name);
            $workbookName.attr("value", name);
        } else {
            $workbookName.text(name);
        }

        if (description.trim().length > 0) {
            xcTooltip.add($workbookBox.find(".description"), {title: xcStringHelper.escapeHTMLSpecialChar(description)});
        } else {
            xcTooltip.remove($workbookBox.find(".description"));
        }

        const $name: JQuery = $workbookBox.find(".name");
        xcTooltip.changeText($name, name);
    }

    function updateWorkbookInfoWithReplace($card: JQuery, workbookId: string): void {
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const $updateCard: JQuery = $(_renderWorkbookHTML(workbook));
        $card.replaceWith($updateCard);
    }

    /**
    * WorkbookPanel.createNewWorkbook
    * Creates a new workbook
    * @param workbookName - the name of the workbook
    * @param description - description of the new workbook, optional
    * @param file - if uploading a workbook the .tar.gz file, optional
    * @param fileData - byte string of the workbook's contents, optional
    */
    export function createNewWorkbook(workbookName: string, description?: string, file?: File,
            fileData?: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        $workbookPanel.find(".workbookBox.lastCreate").removeClass("lastCreate");
        checkFileSize(file)
        .then(function() {
            return XcUser.CurrentUser.commitCheck();
        })
        .then(function() {
            let deferred1: XDPromise<string>;
            if (!file && !fileData) {
                deferred1 = WorkbookManager.newWKBK(workbookName);
            } else {
                deferred1 = WorkbookManager.uploadWKBK(workbookName, file, fileData);
            }
            let $sibling: JQuery;
            if (WorkbookManager.getActiveWKBK()) {
                $sibling = getWorkbookBoxById(WorkbookManager.getActiveWKBK());
            } else {
                $sibling = null;
            }
            const deferred2: XDPromise<JQuery> = createLoadingCard($sibling);
            return PromiseHelper.when(deferred1, deferred2);
        })
        .then(function(res) {
            const id = res[0];
            replaceLoadingCard(res[1], <string>id, true);
            const wkbk = WorkbookManager.getWorkbook(id);
            if (wkbk != null) {
                description = description || wkbk.getDescription();
            }
            let $wkbkCard = getWorkbookBoxById(id);
            $wkbkCard.addClass("lastCreate");
            return WorkbookPanel.edit(<string>id, workbookName, description, true);
        })
        .then(deferred.resolve)
        .fail(function(res) {
            res = res || [];
            const error = res[0];
            const $fauxCard = res[1];
            const isCancel = res[2];
            if (isCancel) {
                deferred.resolve();
                return;
            }

            handleError(error || WKBKTStr.CreateErr, $("#createWKBKbtn"));
            removeWorkbookBox($fauxCard);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function checkFileSize(file: File): XDPromise<void> {
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
                    deferred.reject([null, null, true]);
                }
            });
        }
        return  deferred.promise();
    }

    function createLoadingCard($sibling: JQuery, loadingText?: string): XDPromise<JQuery> {
        let deferred: XDDeferred<JQuery> = PromiseHelper.deferred();
        // placeholder
        const workbook: WKBK = new WKBK({
            "id": "",
            "name": ""
        });
        const extraClasses: string[] = ["loading", "new"];
        const html: string = _renderWorkbookHTML(workbook, extraClasses, undefined, loadingText);

        const $newCard: JQuery = $(html);
        _getContentSection().prepend($newCard);

        // need to remove "new" class from workbookcard a split second
        // after it's appended or it won't animate
        setTimeout(function() {
            $newCard.removeClass("new");
        }, 100);

        setTimeout(function() {
            deferred.resolve($newCard);
        }, newBoxSlideTime);

        return deferred.promise();
    }

    function replaceLoadingCard($card: JQuery, workbookId: string, isNewWKBK: boolean = false): JQuery {
        const classes: string[] = [];
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const $updateCard: JQuery = $(_renderWorkbookHTML(workbook, classes, isNewWKBK));
        $card.replaceWith($updateCard);
        return $updateCard;
    }

    function getWorkbookBoxById(workbookId: string): JQuery {
        const $workbookBox: JQuery = $workbookPanel.find(".workbookBox").filter(function() {
            return $(this).attr("data-workbook-id") === workbookId;
        });
        return $workbookBox;
    }

    function activateWorkbook($workbookBox: JQuery, newTab: boolean = false): void {
        const workbookId: string = $workbookBox.attr("data-workbook-id");
        const activeWKBKId: string = WorkbookManager.getActiveWKBK();
        if (!newTab) {
            if (activeWKBKId === workbookId) {
                WorkbookPanel.hide();
                $("#container").removeClass("noWorkbook");
            } else {
                alertActivate(workbookId, activeWKBKId)
                .then(function() {
                    WorkbookManager.switchWKBK(workbookId)
                    .fail(function(error) {
                        handleError(error, $workbookBox);
                        // has chance that inactivate the fromWorkbook
                        // but fail to activate the toWorkbook
                        if (WorkbookManager.getActiveWKBK() == null
                            && activeWKBKId != null) {
                            const $activeWKBK: JQuery = getWorkbookBoxById(activeWKBKId);
                            updateWorkbookInfoWithReplace($activeWKBK, activeWKBKId);
                        }
                    });
                });
            }
        } else {
            alertActivate(workbookId, activeWKBKId)
            .then(function() {
                WorkbookManager.switchWKBK(workbookId, true, $workbookBox)
                .fail(function(error) {
                    handleError(error, $workbookBox);
                });
            });
        }
    }

    function alertActivate(workbookId: string, activeWKBKId: string): XDPromise<void> {
        if (activeWKBKId == null) {
            // no activate workbook case
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        const txCache: Object = Transaction.getCache();
        const keys: string[] = Object.keys(txCache);
        if (keys.length === 0) {
            // when no opeartion running
            if (workbook.hasResource()) {
                return PromiseHelper.resolve();
            } else {
                // when activate inactive workbook
                Alert.show({
                    title: WKBKTStr.Activate,
                    msg: WKBKTStr.ActivateInstr,
                    onConfirm: deferred.resolve,
                    onCancel: deferred.reject
                });
                return deferred.promise();
            }
        }

        const key: string = keys[0];
        const operation: Object = txCache[key].getOperation();
        const msg: string = xcStringHelper.replaceMsg(WKBKTStr.SwitchWarn, {
            op: operation
        });

        Alert.show({
            title: AlertTStr.Title,
            msg: msg,
            onConfirm: deferred.resolve,
            onCancel: deferred.reject
        });
        return deferred.promise();
    }

    function downloadWorkbook(): void {
        const workbookId: string = $dropDownCard.attr("data-workbook-id");
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        if (workbook == null) {
            // error case
            return;
        }
        const workbookName: string = workbook.getName();

        //$dlButton.addClass("inActive");
        downloadingWKBKs.push(workbookName);

        WorkbookManager.downloadWKBK(workbookName)
        .fail(function(err) {
            handleError(err, $dropDownCard);
        })
        .always(function() {
            const index: number = downloadingWKBKs.indexOf(workbookName);
            if (index !== -1) {
                downloadingWKBKs.splice(index, 1);
            }
        });
    }

    function alertDownloadWorkbook(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let writeChecked = () => {
            xcLocalStorage.setItem("noWKBKDownloadAlert", "true");
        };

        try {
            const noAlert: boolean = xcLocalStorage.getItem("noWKBKDownloadAlert") === "true";
            if (XVM.isOnAWS() || noAlert) {
                deferred.resolve();
            } else {
                Alert.show({
                    title: AlertTStr.Title,
                    msg: WKBKTStr.DownloadWarn,
                    isCheckBox: true,
                    onConfirm: (hasChecked) => {
                        if (hasChecked) {
                            writeChecked();
                        }
                        deferred.resolve();
                    },
                    onCancel: (hasChecked) => {
                        if (hasChecked) {
                            writeChecked();
                        }
                        deferred.reject();
                    }
                });
            }
        } catch (e) {
            console.error(e);
            deferred.resolve(); // still resolve it to continue downloading
        }


        return deferred.promise();
    }

    function _deleteWorkbook(workbookId: string): void {
        let workbook = WorkbookManager.getWorkbook(workbookId);
        if (workbook == null) {
            // error case
            return;
        }
        let msg: string = xcStringHelper.replaceMsg(WKBKTStr.DeleteMsg, {
            name: workbook.getName()
        });

        Alert.show({
            "title": WKBKTStr.Delete,
            "msg": msg,
            "sizeToText": true,
            "onConfirm": () => {
                deleteWorkbookHelper(workbookId);
            }
        });
    }

    function deleteWorkbookHelper(workbookId: string): void {
        let $workbookBox = getWorkbookBoxById(workbookId);
        let oldMessage = showLoadingSection($workbookBox, WKBKTStr.DeletingWKBK);
        WorkbookManager.deleteWKBK(workbookId)
        .then(function() {
            hideLoadingSection($workbookBox, oldMessage);
            removeWorkbookBox($workbookBox);
        })
        .fail(function(error) {
            hideLoadingSection($workbookBox, oldMessage);
            handleError(error, $workbookBox);
        });
    }

    function removeWorkbookBox($workbookBox: JQuery): void {
        if ($workbookBox == null) {
            return;
        }
        $workbookBox.addClass("removing");
        setTimeout(function() {
            $workbookBox.remove();
        }, 600);
    }

    function showLoadingSection($workbookBox: JQuery, text: string): string {
        $workbookBox.addClass("loading");
        let $section: JQuery = $workbookBox.find(".loadSection .text");
        let oldText = $section.text();
        $section.text(text);
        return oldText;
    }

    function hideLoadingSection($workbookBox: JQuery, oldText: string): void {
        $workbookBox.removeClass("loading");
        $workbookBox.find(".loadSection .text").text(oldText);
    }

    function validateName(wbName: string, wbId: string, $wbCard: JQuery): boolean {
        return xcHelper.validate([
            {
                "$ele": $wbCard,
                "formMode": true
            },
            {
                "$ele": $wbCard,
                "formMode": true,
                "error": ErrTStr.InvalidWBName,
                "check": function() {
                    return !xcHelper.checkNamePattern(<PatternCategory>"workbook", <PatternAction>"check", wbName);
                }
            },
            {
                "$ele": $wbCard,
                "formMode": true,
                "error": xcStringHelper.replaceMsg(WKBKTStr.Conflict, {
                    "name": wbName
                }),
                "check": function() {
                    const workbooks: object = WorkbookManager.getWorkbooks();
                    for (let wkbkId in workbooks) {
                        if (workbooks[wkbkId].getName() === wbName && wbId !== wkbkId) {
                            return true;
                        }
                    }
                    return false;
                }
            }
        ]);
    }

    function handleError(error: any, $ele: JQuery): void {
        if (typeof error === "object" && error && error.canceled) {
            return;
        }
        let errorText: string;
        let log: string;
        if (typeof error === "object" && error && error.error != null) {
            if (error.status === StatusT.StatusCanceled) {
                return;
            }
            errorText = error.error;
            log = error.log;
        } else if (typeof error === "string") {
            errorText = error;
        } else {
            errorText = JSON.stringify(error);
        }
        StatusBox.show(errorText, $ele, false, {
            "detail": log,
            "persist": true
        });
    }

    function _deactivateWorkbook(workbookId: string): void {
        let workbook = WorkbookManager.getWorkbook(workbookId);
        if (workbook == null) {
            // error case
            return;
        }
        let msg: string = xcStringHelper.replaceMsg(WKBKTStr.DeactivateMsg, {
            name: workbook.getName()
        });
        Alert.show({
            "title": WKBKTStr.Deactivate,
            "msg": msg,
            "onConfirm": function() {
                deactivateWorkbookHelper(workbookId);
            }
        });
    }

    function deactivateWorkbookHelper(workbookId: string): void {
        let $workbookBox: JQuery = getWorkbookBoxById(workbookId);
        let isActiveWkbk: boolean = WorkbookManager.getActiveWKBK() === workbookId;
        WorkbookManager.deactivate(workbookId)
        .then(function() {
            updateWorkbookInfoWithReplace($workbookBox, workbookId);
            if (isActiveWkbk) {
                $("#container").addClass("noWorkbook");
            }
        })
        .fail(function(error) {
            handleError(error, $workbookBox);
        });
    }

    function _getContentSection(): JQuery {
        return $workbookSection.find(".workbookList .content");
    }

    function _renderWorkbookHTML(
        workbook: WKBK,
        extraClasses?: string[],
        isNewWKBK: boolean = false,
        loadingText?: string
    ): string {
        if (workbook == null) {
            // error case
            return "";
        }
        const workbookId: string = workbook.getId() || "";
        let workbookName: string = workbook.getName() || "";
        const createdTime: number = workbook.getCreateTime();
        let createdTimeDisplay: string = "";
        const modifiedTime: number = workbook.getModifyTime();
        let modifiedTimeDisplay: string = "";
        let description: string = workbook.getDescription() || "";
        let memUsed: number = workbook.getMemUsed() || 0;
        let memUsageStr: string = <string>xcHelper.sizeTranslator(memUsed);

        description = xcStringHelper.escapeHTMLSpecialChar(description);

        extraClasses = extraClasses || [];

        let title: string = workbookName;
        if (workbook.isNoMeta()) {
            extraClasses.push("noMeta");
            workbookName += " (" + WKBKTStr.NoMeta + ")";
        }

        if (createdTime) {
            let time = moment(createdTime);
            createdTimeDisplay = time.calendar();
        }

        if (modifiedTime) {
            let time = moment(modifiedTime);
            modifiedTimeDisplay = time.fromNow();
        }

        if (workbookId === WorkbookManager.getActiveWKBK()) {
            extraClasses.push("open");
        }
        let isActive: string;

        if (workbook.hasResource()) {
            extraClasses.push("active");
            isActive = WKBKTStr.Active;
        } else {
            isActive = WKBKTStr.Inactive;
            extraClasses.push("noResource");
        }

        const loadSection =
        '<div class="loadSection">' +
            '<div class="refreshIcon">' +
                '<img src="' + paths.waitIcon + '">' +
            '</div>' +
            '<div class="animatedEllipsisWrapper">' +
                '<div class="text">' +
                    (loadingText || WKBKTStr.Creating) +
                '</div>' +
                '<div class="wrap">' +
                    '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                    '<div class="animatedEllipsis staticEllipsis">....</div>' +
                '</div>' +
            '</div>' +
        '</div>';
        let nameInput: HTML = "";
        if (isNewWKBK) {
            nameInput = '<input type="text" class="workbookName tooltipOverflow textOverflowOneLine"' +
            ' value="' + workbookName + '" spellcheck="false"/>';
        } else {
            // XXX TODO: make it a div
            nameInput = '<div class="workbookName tooltipOverflow textOverflowOneLine">' +
                            workbookName +
                        '</div>';
        }
        const html: string =
            '<div class="row workbookBox ' +
            extraClasses.join(" ") + '"' +
            ' data-workbook-id="' + workbookId +'">' +
                loadSection +
                '<div class="name activate tooltipOverflow" ' +
                xcTooltip.Attrs + ' data-original-title="' + title + '">' +
                    nameInput +
                '</div>' +
                '<div class="createdTime">' +
                    createdTimeDisplay +
                '</div>' +
                '<div class="modifiedTime">' +
                    modifiedTimeDisplay +
                '</div>' +
                '<div class="description textOverflowOneLine" ' +
                xcTooltip.Attrs +
                ' data-title="' + description + '"' +
                '>' +
                    description +
                '</div>' +
                '<div class="sessionId">' +
                    '<div>' + workbook.sessionId + '</div>' +
                    '<i class="icon xi-copy-clipboard" '+
                    xcTooltip.Attrs +
                    ' data-title="' + WKBKTStr.CopySessionId + '"' +
                    '></i>' +
                '</div>' +
                '<div class="memUsage">' +
                    memUsageStr +
                '</div>' +
                '<div class="state">' +
                    isActive +
                '</div>' +
                '<i class="dropDown icon xi-ellipsis-h xc-action" ' +
                xcTooltip.Attrs +
                ' data-title="' + WKBKTStr.MoreActions + '"' +
                '></i>' +
            '</div>';

        return html;
    }

    function _renderHeader(): void {
        const attributes = [{
            key: "name",
            dataKey: "name",
            text: "Name"
        }, {
            key: "createdTime",
            dataKey: "created",
            text: TimeTStr.Created
        }, {
            key: "modifiedTime",
            dataKey: "modified",
            text: TimeTStr.LastSaved
        }, {
            key: "description",
            dataKey: "description",
            text: "Description"
        }, {
            key: "sessionId",
            dataKey: "sessionId",
            text: WKBKTStr.SessionId
        }, {
            key: "memUsage",
            dataKey: "memUsed",
            text:"Memory Used",
            icon: '<i class="icon xc-action xi-refresh refreshMemUsed" '+
                    xcTooltip.Attrs +
                    ' data-title="' + CommonTxtTstr.Refresh + '"' +
                    '></i>'
        }, {
            key: "state",
            dataKey: "resource",
            text: WKBKTStr.State
        }];
        const header: HTML = attributes.map((attr) => {
            let sortIcons = "";
            if (sortkey === attr.dataKey) {
                if (sortAsc) {
                    sortIcons = `<i class="icon xi-arrow-up"></i>`;
                } else {
                    sortIcons = `<i class="icon xi-arrow-down"></i>`;
                }
            } else {
                sortIcons = `<span class="sortIconWrap">
                    <i class="icon xi-arrow-up"></i>
                    <i class="icon xi-arrow-down"></i>
                </span>`;
            }
            const html: HTML =
            `<div class="title ${attr.key}" data-key="${attr.dataKey}">` +
                `<div class="label">${attr.text}</div>` +
                (attr.icon || "") +
                `<div class="sort">
                    ${sortIcons}
                </div>` +
            `</div>`;
            return html;
        }).join("");
        $workbookSection.find(".workbookList .header").html('<div class="row">' + header + '</div>');
    }

    function _searchWorkbooks(keyword: string): void {
        const $workbooks = _getContentSection().find(".workbookBox");
        if (!keyword) {
            $workbooks.removeClass("xc-hidden");
        } else {
            keyword = keyword.toLowerCase();
            $workbooks.each(function() {
                const $workbook: JQuery = $(this);
                const id: string = $workbook.attr("data-workbook-id");
                const worbook: WKBK = WorkbookManager.getWorkbook(id);
                if (worbook &&
                    (worbook.getName().toLowerCase().includes(keyword) ||
                    worbook.sessionId.toLowerCase().includes(keyword))
                ) {
                    $workbook.removeClass("xc-hidden");
                } else {
                    $workbook.addClass("xc-hidden");
                }
            });
        }
    }

    function changeFilePath(dragFile?: File): void {
        let path: string;
        let file: File;
        if (dragFile) {
            file = dragFile;
        } else {
            file = (<HTMLInputElement>$fileUpload[0]).files[0];
        }

        path = file.name.replace(/C:\\fakepath\\/i, '').trim();
        if (path.endsWith(gDFSuffix)) {
            let error = "Cannot upload files that ends with " + gDFSuffix + " as worbook.";
            handleError(error, $("#browseWKBKbtn"));
            return;
        }

        let wbName: string = path.substring(0, path.indexOf(".")).trim();
        wbName = <string>xcHelper.checkNamePattern(PatternCategory.WorkbookFix, PatternAction.Fix, wbName);

        const workbooks: object = WorkbookManager.getWorkbooks();
        wbName = wbDuplicateName(wbName, workbooks, 0);

        WorkbookPanel.createNewWorkbook(wbName, null, file)
        .fail(function(error) {
            handleError(error, $("#browseWKBKbtn"));
        })
        .always(function() {
            $fileUpload.val("");
        });
    }

    export function wbDuplicateName(wbName: string, workbooks: object, n: number): string {
        if (n >= 500) {
            console.warn("Too many attempts to find unique name.");
            return xcHelper.randName(wbName);
        }
        let numbering: string = "";
        if (n > 0) {
            numbering = "_" + n;
        }
        for (let wkbkId in workbooks) {
            if (workbooks[wkbkId].getName() === wbName + numbering) {
                return wbDuplicateName(wbName, workbooks, n + 1);
            }
        }
        return wbName + numbering;
    }

    function sortObj(objs: WKBK[], key: string, isNum: boolean, revSort?: boolean): WKBK[] {
        if (isNum) {
            objs.sort(function(a, b) {
                if (revSort) {
                    return (b[key] - a[key]);
                } else {
                    return (a[key] - b[key]);
                }
            });
        } else {
            objs.sort(function(a, b) {
                if (a[key] && a[key].localeCompare && b[key] && b[key].localeCompare) {
                    if (revSort) {
                        return a[key].localeCompare(b[key]);
                    } else {
                        return b[key].localeCompare(a[key]);
                    }
                } else {
                    let compare = (b[key] > a[key]);
                    let num = compare ? -1 : 1;
                    if (revSort) {
                        num = -num;
                    }
                    return num;
                }
            });
        }

        return objs;
    }

    function openDropDown(event: JQueryEventObject): void {
        if ($dropDownCard.hasClass("loading")) {
            return;
        }

        const workbookId: string = $dropDownCard.attr("data-workbook-id");
        const workbook: WKBK = WorkbookManager.getWorkbook(workbookId);
        if (workbook == null) {
            return;
        }
        const workbookName: string = workbook.getName();

        const $dropDownLocation: JQuery = $dropDownCard.find(".dropDown");

        let index: number = downloadingWKBKs.indexOf(workbookName);
        if (index !== -1) {
            $wkbkMenu.find(".download").addClass("inActive");
        } else {
            $wkbkMenu.find(".download").removeClass("inActive");
        }

        index = duplicatingWKBKs.indexOf(workbookName);
        if (index !== -1) {
            $wkbkMenu.find(".duplicate").addClass("inActive");
        } else {
            $wkbkMenu.find(".duplicate").removeClass("inActive");
        }

        if ($dropDownCard.hasClass("active")) {
            $wkbkMenu.find(".delete").addClass("xc-hidden");
            $wkbkMenu.find(".deactivate").removeClass("xc-hidden");

            if (workbookId === WorkbookManager.getActiveWKBK()) {
                $wkbkMenu.find(".newTab").addClass("inActive");
            } else {
                $wkbkMenu.find(".newTab").removeClass("inActive");
            }
        } else {
            $wkbkMenu.find(".deactivate").addClass("xc-hidden");
            $wkbkMenu.find(".delete").removeClass("xc-hidden");
            $wkbkMenu.find(".newTab").removeClass("inActive");
        }
        MenuHelper.dropdownOpen($dropDownLocation, $wkbkMenu, {
            "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "floating": true
        });
    }

    function setupDragDrop(): void {
        new DragDropUploader({
            $container: $workbookPanel.find(".mainContent"),
            text: "Drop a project file to upload",
            onDrop: function(files) {
                changeFilePath(files);
            },
            onError: function(error) {
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

    if (window["unitTestMode"]) {
        WorkbookPanel["__testOnly__"] = {
            changeFilePath: changeFilePath,
            showLoadingSection: showLoadingSection,
            hideLoadingSection: hideLoadingSection
        }
    }
}