(function($) {
    console.log("dynamic patch 1.4.1 loaded");

    // hot patch XcalarKeyPut XD-754
    (function (xcMenu) {
        // adds default menu behaviors to menus passed in as arguments
        // behaviors include highlighting lis on hover, opening submenus on hover
        let closeCallback;
        const hotKeyFns = new Map(); // menuId: callbackFn
        /**
         * xcMenu.add
         * Add a new xcMenu based on a jquery element
         * @param $mainMenu - the root menu for the new xcMenu, sub menues can exist below this
         * @param options - menu options to set if the menu stays open or has hotkeys
         */
        function add($mainMenu, options = {}) {
            let $subMenu;
            let $allMenus = $mainMenu;
            const subMenuId = $mainMenu.data('submenu');
            let hideTimeout;
            let showTimeout;
            let subListScroller;
            if (subMenuId) {
                $subMenu = $('#' + subMenuId);
                $allMenus = $allMenus.add($subMenu);
                subListScroller = new MenuHelper($subMenu, {
                    "bottomPadding": 4
                });
                // prevents input from closing unless you hover over a different li
                // on the main column menu
                // $subMenu.find('input').on({
                $subMenu.on({
                    "focus": function () {
                        $(this).parents('li').addClass('inputSelected')
                            .parents('.subMenu').addClass('inputSelected');
                    },
                    "blur": function () {
                        $(this).parents('li').removeClass('inputSelected')
                            .parents('.subMenu').removeClass('inputSelected');
                    },
                    "keyup": function () {
                        if ($subMenu.find('li.selected').length) {
                            return;
                        }
                        const $input = $(this);
                        $input.parents('li').addClass('inputSelected')
                            .parents('.subMenu').addClass('inputSelected');
                    }
                }, 'input');
                $subMenu.on('mouseup', 'li', function (event) {
                    if (event.which !== 1) {
                        return;
                    }
                    const $li = $(this);
                    event.stopPropagation();
                    if (!$li.hasClass('unavailable') &&
                        $li.closest('input').length === 0 &&
                        $li.closest('.clickable').length === 0) {
                        // hide li if doesnt have an input field
                        xcMenu.close($allMenus);
                        clearTimeout(showTimeout);
                    }
                });
                $subMenu.on({
                    "mouseenter": function () {
                        if ($(this).closest('.dropDownList').length) {
                            return;
                        }
                        $subMenu.find('li').removeClass('selected');
                        const $li = $(this);
                        const className = $li.parent().attr('class');
                        $mainMenu.find('.' + className).addClass('selected');
                        $li.addClass('selected');
                        if (!$li.hasClass('inputSelected')) {
                            $subMenu.find('.inputSelected').removeClass('inputSelected');
                        }
                        clearTimeout(hideTimeout);
                    },
                    "mouseleave": function () {
                        $subMenu.find('li').removeClass('selected');
                        const $li = $(this);
                        $li.find('.dropDownList').removeClass("open")
                            .find('.list').hide();
                        // $li.removeClass('selected');
                        $('.tooltip').remove();
                    }
                }, "li");
                $subMenu.on('contextmenu', function (e) {
                    e.preventDefault();
                });
            }
            $mainMenu.on('mouseup', 'li', function (event) {
                if (event.which !== 1) {
                    return;
                }
                const $li = $(this);
                if ($li.hasClass('parentMenu')) {
                    return;
                }
                event.stopPropagation();
                if (!$li.hasClass('unavailable') && !options.keepOpen) {
                    // hide li if doesnt have a submenu or an input field
                    xcMenu.close($allMenus);
                    clearTimeout(showTimeout);
                }
            });
            $mainMenu.on({
                "mouseenter": function (event) {
                    if ($mainMenu.hasClass('disableMouseEnter')) {
                        $mainMenu.removeClass('disableMouseEnter');
                        return;
                    }
                    const $li = $(this);
                    $mainMenu.find('.selected').removeClass('selected');
                    $mainMenu.addClass('hovering');
                    $li.addClass('selected');
                    const hasSubMenu = $li.hasClass('parentMenu');
                    if (!hasSubMenu || $li.hasClass('unavailable')) {
                        if ($subMenu) {
                            if (event.keyTriggered) {
                                $subMenu.hide();
                            }
                            else {
                                clearTimeout(hideTimeout);
                                hideTimeout = setTimeout(function () {
                                    $subMenu.hide();
                                }, 150);
                            }
                        }
                        return;
                    }
                    clearTimeout(hideTimeout);
                    const subMenuClass = $li.data('submenu');
                    if (event.keyTriggered) { // mouseenter triggered by keypress
                        showSubMenu($li, subMenuClass);
                    }
                    else {
                        showTimeout = setTimeout(function () {
                            showSubMenu($li, subMenuClass);
                        }, 150);
                    }
                },
                "mouseleave": function () {
                    if ($mainMenu.hasClass('disableMouseEnter')) {
                        return;
                    }
                    $mainMenu.removeClass('hovering');
                    $mainMenu.find('.selected').removeClass('selected');
                    const $li = $(this);
                    $li.children('ul').removeClass('visible');
                    $('.tooltip').remove();
                }
            }, "li");
            $mainMenu.on('contextmenu', function (e) {
                e.preventDefault();
            });
            function showSubMenu($li, subMenuClass) {
                if ($li.hasClass('selected')) {
                    $subMenu.show();
                    const $targetSubMenu = $subMenu.find('ul.' + subMenuClass);
                    let visible = false;
                    if ($targetSubMenu.is(':visible')) {
                        visible = true;
                    }
                    $subMenu.children('ul').hide().css('max-height', 'none');
                    $subMenu.find('li').removeClass('selected');
                    $subMenu.css('max-height', 'none');
                    $targetSubMenu.show();
                    if (!visible) {
                        StatusBox.forceHide();
                    }
                    let top = $li.offset().top + 28;
                    let left = $li.offset().left + 155;
                    let shiftedLeft = false;
                    // move submenu to left if overflowing to the right
                    const viewportRight = $(window).width() - 5;
                    if (left + $subMenu.width() > viewportRight) {
                        $subMenu.addClass('left');
                        shiftedLeft = true;
                        top -= 27;
                    }
                    else {
                        $subMenu.removeClass('left');
                    }
                    // move submenu up if overflowing to the bottom
                    const viewportBottom = $(window).height();
                    if (top + $subMenu.height() > viewportBottom) {
                        top -= $subMenu.height();
                        if (shiftedLeft) {
                            top += 27;
                        }
                    }
                    top = Math.max(2, top);
                    $subMenu.css({ left: left, top: top });
                    $subMenu.find('.scrollArea').hide();
                    subListScroller.showOrHideScrollers($targetSubMenu);
                }
            }
            if ($mainMenu.find('.scrollArea').length !== 0) {
                new MenuHelper($mainMenu, {
                    $subMenu: $subMenu
                });
            }
            if (options.hotkeys && $mainMenu.attr("id") &&
                $("html").attr("lang") === "en-US") {
                hotKeyFns.set($mainMenu.attr("id"), options.hotkeys);
            }
        }
        xcMenu.add = add;
        ;
        /**
         * xcMenu.show
         * make a menu visable
         * @param $menu - the menu element to show
         * @param callback - any function to run after the menu is closed
         */
        function show($menu, callback) {
            xcMenu.removeKeyboardNavigation();
            $(document).off(".xcMenu");
            $(window).off(".xcMenu");
            $("#mainFrame").off(".xcMenu");
            if (closeCallback && typeof closeCallback === "function") {
                closeCallback();
                closeCallback = null;
            }
            closeCallback = callback;
            $menu.show();
            $(document).on("mousedown.xcMenu", function (event) {
                const $target = $(event.target);
                gMouseEvents.setMouseDownTarget($target);
                const clickable = $target.closest('.menu').length > 0 ||
                    $target.closest('.clickable').length > 0 ||
                    $target.hasClass("highlightBox");
                if (!clickable && $target.closest('.dropdownBox').length === 0) {
                    xcMenu.close($menu);
                }
            });
            $(window).on("blur.xcMenu", function () {
                xcMenu.close($menu);
            });
            let mainFrameScrolling = false;
            let mainFrameScrollTimer;
            $("#mainFrame").on("scroll.xcMenu", function () {
                if (!mainFrameScrolling) {
                    mainFrameScrolling = true;
                    xcMenu.close($menu);
                }
                clearTimeout(mainFrameScrollTimer);
                mainFrameScrollTimer = setTimeout(function () {
                    mainFrameScrolling = false;
                }, 300);
            });
            let winResizeTimer;
            let resizing = false;
            $(window).on("resize.xcMenu", function () {
                if (!resizing) {
                    resizing = true;
                    xcMenu.close($menu);
                }
                clearTimeout(winResizeTimer);
                winResizeTimer = setTimeout(function () {
                    resizing = false;
                }, 300);
            });
        }
        xcMenu.show = show;
        ;
        /**
         * xcMenu.close
         * close/ hide a menu element and any sub menues
         * @param $menu - the menu object to hide
         */
        function close($menu) {
            if (!$menu) {
                $(".menu").hide();
            }
            else {
                $menu.hide();
            }
            xcMenu.removeKeyboardNavigation();
            $(document).off(".xcMenu");
            $(window).off(".xcMenu");
            $("#mainFrame").off(".xcMenu");
            if (closeCallback && typeof closeCallback === "function") {
                closeCallback();
                closeCallback = null;
            }
        }
        xcMenu.close = close;
        ;
        /**
         * xcMenu.addKeyboardNavigation
         * adds keyboard navigation to an xcMenu and its submenues
         * @param $menu - the main menu to add navigation to
         * @param $subMenu -the submenues to add navigation to
         * @param options - option if the menu has the ability to be selected
         */
        function addKeyboardNavigation($menu, $subMenu, options = {}) {
            if (!options.allowSelection) {
                $('body').addClass('noSelection');
            }
            const $lis = $menu.find('li:visible:not(.unavailable)');
            const numLis = $lis.length;
            $(document).on('keydown.menuNavigation', listHighlight);
            const menuId = $menu.attr("id");
            if (menuId && hotKeyFns.has(menuId)) {
                $(document).on("keydown.menuHotKeys", function (event) {
                    if ((isSystemMac && event.metaKey) ||
                        (!isSystemMac && event.ctrlKey)) {
                        return;
                    }
                    if ($("input:focus").length) {
                        return;
                    }
                    hotKeyFns.get(menuId)(event, $menu);
                });
            }
            function listHighlight(event) {
                let keyCodeNum = event.which;
                let direction;
                let lateral = false;
                let enter;
                switch (keyCodeNum) {
                    case (keyCode.Up):
                        direction = -1;
                        break;
                    case (keyCode.Down):
                        direction = 1;
                        break;
                    case (keyCode.Left):
                        if ($(event.target).is('input')) {
                            if ($(event.target).attr('type') === "number") {
                                return;
                            }
                            if ($(event.target)[0].selectionStart !== 0) {
                                return;
                            }
                        }
                        lateral = true;
                        break;
                    case (keyCode.Right):
                        if ($(event.target).is('input')) {
                            return;
                        }
                        lateral = true;
                        break;
                    case (keyCode.Enter):
                        enter = true;
                        break;
                    case (keyCode.Escape):
                    case (keyCode.Backspace):
                        if ($(event.target).is('input')) {
                            return;
                        }
                        event.preventDefault();
                        xcMenu.close($menu.add($subMenu));
                        return;
                    default:
                        return; // key not supported
                }
                if (!enter) {
                    event.preventDefault();
                }
                let $highlightedLi = $lis.filter(function () {
                    return ($(this).hasClass('selected'));
                });
                let $highlightedSubLi = $();
                let $subLis;
                let numSubLis;
                if ($subMenu) {
                    $subLis = $subMenu.find('li:visible');
                    numSubLis = $subLis.length;
                    $highlightedSubLi = $subLis.filter('.selected');
                }
                if (enter) {
                    if ($highlightedSubLi.length === 1) {
                        if (!$highlightedSubLi.hasClass('unavailable')) {
                            $highlightedSubLi.trigger(fakeEvent.mouseup);
                        }
                        return;
                    }
                    else if ($highlightedSubLi.length === 0 &&
                        $highlightedLi.length === 1) {
                        if (!$highlightedLi.hasClass('unavailable')) {
                            if ($highlightedLi.hasClass('parentMenu')) {
                                // if li has submenu, treat enter key as a
                                // right keypress
                                lateral = true;
                                keyCodeNum = keyCode.Right;
                            }
                            else {
                                $highlightedLi.trigger(fakeEvent.mouseup);
                                return;
                            }
                        }
                        else {
                            return;
                        }
                    }
                }
                // if no visible lis, do not navigate up/down left/right
                if (!$lis.length) {
                    return;
                }
                if (!lateral) { // up and down keys
                    let index;
                    let newIndex;
                    if ($subMenu && $subMenu.is(':visible')) {
                        // navigate vertically through sub menu if it's open
                        if ($highlightedSubLi.length) {
                            if ($highlightedSubLi.hasClass('inputSelected')) {
                                // we don't want navigation if an input has focus
                                return;
                            }
                            index = $subLis.index($highlightedSubLi);
                            $highlightedSubLi.removeClass('selected');
                            newIndex = (index + direction + numSubLis) % numSubLis;
                            $highlightedSubLi = $subLis.eq(newIndex);
                        }
                        else {
                            index = (direction === -1) ? (numSubLis - 1) : 0;
                            $highlightedSubLi = $subLis.eq(index);
                        }
                        $highlightedSubLi.addClass('selected');
                    }
                    else {
                        // navigate vertically through main menu
                        if ($highlightedLi.length) { // When a li is highlighted
                            index = $lis.index($highlightedLi);
                            $highlightedLi.removeClass('selected');
                            newIndex = (index + direction + numLis) % numLis;
                            $highlightedLi = $lis.eq(newIndex);
                        }
                        else {
                            index = (direction === -1) ? (numLis - 1) : 0;
                            $highlightedLi = $lis.eq(index);
                        }
                        $highlightedLi.addClass('selected');
                        // adjust scroll position if newly highlighted li is not visible
                        const menuHeight = $menu.height();
                        const liTop = $highlightedLi.position().top;
                        const liHeight = 30;
                        let currentScrollTop;
                        if (liTop > menuHeight - liHeight) {
                            currentScrollTop = $menu.find('ul').scrollTop();
                            const newScrollTop = liTop - menuHeight + liHeight +
                                currentScrollTop;
                            $menu.find('ul').scrollTop(newScrollTop);
                            if ($menu.hasClass('hovering')) {
                                $menu.addClass('disableMouseEnter');
                            }
                        }
                        else if (liTop < 0) {
                            currentScrollTop = $menu.find('ul').scrollTop();
                            $menu.find('ul').scrollTop(currentScrollTop + liTop);
                            if ($menu.hasClass('hovering')) {
                                $menu.addClass('disableMouseEnter');
                            }
                        }
                    }
                }
                else { // left or right key is pressed
                    if (!$subMenu) { // if no submenu, do nothing
                        return;
                    }
                    if ($highlightedLi.length &&
                        $highlightedLi.hasClass('parentMenu')) {
                        let e;
                        // if mainmenu li is highlighted and has a submenu
                        if (keyCodeNum === keyCode.Right) {
                            if ($subMenu.is(':visible')) {
                                if (!$highlightedSubLi.length) {
                                    // select first sub menu li if sub menu is open
                                    // but no sub menu li is highlighted
                                    e = $.Event('mouseenter');
                                    e.keyTriggered = true;
                                    $highlightedLi.trigger(e);
                                    $subLis = $subMenu.find('li:visible');
                                    $subLis.eq(0).mouseover();
                                    if ($subLis.find('input').length > 0) {
                                        $subLis.find('input').eq(0).focus();
                                    }
                                }
                                else {
                                    // close menus if sub menu li is already highlighted
                                    xcMenu.close($menu.add($subMenu));
                                }
                            }
                            else {
                                // open submenu and highlight first li
                                e = $.Event('mouseenter');
                                e.keyTriggered = true;
                                $highlightedLi.trigger(e);
                                $subLis = $subMenu.find('li:visible');
                                $subLis.eq(0).mouseover();
                                if ($subLis.find('input').length > 0) {
                                    $subLis.find('input').eq(0).focus();
                                }
                            }
                        }
                        else { // left key is pressed
                            if ($subMenu.is(':visible')) { // if submenu open, hide it
                                $subMenu.hide();
                            }
                            else { // if no submenu is open, close all menus
                                xcMenu.close($menu);
                            }
                        }
                    }
                    else {
                        xcMenu.close($menu.add($subMenu));
                    }
                }
            }
        }
        xcMenu.addKeyboardNavigation = addKeyboardNavigation;
        ;
        /**
         * xcMenu.removeKeyboardNavigation
         * remove the ability to navigate a menu by keyboard
         */
        function removeKeyboardNavigation() {
            $(document).off('keydown.menuNavigation');
            $(document).off('keydown.menuHotKeys');
            $('body').removeClass('noSelection');
        }
        xcMenu.removeKeyboardNavigation = removeKeyboardNavigation;
        ;
    })(window.xcMenu || (xcMenu = {}));

    window.Undo = (function($, Undo) {
        var undoFuncs = {};

        // isMostRecent - boolean, true if it's the most recent operation performed
        Undo.run = function(xcLog, isMostRecent) {
            xcAssert((xcLog != null), "invalid log");

            var deferred = PromiseHelper.deferred();

            var options = xcLog.getOptions();
            var operation = xcLog.getOperation();

            if (undoFuncs.hasOwnProperty(operation)) {
                var minModeCache = gMinModeOn;
                // do not use any animation
                gMinModeOn = true;
                undoFuncs[operation](options, isMostRecent)
                .then(deferred.resolve)
                .fail(function() {
                    // XX do we do anything with the cursor?
                    deferred.reject("undo failed");
                })
                .always(function() {
                    gMinModeOn = minModeCache;
                });
            } else {
                console.warn("Unknown operation cannot undo", operation);
                deferred.reject("Unknown operation");
            }

            return (deferred.promise());
        };

        /* START BACKEND OPERATIONS */
        undoFuncs[SQLOps.IndexDS] = function(options) {
            var tableId = xcHelper.getTableId(options.tableName);
            return (TblManager.sendTableToUndone(tableId, {'remove': true}));
        };

        undoFuncs[SQLOps.RefreshTables] = function(options) {
            var deferred = PromiseHelper.deferred();
            var promises = [];
            for (var i = 0; i < options.tableNames.length; i++) {
                var tableId = xcHelper.getTableId(options.tableNames[i]);
                promises.push(TblManager.sendTableToUndone.bind(this, tableId, {'remove': true}))
            }
            PromiseHelper.chain(promises)
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        }

        undoFuncs[SQLOps.ExecSQL] = function(options) {
            var deferred = PromiseHelper.deferred();
            var opStruct;
            try {
                qStruct = JSON.parse(options.query);
            } catch (e) {
                deferred.reject(e);
            }
            var promises = [];
            for (var i = 0; i < qStruct.length; i++) {
                var tableId = xcHelper.getTableId(qStruct[i].args.dest);
                promises.push(TblManager.sendTableToUndone.bind(this, tableId, {'remove': true}));
            }
            PromiseHelper.chain(promises)
            .then(deferred.resolve)
            .fail(deferred.reject)

            return deferred.promise();
        };

        undoFuncs[SQLOps.Sort] = function(options, isMostRecent) {
            var deferred = PromiseHelper.deferred();
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            var sortOptions = options.options || {};
            TblManager.refreshTable([options.tableName], null,
                                           [options.newTableName],
                                           worksheet, null, refreshOptions)
            .then(function() {
                if (isMostRecent && sortOptions.formOpenTime) {
                    // XXX need to change to colNums plural once multisort is ready
                    SortView.show([options.colNum], options.tableId, {
                        "restore": true,
                        "restoreTime": sortOptions.formOpenTime
                    });
                }
                deferred.resolve();
            })
            .fail(deferred.reject);
            return deferred.promise();
        };

        undoFuncs[SQLOps.Filter] = function(options, isMostRecent) {
            var deferred = PromiseHelper.deferred();
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };

            if (options.fltOptions.complement) {
                var tableId = xcHelper.getTableId(options.newTableName);
                promise = TblManager.sendTableToUndone(tableId, {'remove': true});
            } else {
                promise = TblManager.refreshTable([options.tableName], null,
                                    [options.newTableName], worksheet, null,
                                    refreshOptions);
            }

            promise
            .then(function() {
                // show filter form if filter was triggered from the form and was
                // the most recent operation
                if (isMostRecent && options.formOpenTime) {
                    OperationsView.show(null, null, null, {
                        "restore": true,
                        "restoreTime": options.formOpenTime
                    });
                }
                deferred.resolve();
            })
            .fail(function() {
                deferred.reject();
            });
            return (deferred.promise());
        };

        undoFuncs[SQLOps.Query] =function(options) {
            var deferred = PromiseHelper.deferred();
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };


            TblManager.refreshTable([options.tableName], null,
                                    [options.newTableName], worksheet, null,
                                    refreshOptions)
            .then(function() {
                deferred.resolve();
            })
            .fail(function() {
                deferred.reject();
            });
            return (deferred.promise());
        };

        undoFuncs[SQLOps.Map] = function(options, isMostRecent) {
            var deferred = PromiseHelper.deferred();
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            var mapOptions = options.mapOptions || {};
            var promise;
            if (mapOptions.createNewTable) {
                var tableId = xcHelper.getTableId(options.newTableName);
                promise = TblManager.sendTableToUndone(tableId, {'remove': true});
            } else {
                promise = TblManager.refreshTable([options.tableName], null,
                                    [options.newTableName],
                                    worksheet, null, refreshOptions);
            }

            promise.then(function() {
                // show map form if map was triggered from the form and was the
                // most recent operation
                if (isMostRecent && mapOptions.formOpenTime) {
                    OperationsView.show(null, null, null, {
                        "restore": true,
                        "restoreTime": mapOptions.formOpenTime
                    });
                }
                deferred.resolve();
            })
            .fail(function() {
                deferred.reject();
            });
            return (deferred.promise());
        };

        undoFuncs[SQLOps.Join] = function(options, isMostRecent) {
            var deferred = PromiseHelper.deferred();
            var joinOptions = options.options || {};
            if (joinOptions.keepTables) {
                var tableId = xcHelper.getTableId(options.newTableName);
                TblManager.sendTableToUndone(tableId, {'remove': true})
                .then(function() {
                    if (isMostRecent && joinOptions.formOpenTime) {
                        var joinOpts = {
                            restore: true,
                            restoreTime: joinOptions.formOpenTime
                        };
                        JoinView.show(null, null, joinOpts);
                    }
                    deferred.resolve();
                })
                .fail(deferred.reject);
                return deferred.promise();
            }

            var currTableId = xcHelper.getTableId(options.newTableName);
            var currTableWorksheet = WSManager.getWSFromTable(currTableId);

            var lJoinInfo = options.lJoinInfo;
            var rJoinInfo = options.rJoinInfo;

            var lTableWorksheet = lJoinInfo.ws;
            var rTableWorksheet = rJoinInfo.ws;

            var leftTable = {
                name: options.lTableName,
                id: lJoinInfo.tableId,
                position: lJoinInfo.tablePos,
                worksheet: lTableWorksheet
            };

            var rightTable = {
                name: options.rTableName,
                id: rJoinInfo.tableId,
                position: rJoinInfo.tablePos,
                worksheet: rTableWorksheet
            };

            var isSelfJoin = false;
            if (leftTable.id === rightTable.id) {
                isSelfJoin = true;
            }

            var firstTable = {};
            var secondTable = {};

            if (!isSelfJoin) {
                if (leftTable.worksheet === rightTable.worksheet) {
                    if (leftTable.position > rightTable.position) {
                        var temp = rightTable;
                        rightTable = leftTable;
                        leftTable = temp;
                    }
                }
            }

            if (currTableWorksheet !== leftTable.worksheet &&
                currTableWorksheet !== rightTable.worksheet) {
                firstTable = leftTable;
                secondTable = rightTable;
            } else if (currTableWorksheet === leftTable.worksheet) {
                firstTable = leftTable;
                firstTable.position = null; // we will rely on newTable's position
                secondTable = rightTable;
            } else if (!isSelfJoin && currTableWorksheet === rightTable.worksheet) {
                firstTable = rightTable;
                firstTable.position = null; // we will rely on newTable's position
                secondTable = leftTable;
            }

            var refreshOptions = {
                "isUndo": true,
                "position": firstTable.position,
                "replacingDest": TableType.Undone
            };
            TblManager.refreshTable([firstTable.name], null, [options.newTableName],
                                    firstTable.worksheet, null, refreshOptions)
            .then(function() {
                if (isSelfJoin) {
                    if (isMostRecent && joinOptions.formOpenTime) {
                        var joinOpts = {
                            restore: true,
                            restoreTime: joinOptions.formOpenTime
                        };
                        JoinView.show(null, null, joinOpts);
                    }
                    deferred.resolve();
                } else {
                    var secondRefreshOptions = {
                        "isUndo": true,
                        "position": secondTable.position,
                        "replacingDest": TableType.Undone
                    };
                    TblManager.refreshTable([secondTable.name], null, [],
                                            secondTable.worksheet, null,
                                            secondRefreshOptions)
                    .then(function() {
                        if (isMostRecent && joinOptions.formOpenTime) {
                            var joinOpts = {
                                restore: true,
                                restoreTime: joinOptions.formOpenTime
                            };
                            JoinView.show(null, null, joinOpts);
                        }
                        deferred.resolve();
                    })
                    .fail(deferred.reject);
                }
            })
            .fail(deferred.reject);

            return (deferred.promise());
        };

        undoFuncs[SQLOps.Union] = function(options, isMostRecent) {
            var deferred = PromiseHelper.deferred();
            var unionOptions = options.options || {};
            var promises = [];
            var tableId = xcHelper.getTableId(options.newTableName);
            promises.push(TblManager.sendTableToUndone.bind(window, tableId,
                                                            {'remove': true}));

            if (!unionOptions.keepTables) {
                // in case one table is used serveral times
                var tableInfoMap = {};
                options.tableNames.forEach(function(tableName, index) {
                    tableInfoMap[tableName] = options.tableInfos[index];
                });

                for (var tableName in tableInfoMap) {
                    var tableInfo = tableInfoMap[tableName];
                    var worksheet = tableInfo.ws;
                    var refreshOptions = {
                        "isUndo": true,
                        "position": tableInfo.tablePos,
                        "replacingDest": TableType.Undone
                    };
                    promises.push(TblManager.refreshTable.bind(window, [tableName],
                                                            null, [], worksheet,
                                                            null, refreshOptions));
                }
            }

            PromiseHelper.chain(promises)
            .then(function() {
                if (isMostRecent && unionOptions.formOpenTime) {
                    var options = {
                        restore: true,
                        restoreTime: unionOptions.formOpenTime
                    };
                    UnionView.show(null, null, options);
                }
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        undoFuncs[SQLOps.GroupBy] = function(options, isMostRecent) {
            var deferred = PromiseHelper.deferred();
            var tableId = xcHelper.getTableId(options.newTableName);
            var promise;
            if (options.options && (options.options.isJoin ||
                !options.options.isKeepOriginal)) {
                var worksheet = WSManager.getWSFromTable(tableId);
                var refreshOptions = {
                    isUndo: true,
                    replacingDest: TableType.Undone
                };
                promise = TblManager.refreshTable([options.tableName], null,
                                           [options.newTableName],
                                           worksheet, null, refreshOptions);
            } else {
                promise = TblManager.sendTableToUndone(tableId, {'remove': true});
            }
            promise.then(function() {
                if (isMostRecent &&
                    (options.options && options.options.formOpenTime)) {
                    OperationsView.show(null, null, null, {
                        "restore": true,
                        "restoreTime": options.options.formOpenTime
                    });
                }
                deferred.resolve();
            })
            .fail(function() {
                deferred.reject();
            });
            return (deferred.promise());
        };

        undoFuncs[SQLOps.SplitCol] = function(options) {
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            return TblManager.refreshTable([options.tableName], null,
                                           [options.newTableName],
                                           worksheet, null, refreshOptions);
        };

        undoFuncs[SQLOps.ChangeType] = function(options) {
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            return TblManager.refreshTable([options.tableName], null,
                                           [options.newTableName],
                                           worksheet, null, refreshOptions);
        };

        undoFuncs[SQLOps.Project] = function(options, isMostRecent) {
            var deferred = PromiseHelper.deferred();
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            TblManager.refreshTable([options.tableName], null,
                                            [options.newTableName], worksheet, null,
                                            refreshOptions)
            .then(function() {
                if (isMostRecent && options.formOpenTime) {
                    ProjectView.show(null, null, {
                        "restore": true,
                        "restoreTime": options.formOpenTime
                    });
                }
                deferred.resolve();
            })
            .fail(function() {
                deferred.reject();
            });

            return (deferred.promise());
        };

        undoFuncs[SQLOps.DFRerun] = function(options) {
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);

            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };

            return TblManager.refreshTable([options.tableName], null,
                                    [options.newTableName], worksheet, null,
                                    refreshOptions);
        };

        undoFuncs[SQLOps.Finalize] = function(options) {
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            return TblManager.refreshTable([options.tableName], null,
                                            [options.newTableName], worksheet, null,
                                            refreshOptions);
        };

        undoFuncs[SQLOps.Ext] = function(options, isMostRecent) {
            // XXX As extension can do anything, it may need fix
            // as we add more extensions and some break the current code

            // Tested: Window, hPartition, genRowNum, union

            // var tableId = options.tableId;
            var newTables = options.newTables || [];
            var replace = options.replace || {};
            var extOptions = options.options || {};
            // undo new append table, just hide newTables
            var promises = [];
            var deferred = PromiseHelper.deferred();

            newTables.forEach(function(newTableName) {
                var newTableId = xcHelper.getTableId(newTableName);
                promises.push(TblManager.sendTableToUndone.bind(window, newTableId,
                                                                {'remove': true}));
            });

            for (var table in replace) {
                var oldTables = replace[table];
                var refreshOptions = {
                    "isUndo": true,
                    "replacingDest": TableType.Undone
                };
                var worksheet;
                for (var i = 0; i < oldTables.length; i++) {
                    var oldTable = oldTables[i];
                    if (i === 0) {
                        worksheet = WSManager.getWSFromTable(xcHelper.getTableId(table));
                        promises.push(TblManager.refreshTable.bind(window,
                                                                [oldTable], null,
                                                                [table], null, null,
                                                                refreshOptions));
                    } else {
                        promises.push(TblManager.refreshTable.bind(window,
                                                                [oldTable], null,
                                                                [], worksheet, null,
                                                                refreshOptions));
                    }
                }
            }

            PromiseHelper.chain(promises)
            .then(function() {
                if (isMostRecent) {
                    ExtensionManager.openView(null, null, {
                        "restoreTime": extOptions.formOpenTime
                    });
                }

                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        };
        /* END BACKEND OPERATIONS */

        /* Dataflow operations */

        undoFuncs[SQLOps.DisconnectOperations] = function(options) {
            DagTabManager.Instance.switchTabId(options.dataflowId);
            DagView.connectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.ConnectOperations] = function(options) {
            DagTabManager.Instance.switchTabId(options.dataflowId);
            DagView.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.RemoveOperations] = function(options) {
            DagTabManager.Instance.switchTabId(options.dataflowId);
            DagView.addBackNodes(options.nodeIds);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.AddOperation] = function(options) {
            DagTabManager.Instance.switchTabId(options.dataflowId);
            DagView.removeNodes([options.nodeId])
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.CopyOperations] = function(options) {
            DagTabManager.Instance.switchTabId(options.dataflowId);
            DagView.removeNodes(options.nodeIds);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.MoveOperations] = function(options) {
            DagTabManager.Instance.switchTabId(options.dataflowId);
            DagView.moveNodes(options.nodeIds, options.oldPositions);
            return PromiseHelper.resolve(null);
        };

        /* USER STYLING/FORMATING OPERATIONS */

        undoFuncs[SQLOps.MinimizeCols] = function(options) {
            focusTableHelper(options);
            return ColManager.maximizeCols(options.colNums, options.tableId);
        };

        undoFuncs[SQLOps.MaximizeCols] = function(options) {
            focusTableHelper(options);
            return ColManager.minimizeCols(options.colNums, options.tableId);
        };

        undoFuncs[SQLOps.AddNewCol] = function(options) {
            focusTableHelper(options);
            var colNum = options.colNum;
            if (options.direction === ColDir.Right) {
                colNum++;
            }
            return ColManager.hideCol([colNum], options.tableId);
        };

        undoFuncs[SQLOps.HideCol] = function(options) {
            undoDeleteHelper(options, -1);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.PullCol] = function(options) {
            focusTableHelper(options);
            if (options.pullColOptions.source === "fnBar") {
                if (options.wasNewCol) {
                    var col = gTables[options.tableId].getCol(options.colNum);
                    col.userStr = options.origUsrStr;
                    col.setBackColName(options.backName);
                    col.type = options.type;
                    col.func = options.func;
                    col.isNewCol = options.wasNewCol;
                    var $table = $('#xcTable-' + options.tableId);
                    $table.find('td.col' + options.colNum).empty();
                    var $th = $table.find('th.col' + options.colNum);
                    $th.addClass('newColumn')
                        .removeClass("sortable indexedColumn")
                        .find('.header').attr('class', 'header')
                        .find('.iconHelper').attr('title', '')
                        .end()
                        .find('.prefix').addClass('immediate');
                    TPrefix.updateColor(options.tableId, options.colNum);
                    return PromiseHelper.resolve(null);
                } else {
                    return (ColManager.execCol("pull", options.origUsrStr,
                                           options.tableId, options.colNum,
                                            {undo: true, backName: options.backName}));
                }
            } else {
                var colNum = options.colNum;
                if (options.direction === ColDir.Right) {
                    colNum++;
                }
                return (ColManager.hideCol([colNum], options.tableId));
            }
        };

        undoFuncs[SQLOps.PullMultipleCols] = function(options) {
            focusTableHelper(options);
            return (ColManager.hideCol(options.colNums, options.tableId,
                                     {"noAnimate": true}));
        };

        undoFuncs[SQLOps.ReorderCol] = function(options) {
            focusTableHelper(options);
            ColManager.reorderCol(options.tableId, options.newColNum,
                                  options.oldColNum, {"undoRedo": true});
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.SortTableCols] = function(options) {
            focusTableHelper(options);
            TblManager.orderAllColumns(options.tableId, options.originalOrder);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.ResizeTableCols] = function(options) {
            focusTableHelper(options);
            TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                         options.oldColumnWidths,
                                         options.oldSizedTo, options.wasHidden);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.DragResizeTableCol] = function(options) {
            focusTableHelper(options);
            TblAnim.resizeColumn(options.tableId, options.colNum, options.toWidth,
                                 options.fromWidth, options.oldSizedTo);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.DragResizeRow] = function(options) {
            focusTableHelper(options);
            TblAnim.resizeRow(options.rowNum, options.tableId, options.toHeight,
                              options.fromHeight);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.RenameCol] = function(options) {
            focusTableHelper(options);
            ColManager.renameCol(options.colNum, options.tableId, options.colName, {
                "keepEditable": options.wasNew,
                "prevWidth": options.prevWidth
            });
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.TextAlign] = function(options) {
            focusTableHelper(options);
            var numCols = options.colNums.length;
            var alignment;
            for (var i = 0; i < numCols; i++) {
                alignment = options.prevAlignments[i];
                if (alignment === "Left") {
                    alignment = "leftAlign";
                } else if (alignment === "Right"){
                    alignment = "rightAlign";
                } else if (alignment === "Center") {
                    alignment = "centerAlign";
                } else {
                    alignment = "wrapAlign";
                }
                ColManager.textAlign([options.colNums[i]], options.tableId,
                                     alignment);
            }
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.ChangeFormat] = function(options) {
            focusTableHelper(options);
            ColManager.format(options.colNums, options.tableId, options.oldFormats);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.Round] = function(options) {
            var newTableId = xcHelper.getTableId(options.newTableName);
            var worksheet = WSManager.getWSFromTable(newTableId);
            var refreshOptions = {
                isUndo: true,
                replacingDest: TableType.Undone
            };
            return TblManager.refreshTable([options.tableName], null,
                                           [options.newTableName],
                                           worksheet, null, refreshOptions);
        };
        /* END USER STYLING/FORMATING OPERATIONS */


        /* Table Operations */
        undoFuncs[SQLOps.RenameTable] = function(options) {
            focusTableHelper(options);
            var tableId = options.tableId;
            var oldTableName = options.oldTableName;

            return xcFunction.rename(tableId, oldTableName);
        };

        undoFuncs[SQLOps.RevertTable] = function(options) {
            var deferred = PromiseHelper.deferred();

            var worksheet = WSManager.getWSFromTable(options.tableId);
            TblManager.refreshTable([options.oldTableName], null,
                                    [options.tableName], worksheet, null,
                                {isUndo: true, from: TableType.Orphan})
            .then(function() {
                deferred.resolve();
            })
            .fail(function(error) {
                deferred.reject(error);
            });

            return (deferred.promise());
        };

        undoFuncs[SQLOps.ActiveTables] = function(options) {
            // undo sent to worksheet, that is archive
            var tableType = options.tableType;
            var tableNames = options.tableNames;
            var tableIds = [];
            // var hasTableInActiveWS = false;
            for (var i = 0, len = tableNames.length; i < len; i++) {
                var tableId = xcHelper.getTableId(tableNames[i]);
                tableIds.push(tableId);
            }

            if (tableType === TableType.Orphan) {
                tableIds.forEach(function(tId) {
                    TblManager.sendTableToOrphaned(tId, {
                        "remove": true
                    });
                });
                return TableList.refreshOrphanList();
            } else {
                console.error(tableType, "not support undo!");
                return PromiseHelper.resolve(null);
            }
        };

        undoFuncs[SQLOps.ReorderTable] = function(options) {
            focusTableHelper(options);
            TblFunc.reorderAfterTableDrop(options.tableId, options.desIndex,
                                          options.srcIndex, {moveHtml: true});
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.HideTable] = function(options) {
            focusTableHelper(options);
            TblManager.unHideTable(options.tableId);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.UnhideTable] = function(options) {
            focusTableHelper(options);
            TblManager.hideTable(options.tableId);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.MarkPrefix] = function(options) {
            TPrefix.markColor(options.prefix, options.oldColor);
            return PromiseHelper.resolve(null);
        };
        /* End of Table Operations */


        /* Worksheet Opeartion */
        undoFuncs[SQLOps.AddWS] = function(options) {
            WSManager.delWS(options.worksheetId, DelWSType.Empty);
            WSManager.focusOnWorksheet(options.currentWorksheet);

            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.RenameWS] = function(options) {
            WSManager.renameWS(options.worksheetId, options.oldName);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.ReorderWS] = function(options) {
            var oldWSIndex = options.oldWorksheetIndex;
            var newWSIndex = options.newWorksheetIndex;

            WSManager.reorderWS(newWSIndex, oldWSIndex);
            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.MoveTableToWS] = function(options) {
            var tableId = options.tableId;
            var oldWS = options.oldWorksheetId;
            var tablePos = options.oldTablePos;
            WSManager.moveTable(tableId, oldWS, null, tablePos);
            WSManager.focusOnWorksheet(oldWS, false, tableId);
            return PromiseHelper.resolve();
        };

        undoFuncs[SQLOps.MoveTemporaryTableToWS] = function(options) {
            var deferred = PromiseHelper.deferred();
            var tableId = options.tableId;
            var tableType = options.tableType;

            if (tableType === TableType.Orphan) {
                TblManager.sendTableToOrphaned(tableId, {"remove": true})
                .then(function() {
                    deferred.resolve();
                })
                .fail(function() {
                    deferred.reject();
                });
            } else {
                console.error(tableType, "cannot undo!");
                deferred.resolve();
            }

            return deferred.promise();
        };

        undoFuncs[SQLOps.HideWS] = function(options) {
            var wsId = options.worksheetId;
            var wsIndex = options.worksheetIndex;
            return WSManager.unhideWS(wsId, wsIndex);
        };

        undoFuncs[SQLOps.UnHideWS] = function(options) {
            var wsIds = options.worksheetIds;

            for (var i = 0, len = wsIds.length; i < len; i++) {
                WSManager.hideWS(wsIds[i]);
            }

            return PromiseHelper.resolve(null);
        };

        undoFuncs[SQLOps.MakeTemp] = function(options) {
            var deferred = PromiseHelper.deferred();

            var promises = [];
            var failures = [];
            options.tableNames.forEach(function(tableName, index) {
                promises.push((function() {
                    var innerDeferred = PromiseHelper.deferred();

                    var refreshOptions = {
                        "isUndo": true,
                        "position": options.tablePos[index]
                    };

                    TblManager.refreshTable([tableName], null, [], options.workSheets[index], null, refreshOptions)
                    .then(function(){
                        innerDeferred.resolve();
                    })
                    .fail(function(error) {
                        failures.push(tableName + ": {" + xcHelper.parseError(error) + "}");
                        innerDeferred.resolve(error);
                    });

                    return innerDeferred.promise();
                }).bind(this));
            });

            PromiseHelper.chain(promises)
            .then(function() {
                if (failures.length > 0) {
                    deferred.reject(failures.join("\n"));
                } else {
                    deferred.resolve();
                }
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        undoFuncs[SQLOps.DelWS] = function(options) {
            var delType = options.delType;
            var wsId = options.worksheetId;
            var wsName = options.worksheetName;
            var wsIndex = options.worksheetIndex;
            var tables = options.tables;
            var promises = [];

            if (delType === DelWSType.Empty) {
                makeWorksheetHelper();

                return PromiseHelper.resolve(null);
            } else if (delType === DelWSType.Del) {
                makeWorksheetHelper();

                tables.forEach(function(tableId) {
                    promises.push(WSManager.moveTemporaryTable.bind(this,
                        tableId, wsId, TableType.Orphan));
                });

                promises.push(TableList.refreshOrphanList.bind(this));

                return PromiseHelper.chain(promises);
            } else if (delType === DelWSType.Temp) {
                makeWorksheetHelper();
                tables.forEach(function(tableId) {
                    promises.push(WSManager.moveTemporaryTable.bind(this,
                        tableId, wsId, TableType.Orphan));
                });
                promises.push(TableList.refreshOrphanList.bind(this));

                return PromiseHelper.chain(promises);
            } else {
                console.error("Unexpected delete worksheet type");
                return PromiseHelper.reject(null);
            }

            function makeWorksheetHelper() {
                WSManager.addWS(wsId, wsName, wsIndex);
                var $tabs = $("#worksheetTabs .worksheetTab");
                var $tab = $tabs.eq(wsIndex);
                if (($tab.data("ws") !== wsId)) {
                    $("#worksheetTab-" + wsId).insertBefore($tab);
                }
            }
        };
        /* End of Worksheet Operation */
        // for undoing deleted table columns
        function undoDeleteHelper(options, shift) {
            focusTableHelper(options);
            var progCols = options.progCols;
            var tableId = options.tableId;
            var currProgCols = gTables[tableId].tableCols;
            var colNums = options.colNums;
            var $table = $('#xcTable-' + tableId);
            var dataIndex = xcHelper.parseColNum($table.find('th.dataCol'));
            var newProgCol;
            shift = shift || 0;

            for (var i = 0, len = progCols.length; i < len; i++) {
                newProgCol = ColManager.newCol(progCols[i]);
                currProgCols.splice(colNums[i] + shift, 0, newProgCol);
            }

            var jsonData = [];
            $table.find('tbody').find('.col' + dataIndex).each(function() {
                jsonData.push($(this).find('.originalData').text());
            });

            var tableHtml = TblManager.generateTheadTbody(tableId);
            var rowNum = xcHelper.parseRowNum($table.find('tbody').find('tr:eq(0)'));

            $table.html(tableHtml);

            TblManager.pullRowsBulk(tableId, jsonData, rowNum, RowDirection.Bottom);
            TblManager.addColListeners($table, tableId);
            TblManager.updateHeaderAndListInfo(tableId);
            TblFunc.moveFirstColumn();
        }

        function focusTableHelper(options) {
            if (options.tableId !== gActiveTableId) {
                TblFunc.focusTable(options.tableId, true);
            }
        }

        return (Undo);
    }(jQuery, {}));

    // hot patch for XD-397, XD-410
    function suggestType(datas, currentType, confidentRate = 1) {
        // Inputs has fields colInfo, confidentRate
        if (currentType === ColumnType.integer ||
            currentType === ColumnType.float) {
            return currentType;
        }
        if (!(datas instanceof Array)) {
            datas = [datas];
        }
        let isFloat;
        let validData = 0;
        let numHit = 0;
        let booleanHit = 0;
        let timestampHit = 0;
        const letterRex = /[a-z]/i;
        const timestampFormats = [moment.ISO_8601];
        for (let i = 0, len = datas.length; i < len; i++) {
            let data = datas[i];
            if (data == null) {
                // skip this one
                continue;
            }
            data = data.trim().toLowerCase();
            if (data === "") {
                // skip this one
                continue;
            }
            validData++;
            let num = Number(data);
            // edge case1: "0X123", "1e12" can be parse as number but it's string
            // edge case2: 012345 should not be a number, otherwise it's cast to 12345
            if (!isNaN(num) &&
                !letterRex.test(data) &&
                !(data.length > 1 && data[0] === "0" && data[1] !== ".")) {
                numHit++;
                if (!isFloat) {
                    if (!Number.isInteger(num) ||
                        data.includes(".")) {
                        // when it's float
                        isFloat = true;
                    }
                }
            }
            else if (data === "true" || data === "false" ||
                data === "t" || data === "f") {
                booleanHit++;
            }
            else if (moment(data.toUpperCase(), timestampFormats, true).isValid()) {
                timestampHit++;
            }
        }
        if (validData === 0) {
            return ColumnType.string;
        }
        else if (numHit / validData >= confidentRate) {
            if (isFloat) {
                return ColumnType.float;
            }
            else {
                return ColumnType.integer;
            }
        }
        else if (booleanHit / validData >= confidentRate) {
            return ColumnType.boolean;
        }
        else if (timestampHit / validData >= confidentRate) {
            return ColumnType.timestamp;
        }
        else {
            return ColumnType.string;
        }
    }
    xcSuggest.suggestType = suggestType;
}(jQuery));