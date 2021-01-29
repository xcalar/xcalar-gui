class LoginConfigModal {
    private static _instance: LoginConfigModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _msalConfig;
    private _defaultAdminConfig;
    private _ldapConfig;
    private _ldapChoice: string = "ldap";

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {});

        this._addEventListeners();

        let signOnUrl: string = hostname + "/assets/htmlFiles/login.html";
        $("#loginConfigMSALSignOnUrl").text(signOnUrl);
    }

    /**
     * LoginConfigModal.Instance.show
     * @param msalConfigIn
     * @param defaultAdminConfigIn
     * @param ldapConfigIn
     */
    public show(msalConfigIn, defaultAdminConfigIn, ldapConfigIn): void {
        this._setupConfig(msalConfigIn, defaultAdminConfigIn, ldapConfigIn);
        this._modalHelper.setup();

        if (this._msalConfig !== null) {
            if (this._msalConfig.msalEnabled) {
                $("#loginConfigEnableMSAL").find(".checkbox").addClass("checked");
                $("#loginConfigEnableMSAL").next().removeClass("xc-hidden");
            }

            $("#loginConfigMSALClientId").val(this._msalConfig.msal.clientId);
            $("#loginConfigMSALUserScope").val(this._msalConfig.msal.userScope);
            $("#loginConfigMSALAdminScope").val(this._msalConfig.msal.adminScope);

            $("#loginConfigMSALWebApi").val(this._msalConfig.msal.webApi);
            $("#loginConfigMSALAuthority").val(this._msalConfig.msal.authority);
            $("#loginConfigMSALAzureEndpoint").val(this._msalConfig.msal.azureEndpoint);
            $("#loginConfigMSALAzureScopes").val(this._msalConfig.msal.azureScopes.join(','));
            if (this._msalConfig.msal.b2cEnabled) {
                 $("#loginConfigMSALEnableB2C").addClass("checked");
            }
        }

        if (this._defaultAdminConfig !== null) {
            if (this._defaultAdminConfig.defaultAdminEnabled) {
                $("#loginConfigEnableDefaultAdmin").find(".checkbox").addClass("checked");
                $("#loginConfigEnableDefaultAdmin").next().removeClass("xc-hidden");
            }
            let strengthClasses: string = this._getStrengthClasses();
            $("#loginConfigAdminUsername").val(this._defaultAdminConfig.username);
            $("#loginConfigAdminEmail").val(this._defaultAdminConfig.email);
            $("#loginConfigAdminPassword").val("");
            $("#loginConfigAdminConfirmPassword").val("");
            $("#passwordStrengthHint").html("");
            $("#loginConfigAdminPassword").removeClass(strengthClasses);
            $("#passwordStrengthHint").removeClass(strengthClasses);
        }

        if (this._ldapConfig !== null) {
            if (this._ldapConfig.ldapConfigEnabled) {
                $("#loginConfigEnableLdapAuth").find(".checkbox").addClass("checked");
                $("#loginConfigEnableLdapAuth").next().removeClass("xc-hidden");
            }

            $("#loginConfigLdapUrl").val(this._ldapConfig.ldap_uri);
            $("#loginConfigLdapUserDn").val(this._ldapConfig.userDN);
            $("#loginConfigLdapSearchFilter").val(this._ldapConfig.searchFilter);
            $("#loginConfigLdapServerKeyFile").val(this._ldapConfig.serverKeyFile);

            if (this._ldapConfig.useTLS) {
                $("#loginConfigLdapEnableTLS").addClass("checked");
            }

            if (this._ldapConfig.activeDir) {
                $("#ldapChoice").find(".radioButton").eq(0).click();
                $("#loginConfigADUserGroup").val(this._ldapConfig.adUserGroup);
                $("#loginConfigADAdminGroup").val(this._ldapConfig.adAdminGroup);
                $("#loginConfigADDomain").val(this._ldapConfig.adDomain);
                if (this._ldapConfig.adSubGroupTree) {
                    $("#loginConfigEnableADGroupChain").addClass("checked");
                }
                if (this._ldapConfig.adSearchShortName) {
                    $("#loginConfigEnableADSearchShortName").addClass("checked");
                }
            } else {
                $("#ldapChoice").find(".radioButton").eq(1).click();
            }
        }
    }

    private _getModal(): JQuery {
        return $("#loginConfigModal");
    }

    private _getStrengthClasses(): string {
        return "veryWeak weak strong veryStrong invalid";
    }

    private _setupConfig(msalConfigIn, defaultAdminConfigIn, ldapConfigIn) {
        this._msalConfig = msalConfigIn;
        this._defaultAdminConfig = defaultAdminConfigIn;
        this._ldapConfig = ldapConfigIn;
    }

    private _close(): void {
        this._msalConfig = null;
        this._defaultAdminConfig = null;
        this._ldapConfig = null;
        this._modalHelper.clear();
        $("#passwordStrengthHint").html("");
        let strengthClasses: string = this._getStrengthClasses();
        $("#loginConfigAdminPassword").removeClass(strengthClasses);
        $("#passwordStrengthHint").removeClass(strengthClasses);
        StatusBox.forceHide();
    }

    protected _submitForm(): void {
        this._submitDefaultAdminConfig()
        .then(() => {
            return this._submitMSALConfig();
        })
        .then(() => {
            return this._submitLdapConfig();
        })
        .then(() => {
            xcUIHelper.showSuccess(LoginConfigTStr.LoginConfigSavedSuccess);
            this._close();
        })
        .fail((error: {error: string, isFatal: boolean}) => {
            if (error.isFatal) {
                xcUIHelper.showFail(error.error);
                this._close();
            } else {
                Alert.show( {
                    "title": ErrorMessageTStr.title,
                    "msg": error.error,
                    "isAlert": true
                });
            }
        });
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });
        $modal.find(".confirm").click(() => {
            this._submitForm();
        });

        $modal.find(".loginSectionToggle").click((event) => {
            let $el = $(event.currentTarget);
            $el.find(".checkbox").toggleClass("checked");
            $el.next().toggleClass("xc-hidden");
            if (($el.attr('id') === "loginConfigEnableDefaultAdmin") &&
                (!$el.find(".checkbox").hasClass("checked"))
            ) {
                StatusBox.forceHide();
            }
        });

        $("#loginConfigEnableADGroupChain").click((event) => {
            $(event.currentTarget).toggleClass("checked");
        });

        $("#loginConfigEnableADSearchShortName").click((event) => {
            $(event.currentTarget).toggleClass("checked");
        });

        $("#loginConfigLdapEnableTLS").click((event) => {
            $(event.currentTarget).toggleClass("checked");
        });

        $("#loginConfigMSALEnableB2C").click((event) => {
            $(event.currentTarget).toggleClass("checked");
        });

        xcUIHelper.optionButtonEvent($("#ldapChoice"), (option) => {
            this._ldapChoice = option;
            if (option === "ad") {
                $modal.find(".adOnly").show();
            } else {
                $modal.find(".adOnly").hide();
            }
        });

        $("#loginConfigAdminPassword").on("focusout", (event) => {
            this._validatePassword($(event.currentTarget));
        });

        $("#loginConfigAdminPassword").on("keyup", (event) => {
            let $el = $(event.currentTarget);
            if (event.keyCode === keyCode.Enter) {
                this._validatePassword($el);
            }
            this._calculatePasswordStrength($el);
        });
    }

    private _submitDefaultAdminConfig(): XDPromise<void> {
        let defaultAdminEnabled: boolean = $("#loginConfigEnableDefaultAdmin").find(".checkbox").hasClass("checked");
        if (this._defaultAdminConfig == null) {
            if (defaultAdminEnabled) {
                this._defaultAdminConfig = {};
            } else {
                return PromiseHelper.resolve();
            }
        }

        let adminUsername: string = $("#loginConfigAdminUsername").val();
        let adminEmail: string = $("#loginConfigAdminEmail").val();
        let adminPassword: string = $("#loginConfigAdminPassword").val();
        let adminConfirmPassword: string = $("#loginConfigAdminConfirmPassword").val();

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (adminPassword !== adminConfirmPassword) {
            return PromiseHelper.reject({
                error: LoginConfigTStr.PasswordMismatch,
                isFatal: false
            });
        } else if (this._defaultAdminConfig.defaultAdminEnabled !== defaultAdminEnabled ||
            this._defaultAdminConfig.username !== adminUsername ||
            this._defaultAdminConfig.email !== adminEmail ||
            adminPassword !== ""
        ) {
            if (defaultAdminEnabled) {
                if (adminPassword === "") {
                    return PromiseHelper.reject({
                        error: LoginConfigTStr.EmptyPasswordError,
                        isFatal: false
                    });
                } else if (adminUsername.trim() === "") {
                    return PromiseHelper.reject({
                        error: LoginConfigTStr.EmptyUsernameError,
                        isFatal: false
                    });
                } else if (adminEmail.trim() === "") {
                    return PromiseHelper.reject({
                        error: LoginConfigTStr.EmptyEmailError,
                        isFatal: false
                    });
                }
                let passwordStrength = this._getPasswordStrength(adminPassword, adminUsername.trim());
                if (passwordStrength.strength === "invalid") {
                    return PromiseHelper.reject({
                        error: passwordStrength.hint,
                        isFatal: false
                    });
                }
            }

            setDefaultAdminConfig(hostname, defaultAdminEnabled, adminUsername, adminPassword, adminEmail)
            .then(deferred.resolve)
            .fail((errorMsg) => {
                deferred.reject({
                    error: errorMsg,
                    isFatal: true
                });
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    private _submitMSALConfig(): XDPromise<void> {
        let msalEnabled: boolean = $("#loginConfigEnableMSAL").find(".checkbox").hasClass("checked");
        if (this._msalConfig == null) {
            if (msalEnabled) {
                this._msalConfig = {
                    msal: {
                        azureScopes: []
                    }
                };
            } else {
                return PromiseHelper.resolve();
            }
        }

        let azureScopes: string = $("#loginConfigMSALAzureScopes").val();
        let msal = {
            clientId: $("#loginConfigMSALClientId").val(),
            userScope: $("#loginConfigMSALUserScope").val(),
            adminScope: $("#loginConfigMSALAdminScope").val(),
            b2cEnabled: $("#loginConfigMSALEnableB2C").hasClass("checked") ? true : false,
            webApi: $("#loginConfigMSALWebApi").val(),
            authority: $("#loginConfigMSALAuthority").val(),
            azureEndpoint: $("#loginConfigMSALAzureEndpoint").val(),
            azureScopes: azureScopes === "" ?
                [] : azureScopes.replace(/\s+/g, '').split(',')
        };

        let hasDiffScopes = false;
        if (this._msalConfig.msal.azureScopes.length !== msal.azureScopes.length) {
            hasDiffScopes = true;
        } else {
            hasDiffScopes = this._msalConfig.msal.azureScopes.filter((scope, i) => {
                return scope !== msal.azureScopes[i];
            }).length > 0;
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (this._msalConfig.msalEnabled !== msalEnabled ||
            this._msalConfig.msal.clientId !== msal.clientId ||
            this._msalConfig.msal.webApi !== msal.webApi ||
            this._msalConfig.msal.authority !== msal.authority ||
            this._msalConfig.msal.azureEndpoint !== msal.azureEndpoint ||
            hasDiffScopes ||
            this._msalConfig.msal.userScope !== msal.userScope ||
            this._msalConfig.msal.adminScope !== msal.adminScope ||
            this._msalConfig.msal.b2cEnabled !== msal.b2cEnabled
        ) {
            setMSALConfig(hostname, msalEnabled, msal)
            .then(deferred.resolve)
            .fail((errorMsg) => {
                deferred.reject({
                    error: errorMsg,
                    isFatal: true
                });
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    private _submitLdapConfig(): XDPromise<void> {
        let ldapConfigEnabled: boolean = $("#loginConfigEnableLdapAuth").find(".checkbox").hasClass("checked");
        if (this._ldapConfig == null) {
            if (ldapConfigEnabled) {
                this._ldapConfig = {};
            } else {
                return PromiseHelper.resolve();
            }
        }

        let ldap = {
            ldap_uri: $("#loginConfigLdapUrl").val(),
            userDN: $("#loginConfigLdapUserDn").val(),
            useTLS: $("#loginConfigLdapEnableTLS").hasClass("checked"),
            searchFilter: $("#loginConfigLdapSearchFilter").val(),
            activeDir: (this._ldapChoice === "ad") ? true : false,
            serverKeyFile: $("#loginConfigLdapServerKeyFile").val(),
            adUserGroup: $("#loginConfigADUserGroup").val(),
            adAdminGroup: $("#loginConfigADAdminGroup").val(),
            adDomain: $("#loginConfigADDomain").val(),
            adSubGroupTree: $("#loginConfigEnableADGroupChain").hasClass("checked"),
            adSearchShortName: $("#loginConfigEnableADSearchShortName").hasClass("checked"),
            enableTLS: undefined
        };

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (this._ldapConfig.ldapConfigEnabled !== ldapConfigEnabled ||
            this._ldapConfig.ldap_uri !== ldap.ldap_uri ||
            this._ldapConfig.activeDir !== ldap.activeDir ||
            this._ldapConfig.userDN !== ldap.userDN ||
            this._ldapConfig.searchFilter !== ldap.searchFilter ||
            this._ldapConfig.enableTLS !== ldap.enableTLS || // XXX this is undefined
            this._ldapConfig.serverKeyFile !== ldap.serverKeyFile ||
            this._ldapConfig.adUserGroup !== ldap.adUserGroup ||
            this._ldapConfig.adAdminGroup !== ldap.adAdminGroup ||
            this._ldapConfig.adDomain !== ldap.adDomain ||
            this._ldapConfig.adSubGroupTree !== ldap.adSubGroupTree ||
            this._ldapConfig.adSearchShortName !== ldap.adSearchShortName)
        {
            setLdapConfig(hostname, ldapConfigEnabled, ldap)
            .then(deferred.resolve)
            .fail((errorMsg) => {
                deferred.reject({
                    error: errorMsg,
                    isFatal: true
                });
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    private _validatePassword($input: JQuery): void {
        let userName: string = $("#loginConfigAdminUsername").val();
        let password: string = $("#loginConfigAdminPassword").val();
        let res = this._getPasswordStrength(password, userName);
        if (res.strength === "invalid" && $input.is(":visible")) {
            StatusBox.show(res.hint, $input, false, {"persist": false});
        } else {
            StatusBox.forceHide();
        }
    }

    private _calculatePasswordStrength($input: JQuery): void {
        let userName: string = $("#loginConfigAdminUsername").val();
        let password: string = $("#loginConfigAdminPassword").val();
        let strengthClasses: string = this._getStrengthClasses();
        if (password === "") {
            $input.removeClass(strengthClasses);
            $("#passwordStrengthHint").removeClass(strengthClasses);
            $("#passwordStrengthHint").html("");
            return;
        }
        let res = this._getPasswordStrength(password, userName);
        let classToShow = res.strength;
        let hintToShow = (res.strength === "invalid") ? LoginConfigTStr.invalid : res.hint;
        if (!$input.hasClass(classToShow)) {
            $input.removeClass(strengthClasses).addClass(classToShow);
            $("#passwordStrengthHint").removeClass(strengthClasses).addClass(classToShow);
        }
        if ($("#passwordStrengthHint").html() !== hintToShow) {
            $("#passwordStrengthHint").html(hintToShow);
        }
    }

    private _getPasswordStrength(
        password: string,
        userName: string
    ): {
        strength: string,
        hint: string
    } {
        // MIN Solutions space: (26 * 2 + 10 + 31) ^ 7 = 93 ^ 7 = 6.017e+13
        // Single high-performance computer may attack 2 million keys per second
        // Time taken = 6.017e+13 / 2,000,000,000 = 30085 seconds
        // Do not consider minLength and maxLength currently
        let upperLetterCount = 0;
        let lowerLetterCount = 0;
        let middleDigitCount = 0;
        let middleSymbolCount = 0;
        let digitCount = 0;
        let symbolCount = 0;
        let showsUp = {};
        let duplicateTimes = 0;
        let symbols = "`~!@#$%^&*_-+=|\:;\"\',.?/[](){}<>\\";
        let lowerCaseLetters = "abcdefghijklmnopqrstuvwxyz";
        let upperCaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let digits = "0123456789";
        let orderSymbols = "!@#$%^&*()_+";
        let scores = 0;
        let weakThreshold = 20;
        let strongThreshold = 60;
        let veryStrongThreshold = 80;
        let lowerCasePass = password.toLowerCase();
        let lowerCaseUserName = userName.toLowerCase();

        if ((lowerCaseUserName !== "") &&
            (lowerCasePass === lowerCaseUserName ||
            (lowerCasePass.indexOf(lowerCaseUserName) !== - 1 && lowerCaseUserName.length >= 3) ||
            (lowerCaseUserName.indexOf(lowerCasePass) !== - 1) && lowerCasePass.length >= 3)
        ) {
            return {
                strength: "invalid",
                hint: LoginConfigTStr.duplicateUserName
            };
        }
        for (let i = 0; i < password.length; i++) {
            let curr = password.charAt(i);
            if (curr >= "A" && curr <= "Z") {
                upperLetterCount++;
            } else if (curr >= "a" && curr <= "z") {
                lowerLetterCount++;
            } else if (curr >= "0" && curr <= "9") {
                digitCount++;
                if (i >= 1 && i < password.length - 1) {
                    middleDigitCount++;
                }
            } else if (symbols.indexOf(curr) !== -1) {
                symbolCount++;
                if (i >= 1 && i < password.length - 1) {
                    middleSymbolCount++;
                }
            } else {
                return {
                    "strength": "invalid",
                    "hint": LoginConfigTStr.illegalCharacter
                };
            }
            if (showsUp[curr]) {
                showsUp[curr]++;
            } else {
                showsUp[curr] = 1;
            }
        }

        if (password.length < 3) {
            return {
                "strength": "veryWeak",
                "hint": LoginConfigTStr.veryWeak
            };
        }

        let consecutiveLowerCount = getConsecutive(password, lowerCaseLetters, 3);
        let consecutiveUpperCount = getConsecutive(password, upperCaseLetters, 3);
        let consecutiveDigitCount = getConsecutive(password, digits, 3);
        let sequentialLetterCount = getSequential(password.toLowerCase(), lowerCaseLetters, 3);
        let sequentialDigitcount = getSequential(password, digits, 3);
        let sequentialSymbolCount = getSequential(password, orderSymbols, 3);
        for (let key in showsUp) {
            if (showsUp[key] > 0) {
                duplicateTimes += showsUp[key];
            }
        }
        scores += password.length * 4
               + (password.length - upperLetterCount) * 2
               + (password.length - lowerLetterCount) * 2
               + digitCount * 4
               + symbolCount * 6
               + (middleSymbolCount + middleDigitCount) * 2
               + ((password.length > 10) && ((Object.keys(showsUp).length / password.length) > 0.6) ? password.length * 2 : 0)
               - ((symbolCount === 0 && digitCount === 0) ? password.length : 0)
               - ((symbolCount === 0 && upperLetterCount === 0 && lowerLetterCount === 0) ? password.length : 0)
               - (duplicateTimes / password.length ) * 10
               - consecutiveLowerCount * 2
               - consecutiveUpperCount * 2
               - consecutiveDigitCount * 2
               - sequentialLetterCount * 3
               - sequentialDigitcount * 3
               - sequentialSymbolCount * 3;

        if (scores <= weakThreshold) {
            return {
                "strength": "veryWeak",
                "hint": LoginConfigTStr.veryWeak
            };
        } else if (scores <= strongThreshold) {
            return {
                "strength": "weak",
                "hint": LoginConfigTStr.weak
            };
        } else if (scores <= veryStrongThreshold) {
            return {
                "strength": "strong",
                "hint": LoginConfigTStr.strong
            };
        } else {
            return {
                "strength": "veryStrong",
                "hint": LoginConfigTStr.veryStrong
            };
        }

        // consecutive with each other, like "aaaaab" is has a consecutive string of a
        // with length 5
        function getConsecutive(password, orderString, threshold) {
            var count = 0;
            var currLength = 0;
            for (var i = 0; i < password.length; i++) {
                var curr = password.charAt(i);
                if (orderString.indexOf(curr) === -1) {
                    if (currLength >= threshold) {
                        count += currLength;
                    }
                    currLength = 0;
                } else {
                    currLength++;
                }
            }
            if (currLength >= threshold) {
                count += currLength;
            }
            return count;
        }

        // follow each other in order from smallest to largest, without gaps,
        // like "abcde" is one sequential string
        function getSequential(password, orderString, threshold) {
            var count = 0;
            for (var i = 0; i < orderString.length - (threshold - 1); i++) {
                var str = orderString.substring(i, i + threshold);
                if (password.indexOf(str) !== -1) {
                    count++;
                }
            }
            return count;
        }
    }
}
