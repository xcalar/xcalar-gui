interface MenuHelperOptions {
    $subMenu?: JQuery;
    bounds?: string;
    bottomPadding?: number;
    exclude?: boolean;
    container?: string;
    onlyClickIcon?: boolean;
    fixedPosition?: FixedPositionOption;
    beforeOpenAsync?: Function;
    onSelect?: Function;
    onOpen?: Function;
    onClose?: Function;
}
interface MenuHelperTimer {
    fadeIn: number,
    fadeOut: number,
    setMouseMoveFalse: number,
    hovering: number,
    scroll: number,
    mouseScroll: number
}

interface DropdownOptions {
    mouseCoors?: Coordinate;
    offsetX?: number;
    offsetY?: number;
    classes?: string;
    colNum?: number;
    rowNum?: number;
    isMultiCol?: boolean;
    multipleColNums?: number[],
    isUnSelect?: boolean;
    shiftKey?: boolean;
    floating?: boolean;
    callback?: Function;
    isDataTd?: boolean;
    toClose?: Function;
    toggle?: boolean;
    allowSelection?: boolean;
    prefix?: string;
    color?: string;
    tableId?: TableId;
}

interface FixedPositionOption {
    selector?: string, // selector of element to base positioning off of, relative to list
    $selector?: JQuery,
    rightMargin?: number,
    float?: boolean,
    containerSelector?: string
}

/*
* options include:
    onlyClickIcon: if set true, only toggle dropdown menu when click
                     dropdown icon, otherwise, toggle also on click
                     input section
    onSelect: callback to trigger when select an item on list, $li will
              be passed into the callback
    onOpen: callback to trigger when list opens/shows
    beforeOpenAsync: async callback to trigger when list opens/shows
    container: will hide all other list in the container when focus on
               this one. Default is $dropDownList.parent()
    bounds: restrain the dropdown list size to this element
    bottomPadding: integer for number of pixels of spacing between
                   bottom of list and $bounds,
    exclude: selector for an element to exclude from default click
             behavior
 *
    $menu needs to have the following structure for scrolling:
        <div class="menu/list">
            <ul></ul>
            <div class="scrollArea top">
              <i class="arrow icon xi-arrow-up"></i>
            </div>
            <div class="scrollArea bottom">
              <i class="arrow icon xi-arrow-down"></i>
            </div>
        </div>
    where the outer div has the same height as the ul

*/
class MenuHelper {
    public options: MenuHelperOptions;
    private $list: JQuery;
    private $dropDownList: JQuery;
    private $ul: JQuery;
    private $scrollAreas: JQuery;
    private numScrollAreas: number;
    private $subMenu: JQuery;
    private $bounds: JQuery;
    private bottomPadding: number;
    private exclude: boolean;
    private isMouseInScroller: boolean;
    private _hasSetup: boolean = false;
    private id: number;
    private $container: JQuery;
    private timer: MenuHelperTimer;
    private $iconWrapper: JQuery;
    private $scrollListeningEls: JQuery; // when dropdown is fixed positioned,
    // the dropdown's parents get scroll listeners attached which closes the
    // dropdown when scrolled

    public constructor($dropDownList: JQuery, options?: MenuHelperOptions) {
        options = options || {};
        this.options = options;

        this.$container = options.container ? $(options.container) :
                                            $dropDownList.parent();
        let $list: JQuery;
        if ($dropDownList.is('.list,.menu')) {
            $list = $dropDownList;
        } else {
            $list = $dropDownList.find('.list, .menu');
        }

        this.$list = $list;
        this.$dropDownList = $dropDownList;
        this.$ul = $list.children('ul');
        this.$scrollAreas = $list.find('.scrollArea');
        this.numScrollAreas = this.$scrollAreas.length;
        this.$subMenu = options.$subMenu;
        this.$bounds = options.bounds ? $(options.bounds) : $(window);
        this.bottomPadding = options.bottomPadding || 0;
        this.exclude = options.exclude ? options.exclude : false;
        this.isMouseInScroller = false;
        this.id = MenuHelper.counter;

        this.timer = {
            "fadeIn": null,
            "fadeOut": null,
            "setMouseMoveFalse": null,
            "hovering": null,
            "scroll": null,
            "mouseScroll": null
        };

        this.setupListScroller();
        MenuHelper.counter++;
    }

    public static counter = 0;// used to give each menu a unique id

    /**
     * MenuHelper.dropdownOpen
     * @param $dropdownIcon
     * @param $menu
     * @param options
     *  mouseCoors: {x: float, y: float},
     *  offsetX: float,
     *  offsetY: float,
     *  classes: string, ("class1 class2") to assign to $menu
     *  colNum: integer,
     *  isMultiCol: boolean,
     *  multipleColumns: [integers],
     *  isUnselect: boolean,
     *  shiftKey: boolean,
     *  floating: boolean (menu floats around and can pop up above user's mouse)
     *  callback: function,
     *  isDataTd: boolean, true if clicking on the json td,
     *  toClose: function, return true if want to close the menu
     *  toggle: boolean, if set true, will toggle open/close of menu,
     *  allowSelection: boolean, if true, will not clear any selected text
     *  prefix: string
     *  color: string
     */

