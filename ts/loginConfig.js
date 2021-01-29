var msalEnabled = false;
var msalConfig = { msalEnabled: "", msal: {} };
var defaultAdminEnabled = false;
var defaultAdminConfig;
var ldapConfig;
var ldapConfigEnabled = false;

function setMSALConfig(hostname, msalEnabledIn, msalIn) {
    var deferred = PromiseHelper.deferred();
    var msalConfigOut = {
        msalEnabled: msalEnabledIn,
        msal: msalIn
    };

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/msalConfig/set",
        "data": JSON.stringify(msalConfigOut),
        "success": function (ret) {
            if (ret.success) {
                if (msalEnabled) {
                    msalEnabled = msalConfigOut.msalEnabled;
                    jQuery.extend(msalConfig, msalConfigOut);
                }
                deferred.resolve();
            } else {
                deferred.reject(ret.error);
            }
        },
        "error": function (errorMsg) {
            console.log("Failed to set msalConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getMSALConfig(hostname) {
    var deferred = PromiseHelper.deferred();

    if (msalEnabled) {
        return deferred.resolve(msalConfig).promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/msalConfig/get",
        "success": function (data) {
            if (data.hasOwnProperty("error")) {
                console.log("Failed to retrieve msalConfig.");
                deferred.reject(data.error);
                return;
            }

            jQuery.extend(msalConfig, data);
            msalEnabled = data.msalEnabled;

            if (msalEnabled) {
                xcLocalStorage.setItem("msalConfig", JSON.stringify(msalConfig));
            }
            deferred.resolve(msalConfig);
        },
        "error": function (errorMsg) {
            console.log("Failed to retrieve msalConfig.");
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getMsalConfigFromLocalStorage() {
    var localMsalConfig = xcLocalStorage.getItem("msalConfig");
    if (localMsalConfig == null) {
        return null;
    }

    try {
        return JSON.parse(localMsalConfig);
    } catch (error) {
        console.log("Error parsing msalConfig: " + error);
        return null;
    }
}

function authMsalIdToken(authData) {
    var deferred = PromiseHelper.deferred();

    if (!msalEnabled) {
        return deferred.reject("msal is not configured").promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/auth/azureIdToken",
        "data": JSON.stringify(authData),
        "success": function (data) {
            if (data.status) {
                if (msalEnabled) {
                    xcSessionStorage.setItem("idTokenData", data.data);
                }
                deferred.resolve(data.data);
            } else {
                console.log('OAuth token verification failed. Status: ' + data.status + ' Message: ' + data.message);
                deferred.reject(data.message);
            }
        },
        "error": function (errorMsg) {
            console.log('OAuth token verification failed with message: ' + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function setDefaultAdminConfig(hostname, defaultAdminEnabledIn, adminUsername, adminPassword, adminEmail) {
    var deferred = PromiseHelper.deferred();
    var defaultAdminConfigOut = {
        defaultAdminEnabled: defaultAdminEnabledIn,
        username: adminUsername,
        email: adminEmail,
        password: adminPassword
    };

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/defaultAdmin/set",
        "data": JSON.stringify(defaultAdminConfigOut),
        "success": function (ret) {
            if (ret.success) {
                if (defaultAdminEnabled) {
                    defaultAdminEnabled = defaultAdminEnabledIn;
                    defaultAdminConfig.username = defaultAdminConfigOut.username;
                    defaultAdminConfig.defaultAdminEnabled = defaultAdminEnabled;
                    defaultAdminConfig.email = defaultAdminConfigOut.email;
                }
                deferred.resolve();
            } else {
                deferred.reject(ret.error);
            }
        },
        "error": function (errorMsg) {
            console.log("Failed to set defaultAdminConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getDefaultAdminConfig(hostname) {
    var deferred = PromiseHelper.deferred();

    if (defaultAdminEnabled) {
        return deferred.resolve(defaultAdminConfig).promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/defaultAdmin/get",
        "success": function (defaultAdminConfigIn) {
            if (defaultAdminConfigIn.hasOwnProperty("error")) {
                console.log("Failed to retrieve defaultAdminConfig: " + defaultAdminConfigIn.error);
                deferred.reject(defaultAdminConfigIn.error);
                return;
            }

            defaultAdminConfig = defaultAdminConfigIn;
            defaultAdminEnabled = defaultAdminConfigIn.defaultAdminEnabled;
            deferred.resolve(defaultAdminConfig);
        },
        "error": function (errorMsg) {
            console.log("Failed to retrieve defaultAdminConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function setLdapConfig(hostname, ldapConfigEnabledIn, ldapIn) {
    var deferred = PromiseHelper.deferred();
    var ldapConfigOut = ldapIn;
    ldapConfigOut.ldapConfigEnabled = ldapConfigEnabledIn;

    if (ldapConfigOut.activeDir) {
        var propArray = [ 'adUserGroup', 'adAdminGroup',
                          'adDomain' ];
        for (var ii = 0; ii < propArray.length; ii++) {
            if (ldapConfigOut[propArray[ii]] === "" ) {
                delete ldapConfigOut[propArray[ii]];
            }
        }
    } else {
        var propArray = [ 'adUserGroup', 'adAdminGroup',
                          'adDomain', 'adSubGroupTree',
                          'adSearchShortName' ];
        for (var ii = 0; ii < propArray.length; ii++) {
            if (ldapConfigOut.hasOwnProperty(propArray[ii])) {
                delete ldapConfigOut[propArray[ii]];
            }
        }
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/ldapConfig/set",
        "data": JSON.stringify(ldapConfigOut),
        "success": function (ret) {
            if (ret.success) {
                if (ldapConfigEnabled) {
                    ldapConfigEnabled = ldapConfigEnabledIn;
                    ldapConfig = ldapConfigOut;
                }
                deferred.resolve();
            } else {
                deferred.reject(ret.error);
            }
        },
        "error": function (errorMsg) {
            console.log("Failed to set ldapConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}

function getLdapConfig(hostname) {
    var deferred = PromiseHelper.deferred();

    if (ldapConfigEnabled) {
        return deferred.resolve(ldapConfig).promise();
    }

    $.ajax({
        "type": "POST",
        "contentType": "application/json",
        "url": hostname + "/app/login/ldapConfig/get",
        "success": function (ldapConfigIn) {
            if (ldapConfigIn.hasOwnProperty("error")) {
                console.log("Failed to retrieve ldapConfig: " + ldapConfigIn.error);
                deferred.reject(ldapConfigIn.error);
                return;
            }

            ldapConfig = ldapConfigIn;
            ldapConfigEnabled = ldapConfigIn.ldapConfigEnabled;
            deferred.resolve(ldapConfig);
        },
        "error": function (errorMsg) {
            console.log("Failed to retrieve ldapConfig: " + errorMsg.error);
            deferred.reject(errorMsg.error);
        }
    });

    return deferred.promise();
}
