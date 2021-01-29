interface ClusterGetResponse {
    status: number,
    isPending?: string
    error?: string,
    clusterUrl?: string
}

namespace CloudLogin {
    let localUsername: string;
    let localSessionId: string;
    let selectedClusterSize: 'XS'|'S'|'M'|'L'|'XL' = 'XS';
    let deployingProgressBar: ProgressBar;
    let stoppingProgressBar: ProgressBar;
    // let loginTimeoutTimer: number;
    let cloudLoginCognitoService: CloudLoginCognitoService;
    let cloudLoginLambdaService: CloudLoginLambdaService;
    let pendingTimeoutTimer: number;
    let getClusterTimer: number;
    let pendingTimeoutHappened: boolean = false;
    let splashPromise = PromiseHelper.deferred();

    export function setup(): void {
        cloudLoginCognitoService = new CloudLoginCognitoService;
        cloudLoginLambdaService = new CloudLoginLambdaService;

        cloudLoginCognitoService.setup();
        cloudLoginLambdaService.setup();

        showSplashScreen();

        let forceLogout = checkForceLogout();
        initialStatusCheck(forceLogout);
        handleEvents();

        deployingProgressBar = new ProgressBar({
            $container: $("#loadingForm"),
            completionTime: 180,
            progressTexts: [
                'Initializing AWS services',
                'Starting Xcalar',
            ],
            numVisibleProgressTexts: 2,
            startWidth: parseInt(sessionStorage.getItem('XcalarDeployingProgressBarWidth')) || 5,
            firstTextId: parseInt(sessionStorage.getItem('XcalarDeployingProgressBarFirstTextId')) || 0,
            animateTextTimeout: (completionTime) => completionTime - 10
        });

        stoppingProgressBar = new ProgressBar({
            $container: $("#stoppingForm"),
            completionTime: 25,
            progressTexts: [
                'Stopping Xcalar cluster'
            ],
            numVisibleProgressTexts: 1,
            startWidth: parseInt(sessionStorage.getItem('XcalarStoppingProgressBarWidth')) || 5,
            firstTextId: parseInt(sessionStorage.getItem('XcalarStoppingProgressBarFirstTextId')) || 0
        });
    }