    public static dropdownOpen(
        $dropdownIcon: JQuery,
        $menu: JQuery,
        options: DropdownOptions = <DropdownOptions>{}
    ): void {
        if (!($menu instanceof jQuery)) {
            console.error("Need to provide $menu");
            return;
        }

        const menuId: string = $menu.attr('id');
        let $allMenus: JQuery;
        let $subMenu: JQuery;
        let $subSubMenu: JQuery;

        if ($menu.data('submenu')) {
            $subMenu = $('#' + $menu.data('submenu'));
            $allMenus = $menu.add($subMenu);
            if ($subMenu.data('submenu')) {
                $subSubMenu = $('#' + $subMenu.data('submenu'));
                $allMenus = $allMenus.add($subSubMenu);
            }
        } else {
            $allMenus = $menu;
        }

        let tableId: TableId;
        if (menuId === "tableMenu" ||
            menuId === "colMenu" ||
            menuId === "cellMenu"
        ) {
            if (menuId === "tableMenu" && options.tableId) {
                tableId = options.tableId;
            } else {
                tableId = TblManager.parseTableId($dropdownIcon.closest(".xcTableWrap"));
            }
        }

        $('.menu .selected').removeClass('selected');
        $(".leftColMenu").removeClass("leftColMenu");
        xcTooltip.hideAll();
        xcMenu.removeKeyboardNavigation();
        $menu.removeData("rowNum");

        if (typeof options.callback === "function") {
            options.callback();
        }

        // custom options for each $menu type
        // adds classes, decides whether to close the menu and return;
        const menuHelperRes: string = MenuHelper.menuHelper($dropdownIcon, $menu, $subMenu,
                                                menuId, tableId, options);

        if (menuHelperRes === "closeMenu") {
            xcMenu.close($allMenus);
            return;
        }

        xcMenu.close();

        // case that should open the menu (note that colNum = 0 may make it false!)
        if (options.colNum != null && options.colNum > -1) {
            $menu.data("colNum", options.colNum);
            $menu.data("tableId", tableId);
        } else {
            $menu.removeData("colNum");
            $menu.removeData("tableId");
        }
        if (menuId === "tableMenu") {
            $menu.data("tableId", tableId);
        }

        if (options.rowNum != null && options.rowNum > -1) {
            $menu.data("rowNum", options.rowNum);
        }

        let classes: string = options.classes;
        if (classes != null) {
            const showingHotKeys: boolean = $menu.hasClass("showingHotKeys");
            const className: string = classes.replace("header", "");
            $menu.attr("class", "menu " + className);
            if ($subMenu) {
                $subMenu.attr("class", "menu subMenu " + className);
                if ($subSubMenu) {
                    $subSubMenu.attr("class", "menu subSubMenu " + className);
                }
            }
            if (showingHotKeys) {
                $menu.addClass("showingHotKeys");
            }
        }

        // adjust menu height and position it properly
        MenuHelper.positionAndShowMenu(menuId, $menu, $dropdownIcon, options);
        xcMenu.addKeyboardNavigation($menu, $subMenu, {
            allowSelection: options.allowSelection,
            $subSubMenu: $subSubMenu
        });
    }

    public setupListeners(): MenuHelper {
        if (this._hasSetup) return;
        this._hasSetup = true;
        const self: MenuHelper = this;
        const options: MenuHelperOptions = self.options;
        const $dropDownList: JQuery = self.$dropDownList;
        // toggle list section
        if (options.onlyClickIcon) {
            self.$iconWrapper = $dropDownList.find('.iconWrapper');
            $dropDownList.on("click", ".iconWrapper", function() {
                const $list: JQuery = $(this).closest(".dropDownList");
                if (!$list.hasClass("open") && self.options.beforeOpenAsync) {
                    self.options.beforeOpenAsync()
                    .then(function() {
                        self.toggleList($list, $list.hasClass("openUpwards"));
                    });
                } else {
                    self.toggleList($list, $list.hasClass("openUpwards"));
                }
            });
        } else {
            $dropDownList.on("click", function(event) {
                const $list: JQuery = $(this);
                if ($(event.target).closest('.list').length) {
                    return;
                }
                if (self.exclude &&
                    $(event.target).closest(self.exclude).length) {
                    return;
                }
                if (!$list.hasClass("open") && self.options.beforeOpenAsync) {
                    self.options.beforeOpenAsync()
                    .then(function() {
                        self.toggleList($list, $list.hasClass("openUpwards"));
                    });
                } else {
                    self.toggleList($list, $list.hasClass("openUpwards"));
                }
            });
        }
        // on click a list
        $dropDownList.on({
            "mouseup": function(event) {
                if (event.which !== 1) {
                    return;
                }
                const $li: JQuery = $(this);

                // remove selected class from siblings and if able,
                // add selected class to current li
                const $lastSelected: JQuery = $(this).siblings(".selected");
                if (!$li.hasClass("hint") && !$li.hasClass("unavailable") &&
                    !$li.hasClass("inUse")) {
                    $lastSelected.removeClass("selected");
                    $li.addClass("selected");
                }

                let keepOpen: boolean = false;
                if (options.onSelect) {    // trigger callback
                    // keepOpen be true, false or undefined
                    keepOpen = options.onSelect($li, $lastSelected, event);
                }
                // keep Open may return weird tings, so check for true boolean
                if (!keepOpen) {
                    self.hideDropdowns();
                }
            },
            "mouseenter": function() {
                $(this).siblings().removeClass("hover highlighted");
                $(this).addClass("hover");
            },
            "mouseleave": function() {
                $(this).removeClass("hover highlighted");
            }
        }, ".list:not(.hasSubList) li, .list.hasSubList li li");

        return this;
    }

