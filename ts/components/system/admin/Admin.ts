namespace Admin {
    // XXX TODO: may need to separate UserList module from Admin
    const userListKey: string = "gUserListKey"; // constant
    let userList: string[] = [];
    let loggedInUsers = {};
    let searchHelper: SearchBar;
    let $menuPanel; // $('#monitorMenu-setup');
    let $userList; // $menuPanel.find('.userList');
    let adminAlertCard: AdminAlertCard;
    let monitorConfig: MonitorConfig;
    let modalHelper: ModalHelper;
    let _isSetup: boolean = false;

    /**
     * Admin.setup
     */
    export function setup(): void {
        if (Admin.hasSetup()) {
            return;
        }
        _isSetup = true;
        let posingAsUser = isPostAsUser();
        let isAdmin: boolean = Admin.isAdmin();
        setupAdminStatusBar(posingAsUser);
        setupMonitorConfig();
        modalHelper = new ModalHelper(_getModal(), {
            sizeToDefault: true
        });

        if (isAdmin) {
            $('#container').addClass('admin');
            $("#userNameArea").html('<i class="icon xi-user-setting"></i>');
        }


        $menuPanel = $('#monitorMenu-setup');
        $userList = $menuPanel.find('.userList');


        if (isAdmin) {
            _addEventListeners();
            refreshUserList(true, false);
            adminAlertCard = new AdminAlertCard("adminAlertCard");
        }
    }

    /**
     * Admin.hasSetup
     */
    export function hasSetup(): boolean {
        return _isSetup;
    }

    /**
     * Admin.showModal
     */
    export function showModal(lockScreen: boolean = false): void {
        if (Admin.isAdmin()) {
            modalHelper.setup();

            if (lockScreen) {
                _getModal().addClass("locked");
            } else {
                _getModal().removeClass("locked");
            }
        }
    }

    /**
     * Admin.isAdmin
     */
    export function isAdmin(): boolean {
        try {
            if (XVM.isOnAWS()) {
                return false;
            }
            return XcUser.CurrentUser.isAdmin();
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    // will not add user if already exists in kvstore
    /**
     * Admin.addNewUser
     */
    export function addNewUser(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let username = XcUser.getCurrentUserName();
        let kvStore = new KVStore(userListKey, gKVScope.GLOB);

        kvStore.get()
        .then((value) => {
            if (value == null) {
                return storeUsername(kvStore, username, false);
            } else {
                userList = parseStrIntoUserList(value);
                // usernames are case sensitive
                if (userList.indexOf(username) === -1) {
                    return storeUsername(kvStore, username, true);
                } else {
                    return;
                }
            }
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((err) => {
            //xx need to handle or alert?
            console.warn(err);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * Admin.getUserList
     */
    export function getUserList(): string[] {
        if (Admin.isAdmin()) {
            return userList;
        } else {
            return [];
        }
    }

    /**
     * Admin.switchUser
     * NOTE: Current way it works is using the admin cookies but use
     * the other user's info for thrift call
     * @param username
     */
    export function switchUser(username: string): void {
        if (!Admin.isAdmin()) {
            return;
        }
        if (xcSessionStorage.getItem("usingAs") == null &&
            username !== XcUser.getCurrentUserName()
        ) {
            xcSessionStorage.setItem("usingAs", username);
            xcSessionStorage.setItem("adminName", XcUser.getCurrentUserName());
        }

        xcManager.unload(false, true);
    }

    /**
     * Admin.userToAdmin
     */
    export function userToAdmin(): void {
        if (!isPostAsUser()) {
            return;
        }
        xcSessionStorage.removeItem("usingAs");
        xcSessionStorage.removeItem("adminName");
        xcManager.unload(false, true);
    }

    /**
     * Admin.updateLoggedInUsers
     * @param users
     */
    export function updateLoggedInUsers(users: object): void {
        if (!Admin.isAdmin()) {
            return;
        }
        loggedInUsers = users;
        updateLoggedInUsersList();
    }

    /**
     * Admin.refreshParams
     */
    export function refreshParams(): XDPromise<any> {
        if (monitorConfig != null) {
            return monitorConfig.refreshParams(true);
        } else {
            return PromiseHelper.reject();
        }
    }

    export function getConfigParam(paramName: string): any {
        if (monitorConfig != null) {
            return monitorConfig.getParam(paramName);
        }
    }

    function _getModal(): JQuery {
        return $("#adminSetupModal");
    }

    function _close(): void {
        modalHelper.clear();

        const $modal = _getModal();
        if ($modal.hasClass("locked")) {
            $modal.removeClass("locked");
            XcSupport.checkConnection();
        }
    }

    function _addEventListeners(): void {
        addUserListListeners();
        addMonitorMenuSupportListeners();

        _getModal().on("click", ".close", () => {
            _close();
        });
    }

    function addUserListListeners() {
        searchHelper = new SearchBar($("#adminUserSearch"), {
            "$list": $userList.find('ul'),
            "removeSelected": function() {
                $userList.find(".selected").removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            },
            "onInput": function(val) {
                filterUserList(val);
            }
        });

        $("#adminUserSearch").on("click", ".closeBox", function() {
            searchHelper.clearSearch(function() {
                clearUserListFilter();
                searchHelper.$arrows.hide();
                $("#adminUserSearch").find("input").focus()
                .removeClass('hasArrows');
            });
        });
        $menuPanel.find(".refreshUserList").click(function() {
            searchHelper.clearSearch(function() {
                clearUserListFilter();
            });

            let sortedByUsage = $userList.hasClass("sortedByUsage");
            let promise = refreshUserList(false, sortedByUsage);
            xcUIHelper.showRefreshIcon($userList, false, promise);
        });

        $userList.on('click', '.userLi .useAs', function() {
            let $li = $(this).closest(".userLi");
            if ($li.hasClass("self")) {
                return;
            }
            let username = $li.text().trim();
            let title = MonitorTStr.UseXcalarAs;
            let msg = xcStringHelper.replaceMsg(MonitorTStr.SwitchUserMsg, {
                username: username
            });
            Alert.show({
                "title": title,
                "msg": msg,
                "onConfirm": function() {
                    Admin.switchUser(username);
                }
            });
        });

        $("#userMemPopup").draggable({
            handle: '#userMemPopupTitle',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        $("#userMemPopup").resizable({
            handles: "n, e, s, w, se",
            minHeight: 300,
            minWidth: 300,
            containment: "document"
        });

        $userList.on("click", ".userLi .memory", function() {
            let $popup = $("#userMemPopup");
            let $li = $(this).closest(".userLi");
            let username = $li.text().trim();

            let popupId = Math.floor(Math.random() * 100000);
            $popup.data("id", popupId);
            $popup.find(".content").empty();
            $popup.find(".titleContentWrap").text(username);
            positionMemPopup($popup);

            $(document).on("mousedown.hideMemPopup", function(event) {
                let $target = $(event.target);
                if ($target.closest("#userMemPopup").length === 0) {
                    if ($target.closest(".memory").length) {
                        $(document).off(".hideMemPopup");
                    } else {
                        hideMemPopup();
                    }
                }
            });

            let promise = getMemUsage(username, true);
            xcUIHelper.showRefreshIcon($popup, false, promise);

            promise
            .then(function(data) {
                let totalMem = 0;
                for (let sess in data) {
                    totalMem += xcHelper.textToBytesTranslator(
                                                    data[sess]["Total Memory"]);
                }
                $li.data("memval", totalMem);
                var memText = xcHelper.sizeTranslator(totalMem, true);
                memText = MonitorTStr.MemUsage + ": " + memText[0] + " " +
                         memText[1];
                xcTooltip.changeText($li.find(".memory"), memText);
                if ($popup.data("id") !== popupId) {
                    return;
                }
                let html = xcUIHelper.prettifyJson(data, undefined, undefined, undefined, undefined);
                html = "{\n" + html + "}";
                $popup.find(".content").html(html);
                let $breakdown = $popup.find(".content")
                                      .find('.jsonBlock[data-key="Breakdown"]');
                $breakdown.each(function() {
                    let $bd = $(this);
                    if (!$bd.find(".emptyObj").length) {
                        $bd.addClass("breakdown");
                        let toggle = '<div class="toggleBreakdown xc-action">' +
                                        '<i class="icon xi-arrow-down"></i>' +
                                     '</div>';
                        $bd.prepend(toggle);
                        let ellipsis = '<div class="ellipsis xc-action" ' +
                        'data-tipclasses="highZindex" data-toggle="tooltip" ' +
                        'data-placement="auto top" data-container="body" title="' +
                        CommonTxtTstr.ClickToExpand + '">...</div>';
                        $bd.find(".jObj").before(ellipsis);
                    }
                });
            })
            .fail(function(error) {
                if ($popup.data("id") !== popupId) {
                    return;
                }
                let type = typeof error;
                let msg;
                let notExists = false;
                let isEmpty = false;

                if (type === "object") {
                    msg = error.error || AlertTStr.ErrorMsg;
                    if (error.status === StatusT.StatusSessionNotFound) {
                        if (username === userIdName) {
                            isEmpty = true;
                        } else {
                            notExists = true;
                        }
                    }
                } else {
                    msg = error;
                }
                let errorDiv = "<div class='error'>" +
                                    msg +
                                "</div>";
                $popup.find(".content").html(errorDiv);
                if (notExists) {
                    $li.addClass("notExists");
                    xcTooltip.add($li, {
                        title: MonitorTStr.UserNotExists
                    });
                } else if (isEmpty) {
                    let memText: string = MonitorTStr.MemUsage + ": 0 B";
                    xcTooltip.changeText($li.find(".memory"), memText);
                }
            });
        });

        $("#userMemPopup").on("click", ".close", function() {
            hideMemPopup();
        });

        $("#userMemPopup").on("click", ".toggleBreakdown, .ellipsis", function() {
            $(this).closest(".breakdown").toggleClass("active");
            xcTooltip.hideAll();
            xcUIHelper.removeSelectionRange();
        });

        $userList.on("click", ".sortOption", function() {
            var sortByName = $(this).hasClass("sortName");
            if (sortByName) {
                if ($userList.hasClass("sortedByName")) {
                    return;
                } else {
                    $userList.addClass("sortedByName").removeClass("sortedByUsage");
                }
            } else { // sort by date
                if ($userList.hasClass("sortedByUsage")) {
                    return;
                } else {
                    $userList.addClass("sortedByUsage").removeClass("sortedByName");
                }
            }

            if (sortByName) {
                let userMemList = [];
                $userList.find("li").each(function() {
                    var $li = $(this);
                    userMemList.push({
                        username: $li.find(".text").text(),
                        memText: $li.find(".memory").data("title")
                    });
                });
                userMemList.sort(function(a, b) {
                    return xcHelper.sortVals(a.username, b.username);
                });
                userList = [];
                for (let i = 0; i < userMemList.length; i++) {
                    userList.push(userMemList[i].username);
                }
                setupUserListMenu(userMemList);
            } else {
                let promise = refreshUserList(false, true);
                xcUIHelper.showRefreshIcon($userList, false, promise);
            }
        });
    }

    function positionMemPopup($popup: JQuery): void {
        if ($popup.is(":visible")) {
            return;
        }
        $popup.show();

        let defaultWidth = 600;
        let defaultHeight = 600;
        $popup.height("auto");
        $popup.width("auto");
        let height = Math.min(defaultHeight, $popup.height());
        let width = Math.min(defaultWidth, $popup.width());
        height = Math.max(height, 400);
        width = Math.max(width, 400);
        $popup.height(height);
        $popup.width(width);
        let winWidth = $(window).width();
        let winHeight = $(window).height();
        $popup.css({
            left: (winWidth - width) / 2,
            top: (winHeight - height) / 2
        });
    }

    export function getMemUsage(username: string, translateSize?: boolean ): XDPromise<any> {
        let deferred  = PromiseHelper.deferred();
        let user = new XcUser(username);
        user.getMemoryUsage()
        .then(function(origData) {
            let data;
            if (origData && origData.userMemory &&
                origData.userMemory.sessionMemory
            ) {
                data = {};
                let mem = origData.userMemory.sessionMemory;
                for (let i = 0; i < mem.length; i++) {
                    let totalMem = 0;
                    let sess: any = {
                        "Total Memory": 0,
                        "Breakdown": {},
                    };
                    mem[i].tableMemory.sort(function(a, b) {
                        return xcHelper.sortVals(a.tableName, b.tableName);
                    });
                    for (let j = 0; j < mem[i].tableMemory.length; j++) {
                        totalMem += mem[i].tableMemory[j].totalBytes;
                        sess.Breakdown[mem[i].tableMemory[j].tableName] =
                                            mem[i].tableMemory[j].totalBytes;
                    }
                    let total = translateSize ?
                                xcHelper.sizeTranslator(totalMem) : totalMem;
                    sess["Total Memory"] = total;
                    data[mem[i].sessionName] = sess;
                }
            } else {
                data = origData;
            }
            deferred.resolve(data);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getAllUsersMemory(sortByUsage: boolean): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let username: string;
        let promises: XDPromise<void>[] = [];
        for (let i = 0; i < userList.length; i++) {
            username = userList[i];
            let user = new XcUser(username);
            promises.push(user.getMemoryUsage());
        }

        PromiseHelper.when(...promises)
        .always(function(users) {
            let data;
            let tempUserList = [];
            let memText;
            for (let i = 0; i < users.length; i++) {
                data = users[i];
                if (data && data.userMemory &&
                    data.userMemory.sessionMemory
                ) {
                    let mem = data.userMemory.sessionMemory;
                    let totalMem = 0;
                    for (let j = 0; j < mem.length; j++) {
                        for (let k = 0; k < mem[j].tableMemory.length; k++) {
                            totalMem += mem[j].tableMemory[k].totalBytes;
                        }
                    }
                    username = data.userMemory.userName;
                    memText = xcHelper.sizeTranslator(totalMem, true);
                    memText = memText[0] + " " + memText[1];
                    tempUserList.push({
                        username: username,
                        memVal: totalMem,
                        memText: memText
                    });
                } else if (userList[i] === userIdName &&
                    data && data.status === StatusT.StatusSessionNotFound) {
                    // is self and has no session
                    tempUserList.push({
                        username: userIdName,
                        memVal: 0,
                        memText: "0B"
                    });
                }
            }
            if (sortByUsage) {
                tempUserList.sort(function(a, b) {
                    return b.memVal - a.memVal;
                });
            } else {
                tempUserList.sort(function(a, b) {
                    return xcHelper.sortVals(a.username, b.username);
                });
            }

            userList = [];
            for (let i = 0; i < tempUserList.length; i++) {
                userList.push(tempUserList[i].username);
            }
            setupUserListMenu(tempUserList);
            deferred.resolve();
        });
        return deferred.promise();
    }

    function hideMemPopup() {
        let $popup = $("#userMemPopup");
        $popup.hide();
        $popup.find(".content").empty();
        $(document).off(".hideMemPopup");
    }

    function addMonitorMenuSupportListeners() {
        xcUIHelper.expandListEvent($menuPanel);

        $("#configStartNode").click(startNode);

        $("#configStopNode").click(stopNode);

        $("#configRestartNode").click(restartNode);

        $("#configSupportStatus").click(getStatus);

        $('#configLicense').click(() => {
            LicenseModal.Instance.show();
        });

        $("#adminAlert").click(function() {
            if (adminAlertCard != null) {
                adminAlertCard.show();
            }
        });
        $("#loginConfig").click(showLoginConfig);
    }

    function parseStrIntoUserList(value: string): string[] {
        let len = value.length;
        if (value.charAt(len - 1) === ",") {
            value = value.substring(0, len - 1);
        }
        let arrayStr = "[" + value + "]";

        try {
            userList = JSON.parse(arrayStr);
        } catch (err) {
            userList = [];
            console.error("restore error logs failed!", err);
        }
        userList.sort(xcHelper.sortVals);
        return userList;
    }

    // xcalar put by default, or append if append param is true
    function storeUsername(
        kvStore: KVStore,
        username: string,
        append: boolean
    ) {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let entry: string = JSON.stringify(username) + ",";
        let promise;
        if (append) {
            promise = kvStore.append(entry, true, true);
        } else {
            promise = kvStore.put(entry, true, true);
        }

        promise.then(() => {
            userList.push(username);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupUserListMenu(userMemList: any[]): void {
        let html: HTML = "";
        let memTip: string = MonitorTStr.ViewMem;
        for (let i = 0; i < userList.length; i++) {
            if (userMemList) {
                memTip = MonitorTStr.MemUsage + ": " + userMemList[i].memText;
            }
            html += '<li class="userLi">' +
                        '<i class="icon xi-user fa-11"></i>' +
                        '<span class="text">' + userList[i] + '</span>' +
                        '<span class="memory xc-action"' +
                            ' data-toggle="tooltip"' +
                            ' data-container="body"' +
                            ' data-placement="auto top"' +
                            ' data-title="' + memTip + '">' +
                            '<i class="icon xi-menu-info"></i>' +
                        '</span>' +
                        '<span class="useAs xc-action"' +
                            ' data-toggle="tooltip"' +
                            ' data-container="body"' +
                            ' data-placement="auto top"' +
                            ' data-title="Use Xcalar as this user">' +
                            '<i class="icon xi-monitor"></i>' +
                        '</span>' +
                    '</li>';
        }

        $userList.find('ul').html(html);
        updateLoggedInUsersList();
    }

    function updateLoggedInUsersList(): void {
        $userList.find(".userLi").each(function() {
            let $li = $(this);
            let name: string = $li.find(".text").text();
            let $icon = $li.find(".xi-user");
            if (loggedInUsers.hasOwnProperty(name)) {
                $li.addClass("loggedIn");
                xcTooltip.add($icon, {
                    title: TooltipTStr.LoggedIn
                });
            } else {
                $li.removeClass("loggedIn");
                xcTooltip.remove($icon);
            }
            if (name === userIdName) {
                $li.addClass("self");
                var msg = MonitorTStr.YouAreUsing + name;
                xcTooltip.changeText($li.find(".useAs"), msg);
            }
        });
    }

    function refreshUserList(
        firstTime: boolean,
        sortByUsage: boolean
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        $userList.addClass("refreshing");

        let kvStore = new KVStore(userListKey, gKVScope.GLOB);
        kvStore.get()
        .then(function(value) {
            if (value == null) {
                userList = [];
            } else {
                userList = parseStrIntoUserList(value);
            }
            if (!firstTime) {
                return getAllUsersMemory(sortByUsage);
            } else {
                setupUserListMenu(null);
                return;
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            $userList.removeClass("refreshing");
        });

        return deferred.promise();
    }

    function filterUserList(keyWord: string | null): void {
        let $lis = $menuPanel.find(".userLi");
        $lis.each(function() {
            let $li = $(this);
            if ($li.hasClass("highlighted")) {
                let $span = $li.find(".text");
                $span.html($span.text());
                $li.removeClass("highlighted");
            } else if ($li.hasClass('nonMatch')) {
                // hidden lis that are filtered out
                $li.removeClass('nonMatch xc-hidden');
            }
        });

        if (keyWord == null || keyWord === "") {
            searchHelper.clearSearch(function() {
                searchHelper.$arrows.hide();
            });
            $("#adminUserSearch").find("input").removeClass('hasArrows');
            return;
        } else {
            let regex = new RegExp(xcStringHelper.escapeRegExp(keyWord), "gi");
            $lis.each(function() {
                let $li = $(this);
                let tableName: string = $li.text();
                if (regex.test(tableName)) {
                    $li.addClass("highlighted");
                    // var $span = $li.find(".tableName");
                    let $span = $li.find('.text');
                    let text: string = $span.text();
                    text = text.replace(regex, function (match) {
                        return ('<span class="highlightedText">' + match +
                            '</span>');
                    });

                    $span.html(text);
                } else {
                    // we will hide any lis that do not match
                    $li.addClass('nonMatch xc-hidden');
                }
            });
            searchHelper.updateResults($userList.find('.highlightedText'));
            // var counterWidth = $userList.find('.counter').width();
            // $userList.find('input').css("padding-right", counterWidth + 30);

            if (searchHelper.numMatches !== 0) {
                searchHelper.scrollMatchIntoView(searchHelper.$matches.eq(0));
                searchHelper.$arrows.show();
                $("#adminUserSearch").find("input").addClass('hasArrows');
            } else {
                searchHelper.$arrows.hide();
                $("#adminUserSearch").find("input").removeClass('hasArrows');
            }
        }
    }

    function clearUserListFilter(): void {
        $("#adminUserSearch").find("input").val("");
        filterUserList(null);
    }

    function isPostAsUser(): boolean {
        return xcSessionStorage.getItem("usingAs") != null;
    }

    function setupAdminStatusBar(posingAsUser: boolean): void {
        let $adminBar = $('#adminStatusBar');
        if (posingAsUser) {
            $('#container').addClass('posingAsUser');
            $adminBar.find('.username').text(XcUser.getCurrentUserName());
            var width = $adminBar.outerWidth() + 1;
            $adminBar.outerWidth(width);
            // giving adminBar a width so we can use position right with the
            // proper width
            $adminBar.on('click', '.pulloutTab', function() {
                $adminBar.toggleClass('active');
                if ($adminBar.hasClass('active')) {
                    $adminBar.css('right', 0);
                } else {
                    $adminBar.css('right', -width + 20);
                }
            });

            $adminBar.on('click', '.xi-close', function() {
                Admin.userToAdmin();
            });
        } else {
            $("#adminStatusBar").hide();
        }
    }

    function setupMonitorConfig() {
        monitorConfig = new MonitorConfig("configCard");
        monitorConfig
        .on("minimize", () => {
            $('#monitorLogCard').addClass('maximized');
        })
        .on("maximize", () => {
            $('#monitorLogCard').removeClass('maximized');
        })
        .on("adjustScollbar", (posDiff) => {
            let bottomBuffer = $("#mainTopBar").height() + 20;
            let winHeight = $(window).height();
            posDiff = (posDiff + bottomBuffer) - winHeight;
            if (posDiff > 0) {
                let $mainContent = $('#monitorPanel').children('.mainContent');
                let top = $mainContent.scrollTop();
                $mainContent.animate({scrollTop: top + posDiff + 20});
            }
        });
    }

    function startNode(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        checkIfStart()
        .then(function(startFlag) {
            if (startFlag) {
                Alert.show({
                    title: AlertTStr.Title,
                    msg: AlertTStr.AlreadyStart,
                    isAlert: true
                });
                deferred.resolve();
            } else {
                supportPrep('startNode')
                .then(adminTools.clusterStart)
                .then(function(ret) {
                    // refresh page
                    exitSetupMode();
                    if (ret.status === Status.Ok &&
                        ret.logs.indexOf("already running") > -1) {
                        Alert.show({
                            title: AlertTStr.Title,
                            msg: ret.logs,
                            isAlert: true
                        });
                    } else {
                        xcManager.reload();
                    }
                    deferred.resolve();
                })
                .fail(function(err) {
                    exitSetupMode();
                    nodeCmdFailHandler('startNode', err);
                    deferred.reject(err);
                });
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function checkIfStart(): XDPromise<boolean> {
        let deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        XVM.checkVersion(true)
        .then(function() {
            deferred.resolve(true);
        })
        .fail(function() {
            deferred.resolve(false);
        });
        return deferred.promise();
    }

    function stopNode(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        supportPrep('stopNode')
        .then(adminTools.clusterStop)
        .then(function() {
            exitSetupMode();
            Alert.show({
                "title": MonitorTStr.StopNodes,
                "msg": SuccessTStr.StopCluster,
                "lockScreen": true
            });
            deferred.resolve();
        })
        .fail(function(err) {
            exitSetupMode();
            nodeCmdFailHandler('stopNode', err);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    function restartNode(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        // restart is unreliable so we stop and start instead
        supportPrep('restartNode')
        .then(adminTools.clusterStop)
        .then(adminTools.clusterStart)
        .then(function() {
            xcManager.reload();
            deferred.resolve();
        })
        .fail(function(err) {
            exitSetupMode();
            nodeCmdFailHandler('restartNode', err);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    function getStatus(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        $('#configSupportStatus').addClass('unavailable');
        adminTools.clusterStatus()
        .then(function(ret) {
            let logs = ret.logs;
            if (!logs) {
                return PromiseHelper.reject({logs: "No logs available."});
            }
            ClusterStatusModal.Instance.show(logs);
            deferred.resolve();
        })
        .fail(function(err) {
            if (err) {
                // the error status is not set by
                // server, it may be due to other reasons
                if (err.logs) {
                    // unexpected error
                    if (err.unexpectedError) {
                        let msg = (err.logs === "error")? ErrTStr.Unknown : err.logs;
                        Alert.error(MonitorTStr.GetStatusFail, msg);
                    } else {
                        // the reason for why all the nodes are success or
                        // fail is known and defined.
                        Alert.show({
                            "title": MonitorTStr.ClusterStatus,
                            "msg": err.logs,
                            "isAlert": true
                        });
                    }
                }
            } else {
                Alert.error(MonitorTStr.GetStatusFail, ErrTStr.Unknown);
            }
            deferred.reject(err);
        })
        .always(function() {
            $('#configSupportStatus').removeClass('unavailable');
        });

        return deferred.promise();
    }

    // setup func called before startNode, stopNode, etc.
    function supportPrep(command: string): XDPromise<void> {
        if (!Admin.isAdmin()) {
            return PromiseHelper.reject({logs: MonitorTStr.NotAuth});
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        var title;
        var alertMsg;
        switch (command) {
            case ('startNode'):
                title = MonitorTStr.StartNodes;
                break;
            case ('stopNode'):
                title = MonitorTStr.StopNodes;
                alertMsg = MonitorTStr.StopAlertMsg;
                break;
            case ('restartNode'):
                title = MonitorTStr.RestartNodes;
                alertMsg = MonitorTStr.RestartAlertMsg;
                break;
            default:
                title = AlertTStr.Confirmation;
                break;
        }
        let msg = xcStringHelper.replaceMsg(MonitorTStr.NodeConfirmMsg, {
            type: title.toLowerCase().split(" ")[0] // first word (start, restart)
        });

        Alert.show({
            "title": title,
            "msg": msg,
            "onConfirm": function() {
                if (alertMsg) {
                    XcSocket.Instance.sendMessage("adminAlert", {
                        "title": title,
                        "message": alertMsg
                    });
                }
                enterSetupMode();
                if (WorkbookManager.getActiveWKBK() != null) {
                    KVStore.commit()
                    .then(deferred.resolve)
                    .fail(function(err) {
                        console.error(err);
                        deferred.resolve(); // still resolve
                    });
                } else {
                    // the first time to use Xcalar and the backend is down
                    // No workbook, KVStore.commit() will report an error
                    deferred.resolve();
                }
            },
            "onCancel": function() {
                deferred.reject('canceled');
            }
        });
        return deferred.promise();
    }

    function enterSetupMode(): void {
        $("#initialLoadScreen").show();
        $("body").addClass("xc-setup");
    }

    function exitSetupMode(): void {
        $("#initialLoadScreen").hide();
        $("body").removeClass("xc-setup");
    }

    function nodeCmdFailHandler(command: string, err: any): void {
        if (err === "canceled") {
            return;
        }
        let title: string;
        switch (command) {
            case ('startNode'):
                title = MonitorTStr.StartNodeFailed;
                break;
            case ('stopNode'):
                title = MonitorTStr.StopNodeFailed;
                break;
            case ('restartNode'):
                title = MonitorTStr.RestartFailed;
                break;
            default:
                title = AlertTStr.Error;
                break;
        }

        let msg: string;
        if (err) {
            msg = JSON.stringify(err);
        } else {
            msg = title + ".";
        }
        msg += " " + MonitorTStr.NodeCMDDetail;
        Alert.error(title, msg);
    }

    function showLoginConfig(): void {
        let msalConfig = null;
        let defaultAdminConfig = null;
        let ldapConfig = null;

        $('#loginConfig').addClass('unavailable');
        getMSALConfig(hostname)
        .then(
            function(msalConfigIn) {
                msalConfig = msalConfigIn;
                return (getDefaultAdminConfig(hostname));
            },

            function() {
                return (getDefaultAdminConfig(hostname));
            }
        )
        .then(
            function(defaultAdminConfigIn) {
                defaultAdminConfig = defaultAdminConfigIn;
                return (getLdapConfig(hostname));
            },

            function() {
                return (getLdapConfig(hostname));
            }
        )
        .then(function(ldapConfigIn) {
            ldapConfig = ldapConfigIn;
        })
        .always(function() {
            $('#loginConfig').removeClass('unavailable');
            LoginConfigModal.Instance.show(msalConfig, defaultAdminConfig, ldapConfig);
        });
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.setPosingAs = function() {
            setupAdminStatusBar(true);
        };
       __testOnly__.refreshUserList = refreshUserList;
       __testOnly__.startNode = startNode;
       __testOnly__.stopNode = stopNode;
       __testOnly__.restartNode = restartNode;
       __testOnly__.getStatus = getStatus;
    }
    /* End Of Unit Test Only */
}