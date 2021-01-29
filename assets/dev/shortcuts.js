$(document).ready(function() {
    $("<link/>", {
       rel: "stylesheet",
       type: "text/css",
       href: "assets/dev/shortCutStyles.css"
    }).appendTo("head");

    if (xcLocalStorage.getItem("shortcuts") != null) {
        if (window.location.pathname.indexOf('login.html') > -1) {
            Shortcuts.login();
        } else {
            if (xcLocalStorage.getItem("autoLogin") != null) {
                Shortcuts.createWorkbook();
            }

            var count = 0;
            var interval = setInterval(function() {
                // initial load screen leaving signifies start up is done
                if ($("#initialLoadScreen:visible").length === 0) {
                    Shortcuts.setup(true);
                    clearInterval(interval);
                } else if (count > 20) {
                    clearInterval(interval);
                    console.info('timed out: short cuts not added');
                }
                count++;
            }, 1000);
        }
    }
});

window.Shortcuts = (function($, Shortcuts) {
    function hashFnv32a(str, asString, seed) {
        /*jshint bitwise:false */
        var i, l,
            hval = (seed === undefined) ? 0x811c9dc5 : seed;

        for (i = 0, l = str.length; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) +
                    (hval << 24);
        }
        if (asString) {
            // Convert to 8 digit hex string
            return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
        }
        return hval >>> 0;
    }

    function isAdmin() {
        return xcSessionStorage.getItem("xcalar-admin") === "true";
    }

    function setAdmin() {
        xcSessionStorage.setItem("xcalar-admin", "true");
    }

    function clearAdmin() {
        xcSessionStorage.removeItem("xcalar-admin");
    }

    var shortcutsOn = false;
    var autoLogin = true;

    Shortcuts.on = function(name, pass) {
        if (shortcutsOn) {
            return false;
        }
        xcLocalStorage.setItem("shortcuts", "true");
        if (!name) {
            name = "user";
        }
        xcLocalStorage.setItem("shortcutName", name || "");
        xcLocalStorage.setItem("xcPass", pass || "");
        xcLocalStorage.setItem("autoLogin", "true");
        Shortcuts.setup();
    };

    Shortcuts.off = function() {
        xcLocalStorage.removeItem("shortcuts");
        xcLocalStorage.removeItem("shortcutName");
        xcLocalStorage.removeItem("xcPass");
        xcLocalStorage.removeItem("autoLogin");
        Shortcuts.remove();
        shortcutsOn = false;
    };

    Shortcuts.toggleAutoLogin = function(turnOn) {
        if (turnOn) {
            xcLocalStorage.setItem("autoLogin", "true");
            autoLogin = true;
        } else {
            xcLocalStorage.removeItem("autoLogin");
            autoLogin = false;
        }
        toggleAutoLoginMenu(turnOn);
    };

    Shortcuts.toggleSplash = function(turnOn) {
        if (turnOn) {
            xcLocalStorage.setItem("noSplashLogin", false);
        } else {
            xcLocalStorage.setItem("noSplashLogin", true);
        }
        toggleMenu(".splash", turnOn);
    };

    Shortcuts.toggleVerbose = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.verboseOff').show();
            $('#shortcutSubMenu').find('.verboseOn').hide();
            xcLocalStorage.setItem("verbose", "true");
            verbose = true;
        } else {
            $('#shortcutSubMenu').find('.verboseOff').hide();
            $('#shortcutSubMenu').find('.verboseOn').show();
            xcLocalStorage.removeItem("verbose");
            verbose = false;
        }
    };

    Shortcuts.toggleThriftTimeChecker = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.thriftCheckOff').show();
            $('#shortcutSubMenu').find('.thriftCheckOn').hide();
            xcLocalStorage.setItem("thriftCheck", "true");
            gThriftTimeCheck = true;
        } else {
            $('#shortcutSubMenu').find('.thriftCheckOff').hide();
            $('#shortcutSubMenu').find('.thriftCheckOn').show();
            xcLocalStorage.removeItem("thriftCheck");
            gThriftTimeCheck = false;
        }
    };

    Shortcuts.toggleDebug = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.debugOff').show();
            $('#shortcutSubMenu').find('.debugOn').hide();
            xcLocalStorage.setItem("debugOn", "true");
            window.debugOn = true;
        } else {
            $('#shortcutSubMenu').find('.debugOff').hide();
            $('#shortcutSubMenu').find('.debugOn').show();
            xcLocalStorage.removeItem("debugOn");
            window.debugOn = false;
        }
    };

    Shortcuts.toggleAdmin = function(turnOn) {
        if (turnOn) {
            $('#shortcutSubMenu').find('.adminOff').show();
            $('#shortcutSubMenu').find('.adminOn').hide();
            if (xcSessionStorage.getItem("usingAs") !== "true") {
                $('#container').addClass('admin');
            }

            $('#shortcutMenuIcon').css('margin-right', 20);
            setAdmin();
        } else {
            $('#shortcutSubMenu').find('.adminOff').hide();
            $('#shortcutSubMenu').find('.adminOn').show();
            $('#shortcutMenuIcon').css('margin-right', 0);
            clearAdmin();
        }
    };

    Shortcuts.setup = function(fullSetup) {
        var turnOnSplash;
        shortcutsOn = true;

        if (xcLocalStorage.getItem("autoLogin") === "true") {
            autoLogin = true;
        } else {
            autoLogin = false;
        }

        if (xcLocalStorage.getItem("debugOn") === "true") {
            window.debugOn = true;
        } else {
            window.debugOn = false;
        }

        if (xcLocalStorage.getItem("verbose") === "true") {
            verbose = true;
        } else {
            verbose = false;
        }

        if (xcLocalStorage.getItem("thriftCheck") === "true") {
            gThriftTimeCheck = true;
        } else {
            gThriftTimeCheck = false;
        }

        if (xcLocalStorage.getItem("noSplashLogin") === "true") {
            turnOnSplash = false;
        } else {
            turnOnSplash = true;
        }

        if (fullSetup) {
            dsForm();
            createMainMenu();
        }

        Shortcuts.toggleVerbose(verbose);
        Shortcuts.toggleThriftTimeChecker(gThriftTimeCheck);
        Shortcuts.toggleAdmin(isAdmin());
        Shortcuts.toggleDebug(window.debugOn);
        Shortcuts.toggleSplash(turnOnSplash);
    };

    Shortcuts.remove = function () {
        $('#shortcutMenuIcon').remove();
        $('#shortcutMenu').remove();
        $('#shortcutSubMenu').remove();
        var $filePath = $("#filePath");
        $filePath.off('keyup.shortcut');
    };

    Shortcuts.login = function() {
        if (xcLocalStorage.getItem("autoLogin") != null) {
            var num = Math.ceil(Math.random() * 1000);
            var name = xcLocalStorage.getItem("shortcutName") + num;
            var xcPass = xcLocalStorage.getItem("xcPass");
            $('#loginNameBox').val(name);
            $('#loginPasswordBox').val(xcPass);
            if (xcPass) {
                $('#loginButton').click();
            }
        }
    };

    Shortcuts.createWorkbook = function() {
        var deferred = PromiseHelper.deferred();
        var count = 0;
        var wbInterval = setInterval(function() {
            if ($('#workbookPanel').is(':visible')) {
                var num = Math.ceil(Math.random() * 1000);
                var wbName = "New Workbook_" + num;
                WorkbookPanel.createNewWorkbook(wbName);
                clearInterval(wbInterval);

                activeWorkbook(wbName)
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                count++;
                if (count > 10) {
                    clearInterval(wbInterval);
                    deferred.reject();
                }
            }
        }, 300);

        return deferred.promise();
    };

    function activeWorkbook(wbName) {
        var deferred = PromiseHelper.deferred();
        var count = 0;
        var wbInterval = setInterval(function() {
            var $wkbkBox = $('.workbookBox[data-workbook-id*="' + wbName + '"]');
            if ($wkbkBox.length > 0) {
                clearInterval(wbInterval);
                $wkbkBox.find('.activate').click();
                deferred.resolve(wbName);
            } else {
                count++;
                if (count > 10) {
                    clearInterval(wbInterval);
                    deferred.reject();
                }
            }
        }, 300);

        return deferred.promise();
    }

        // to add file names to the menu edit this object
    var filePathMap = {
        'YelpUsers': 'netstore/datasets/yelp/user',
        'Schedule': 'netstore/datasets/indexJoin/schedule',
        'Test Yelp': 'netstore/datasets/unittest/test_yelp.json'
    };

    function dsForm() {
        var $filePath = $("#filePath");
        var $fileName = $("#fileName");
        var filePath = "";
        $filePath.on('keyup.shortcut', function() {
            var val = $(this).val();
            var file = null;
            var filePathGiven = false;
            if (val.length === 2) {
                filePathGiven = false;
                switch (val) {
                    case ("za"):
                        file = "yelpUsers";
                        filePath = "yelp/user/yelp_academic_dataset_user_fixed.json";
                        break;
                    case ("zb"):
                        file = "yelpReviews";
                        filePath = "yelp/reviews/yelp_academic_dataset_review_fixed.json";
                        break;
                    case ("zc"):
                        file = "gdelt";
                        filePath = "gdelt/";
                        break;
                    case ("zd"):
                        file = "sp500";
                        filePath = "sp500.csv";
                        break;
                    case ("ze"):
                        file = "classes";
                        filePath = "indexJoin/classes/classes.json";
                        break;
                    case ("zf"):
                        file = "schedule";
                        filePath = "indexJoin/schedule/schedule.json";
                        break;
                    case ("zg"):
                        file = "students";
                        filePath = "indexJoin/students/students.json";
                        break;
                    case ("zh"):
                        file = "teachers";
                        filePath = "indexJoin/teachers/teachers.json";
                        break;
                    default:
                        break;
                }

            } else {
                filePathGiven = true;
                switch (val) {
                    case ("unit"):
                        file = "unittest";
                        filePath = "netstore/datasets/unittest/" +
                                    "test_yelp.json";
                        break;
                    case ("net"):
                        file = "netstore";
                        filePath = "netstore/datasets/";
                        break;
                    case ("edge"):
                        file = "edgeCase";
                        filePath = "netstore/datasets/edgeCases/";
                        break;
                    case ("exp"):
                        file = "export";
                        filePath = "var/opt/xcalar/export/";
                        break;
                    case ("thousand"):
                        file = "thousand";
                        filePath = "netstore/datasets/edgeCases/manyFiles/tenThousand";
                        break;
                    case ("parse"):
                        file = "parse";
                        filePath = "netstore/datasets/dsParser/Sample_JSON_-_Pretty.json";
                        break;
                    default:
                        break;
                }
            }

            if (file) {
                var $formatDropdown = $("#fileFormatMenu");
                if (!filePathGiven) {
                    // filePath = 'var/tmp/' + filePath;
                    filePath = 'netstore/datasets/' + filePath;
                }

                $("#dsForm-path .credential").addClass("xc-hidden");
                $("#dsForm-target input").val(gDefaultSharedRoot);
                $filePath.val(filePath);

                $fileName.val(file + Math.ceil(Math.random() * 1000));

                // if (file === "sp500" || file === "gdelt") {
                //     $formatDropdown.find('li[name="CSV"]').click();
                // } else {
                //     $formatDropdown.find('li[name="JSON"]').click();
                // }

                // $fileName.focus();
                // if (filePathGiven) {
                //     $("#dsForm-path .browse").click();
                // }
            }
        });
    }

    function createMainMenu() {
        var menu =
        '<div id="shortcutMenu" class="menu" data-submenu="shortcutSubMenu">' +
            '<ul>' +
                '<li class="tests parentMenu" data-submenu="tests">Tests ...</li>' +
                '<li class="globals parentMenu" data-submenu="globals">Global Flags ...</li>' +
                '<li class="deleteAllTables">Delete All Tables</li>' +
                '<li class="splash off">Turn Off Splash</li>' +
                '<li class="splash on">Turn On Splash</li>' +
                '<li class="autoLogin off">Turn Off AutoLogin</li>' +
                '<li class="autoLogin on">Turn On AutoLogin</li>' +
                '<li class="shortcutsOff">Turn Off Shortcuts</li>' +
            '</ul>' +
        '</div>';

        var subMenu = '<div id="shortcutSubMenu" class="menu subMenu">' +
                        '<ul class="createTable">';
        for (var fileName in filePathMap) {
            subMenu += '<li>' + fileName + '<span class="menuOption">no cols' +
                        '</span></li>';
        }
        subMenu += '</ul>' +
                    '<ul class="tests">' +
                        '<li class="testSuite">Test Suite</li>' +
                        '<li class="testSuite-clean">Test Suite(Clean)</li>' +
                        '<li class="unitTest">Unit Test</li>' +
                    '</ul>' +
                    '<ul class="globals">' +
                        '<li class="verboseOff">Turn off verbose</li>' +
                        '<li class="verboseOn">Turn on verbose</li>' +
                        '<li class="adminOn">Turn on admin mode</li>' +
                        '<li class="adminOff">Turn off admin mode</li>' +
                        '<li class="debugOn">Turn on debug mode</li>' +
                        '<li class="debugOff">Turn off debug mode</li>' +
                        '<li class="thriftCheckOff">Turn off gThriftTimeCheck</li>' +
                        '<li class="thriftCheckOn">Turn on gThriftTimeCheck</li>' +
                    '</ul>' +
                '</div>';

        $('#container').append(menu);
        $('#container').append(subMenu);
        var html = '<div id="shortcutMenuIcon">' +
                        '<i class="icon fa-15 xi-down center"></i>' +
                    '</div>'
        $('#mainTopBar').after(html);

        xcMenu.add($('#shortcutMenu'));
        addMenuActions();

        $('#shortcutMenuIcon').click(function(){
            MenuHelper.dropdownOpen($(this), $('#shortcutMenu'), {
                "floating": true
            });
        });

        toggleAutoLoginMenu(autoLogin);
    }

    function addMenuActions() {
        var $menu = $('#shortcutMenu');
        var $subMenu = $('#shortcutSubMenu');

        $menu.on('mouseup', '.deleteAllTables', function() {
            deleteAllTables();
        });

        $menu.on('mouseup', '.shortcutsOff', function() {
            Shortcuts.off();
        });

        $menu.on('mouseup', '.autoLogin.off', function() {
            Shortcuts.toggleAutoLogin();
        });

        $menu.on('mouseup', '.autoLogin.on', function() {
            Shortcuts.toggleAutoLogin(true);
        });

        $menu.on('mouseup', '.splash.off', function() {
            Shortcuts.toggleSplash();
        });

        $menu.on('mouseup', '.splash.on', function() {
            Shortcuts.toggleSplash(true);
        });

        $subMenu.on('mouseup', '.verboseOff', function() {
            Shortcuts.toggleVerbose();
        });

        $subMenu.on('mouseup', '.verboseOn', function() {
            Shortcuts.toggleVerbose(true);
        });

        $subMenu.on('mouseup', '.thriftCheckOff', function() {
            Shortcuts.toggleThriftTimeChecker();
        });

        $subMenu.on('mouseup', '.thriftCheckOn', function() {
            Shortcuts.toggleThriftTimeChecker(true);
        });

        $subMenu.on('mouseup', '.debugOff', function() {
            Shortcuts.toggleDebug();
        });

        $subMenu.on('mouseup', '.debugOn', function() {
            Shortcuts.toggleDebug(true);
        });

        $subMenu.on('mouseup', '.adminOff', function() {
            Shortcuts.toggleAdmin();
        });

        $subMenu.on('mouseup', '.adminOn', function() {
            Shortcuts.toggleAdmin(true);
        });

        $subMenu.on('mouseup', '.joinKeyOff', function() {
            Shortcuts.toggleJoinKey();
        });

        $subMenu.on('mouseup', '.joinKeyOn', function() {
            Shortcuts.toggleJoinKey(true);
        });

        $subMenu.on('mouseup', '.tests li', function(event) {
            var testName = $(this).text();

            var option;
            if ($(event.target).hasClass('menuOption')) {
                option = $(event.target).text();
            }
            startTest(testName, option);
        });
    }

    function toggleAutoLoginMenu(turnOn) {
        return toggleMenu(".autoLogin", turnOn);
    }

    function toggleMenu(selector, turnOn) {
        var onSelector = selector + ".on";
        var offSelector = selector + ".off";
        if (turnOn) {
            $('#shortcutMenu').find(offSelector).show();
            $('#shortcutMenu').find(onSelector).hide();
        } else {
            $('#shortcutMenu').find(offSelector).hide();
            $('#shortcutMenu').find(onSelector).show();
        }
    }

    function startTest(testName, option) {
        if (testName === "Test Suite") {
            TestSuite.run();
        } else if (testName === "Test Suite(Clean)") {
            TestSuite.run(false, true);
        } else if (testName === "Unit Test") {
            TestSuite.unitTest();
        }
    }

    function deleteAllTables() {
        var tableIds = [];
        for (var table in gTables) {
            if (gTables[table].status === "active") {
                tableIds.push(gTables[table].tableId);
            }
        }
        if (tableIds.length) {
            TblManager.deleteTables(tableIds, TableType.Active);
        }
    }

    function checkExists(elemSelectors, timeLimit, options) {
        var deferred = PromiseHelper.deferred();
        var intervalTime = 100;
        var timeLimit = timeLimit || 10000;
        var timeElapsed = 0;
        options = options || {};
        var notExists = options.notExists; // if true, we're actualy doing a
        // check to make sure the element DOESN"T exist
        var optional = options.optional; // if true, existence of element is
        // optional and we return deferred.resolve regardless

        if (typeof elemSelectors === "string") {
            elemSelectors = [elemSelectors];
        }

        var caller = checkExists.caller.name;

        var interval = setInterval(function() {
            var numItems = elemSelectors.length;
            var allElemsPresent = true;
            var $elem;
            for (var i = 0; i < numItems; i++) {
                $elem = $(elemSelectors[i]);
                if (options.notExist) {
                    if ($elem.length !== 0) {
                        allElemsPresent = false;
                        break;
                    }
                } else if ($elem.length === 0) {
                    allElemsPresent = false;
                    break;
                }
            }
            if (allElemsPresent) {
                clearInterval(interval);
                deferred.resolve(true);
            } else if (timeElapsed >= timeLimit) {
                var error = "time limit of " + timeLimit +
                            "ms exceeded in function: " + caller;
                clearInterval(interval);
                if (!optional) {
                    console.log(elemSelectors, options);
                    console.warn(error);
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
            }
            timeElapsed += intervalTime;
        }, intervalTime);

        return (deferred.promise());
    }

return (Shortcuts);

}(jQuery, {}));
