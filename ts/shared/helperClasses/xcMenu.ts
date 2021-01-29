namespace xcMenu {
    // adds default menu behaviors to menus passed in as arguments
    // behaviors include highlighting lis on hover, opening submenus on hover

    let closeCallback: Function;
    const hotKeyFns: Map<string, Function> = new Map<string, Function>(); // menuId: callbackFn

    // options:
    //      keepOpen: if set true, main menu will not close when click the li
    //      hotKeys: callback function for hotkeys
    //      allowSelection: boolean, if true will not clear selected text
    export interface Options {
        keepOpen?: boolean;
        hotkeys?: Function;
        allowSelection?: boolean;
        $subSubMenu?: JQuery;
        subMenuTop?: number;
        subMenuLeft?: number;
    }

    /**
     * xcMenu.add
     * Add a new xcMenu based on a jquery element
     * @param $mainMenu - the root menu for the new xcMenu, sub menues can exist below this
     * @param options - menu options to set if the menu stays open or has hotkeys
     */
    export function add($mainMenu: JQuery, options: xcMenu.Options = <xcMenu.Options>{}): void {
        let $subMenu: JQuery;
        let $subSubMenu: JQuery;
        let $allMenus: JQuery = $mainMenu;
        const subMenuId: string = $mainMenu.data('submenu');
        let subSubMenuId: string;
        let hideTimeout: NodeJS.Timer;
        let showTimeout: NodeJS.Timer;
        let subListScroller: MenuHelper;
        let subSubListScroller: MenuHelper;

        if (subMenuId) {
            $subMenu = $('#' + subMenuId);
            $allMenus = $allMenus.add($subMenu);
            subSubMenuId = $subMenu.data("submenu");
            subListScroller = setupSubMenu($subMenu, $mainMenu);
            if (subSubMenuId) {
                $subSubMenu = $("#" + subSubMenuId);
                $allMenus = $allMenus.add($subSubMenu);
                subSubListScroller = setupSubMenu($subSubMenu, $subMenu);
            }
        }

        $mainMenu.on('mouseup', 'li', function(event) {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(this);
            if ($li.hasClass('parentMenu')) {
                return;
            }
            event.stopPropagation();
            if (typeof mixpanel !== "undefined") {
                xcMixpanel.menuItemClick(event);
            }

            // unavailable class defines too many styles (with !important) that
            // we don't need in the new UI
            if (!$li.hasClass('unavailable') && !$li.hasClass('disabled') && !options.keepOpen) {
                // hide li if doesnt have a submenu or an input field
                xcMenu.close($allMenus);
                clearTimeout(showTimeout);
            }
        });

        $mainMenu.on({
            "mouseenter": function(event) {
                if ($mainMenu.hasClass('disableMouseEnter')) {
                    $mainMenu.removeClass('disableMouseEnter');
                    return;
                }
                const $li = $(this);
                $mainMenu.find('.selected').removeClass('selected');
                $mainMenu.addClass('hovering');
                $li.addClass('selected');
                const hasSubMenu: boolean = $li.hasClass('parentMenu');

                if (!hasSubMenu || $li.hasClass('unavailable')) {
                    if ($subMenu) {
                        if (event.keyTriggered) {
                            $subMenu.hide();
                            if ($subSubMenu) {
                                $subSubMenu.hide();
                            }
                        } else {
                            clearTimeout(hideTimeout);
                            hideTimeout = setTimeout(function() {
                                $subMenu.hide();
                                if ($subSubMenu) {
                                    $subSubMenu.hide();
                                }
                            }, 150);
                        }
                    }
                    return;
                }

                clearTimeout(hideTimeout);
                const subMenuClass: string = $li.data('submenu');
                if (event.keyTriggered) { // mouseenter triggered by keypress
                    showSubMenu($subMenu, $li, subMenuClass, subListScroller, options);
                } else {
                    showTimeout = setTimeout(function() {
                        showSubMenu($subMenu, $li, subMenuClass, subListScroller, options);
                    }, 150);
                }

            },
            "mouseleave": function() {
                if ($mainMenu.hasClass('disableMouseEnter')) {
                    return;
                }
                $mainMenu.removeClass('hovering');
                $mainMenu.find('.selected').removeClass('selected');
                const $li: JQuery = $(this);
                $li.children('ul').removeClass('visible');
                $('.tooltip').remove();
            }
        }, "li");

        $mainMenu.on('contextmenu', function(e) {
            e.preventDefault();
        });

        function showSubMenu($subMenu: JQuery, $li: JQuery, subMenuClass: string, subListScroller, options?): void {
            options = options || {};
            if ($li.hasClass('selected')) {
                $subMenu.show();
                const $targetSubMenu: JQuery = $subMenu.find('ul.' + subMenuClass);
                let visible: boolean = false;
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
                let top: number;
                let topOffset: number;
                let left: number;
                let leftOffset: number;
                if (options.subMenuTop != null) {
                    topOffset = options.subMenuTop;
                } else {
                    topOffset = $li.outerHeight();
                }
                if (options.subMenuLeft != null) {
                    leftOffset = options.subMenuTop;
                } else {
                    leftOffset = -10;
                }
                top = $li.offset().top + topOffset;
                left = $li.offset().left + $li.outerWidth() + leftOffset;
                let shiftedLeft: boolean = false;

                // move submenu to left if overflowing to the right
                const viewportRight: number = $(window).width() - 5;
                if (left + $subMenu.width() > viewportRight) {
                    $subMenu.addClass('left');
                    shiftedLeft = true;
                    if (options.subMenuTop == null) {
                        top -= 27;
                    }
                } else {
                    $subMenu.removeClass('left');
                }

                // move submenu up if overflowing to the bottom
                const viewportBottom: number = $(window).height();
                if (top + $subMenu.height() > viewportBottom) {
                    top -= $subMenu.height();
                    if (shiftedLeft ||  options.subMenuTop != null) {
                        top += 27;
                    }
                }
                top = Math.max(2, top);

                $subMenu.css({left: left, top: top});
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

        function setupSubMenu($subMenu, $parentMenu) {
            const subListScroller = new MenuHelper($subMenu, {
                "bottomPadding": 4
            });

            // prevents input from closing unless you hover over a different li
            // on the main column menu
            // $subMenu.find('input').on({
            $subMenu.on({
                "focus": function() {
                    $(this).parents('li').addClass('inputSelected')
                           .parents('.subMenu').addClass('inputSelected');
                },
                "blur": function() {
                    $(this).parents('li').removeClass('inputSelected')
                           .parents('.subMenu').removeClass('inputSelected');
                },
                "keyup": function() {
                    if ($subMenu.find('li.selected').length) {
                        return;
                    }
                    const $input: JQuery = $(this);
                    $input.parents('li').addClass('inputSelected')
                    .parents('.subMenu').addClass('inputSelected');

                }
            }, 'input');

            $subMenu.on('mouseup', 'li', function(event) {
                if (event.which !== 1) {
                    return;
                }
                const $li: JQuery = $(this);
                event.stopPropagation();
                if (typeof mixpanel !== "undefined") {
                    xcMixpanel.menuItemClick(event);
                }

                if (!$li.hasClass('unavailable') &&
                    $li.closest('input').length === 0 &&
                    $li.closest('.clickable').length === 0) {
                    // hide li if doesnt have an input field
                    xcMenu.close($allMenus);
                    clearTimeout(showTimeout);
                }
            });

            $subMenu.on({
                "mouseenter": function(event) {
                    if ($(this).closest('.dropDownList').length) {
                        return;
                    }
                    $subMenu.find('li').removeClass('selected');

                    const $li: JQuery = $(this);
                    const className: string = $li.parent().attr('class');
                    $parentMenu.find('.' + className).addClass('selected');
                    $li.addClass('selected');

                    if (!$li.hasClass('inputSelected')) {
                        $subMenu.find('.inputSelected').removeClass('inputSelected');
                    }
                    const hasSubMenu: boolean = $li.hasClass('parentMenu');

                    if (!hasSubMenu || $li.hasClass('unavailable')) {
                        if ($subSubMenu && !$subMenu.hasClass("subSubMenu")) {
                            if (event.keyTriggered) {
                                $subSubMenu.hide();
                            } else {
                                clearTimeout(hideTimeout);
                                hideTimeout = setTimeout(function() {
                                    $subSubMenu.hide();
                                }, 150);
                            }
                        }
                        return;
                    }
                    clearTimeout(hideTimeout);
                    const subMenuClass: string = $li.data('submenu');
                    if (event.keyTriggered) { // mouseenter triggered by keypress
                        showSubMenu($subSubMenu, $li, subMenuClass, subSubListScroller, options);
                    } else {
                        showTimeout = setTimeout(function() {
                            showSubMenu($subSubMenu, $li, subMenuClass, subSubListScroller, options);
                        }, 150);
                    }
                },
                "mouseleave": function() {
                    $subMenu.find('li').removeClass('selected');
                    const $li: JQuery = $(this);
                    $li.find('.dropDownList').removeClass("open")
                        .find('.list').hide();
                    // $li.removeClass('selected');
                    $('.tooltip').remove();
                }
            }, "li");

            $subMenu.on('contextmenu', function(e) {
                e.preventDefault();
            });
            return subListScroller;
        }
    };



    /**
     * xcMenu.show
     * make a menu visable
     * @param $menu - the menu element to show
     * @param callback - any function to run after the menu is closed
     */
    export function show($menu: JQuery, callback: Function) {
        xcMenu.removeKeyboardNavigation();
        $(document).off(".xcMenu");
        $(window).off(".xcMenu");
        $("#sqlTableArea .viewWrap").off(".xcMenu");
        if (closeCallback && typeof closeCallback === "function") {
            closeCallback();
            closeCallback = null;
        }

        closeCallback = callback;
        $menu.show();

        $(document).on("mousedown.xcMenu", function(event) {
            const $target: JQuery = $(event.target);
            gMouseEvents.setMouseDownTarget($target);
            const clickable: boolean = $target.closest('.menu').length > 0 ||
                            $target.closest('.clickable').length > 0 ||
                            $target.hasClass("highlightBox");
            if (!clickable && $target.closest('.dropdownBox').length === 0) {
                xcMenu.close($menu);
            }
        });

        $(window).on("blur.xcMenu", function() {
            xcMenu.close($menu);
        });

        let frameScrolling: boolean = false;
        let frameScrollTimer: NodeJS.Timer;
        $("#sqlTableArea .viewWrap").on("scroll.xcMenu", function() {
            if (!frameScrolling) {
                frameScrolling = true;
                xcMenu.close($menu);
            }

            clearTimeout(frameScrollTimer);
            frameScrollTimer = setTimeout(function() {
                frameScrolling = false;
            }, 300);
        });

        let winResizeTimer: NodeJS.Timer;
        let resizing: boolean = false;
        $(window).on("resize.xcMenu", function() {
            if (!resizing) {
                resizing = true;
                xcMenu.close($menu);
            }
            clearTimeout(winResizeTimer);
            winResizeTimer = setTimeout(function() {
                resizing = false;
            }, 300);
        });
    };

    /**
     * xcMenu.close
     * close/ hide a menu element and any sub menues
     * @param $menu - the menu object to hide
     */
    export function close($menu?: JQuery) {
        if (!$menu) {
            $(".menu").hide();
        } else {
            $menu.hide();
        }

        xcMenu.removeKeyboardNavigation();
        $(document).off(".xcMenu");
        $(window).off(".xcMenu");
        $("#sqlTableArea.viewWrap").off(".xcMenu");
        if (closeCallback && typeof closeCallback === "function") {
            closeCallback();
            closeCallback = null;
        }
    };

    /**
     * xcMenu.addKeyboardNavigation
     * adds keyboard navigation to an xcMenu and its submenues
     * @param $menu - the main menu to add navigation to
     * @param $subMenu -the submenues to add navigation to
     * @param options - option if the menu has the ability to be selected
     */
    export function addKeyboardNavigation($menu: JQuery, $subMenu: JQuery, options: xcMenu.Options = <xcMenu.Options>{}) {
        if (!options.allowSelection) {
            $('body').addClass('noSelection');
        }
        let $lis: JQuery = $menu.find('li:visible:not(.unavailable)');
        if ($menu.hasClass("hasSubList")) {
            $lis = $menu.find("li li:visible:not(.unavailable)");
        }
        const numLis: number = $lis.length;

        $(document).on('keydown.menuNavigation', listHighlight);
        const menuId: string = $menu.attr("id");
        if (menuId && hotKeyFns.has(menuId)) {
            $(document).on("keydown.menuHotKeys", function(event) {
                if (((isSystemMac && event.metaKey) ||
                    (!isSystemMac && event.ctrlKey)) && letterCode[event.which] !== "c")
                {
                    // allow ctrl+c to pass so it can trigger the "copy" menu item
                    return;
                }
                if ($("input:focus").length) {
                    return;
                }
                hotKeyFns.get(menuId)(event, $menu);
            });
        }

        function listHighlight(event: JQueryEventObject): void {
            let keyCodeNum: number = event.which;
            let direction: number;
            let lateral: boolean = false;
            let enter: boolean;

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
                        if ((<HTMLInputElement>$(event.target)[0]).selectionStart !== 0) {
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
                    let $menus = $menu.add($subMenu);
                    if (options.$subSubMenu) {
                        $menus = $menus.add(options.$subSubMenu);
                    }
                    xcMenu.close();
                    return;
                default:
                    return; // key not supported
            }

            if (!enter) {
                event.preventDefault();
            }

            let $highlightedLi: JQuery = $lis.filter(function() {
                return ($(this).hasClass('selected'));
            });

            let $highlightedSubLi: JQuery = $();
            let $subLis: JQuery;
            let numSubLis: number;
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
                } else if ($highlightedSubLi.length === 0 &&
                            $highlightedLi.length === 1) {
                    if (!$highlightedLi.hasClass('unavailable')) {
                        if ($highlightedLi.hasClass('parentMenu')) {
                            // if li has submenu, treat enter key as a
                            // right keypress
                            lateral = true;
                            keyCodeNum = keyCode.Right;
                        } else {
                            $highlightedLi.trigger(fakeEvent.mouseup);
                            return;
                        }
                    } else {
                        return;
                    }
                }
            }

            // if no visible lis, do not navigate up/down left/right
            if (!$lis.length) {
                return;
            }

            if (!lateral) { // up and down keys
                let index: number;
                let newIndex: number;
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
                    } else {
                        index = (direction === -1) ? (numSubLis - 1) : 0;
                        $highlightedSubLi = $subLis.eq(index);
                    }
                    $highlightedSubLi.addClass('selected');
                } else {
                    // navigate vertically through main menu
                    if ($highlightedLi.length) {// When a li is highlighted
                        index = $lis.index($highlightedLi);
                        $highlightedLi.removeClass('selected');
                        newIndex = (index + direction + numLis) % numLis;
                        $highlightedLi = $lis.eq(newIndex);
                    } else {
                        index = (direction === -1) ? (numLis - 1) : 0;
                        $highlightedLi = $lis.eq(index);
                    }
                    $highlightedLi.addClass('selected');

                    // adjust scroll position if newly highlighted li is not visible
                    const menuHeight: number = $menu.height();
                    const liTop: number = $highlightedLi.position().top;
                    const liHeight: number = 30;
                    let currentScrollTop: number;

                    if (liTop > menuHeight - liHeight) {
                        currentScrollTop = $menu.find('ul').scrollTop();
                        const newScrollTop: number = liTop - menuHeight + liHeight +
                                           currentScrollTop;
                        $menu.find('ul').scrollTop(newScrollTop);
                        if ($menu.hasClass('hovering')) {
                            $menu.addClass('disableMouseEnter');
                        }
                    } else if (liTop < 0) {
                        currentScrollTop = $menu.find('ul').scrollTop();
                        $menu.find('ul').scrollTop(currentScrollTop + liTop);
                        if ($menu.hasClass('hovering')) {
                            $menu.addClass('disableMouseEnter');
                        }
                    }
                }
            } else { // left or right key is pressed
                if (!$subMenu) { // if no submenu, do nothing
                    return;
                }
                if ($highlightedLi.length &&
                    $highlightedLi.hasClass('parentMenu')) {
                    let e: JQueryEventObject;
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
                            } else {
                                // close menus if sub menu li is already highlighted
                                xcMenu.close($menu.add($subMenu));
                            }
                        } else {
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
                    } else { // left key is pressed
                        if ($subMenu.is(':visible')) { // if submenu open, hide it
                            $subMenu.hide();
                        } else { // if no submenu is open, close all menus
                            xcMenu.close($menu);
                        }
                    }
                } else {
                    xcMenu.close($menu.add($subMenu));
                }
            }
        }
    };

    /**
     * xcMenu.removeKeyboardNavigation
     * remove the ability to navigate a menu by keyboard
     */
    export function removeKeyboardNavigation(): void {
        $(document).off('keydown.menuNavigation');
        $(document).off('keydown.menuHotKeys');
        $('body').removeClass('noSelection');
    };
}