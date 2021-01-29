window.VersionSelector = (function($, VersionSelector) {
    VersionSelector.setup = function() {
        $cartList = $("#versionSelectorList");
        new MenuHelper($cartList, {
            "onSelect": function($li) {
                $cartList.find(".text").val($li.text());
                showVersion($li.text());
                return false;
            },
            "container": "#contentBody",
            "bounds": "#contentBody"
        }).setupListeners();
        $("#versionSelectorList input").val("Version 2.1.0");
        $(".Version-2_1_0").show();
    };

    function showVersion(versionText) {
        var className = versionText.replaceAll("\\.", "_").replaceAll(" ", "-");
        $(".version").hide();
        $("." + className).show();
    }

    function MenuHelper($dropDownList, options) {
        options = options || {};
        this.options = options;

        this.$container = options.container ? $(options.container) :
                                              $dropDownList.parent();
        var $list;
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
        this.$subList = options.$subList;
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

        return this;
    }
    MenuHelper.counter = 0; // used to give each menu a unique id

    MenuHelper.prototype = {
        setupListeners: function() {
            var self = this;
            var options = self.options;
            var $dropDownList = self.$dropDownList;
            // toggle list section
            if (options.onlyClickIcon) {
                self.$iconWrapper = $dropDownList.find('.iconWrapper');
                $dropDownList.on("click", ".iconWrapper", function() {
                    self.toggleList($(this).closest(".dropDownList"),
                                    $(this).closest(".dropDownList").hasClass("openUpwards"));
                });
            } else {
                $dropDownList.addClass('yesclickable');

                $dropDownList.on("click", function(event) {
                    if ($(event.target).closest('.list').length) {
                        return;
                    }
                    if (self.exclude &&
                        $(event.target).closest(self.exclude).length) {
                        return;
                    }
                    self.toggleList($(this), $(this).hasClass("openUpwards"));
                });
            }
            // on click a list
            $dropDownList.on({
                "mouseup": function(event) {
                    if (event.which !== 1) {
                        return;
                    }
                    var $li = $(this);

                    // remove selected class from siblings and if able,
                    // add selected class to current li
                    var $lastSelected = $(this).siblings(".selected");
                    if (!$li.hasClass("hint") && !$li.hasClass("unavailable") &&
                        !$li.hasClass("inUse")) {
                        $lastSelected.removeClass("selected");
                        $li.addClass("selected");
                    }

                    var keepOpen = false;
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
                    $(this).addClass("hover");

                },
                "mouseleave": function() {
                    $(this).removeClass("hover");
                }
            }, ".list li");

            return this;
        },
        hideDropdowns: function() {
            var self = this;
            var $sections = self.$container;
            var $dropdown = $sections.hasClass("dropDownList")
                            ? $sections
                            : $sections.find(".dropDownList");
            $dropdown.find(".list").hide().removeClass("openList");
            $dropdown.removeClass("open");

            $(document).off("mousedown.closeDropDown" + self.id);
            $(document).off("keydown.closeDropDown" + self.id);
        },
        openList: function() {
            var self = this;
            var $list = self.$list;
            $list.addClass("openList").show();
            $list.closest(".dropDownList").addClass("open");
            self.showOrHideScrollers();
        },
        toggleList: function($curlDropDownList, openUpwards) {
            var self = this;
            var $list = self.$list;
            if ($curlDropDownList.hasClass("open")) {    // close dropdown
                self.hideDropdowns();
            } else {
                // hide all other dropdowns that are open on the page
                var $currentList;
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
                var $lists = $curlDropDownList.find(".list");
                if ($lists.children().length === 0) {
                    return;
                }
                $curlDropDownList.addClass("open");
                $lists.show().addClass("openList");

                if (openUpwards) {
                    // Count number of children and shift up by num * 30
                    var shift = $curlDropDownList.find("li").length * (-30);
                    $curlDropDownList.find(".list").css("top", shift);
                }

                $(document).on('mousedown.closeDropDown' + self.id, function(event) {
                    $target = $(event.target);
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
                }
                self.showOrHideScrollers();
                $('.selectedCell').removeClass('selectedCell');
            }
        },
        setupListScroller: function() {
            if (this.numScrollAreas === 0) {
                return;
            }
            var self = this;
            var $list = this.$list;
            var $ul = this.$ul;
            var $scrollAreas = this.$scrollAreas;
            var timer = this.timer;
            var isMouseMoving = false;
            var $subList = this.$subList;
            var outerHeight;
            var innerHeight;
            $list.mouseleave(function() {
                clearTimeout(timer.fadeIn);
                $scrollAreas.removeClass('active');
            });

            $list.mouseenter(function() {
                outerHeight = $list.height();
                innerHeight = $ul[0].scrollHeight;
                isMouseMoving = true;
                fadeIn();
            });

            $list.mousemove(function() {
                clearTimeout(timer.fadeOut);
                clearTimeout(timer.setMouseMoveFalse);
                isMouseMoving = true;

                timer.fadeIn = setTimeout(fadeIn, 200);

                timer.fadeOut = setTimeout(fadeOut, 800);

                timer.setMouseMoveFalse = setTimeout(setMouseMoveFalse, 100);
            });

            $scrollAreas.mouseenter(function() {
                self.isMouseInScroller = true;
                $(this).addClass('mouseover');

                if ($subList) {
                    $subList.hide();
                }
                var scrollUp = $(this).hasClass('top');
                scrollList(scrollUp);
            });

            $scrollAreas.mouseleave(function() {
                self.isMouseInScroller = false;
                clearTimeout(timer.scroll);

                var scrollUp = $(this).hasClass('top');

                if (scrollUp) {
                    $scrollAreas.eq(1).removeClass('stopped');
                } else {
                    $scrollAreas.eq(0).removeClass('stopped');
                }

                timer.hovering = setTimeout(hovering, 200);
            });

            $ul.scroll(function() {
                clearTimeout(timer.mouseScroll);
                timer.mouseScroll = setTimeout(mouseScroll, 300);
            });

            function fadeIn() {
                if (isMouseMoving) {
                    $scrollAreas.addClass('active');
                }
            }

            function fadeOut() {
                if (!isMouseMoving) {
                    clearTimeout(timer.fadeIn);
                    $scrollAreas.removeClass('active');
                }
            }

            function scrollList(scrollUp) {
                var top;
                var scrollTop = $ul.scrollTop();

                if (scrollUp) { // scroll upwards
                    if (scrollTop === 0) {
                        $scrollAreas.eq(0).addClass('stopped');
                        return;
                    }
                    timer.scroll = setTimeout(function() {
                        top = scrollTop - 7;
                        $ul.scrollTop(top);
                        scrollList(scrollUp);
                    }, 30);
                } else { // scroll downwards
                    if (outerHeight + scrollTop >= innerHeight) {
                        $scrollAreas.eq(1).addClass('stopped');
                        return;
                    }

                    timer.scroll = setTimeout(function() {
                        top = scrollTop + 7;
                        $ul.scrollTop(top);
                        scrollList(scrollUp);
                    }, 30);
                }
            }

            function mouseScroll() {
                var scrollTop = $ul.scrollTop();
                if (scrollTop === 0) {
                    $scrollAreas.eq(0).addClass('stopped');
                    $scrollAreas.eq(1).removeClass('stopped');
                } else if (outerHeight + scrollTop >= innerHeight) {
                    $scrollAreas.eq(0).removeClass('stopped');
                    $scrollAreas.eq(1).addClass('stopped');
                } else {
                    $scrollAreas.eq(0).removeClass('stopped');
                    $scrollAreas.eq(1).removeClass('stopped');
                }
            }

            function setMouseMoveFalse() {
                isMouseMoving = false;
            }

            function hovering() {
                if (!self.isMouseInScroller) {
                    $scrollAreas.removeClass('mouseover');
                }
            }
        },
        showOrHideScrollers: function($newUl) {
            if (this.numScrollAreas === 0) {
                return;
            }
            var $list = this.$list;
            var $bounds = this.$bounds;
            var bottomPadding = this.bottomPadding;
            if ($newUl) {
                this.$ul = $newUl;
            }
            var $ul = this.$ul;

            var offset = $bounds.offset();
            var offsetTop;
            if (offset) {
                offsetTop = offset.top;
            } else {
                offsetTop = 0;
            }

            var listHeight = offsetTop + $bounds.outerHeight() - $list.offset().top -
                             bottomPadding;
            listHeight = Math.min($(window).height() - $list.offset().top,
                                  listHeight);
            listHeight = Math.max(listHeight - 1, 40);
            $list.css('max-height', listHeight);
            $ul.css('max-height', listHeight).scrollTop(0);

            var ulHeight = $ul[0].scrollHeight - 1;

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
    };

    String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };

    return (VersionSelector);
}(jQuery, {}));

$(document).ready(function() {
    VersionSelector.setup();
});