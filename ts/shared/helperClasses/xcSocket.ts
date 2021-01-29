interface UserOption {
    user: string;
    id: string;
}

class XcSocket {
    private static _instance: XcSocket;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _socket: SocketIOClient.Socket;
    private _isRegistered: boolean;
    private _initDeferred: XDDeferred<void>;

    private constructor() {
        this._socket = null;
        this._isRegistered = false; // becomes true when has an active wkbk
        this._initDeferred = null;
    }

    /**
     * xcSocket.setup
     */
    public setup(): void {
        this._initDeferred = PromiseHelper.deferred();
        const url: string = this._getExpServerUrl(hostname);
        this._socket = io.connect(url, {
            "reconnectionAttempts": 10
        });
        this._registerBrowserSession();
        this._addAuthenticationEvents();
        this._addWorkbookEvents();
        this._addPublishTableEvents();
        this._addNotificationEvent();
    }

    public addEventsAfterSetup(): void {
        this._addSocketEventsAfterSetup();
    }

    public checkUserSessionExists(workbookId: string): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        const initDeferred = this._initDeferred;
        // time out after 15s
        this._checkConnection(initDeferred, 15000);

        initDeferred.promise()
        .then(() => {
            const userOption: UserOption = this._getUserOption(workbookId);
            this._socket.emit('checkUserSession', userOption, (exist) => {
                deferred.resolve(exist);
            });

            // time out after 20s
            this._checkConnection(deferred, 20000, true);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // when entering a workbook
    public registerUserSession(workbookId: string): boolean {
        if (this._isRegistered) {
            console.warn("already registered");
            return false;
        }

        const userOption: UserOption = this._getUserOption(workbookId);
        this._socket.emit("registerUserSession", userOption, () => {
            console.info("registerSuccess!");
            this._isRegistered = true;
        });

        return true;
    }

    // when deactivating workbook
    public unregisterUserSession(workbookId: string): boolean {
        if (!this._isRegistered) {
            return false;
        }
        this._isRegistered = false;
        const userOption: UserOption = this._getUserOption(workbookId);
        this._socket.emit("unregisterUserSession", userOption, () => {
            console.info("unregisterSuccess!");
        });

        return true;
    }

    public isConnected(): boolean {
        return this._socket.connected;
    }

    public isResigered(): boolean {
        return this._isRegistered;
    }

    public sendMessage(msg: string, arg?: any, callback?: Function): boolean {
        if (this._socket == null) {
            return false;
        }
        this._socket.emit(msg, arg, callback);
        return true;
    }

    private _getExpServerUrl(host: string): string {
        // check if expHost is defined or not at a global level
        // and if expHost is either undefined or null
        if (typeof expHost !== 'undefined' && expHost != null) {
            return expHost;
        }
        return host;
    }

    private _registerBrowserSession() {
        this._socket.emit("registerBrowserSession", XcUser.getCurrentUserName(), () => {
            console.info("browser session registered!");
        });
    }

    // check https://xcalar.atlassian.net/wiki/spaces/EN/pages/699400256/Notification+API
    // for api spec
    private _handleNotification(info: {
        user: string,
        sessionId: string,
        notebookName: string,
        type: string,
        content: string
    }): boolean {
        try {
            const { user, sessionId, notebookName, type, content } = info;
            if (user && user !== XcUser.getCurrentUserName()) {
                // when user not match
                return false;
            }

            if (sessionId) {
                const notebooks = WorkbookManager.getWorkbooks();
                let found = false;
                for (let name in notebooks) {
                    const notebook = notebooks[name];
                    if (notebook &&
                        notebook.sessionId === sessionId &&
                        name === WorkbookManager.getActiveWKBK()
                    ) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            }

            if (notebookName && notebookName !== WorkbookManager.getActiveWKBK()) {
                // when the notebook not match
                return false;
            }

            switch (type) {
                case NotificationEnum.refreshTable:
                    PTblManager.Instance.getTablesAsync(true);
                    break;
                default:
                    Alert.show({
                        title: "Notification",
                        msg: content,
                        isAlert: true
                    });
                    break;
            }
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    private _addNotificationEvent(): void {
        const socket = this._socket;
        socket.on("notification", (info) => {
            this._handleNotification(info);
        });
    }

    // receives events even if user is not in a workbook
    private _addWorkbookEvents(): void {
        const socket = this._socket;
        socket.on("refreshWorkbook", (info) => {
            WorkbookManager.updateWorkbooks(info);
        });
    }

    private _addPublishTableEvents(): void {
        const socket = this._socket;
        // receives events even if user is not in a workbook
        socket.on("refreshIMD", (arg) => {
            PTblManager.Instance.updateInfo(arg);
        });
    }

    private _addAuthenticationEvents(): void {
        const socket = this._socket;
        socket.on('error', (error) => {
            console.error('error', error)
        });

        socket.on('connect', () => {
            console.info('socket is connected!');
            this._initDeferred.resolve();
        });

        socket.on('disconnect', () => {
            console.error('socket is disconnected!');
            this._disconnectHandler();
        });

        socket.on('reconnect_failed', () => {
            console.error('connect failed');
            this._initDeferred.reject(AlertTStr.NoConnectToServer);
        });

        socket.on('connect_timeout', (timeout) => {
            console.error('connect timeout', timeout);
            this._initDeferred.reject(AlertTStr.NoConnectToServer);
        });

        socket.on('useSessionExisted', (userOption) => {
            if (!this._isRegistered) {
                return;
            }
            console.warn(userOption, 'exists');
            if (userOption.id === WorkbookManager.getActiveWKBK()) {
                WorkbookManager.gotoWorkbook(null, true);
            }
        });

        socket.on('system-allUsers', (userInfos) => {
            if (!this._isRegistered) {
                return;
            }
            XVM.checkMaxUsers(userInfos);
            Admin.updateLoggedInUsers(userInfos);
        });

        socket.on('adminAlert', (alertOption) => {
            if (!this._isRegistered) {
                return;
            }
            Alert.show({
                title: alertOption.title,
                msg: alertOption.message,
                isAlert: true
            });
        });

        socket.on('logout', (_userOption) => {
            // check if the tab still holds valid cookies
            XcUser.checkCurrentUser();
        });

        socket.on('clusterStopWarning', async () => {
            if (XVM.isCloud()) {
                const queries = await XcalarQueryList("*");
                const queriesInProgress = queries.filter((query) => {
                    return query.state === QueryStateTStr[QueryStateT.qrProcessing];
                });
                // prevent shut down if query is in progress
                if (queriesInProgress.length > 0) {
                    XcSocket.Instance.sendMessage("updateUserActivity", {
                        isCloud: XVM.isCloud()
                    });
                } else {
                    XcUser.clusterStopWarning();
                }
            }
        });

        socket.on("logoutMessage", () => {
            if (XVM.isCloud()) {
                XcUser.logout();
            }
        });

        // socket.on("lowCreditWarning", () => {
        //     if (XVM.isCloud()) {
        //         MessageModal.Instance.show({
        //             title: "You are out of credits...",
        //             msg: AlertTStr.ShutDownCredits,
        //             sizeToText: true,
        //             size: "medium",
        //             isAlert: true
        //         });
        //     }
        // });

        socket.on("updateUserActivity", (args) => {
            XcUser.CurrentUser.updateUserActivity(args);
        });

        socket.on("consoleMsg", (msg) => {
            console.log(msg);
        });
    }

    private _addSocketEventsAfterSetup(): void {
        const socket = this._socket;

        socket.on('refreshUDF', (refreshOption: { isUpdate: boolean, isDelete: boolean }) => {
            if (!this._isRegistered) {
                return;
            }
            UDFFileManager.Instance.refresh(refreshOption.isUpdate, refreshOption.isDelete);
        });

        socket.on("refreshUserSettings", () => {
            if (!this._isRegistered) {
                return;
            }
            UserSettings.Instance.sync();
        });

        socket.on("refreshDagCategory", () => {
            if (!this._isRegistered) {
                return;
            }
            DagCategoryBar.Instance.loadCategories();
        });
    }

    private _checkConnection(
        deferred: XDDeferred<any>,
        timeout: number,
        resolve: boolean = false
    ): void {
        setTimeout(() => {
            if (deferred.state() !== 'resolved') {
                if (resolve) {
                    console.error(AlertTStr.NoConnectToServer);
                    deferred.resolve();
                } else {
                    deferred.reject(AlertTStr.NoConnectToServer);
                }
            }
        }, timeout);
    }

    private _getUserOption(workbookId: string): UserOption {
        return {
            user: XcUser.getCurrentUserName(),
            id: workbookId
        };
    }

    /**
     * There are 2 cases, one is server is fine but client somehow disconnect
     * another is server restarts.
     * The disconnect handler on server side already handle case 1
     * so we only need to call hold session again when connect is back
     * Note that socket io will try reconnect and
     * if succeed the connect event will be triggered
     */
    private _disconnectHandler() {
        // connect event will connect to it if works
        this._initDeferred = PromiseHelper.deferred();
        this._isRegistered = false;
        const wkbkId: string = WorkbookManager.getActiveWKBK();
        XcUser.CurrentUser.holdSession(wkbkId, false)
        .fail(function(err) {
            if (err === WKBKTStr.Hold) {
                WorkbookManager.gotoWorkbook(null, true);
            } else {
                // should be an connection error
                XcSupport.checkConnection();
            }
        });
    }
}