interface InputDropdownHintOptions {
    menuHelper?: MenuHelper,
    preventClearOnBlur?: boolean,
    onEnter?: Function,
    order?: boolean,
    noBold?: boolean,
    isColumnsList?: boolean,
    getInput?: Function
}
// options:
// menuHelper: (required) instance of MenuHelper
// preventClearOnBlur: boolean, if true will not reset the input on blur
// order: boolean, if true will place "starts with" matches first
// noBold: boolean, if true will not have bold text for searching
class InputDropdownHint {
    private options: InputDropdownHintOptions;
    private $dropdown: JQuery;

    public constructor($dropdown: JQuery, options?: InputDropdownHintOptions) {
        this.$dropdown = $dropdown;
        this.options = options || {};
        this.__init();
    }

    private __init(): void {
        const self: InputDropdownHint = this;
        const $dropdown: JQuery = self.$dropdown;
        const options: InputDropdownHintOptions = self.options;
        const menuHelper: MenuHelper = options.menuHelper;

        menuHelper.setupListeners();

        const $input: JQuery = $dropdown.find("> input");
        const $lists: JQuery = $dropdown.find("> .list");
        // this is to prevent the trigger of blur on mousedown of li
        $lists.on("mousedown", "li", function(e) {
            if ($(e.target).is("li input, li .icon, li[name='addNew']")) {
                gMouseEvents.setMouseDownTarget($(e.target));
                return;
            }
            return false;
        });

        $dropdown.on("click", ".iconWrapper", function() {
            // when it's going to open
            if (!$dropdown.hasClass("open")) {
                $input.focus();
            }
        });

        $input.on("input", function() {
            if (!$input.is(":visible")) return; // ENG-8642
            let text: string = $input.val().trim();
            if (options.getInput) {
                text = options.getInput();
            } else if (options.isColumnsList && text.startsWith(gColPrefix)) {
                text = text.slice(1);
            }
            if (!$dropdown.hasClass("open")) {
                let filter;
                if (menuHelper.options.onOpen) {
                    filter = self.__filterInput.bind(self, text);
                } else {
                    self.__filterInput(text);
                }
                // show the list
                menuHelper.toggleList($dropdown, false, filter);
            } else {
                self.__filterInput(text);
            }
        });

        $input.on("blur", function() {
            if (gMouseEvents.getLastMouseDownTarget().is("li input, li .icon, li[name='addNew']")) {
                return;
            }
            const text: string = $input.val().trim();
            const oldVal: string = $input.data("val");
            if (!options.preventClearOnBlur && oldVal !== text) {
                $input.val(oldVal);
            }
            // reset
            self.__filterInput();
            // when the dropdown is closed
            if ($dropdown.hasClass("open")) {
                // close it
                menuHelper.toggleList($dropdown);
            }
        });

        $input.on("keydown", function(event) {
            if (event.which === keyCode.Enter || event.which === keyCode.Tab) {
                let val: string = $input.val().trim();
                if (typeof options.onEnter === "function") {
                    if (($lists.find("li.highlighted").length &&
                    !$lists.find("li.highlighted").hasClass('createNew')) ||
                    ($lists.find("li.hover").length &&
                    !$lists.find("li.hover").hasClass('createNew'))) {
                        val = $lists.find("li.highlighted").eq(0).text();
                        if (val === "") {
                            val = $lists.find("li.hover").eq(0).text();
                        }
                    }
                    const stopEvent: string = options.onEnter(val, $input);
                    if (stopEvent) {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
                menuHelper.hideDropdowns();
            } else if (event.which === keyCode.Up ||
                       event.which === keyCode.Down) {
                $lists.find("li.hover").removeClass("hover");
                xcUIHelper.listHighlight($input, event, options.isColumnsList);
            }
        });
    }

    private __filterInput(searchKey?: string): void {
        const $dropdown: JQuery = this.$dropdown;
        let hasSubList = $dropdown.hasClass("hasSubList");
        $dropdown.find(".noResultHint").remove();

        let $lis: JQuery;
        let subLis  = [];
        if (hasSubList) {
            $lis = $dropdown.find(".list > ul > li");
            $lis.each(function() {
                let $li = $(this);
                subLis.push($li.find("li"));
            });
        } else {
            $lis = $dropdown.find("li");
        }
        const $list: JQuery = $lis.parent();
        if (!searchKey) {
            $lis.removeClass("xc-hidden");
            $lis.find("li").removeClass("xc-hidden");
            if (this.options.order) {
                if (hasSubList) {
                    $lis.each(function(i) {;
                        subLis[i].each(function() {
                            let $li = $(this);
                            let html = $li.html().replace('<strong>','').replace('</strong>','');
                            $li.html(html);
                        });
                        subLis[i] = subLis[i].sort(xcUIHelper.sortHTML);
                        subLis[i].prependTo($(this).find("ul"));
                    });
                } else {
                    $lis.each(function() {
                        let $li = $(this);
                        let html = $li.html().replace('<strong>','').replace('</strong>','');
                        $li.html(html);
                    });
                    $lis = $lis.sort(xcUIHelper.sortHTML);
                    $lis.prependTo($list);
                }

            }
            $list.scrollTop(0);

            if (hasSubList) {
                $list.find("li li").removeClass("highlighted hover");
                $list.find("li li").eq(0).addClass("highlighted");
            } else {
                $list.find("li").removeClass("highlighted hover");
                $list.find("li").eq(0).addClass("highlighted");
            }
            this.options.menuHelper.showOrHideScrollers();
            return;
        }

        searchKey = searchKey.toLowerCase();

        let count: number = 0;
        const noBold = this.options.noBold;
        if (hasSubList) {
            $lis.each(function(i) {
                let subCount = 0;
                subLis[i].each(function() {
                    let $li: JQuery = $(this);
                    if (!noBold) {
                        xcUIHelper.boldSuggestedText($li, searchKey);
                    }
                    if ($li.text().toLowerCase().includes(searchKey) && !$li.hasClass("createNew")) {
                        $li.removeClass("xc-hidden");
                        count++;
                        subCount++;
                    } else {
                        $li.addClass("xc-hidden");
                    }
                });
                if (!subCount) {
                    $(this).addClass("xc-hidden");
                } else {
                    $(this).removeClass("xc-hidden");
                }
            });
        } else {
            $lis.each(function() {
                let $li: JQuery = $(this);
                if (!noBold) {
                    xcUIHelper.boldSuggestedText($li, searchKey);
                }
                if ($li.text().toLowerCase().includes(searchKey) && !$li.hasClass("createNew")) {
                    $li.removeClass("xc-hidden");
                    count++;
                } else {
                    $li.addClass("xc-hidden");
                }
            });
        }


        // put the li that starts with value at first,
        // in asc order
        if (this.options.order) {
            if (hasSubList) {
                $lis.each(function(i){
                    let $subLis = subLis[i].filter(function() {
                        return !$(this).hasClass("xc-hidden");
                    });
                    for (let i = $subLis.length - 1; i >= 0; i--) {
                        const $li: JQuery = $subLis.eq(i);
                        if ($li.text().toLowerCase().startsWith(searchKey)) {
                            $(this).find("ul").prepend($li);
                        }
                    }
                });
            } else {
                $lis = $lis.filter(function() {
                    return !$(this).hasClass("xc-hidden");
                });
                for (let i = $lis.length - 1; i >= 0; i--) {
                    const $li: JQuery = $lis.eq(i);
                    if ($li.text().toLowerCase().startsWith(searchKey)) {
                        $list.prepend($li);
                    }
                }
            }
        }

        if (count === 0) {
            const li: HTML = '<li class="hint noResultHint" ' +
                     'style="pointer-events:none">' +
                        CommonTxtTstr.NoResult +
                    '</li>';
            $dropdown.find("ul").append(li);
        }

        $list.scrollTop(0);

        if (hasSubList) {
            $list.find("li li").removeClass("highlighted hover");
            $list.find("li li").eq(0).addClass("highlighted");
        } else {
            $list.find("li").removeClass("highlighted hover");
            $list.find("li").eq(0).addClass("highlighted");
        }
        this.options.menuHelper.showOrHideScrollers();
    }

    public setInput(val: string): void {
        const $input: JQuery = this.$dropdown.find("> input");
        $input.val(val).data("val", val);
    }

    public clearInput(): void {
        const $input: JQuery = this.$dropdown.find("> input");
        $input.val("").removeData("val");
    }
}