    public hideDropdowns(): void {
        const self: MenuHelper = this;
        const $sections: JQuery = self.$container;
        const $dropdown: JQuery = $sections.hasClass("dropDownList")
                        ? $sections
                        : $sections.find(".dropDownList");
        $dropdown.find(".list").hide().removeClass("openList");
        $dropdown.removeClass("open");

        $(document).off("mousedown.closeDropDown" + self.id);
        $(document).off("keydown.closeDropDown" + self.id);
        $(document).off('keydown.listNavigation' + self.id);
        if (this.$scrollListeningEls) {
            this.$scrollListeningEls.off("scroll.dropdownScrollListening" + self.id);
            this.$scrollListeningEls = null;
            $(window).off("resize.dropdownWinResize" + self.id);
        }
        if (self.options.onClose) {
            self.options.onClose();
        }
    }

    public openList(): void {
        const self: MenuHelper = this;
        const $list: JQuery = self.$list;
        $list.addClass("openList").show();
        $list.closest(".dropDownList").addClass("open");
        self.showOrHideScrollers();
    }

    public toggleList($curlDropDownList: JQuery, openUpwards?: boolean, filterFn?: Function): void {
        const self: MenuHelper = this;
        const $list: JQuery = self.$list;
        if ($curlDropDownList.hasClass("open")) {    // close dropdown
            self.hideDropdowns();
        } else {
            // hide all other dropdowns that are open on the page
            let $currentList: JQuery;
            if ($list.length === 1) {
                $currentList = $list;
            } else {
                // this is triggered when $list contains more that one .list
                // such as the xcHelper.dropdownlist in mulitiCastModal.js
                $currentList = $curlDropDownList.find(".list");
            }

            if (!$list.parents('.list, .menu').length) {
                $('.list, .menu').not($currentList)
                                .hide()
                                .removeClass('openList')
                                .parent('.dropDownList')
                                .removeClass('open');
            }

            // open dropdown
            const $lists: JQuery = $curlDropDownList.find(".list");
            if ($lists.children().length === 0) {
                return;
            }
            $curlDropDownList.addClass("open");
            $lists.show().addClass("openList");

            if (openUpwards) {
                // Count number of children and shift up by num * 30
                const shift: number = $curlDropDownList.find("li").length * (-30);
                $curlDropDownList.find(".list").css("top", shift);
            }

            $(document).on('mousedown.closeDropDown' + self.id, function(event) {
                const $target = $(event.target);
                if (self.options.onlyClickIcon) {
                    // do not trigger close if clicking on icon dropdown
                    if ($target.closest('.iconWrapper').is(self.$iconWrapper)) {
                        return;
                    }
                    // do close if not clicking on the list, such as the input
                    if (!$target.closest('.list').length) {
                        self.hideDropdowns();
                        return;
                    }
                }

                // close if not clicking anywhere on the dropdownlist
                if (!$target.closest('.dropDownList').is(self.$dropDownList)) {
                    self.hideDropdowns();
                }
            });

            $(document).on("keydown.closeDropDown" + self.id, function(event) {
                if (event.which === keyCode.Tab ||
                    event.which === keyCode.Escape) {
                    self.hideDropdowns();
                }
            });

            if (typeof self.options.onOpen === "function") {
                self.options.onOpen($curlDropDownList);
                if (filterFn) {
                    filterFn();
                }
            }
            if (self.options.fixedPosition) {
                let $baseElement;
                if (self.options.fixedPosition.$selector) {
                    $baseElement = self.options.fixedPosition.$selector;
                } else {
                    $baseElement = self.$dropDownList.find(self.options.fixedPosition.selector);
                }

                self.$list.hide(); // open list can cause incorrect parentPos
                // due to scroll bar showing
                if ($baseElement[0] == null) {
                    console.error("error case");
                    return;
                }
                const parentPos: ClientRect = $baseElement[0].getBoundingClientRect();
                self.$list.show();
                if (self.options.fixedPosition.float) {
                    let left: number;
                    let width = $lists.outerWidth();
                    left = Math.min(parentPos.left, $(window).width() - width - 4);
                    self.$list.css({
                        "position": "fixed",
                        "left": left,
                        "top": parentPos.top + parentPos.height
                    });
                } else {
                    self.$list.css({
                        "position": "fixed",
                        "left": parentPos.left,
                        "top": parentPos.top + parentPos.height,
                        "width": parentPos.width - (self.options.fixedPosition.rightMargin || 0)
                    });
                }

                const $scrollListeningEls = self.$dropDownList.parentsUntil(self.$container.parent());
                self.$scrollListeningEls = $scrollListeningEls;
                $scrollListeningEls.on("scroll.dropdownScrollListening" + self.id, () => {
                    self.hideDropdowns();
                });
                $(window).on("resize.dropdownWinResize" + self.id, () => {
                    self.hideDropdowns();
                });
            }
            self.showOrHideScrollers();

            $('.selectedCell').removeClass('selectedCell');
            self._addKeyboardNavigation($lists);
            $list.filter(":not(.hasSubList)").find('li:visible:not(.unavailable)').eq(0).addClass("hover");
            $list.find('li li:visible:not(.unavailable)').eq(0).addClass("hover");
        }
        xcTooltip.hideAll();
    }

