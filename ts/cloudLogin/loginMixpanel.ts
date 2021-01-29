declare var MIXPANEL_CUSTOM_LIB_URL: string;
namespace loginMixpanel {
    let events = {
        "click": true,
        "input": true,
        "blur": false,
        "focus": false,
        "XDCrash": true,
        "statusBox": true,
        "pageLoad": true,
        "pageUnload": true,
        "keyNavigation": true
    };

    let lastBlur;
    let currTime = Date.now();
    let $currForm = $("#formArea");
    let pageLoadTime = currTime;
    let lastFormTime = currTime;
    let _off = false; // XXXX TODO: change it to false to turn it on
    let userIsSet = false;
    let distinct_id;
    let token = "8aacff34abdb40473e04235cdb0d33af";

    export function setup() {
        var c = document;
        var a = window.mixpanel || [];
        if (_off) {
            return;
        }
        if (!a.__SV) {
            var b: any = window;
            try {
                var d, m, j, k = b.location,
                    f = k.hash;
                d = function(a, b) {
                    return (m = a.match(RegExp(b + "=([^&]*)"))) ? m[1] : null
                };
                f && d(f, "state") && (j = JSON.parse(decodeURIComponent(d(f, "state"))), "mpeditor" === j.action && (b.sessionStorage.setItem("_mpcehash", f), history.replaceState(j.desiredHash || "", c.title, k.pathname + k.search)))
            } catch (n) {}
            var l, h;
            window.mixpanel = a;
            a._i = [];
            a.init = function(b, d, g) {
                function c(b, i) {
                    var a = i.split(".");
                    2 == a.length && (b = b[a[0]], i = a[1]);
                    b[i] = function() {
                        b.push([i].concat(Array.prototype.slice.call(arguments,
                            0)))
                    }
                }
                var e = a;
                "undefined" !== typeof g ? e = a[g] = [] : g = "mixpanel";
                e.people = e.people || [];
                e.toString = function(b) {
                    var a = "mixpanel";
                    "mixpanel" !== g && (a += "." + g);
                    b || (a += " (stub)");
                    return a
                };
                e.people.toString = function() {
                    return e.toString(1) + ".people (stub)"
                };
                l = "disable time_event track track_pageview track_links track_forms track_with_groups add_group set_group remove_group register register_once alias unregister identify name_tag set_config reset opt_in_tracking opt_out_tracking has_opted_in_tracking has_opted_out_tracking clear_opt_in_out_tracking people.set people.set_once people.unset people.increment people.append people.union people.track_charge people.clear_charges people.delete_user people.remove".split(" ");
                for (h = 0; h < l.length; h++) c(e, l[h]);
                var f = "set set_once union unset remove delete".split(" ");
                e.get_group = function() {
                    function a(c) {
                        b[c] = function() {
                            var call2_args = arguments;
                            var call2 = [c].concat(Array.prototype.slice.call(call2_args, 0));
                            e.push([d, call2])
                        }
                    }
                    for (var b = {}, d = ["get_group"].concat(Array.prototype.slice.call(arguments, 0)), c = 0; c < f.length; c++) a(f[c]);
                    return b
                };
                a._i.push([b, d, g])
            };
            a.__SV = 1.2;
            b = c.createElement("script");
            b.type = "text/javascript";
            b.async = !0;
            b.src = "undefined" !== typeof MIXPANEL_CUSTOM_LIB_URL ?
                MIXPANEL_CUSTOM_LIB_URL : "file:" === c.location.protocol && "//cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js".match(/^\/\//) ? "https://cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js" : "//cdn4.mxpnl.com/libs/mixpanel-2-latest.min.js";
            d = c.getElementsByTagName("script")[0];
            d.parentNode.insertBefore(b, d);

            init();
            addListeners();
            pageLoadEvent();
        }
    };

    export function off() {
        _off = true;
    };

    export function isOff() {
        if (_off) {
            return true;
        } else if (window.location.href.includes("localhost")) {
            return true;
        } else {
            return false;
        }
    };

    export function init() {
        if (isOff()) {
            return;
        }

        window.mixpanel.init(token, {
            loaded: function(mixpanel) {
                distinct_id = mixpanel.get_distinct_id();
            }
        });
    };
    export function addListeners() {
        let entries = Object.entries(events);
        for (const [event, toInclude] of entries) {
            if (toInclude && eventMap[event]) {
                eventMap[event]();
            }
        }
    };

    export function setUsername (userName) {
        if (isOff() || userIsSet) {
            return;
        }
        userIsSet = true;
        mixpanel.identify(userName);
        mixpanel.people.set({
            "$last_name": userName
        });
        track("Username Set", {
            "userName": userName
        });
    }

    export function errorEvent(type, info) {
        const prevMouseDownInfo = gMouseEvents.getLastMouseDownTargetsSerialized();
        let eventInfo = {
            "lastMouseDownEl": prevMouseDownInfo.el,
            "lastMouseDownTime": prevMouseDownInfo.time,
            "lastMouseDownParents": prevMouseDownInfo.parents,
            "prevMouseDowns": prevMouseDownInfo.prevMouseDowns,
            "eventType": "error"
        };
        switch (type) {
            case ("XDCrash"):
                if (!events.XDCrash) {
                    return;
                }
                let mixPanelStack = [...info.stack];
                mixPanelStack.shift();

                track("XDCrash", {
                    ...eventInfo,
                    "error": info.msg,
                    "url": info.url,
                    "line": info.line,
                    "column": info.column,
                    "stack": mixPanelStack
                });
                break;
            case ("consoleError"):
                let errorArray = info.map(el => {
                    if (el instanceof Error) {
                        return el.toString();
                    } else if (typeof el === "object") {
                        return JSON.stringify(el);
                    } else {
                        return el;
                    }
                });
                track("ConsoleError", {
                    "error": errorArray
                });
                break;
            default:
                break;
        }
    };

    export function pageLoadEvent() {
        if (isOff()) {
            return;
        }
        if (!events.pageLoad) {
            return;
        }
        try {
            let currTime = Date.now();
            pageLoadTime = lastFormTime = currTime;

            track("User Enter", {
                "eventType": "pageLoad"
            });
        } catch (e) {
            console.info("pageLoadEvent error", e);
        }
    };

    export function login(username) {
        if (isOff()) {
            return;
        }
        track("Login", {
            "username": username,
            "eventType": "login"
        })
    }

    const clickListener = () => {
        $(document).mouseup(function(event) {
            if (!event.hasOwnProperty("originalEvent")) {
                return;
            }
            const $target = $(event.target);
            if ($target.closest("li").length && $target.closest("ul")) {
                menuItemClick(event);
            } else if ($target.closest(".btn").length || $target.closest("button").length ||
                    isButton($target) || $target.closest("a").length) {
                buttonClick(event);
            } else {
                otherClick(event);
            }
            setTimeout(() => {
                let timeInLastForm = Math.round((Date.now() - lastFormTime) / 1000);
                lastFormTime = Date.now();
                let lastFormId = $currForm.attr("id");
                let $form = $(".authForm:visible");
                let currFormId = $form.attr("id");
                if (lastFormId !== currFormId) {
                    $currForm = $form;
                    track("Form Switch", {
                        "timeInLastForm": timeInLastForm,
                        "lastForm": lastFormId,
                        "eventType": "click"
                    });
                }
            }, 1);
        });

        return;

        // This is to catch click events triggered by code
        $(document).click(function(event) {
            if (!event.hasOwnProperty("originalEvent")) {
                track("AutoClick", {
                    "eventType": "click"
                }, event);
            }
        });
    };

    const inputListener = () => {
        $(document).on("change", "input", function(event) {
            if ($(this).attr("type") === "password") {
                return;
            }
            track("Input Change", {
                "Content": $(this).val(),
                "eventType": "input"
            }, event);
        });
    };

    const blurListener = () => {
        $(window).blur(function() {
            let currTime = Date.now();
            var time = Math.round((currTime - lastBlur)/1000);
            lastBlur = Date.now();
            track("Window Blur", {
                "Time": time,
                "eventType": "windowBlur"
            });
        });
    };

    const focusListener = () => {
        $(window).focus(function() {
            var currTime = Date.now();
            var time = Math.round((currTime - lastBlur)/1000);
            lastBlur = Date.now();
            track("Window Focus", {
                "Time": time,
                "eventType": "windowFocus"
            });
        });
    };

    const keyNavigationListener = () => {
        let keys = new Set([keyCode.Up, keyCode.Down, keyCode.Left,
                            keyCode.Right, keyCode.Enter])
        $(document).keyup(function(event) {
            if (keys.has(event.which)) {
                let $selectedEl = $(".selected:visible").eq(0);
                let selectedEl = "";
                let selectedText = "";
                if ($selectedEl.length) {
                    selectedEl = getElementPath($selectedEl[0]);
                    selectedText = $selectedEl.text();
                }
                track("Keyboard Navigation", {
                    "key": keyCode[event.which],
                    "selectedElement": selectedEl,
                    "selectedText": selectedText,
                    "eventType": "keyboard"
                });
            }
        });
    };

    function getPathStr($ele) {
        var path = $ele.prop("tagName");
        if ($ele.attr("id")) {
            path += "#" + $ele.attr("id");
        }
        if ($ele.attr("class")) {
            let className = $ele.attr("class").split(" ").join(".");
            path += "." + className;
        }
        return path;
    };

    function getElementPath(element) {
        try {
            var path = getPathStr($(element));
            var parents = $(element).parentsUntil("body");
            for (var i = 0; (i < parents.length) && (path.length <= 255); i++) {
                path += " | ";
                path += getPathStr($(parents).eq(i));
            }
            return path;
        } catch (err) {
            // Do not affect our use with XD
            return "Error case: " + err;
        }
    }

    function getElementPathArray(element) {
        let pathArray = [];
        try {
            pathArray.push(getPathStr($(element)));
            $(element).parentsUntil("body").each(function(){
                pathArray.push(getPathStr($(this)));
            });
        } catch (err) {
            // Do not affect our use with XD
            return ["Error case: " + err];
        }
        return pathArray;
    }

    function buttonClick(event) {
        const $target = $(event.target);
        let $btn = $target.closest(".btn");
        if (!$btn.length) {
            $btn = $target.closest("button");
        }
        if (!$btn.length) {
            $btn = $target;
        }
        let $modal = $btn.closest(".modalContainer");
        let btnName;
        if ($btn.attr("id")) {
            btnName = $btn.attr("id");
        } else if ($modal.length) {
            btnName = $btn.text() + " - " + $modal.attr("id");
            if ($modal.attr("id") === "alertModal" || $modal.attr("id") === "messageModal") {
                let $header = $modal.find(".modalHeader");
                if (!$header.length) {
                    $header = $modal.find(".header").eq(0);
                }
                btnName += " " + $.trim($header.text());
            }
        } else {
            btnName = $btn.text() + " - " + $btn.closest("[id]").attr("id");
        }
        const eventProperties = {
            "text": $btn.text(),
            "eventType": "click"
        };

        track("Btn - " + btnName, eventProperties, event);
    }

    export function menuItemClick(event) {
        const $target = $(event.target);
        let $li = $target.closest("li");
        let $dropDownList = $li.closest(".dropDownList");
        let $menu = $li.closest(".menu");
        let listName = "";
        let mixpanelId = $dropDownList.data("mixpanel-id") || $menu.data("mixpanel-id");

        if (mixpanelId) {
            listName = "List Click - " + mixpanelId;
        } else if ($dropDownList.length || $menu.length) {
            listName = "List Click - " + $li.closest("[id]").attr("id");
        } else {
            listName = $li.closest("[id]").attr("id") + " - item click";
        }
        const eventProperties = {
            "text": $li.text(),
            "eventType": "click"
        };
        track(listName, eventProperties, event);
    }

    function isButton($el) {
        var parents = $el.parentsUntil("body").andSelf();
        for (var i = 0; i < parents.length; i++) {
            let $ele = $(parents[i]);
            let name = "";
            if ($ele.attr("id")) {
                name += $ele.attr("id");
            }
            if ($ele.attr("class")) {
                let className = $ele.attr("class").split(" ")
                name += " " + className;
            }
            if (name.includes("btn") || name.includes("Btn") || name.includes("button") ||
                name.includes("Button")) {
                    return true;
            }
        }
        return false;
    }

    function otherClick(event) {
        let $el = $(event.target);
        let text = $el.text();
        if (!text) {
            let parents = $el.parentsUntil("#loginContainer");
            text = parents.eq(0).text().slice(0, 255);
        }

        const eventProperties = {
            "eventType": "click",
            "text": text
        };
        let eventName = "Other Click";
        if ($el.closest("#homeBtn").length) {
            eventName = "Btn- xdIcon";
        } else if ($el.closest("input").length) {
            eventName = "Input Click";
        }

        track(eventName, eventProperties, event);
    }

    export function endSession() {
        if (isOff()) {
            return;
        }
        let currTime = Date.now();
        let timeInLastForm = Math.round((currTime - lastFormTime) / 1000);

        let data = {
          event: 'User Leave',
          properties: {
            token: token,
            distinct_id: distinct_id,
            "duration":  Math.round((currTime - pageLoadTime) / 1000),
            "timeInLastForm": timeInLastForm,
            "lastForm": $currForm.attr("id"),
            "eventType": "pageUnload",
            ...mixpanel._.info.properties(),
            ...mixpanel['persistence'].properties()
          }
        };
        let newdata = btoa(JSON.stringify(data));
        navigator.sendBeacon('https://api.mixpanel.com/track/?data=' + newdata);
    }

    export function track(eventName: string, eventProperties, jqueryEvent?: JQueryEventObject) {
        if (isOff()) {
            return;
        }
        eventProperties = eventProperties || {};
        let baseProperties = {
            "timeStamp": Date.now(),
            "windowHeight": $(window).height(),
            "windowWidth": $(window).width(),
            "currentForm": $currForm.attr("id"),
            "xdURL": window.location.host
        };

        // special properties for click events
        if ((eventProperties.eventType === "click" ||
            eventProperties.eventType === "input") && jqueryEvent) {
            let $el = $(jqueryEvent.target);

            let clickProperties = {
                "el": getPathStr($el),
                "element": getElementPath(jqueryEvent.target),
                "elementPath": getElementPathArray(jqueryEvent.target),
                "triggeredByUser": jqueryEvent.hasOwnProperty("originalEvent"),
                "x": jqueryEvent.clientX,
                "y": jqueryEvent.clientY,
                "closestID": $el.closest("[id]").attr("id")
            };
            baseProperties = {...baseProperties, ...clickProperties};
        }
        let properties = {...baseProperties, ...eventProperties};
        if (eventName === "Other Click") {
            if (!properties.triggeredByUser && !properties.el) {
                return;
            }
        }
        mixpanel.track(eventName, properties);
    }

    const eventMap = {
        "click": clickListener,
        "input": inputListener,
        "blur": blurListener,
        "focus": focusListener,
        "keyNavigation": keyNavigationListener
    };
}

gMouseEvents = new MouseEvents();

window.onerror = function(
    msg: string|Event,
    url: string,
    line: number,
    column: number,
    error: Error
): void {
   let stack: string[] = null;
    if (error && error.stack) {
        stack = error.stack.split("\n");
    }

    if (!window["debugOn"] && stack &&
        !(isBrowserIE && (msg === "Unspecified error." ||
            (stack[1] && stack[1].indexOf("__BROWSERTOOLS") > -1)))) {

        loginMixpanel.errorEvent("XDCrash", {
            msg: msg,
            url: url,
            line: line,
            column: column,
            stack: stack
        });
    }
};

window.onunload = loginMixpanel.endSession;

const xcConsoleError = (function () {
    Error.prototype.write = function (args) {
        var suffix = {
            "@": (this.lineNumber
                ? this.fileName + ':' + this.lineNumber + ":1"
                : extractLineNumberFromStack(this.stack)
            )
        };

        args = args.concat([suffix]);
        loginMixpanel.errorEvent("consoleError", args);
        console.error.apply(console, args);
    };
    var extractLineNumberFromStack = function (stack) {
        if(!stack) return '?';
        var line = stack.split('\n')[2];
        // fix for various display text
        line = (line.indexOf(' (') >= 0
            ? line.split(' (')[1].substring(0, line.length - 1)
            : line.split('at ')[1]
            );
        return line;
    };

    return function (..._params) {
        Error().write(Array.prototype.slice.call(arguments, 0));
    };
})();