    function showSplashScreen() {
        var animTime = 5000;
        if (typeof init !== "undefined") {
            init(); // 3rd party splash screen js
        }
        $("#loginForm").show();
        $('#loadingBar .innerBar').removeClass('animated');


        setTimeout(function() {
            splashPromise.resolve();
            $("#splashContainer").fadeOut(1000);
            setTimeout(function() {
                $("#loginContainer").fadeIn(1000);
                $("#logo").fadeIn(1000);
                $("#userGuide").fadeIn(1000);
                focusOnFirstEmptyInput();
            }, 800);

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

    function initialStatusCheck(forceLogout?: boolean): void {
        cloudLoginLambdaService.statusRequest()
        .then((response) => {
            if (forceLogout) {
                if (response.loggedIn) {
                    cookieLogout();
                }
                logoutAndShowInitialScreens();
            } else if (response.loggedIn === true) {
                localUsername = response.emailAddress;
                localSessionId = response.sessionId;
                clusterSelection();
                loginMixpanel.setUsername(localUsername);
            } else if (response.loggedIn === false) {
                logoutAndShowInitialScreens();
            } else {
                xcConsoleError('cookieLoggedInStatus unrecognized code:', response);
                logoutAndShowInitialScreens();
            }
        })
        .fail((error) => {
            xcConsoleError('cookieLoggedInStatus error:', error);
            // handle it as a not logged in case
            logoutAndShowInitialScreens();
        });
    }

    function logoutAndShowInitialScreens(): void {
        localUsername = "";
        localSessionId = "";
        showInitialScreens();
    }

    function cookieLogin(username: string, password: string): void {
        localUsername = username;
        loadingWait(true);
        cloudLoginLambdaService.loginRequest(username, password)
        .then((res) => {
            localSessionId = res.sessionId;
            clusterSelection();
        })
        .fail((error) => {
            xcConsoleError('cookieLogin error:', error);
            if (error.code === "UserNotConfirmedException") {
                $("#loginFormMessage").hide();
                showScreen("verify");
                cloudLoginCognitoService.ensureCognitoUserExists(localUsername);
                cognitoResendConfirmationCode();
            } else {
                let errorMsg = getErrorMessage(error, "Login failed with unknown error.");
                errorMsg += errorMsg.endsWith('.') ? '' : '.';
                errorMsg += " Please try again.";
                showFormError($("#loginFormMessage"), errorMsg);
            }
        })
        .always(() => loadingWait(false));
    }

    function cookieLogout(): void {
        cloudLoginLambdaService.logoutRequest()
        .fail(error => {
            xcConsoleError('cookieLogut error:', error);
        });
    }

    function checkCredit(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            loadingWait(true);
            cloudLoginLambdaService.billingGetRequest(localUsername)
            .then((billingGetResponse) => {
                if (billingGetResponse.status === ClusterLambdaApiStatusCode.OK) {
                    if (billingGetResponse.credits > 0) {
                        resolve(true);
                    } else {
                        showScreen("noCredits");
                        resolve(false);
                    }
                } else {
                    xcConsoleError('checkCredit non-zero status:', billingGetResponse.error);
                    handleException(billingGetResponse.error);
                    reject(billingGetResponse.error);
                }
            })
            .fail((error) => {
                if (error.status === ClusterLambdaApiStatusCode.NO_CREDIT_HISTORY) {
                    // first time user should start with some credits
                    resolve(true);
                } else {
                    xcConsoleError('checkCredit error caught:', error);
                    handleException(error);
                    reject(error);
                }
            })
            .always(() => loadingWait(false));
        });
    }

    function showProgressBar(isStarting) {
        if (isStarting) {
            showScreen("loading");
            deployingClusterAnimation();
        } else {
            showScreen("stopping");
            stoppingClusterAnimation();
        }
    }

    function getCluster(clusterIsStarting?: boolean): XDPromise<void> {
        loadingWait(true);
        return cloudLoginLambdaService.clusterGetRequest(localUsername)
        .then((clusterGetResponse) => {
            if (pendingTimeoutHappened) {
                return;
            }
            if (clusterGetResponse.status !== ClusterLambdaApiStatusCode.OK) {
                // error
                xcConsoleError('getCluster error. cluster/get returned: ', clusterGetResponse);
                // XXX TODO: remove this hack fix when lambda fix it
                if (clusterGetResponse.status === ClusterLambdaApiStatusCode.CLUSTER_ERROR &&
                    clusterGetResponse.error === "Cluster is not reachable yet"
                ) {
                    console.warn(clusterGetResponse);
                    setTimeout(() => getCluster(clusterGetResponse.isStarting), 3000);
                    showProgressBar(clusterGetResponse.isStarting);
                    return;
                } else {
                    handleException(clusterGetResponse.error);
                }
            } else if (clusterGetResponse.isPending === false && clusterGetResponse.clusterUrl === undefined) {
                // go to cluster selection screen

                if (clusterIsStarting === false) {
                    showClusterIsStoppedScreen();
                    setTimeout(() => {
                        showInitialScreens();
                    }, 1000);
                } else {
                    startCluster(); // skip cluster size selection screen and start with XS

                    // showScreen("cluster");
                    // clearTimeout(loginTimeoutTimer);
                    // loginTimeoutTimer = <any>setTimeout(() => {
                    //     showInitialScreens();
                    //     cookieLogout();
                    // }, 1800000);
                }
            } else if (clusterGetResponse.isPending) {
                // go to wait screen
                getClusterTimer = <any>setTimeout(() => {
                    getCluster(clusterGetResponse.isStarting);
                }, 3000);
                showProgressBar(clusterGetResponse.isStarting);
                if (!pendingTimeoutTimer) {
                    pendingTimeoutTimer = <any>setTimeout(() => {
                        pendingTimeoutHappened = true;
                        handleException("Server took too long to respond");
                        clearTimeout(getClusterTimer); // so that 401 doesn't overwrite error message
                    }, 600000);
                }
            } else {
                if (deployingProgressBar.isStarted()) {
                    showClusterIsReadyScreen();
                    setTimeout(() => {
                        goToXcalar(clusterGetResponse);
                    }, 1000);
                } else {
                    goToXcalar(clusterGetResponse);
                }
            }
        })
        .fail((error) => {
            xcConsoleError('getCluster error caught:', error);
            handleException(error);
        })
        .always(() => loadingWait(false));
    }

    function startCluster(): void {
        loadingWait(true);
        cloudLoginLambdaService.clusterStartRequest(localUsername, selectedClusterSize)
        .then(() => {
            getCluster();
        })
        .fail((error) => {
            xcConsoleError('startCluster error caught:', error);
            handleException(error);
        })
        .always(() => loadingWait(false));
    }

    function clusterSelection() {
        checkCredit()
        .then((hasCredit) => {
            if (hasCredit) {
                return getCluster();
            }
        });
    }

    function goToXcalar(clusterGetResponse: ClusterGetResponse): void {
        loadingWait(true);
        const sessionId: string = localSessionId;
        if (!sessionId || !clusterGetResponse.clusterUrl) {
            handleException(clusterGetResponse.error);
            loadingWait(false);
            return;
        }
        loginMixpanel.login(localUsername);
        var url = clusterGetResponse.clusterUrl + "/" + paths.login +
        "?cloudId=" + encodeURIComponent(sessionId);
        window.location.href = url;
    }

    function hideCurrentScreen(): void {
        $("#cloudLoginHeader").children().hide();
        $("#formArea").children().hide();
    }

    function showScreen(screenName: string): void {
        hideCurrentScreen();
        clearForm(screenName);
        $("#" + screenName + "Title").show();
        $("#" + screenName + "Form").show();
        $("#" + screenName + "Form .input").first().focus();
    }

    function showInitialScreens(): void {
        const signupScreen: boolean = hasParamInURL("invitation");
        // const signupScreen: boolean = hasParamInURL("signup");
        if (signupScreen) {
            showScreen("signup");
        } else {
            showScreen("login");
        }
    }

    function getErrorMessage(error: any, defaultMsg: string = "unknown error") {
        if (typeof error === "object" && (error.message || error.error)) {
            error = error.message || error.error;
        } else if (typeof error !== 'string' && !(error instanceof String)) {
            error = defaultMsg;
        }
        return error;
    }

    function showExceptionScreen(
        errorMsg: string = "An unknown error has occurred...",
        displayText: string = "Cannot connect to service. Please refresh the page in a few minutes"
    ): void {
        $("#exceptionForm #exceptionFormMessage .text").html(errorMsg);
        $("#exceptionForm .title").html(displayText);

        showScreen("exception");
    }

    function handleException(error: any): void {
        const errorMsg = getErrorMessage(error, "An unknown server error has ocurred.");
        if (error.status === ClusterLambdaApiStatusCode.NO_AVAILABLE_STACK) {
            let displayText =
            'We are currently experiencing an overwhelmingly high demand for our product. ' +
            'Please contact Xcalar support at <a href="mailto:info@xcalar.com">info@xcalar.com</a> ' +
            'or call us at (408) 471-1711. Thank you for your patience.'
            showExceptionScreen(errorMsg, displayText);
        } else {
            showExceptionScreen(errorMsg);
        }

        cookieLogout();
    }

    function checkLoginForm(): boolean {
        const email: string = $("#loginNameBox").val();
        const password: string = $("#loginPasswordBox").val();
        if (!email || !password) {
            showFormError($("#loginFormMessage"), "Fields missing or incomplete.");
            return false;
        // } else if (!validateEmail(email) || !validatePassword(password)) {
        //     showFormError($("#loginFormMessage"), "Incorrect email or password. Please try again.");
        //     return false;
        } else {
            $("#loginFormMessage").hide();
            return true;
        }
    }

    function showFormError($errorBox: JQuery, errorText: string): void {
        const $icon = $errorBox.find('.icon');
        $icon.removeClass('xi-success');
        $icon.addClass('xi-error');
        $errorBox.children(".text").html(errorText);
        $errorBox.show();
    }

    function showFormSuccess($successBox: JQuery, successText: string): void {
        const $icon = $successBox.find('.icon');
        $icon.removeClass('xi-error');
        $icon.addClass('xi-success');
        $successBox.children(".text").html(successText);
        $successBox.show();
    }

    function validateEmail(email): boolean {
        return email.match(/\S+@\S+\.\S+/);
    }

    function validatePassword(password): boolean {
        return password.match(/(?=.{8,})(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*(\W|_))/)
    }

    let focusTooltipShown: boolean = false;
    let signupSubmitClicked: boolean = false;
    let confirmForgotPasswordClicked: boolean = false;

    function hideTooltip($element: JQuery): void {
        if (!focusTooltipShown) {
            $element.find(".input-tooltip").hide();
        }
    }

    function showTooltip($element: JQuery): void {
        if (!focusTooltipShown) {
            $element.find(".input-tooltip").show();
        }
    }

    function showTooltipOnFocus($element: JQuery, error: boolean) {
        const $tooltip = $element.find(".input-tooltip");

        $element.unbind('focusin focusout');

        $element.focusin(
            function () {
                if (error) {
                    $tooltip.show();
                    focusTooltipShown = true;
                } else {
                    $tooltip.hide();
                    focusTooltipShown = false;
                }
            }
        )
        $element.focusout(
            function () {
                $tooltip.hide();
                focusTooltipShown = false;
            }
        )
        if ($element.find('input').is(":focus")) {
            if (error) {
                $tooltip.show();
                focusTooltipShown = true;
            } else {
                $tooltip.hide();
                focusTooltipShown = false;
            }
        }
    }

    function showInputError(
        $element: JQuery,
        inputIsCorrect: boolean,
        showSuccessIcon: boolean,
        submitClicked: boolean
    ): void {
        const $icon = $element.find('.icon').not(".input-tooltip .icon");

        $element.unbind('mouseenter mouseleave');

        if (inputIsCorrect) {
            showTooltipOnFocus($element, false);

            if (showSuccessIcon) {
                $icon.removeClass('xi-error');
                $icon.addClass('xi-success');
                $icon.show();
            } else {
                $icon.hide();
            }
        } else {
            if (submitClicked) {
                showTooltipOnFocus($element, true);
                $element.hover(() => showTooltip($element), () => hideTooltip($element));
                $icon.removeClass('xi-success');
                $icon.addClass('xi-error');
                $icon.show();
            } else {
                $icon.hide();
            }
        }
    }

    function showPasswordErrorRows(password: string, passwordSection: string): void {
        const lowerCaseLetters: RegExp = /[a-z]/g;
        if (password.match(lowerCaseLetters)) {
            $(passwordSection + " .passwordLowerTooltipError").removeClass("errorTooltipRow");
        } else {
            $(passwordSection + " .passwordLowerTooltipError").addClass("errorTooltipRow");
        }

        // Validate capital letters
        const upperCaseLetters: RegExp = /[A-Z]/g;
        if (password.match(upperCaseLetters)) {
            $(passwordSection + " .passwordUpperTooltipError").removeClass("errorTooltipRow");
        } else {
            $(passwordSection + " .passwordUpperTooltipError").addClass("errorTooltipRow");
        }

        // Validate numbers
        const numbers: RegExp = /[0-9]/g;
        if (password.match(numbers)) {
            $(passwordSection + " .passwordNumberTooltipError").removeClass("errorTooltipRow");
        } else {
            $(passwordSection + " .passwordNumberTooltipError").addClass("errorTooltipRow");
        }

        // Validate length
        if (password.length >= 8) {
            $(passwordSection + " .passwordLengthTooltipError").removeClass("errorTooltipRow");
        } else {
            $(passwordSection + " .passwordLengthTooltipError").addClass("errorTooltipRow");
        }

        // Validate special characters
        const specialCharacters: RegExp = /(\W|_)/g;
        if (password.match(specialCharacters)) {
            $(passwordSection + " .passwordSpecialTooltipError").removeClass("errorTooltipRow");
        } else {
            $(passwordSection + " .passwordSpecialTooltipError").addClass("errorTooltipRow");
        }

        $(".tooltipRow i").removeClass("xi-cancel");
        $(".tooltipRow i").addClass("xi-success");
        $(".errorTooltipRow i").removeClass("xi-success");
        $(".errorTooltipRow i").addClass("xi-cancel");
    }

    function checkSignUpForm(): boolean {
        // const firstNameEmpty: boolean = $("#signup-firstName").val() === "";
        // const lastNameEmpty: boolean = $("#signup-lastName").val() === "";
        // const companyEmpty: boolean = $("#signup-company").val() === "";
        const invitationCodeEmpty: boolean = $("#signup-invitationCode").val() === "";
        const email1: string = $("#signup-email").val();
        // const email2: string = $("#signup-confirmEmail").val();
        const password1: string = $("#signup-password").val();
        const password2: string = $("#signup-confirmPassword").val();
        // const emailsMatch: boolean = email1 === email2;
        const passwordsMatch: boolean = password1 === password2;
        const checkedEULA: boolean = $("#signup-termCheck").prop('checked');

        // showInputError($("#signupForm .firstNameSection"), !firstNameEmpty, false, signupSubmitClicked);
        // showInputError($("#signupForm .lastNameSection"), !lastNameEmpty, false, signupSubmitClicked);
        // showInputError($("#signupForm .companySection"), !companyEmpty, false, signupSubmitClicked);
        showInputError($("#signupForm .invitationCodeSection"), !invitationCodeEmpty, false, signupSubmitClicked);
        showInputError($("#signupForm .emailSection"), validateEmail(email1), true, signupSubmitClicked);
        // showInputError($("#signupForm .confirmEmailSection"), emailsMatch && validateEmail(email1), true, signupSubmitClicked);
        showInputError($("#signupForm .passwordSection"), validatePassword(password1), true, signupSubmitClicked);
        showInputError($("#signupForm .confirmPasswordSection"), passwordsMatch && validatePassword(password1), true, signupSubmitClicked);
        showInputError($("#signupForm .submitSection"), checkedEULA, false, signupSubmitClicked);

        showPasswordErrorRows(password1, "#signupForm .passwordSection");
        showTooltipOnFocus($("#signupForm .passwordSection"), !validatePassword(password1));

        if (email1 === "") {
            $('#signupForm .emailSection .input-tooltip').text('Email cannot be empty');
        } else {
            $('#signupForm .emailSection .input-tooltip').text('Email must be in a valid format');
        }

        const inputIsCorrect: boolean =
            // !firstNameEmpty &&
            // !lastNameEmpty &&
            // !companyEmpty &&
            !invitationCodeEmpty &&
            validateEmail(email1) &&
            // emailsMatch &&
            validatePassword(password1) &&
            passwordsMatch;

        if (inputIsCorrect && checkedEULA) {
            $("#signupFormMessage").hide()
            return true;
        } else {
            if (signupSubmitClicked) {
                if (inputIsCorrect && !checkedEULA) {
                    showFormError($("#signupFormMessage"), "Please read and accept the End User License Agreement");
                } else {
                    showFormError($("#signupFormMessage"), "Fields missing or incomplete.");
                }
            }
            return false;
        }
    }

    function checkConfirmForgotPasswordForm(): boolean {
        const verificationCodeEmpty: boolean = $("#confirm-forgot-password-code").val() === "";
        const newPassword1: string = $("#confirm-forgot-password-new-password").val();
        const newPassword2: string = $("#confirm-forgot-password-confirm-new-password").val();
        const newPasswordsMatch: boolean = newPassword1 === newPassword2;

        showInputError(
            $("#confirmForgotPasswordForm .verificationCodeSection"),
            !verificationCodeEmpty,
            false,
            confirmForgotPasswordClicked
        );
        showInputError(
            $("#confirmForgotPasswordForm .passwordSection"),
            validatePassword(newPassword1),
            true,
            confirmForgotPasswordClicked
        );
        showInputError(
            $("#confirmForgotPasswordForm .confirmPasswordSection"),
            newPasswordsMatch && validatePassword(newPassword2),
            true,
            confirmForgotPasswordClicked
        );

        showPasswordErrorRows(newPassword1, "#confirmForgotPasswordForm .passwordSection");
        showTooltipOnFocus($("#confirmForgotPasswordForm .passwordSection"), !validatePassword(newPassword1));

        const inputIsCorrect: boolean = !verificationCodeEmpty &&
            validatePassword(newPassword1) &&
            newPasswordsMatch;

        if (inputIsCorrect) {
            if ($("#confirmForgotPasswordFormMessage").find('.xi-error').length) {
                $("#confirmForgotPasswordFormMessage").hide();
            }
            return true;
        } else {
            if (confirmForgotPasswordClicked) {
                showFormError(
                    $("#confirmForgotPasswordFormMessage"),
                    "Fields missing or incomplete."
                );
            }
            return false;
        }
    }

    let loadingWaitIntervalID: number;
    let buttonsLoadingDisabled: boolean = false;
    let fetchesInProgress: number = 0;

    function loadingWait(waitFlag: boolean): void {
        fetchesInProgress += waitFlag ? 1 : -1;
        if (fetchesInProgress > 0 && !buttonsLoadingDisabled) {
            $('.auth-section').addClass('auth-link-disabled');
            $('.btn').addClass('btn-disabled');
            $('.btn').append('<span class="loading-dots"></span>')
            let dotsCount: number = 0
            loadingWaitIntervalID = <any>setInterval(function() {
                dotsCount = (dotsCount + 1) % 4;
                $('.btn .loading-dots').text('.'.repeat(dotsCount));
            }, 1000);
            buttonsLoadingDisabled = true;
        } else if (fetchesInProgress < 1) {
            $('.auth-section').removeClass('auth-link-disabled');
            $('.btn').removeClass('btn-disabled');
            $('.btn .loading-dots').remove();
            clearInterval(loadingWaitIntervalID);
            buttonsLoadingDisabled = false;
        }
    }

    function checkVerifyForm(): boolean {
        const code: string = $("#verify-code").val();
        if (!code) {
            showFormError($("#verifyFormMessage"), "Please enter your verification code.");
            return false;
        } else {
            $("#verifyFormMessage").hide();
            return true;
        }
    }

    function checkForgotPasswordForm(): boolean {
        let forgotPasswordEmail: string = $("#forgot-password-email").val()
        if (forgotPasswordEmail && validateEmail(forgotPasswordEmail)) {
            $("#forgotPasswordFormMessage").hide();
            return true;
        } else {
            showFormError($("#forgotPasswordFormMessage"), "Please enter a valid email for password recovery.");
            return false;
        }
    }

    function checkClusterForm(): boolean {
        if (!selectedClusterSize) {
            showFormError($("#clusterFormMessage"), "Please select your cluster size.");
            return false;
        } else {
            $("#clusterFormMessage").hide();
            return true;
        }
    }

    function showClusterIsReadyScreen(): void {
        // $("#loadingTitle").html("Your cluster is ready!");
        deployingProgressBar.end("Redirecting to Xcalar...");
        clearInterval(deployingProgressBarCheckIntervalID);
        sessionStorage.setItem('XcalarDeployingProgressBarWidth', "");
        sessionStorage.setItem('XcalarDeployingProgressBarFirstTextId', "");
    }

    let deployingProgressBarCheckIntervalID: number;
    function deployingClusterAnimation(): void {
        if (!deployingProgressBar.isStarted()) {
            deployingProgressBar.start("Starting Xcalar Instance...", "");

            clearInterval(deployingProgressBarCheckIntervalID);
            deployingProgressBarCheckIntervalID = <any>setInterval(function() {
                const {width, firstTextId} = deployingProgressBar.getProgress();
                sessionStorage.setItem('XcalarDeployingProgressBarWidth', String(width - 1));
                sessionStorage.setItem('XcalarDeployingProgressBarFirstTextId', String(firstTextId - 1));
            }, 1000);
        }
    }

    let stoppingProgressBarCheckIntervalID: number;

    function showClusterIsStoppedScreen(): void {
        $("#stoppingTitle").html("Your cluster has been shut down!");
        stoppingProgressBar.end("Redirecting to the login page...");
        clearInterval(stoppingProgressBarCheckIntervalID);
        sessionStorage.setItem('XcalarStoppingProgressBarWidth', "");
        sessionStorage.setItem('XcalarStoppingProgressBarFirstTextId', "");
    }

    function stoppingClusterAnimation(): void {
        if (!stoppingProgressBar.isStarted()) {
            stoppingProgressBar.start("Stopping Xcalar Instance...");

            clearInterval(stoppingProgressBarCheckIntervalID);
            stoppingProgressBarCheckIntervalID = <any>setInterval(function() {
                const {width, firstTextId} = stoppingProgressBar.getProgress();
                sessionStorage.setItem('XcalarStoppingProgressBarWidth', String(width - 1));
                sessionStorage.setItem('XcalarStoppingProgressBarFirstTextId', String(firstTextId - 1));
            }, 1000);
        }
    }

    function submitOnEnterPress($form: JQuery, $submitButton: JQuery): void {
        $form.keypress(function(event) {
            const keycode = (event.keyCode ? event.keyCode : event.which);
            if (keycode == 13) {
                $submitButton.click();
            }
        });
    }

    function clearElements(elementsToHide: string[], elementsToEmpty: string[], clearFunction?: Function): void {
        elementsToHide.forEach((element) => $(element).hide());
        elementsToEmpty.forEach((element) => $(element).val(""));
        if (typeof clearFunction === 'function') {
            clearFunction();
        }
    }

    function clearForm(screenName: string) {
        switch (screenName) {
            case 'login':
                clearElements(
                    ["#loginFormMessage"],
                    ["#loginNameBox","#loginPasswordBox"]
                );
                break;

            case 'signup':
                clearElements(
                    ["#signupFormMessage"],
                    [
                        // "#signup-firstName",
                        // "#signup-lastName",
                        // "#signup-company",
                        "#signup-email",
                        // "#signup-confirmEmail",
                        '#signup-invitationCode',
                        "#signup-password",
                        "#signup-confirmPassword"
                    ],
                    () => {
                        $("#signup-termCheck").prop("checked",false);
                        signupSubmitClicked = false;
                        checkSignUpForm();
                    }
                );
                break;

            case 'forgotPassword':
                clearElements(
                    ["#forgotPasswordFormMessage"],
                    ["#forgot-password-email"]
                );
                break;

            case 'confirmForgotPassword':
                clearElements(
                    ["#confirmForgotPasswordFormMessage"],
                    [
                        "#confirm-forgot-password-code",
                        "#confirm-forgot-password-new-password",
                        "#confirm-forgot-password-confirm-new-password"
                    ],
                    () => {
                        confirmForgotPasswordClicked = false;
                        checkConfirmForgotPasswordForm();
                    }
                );
                break;

            case 'cluster':
                clearElements(
                    ["#clusterFormMessage"],
                    []
                );
                break;
        }
    }

    function cognitoResendConfirmationCode() {
        loadingWait(true);
        cloudLoginCognitoService.resendConfirmationCode(function (err) {
            loadingWait(false);
            if (err) {
                xcConsoleError(err);
                showFormError($("#verifyFormMessage"), err.message);
                return;
            }
        });
    }

    function hasParamInURL(param): boolean {
        return new URLSearchParams(window.location.search).has(param);
    }

    function checkForceLogout(): boolean {
        let forceLogout = hasParamInURL("logout");
        if (forceLogout) {
            // don't show logout as part of the URL
            clearURL();
        }
        return forceLogout;
    }

    function clearURL(): void {
        window.history.pushState({}, document.title, "/");
    }

    function handleEvents(): void {
        submitOnEnterPress($("#signupForm"), $("#signup-submit"));
        submitOnEnterPress($("#loginForm"), $("#loginButton"));
        submitOnEnterPress($("#verifyForm"), $("#verify-submit"));
        submitOnEnterPress($("#forgotPasswordForm"), $("#forgot-password-submit"));
        submitOnEnterPress($("#confirmForgotPasswordForm"), $("#confirm-forgot-password-submit"));

        $("#confirmForgotPasswordForm").find(".input").keyup(function () {
            checkConfirmForgotPasswordForm();
        })

        $("#signupForm").find(".input").keyup(function () {
            checkSignUpForm();
        });

        $("#signup-termCheck").change(function () {
            checkSignUpForm();
        });

        $(".link-to-login").click(function () {
            showScreen("login");
        });

        // $(".link-to-signup").click(function () {
        //     showScreen("signup");
        // });

        $(".logOutLink").click(function () {
            // clearTimeout(loginTimeoutTimer);
            cookieLogout();
        });

        $("#loginButton").click(function () {
            if (checkLoginForm()) {
                var username = $("#loginNameBox").val().toLowerCase();
                var password = $("#loginPasswordBox").val();
                cookieLogin(username, password);
            }
        });

        $("#verify-resend-code span").click(function () {
            cognitoResendConfirmationCode();
            showFormSuccess(
                $("#verifyFormMessage"),
                "We sent a new verification code to your email address"
            );
            $("#verify-code").focus();
        });

        $("#confirm-forgot-password-resend-code span").click(function () {
            cloudLoginCognitoService.forgotPassword(localUsername, {
                onSuccess: function () {
                    showFormSuccess(
                        $("#confirmForgotPasswordFormMessage"),
                        "We sent a new verification code to your email address"
                    );
                    $("#confirm-forgot-password-code").focus();
                },
                onFailure: function (err) {
                    if (err.code === 'UserNotFoundException') {
                        showFormError(
                            $("#confirmForgotPasswordFormMessage"),
                            "Account doesn't exist."
                        );
                    } else {
                        showFormError(
                            $("#confirmForgotPasswordFormMessage"),
                            getErrorMessage(err, "Error occurred, trying to resend code")
                        );
                    }
                }
            });
        });

        $("#signup-submit").click(function () {
            if (checkSignUpForm()) {
                const username = $("#signup-email").val().toLowerCase();
                const password = $("#signup-password").val();

                // const givenName = $("#signup-firstName").val();
                // const familyName = $("#signup-lastName").val();
                // const company = $("#signup-company").val();
                const invitationCode = $("#signup-invitationCode").val();
                cloudLoginCognitoService.signupWithInvite(
                    username,
                    invitationCode,
                    password,
                    function (err, result) {
                        if (err) {;
                            xcConsoleError(err);
                            showFormError($("#signupFormMessage"), err.message);
                            return;
                        } else {
                            $("#verifyFormMessage").hide();
                        }
                        window.history && window.history.replaceState && window.history.replaceState(null, '', location.pathname);
                        showScreen("login");
                        showFormSuccess(
                            $("#loginFormMessage"),
                            "You've sign up successfully, please sign in!"
                        );
                        return result.user; // return value is used by cloudLoginCognitoService.signUp to update cognitoUser
                    }
                );
                // cloudLoginCognitoService.signUp(
                //     givenName,
                //     familyName,
                //     company,
                //     username,
                //     password,
                //     null,
                //     function (err, result) {
                //         if (err) {;
                //             xcConsoleError(err);
                //             showFormError($("#signupFormMessage"), err.message);
                //             return;
                //         } else {
                //             $("#verifyFormMessage").hide();
                //         }
                //         showScreen("verify");
                //         showFormSuccess(
                //             $("#verifyFormMessage"),
                //             "An email verification code has been sent to your email address. Enter it below to confirm your account"
                //         );
                //         return result.user; // return value is used by cloudLoginCognitoService.signUp to update cognitoUser
                //     }
                // );
            } else {
                signupSubmitClicked = true;
                checkSignUpForm();
            }
        });

        $("#verify-submit").click(function () {
            if (checkVerifyForm()) {
                var code = $("#verify-code").val();
                loadingWait(true);
                cloudLoginCognitoService.confirmRegistration(code, function (err) {
                    loadingWait(false);
                    if (err) {
                        xcConsoleError(err);
                        showFormError($("#verifyFormMessage"), err.message);
                        return;
                    } else {
                        $("#verifyFormMessage").hide();
                        showScreen("login");
                        showFormSuccess(
                            $("#loginFormMessage"),
                            "Your email address was verified successfully. Log in to access your account!"
                        );
                    }
                });
            }
        });

        $("#clusterForm").find(".radioButton").click(function () {
            selectedClusterSize = $(this).data('option');

            if ($(this).hasClass("active") || (!$(this).is(":visible"))) {
                return false;
            }
            var $radioButtonGroup = $(this).closest(".radioButtonGroup");
            var $activeRadio = $(this);
            $radioButtonGroup.find("> .radioButton").removeClass("active");
            $activeRadio.addClass("active");
            return false;
        });

        $("#deployBtn").click(function () {
            if (checkClusterForm()) {
                // clearTimeout(loginTimeoutTimer);
                startCluster();
            }
        });

        $("#forgotSection a").click(function () {
            showScreen("forgotPassword");
        });

        $("#forgot-password-submit").click(function () {
            if (checkForgotPasswordForm()) {
                const username = $("#forgot-password-email").val().toLowerCase();

                loadingWait(true);
                cloudLoginCognitoService.forgotPassword(username, {
                    onSuccess: function () {
                        loadingWait(false);
                        $("#forgotPasswordFormMessage").hide();
                        showScreen("confirmForgotPassword");
                        showFormSuccess(
                            $("#confirmForgotPasswordFormMessage"),
                            "An email verification code has been sent to your email address. Enter it below to confirm your account"
                        );
                        localUsername = username;
                    },
                    onFailure: function (err) {
                        loadingWait(false);
                        if (err.code === 'UserNotFoundException') {
                            showFormError(
                                $("#forgotPasswordFormMessage"),
                                "Account doesn't exist."
                            );
                        } else {
                            showFormError(
                                $("#forgotPasswordFormMessage"),
                                getErrorMessage(err, "Error occurred, trying to resend code")
                            );
                        }
                    }
                });
            }
        });

        $("#confirm-forgot-password-submit").click(function () {
            if (checkConfirmForgotPasswordForm()) {
                var verificationCode = $("#confirm-forgot-password-code").val();
                var newPassword = $("#confirm-forgot-password-new-password").val();
                loadingWait(true);
                cloudLoginCognitoService.confirmPassword(verificationCode, newPassword, {
                    onSuccess: function () {
                        loadingWait(false);
                        $("#confirmForgotPasswordFormMessage").hide();
                        showScreen("login");
                    },
                    onFailure: function (err) {
                        loadingWait(false);
                        showFormError($("#confirmForgotPasswordFormMessage"), err.message);
                    }
                });
            } else {
                confirmForgotPasswordClicked = true;
                checkConfirmForgotPasswordForm();
            }
        });

        $("body").tooltip(<any>{
            "selector": '[data-toggle="tooltip"]',
            "html": true,
            "delay": {
                "show": 250,
                "hide": 100
            }
        });

        $("#userGuide").click(function() {
            var win: Window = window.open('https://xcalar.com/documentation/Content/Home_doc_portal.htm', '_blank');
            if (win) {
                win.focus();
            } else {
                alert('Please allow popups for this website');
            }
        });
    }
    /* Unit Test Only */
    if (window["unitTestMode"]) {
        CloudLogin["__testOnly__"] = {
            initialStatusCheck: initialStatusCheck,
            cookieLogin: cookieLogin,
            cookieLogout: cookieLogout,
            checkCredit: checkCredit,
            getCluster: getCluster,
            startCluster: startCluster,
            clusterSelection: clusterSelection,
            goToXcalar: goToXcalar,
            showInitialScreens: showInitialScreens,
            handleException: handleException,
            checkLoginForm: checkLoginForm,
            showFormError: showFormError,
            validateEmail: validateEmail,
            validatePassword: validatePassword,
            hideTooltip: hideTooltip,
            showTooltip: showTooltip,
            showInputError: showInputError,
            showPasswordErrorRows: showPasswordErrorRows,
            checkSignUpForm: checkSignUpForm,
            loadingWait: loadingWait,
            checkVerifyForm: checkVerifyForm,
            checkForgotPasswordForm: checkForgotPasswordForm,
            checkClusterForm: checkClusterForm,
            checkConfirmForgotPasswordForm: checkConfirmForgotPasswordForm,
            showClusterIsReadyScreen: showClusterIsReadyScreen,
            deployingClusterAnimation: deployingClusterAnimation,
            getErrorMessage: getErrorMessage,
            handleEvents: handleEvents
        }
    }
    /* End Of Unit Test Only */
}