    private _addKeyboardNavigation($menu: JQuery) {
        var self = this;
        const $lis: JQuery = $menu.find('li:visible:not(.unavailable)');
        if (!$lis.length) {
            return;
        }
        var $ul = $menu.find("ul");
        if (!$ul.length) {
            return;
        }

        const liHeight = $lis.eq(0).outerHeight();
        const ulHeight: number = $ul.height();
        const ulScrollHeight: number = $ul[0].scrollHeight;
        if (ulScrollHeight <= ulHeight) {
            return;
        }
        $(document).on('keydown.listNavigation' + self.id, listNavigation);

        function listNavigation(event: JQueryEventObject): void {
            let keyCodeNum: number = event.which;
            let scrollTop: number = $ul.scrollTop();
            if ($(event.target).is("input")) {
                return;
            }
            if (keyCodeNum === keyCode.Up) {
                if (scrollTop > 0) {
                    $ul.scrollTop(scrollTop - liHeight);
                    event.preventDefault();
                    event.stopPropagation();
                }
            } else if (keyCodeNum === keyCode.Down) {
                if (scrollTop + ulHeight < ulScrollHeight) {
                    $ul.scrollTop(scrollTop + liHeight);
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }
    };

    public setupListScroller(): void {
        if (this.numScrollAreas === 0) {
            return;
        }
        const self: MenuHelper = this;
        const $list: JQuery = self.$list;
        const $ul: JQuery = this.$ul;
        const $scrollAreas: JQuery = this.$scrollAreas;
        const timer: MenuHelperTimer = this.timer;
        let isMouseMoving: boolean = false;
        const $subMenu: JQuery = this.$subMenu;
        let outerHeight: number;
        let innerHeight: number;
        $list.mouseleave(function() {
            clearTimeout(timer.fadeIn);
            $scrollAreas.removeClass('active');
        });

        $list.mouseenter(function() {
            outerHeight = $list.height();
            innerHeight = getListToScroll()[0].scrollHeight;
            isMouseMoving = true;
            fadeIn();
        });

        $list.mousemove(function() {
            clearTimeout(timer.fadeOut);
            clearTimeout(timer.setMouseMoveFalse);
            isMouseMoving = true;

            timer.fadeIn = window.setTimeout(fadeIn, 200);

            timer.fadeOut = window.setTimeout(fadeOut, 800);

            timer.setMouseMoveFalse = window.setTimeout(setMouseMoveFalse, 100);
        });

        $scrollAreas.mouseenter(function() {
            self.isMouseInScroller = true;
            $(this).addClass('mouseover');

            if ($subMenu) {
                $subMenu.hide();
            }
            const scrollUp: boolean = $(this).hasClass('top');
            scrollList(scrollUp);
        });

        $scrollAreas.mouseleave(function() {
            self.isMouseInScroller = false;
            clearTimeout(timer.scroll);

            const scrollUp: boolean = $(this).hasClass('top');

            if (scrollUp) {
                $scrollAreas.eq(1).removeClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
            }

            timer.hovering = window.setTimeout(hovering, 200);
        });

        $ul.scroll(function() {
            clearTimeout(timer.mouseScroll);
            timer.mouseScroll = window.setTimeout(mouseScroll, 300);
        });

        function fadeIn(): void {
            if (isMouseMoving) {
                $scrollAreas.addClass('active');
            }
        }

        function fadeOut(): void {
            if (!isMouseMoving) {
                clearTimeout(timer.fadeIn);
                $scrollAreas.removeClass('active');
            }
        }

        function getListToScroll(): JQuery {
            if ($ul.length > 1) {
                // if the menu list includes severl uls, need a filter
                const $visibleUl = $ul.filter((_index, el) => $(el).is(":visible"));
                if ($visibleUl.length > 1) {
                    console.warn("more than 1 list to scroll");
                }
                return $visibleUl;
            } else {
                return $ul;
            }
        }

        function scrollList(scrollUp: boolean): void {
            let top: number;
            const $visibleUl = getListToScroll();
            const scrollTop: number = $visibleUl.scrollTop();

            if (scrollUp) { // scroll upwards
                if (scrollTop === 0) {
                    $scrollAreas.eq(0).addClass('stopped');
                    return;
                }
                timer.scroll = window.setTimeout(function() {
                    top = scrollTop - 7;
                    $visibleUl.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            } else { // scroll downwards
                if (outerHeight + scrollTop >= innerHeight) {
                    $scrollAreas.eq(1).addClass('stopped');
                    return;
                }

                timer.scroll = window.setTimeout(function() {
                    top = scrollTop + 7;
                    $visibleUl.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            }
        }

        function mouseScroll(): void {
            const $visibleUl = getListToScroll();
            const scrollTop: number = $visibleUl.scrollTop();
            if (scrollTop === 0) {
                $scrollAreas.eq(0).addClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            } else if (outerHeight + scrollTop >= (innerHeight - 1)) {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).addClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            }
        }

        function setMouseMoveFalse(): void {
            isMouseMoving = false;
        }

        function hovering(): void {
            if (!self.isMouseInScroller) {
                $scrollAreas.removeClass('mouseover');
            }
        }
    }

    public showOrHideScrollers($newUl?: JQuery): void {
        if (this.numScrollAreas === 0) {
            return;
        }
        const $list: JQuery = this.$list;
        const $bounds: JQuery = this.$bounds;
        const bottomPadding: number = this.bottomPadding;
        if ($newUl) {
            this.$ul = $newUl;
        }
        const $ul: JQuery = this.$ul;

        const offset: JQueryCoordinates = $bounds.offset();
        let offsetTop: number;
        if (offset) {
            offsetTop = offset.top;
        } else {
            offsetTop = 0;
        }

        let listHeight: number = offsetTop + $bounds.outerHeight() -
                                 $list.offset().top - bottomPadding;
        listHeight = Math.min($(window).height() - $list.offset().top,
                              listHeight);
        listHeight = Math.max(listHeight - 1, 40);
        $list.css('max-height', listHeight);
        $ul.css('max-height', listHeight).scrollTop(0);

       const ulHeight: number = $ul[0].scrollHeight - 1;

        if (ulHeight > $list.height()) {
            $ul.css('max-height', listHeight);
            $list.find('.scrollArea').show();
            $list.find('.scrollArea.bottom').addClass('active');
        } else {
            $ul.css('max-height', 'auto');
            $list.find('.scrollArea').hide();
        }
        // set scrollArea states
        $list.find('.scrollArea.top').addClass('stopped');
        $list.find('.scrollArea.bottom').removeClass('stopped');
    }

        /**
     * custom options for each $menu type
     * adds classes, decides whether to close the menu and return;
     * @param $dropdownIcon
     * @param $menu
     * @param $subMenu
     * @param menuId
     * @param tableId
     * @param options
     */
    private static menuHelper(
        $dropdownIcon: JQuery,
        $menu: JQuery,
        $subMenu: JQuery,
        menuId: string,
        tableId: TableId,
        options: DropdownOptions
    ): string {
        const toClose: Function = options.toClose;
        if (typeof toClose === 'function' && options.toClose() === true) {
            return "closeMenu";
        }

        if (options.toggle && $menu.is(":visible")) {
            return "closeMenu";
        }
        let open: boolean;
        switch (menuId) {
            case ('tableMenu'):
                // case that should close table menu
                if ($menu.is(":visible") && $menu.data('tableId') === tableId) {
                    return "closeMenu";
                }
                MenuHelper.updateTableDropdown($menu);
                TblManager.unHighlightCells();
                break;
            case ('colMenu'):
                // case that should close column menu
                if ($menu.is(":visible") &&
                    $menu.data("colNum") === options.colNum &&
                    $menu.data('tableId') === tableId &&
                    !$menu.hasClass('tdMenu')
                ) {
                    return "closeMenu";
                }
                open = MenuHelper.updateColDropdown($subMenu, tableId, options);
                if (!open) {
                    return "closeMenu";
                }
                if (options.multipleColNums) {
                    $menu.data('columns', options.multipleColNums);
                    $menu.data('colNums', options.multipleColNums);
                } else {
                    $menu.data('colNums', [options.colNum]);
                }
                $subMenu.find('.sort').removeClass('unavailable');
                TblManager.unHighlightCells();
                break;
            case ('cellMenu'):
                // case that should close column menu
                if (options.isUnSelect && !options.shiftKey) {
                    return "closeMenu";
                }
                open = MenuHelper.updateTdDropdown($dropdownIcon, $menu, tableId, options);
                if (!open) {
                    return "closeMenu";
                }
                break;
            default:
                TblManager.unHighlightCells();
                break;
        }
        return "";
    }

   /**
    *
    * @param menuId
    * @param $menu
    * @param $dropdownIcon
    * @param options
    *   mouseCoors: {x: float, y: float},
    *   offsetX: float,
    *   offsetY: float,
    *   floating: boolean (menu floats around and can pop up above user's mouse)
    */
    private static positionAndShowMenu(
       menuId: string,
       $menu: JQuery,
       $dropdownIcon: JQuery,
       options: DropdownOptions
    ): void {
        const winHeight: number = $(window).height();
        const bottomMargin: number = 5;
        let topMargin: number;
        if (menuId === "cellMenu") {
            topMargin = 15;
        } else if (menuId === "colMenu") {
            topMargin = -4;
        } else {
            topMargin = 0;
        }

        const leftMargin: number = 5;
        let left: number;
        let top: number;
        if (options.mouseCoors) {
            left = options.mouseCoors.x;
            top = options.mouseCoors.y + topMargin;
        } else {
            left = $dropdownIcon[0].getBoundingClientRect().left + leftMargin;
            top = $dropdownIcon[0].getBoundingClientRect().bottom + topMargin;
        }

        if (options.offsetX) {
            left += options.offsetX;
        }
        if (options.offsetY) {
            top += options.offsetY;
        }

        let menuHeight: number = winHeight - top - bottomMargin;
        $menu.css('max-height', 'none'); // set to none so we can measure full height
        $menu.children('ul').css('max-height', 'none');
        $menu.css({"top": top, "left": left});
        $menu.show();
        const fullMenuHeight = $menu.height();
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);
        $menu.children('ul').scrollTop(0);

        showOrHideArrows();

        // positioning if dropdown is on the right side of screen
        const rightBoundary: number = $(window).width() - 5;
        if ($menu[0].getBoundingClientRect().right > rightBoundary) {
            $menu.css("left", 0); // move all the way left so we get correct width
            left = rightBoundary - $menu.width();
            $menu.css('left', left).addClass('leftColMenu');
        }

        //positioning if td menu is below the screen and floating option is allowed
        // if full length menu dips below window
        if (options.floating && (top + fullMenuHeight + 5 > winHeight)) {
            let offset: number = 15;
            if (menuId === "cellMenu") {
                offset = 20;
            }
            const newMenuHeight = top - offset - 5;
            if (newMenuHeight < menuHeight) {
                // if moving the menu to be above the dropdown icon
                // results in a shorter menu, then ignore and return
                return;
            }
            menuHeight = newMenuHeight;
            top -= (fullMenuHeight + offset);
            if (top < 5) {
                top = 5;
                $menu.css('max-height', menuHeight);
                $menu.children('ul').css('max-height', menuHeight);
                showOrHideArrows();
            } else {
                $menu.css('max-height', 'none');
                $menu.children('ul').css('max-height', 'none');
                $menu.find('.scrollArea.bottom').addClass('stopped');
            }
            $menu.css('top', top);
        }

        function showOrHideArrows() {
              // size menu and ul
            const $ul: JQuery = $menu.find('ul');
            if ($ul.length > 0) {
                const ulHeight: number = $menu.find('ul')[0].scrollHeight;
                if (ulHeight > menuHeight) {
                    $menu.find('.scrollArea').show();
                    $menu.find('.scrollArea.bottom').addClass('active');
                } else {
                    $menu.children('ul').css('max-height', 'none');
                    $menu.find('.scrollArea').hide();
                }
            }
            // set scrollArea states
            $menu.find('.scrollArea.top').addClass('stopped');
            $menu.find('.scrollArea.bottom').removeClass('stopped');
        }
    }

    private static updateTdDropdown(
        $div: JQuery,
        $menu: JQuery,
        tableId: TableId,
        options: DropdownOptions
    ): boolean {
        // If the tdDropdown is on a non-filterable value, we need to make the
        // filter options unavailable
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("error case, td dropdown cannot find table");
            return false;
        }
        const tableCol: ProgCol = table.tableCols[options.colNum - 1];
        const columnType: string = tableCol.type;
        // allow fnfs but not array elements, multi-type, or anything but
        // valid types
        let notAllowed: boolean = ($div.find('.blank').length > 0);
        let cellCount: number = 0;
        let isMultiCell: boolean = false;
        const cells: TableCell[] = [];
        for (let row in table.highlightedCells) {
            for (let col in table.highlightedCells[row]) {
                cellCount++;
                if (cellCount > 1) {
                    isMultiCell = true;
                }
                let cell: TableCell = table.highlightedCells[row][col];
                cells.push(cell);
                if (cell.isBlank) {
                    notAllowed = true;
                }
            }
        }
        let tabId = DagTable.Instance.getBindTabId();
        let tab;
        if (tabId) {
            tab = DagTabManager.Instance.getTabById(tabId);
        }
        const filterTypes: string[] = [ColumnType.string, ColumnType.float,
                ColumnType.integer, ColumnType.boolean, ColumnType.timestamp,
                ColumnType.money, ColumnType.mixed];
        const node: DagNode = DagTable.Instance.getBindNode();
        let noFilterReason: string = null;
        if (!noFilterReason && FormHelper.activeForm) {
            noFilterReason = "Cannot filter or exclude when form is open.";
        }
        if (!noFilterReason && (node != null && node.getMaxChildren() === 0)) {
            noFilterReason = "Cannot filter or exclude values on terminal nodes.";
        }
        if (!noFilterReason && tab instanceof DagTabProgress) {
            noFilterReason = "Table is view only.";
        }
        if (!noFilterReason && options.isMultiCol) {
            noFilterReason = "Cannot filter or exclude values on multiple columns.";
        }
        if (!noFilterReason && filterTypes.indexOf(columnType) === -1) {
            noFilterReason = "Can only filter or exclude values on column with the following types: " + filterTypes.join(", ") + ".";
        }
        if (!noFilterReason && MenuHelper.isInvalidMixed(columnType, cells)) {
            noFilterReason = "Cannot filter or exclude values of mixed types.";
        }
        const shouldNotFilter: boolean = noFilterReason != null;
        const $tdFilter: JQuery = $menu.find(".tdFilter");
        const $tdExclude: JQuery = $menu.find(".tdExclude");

        if (tableCol && tableCol.isDATACol()) {
            $tdFilter.addClass("xc-hidden");
            $tdExclude.addClass("xc-hidden");
        } else {
            $tdFilter.removeClass("xc-hidden");
            $tdExclude.removeClass("xc-hidden");
        }

        if (shouldNotFilter || notAllowed) {
            $tdFilter.addClass("unavailable");
            $tdExclude.addClass("unavailable");
            if (noFilterReason) {
                xcTooltip.add($tdFilter.add($tdExclude), {title: noFilterReason});
            }
        } else {
            $tdFilter.removeClass("unavailable");
            $tdExclude.removeClass("unavailable");
            xcTooltip.remove($tdFilter.add($tdExclude));
        }

        $tdFilter.removeClass("multiCell preFormatted");
        $tdExclude.removeClass("multiCell preFormatted");

        if (isMultiCell) {
            $tdFilter.addClass("multiCell");
            $tdExclude.addClass("multiCell");
        }

        if (!options.isMultiCol &&
            (tableCol.getFormat() !== ColFormat.Default)
        ) {
            $tdFilter.addClass("preFormatted");
            $tdExclude.addClass("preFormatted");
            // when it's only on one column and column is formatted
            options.classes += " long";
        }

        MenuHelper.toggleUnnestandJsonOptions($menu, $div, columnType, isMultiCell,
                                    notAllowed, options, tableId);
        return true;
    }

    private static updateTableDropdown($menu: JQuery): void {
        $menu.find('li').removeClass('unavailable');
    }

    private static updateColDropdown(
        $subMenu: JQuery,
        tableId: TableId,
        options: DropdownOptions
    ): boolean {
        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("error case, col dropdown cannot find table");
            return false;
        }
        const progCol: ProgCol = table.getCol(options.colNum);
        const $lis: JQuery = $subMenu.find(".typeList");
        $lis.removeClass("unavailable");
        xcTooltip.remove($lis);

        const isKnownType: boolean = progCol.isKnownType();
        if (isKnownType && !options.multipleColNums) {
            $subMenu.find(".changeDataType").addClass("isKnownType");
        } else {
            $subMenu.find(".changeDataType").removeClass("isKnownType");
        }
        return true;
    }


    /**
     * used for deciding if cell can be filtered
     * returns true if cell is mixed and not an object or array
     * assumes cells from only 1 column are highlighted
     * @param columnType
     * @param cells
     */
    private static isInvalidMixed(columnType: string, cells: TableCell[]) {
        const filterTypes: string[] = ["string", "float", "integer", "boolean", "timestamp", "money",
                                        "undefined", "mixed"];
        const notAllowedCombTypes: string[] = ["string", "float", "integer", "boolean", "timestamp", "money"];
        let invalidFound: boolean = false;
        let typeFound: string;
        for (let i = 0; i < cells.length; i++) {
            let cell: TableCell = cells[i];
            let type: string;
            if (cell.isMixed) {
                type = cell.type;
            } else if (cell.isUndefined) {
                type = "undefined";
            } else if (cell.isNull) {
                type = "null";
            } else if (cell.isBlank) {
                type = "blank";
            } else {
                type = columnType;
            }

            if (filterTypes.indexOf(type) === -1) {
                invalidFound = true;
                break;
            }

            if (!typeFound) {
                typeFound = type;
            } else if (type !== typeFound) {
                // cannot filter more than 1 type
                // XXX we won't need to do this check
                // (disallow filtering mixed cell types) once GUI-7071 is fixed
                if (notAllowedCombTypes.indexOf(type) !== -1 &&
                    notAllowedCombTypes.indexOf(typeFound) !== -1) {
                        invalidFound = true;
                        break;
                    }
            }
        }

        return invalidFound;
    }

    private static toggleUnnestandJsonOptions(
        $menu: JQuery,
        $div: JQuery,
        columnType: string,
        isMultiCell: boolean,
        notAllowed: boolean,
        options: DropdownOptions,
        tableId: TableId
    ): void {
        if (!$div.hasClass('originalData')) {
            $div = $div.siblings('.originalData');
        }
        const $unnestLi: JQuery = $menu.find('.tdUnnest');
        const $jsonModalLi: JQuery = $menu.find('.tdJsonModal');
        $unnestLi.addClass('hidden'); // pull all
        $jsonModalLi.addClass('hidden'); // examine

        let isMixedObj: boolean = false;
        let isTruncated: boolean = false;
        if (isMultiCell) {
            $menu.data('istruncatedtext', false);
            return;
        }

        if ((columnType === "object" || columnType === "array") &&
            !notAllowed
        ) {
            if ($div.text().trim() !== "" && !$div.find('.undefined').length) {
                // when  only one cell is selected
                $jsonModalLi.removeClass("hidden");
                $unnestLi.removeClass("hidden");
            }
        } else {
            if ($div.parent().hasClass('truncated')) {
                isTruncated = true;
                $jsonModalLi.removeClass("hidden");
            }

            if (columnType === "mixed" && !notAllowed) {
                const text: string = $div.text().trim();
                if (text !== "" && !$div.find('.undefined').length) {
                    // when only one cell is selected
                    let mixedVal: object;
                    try {
                        mixedVal = JSON.parse(text);
                    } catch (err) {
                        mixedVal = null;
                    }
                    if (mixedVal && typeof mixedVal === ColumnType.object) {
                        $jsonModalLi.removeClass("hidden");
                        $unnestLi.removeClass("hidden");
                        isMixedObj = true;
                    }
                }
            }
        }
        MenuHelper.checkIfAlreadyUnnested($unnestLi, tableId, options);
        if (isTruncated && !isMixedObj) {
            $menu.data('istruncatedtext', true);
        } else {
            $menu.data('istruncatedtext', false);
        }
    }

        /**
     * for tds
     * @param
     * @param tableId
     * @param options
     */
    private static checkIfAlreadyUnnested(
        $unnestLi: JQuery,
        tableId: TableId,
        options: DropdownOptions
    ): void {
        if ($unnestLi.hasClass("hidden")) {
            return;
        }
        const rowNum: number = options.rowNum;
        const colNum: number = options.colNum;


        const $table : JQuery= $('#xcTable-' + tableId);
        const $jsonTd: JQuery = $table.find('.row' + rowNum).find('td.col' + colNum);

        const table: TableMeta = gTables[tableId];
        if (table == null) {
            console.error("error case, unnested dropdown cannot find table");
            return;
        }
        const progCol: ProgCol = table.getCol(colNum);
        const isArray: boolean = (progCol.getType() === ColumnType.array);
        let openSymbol: string = "";
        let closingSymbol: string = "";
        const unnestColName: string = progCol.getBackColName();

        // only escaping if column names not passed into parseUnnestTd
        function checkColExists(colName: string) {
            var escapedColName = xcHelper.escapeColName(colName);
            escapedColName = unnestColName + openSymbol +
                            escapedColName + closingSymbol;
            return table.hasColWithBackName(escapedColName, false);
        }

        if (isArray) {
            openSymbol = "[";
            closingSymbol = "]";
        } else {
            openSymbol = ".";
        }

        const jsonTd: object = MenuHelper.parseRowJSON($jsonTd.find('.originalData').text());
        let notExists: boolean = false;
        for (let tdKey in jsonTd) {
            if (!checkColExists(tdKey)) {
                notExists = true;
                break;
            }
        }
        if (notExists) {
            xcTooltip.changeText($unnestLi, "", true);
            $unnestLi.removeClass("unavailable");
        } else {
            xcTooltip.changeText($unnestLi, "all columns pulled", false);
            $unnestLi.addClass("unavailable");
        }
    }

    private static parseRowJSON(jsonStr: string): object {
        let value: object;
        try {
            value = JSON.parse(jsonStr);
        } catch (err) {
            value = {};
        }

        return value;
    }

    // export let __testOnly__: any = {};

    // if (typeof window !== 'undefined' && window['unitTestMode']) {
    //     __testOnly__.toggleUnnestandJsonOptions = toggleUnnestandJsonOptions;
    //     __testOnly__.isInvalidMixed = isInvalidMixed;
    // }
}