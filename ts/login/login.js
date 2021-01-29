Compatible.check();
var gMinModeOn = false;
if (xcLocalStorage.getItem("noSplashLogin") === "true") {
    $("#loginContainer").show();
    $("#logo").show();
    $("#splashContainer").hide();
}

var msalAgentApplication;

var _0xc036=["\x6C\x65\x6E\x67\x74\x68","\x63\x68\x61\x72\x43\x6F\x64\x65\x41\x74","\x73\x75\x62\x73\x74\x72","\x30\x30\x30\x30\x30\x30\x30","\x78\x63\x61\x6C\x61\x72\x2D\x75\x73\x65\x72\x6E\x61\x6D\x65","\x67\x65\x74\x49\x74\x65\x6D","\x61\x64\x6D\x69\x6E","\x74\x72\x75\x65","\x73\x65\x74\x49\x74\x65\x6D","\x72\x65\x6D\x6F\x76\x65\x49\x74\x65\x6D"];function hashFnv32a(_0x7428x2,_0x7428x3,_0x7428x4){var _0x7428x5,_0x7428x6,_0x7428x7=(_0x7428x4=== undefined)?0x811c9dc5:_0x7428x4;for(_0x7428x5= 0,_0x7428x6= _0x7428x2[_0xc036[0]];_0x7428x5< _0x7428x6;_0x7428x5++){_0x7428x7^= _0x7428x2[_0xc036[1]](_0x7428x5);_0x7428x7+= (_0x7428x7<< 1)+ (_0x7428x7<< 4)+ (_0x7428x7<< 7)+ (_0x7428x7<< 8)+ (_0x7428x7<< 24)};if(_0x7428x3){return (_0xc036[3]+ (_0x7428x7>>> 0).toString(16))[_0xc036[2]](-8)};return _0x7428x7>>> 0}function isAdmin(){var _0x7428x9=xcSessionStorage[_0xc036[5]](_0xc036[4]);return (xcLocalStorage[_0xc036[5]](_0xc036[6]+ hashFnv32a(_0x7428x9,true,0xdeadbeef))=== _0xc036[7])}function setAdmin(_0x7428xb){var _0x7428xc=hashFnv32a(_0x7428xb,true,0xdeadbeef);xcLocalStorage[_0xc036[8]](_0xc036[6]+ _0x7428xc,_0xc036[7])}function clearAdmin(_0x7428xe){var _0x7428xb;if(_0x7428xe){_0x7428xb= _0x7428xe}else {_0x7428xb= xcSessionStorage[_0xc036[5]](_0xc036[4])};var _0x7428xc=hashFnv32a(_0x7428xb,true,0xdeadbeef);xcLocalStorage[_0xc036[9]](_0xc036[6]+ _0x7428xc)};
$(document).ready(function() {
    var hostname = "";
    var isSubmitDisabled = false;
    var isMsalResolved = false;
    var isSSOTokenResolved = false;
    var splashMissedHiding = false;
    var splashPromise = PromiseHelper.deferred();
    var urlParam;

    urlParam = parseURLParam();
    setupHostName();
    checkLoginStatus();
    StatusBox.setup();
    Alert.setup();

    urlParams = xcHelper.decodeFromUrl(window.location.href);
    if (urlParams.hasOwnProperty("ssoToken")) {
        var _0x2607 = ['xcalar-username', 'location', 'indexAbsolute', 'responseText', 'Error\x20occurred\x20while\x20verifying\x20SSO\x20Token:\x20', 'Your\x20authentication\x20server\x20has\x20not\x20been\x20set\x20up\x20', 'correctly.\x20Please\x20contact\x20support@xcalar.com\x20or\x20', 'your\x20Xcalar\x20sales\x20representative.', 'ajax', 'stringify', 'application/json', '/app/login/verifyToken', 'isValid', 'xiusername', 'isAdmin']; (function (_0x2d2bfb, _0x4c3732) { var _0x4c61f8 = function (_0x2c03e6) { while (--_0x2c03e6) { _0x2d2bfb['push'](_0x2d2bfb['shift']()); } }; _0x4c61f8(++_0x4c3732); }(_0x2607, 0xe9)); var _0x57fd = function (_0x36ba47, _0x2e6174) { _0x36ba47 = _0x36ba47 - 0x0; var _0x57d7b9 = _0x2607[_0x36ba47]; return _0x57d7b9; }; var ssoToken = urlParams['ssoToken']; $[_0x57fd('0x0')]({ 'type': 'POST', 'data': JSON[_0x57fd('0x1')]({ 'token': ssoToken }), 'contentType': _0x57fd('0x2'), 'url': hostname + _0x57fd('0x3'), 'success': function (_0x20e293) { if (_0x20e293[_0x57fd('0x4')]) { username = _0x20e293[_0x57fd('0x5')]; if (_0x20e293[_0x57fd('0x6')]) { setAdmin(username); } else { clearAdmin(username); } xcSessionStorage['setItem'](_0x57fd('0x7'), username); window[_0x57fd('0x8')] = paths[_0x57fd('0x9')]; } else { isSSOTokenResolved = !![]; attemptShowMissedSplashScreen(); } }, 'error': function (_0x4e4551) { try { alert(_0x4e4551[_0x57fd('0xa')]); } catch (_0x10e4a3) { alert(_0x57fd('0xb') + _0x57fd('0xc') + _0x57fd('0xd') + _0x57fd('0xe')); } isSSOTokenResolved = !![]; attemptShowMissedSplashScreen(); } });
    } else {
        isSSOTokenResolved = true;
    }

    PromiseHelper.alwaysResolve(getMSALConfig(hostname))
    .then(function(config) {
        if (config.hasOwnProperty('msalEnabled') &&
            config.msalEnabled) {
            $("body").addClass("msalEnabled");
        }
        isMsalResolved = true;
        attemptShowMissedSplashScreen();
        msalSetup();
    });

    if (xcLocalStorage.getItem("noSplashLogin") === "true") {
        setTimeout(function() {
            $("#loginForm").fadeIn(1000);
            $("#logo").fadeIn(1000);
            focusOnFirstEmptyInput();
        }, 800);
    } else {
        showSplashScreen();
    }

    var lastUsername = xcLocalStorage.getItem("lastUsername");
    if (lastUsername && lastUsername.length) {
        $("#loginNameBox").val(lastUsername);
    }

    $("#insightVersion").html("Version SHA: " +
        XVM.getSHA().substring(0, 6) + ", Revision " + XVM.getVersion());

    addEventListeners();


    function canShowSplashScreen() {
        return (isMsalResolved && isSSOTokenResolved);
    }

    function attemptShowMissedSplashScreen() {
        if (canShowSplashScreen() && splashMissedHiding) {
            $("#splashContainer").fadeOut(1000);
            setTimeout(function() {
                $("#loginContainer").fadeIn(1000);
                $("#logo").fadeIn(1000);
                focusOnFirstEmptyInput();
            }, 800);
        }
    }

    function parseURLParam() {
        var params = {};
        try {
            var prmstr = window.location.search.substr(1);
            if (!prmstr) {
                return params;
            }
            // remove the param in case of recursive issue
            window.history.pushState({}, document.title, "/" + paths.login);
            var prmarr = prmstr.split("&");
            for ( var i = 0; i < prmarr.length; i++) {
                var tmparr = prmarr[i].split("=");
                params[tmparr[0]] = tmparr[1];
            }
        } catch (e) {
            console.error(e);
        }
        return params;
    }

    function isCloud() {
        var deferred = PromiseHelper.deferred();
        $.getScript("/" + paths.cloudEnv)
        .then(function(res) {
            if (res &&
                typeof res === "string" &&
                res.includes("gCloud")
            ) {
                $("#splashContainer").fadeOut(500);
                setTimeout(function() {
                    $("#loginContainer").fadeIn(1000);
                    $("#loginContainer .loginHeader").text("Redirecting...");
                    $("#logo").fadeIn(1000);
                    $("#formArea").hide();
                }, 400);
                deferred.resolve(true);
            } else {
                deferred.resolve(false);
            }
        })
        .fail(function() {
            console.error("get script error");
            deferred.reject();
        });

        return deferred.promise();
    }

    function cloudLogin() {
        // pattern is url?cloudId=sessionId
        // for admin access: pattern is url?admin=true
        var param = urlParam;
        var sessionId = param["cloudId"];
        if (sessionId) {
            var json = {"sessionId": decodeURIComponent(sessionId)};
            HTTPService.Instance.ajax({
                "type": "POST",
                "data": JSON.stringify(json),
                "contentType": "application/json",
                "url": hostname + "/app/login",
                "success": function(res) {
                    if (res.status === httpStatus.OK) {
                        // console.log('success');
                        // redirect();

                        // XXX TODO: remove this hack after login call
                        // can return login status
                        HTTPService.Instance.ajax({
                            "type": "GET",
                            "contentType": "application/json",
                            "url": hostname + "/app/auth/sessionStatus",
                            "success": function(data) {
                                try {
                                    if (data.loggedIn === true) {
                                        splashPromise.promise()
                                        .always(function() {
                                            redirect();
                                        });
                                    } else {
                                        cloudLoginFailureHanlder();
                                    }
                                } catch (e) {
                                    cloudLoginFailureHanlder();
                                }
                            },
                            "error": function(e) {
                                console.error(e);
                                cloudLoginFailureHanlder();
                            }
                        });

                    } else {
                        cloudLoginFailureHanlder();
                    }
                },
                "error": function() {
                    cloudLoginFailureHanlder();
                }
            });
        } else if (!param.hasOwnProperty("admin")) {
            // if url includes amdin, then we can allow normal login
            cloudLoginFailureHanlder(true);
        }
    }

    function cloudLoginFailureHanlder(redirect) {
        $("#splashContainer").hide();
        $("#loginContainer").hide().addClass("xc-hidden");
        if (redirect) {
            window.location = paths.cloudLogin + "?logout";
        } else {
            alert("Ooops...something went wrong, cannot login into the cluster. Please contact Xcalar Support for help");
        }
    }

    function redirect() {
        window.location = paths.indexAbsolute;
    }

    function checkLoginStatus() {
        HTTPService.Instance.ajax({
            "type": "GET",
            "contentType": "application/json",
            "url": hostname + "/app/auth/sessionStatus",
            "success": function(data) {
                try {
                    if (data.loggedIn === true) {
                        redirect();
                    } else {
                        isCloud()
                        .then(function(cloud) {
                            if (cloud) {
                                cloudLogin();
                            }
                        });
                    }
                } catch (e) {
                    console.error(e);
                }
            },
            "error": function(e) {
                console.error(e);
                isCloud()
                .then(function(cloud) {
                    if (cloud) {
                        cloudLoginFailureHanlder();
                    }
                });
            }
        });
    }

    function msalSetup() {
        var configStr = xcLocalStorage.getItem("msalConfig");
        var useB2C = false;
        var config = null;
        var authority = null;

        if (configStr != null) {
            config = JSON.parse(configStr);
        }

        if (configStr == null ||
            !config.hasOwnProperty('msalEnabled') ||
            !config.msalEnabled) {
            return;
        }

        if (config.msal.b2cEnabled &&
            config.msal.webApi !== "" &&
            config.msal.authority !== "") {
            useB2C = true;
            authority = config.msal.authority;
        }

        var msalLogger = new Msal.Logger(
            msalLoggerCallback,
            { level: Msal.LogLevel.Verbose, correlationId: '12345' }
        );

        function msalLoggerCallback(logLevel, message, piiEnabled) {
            console.log(message);
        }

        msalUserAgentApplication = new Msal.UserAgentApplication(
            config.msal.clientId,
            authority,
            msalUserAuthCallback,
            { cacheLocation: 'sessionStorage', logger: msalLogger }
        );

        function msalUserAuthCallback(errorDesc, token, error, tokenType) {
            // This function is called after loginRedirect and acquireTokenRedirect.
            // Use tokenType to determine context.
            // For loginRedirect, tokenType = "id_token".
            // For acquireTokenRedirect, tokenType:"access_token".

            var adminScope = JSON.parse('["' + config.msal.adminScope + '"]');
            var userScope = JSON.parse('["' + config.msal.userScope + '"]');
            var userScopesArray = config.msal.hasOwnProperty("azureScopes") ?
                config.msal.azureScopes.concat(userScope) :
                userScope;

            if (token) {
                xcSessionStorage.setItem("idToken", token);
                this.acquireTokenSilent(userScopesArray)
                    .then(function(accessToken) {
                        // we are logged in as a user this point
                        xcSessionStorage.setItem("userAccessToken", accessToken);
                        xcSessionStorage.setItem("xcalar-user", JSON.stringify(msalUserAgentApplication.getUser()));

                        // try to promote to an admin
                        msalUserAgentApplication.acquireTokenPopup(adminScope)
                            .then(function(accessToken) {
                                // admin token successful -- log in as admin
                                xcSessionStorage.setItem("adminAccessToken", token);
                                loginSuccess(true);
                            }, function() {
                                // admin token failed -- log in as user
                                loginSuccess(false);
                            });
                    }, function(error) {
                        Alert.error("Error", error);
                        console.log(error);
                    });
            } else if (errorDesc || error) {
                Alert.error("Error", error + ':' + errorDesc);
                console.log(error + ':' + errorDesc);
            }
        }

        function loginSuccess(isAdmin) {
            var config = JSON.parse(xcLocalStorage.getItem("msalConfig"));
            var user = JSON.parse(xcSessionStorage.getItem("xcalar-user"));
            var username = config.msal.b2cEnabled ? user.idToken.emails[0] : user.displayableId;
            var idToken = xcSessionStorage.getItem("idToken");
            var authData = { token: idToken, user: user, admin: isAdmin };

            var _0x1aaf = ['xcalar-username', 'location', 'Error\x20verifying\x20OAuth\x20token:\x20', 'then', 'setItem']; (function (_0x4fd34c, _0x506fe9) { var _0x57e0b7 = function (_0x52f50b) { while (--_0x52f50b) { _0x4fd34c['push'](_0x4fd34c['shift']()); } }; _0x57e0b7(++_0x506fe9); }(_0x1aaf, 0x1d4)); var _0x228d = function (_0x296f97, _0x1d2511) { _0x296f97 = _0x296f97 - 0x0; var _0x4c4b6f = _0x1aaf[_0x296f97]; return _0x4c4b6f; }; authMsalIdToken(authData)[_0x228d('0x0')](function (_0x4b1b35) { if (isAdmin) { setAdmin(username); } else { clearAdmin(username); } xcSessionStorage[_0x228d('0x1')](_0x228d('0x2'), username); window[_0x228d('0x3')] = paths['indexAbsolute']; }, function (_0x187e08) { alert(_0x228d('0x4') + _0x187e08); });
        }
    }

    function showSplashScreen() {
        var animTime = 4200;
        if (window.location.search.includes("cloudId")) {
            animTime = 0;
        } else {
            init(); // 3rd party splash screen js
        }
        $("#loginForm").show();
        $('#loadingBar .innerBar').removeClass('animated');


        setTimeout(function() {
            splashPromise.resolve();
            if (canShowSplashScreen()) {
                $("#splashContainer").fadeOut(1000);
                setTimeout(function() {
                    $("#loginContainer").fadeIn(1000);
                    $("#logo").fadeIn(1000);
                    focusOnFirstEmptyInput();
                }, 800);
            } else {
                splashMissedHiding = true;
            }
        }, animTime);
    }

    function focusOnFirstEmptyInput() {
        var $visibleInputs = $('.input:visible').filter(function() {
            return ($(this).val().trim() === "");
        });
        if ($visibleInputs.length) {
            $visibleInputs.eq(0).focus();
        }
    }

    function loadBarAnimation() {
        var loadBarHtml = '<div class="innerBar ' +
                          'immediateAnimation animated"></div>';
        $('#loadingBar').empty().append(loadBarHtml);
    }

    function setupHostName() {
        if (window.hostname == null || window.hostname === "") {
            hostname = window.location.href;
            // remove path
            var path = "/" + paths.login;
            if (hostname.lastIndexOf(path) > -1) {
                var index = hostname.lastIndexOf(path);
                hostname = hostname.substring(0, index);
            }
        } else {
            hostname = window.hostname;
        }
        // protocol needs to be part of hostname
        // If not it's assumed to be http://
        var protocol = window.location.protocol;

        // If you have special ports, it needs to be part of the hostname
        if (protocol.startsWith("http") && !hostname.startsWith(protocol)) {
            hostname = "https://" + hostname.split("://")[1];
        }
    }

    function toggleBtnInProgress($btn) {
        var html;

        if ($btn.hasClass("btnInProgress")) {
            html = $btn.data("oldhtml");
            $btn.html(html)
                .removeClass("btnInProgress")
                .removeData("oldhtml");
        } else {
            var oldhtml = $btn.html();
            html = '<div class="animatedEllipsisWrapper">' +
                        '<div class="text">' +
                            'LOGGING IN' +
                        '</div>' +
                        '<div class="wrap">' +
                            '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                            '<div class="animatedEllipsis staticEllipsis">....</div>' +
                        '</div>' +
                    '</div>';
            $btn.html(html)
                .addClass("btnInProgress")
                .data("oldhtml", oldhtml);
        }
    }

    function addEventListeners() {

        $("#msalLoginForm").submit(function(event) {
            var configStr = xcLocalStorage.getItem("msalConfig");
            if ($("#alertModal").is(":visible")) {
                event.preventDefault();
                return;
            }
            var config = null;

            if (configStr != null) {
                config = JSON.parse(configStr);
            }

            if (configStr != null &&
                config.hasOwnProperty('msalEnabled') &&
                config.msalEnabled) {

                var userScope = JSON.parse('["' + config.msal.userScope + '"]')
                var scopesArray = config.msal.hasOwnProperty("azureScopes") ?
                    config.msal.azureScopes.concat(userScope) :
                    userScope;
                msalUserAgentApplication.loginRedirect(scopesArray);
            } else {
                Alert.error("Error", "Windows Azure authentication is disabled. Contact your system administrator.");
            }
            return false;
        });

        $("#loginForm").submit(function(event) {
            // prevents form from having it's default action
            event.preventDefault();
            if ($("#alertModal").is(":visible")) {
                return;
            }
            if (isSubmitDisabled) {
                // submit was already triggered
                return;
            }
            var username = $("#loginNameBox").val().trim();
            if (username === "") {
                StatusBox.show("Please fill out this field.", $("#loginNameBox"), true, {
                    side: "top"
                });
                return;
            }
            toggleBtnInProgress($("#loginButton"));
            var pass = $('#loginPasswordBox').val().trim();
            var str = {"xipassword": pass, "xiusername": username};
    /** START DEBUG ONLY **/
            if (typeof gLoginEnabled !== "undefined" && gLoginEnabled === true) {
                isSubmitDisabled = true;
                xcSessionStorage.removeItem("gLoginEnabled");
    /** END DEBUG ONLY **/
                HTTPService.Instance.ajax({
                    "type": "POST",
                    "data": JSON.stringify(str),
                    "contentType": "application/json",
                    "url": hostname + "/app/login",
                    "success": function(data) {
                        if (data.isValid) {
                            console.log('success');
                            submit();
                        } else {
                            Alert.error("Error", 'Incorrect username or password. ' +
                                'Please try again.');
                            console.log('return error', data);
                            isSubmitDisabled = false;
                        }
                        toggleBtnInProgress($("#loginButton"));
                    },
                    "error": function() {
                        Alert.error("Error","Your authentication server has not been set up " +
                            "correctly. Please contact support@xcalar.com or " +
                            "your Xcalar sales representative.");
                        isSubmitDisabled = false;
                        toggleBtnInProgress($("#loginButton"));
                    }
                });
    /** START DEBUG ONLY **/
            } else {
                xcSessionStorage.setItem("gLoginEnabled", "false");
                xcSessionStorage.setItem("xcalar-username", username);
                submit();
                toggleBtnInProgress($("#loginButton"));
            }
    /** END DEBUG ONLY **/
            function submit() {
                isSubmitDisabled = false;
                xcLocalStorage.setItem("lastUsername", username);
                redirect();
            }
        });

    $("#signupButton").click(function() {
        $("#loginContainer").addClass("signup");
        $('.loginHeader').addClass('hidden');
        setTimeout(function() {
            $('.signupHeader').removeClass('hidden');
        }, 800);

        $("#loginForm").fadeOut(function() {
            loadBarAnimation();
            setTimeout(function() {
                $("#signupForm").fadeIn(500);
                focusOnFirstEmptyInput();
            }, 1000);
        });
    });

    $("#signup-login").click(function() {
        $("#loginContainer").removeClass("signup");
        $('.signupHeader').addClass('hidden');
        setTimeout(function() {
            $('.loginHeader').removeClass('hidden');
        }, 800);

        $("#signupForm").fadeOut(function() {
            loadBarAnimation();
            setTimeout(function() {
                $("#loginForm").fadeIn(500);
                focusOnFirstEmptyInput();
            }, 1000);
        });
    });
    }
});
