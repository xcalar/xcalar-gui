namespace xcManager {
    let setupStatus: string;

    /**
     * xcManager.setup
     * Sets up most services for XD
     */
    export function setup(): XDPromise<void> {
        setupStatus = SetupStatus["Setup"];
        // use promise for better unit test
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        gMinModeOn = true; // startup use min mode;
        $("body").addClass("xc-setup");
        $("#favicon").attr("href", paths.favicon);
        Compatible.check();
        xcGlobal.setup();

        let xcSocket: XcSocket;
        let firstTimeUser: boolean;
        setupThrift("");
        if (XVM.isCloud()) {
            $("body").addClass("isCloud");
        }
        HomeScreen.toggleMode();

        xcTimeHelper.setup()
        .then(() => {
            return hotPatch();
        })
        .then(function() {
            Alert.setup();
            return XcUser.setCurrentUser();
        })
        .then(function() {
            XVM.setup();
            return CloudManager.Instance.setup();
        })
        .then(function() {
            // xcrpc default service setup
            Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, xcHelper.getApiUrl());

            setupUserArea();
            xcTooltip.setup();

            StatusBox.setup();
            StatusMessage.setup();
            Log.setup();
            DataSourceManager.setup();
            TableComponent.setup();
            MonitorPanel.setup();
            setupModals();
            browserAlert();
            Admin.setup();
            xcSuggest.setup();
            documentReadyGeneralFunction();

            xcSocket = setupSocket();

            try {
                // In case mixpanel is not loaded
                xcMixpanel.setup();
            } catch (error){
                console.error("mixpanel is not loaded");
            }
            return XVM.checkVersionAndLicense();
        })
        .then(function() {
            XVM.checkBuildNumber();
            return XVM.checkKVVersion();
        })
        .then(function(isFirstTimeUser) {
            firstTimeUser = isFirstTimeUser;
            // First XD instance to run since cluster restart
            return oneTimeSetup();
        })
        .then(function() {
            return setupWKBKIndependentPanels();
        })
        .then(function() {
            return setupSession();
        }) // restores info from kvStore
        .then(function() {
            UDFPanel.Instance.setup();
            return PromiseHelper.convertToJQuery(AppList.Instance.restore());
        })
        .then(() => {
            return PopupManager.restore();
        })
        .then(function() {
            try {
                $("#topMenuBarTabs").removeClass("xc-hidden");
                setupScreens();
                XDFManager.Instance.setup();
                DagConfigNodeModal.Instance.setupPanels();
                SQLWorkSpace.Instance.setup();
            } catch (e) {
                console.error(e);
                return PromiseHelper.reject(e.message);
            }
        })
        .then(function() {
            DagPanel.Instance.setup(); // async setup
        })
        .then(function() {
            return setupTooltips();
        })
        .then(function() {
            try {
                TblSource.Instance.refresh();
                MainMenu.setup(true);
                StatusMessage.updateLocation(false, null);
                if (!isBrowserFirefox && !isBrowserIE) {
                    gMinModeOn = false; // turn off min mode
                }

                setupStatus = SetupStatus.Success;

                console.log('%c ' + CommonTxtTstr.XcWelcome + ' ',
                'background-color: #5CB2E8; ' +
                'color: #ffffff; font-size:18px; font-family:Open Sans, Arial;');

                xcSocket.addEventsAfterSetup();
                // start heartbeat check
                XcSupport.heartbeatCheck();


                if (typeof mixpanel !== "undefined") {
                    xcMixpanel.pageLoadEvent();
                }
            } catch (e) {
                console.error(e);
                return PromiseHelper.reject(e);
            }
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            handleSetupFail(error, firstTimeUser);
            UDFPanel.Instance.setup(); // ok to load twice, we check
            $("body").addClass("xc-setup-error");
            setupStatus = SetupStatus["Fail"];
            deferred.reject(error);
        })
        .always(function() {
            $("body").removeClass("xc-setup");
            // get initial memory usage
            MemoryAlert.Instance.check();

            if (!gMinModeOn) {
                $("#initialLoadScreen").fadeOut(200, function() {
                    hideInitialLoadScreen();
                });
            } else {
                hideInitialLoadScreen();
            }
            XcUser.creditUsageCheck();
        });

        return deferred.promise();
    };

    function setupScreens(): void {
        PanelHistory.Instance.setup();
        LoadScreen.setup();
        HomeScreen.setup();
    }

    function hideInitialLoadScreen(): void {
        $("#initialLoadScreen").removeClass("full").hide();
    }

    function handleSetupFail(error: string|object, firstTimeUser: boolean): void {
        // in case it's not setup yet
        $("#topMenuBarTabs").removeClass("xc-hidden");
        setupScreens();
        MainMenu.setup(false);
        QueryManager.setup();
        Alert.setup();
        StatusMessage.setup();
        StatusBox.setup();
        xcTooltip.setup();
        let locationText: string = StatusMessageTStr.Error;
        const isNotNullObj: boolean = error && (typeof error === "object");
        if (error === WKBKTStr.NoWkbk){
            // when it's new workbook
            hideInitialLoadScreen();
            WorkbookPanel.forceShow();
            locationText = StatusMessageTStr.Viewing + " " + WKBKTStr.Location;
            // TooltipWalkthroughs.startWorkbookBrowserWalkthrough();
            // start socket (no workbook is also a valid login case)
            let userExists: boolean = false;
            XcUser.CurrentUser.holdSession(null, false)
            .fail(function(err) {
                if (err === WKBKTStr.Hold) {
                    userExists = true;
                    WorkbookManager.gotoWorkbook(null, true);
                }
            })
            .always(function() {
                if (firstTimeUser && !userExists) {
                    Admin.addNewUser();
                    // when it's new user first time login
                    // TooltipWalkthroughs.newUserPopup();
                }
            });
        } else if (error === WKBKTStr.Hold) {
            // when seesion is hold by others and user choose to not login
            WorkbookManager.gotoWorkbook(null, true);
        } else if (isNotNullObj &&
                   error["status"] != null &&
                   error["status"] === StatusT.StatusSessionNotFound)
        {
            locationText = WKBKTStr.NoOldWKBK;
            Alert.show({
                "title": WKBKTStr.NoOldWKBK,
                "instr": WKBKTStr.NoOldWKBKInstr,
                "msg": WKBKTStr.NoOldWKBKMsg,
                "lockScreen": true,
                "logout": true,
                "buttons": [{
                    "name": WKBKTStr.NewWKBK,
                    "func": function() {
                        WorkbookManager.inActiveAllWKBK();
                    }
                }],
                "hideButtons": ['downloadLog']
            });
        } else if (isNotNullObj &&
                   error["status"] != null &&
                   error["status"] === StatusT.StatusSessionUsrAlreadyExists)
        {
            locationText = ThriftTStr.SessionElsewhere;
            let errorMsg: string;
            try {
                const ip: string = error["log"].match(/IP address \'(.*)\'/)[1];
                errorMsg = xcStringHelper.replaceMsg(ThriftTStr.LogInDifferentWrap, {
                    ip: ip,
                    ip2: ip
                });
            } catch (e) {
                errorMsg = error["error"] + '\n' + ThriftTStr.LogInDifferent;
            }
            Alert.error(ThriftTStr.SessionElsewhere, errorMsg, {
                "lockScreen": true
            });
        } else {
            // when it's an error from backend we cannot handle
            let errorStruct: Alert.AlertErrorOptions = {"lockScreen": true};
            let title: string;
            if (!isNotNullObj ||
                !error["error"] ||
                typeof(error["error"]) !== "string")
            {
                title = ThriftTStr.SetupErr;
            } else {
                if (error["error"].includes("expired")) {
                    title = ThriftTStr.SetupErr;
                    errorStruct = {"lockScreen": true, "expired": true};
                } else if (error["error"].includes("Update required")) {
                    title = ThriftTStr.UpdateErr;
                    error = ErrTStr.Update;
                } else if (error["error"].includes("Connection")) {
                    title = ThriftTStr.CCNBEErr;
                    errorStruct["noLogout"] = true;
                } else {
                    title = ThriftTStr.SetupErr;
                }
            }
            locationText = StatusMessageTStr.Error;
            // check whether there's another alert that's already on the screen
            Alert.error(title, error, errorStruct);
        }
        StatusMessage.updateLocation(true, locationText);
    }

    /**
     * xcManager.isInSetup
     * returns true if the webpage is in setup mode
     */
    export function isInSetup(): boolean {
        return $("body").hasClass("xc-setup") ||
               $("body").hasClass("xc-setup-error");
    };

    /**
     * xcManager.getStatus
     * returns the setup status
     */
    export function getStatus(): string {
        return setupStatus;
    };

    /**
     * xcManager.isStatusFail
     * returns true if setup has failed
     */
    export function isStatusFail(): boolean {
        return (setupStatus === SetupStatus["Fail"]);
    };

    /**
     * xcManager.unload
     * unloads user's resources from XD
     * @param isAsync - boolean, if request is async
     * @param doNotLogout - if user should not be logged out durring unload
     */
    export function unload(isAsync: boolean = false, doNotLogout: boolean = false): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (isAsync) {
            // async unload should only be called in beforeload
            // this time, no commit, only free result set
            // as commit may only partially finished, which is dangerous
            return deferred.reject("Async unload");
        } else {
            let promise: XDPromise<void> = PromiseHelper.resolve();
            let currentUser = XcUser.CurrentUser;
            if (currentUser != null) {
                promise = currentUser.releaseSession();
            }
            promise
            .fail(function(error) {
                console.error(error);
            })
            .always(function() {
                xcManager.removeUnloadPrompt();
                if (doNotLogout) {
                    window["location"]["href"] = paths.index;
                } else {
                    logoutRedirect();
                }
                return deferred.resolve();
            });
        }

        return deferred.promise();
    };

    /**
     * xcManager.reload
     * @param hardLoad
     */
    export function reload(hardLoad: boolean = false): void {
        // override heartbeat check function so that it cannot run during reload
        XcSupport.heartbeatCheck = () => false;
        xcManager.removeUnloadPrompt(true);
        location.reload(hardLoad);
    }


    /**
     * xcManager.forceLogout
     * logs the user out with no confirmation modals
     */
    export function forceLogout(): void {
        xcManager.removeUnloadPrompt();
        logoutRedirect();
    };

    /**
     * xcManager.removeUnloadPrompt
     * Removes prompt for user unload.
     * @param markUser - boolean, if true record the time the user unloaded
     */
    export function removeUnloadPrompt(markUser: boolean = false): void {
        // ENG-8039, this is a temp workaround, correct fix should at the wetty side
        $("#shellPanel").remove();

        window.onbeforeunload = function() {
            if (markUser) {
                markUserUnload();
            }
        }; // Do not enable prompt
        window.onunload = function() {};
    };

    function markUserUnload(): void {
        const xcSocket: XcSocket = XcSocket.Instance;
        if (xcSocket.isResigered() && WorkbookManager.getLastActiveWKBK()) {
            xcSessionStorage.setItem(WorkbookManager.getLastActiveWKBK(), String(new Date().getTime()));
        }
    }

    function browserAlert() {
        if (!window["isBrowserSupported"]) {
            Alert.error(AlertTStr.UnsupportedBrowser, "", {
                msgTemplate: AlertTStr.BrowserVersions,
                sizeToText: true
            });
        } else if (!window["isBrowserChrome"] &&
            !xcLocalStorage.getItem("ignoreNotChrome")){
            Alert.error(AlertTStr.BrowserWarning, "", {
                msgTemplate: AlertTStr.NotChrome,
                sizeToText: true,
                isCheckBox: true,
                onCancel: (checked) => {
                    if (checked) {
                        xcLocalStorage.setItem("ignoreNotChrome", "true");
                    }
                }
            });
        }
    }

    function oneTimeSetup(): XDPromise<any> {
        function initLocks() {
            const keys: any = WorkbookManager.getGlobalScopeKeys(Durable.Version);
            const keyAttrs: object[] = [{
                "key": keys.gSettingsKey,
                "scope": gKVScope.GLOB
            }];
            const promises: XDPromise<void>[] = [];

            keyAttrs.forEach(function(keyAttr) {
                const mutex: Mutex = KVStore.genMutex(keyAttr["key"], keyAttr["scope"]);
                const concurrency: Concurrency = new Concurrency(mutex);
                promises.push(concurrency.initLock());
            });
            let def: XDDeferred<any> = PromiseHelper.deferred();
            PromiseHelper.when.apply(this, promises)
            .then(def.resolve)
            .fail(args => def.reject(xcHelper.getPromiseWhenError(args)));
            return def.promise();
        }

        function actualOneTimeSetup(force: boolean = false): XDPromise<any> {
            let def: XDDeferred<any> = PromiseHelper.deferred();
            let markAsAlreadyInit: () => XDPromise<any> = function() {
                return XcalarKeyPut(GlobalKVKeys.InitFlag,
                                        InitFlagState.AlreadyInit, false,
                                        gKVScope.GLOB);
            };
            const initPhase: Function = function(): XDPromise<any> {
                const innerDeferred: XDDeferred<any> = PromiseHelper.deferred();
                initLocks()
                .then(function() {
                    return markAsAlreadyInit();
                })
                .then(innerDeferred.resolve)
                .fail(function(error) {
                    if (force && error === ConcurrencyEnum.AlreadyInit) {
                        // we see this issue, patch a fix
                        markAsAlreadyInit()
                        .then(innerDeferred.resolve)
                        .fail(innerDeferred.reject);
                    } else {
                        innerDeferred.reject(error);
                    }
                });

                return innerDeferred.promise();
            };

            XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.GLOB)
            .then(function(ret) {
                if (!ret || ret.value !== InitFlagState.AlreadyInit) {
                    return initPhase();
                }
            })
            .then(def.resolve)
            .fail(def.reject);

            return def.promise();
        }

        function forceOverwrite(deferred: XDDeferred<StatusT>): void {
            hideInitialLoadScreen();
            $("#initialLoadScreen").show();
            console.error("error occurred, Force overwrite");
            actualOneTimeSetup(true)
            .then(function() {
                // Force unlock
                return XcalarKeyPut(
                                GlobalKVKeys.XdFlag,
                                "0", false, gKVScope.GLOB);
            })
            .then(deferred.resolve)
            .fail(function(err) {
                console.error(err, "SEVERE ERROR: Race " +
                                "conditions ahead");
                deferred.resolve();
            });
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.GLOB)
        .then(function(ret) {
            if (ret && ret.value === InitFlagState.AlreadyInit) {
                deferred.resolve();
            } else {
            // NOTE: Please do not follow this for generic concurrency use.
            // This is a one time setup where the lock init phase is part of the
            // backend startup process
                const globalMutex: Mutex = new Mutex(GlobalKVKeys.XdFlag, XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal);
                const concurrency: Concurrency = new Concurrency(globalMutex);
                concurrency.tryLock()
                .then(function() {
                    return actualOneTimeSetup();
                })
                .then(function() {
                    return concurrency.unlock();
                })
                .then(deferred.resolve)
                .fail(function(err) {
                    if (err === ConcurrencyEnum.OverLimit) {
                        setTimeout(function() {
                            XcalarKeyLookup(GlobalKVKeys.InitFlag,
                                            gKVScope.GLOB)
                            .then(function(ret) {
                                if (ret &&
                                    ret.value === InitFlagState.AlreadyInit) {
                                    // All good
                                    deferred.resolve();
                                } else {
                                    forceOverwrite(deferred);
                                }
                            })
                            .fail(function(err) {
                                console.error(err);
                                forceOverwrite(deferred);
                            });
                        }, 5000);
                    } else {
                        forceOverwrite(deferred);
                    }
                });
            }
        })
        .fail(function(err) {
            console.error("Error Setting up global flags. May have race " +
                          "conditions later. Letting it go through", err);
            deferred.resolve();
        });
        return deferred.promise();
    }

    function setupSession(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        WorkbookManager.setup()
        .then((wkbkId) => {
            return XcUser.CurrentUser.holdSession(wkbkId, false);
        })
        .then(() => {
            // restores table info, dataset info, settings etc
            return KVStore.restoreWKBKInfo();
        })
        .then(() => {
            const promise = Authentication.setup();
            return PromiseHelper.convertToJQuery(promise);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupConfigParams(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        Admin.refreshParams()
        .then(function(params) {
            try {
                const paraName: string = "maxinteractivedatasize";
                const size: number = Number(params[paraName].paramValue);
                setMaxSampleSize(size);
            } catch (error) {
                console.error("error case", error);
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function loadDynamicPath(): XDPromise<void> {
        const dynamicSrc: string = 'https://www.xcalar.com/xdscripts/dynamic.js';
        const randId: string = String(Math.ceil(Math.random() * 100000));
        const src: string = dynamicSrc + '?r=' + randId;
        return $.getScript(src);
    }

    function checkHotPathEnable(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        adminTools.getHotPatch()
        .then(function(res) {
            if (res.hotPatchEnabled) {
                deferred.resolve();
            } else {
                console.info("Hot Patch is disabled");
                deferred.reject(null, true);
            }
        })
        .fail(function() {
            deferred.resolve(); // still  resolve it
        });

        return deferred.promise();
    }

    function hotPatch(): XDPromise<void> {
        if (XVM.isOnAWS()) {
            // data mart cannot use hotpatch, as VPC may block external internet
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        checkHotPathEnable()
        .then(function() {
            return loadDynamicPath();
        })
        .then(function() {
            try {
                if (typeof XCPatch.patch !== 'undefined') {
                    const promise: XDPromise<void> = XCPatch.patch();
                    if (promise != null) {
                        return promise;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        })
        .then(deferred.resolve)
        .fail(function(error, isHotPatchDisabled) {
            if (!isHotPatchDisabled) {
                console.error("failed to get script", error);
            }
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function setupWKBKIndependentPanels(): XDPromise<void> {
        KVStore.setupUserAndGlobalKey();
        window["reactHack"]["setupLoadHistoryView"](); // set up load history list
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        setupConfigParams()
        .then(() => {
            return PromiseHelper.alwaysResolve(DSTargetManager.initialize());
        })
        .then(() => {
            return KVStore.restoreUserAndGlobalInfo();
        })
        .then(() => {
            FileBrowser.restore();
        })
        .then(() => {
            // this is needed for load wizard with is independent of workbook
            let promise = PTblManager.Instance.getTablesAsync();
            return PromiseHelper.alwaysResolve(promise);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setMaxSampleSize(size: number): void {
        if (size != null) {
            gMaxSampleSize = size;
        }
    }

    // excludes alert modal wish is set up earlier
    function setupModals(): void {
        Profile.setup();
        WorkbookPanel.setup();
        WorkbookInfoModal.setup();
    }

    function setupUserArea(): void {
        UserMenu.Instance.setup();
        MemoryAlert.Instance.setup();
        HelpMenu.Instance.setup();
    }

    function setupSocket(): XcSocket {
        const xcSocket: XcSocket = XcSocket.Instance;
        xcSocket.setup();
        return xcSocket;
    }

    function documentReadyGeneralFunction(): void {
        $(document).keydown(function(event: JQueryEventObject): void {
            let isPreventEvent: boolean;

            switch (event.which) {
                case keyCode.PageUp:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "pageUpdown", true);
                    break;
                case keyCode.Space:
                case keyCode.PageDown:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "pageUpdown", false);
                    break;
                case keyCode.Up:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "updown", true);
                    break;
                case keyCode.Down:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "updown", false);
                    break;
                case keyCode.Home:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "homeEnd", true);
                    break;
                case keyCode.End:
                    isPreventEvent = TblFunc.scrollTable(gActiveTableId, "homeEnd", false);
                    break;
                default:
                    TblFunc.keyEvent(event);
                    break;
            }

            if (isPreventEvent) {
                event.preventDefault();
            }
        });

        window.onbeforeunload = function(): string {
            xcManager.unload(true);
            markUserUnload();
            return CommonTxtTstr.LeaveWarn;
        };
        window.onunload = function(): void {
            if (typeof mixpanel !== "undefined") {
                xcMixpanel.pageUnloadEvent();
            }
        };

        let winResizeTimer: number;
        let resizing: boolean = false;
        let otherResize: boolean = false; // true if winresize is triggered by 3rd party code
        let modalSpecs: ModalSpec;
        const windowSpecs: WindowSpec = {
            winHeight: $(window).height(),
            winWidth: $(window).width()
        };

        $(window).resize(function(event: JQueryEventObject): void {
            if (!resizing) {
                xcMenu.close();
                resizing = true;
                const $modal: JQuery = $('.modalContainer:visible');
                if ($modal.length && !$modal.hasClass("noWinResize")) {
                    modalSpecs = {
                        $modal: $modal,
                        top: $modal.offset().top,
                        left: $modal.offset().left
                    };
                } else {
                    modalSpecs = null;
                }
            }

            if (event.target !== <any>window) {
                otherResize = true;
            } else {
                otherResize = false;
            }

            clearTimeout(winResizeTimer);
            winResizeTimer = <any>setTimeout(winResizeStop, 100);
        });

        function winResizeStop(): void {
            if (otherResize) {
                otherResize = false;
            } else {
                TblFunc.repositionOnWinResize();
                if (modalSpecs) {
                    ModalHelper.repositionModalOnWinResize(modalSpecs,
                                                        windowSpecs);
                }
            }
            resizing = false;
        }

        // using this to keep window from scrolling on dragdrop
        $(window).scroll(function(): void {
            $(this).scrollLeft(0);
        });

        // using this to keep window from scrolling up and down;
        $('#container').scroll(function(): void {
            $(this).scrollTop(0);
        });

        $(document).mousedown(function(event: JQueryEventObject): void {
            if (window["isBrowserMicrosoft"] && event.shiftKey) {
                // prevents text from being selected on shift click
                const cachedFn: any = document.onselectstart;
                document.onselectstart = function() {
                    return false;
                };
                setTimeout(function() {
                    document.onselectstart = cachedFn;
                }, 0);
            }

            const $target: JQuery = $(event.target);
            gMouseEvents.setMouseDownTarget($target);
            const clickable: boolean = $target.closest('.menu').length > 0 ||
                            $target.closest('.clickable').length > 0 ||
                            $target.hasClass("highlightBox");
            if (!clickable && $target.closest('.dropdownBox').length === 0) {
                xcMenu.close();
                if (!$target.is(".xc-tableArea .viewWrap") &&
                    !$target.closest(".tableScrollBar").length) {
                    TblManager.unHighlightCells();
                }
            }

            if (!$('#sqlWorkSpacePanel').hasClass('active') ||
                DagTable.Instance.getTable() == null) {
                // if not on modelingDagPanel panel, or no tables then we're done
                return;
            }

            /*
            The spots you can click on where the fnBar and column DO NOT get
            cleared or deselected:
                - selected column header
                - selected column cells
                - the function bar
                - any menu list item
                - table scroll bar of the respective column's table
                - the draggable resizing area on the right side of the left panel
                - the draggable resizing area on the top of the QG panel
                - the maximize/close buttons on the QG panel
            */

            // if (!$target.closest(".header").length &&
            //     !$target.closest(".selectedCell").length &&
            //     !$target.closest(".menu").length &&
            //     // $target.attr("id") !== "mainFrame" &&
            //     !$target.hasClass("ui-resizable-handle") &&
            //     !$target.closest("li.column").length &&
            //     !$target.closest(".tableScrollBar").length) {

            //     $(".selectedCell").removeClass("selectedCell");
            // }
        });

        let dragCount: number = 0; // tracks document drag enters and drag leaves
        // as multiple enters/leaves get triggered by children
        $(document).on('dragenter', function(event: JQueryEventObject): void {
            const dt: any = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {

                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';

                $('.xc-fileDroppable').addClass('xc-fileDragging');
                dragCount++;
            }
        });

        $(document).on('dragover', function(event: JQueryEventObject): void {
            const dt = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {
                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';
            }
        });

        $(document).on('dragleave', function(event: JQueryEventObject): void {
            let dt: DataTransfer = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.includes('Files'))) {
                dragCount--;
                if (dragCount === 0) {
                    $('.xc-fileDroppable').removeClass('xc-fileDragging');
                }
            }
        });

        $(document).on('drop', function(event: JQueryEventObject): void {
            event.preventDefault();
            $('.xc-fileDroppable').removeClass('xc-fileDragging');
        });

        $(window).blur(function(): void {
            xcMenu.close();
        });

        setupMouseWheel();

        if (!window["isBrowserChrome"]) {
            //  prevent cursor from showing in IE and firefox
            $(document).on('focus', 'input[readonly]', function(){
                this.blur();
            });
        }

        window.onerror = function(msg: string|Event, url: string, line: number, column: number, error: Error): void {
            if (msg === "Script error." && line === 0 && column === 0) {
                // innocuous error, ignore
                return;
            }
            const prevMouseDownInfo = gMouseEvents.getLastMouseDownTargetsSerialized();
            let stack: string[] = null;
            if (error && error.stack) {
                stack = error.stack.split("\n");
            }
            if (msg === "Uncaught SyntaxError: Unexpected token '<'" && stack && stack[1] &&
                stack[1].includes("/thrift.js") &&
                stack[1].includes("Thrift.TJSONProtocol.Thrift.Protocol.readMessageBegin")) {
                XcUser.logoutWarn(); // html returned from thrift = session expired
                return;
            }

            let info = {
                "error": msg,
                "url": url,
                "line": line,
                "column": column,
                "stack": stack,
                "txCache": xcHelper.deepCopy(Transaction.getCache()),
                "browser": window.navigator.userAgent,
                "platform": window.navigator.platform,
                "logCursor": Log.getCursor(),
                "lastMouseDown": prevMouseDownInfo,
            };
            if (window["debugOn"] || window['unitTestMode']) {
                xcConsole.log(msg, url + ":" + line + ":" + column, {stack: stack});
            } else {
                xcConsole.log(msg, url + ":" + line + ":" + column);
            }

            Log.errorLog("Console error", null, null, info);

            // if debugOn, xcConsole.log will show it's own error
            // if no stack, then it's a custom error, don't show message
            if (!window["debugOn"] && stack &&
                !(isBrowserIE && (msg === "Unspecified error." ||
                    (stack[1] && stack[1].indexOf("__BROWSERTOOLS") > -1)))) {

                if (typeof mixpanel !== "undefined") {
                    xcMixpanel.errorEvent("XDCrash", {
                        msg: msg,
                        url: url,
                        line: line,
                        column: column,
                        stack: stack
                    });
                }

                Alert.error(ErrTStr.RefreshBrowser, ErrTStr.RefreshBrowserDesc, <Alert.AlertErrorOptions>{
                    "browserError": true,
                    "buttons": [{
                        className: "refresh",
                        name: "Refresh",
                        func: function() {
                            // wait for commit to finish before refreshing
                            xcManager.reload();
                        }
                    }]
                });
            }
        };
    }

    let logoutRedirect: Function = function(): void {
        let msalUser: string = null;
        let msalAgentApplication: Msal.UserAgentApplication = null;
        const config: any = getMsalConfigFromLocalStorage();

        if (typeof mixpanel !== "undefined") {
            xcMixpanel.logout();
        }
        if (config != null &&
            config.hasOwnProperty('msal') &&
            config.msal.hasOwnProperty('enabled') &&
            config.msal.enabled) {

            const msalLogger: Msal.Logger = new Msal.Logger(
                msalLoggerCallback,
                { level: Msal["LogLevel"].Verbose, correlationId: '12345' }
            );

            function msalLoggerCallback(_logLevel, message, _piiEnabled) {
                console.log(message);
            }

            function msalAuthCallback(_errorDesc, _token, _error, _tokenType) {
                // this callback function provided to UserAgentApplication
                // is intentionally empty because the logout callback does
                // not need to do anything
            }

            msalAgentApplication = new Msal.UserAgentApplication(
                config.msal.clientID,
                null,
                msalAuthCallback,
                { cacheLocation: 'sessionStorage', logger: msalLogger }
            );

            msalUser = msalAgentApplication.getUser();
        }

        if (msalUser != null) {
            msalAgentApplication.logout();
        } else if (XVM.isCloud() &&
            window.location.hostname !== "localhost"
        ) {
            window.location = <any>(paths.cloudLogin + "?logout");
        } else {
            window["location"]["href"] = paths.dologout;
        }
    }

    function isRetinaDevice(): boolean {
        return window.devicePixelRatio > 1;
    }

    function setupTooltips(): XDPromise<void> {
        return PromiseHelper.alwaysResolve(
            TooltipWalkthroughs.setupInitialWalkthroughCheck());
    }

    function reImplementMouseWheel(e: JQueryEventObject): void {
        let deltaX: number = e.originalEvent["wheelDeltaX"] * -1;
        let deltaY: number = e.originalEvent["wheelDeltaY"];
        if (isNaN(deltaX)) {
            deltaX = e["deltaX"];
        }
        if (isNaN(deltaY)) {
            deltaY = e["deltaY"];
        }
        let x: number = Math.abs(deltaX);
        let y: number = Math.abs(deltaY);
        // iterate over the target and all its parents in turn
        const $target: JQuery = $(e.target);
        const $pathToRoot: JQuery = $target.add($target.parents());

        // this is to fix the issue when scroll table
        // both horizontally and verticall will move
        if ($target.closest(".dataTable").length) {
            if (y > x) {
                x = 0;
            } else if (x > y) {
                y = 0;
            }
        }
        $($pathToRoot.get().reverse()).each(function() {
            const $el: JQuery = $(this);
            let delta: number;

            if ($el.css("overflow") !== "hidden") {
                // do horizontal scrolling
                if (deltaX > 0) {
                    let scrollWidth: number = $el.prop("scrollWidth");
                    // because there is a rowReiszer in .idWrap,
                    // which wrongly detect the element as scrollable
                    // we just skip it
                    if ($el.closest(".dataTable").length) {
                        scrollWidth = 0;
                    }

                    const scrollLeftMax: number = scrollWidth - $el.outerWidth();
                    if ($el.scrollLeft() < scrollLeftMax) {
                        // we can scroll right
                        delta = scrollLeftMax - $el.scrollLeft();
                        if (x < delta) {
                            delta = x;
                        }
                        x -= delta;
                        $el.scrollLeft($el.scrollLeft() + delta);
                    }
                } else {
                    if ($el.scrollLeft() > 0) {
                        // we can scroll left
                        delta = $el.scrollLeft();
                        if (x < delta) {
                            delta = x;
                        }
                        x -= delta;
                        $el.scrollLeft($el.scrollLeft() - delta);
                    }
                }

                // do vertical scrolling
                if (deltaY < 0) {
                    const scrollHeight: number = $el.prop("scrollHeight");
                    const scrollTopMax: number = scrollHeight - $el.outerHeight();
                    if ($el.scrollTop() < scrollTopMax) {
                        // we can scroll down
                        delta = scrollTopMax - $el.scrollTop();
                        if (y < delta) {
                            delta = y;
                        }
                        y -= delta;
                        $el.scrollTop($el.scrollTop() + delta);
                    }
                } else {
                    if ($el.scrollTop() > 0) {
                        // we can scroll up
                        delta = $el.scrollTop();
                        if (y < delta) {
                            delta = y;
                        }
                        y -= delta;
                        $el.scrollTop($el.scrollTop() - delta);
                    }
                }
            }
        });
    }

    // Note: This including two cases in mac
    // Case 1: if it's Chrome in retina dispaly or fireforx
    // reimplement the wheel scroll to resolve the jitter issue
    // and the same time, it can prevent both back/forwad swipe
    // Case 2: for other cases, only prevent back swipe
    // (not found a good soution to also prevent forward)
    function setupMouseWheel(): void {
        $(window).on("mousewheel", function(event: JQueryEventObject): void {
            // This code is only valid for Mac
            if (!window["isSystemMac"]) {
                return;
            }

            const isBrowserToHandle: boolean = window["isBrowserChrome"]
                                || window["isBrowserFirefox"]
                                || window["isBrowserSafari"];
            if (!isBrowserToHandle) {
                return;
            }

            if ((window["isBrowserChrome"] && isRetinaDevice()
                || window["isBrowserFirefox"]) &&
                ($(event.target).closest(".dataTable").length))
            {
                reImplementMouseWheel(event);
                // prevent back/forward swipe
                event.preventDefault();
                return;
            }

            const $target: JQuery = $(event.target);
            const $parents: JQuery = $(event.target).parents().add($target);
            // If none of the parents can be scrolled left
            // when we try to scroll left
            const prevent_left: boolean = event["deltaX"] < 0 && $parents.filter(function() {
                return $(this).scrollLeft() > 0;
            }).length === 0;

            // If none of the parents can be scrolled up
            // when we try to scroll up
            const prevent_up: boolean = event["deltaY"] > 0 && $parents.filter(function() {
                return $(this).scrollTop() > 0;
            }).length === 0;
            // Prevent swipe scroll,
            // which would trigger the Back/Next page event
            if (prevent_left || prevent_up) {
                event.preventDefault();
            }
        });
    }

    /* Unit Test Only */
    if (window["unitTestMode"]) {
        let oldLogoutRedirect: Function;
        xcManager["__testOnly__"] = {
            handleSetupFail: handleSetupFail,
            reImplementMouseWheel: reImplementMouseWheel,
            oneTimeSetup: oneTimeSetup,
            fakeLogoutRedirect: function() {
                oldLogoutRedirect = logoutRedirect;
                logoutRedirect = function() {};
            },
            resetLogoutRedirect: function() {
                logoutRedirect = oldLogoutRedirect;
            }
        };
    }
    /* End Of Unit Test Only */
}