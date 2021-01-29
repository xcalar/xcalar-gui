class XcUser {
    public static firstCreditWarningLimit: number; // XXX temporary
    public static lastCreditWarningLimit: number; // XXX temporary
    private static _currentUser: XcUser;
    private static _isLogoutTimerOn: boolean = false;
    private static readonly _logOutWarningTime = 60; // in seconds
    private static _creditUsageInterval = null;
    private static readonly _creditUsageCheckTime = 1 * 60 * 1000;
    private static _isIdleCheckOn = true;
    private static _clusterStopCountdown: number;
    public static readonly firstCreditWarningTime: number = 20; // minutes
    public static readonly lastCreditWarningTime: number = 1; // minutes

    public static get CurrentUser(): XcUser {
        return this._currentUser;
    }

    /**
     * Xcuser.getCurrentUserName
     */
    public static getCurrentUserName(): string {
        return this._currentUser ? this._currentUser.getName() : null;
    }

    /**
     * Xcuser.setCurrentUser, this function call only be called once
     */
    public static setCurrentUser(): XDPromise<void> {
        if (this._currentUser != null) {
            // when already set, skip
            return PromiseHelper.reject("Current user already exists");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let setCurrentUserHelper: Function = (username, isAdmin) => {
            const posingUser: string = xcSessionStorage.getItem("usingAs");
            if (posingUser != null) {
                username = posingUser;
                isAdmin = false;
            }
            const user: XcUser = new this(username, isAdmin);
            this._currentUser = user;
            XcUser.setUserSession(user);
            XcUser.CurrentUser.extendCookies();
            if (this._isIdleCheckOn) {
                XcUser.CurrentUser._isIdle = false;
                XcUser.CurrentUser.idleCheck();
            }
        };

/** START DEBUG ONLY **/
        if (typeof gLoginEnabled !== "undefined" && gLoginEnabled === false ||
            xcSessionStorage.getItem("gLoginEnabled") === "false") {
            const username = xcSessionStorage.getItem("xcalar-username");
            if (username != null) {
                const isAdmin = xcSessionStorage.getItem("xcalar-admin") === "true";
                setCurrentUserHelper(username, isAdmin);
                deferred.resolve();
                return deferred.promise();
            } else {
                xcManager.forceLogout();
            }
        }
/** END DEBUG ONLY **/
        XcUser.checkCurrentUser()
        .then((data) => {
            setCurrentUserHelper(data.username, data.admin);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XcUser.checkCurrentUser
     */
    public static checkCurrentUser(): XDPromise<{username: string, admin: boolean}> {
/** START DEBUG ONLY **/
        if (typeof gLoginEnabled !== "undefined" && gLoginEnabled === false ||
            xcSessionStorage.getItem("gLoginEnabled") === "false") {
                // skip check in this case
                return PromiseHelper.resolve();
        }
/** END DEBUG ONLY **/
    const deferred: XDDeferred<{username: string, admin: boolean}> = PromiseHelper.deferred();
        HTTPService.Instance.ajax({
            "type": "GET",
            "contentType": "application/json",
            "url": xcHelper.getAppUrl() + "/auth/sessionStatus",
            "success": function(data) {
                try {
                    if (data.loggedIn === true) {
                        deferred.resolve(data);
                    } else  {
                        XcUser.logoutWarn();
                        deferred.reject("Authentication Fails");
                    }
                } catch (e) {
                    console.error(e);
                    deferred.reject("Authentication Fails");
                }
            },
            "error": function(e) {
                console.error(e);
                deferred.reject("Authentication Error");
            }
        });

        return deferred.promise();
    }

    /**
     * XcUser.setUserSession
     * @param user
     */
    public static setUserSession(user: XcUser): void {
        if (user._username == null) {
            throw "Invalid User";
        }
        userIdName = user._username;
        userIdUnique = user._userIdUnique;
    }

    /**
     * XcUser.resetUserSession
     */
    public static resetUserSession(): void {
        this.setUserSession(this._currentUser);
    }

    // if isLogoutTimerOn = true, will ignore userActivity
    public static toggleLogoutTimer(on: boolean) {
        this._isLogoutTimerOn = on;
    }

    // alert for when cluster is going to shut down in 60 seconds
    public static clusterStopWarning() {
        const interval = 1000; // 60sec, 59sec, 58sec etc
        let timeLeft = this._logOutWarningTime;
        XcUser.toggleLogoutTimer(true); // declares countdown timer to be on

        const alertId = Alert.show({
            title: "Cluster Inactivity",
            msg: "Cluster has been inactive and will shut down in 60 seconds.",
            isAlert: true,
            buttons: [
                {
                    name: "Keep Using",
                    className: "keepUsing btn-primary",
                    func: () => {
                        clearTimeout(this._clusterStopCountdown);
                        this.toggleLogoutTimer(false);
                        XcUser.CurrentUser._isIdle = false;
                        XcUser.CurrentUser.idleCheck();
                        XcSocket.Instance.sendMessage("updateUserActivity", {
                            isCloud: XVM.isCloud(),
                            removeClusterStopCountdown: true
                        });
                    }
                }
            ]
        });

        const updateTimer = () => {
            this._clusterStopCountdown = window.setTimeout(() => {
                timeLeft--;
                timeLeft = Math.max(timeLeft, 0);
                if (timeLeft === 0) {
                    Alert.updateMsg(alertId, `Cluster is shutting down.`);
                    return;
                }
                let msg = `Cluster has been inactive and will shut down in ${timeLeft} seconds.`;
                if (Alert.updateMsg(alertId, msg) && timeLeft > 0) {
                    updateTimer();
                }
            }, interval);
        }
        updateTimer();
    }

    public static logout(): void {
        if (XcUser.CurrentUser) {
            XcUser.CurrentUser.logout();
        }
    }

    private static _checkCreditUsageHelper() {
        xcHelper.sendRequest("GET", "/service/getCredits")
        .then((num) => {
            try {
                num = JSON.parse(num);
            } catch (e) {
               // ignore
            }
            UserMenu.Instance.updateCredits(num);
        })
        .fail(() => {
            UserMenu.Instance.updateCredits(null);
        });
    }

    public static creditUsageCheck() {
        if (!XVM.isCloud()) {
            return;
        }
        this._checkCreditUsageHelper();
        clearInterval(this._creditUsageInterval);
        this._creditUsageInterval = setInterval(() => {
            this._checkCreditUsageHelper();
        }, this._creditUsageCheckTime);
    }

    public static setClusterPrice(price) {
        this.firstCreditWarningLimit = price * this.firstCreditWarningTime; // 20 minutes worth of credit
        this.lastCreditWarningLimit = price * this.lastCreditWarningTime; // 1 minute worth of credit
    }

    /**
     * XcUser.logoutWarn
     */
    public static logoutWarn(): void {
        Alert.show({
            title: "User session has expired",
            msg: "Please login again.",
            lockScreen: true,
            buttons: [{
                "name": "Log Out",
                "func": () => {
                    xcManager.forceLogout();
                }
            }],
            hideButtons: ["support"]
        });
    }

    private _username: string;
    private _fullUsername: string;
    private _isAdmin: boolean;
    private _userIdUnique: number;
    private _isIdle: boolean;
    private _idleCheckTimer: number;
    private _activityTimer: number;
    static _defaultTimeout: number = XVM.isCloud() ? 15 * 60 * 1000 : 25 * 60 * 1000;
    private _idleTimeLimit: number = XcUser._defaultTimeout; // 25 minutes default of idleness
    private _activityCheckTime: number = 60 * 1000; // how often to check mouse movement
    private _commitFlag: string;
    private _defaultCommitFlag: string = "commit-default";
    private _lastSocketUpdate: number = 0; // time when last actiivity update message sent to socket

    public constructor(username: string, isAdmin = false) {
        this._fullUsername = username;
        this._isAdmin = isAdmin;
        this.setName();
    }

    public getName(): string {
        return this._username;
    }

    public getFullName(): string {
        return this._fullUsername;
    }

    public getMemoryUsage(): XDPromise<any> {
        return XcalarGetMemoryUsage(this._username, this._userIdUnique);
    }

    /**
     *
     * @param stripEmail {boolean} strip email address or not
     * @param collab {boolean} is in collobation mode or not
     */
    public setName(stripEmail: boolean = false, collab: boolean = false) {
        try {
            let username: string = this._fullUsername;
            if (stripEmail) {
                username = this.stripCharFromUserName(this._username, "@");
            }
            if (collab) {
                username = this.stripCharFromUserName(username, "/");
            }
            this._username = username;
            this._userIdUnique = this.getUserIdUnique(username);
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * @returns {boolean} true if the user is an admin, false otherwise
     */
    public isAdmin(): boolean {
        return this._isAdmin;
    }

    /**
     * logout current user
     */
    public logout(): void {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }
        XcSocket.Instance.sendMessage("logout", {
            user: this.getName()
        });

        this._removeCookies();
        xcManager.unload();
    }

    public holdSession(
        workbookId: string,
        alreadyStarted: boolean
    ): XDPromise<void> {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        if (workbookId == null) {
            xcSessionStorage.removeItem(WorkbookManager.getLastActiveWKBK());
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const xcSocket: XcSocket = XcSocket.Instance;
        const promise: XDPromise<boolean> = (alreadyStarted === true)
            ? PromiseHelper.resolve(false)
            : xcSocket.checkUserSessionExists(workbookId);
        const hasHeartbeatCheck: boolean = XcSupport.hasHeartbeatCheck();
        if (hasHeartbeatCheck) {
            XcSupport.stopHeartbeatCheck();
        }

        promise
            .then(this.sessionHoldAlert)
            .then(() => {
                xcSessionStorage.removeItem(workbookId);
                if (!alreadyStarted) {
                    xcSocket.registerUserSession(workbookId);
                }
                this._commitFlag = this.randCommitFlag();
                // hold the session
                return this.setCommitFlag(this._commitFlag);
            })
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(() => {
                if (hasHeartbeatCheck) {
                    XcSupport.restartHeartbeatCheck();
                }
            });

        return deferred.promise();
    }

    public releaseSession(): XDPromise<void> {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // when setup fails and logout, should not commit
        // (the module even didn't setup yet)
        const promise: XDPromise<void> = xcManager.isStatusFail()
            ? PromiseHelper.resolve()
            : KVStore.commit();
        XcSupport.stopHeartbeatCheck();
        promise
            .then(() => {
                return this.setCommitFlag(this._defaultCommitFlag);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
    * XcUser.CurrentUser.commitCheck
    * @param isFromHeatbeatCheck
    */
    public commitCheck(isFromHeatbeatCheck: boolean = false): XDPromise<void> {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        const wkbkId: string = WorkbookManager.getActiveWKBK();
        if (this.getCommitKey() == null || wkbkId == null) {
            // when workbook is not set up yet or no workbook yet
            return PromiseHelper.resolve();
        }

        const workbook: WKBK = WorkbookManager.getWorkbook(wkbkId);
        if (workbook == null || workbook.getName() !== sessionName) {
            // it's doing some operation on other workbook
            // skip checking in this case
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const commitCheckError: string = "commit key not match";
        const cancelCheck: string = "cancel check";
        const kvStore = this.getCommitKeyKVStore();

        kvStore.get()
            .then((val) => {
                if (isFromHeatbeatCheck && !XcSupport.hasHeartbeatCheck()) {
                    deferred.reject(cancelCheck);
                } else if (val == null || val !== this._commitFlag) {
                    this.commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.resolve();
                }
            })
            .fail((error) => {
                if (isFromHeatbeatCheck && !XcSupport.hasHeartbeatCheck()) {
                    deferred.reject(cancelCheck);
                } else if (error.status === StatusT.StatusSessionNotFound) {
                    this.commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.reject(error);
                }
            });

        return deferred.promise();
    }

    /**
     * default to 25 minutes, otherwise should return
     * a value specified in genSettings
     */
    public getLogOutTimeoutVal(): number {
        return this._idleTimeLimit;
    }

    /**
     * XcUser.CurrentUser.updateLogOutInterval(value)
     * @param value a call to 'UserSettings.Instance.getPref('logOutInterval')'
        it can take on three types of values
        null: means the call is made before UserSettings was defined
        undefined: means the user is on default value
        [a number in minutes]:
        means a user defined number is stored in genSettings
     */
    public updateLogOutInterval(value: number | null | undefined): void {
        var val = (value * 60 * 1000) || XcUser._defaultTimeout;
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }
        this._idleTimeLimit = val;
        if (XcUser._isIdleCheckOn || !XVM.isCloud()) {
            this._isIdle = false;
            this.idleCheck();
        }
        if (XVM.isCloud()) {
            xcHelper.sendRequest("POST", "/service/updateLogoutInterval", {time: val});
        }
    }

    public extendCookies(): void {
        // This timer is used to update the cookies every 25 mins,
        // which are to expire if not called within 30 minutes
        const cookiesUpdateTime: number = 25 * 60 * 1000;
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }
        window.setTimeout(() => {
            if ($("#container").hasClass("locked")) {
                return; // if it's error, skip the check
            } else {
                XcUser.checkCurrentUser(); // extend cookies
                this.extendCookies() // reset extendCookies()
            }
        }, cookiesUpdateTime);
    }

    public disableIdleCheck(): void {
        XcUser._isIdleCheckOn = false;
        console.info("idle check is disabled!");
        clearTimeout(this._idleCheckTimer);
        clearTimeout(this._activityTimer);
        if (XVM.isCloud()) {
            xcHelper.sendRequest("POST", "/service/disableIdleCheck");
        }
    }

    public enableIdleCheck(): void {
        XcUser._isIdleCheckOn = true;
        this._isIdle = false;
        this.idleCheck();
        if (XVM.isCloud()) {
            xcHelper.sendRequest("POST", "/service/enableIdleCheck");
        }
    }

    // received from socket, will not produce a rebroadcast
    public updateUserActivity(options?: {removeClusterStopCountdown: boolean}): void {
        this._isIdle = false;
        this.idleCheck(true);
        if (options && options.removeClusterStopCountdown) {
            // close the cluster inactivity alert
            clearTimeout(XcUser._clusterStopCountdown);
            XcUser.toggleLogoutTimer(false);
            if ($("#alertModal").is(":visible") &&
                $("#alertHeader .text").text() === "Cluster Inactivity") {
                $("#alertModal").find(".close").click();
            }
        }
    }

    /**
     * Check if user has been idle, (default = 1 minutes)
     * if yes, do nothing, otherwise, send notification to expServer (cloud)
     * and extend cookies
     * Note that cookies will expire at 30th minute, so here we
     * check every 10 to 29 minutes to ensure they can be extended
     */
    public async idleCheck(noBroadcast?: boolean): Promise<void> {
        if (this !== XcUser.CurrentUser) {
            throw "Invalid User";
        }

        if (!(await this._isXcalarIdle())) {
            if (!noBroadcast) {
                this._broadcastUserActivity();
            }
            this._restartLogoutCountdown();
        }
        this._isIdle = true;

        // This timer is used to check if user has been idle
        // for '_activityCheckTime' minutes (default is 1 minute)
        clearTimeout(this._idleCheckTimer);
        this._idleCheckTimer = window.setTimeout(() => {
            if ($("#container").hasClass("locked")) {
                return; // if it's error, skip the check
            } else {
                this.idleCheck(); // reset the check
            }
        }, this._activityCheckTime);

        $(document).off(".idleCheck");

        $(document).on("mousemove.idleCheck keydown.idleCheck", () => {
            // as long as there is mouse move or keydown action, mark as not idle
            if (!XcUser._isLogoutTimerOn) {
                // when shutting down, disregard mousemovement
                this._isIdle = false;
            }
            $(document).off(".idleCheck");
        });
    }

    private async _isXcalarIdle(checkQueries = false): Promise<boolean> {
        try {
            const txCache = Transaction.getCache();
            if (Object.keys(txCache).length > 0) {
                // when there is any transaction, it's running
                return false;
            }
            if (WorkbookManager.hasLoadingWKBK()) {
                // when setup or workbook activating case
                return false;
            }
            if (checkQueries) {
                // XXX false activity can be reported if a different user on the
                // same server is executing queries
                const queries = await XcalarQueryList("*");
                const queriesInProgress = queries.filter((query) => {
                    return query.state === QueryStateTStr[QueryStateT.qrProcessing];
                });
                if (queriesInProgress.length > 0) {
                    return false;
                }
            }
            return this._isIdle;
        } catch (e) {
            // in any error case, mark as none idle
            console.error(e);
            return false;
        }
    }

    // resets activity, if not reset again for another 25 minutes then
    // will logout user
    private _restartLogoutCountdown(): void {
        clearTimeout(this._activityTimer);
        this._activityTimer = window.setTimeout(async () => {
            if (await this._isXcalarIdle(true) && XcUser._isIdleCheckOn) {
                // make sure user is really idle then logout
                this.logout();
            } else if(XcUser._isIdleCheckOn) {
                XcUser.CurrentUser._isIdle = false;
                this.idleCheck(); // reset the check
            }
        }, this._idleTimeLimit + (30 * 1000));
        // extra time allows expServer to trigger the logout first
    }

    private _broadcastUserActivity() {
        // tell expServer there was activity, as long as we didn't
        // already do it in the past 30 seconds
        if (Date.now() - this._lastSocketUpdate > (30 * 1000)) {
            XcSocket.Instance.sendMessage("updateUserActivity", {
                isCloud: XVM.isCloud()
            });
            this._lastSocketUpdate = Date.now();
        }
    }

    private commitMismatchHandler(): void {
        XcSupport.stopHeartbeatCheck();

        // hide all modal
        $(".modalContainer:not(.locked)").hide();
        // user should force to logout
        Alert.show({
            title: WKBKTStr.Expire,
            msg: WKBKTStr.ExpireMsg,
            lockScreen: true,
            logout: true
        });
    }

    private stripCharFromUserName(name: string, ch: string): string {
        const atIndex: number = name.indexOf(ch);
        if (atIndex > 0) {
            name = name.substring(0, atIndex);
        }
        return name;
    }

    private getUserIdUnique(name: string): number {
        const hash: string = jQuery.md5(name);
        const len: number = 5;
        const id: number = parseInt("0x" + hash.substring(0, len)) + 4000000;
        return id;
    }

    private sessionHoldAlert(userExist: boolean): XDPromise<void> {
        if (!userExist) {
            return PromiseHelper.resolve();
        }

        const lastLogInTime: number = Number(xcSessionStorage.getItem(WorkbookManager.getActiveWKBK()));
        // 25000 is the pingInterval for socket io if it's long polling
        // see: https://socket.io/docs/server-api/
        if (lastLogInTime && new Date().getTime() - lastLogInTime <= 25000) {
            // in this case consider as a refresh case
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $initScreen: JQuery = $("#initialLoadScreen");
        const isVisible: boolean = $initScreen.is(":visible");
        if (isVisible) {
            $initScreen.hide();
        }
        // when seesion is hold by others
        Alert.show({
            title: AlertTStr.Title,
            msg: WKBKTStr.HoldMsg,
            buttons: [{
                name: CommonTxtTstr.Back,
                className: "cancel",
                func: function() {
                    deferred.reject(WKBKTStr.Hold);
                }
            },
            {
                name: WKBKTStr.Release,
                className: "cancel larger",
                func: function() {
                    if (isVisible) {
                        $initScreen.show();
                    }
                    deferred.resolve();
                }
            }],
            noCancel: true
        });

        return deferred.promise();
    }

    private randCommitFlag(): string {
        return "commit" + Math.floor((Math.random() * 10000) + 1);
    }

    private setCommitFlag(value: string): XDPromise<void> {
        const kvStore: KVStore = this.getCommitKeyKVStore();
        return kvStore.put(value, false, true);
    }

    private getCommitKey(): string {
        return KVStore.getKey("commitKey");
    }

    private getCommitKeyKVStore(): KVStore {
        const key: string = this.getCommitKey();
        return new KVStore(key, gKVScope.WKBK);
    }

    private _removeCookies(): XDPromise<void> {
        // to remove the cookies
        return HTTPService.Instance.ajax({
            "type": "POST",
            "contentType": "application/json",
            "url": xcHelper.getAppUrl() + "/logout"
        });
    }
}