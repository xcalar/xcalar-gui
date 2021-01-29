window.InstallerCommon = (function(InstallerCommon, $) {
    /*
    finalStruct
     * {
            "preConfig":false,
            "nfsOption":{
                "option":"xcalarNfs" // either one of "xcalarNfs", "customerNfs", "readyNfs", "doNothing"
                "nfsServer": something     //only for option customerNfs
                "nfsMountPoint": something //only for option customerNfs
                "nfsUsername": something   //only for option customerNfs
                "nfsGroup": something      //only for option customerNfs
                "nfsReuse": something      //only for option readyNfs
                "copy": true or false      //for installer, always false, for upgrader, only true when user choose to copy
            },
            "hostnames":["gui-install-test1"],
            "privHostNames":[],
            "username":"un",
            "port":"22",
            "credentials":{
                // Be either one of the below choice
                "sshKey": "something"
                "password": "something"
                "sshUserSettings":true
            },
            "installationDirectory":"/opt/xcalar/",
            "serializationDirectory":"/SD",
            "ldap":{
                "deployOption" : "xcalarLdap" | "customerLdap" | "configLdapLater"
                "domainName":"a",         // only when xcalarInstall is true
                "password":"b",           // only when xcalarInstall is true
                "companyName":"d",        // only when xcalarInstall is true
                "ldap_uri": "e"           // only when xcalarInstall is false
                "userDN": "f",            // only when xcalarInstall is false
                "searchFilter": "g",      // only when xcalarInstall is false
                "serverKeyFile": "h",     // only when xcalarInstall is false
                "activeDir": "i",         // only when xcalarInstall is false
                "useTLS": "j",            // only when xcalarInstall is false
                "ldapConfigEnabled": "k", // only when xcalarInstall is false
                "adUserGroup": "l",       // only when xcalarInstall is false and activeDir is true
                "adAdminGroup: "m",       // only when xcalarInstall is false and activeDir is true
                "adDomain": "n",          // only when xcalarInstall is false and activeDir is true
                "adSubGroupTree": "o"     // only when xcalarInstall is false and activeDir is true
                "adSearchShortName": "p"  // only where xcalarInstall is false and activeDir is true
            },
            "defaultAdminConfig": {
                "defaultAdminEnabled": true/false  // whether to set the default admin
                "username": "a"
                "email": "b"
                "password": "c"
            },
            "supportBundles":false
            "enableHotPatches": true
        }

    discoverResult
        {"discoverResult": {"hosts": ['fake host 1'],
                            "privHosts": ['fake priv host 1'],
                            "ldapConfig": {
                                            "activeDir": false,
                                            "searchFilter": "(memberof=cn=xceUsers,ou=Groups,dc=xcalar,dc=com)",
                                            "userDN": "mail=%username%,ou=People,dc=xcalar,dc=com",
                                            "useTLS": true,
                                            "serverKeyFile": "/opt/ca/ldap.cert",
                                            "ldap_uri": "ldap://127.0.0.1:389",
                                            "xcalarInstall": false
                                          }
                            "license": "AAAAAABAD92819321820BCAD...",
                            'xcalarMount': {'option': 'readyNfs', 'server': '123', 'path': 'xmount 1'},
                            'xcalarRoot': '/mnt/xcalar',
                            'xcalarSerDes': '/serdes',
                            'enableHotPatches': false
                           }
        }
     */
    var finalStructPrototype = {
        "preConfig": false,
        "nfsOption": {},
        "hostnames": [],
        "privHostNames": [],
        "username": "",
        "port": 22,
        "credentials": {},
        "installationDirectory": null,
        "serializationDirectory": null,
        "ldap": {},
        "defaultAdminConfig": {},
        "supportBundles": false,
        "enableHotPatches": false
    };
    var finalStruct = Object.assign({}, finalStructPrototype);
    var installStatus = {
        "Error": -1,
        "Running": 1,
        "Done": 2
    };
    var discoverResult = {};
    var licenseCheckingApi = "/xdp/license/verification";
    var discoverApi = "/xdp/discover";
    var cancel = false;
    var done = false;
    var strengthClasses = "veryWeak weak strong veryStrong invalid";
    var licenseData = {};

    InstallerCommon.setupForms = function($forms, validateStep, formClass) {
        $forms.find(".buttonSection").on("click", "input.next", function() {
            var $form = $(this).closest("form");
            var curStep = findStepId($form, $forms);
            if (curStep === 0 && (!$("#formArea").hasClass(formClass))) {
                return;
            }
            InstallerCommon.hideFailure($form);
            validateStep(curStep, $form)
            .then(function(returnStructure) {
                if (returnStructure) {
                    jQuery.extend(finalStruct, returnStructure);
                }
                showStep(curStep + 1, $forms);
            })
            .fail(function() {
                InstallerCommon.showFailure($form[0], arguments);
            });
            return false;
        });

        $forms.find(".buttonSection").on("click", "input.back", function() {
            var $form = $(this).closest("form");
            var curStep = findStepId($form, $forms);
            showStep(curStep - 1, $forms);
            return false;
        });

        $forms.find(".buttonSection").on("click", "input.clear", function() {
            var $form = $(this).closest("form");
            clearForm($form, true);
            return false;
        });

        $forms.find("input.cancel").click(function() {
            cancel = true;
            $(this).val("CANCELLING...");
            $(this).addClass("inactive");
        });

        // Set up listeners for radioButtons
        $forms.find(".radioButton").click(function() {
            // If option is the same as before, ignore and return
            if ($(this).hasClass("active")||(!$(this).is(":visible"))) {
                return false;
            }
            var $radioButtonGroup = $(this).closest(".radioButtonGroup");
            var $activeRadio = $(this);
            var $form = $(this).closest("form");
            radioAction($radioButtonGroup, $activeRadio, $form);
            return false;
        });

        $forms.find(".checkboxLine .label").click(function() {
            // If option is the same as before, ignore and return
            var $checkbox = $(this).closest(".checkboxLine").find(".checkbox");
            $checkbox.click();
            return false;
        });

        $forms.find(".defaultAdminParam input").on("keyup", function () {
            calculatePasswordStrength();
        });

        ErrorMessage.setup();
    };

    InstallerCommon.validateKey = function($form) {
        var deferred = PromiseHelper.deferred();
        var finalKey = $form.find(".licenseKey").val();
        // only for upgrader
        if ($form.hasClass("upgrade")) {
            var needUpdate = $form.find(".checkbox:visible").hasClass("checked");
            // update license key in upgrade process is optional
            if (!needUpdate) {
                deferred.resolve();
                return (deferred.promise());
            }
        }

        if (!/^[A-Za-z0-9+\/=]+$/.test(finalKey)) {
            deferred.reject("Invalid license key", "The license key that " +
                            "you have entered is not valid. Please check " +
                            "the key and try again");
            return (deferred.promise());
        }

        checkLicense(finalKey)
        .then(function(hints, ret) {
            if (ret.verified) {
                licenseData = ret.data;
                if (licenseData.NodeCount) {
                    licenseData.NodeCount=parseInt(licenseData.NodeCount);
                }
                if (licenseData.UserCount) {
                    licenseData.UserCount=parseInt(licenseData.UserCount);
                }
                deferred.resolve();
            } else {
                deferred.reject("Invalid server license key", "The license key that " +
                                "you have entered is not valid. Please check " +
                                "the key and try again");
            }
        })
        .fail(function() {
            deferred.reject("Connection Error", "Connection with the " +
                            "authentication server cannot be established.");
        });
        return (deferred.promise());

        function checkLicense(license) {
            return sendViaHttps("POST", licenseCheckingApi,
                                JSON.stringify({"licenseKey": license}));
        }
    };

    InstallerCommon.getLicense = function() {
        return licenseData;
    }

    InstallerCommon.validatePreConfig = function($form) {
        var deferred = PromiseHelper.deferred();
        var preConfigOption = $form.find(".radioButton.active").data("option");
        var res = {};
        res.preConfig = false;
        switch (preConfigOption) {
            case ("yes"):
                res.preConfig = true;
                deferred.resolve(res);
                break;
            case ("no"):
                res.preConfig = false;
                deferred.resolve(res);
                break;
            default:
                deferred.reject("Invalid Choice", "Please choose one Item");
        }
        return deferred.promise();
    };

    InstallerCommon.validateNfs = function($form) {
        var deferred = PromiseHelper.deferred();
        var res = {};
        res.nfsOption = {};
        if ($form.hasClass("upgrade") && $form.find(".checkbox.checked").length === 0) {
            // upgrade choose to not change xcalar root
            res.nfsOption.option = "readyNfs";
            res.nfsOption.nfsReuse = discoverResult.xcalarRoot;
            deferred.resolve(res);
        } else {
            var copyOption = false;
            if ($form.hasClass("upgrade")) {
                copyOption = $form.find(".copyChoice .radioButton.active").data("option") === "xcalarCopy";
            }
            res.nfsOption.copy = copyOption;
            var nfsOption = $form.find(".nfsChoice .radioButton.active").data("option");
            switch (nfsOption) {
                case ("xcalarNfs"):
                    res.nfsOption.option = "xcalarNfs";
                    deferred.resolve(res);
                    break;
                case ("customerNfs"):
                    if ($form.find(".nfsServer").val().trim().length === 0) {
                        deferred.reject("NFS Server Invalid",
                            "You must provide a valid NFS Server IP or FQDN");
                    } else if ($form.find("input.nfsMountPoint").val().trim().length === 0) {
                        deferred.reject("NFS MountPoint Invalid",
                            "You must provide a valid NFS Mount Point");
                    } else {
                        res.nfsOption.option = "customerNfs";
                        res.nfsOption.nfsServer = getVal($form.find(".nfsServer"));
                        res.nfsOption.nfsMountPoint = removeDuplicateSlash(getVal($form.find("input.nfsMountPoint")));
                        res.nfsOption.nfsUsername = getVal($form.find(".nfsUserName"));
                        res.nfsOption.nfsGroup = getVal($form.find(".nfsUserGroup"));
                        deferred.resolve(res);
                    }
                    break;
                case ("readyNfs"):
                    if (getVal($form.find(".nfsMountPointReady")).length === 0) {
                        deferred.reject("NFS Mount Path Invalid",
                            "You must provide a valid NFS Mount Path");
                    } else {
                        res.nfsOption.option = "readyNfs";
                        res.nfsOption.nfsReuse = removeDuplicateSlash(getVal($form.find(".nfsMountPointReady")));
                        deferred.resolve(res);
                    }
                    break;
                default:
                    deferred.reject("Invalid Choice", "Please choose one Item");
            }
        }
        return deferred.promise();
    };

    InstallerCommon.validateHosts = function($form, withoutPrivHost) {
        var res = {};
        var hostArray = $form.find(".row .hostname .publicName input");
        var hostPrivateArray = $form.find(".row .hostname .privateName input");
        var allHosts = [];
        var allPrivHosts = [];
        for (var i = 0; i < hostArray.length; i++) {
            var nameOrIP = getVal(hostArray.eq(i));
            if (!withoutPrivHost) {
                var privNameOrIp = getVal(hostPrivateArray.eq(i));
            }
            if (nameOrIP.length > 0) {
                allHosts.push(nameOrIP);
                if (!withoutPrivHost && (privNameOrIp.length > 0)) {
                    allPrivHosts.push(privNameOrIp);
                }
            } else {
                if (!withoutPrivHost && (privNameOrIp.length > 0)) {
                    return {
                        "error": [
                            "No public name",
                            "You must provide a public name for all private names"
                        ]
                    };
                }
            }
        }

        if (allHosts.length === 0) {
            return {
                "error": [
                    "No hosts",
                    "You must install on at least 1 host"
                ]
            };
        }

        if (allPrivHosts.length !== 0 &&
            allPrivHosts.length !== allHosts.length) {
            return {
                "error": [
                    "Private / Public Hostname Error",
                    "Either provide private hostnames / IPs for all or none of the hosts"
                ]
            };
        }

        // Find dups
        for (i = 0; i < allHosts.length; i++) {
            if (allHosts.indexOf(allHosts[i], i+1) > -1) {
                return {
                    "error": [
                        "Duplicate Hosts",
                        "Public Hostname " + allHosts[i] + " is a duplicate"
                    ]
                };
            }

            if (!withoutPrivHost) {
                if (allPrivHosts.indexOf(allPrivHosts[i], i+1) > -1) {
                    return {
                        "error": [
                            "Duplicate Hosts",
                            "Private Hostname " + allPrivHosts[i] + " is a duplicate"
                        ]
                    };
                }
            }
        }

        res.hostnames = allHosts;
        res.privHostNames = allPrivHosts;
        return res;
    };

    InstallerCommon.validateInstallationDirectory = function($form) {
        var res = {};
        res.installationDirectory = null;
        // only tarball - installer has installation directory option
        if ($form.find(".installationDirectorySection").length === 0) {
            return res;
        }
        var installationDirectory = getVal($form.find(".installationDirectorySection input"));
        if (installationDirectory.length === 0) {
            return {
                "error": [
                    "Empty Installation Directory",
                    "Please assign a value to Installation Directory"
                ]
            };
        } else {
            res.installationDirectory = removeDuplicateSlash(installationDirectory);
            return res;
        }
    };

    InstallerCommon.validateSerializationDirectory = function($form) {
        var res = {};
        res.serializationDirectory = null;
        var serdesChoice = $form.find(".SERDESChoice .radioButton.active").data("option");
        if (serdesChoice === "xcalarRootDirectory") {
            return res;
        } else {
            var serializationDirectory = getVal($form.find(".serializationDirectorySection .SERDESDirectory input"));
            if (serializationDirectory.length === 0) {
                return {
                    "error": [
                        "Empty Serialization / Deserialization Directory",
                        "Please assign a value to Serialization / Deserialization Directory"
                    ]
                };
            } else {
                res.serializationDirectory = removeDuplicateSlash(serializationDirectory);
                return res;
            }
        }
    };

    InstallerCommon.validateSupportBundles = function($form) {
        var res = {};
        res.supportBundles = $form.find(".checkbox.supportBundles")
                                  .hasClass("checked");
        return res;
    };

    InstallerCommon.validateEnableHotPatches = function($form) {
        var res = {};
        res.enableHotPatches = $form.find(".checkbox.selectHotPatch")
            .hasClass("checked");
        return res;
    };

    InstallerCommon.validateCredentials = function($form) {
        var res = {};
        res.credentials = {};
        var $hostInputs = $form.find(".hostUsername input:visible");
        var passOption = $form.find(".passwordChoice .active").data("option");
        for (var i = 0; i < $hostInputs.length; i++) {
            if ($hostInputs.eq(i).val().trim().length === 0) {
                return {
                    "error": [
                        "Empty Username / Port",
                        "Your SSH username / port cannot be empty."
                    ]
                };
            }
        }
        res.username = getVal($hostInputs.eq(0));
        res.port = getVal($hostInputs.eq(1));

        switch (passOption) {
            case ("password"):
                if ($form.find(".hostPassword input").val().length === 0) {
                    return {
                        "error": [
                            "Empty Password",
                            "For passwordless ssh, upload your ssh key"
                        ]
                    };
                } else {
                    res.credentials.password = $form.find(".hostPassword input").val();
                    return res;
                }
                break;
            case ("sshKey"):
                if (getVal($form.find(".hostSshKey textarea")).length === 0) {
                    return {
                        "error": [
                            "Empty Ssh Key",
                            "Your ssh key is generally located at ~/.ssh/id_rsa"
                        ]
                    };
                } else {
                    res.credentials.sshKey = getVal($form.find(".hostSshKey textarea"));
                    return res;
                }
                break;
            case ("sshUserSettings"):
                res.credentials.sshUserSettings = true;
                return res;
            default:
                return {
                    "error": [
                        "Illegal Password Option",
                        "Not a legal password option"
                    ]
                };
        }
    };

    InstallerCommon.setupLoginConfiguration = function($form) {
        finalStruct.ldap = {};
        finalStruct.defaultAdminConfig = {};
        var funcs = [
            InstallerCommon.validateLdap,
            InstallerCommon.validateDefaultAdminUser
        ];
        return callSyncFunctions($form, funcs);
    };

    function callSyncFunctions($form, funcs, inputArgs) {
        var deferred = PromiseHelper.deferred();
        var result = {};
        var hasError = false;
        var errorArg = null;

        function checkError(validateRes) {
            if (validateRes.hasOwnProperty("error")) {
                errorArg = validateRes.error;
                return true;
            } else {
                jQuery.extend(result, validateRes);
                return false;
            }
        }

        for (var i in funcs) {
            var func = funcs[i];
            if (hasError) {
                break;
            } else {
                if (inputArgs && inputArgs[i]) {
                    hasError = hasError || checkError(func($form, inputArgs[i]));
                } else {
                    hasError = hasError || checkError(func($form));
                }
            }
        }
        if (hasError){
            deferred.reject(errorArg[0], errorArg[1]);
        } else {
            jQuery.extend(finalStruct, result);
            deferred.resolve();
        }
        return deferred.promise();
    }

    InstallerCommon.validateLdap = function($form) {
        var res = {};
        res.ldap = {};

        var ldapType = $form.find(".radioButtonGroup .radioButton.ldapType.active")
                       .data("option");
        switch (ldapType) {
            case ("xcalarLdap"):
                return handleXcalarDeployLdap();
            case ("customerLdap"):
                return handleCustomerLdap();
            case ("configLdapLater"):
                return handleConfigLdapLater();
            default:
                return {
                    "error": [
                        "Illegal LDAP Option",
                        "Not a legal ldap option"
                    ]
                };
        }

        function handleConfigLdapLater() {
            res.ldap.deployOption = "configLdapLater";
            return res;
        }

        function handleXcalarDeployLdap() {
            var $params = $form.find(".ldapParams.xcalarLdapOptions input");
            if (!checkPopulated($params)) {
                return {
                    "error": [
                        "Blank arguments",
                        "Please populate all fields"
                    ]
                };
            }

            if ($params.eq(1).val() !==
                $params.eq(2).val()) {
                return {
                    "error": [
                        "Passwords different",
                        "Passwords must be the same"
                    ]
                };
            }
            res.ldap = {
                "deployOption": "xcalarLdap",
                "domainName": getVal($params.eq(0)),
                "password": getVal($params.eq(1)),
                "companyName": getVal($params.eq(3)),
            };
            return res;
        }

        function handleCustomerLdap() {
            var $params = $form.find(".ldapParams.customerLdapOptions input");
            if (!$form.find("#ADChoice .active").length) {
                return {
                    "error": [
                        "AD or OpenLDAP",
                        "Please select AD or OpenLDAP"
                    ]
                };
            }
            if (!checkPopulated($params.find(":not(.ADOnly)"))) {
                return {
                    "error": [
                        "Blank arguments",
                        "Please populate all fields"
                    ]
                };
            }
            res.ldap = {
                "deployOption": "customerLdap",
                "ldap_uri": getVal($params.eq(0)),
                "userDN": getVal($params.eq(1)),
                "searchFilter": getVal($params.eq(2)),
                "serverKeyFile": getVal($params.eq(3)),
                "activeDir": $form.find("#ADChoice .radioButton.active")
                                   .data("option"),
                "useTLS": $form.find(".checkbox.TLSChoice")
                    .hasClass("checked"),
                "ldapConfigEnabled": true
            };
            if (res.ldap.activeDir) {
                res.ldap.adUserGroup = getVal($params.eq(4));
                res.ldap.adAdminGroup = getVal($params.eq(5));
                res.ldap.adDomain = getVal($params.eq(6));
                res.ldap.adSubGroupTree = $form.find(".checkbox.adSubGroupTree")
                    .hasClass("checked");
                res.ldap.adSearchShortName = $form.find(".checkbox.adSearchShortName")
                    .hasClass("checked");

                var propArray = [ 'adUserGroup', 'adAdminGroup',
                                  'adDomain' ];
                for (var ii = 0; ii < propArray.length; ii++) {
                    if (res.ldap[propArray[ii]].length === 0) {
                        delete res.ldap[propArray[ii]];
                    }
                }
            }
            return res;
        }

        function checkPopulated($inputs) {
            // Check that all fields are populated
            var allPopulated = true;
            for (i = 0; i < $inputs.length; i += 1) {
                if ($.trim($inputs.eq(i).val()).length === 0) {
                    allPopulated = false;
                }
            }
            return allPopulated;
        }
    };

    InstallerCommon.validateDefaultAdminUser = function($form) {
        var res = {};
        res.defaultAdminConfig = {};
        res.defaultAdminConfig.defaultAdminEnabled = false;

        if ($form.find(".createDefaultAdmin").hasClass("checked")) {
            var userName = $("#defaultAdminUsername").val();
            var email = $("#defaultAdminEmail").val();
            var password = $("#defaultAdminPassword").val();
            var passwordConfirm = $("#defaultAdminPasswordConfirm").val();

            if (userName.length === 0 || email.length === 0 ||
                password.length === 0 || passwordConfirm.length === 0) {
                return {
                    "error": [
                        "Blank arguments",
                        "Please populate all fields"
                    ]
                };
            }
            if (userName !== userName.toLowerCase()) {
                return {
                    "error": [
                        "Default admin username contains capital letters",
                        "Default admin username must be all lowercase letters"
                    ]
                };
            }
            if (password !== passwordConfirm) {
                return {
                    "error": [
                        "Passwords different",
                        "Passwords must be the same"
                    ]
                };
            }
            var passwordStrength = getPasswordStrength(password, userName);
            if (passwordStrength.strength === "invalid") {
                return {
                    "error": [
                        LoginConfigTStr.invalid,
                        "The password is invalid, try another password"
                    ]
                };
            } else {
                res.defaultAdminConfig.defaultAdminEnabled = true;
                res.defaultAdminConfig.username = userName;
                res.defaultAdminConfig.email = email;
                res.defaultAdminConfig.password = password;
                return res;
            }
        } else {
            if ($form.find(".radioButton[data-option='configLdapLater']").hasClass("active")) {
                return {
                    "error": [
                        "Blank Login Configurations",
                        "Please either setup LDAP or enable default admin account"
                    ]
                };
            }
            return res;
        }
    };

    function calculatePasswordStrength() {
        var userName = $("#defaultAdminUsername").val();
        var password = $("#defaultAdminPassword").val();
        if (password === "") {
            $("#passwordStrength").removeClass(strengthClasses);
            $("#passwordStrength .strength").html("");
            return;
        }
        var res = getPasswordStrength(password, userName);
        var classToShow = res.strength;
        var hintToShow = (res.strength === "invalid") ?
                    (LoginConfigTStr.invalid + ":" + res.hint) : (res.hint);
        if (!$("#passwordStrength").hasClass(classToShow)) {
            $("#passwordStrength").removeClass(strengthClasses).addClass(classToShow);
        }
        if ($("#passwordStrength .strength").html() !== hintToShow) {
            $("#passwordStrength .strength").html(hintToShow);
        }
    }

    InstallerCommon.validateSettings = function($form) {
        var funcs = [
            InstallerCommon.validateHosts,
            InstallerCommon.validateInstallationDirectory,
            InstallerCommon.validateSerializationDirectory,
            InstallerCommon.validateSupportBundles,
            InstallerCommon.validateEnableHotPatches,
            InstallerCommon.validateCredentials
        ];
        return callSyncFunctions($form, funcs);
    };

    function findStepId($form, $forms) {
        var curStepNo = -1;
        for (var i = 0; i < $forms.length; i++) {
            if ($forms.eq(i).attr("id") === $form.attr("id")) {
                curStepNo = i;
                break;
            }
        }
        if (curStepNo < 0) {
            console.error("Invalid form id");
            return -1;
        }
        return (curStepNo);
    }

    function showStep(stepNum, $forms) {
        var lastStep = $forms.length - 1;
        if (stepNum > lastStep) {
            return;
        }
        var $form = $forms.eq(stepNum);
        clearForm($form);
        $forms.addClass("hidden");
        $form.removeClass("hidden");
    }

    InstallerCommon.prepareStart = function($form, doingString, doingLower) {
        $form.find(".row .curStatus").text(doingLower);
        var $exeButton = $form.find(".next");
        $exeButton.val(doingString).addClass("inactive");
        $form.find("input.back").addClass("inactive").hide();
        $form.find("input.cancel").removeClass("inactive");
        $form.find("input.cancel").removeClass("hidden");
    };

    InstallerCommon.startOperation = function(startApi) {
        return InstallerCommon.sendViaHttps("POST", startApi, JSON.stringify(finalStruct));
    };

    InstallerCommon.getStatus = function($form, statusApi) {
        var deferred = PromiseHelper.deferred();
        var intervalTimer;
        var checkInterval = 2000;
        clearInterval(intervalTimer);
        intervalTimer = setInterval(function() {
            if (cancel) {
                cancel = false;
                $form.find("input.cancel").val("CANCEL");
                $form.find("input.cancel").removeClass("inactive");
                clearInterval(intervalTimer);
                intervalTimer = undefined;
                deferred.reject("Cancelled", "Operation cancelled");
            } else {
                if (intervalTimer) {
                    InstallerCommon.sendViaHttps("POST", statusApi, JSON.stringify(finalStruct))
                    .then(function(hints, ret) {
                        if (ret.curStepStatus === installStatus.Done) {
                            done = true;
                            clearInterval(intervalTimer);
                            intervalTimer = undefined;
                            deferred.resolve();
                        } else if (ret.curStepStatus === installStatus.Error) {
                            if (ret.errorLog) {
                                console.log(ret.errorLog);
                            }
                            clearInterval(intervalTimer);
                            intervalTimer = undefined;
                            deferred.reject("Status Error", ret);
                        }
                        if (!done) {
                            InstallerCommon.updateStatus($form, ret.retVal);
                        }
                    })
                    .fail(function() {
                        clearInterval(intervalTimer);
                        intervalTimer = undefined;
                        deferred.reject("Connection Error",
                                        "Connection to server cannot be " +
                                        "established. " +
                                        "Please contact Xcalar Support.");
                    });
                }
            }
        }, checkInterval);
        return deferred.promise();
    };

    InstallerCommon.showFailure = function($form, args) {
        for (var i = 0; i < args.length; i++) {
            if (!args[i]) {
                args[i] = "Unknown Error";
            }
        }
        if (!args[1]) {
            args[1] = "Error";
        }
        $error = $($form).find(".error");
        $error.find("span").eq(0).html(args[0] + "<br>");
        $error.find("span").eq(1).html(args[1]);
        $error.show();
    }

    InstallerCommon.hideFailure = function($form) {
        $form.find(".error").find("span").html("");
        $form.find(".error").hide();
    }

    function clearForm($form, withReset) {
        if (withReset) {
            $form[0].reset();
            if ($form.find("#numServers").length > 0) {
                clearNumberServer($form);
            }
            if ($form.find("#passwordStrength").length > 0) {
                $("#passwordStrength").removeClass(strengthClasses);
                $("#passwordStrength .strength").html("");
            }
        }
        InstallerCommon.hideFailure($form);
        function clearNumberServer($form) {
            $form.prop("disabled", false);
            $form.find(".hostnameSection").addClass("hidden");
            $form.find(".credentialSection").addClass("hidden");
            $form.find(".installationDirectorySection").addClass("hidden");
            $form.find(".serializationDirectorySection").addClass("hidden");
            $form.find(".hotPatchSection").addClass("hidden");
            $form.find(".supportBundleSection").addClass("hidden");
            $form.find(".title").addClass("hidden");
            $form.find(".title").eq(0).removeClass("hidden");
            $form.find(".row .curStatus").text("");
            $("#installButton").addClass("hidden");
            $("#serversButton").removeClass("hidden");
        }
    }

    function clearAllForms() {
        var $forms = $("form");
        for (var i = 0; i < $forms.length; i++) {
            clearForm($forms.eq(i), true);
        }
    }

    InstallerCommon.handleComplete = function($form) {
        var $rows = $form.find(".row .curStatus");
        for (var i = 0; i < $rows.length; i++) {
            var $row = $($rows[i]);
            $row.text("Complete!");
        }
    };

    InstallerCommon.handleFail = function($form, prevString, doingLower) {
        $form.find("input.next").val(prevString).removeClass("inactive");
        $form.find("input.back").removeClass("inactive").show();
        $form.find("input.cancel").addClass("hidden");
        setTimeout(function() {
            $form.find(".animatedEllipsis").remove();
        }, 1000);

        var $rows = $form.find(".row .curStatus");
        for (var i = 0; i < $rows.length; i++) {
            var $row = $($rows[i]);
            var status = $row.text();
            if (status.indexOf(doingLower) === 0) {
                $row.text("Failed");
                continue;
            }
            if (status.indexOf("(") === -1) {
                continue;
            }
            var revS = status.split('').reverse().join('');
            var endIndex = status.length - revS.indexOf("(");
            var noStatus = status.substring(0, endIndex-1);
            $row.text(noStatus+"(Cancelled)");
        }
    };

    InstallerCommon.finalize = function($form, isTarball) {
        // This function is called when everything is done.
        // Maybe we can remove the installer here?
        // Redirect to first node's index
        var hostname = finalStruct.hostnames[0];
        var port = 443;
        var tarballPort = 8443;
        $form.find(".btn.next").val("LAUNCH XD")
             .removeClass('next')
             .removeClass('inactive')
             .addClass("redirect");
        $form.find(".redirect").click(function() {
            if (isTarball) {
                // tarball installer
                window.location = "https://" + hostname + ":" + tarballPort + "/assets/htmlFiles/login.html";
            } else {
                window.location = "https://" + hostname + ":" + port + "/assets/htmlFiles/login.html";
            }
        });
        $form.find(".section").hide();
        $form.find(".title").hide();
        $form.find(".successSection").show();
        $form.find(".buttonSection").show();
        if ($form.find(".btn.clear").length > 0) {
            $form.find(".btn.clear").hide();
        }
        $form.find(".btn.back").hide();
        $form.find(".btn.cancel").hide();
    };

    function radioAction($radioButtonGroup, $activeRadio, $form) {
        $radioButtonGroup.find("> .radioButton").removeClass("active");
        $activeRadio.addClass("active");
        var radioGroup = $radioButtonGroup.attr("id");
        var radioOption = $activeRadio.data("option");
        switch (radioGroup) {
            case ("installChoice"):
                $("#choiceForm .btn.next").removeClass("btn-disabled");
                $("#formArea").removeClass("install")
                              .removeClass("upgrade")
                              .removeClass("uninstall")
                              .addClass(radioOption);
                $("#installerContainer").removeClass("install")
                              .removeClass("upgrade")
                              .removeClass("uninstall")
                              .addClass(radioOption);
                clearAllForms();
                resetFinalStruct();
                break;
            case ("preConfigChoice"):
            case ("preConfigUpgradeChoice"):
                switch (radioOption) {
                    // Xcalar Deployed Shared Storage
                    case ("yes"):
                        $(".container").addClass("preConfig");
                        break;
                    // Existing Shared Storage to be Mounted
                    case ("no"):
                        $(".container").removeClass("preConfig");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("nfsChoice"):
            case ("upgradeNfsChoice"):
                $form.find(".customerNfsOptions").hide();
                $form.find(".readyNfsOptions").hide();
                switch (radioOption) {
                    // Xcalar Deployed Shared Storage
                    case ("xcalarNfs"):
                        break;
                    // Existing Shared Storage to be Mounted
                    case ("customerNfs"):
                        $form.find(".customerNfsOptions").show();
                        $form.find(".readyNfsOptions input").val("");
                        break;
                    // Existing Shared Storage Already Mounted
                    case ("readyNfs"):
                        $form.find(".readyNfsOptions").show();
                        $form.find(".customerNfsOptions input").val("");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("passwordChoice"):
            case ("uninstallPasswordChoice"):
            case ("upgradePasswordChoice"):
                $form.find(".hostSshKey").hide();
                $form.find(".hostPassword").hide();
                switch (radioOption) {
                    case ("password"):
                        $form.find(".hostPassword").show();
                        break;
                    case ("sshKey"):
                        $form.find(".hostSshKey").show();
                        break;
                    case ("sshUserSettings"):
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("ldapDeployChoice"):
                switch (radioOption) {
                    case ("customerLdap"):
                        $form.find(".customerLdapOptions").removeClass("hidden");
                        $form.find(".xcalarLdapOptions").addClass("hidden");
                        break;
                    case ("xcalarLdap"):
                        $form.find(".xcalarLdapOptions").removeClass("hidden");
                        $form.find(".customerLdapOptions").addClass("hidden");
                        break;
                    case ("configLdapLater"):
                        $form.find(".xcalarLdapOptions").addClass("hidden");
                        $form.find(".customerLdapOptions").addClass("hidden");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            case ("ADChoice"):
                var inputs;
                switch (radioOption) {
                    case (true):
                        // AD
                        inputs = $form.find(".fieldWrap .inputWrap input");
                        inputs.eq(4).attr("placeholder",
                                            "[ldap://adserver.company.com:3268]");
                        inputs.eq(5).attr("placeholder",
                                          "[dc=company,dc=com]");
                        inputs.eq(6).attr("placeholder",
                       "[(&(objectclass=user)(userPrincipalName=%username%))]");
                        inputs.eq(7).attr("placeholder",
                                        "[/etc/pki/tls/cert.pem]");
                        $form.find(".ADOnly").show();
                        break;
                    case (false):
                        // LDAP
                        inputs = $form.find(".fieldWrap .inputWrap input");
                        inputs.eq(4).attr("placeholder",
                                         "[ldap://ldapserver.company.com:389]");
                        inputs.eq(5).attr("placeholder",
                         "[mail=%username%,ou=People,dc=company,dc=com]");
                        inputs.eq(6).attr("placeholder",
                  "[(memberof=cn=users,ou=Groups,dc=company,dc=com)]");
                        inputs.eq(7).attr("placeholder",
                                        "[/etc/pki/tls/cert.pem]");
                        $form.find(".ADOnly").hide();
                        break;
                }
                break;
            case ("copyChoice"):
                break;
            case ("SERDESChoice"):
                switch (radioOption) {
                    case ("xcalarRootDirectory"):
                        $form.find(".SERDESDirectory").addClass("hidden");
                        break;
                    case ("otherDirectory"):
                        $form.find(".SERDESDirectory").removeClass("hidden");
                        break;
                    default:
                        console.error("Unexpected option!");
                        break;
                }
                break;
            default:
                console.error("Unexpected radio group!");
                break;
        }
    }

    InstallerCommon.validateDiscover = function($form, $forms) {
        var deferred = PromiseHelper.deferred();
        var prevString = "DISCOVER";
        var doingString = "DISCOVERING...";
        $form.find("input.next").val(doingString).addClass("inactive");
        $form.find("input.back").addClass("inactive").hide();
        $form.find(".section:not(.buttonSection) input").prop("disabled", true);
        $form.find(".radioButtonGroup").addClass("unclickable");

        function validateForm() {
            var funcs = [
                InstallerCommon.validateHosts,
                InstallerCommon.validateInstallationDirectory,
                InstallerCommon.validateCredentials
            ];
            var inputArgs = [true];
            return callSyncFunctions($form, funcs, inputArgs);
        }

        validateForm()
        .then(function() {
            return InstallerCommon.sendViaHttps("POST", discoverApi, JSON.stringify(finalStruct));
        })
        .then(function(hints, res) {
            discoverResult = res.discoverResult;
            appendHostsHtml(discoverResult.hosts);
            appendMountPoint(discoverResult.xcalarMount);
            finalStruct.hostnames = discoverResult.hosts;
            finalStruct.privHostNames = discoverResult.privHosts;
            finalStruct.ldap = discoverResult.ldapConfig;
            finalStruct.ldap.xcalarInstall = false;
            if (discoverResult.xcalarSerDes) {
                finalStruct.serializationDirectory = discoverResult.xcalarSerDes;
            }
            finalStruct.enableHotPatches = discoverResult.enableHotPatches;
            deferred.resolve();
        })
        .fail(function(arg1, arg2) {
            InstallerCommon.showErrorModal(arg2);
            if (typeof(arg2) === "object") {
                arg2 = JSON.stringify(arg2);
            }
            deferred.reject("Failed to discover", arg1 + ": " + arg2);
        })
        .always(function() {
            $form.find("input.next").val(prevString).removeClass("inactive");
            $form.find("input.back").removeClass("inactive").show();
            $form.find(".section:not(.buttonSection) input").prop("disabled", false);
            $form.find(".radioButtonGroup").removeClass("unclickable");
        });
        return deferred.promise();

        function appendHostsHtml(hosts) {
            var html = "";
            for (var i = 0; i < hosts.length; i++) {
                html += hostnameHtml(hosts[i]);
            }
            $forms.closest(".hostList").find(".row:not(.header)").remove();
            $forms.closest(".hostList").find(".row.header").after(html);
            function hostnameHtml(host) {
                return '<div class="row">' +
                    '<div class="leftCol hostname">' +
                      '<div class="publicName">' +
                        '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                        'value=" ' + host + '"' + 'name="useless" disabled>' +
                        '<div class="bar">Public</div>' +
                      '</div>' +
                    '</div>' +
                    '<div class="rightCol status">' +
                      '<span class="curStatus">' +
                        '----' +
                      '</span>' +
                    '</div>' +
                '</div>';
            }
        }

        function appendMountPoint(xcalarMount) {
            if (xcalarMount && xcalarMount.server) {
                var $server = $forms.closest("form.shareStorage").find(".discoverServer .text");
                if ($server.length > 0) {
                    $server.text(xcalarMount.server);
                }
            }
            if (xcalarMount && xcalarMount.path) {
                $path = $forms.closest("form.shareStorage").find(".discoverMountPath .text");
                if ($path.length > 0) {
                    $path.text(xcalarMount.path);
                }
            }
        }
    };

    InstallerCommon.prepareUninstall = function() {
        finalStruct.nfsOption = {};
        switch (discoverResult.xcalarMount.option) {
            case 'customerNfs':
                finalStruct.nfsOption.option = discoverResult.xcalarMount.option;
                finalStruct.nfsOption.nfsServer = discoverResult.xcalarMount.server;
                finalStruct.nfsOption.nfsMountPoint = discoverResult.xcalarMount.path;
                break;
            case 'readyNfs':
                finalStruct.nfsOption.option = discoverResult.xcalarMount.option;
                finalStruct.nfsOption.nfsReuse = discoverResult.xcalarMount.path;
                break;
            case 'xcalarNfs':
                finalStruct.nfsOption.option = discoverResult.xcalarMount.option;
                break;
        }
    };

    InstallerCommon.sendViaHttps = function(action, url, arrayToSend) {
        return sendViaHttps(action, url, arrayToSend);
    };

    InstallerCommon.updateStatus = function($form, ret) {
        for (var i = 0; i < ret.length; i++) {
            $form.find(".row .curStatus").eq(i).text(ret[i]);
            if (ret[i].indexOf("(Done)") === -1) {
                addMovingDots($form.find(".row .curStatus").eq(i));
            }
        }

        function addMovingDots($ele) {
            var text = $ele.text().trim();
            var html = '<div class="animatedEllipsisWrapper">' +
                            '<div class="text">' +
                                text +
                            '</div>' +
                            '<div class="animatedEllipsis">' +
                              '<div>.</div>' +
                              '<div>.</div>' +
                              '<div>.</div>' +
                            '</div>' +
                        '</div>';
            $ele.html(html);
        }
    };

    InstallerCommon.showErrorModal = function(ret) {
        if (ret && (typeof ret === "object")) {
            ErrorMessage.show({
                "errorCode": ret.status,
                "description": "Unknown",
                "errorMessage": ret.errorLog,
                "installationLogs": ret.installationLogs
            });
        }
    };

    InstallerCommon.appendHostsHtml = function(hosts, $form) {
        var html = "";
        for (var i = 0; i < hosts.length; i++) {
            html += hostnameHtml(hosts[i]);
        }
        $form.find(".row").last().after(html);
        function hostnameHtml(host) {
            return '<div class="row">' +
                '<div class="leftCol hostname">' +
                  '<div class="publicName">' +
                    '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                    'value=" ' + host + '"' + 'name="useless" disabled>' +
                    '<div class="bar">Public</div>' +
                  '</div>' +
                '</div>' +
                '<div class="rightCol status">' +
                  '<span class="curStatus">' +
                    '----' +
                  '</span>' +
                '</div>' +
            '</div>';
        }
    };

    function getVal($ele) {
        return $($ele).val().trim();
    }

    function removeDuplicateSlash(input) {
        var output = input;
        if (input.indexOf("/") !== 0) {
            output = "/" + output;
        }
        if (output.charAt(output.length - 1) === "/") {
            output = output.substring(0, output.length - 1);
        }
        return output;
    }

    // The hint is the first parameter, while the return JSON object is the second parameter
    function sendViaHttps(action, url, arrayToSend) {
        var deferred = PromiseHelper.deferred();
        try {
            jQuery.ajax({
                method: action,
                url: document.location.origin + "/install" + url,
                data: arrayToSend,
                contentType: "application/json",
                success: function(ret) {
                    deferred.resolve("Request is handled successfully", ret);
                },
                error: function(xhr) {
                    if (xhr.responseJSON) {
                        // under this case, server sent the response and set
                        // the status code
                        deferred.reject("Return Status Error", xhr.responseJSON);
                    } else {
                        // under this case, the error status is not set by
                        // server, it may due to other reasons
                        deferred.reject("Connection Error",
                            "Connection to server cannot be established. " +
                            "Please contact Xcalar Support.");
                    }
                }
            });
        } catch (e) {
            // XXX Handle the different statuses and display relevant
            // error messages
            deferred.reject("Ajax Error");
        }
        return deferred.promise();
    }

    function resetFinalStruct() {
        jQuery.extend(finalStruct, finalStructPrototype);
    }

    function getPasswordStrength(password, userName) {
        // MIN Solutions space: (26 * 2 + 10 + 31) ^ 7 = 93 ^ 7 = 6.017e+13
        // Single high-performance computer may attack 2 million keys per second
        // Time taken = 6.017e+13 / 2,000,000,000 = 30085 seconds
        // Do not consider minLength and maxLength currently
        // var minLength = 7;
        // var maxLength = 128;
        var upperLetterCount = 0;
        var lowerLetterCount = 0;
        var middleDigitCount = 0;
        var middleSymbolCount = 0;
        var digitCount = 0;
        var symbolCount = 0;
        var showsUp = {};
        var duplicateTimes = 0;
        var symbols = "`~!@#$%^&*_-+=|\:;\"\',.?/[](){}<>\\";
        var lowerCaseLetters = "abcdefghijklmnopqrstuvwxyz";
        var upperCaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var digits = "0123456789";
        var orderSymbols = "!@#$%^&*()_+";
        var scores = 0;
        var weakThreshold = 20;
        var strongThreshold = 60;
        var veryStrongThreshold = 80;

        // if (password.length < minLength) {
        //     return {
        //         "strength": "invalid",
        //         "hint": LoginConfigTStr.shortPassword
        //     }
        // }
        // if (password.length > maxLength) {
        //     return {
        //         "strength": "invalid",
        //         "hint": LoginConfigTStr.longPassword
        //     }
        // }
        var lowerCasePass = password.toLowerCase();
        var lowerCaseUserName = userName.toLowerCase();
        if ((lowerCaseUserName !== "") &&
            (lowerCasePass === lowerCaseUserName ||
            (lowerCasePass.indexOf(lowerCaseUserName) !== - 1 && lowerCaseUserName.length >= 3) ||
            (lowerCaseUserName.indexOf(lowerCasePass) !== - 1) && lowerCasePass.length >= 3)) {
            return {
                "strength": "invalid",
                "hint": LoginConfigTStr.duplicateUserName
            };
        }
        for (var i = 0; i < password.length; i++) {
            var curr = password.charAt(i);
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
        // if (upperLetterCount == 0 || lowerLetterCount == 0 || digitCount == 0 || symbolCount == 0) {
        //     return {
        //         "strength": "invalid",
        //         "hint": LoginConfigTStr.atLeastOne
        //     }
        // }
        if (password.length < 3) {
            return {
                "strength": "veryWeak",
                "hint": LoginConfigTStr.veryWeak
            };
        }

        // scores += password.length * 5
        //        + (digitCount > 3 ? 10 : 0)
        //        + (symbolCount > 3 ? 10 : 0)
        //        + ((Object.keys(showsUp).length / password.length) > 0.6 ? 15 : 0);

        var consecutiveLowerCount = getConsecutive(password, lowerCaseLetters, 3);
        var consecutiveUpperCount = getConsecutive(password, upperCaseLetters, 3);
        var consecutiveDigitCount = getConsecutive(password, digits, 3);
        var sequentialLetterCount = getSequential(password.toLowerCase(), lowerCaseLetters, 3);
        var sequentialDigitcount = getSequential(password, digits, 3);
        var sequentialSymbolCount = getSequential(password, orderSymbols, 3);
        for (var key in showsUp) {
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        InstallerCommon.__testOnly__ = {};
        InstallerCommon.__testOnly__.getVal = getVal;
        InstallerCommon.__testOnly__.removeDuplicateSlash = removeDuplicateSlash;
        InstallerCommon.__testOnly__.sendViaHttps = sendViaHttps;
        InstallerCommon.__testOnly__.findStepId = findStepId;
        InstallerCommon.__testOnly__.showStep = showStep;
        InstallerCommon.__testOnly__.showFailure = showFailure;

        InstallerCommon.__testOnly__.setSendViaHttps = function(f) {
            sendViaHttps = f;
        };
        InstallerCommon.__testOnly__.setCancel = function(bool) {
            cancel = bool;
        };
        InstallerCommon.__testOnly__.setDone = function(bool) {
            done = bool;
        };
        InstallerCommon.__testOnly__.radioAction = radioAction;

        InstallerCommon.__testOnly__.finalStruct = finalStruct;
        InstallerCommon.__testOnly__.discoverResult = discoverResult;

        InstallerCommon.__testOnly__.setDiscoverResult = function(discoverResultObj) {
            discoverResult = discoverResultObj;
        };
    }
    /* End Of Unit Test Only */

    return (InstallerCommon);
}({}, jQuery));

window.onbeforeunload = function() {
    return true;
};

$(document).ready(function() {
    Installer.setup();
    Upgrader.setup();
    Uninstaller.setup();
    setupTooltip();

    function setupTooltip() {
        $("body").tooltip({
            "selector": '[data-toggle="tooltip"]',
            "html": true,
            "delay": {
                "show": 250,
                "hide": 100
            }
        });

        // element's delay attribute will take precedence - unique for xcalar
        $("body").on("mouseenter", '[data-toggle="tooltip"]', function() {
            $(".tooltip").hide();
        });
    }
});
