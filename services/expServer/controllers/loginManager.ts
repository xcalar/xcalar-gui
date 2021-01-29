import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as ldap from "ldapjs";
import * as xcConsole from "../utils/expServerXcConsole";
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;
import support from "../utils/expServerSupport";
import Ajv = require('ajv');
import authManager from "./authManager"
import request = require("request")
require("require.async")(require);

class UserInformation {
    private _loginId: number;
    private _entry_count: number;
    private _mail: string;
    private _firstName: string;
    private _employeeType: string;
    private _isADUser: boolean;

    constructor() {
        this._loginId = 0;
        this._entry_count = 0;
        this._mail = "";
        this._firstName = "";
        this._employeeType = "";
    }

    getLoginId(): number {
        return this._loginId;
    }
    getEntryCount(): number {
        return this._entry_count;
    }
    getMail(): string {
        return this._mail;
    }
    getFirstName(): string {
        return this._firstName;
    }
    getEmployeeType(): string {
        return this._employeeType;
    }
    getIsADUser(): boolean {
        return this._isADUser;
    }

    setLoginId(loginId) {
        this._loginId = loginId;
    }
    setEntryCount(entry_count) {
        this._entry_count = entry_count;
    }
    setMail(mail) {
        this._mail = mail;
    }
    setFirstName(firstName) {
        this._firstName = firstName;
    }
    setEmployeeType(employeeType) {
        this._employeeType = employeeType;
    }
    setIsADUser(isADUser) {
        this._isADUser = isADUser;
    }
    isSupporter(): boolean {
        return this._employeeType === "supporter";
    }
    isAdmin(): boolean {
        return this._employeeType === "administrator";
    }
}

abstract class ConfigFile {
    protected _configRelPath: string;
    protected _configSchema: any;
    protected _emptyConfig: any;
    protected _ajv: Ajv;

    constructor (configRelPath: string, configSchema: any, emptyConfig: any) {
        this._configRelPath = configRelPath;
        this._configSchema = configSchema;
        this._emptyConfig = emptyConfig;
        this._ajv = new Ajv(); // options can be passed. e.g {allErrors: true}
    }

    abstract getConfig(): any;
    abstract setConfig(configIn: any): any;

    protected loadConfigModule(xlrRoot: string, defaultRelPath: string) {
        let deferred: any = jQuery.Deferred();
        let message: any = { "success": false, "data": null, "message": "" };

        if (typeof xlrRoot !== "string" ||
            typeof defaultRelPath !== "string") {
            message.message = "One or more path components is not a string";
            deferred.reject(message);
        } else {
            // the type check above should prevent path.join from throwing
            // error
            let defaultConfigPath: string = path.join(xlrRoot, defaultRelPath);

            if (!fs.existsSync(defaultConfigPath)) {
                let errMsg: string =
                    "config file path does not exist: " + defaultConfigPath;
                xcConsole.log(errMsg);
                message.message = errMsg;
                deferred.reject(message);
            } else {
                if (require.resolve(defaultConfigPath)) {
                    delete require.cache[require.resolve(defaultConfigPath)];
                }

                xcConsole.log("Preparing to load: " + defaultConfigPath);

                require.async(defaultConfigPath, (exports) => {
                    message.success = true;
                    message.data = exports;
                    message.message = "module load successful";
                    xcConsole.log("load succeeded!");
                    deferred.resolve(message);
                }, (err) => {
                    message.message = "module load failed: " + err.message;
                    xcConsole.log("load failed!");
                    deferred.reject(message);
                });
            }
        }
        return deferred.promise();
    }

    protected getConfigOrNot() {
        let deferred: any = jQuery.Deferred();
        this.getConfig()
            .then((msg) => {
                deferred.resolve(msg);
            })
            .fail((msg) => {
                deferred.resolve(msg);
            });
        return deferred.promise();
    }

    protected checkFilePerms(xlrRoot, defaultRelPath) {
        let deferred: any = jQuery.Deferred();
        let message: any = { "success": false, "data": null, "message": "" };

        if (typeof xlrRoot !== "string" ||
            typeof defaultRelPath !== "string") {
            message.message = "One or more path components is not a string";
            deferred.reject(message);
        } else {
            let defaultConfigPath = path.join(xlrRoot, defaultRelPath);

            fs.stat(defaultConfigPath, (error, stat) => {
                if (error) {
                    message.message = "Could not stat " + defaultConfigPath;
                    xcConsole.log(message.message);
                    return deferred.reject(message);
                }

                if ((stat.mode & 0o777) !== 0o600) {
                    message.message = "File permissions for " +
                        defaultConfigPath + " are wrong (" +
                        (stat.mode & 0o777).toString(8) +
                        " instead of " + 0o600.toString(8) + ")";
                    xcConsole.log(message.message);
                    return deferred.reject(message);
                }

                message.success = true;
                message.message = "permission change successful";
                deferred.resolve();
            });
        }

        return deferred.promise();
    }

}

class LdapConfig extends ConfigFile {
    private _ldapConfig: any;
    private _trustedCerts: any;
    private _isLdapConfigSetup: boolean;
    private _strictSecurity: boolean;
    private _users: Map<number, UserInformation>;
    private _globalLoginId: number;

    private static LdapConfigRelPath: string = "/config/ldapConfig.json";
    private static LdapConfigSchema: any = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "ldapConfig",
        "description": "configuration for LDAP",
        "type": "object",
        "properties": {
            "ldap_uri": {
                "description": "uri of the LDAP server",
                "type": "string"
            },
            "userDN": {
                "description": "ldap base DN for user account entry search",
                "type": "string"
            },
            "useTLS": {
                "description": "connect to server with TLS",
                "type": "boolean"
            },
            "searchFilter": {
                "description": "LDAP filter used to identify user entries",
                "type": "string"
            },
            "activeDir": {
                "description": "URI connects to Active Directory server",
                "type": "boolean"
            },
            "serverKeyFile": {
                "description": "path to key file required by ldapjs to use " +
                    "SSL/TLS",
                "type": "string"
            },
            "ldapConfigEnabled": {
                "description": "is LDAP authentication enabled",
                "type": "boolean"
            },
            "adUserGroup": {
                "description": "the name of the AD group of Xcalar Users",
                "type": "string"
            },
            "adAdminGroup": {
                "description": "the name of the AD group of Xcalar Admins",
                "type": "string"
            },
            "adDomain": {
                "description": "the name of the default AD domain",
                "type": "string"
            },
            "adSubGroupTree": {
                "description": "use 1.2.840.113556.1.4.1941 searches to find " +
                    "users in AD nested groups",
                "type": "boolean"
            },
            "adSearchShortName": {
                "description": "replace the %username% with the name without " +
                    "the username without the AD domain",
                "type": "boolean"
            }
        },

        "required": ["ldap_uri", "userDN", "useTLS", "searchFilter",
                        "activeDir", "ldapConfigEnabled"]
    };
    private static EmptyLdapConfig: any = {
        ldap_uri: "",
        userDN: "",
        useTLS: false,
        searchFilter: "",
        activeDir: false,
        ldapConfigEnabled: false
    };

    constructor() {
        super(LdapConfig.LdapConfigRelPath, LdapConfig.LdapConfigSchema, LdapConfig.EmptyLdapConfig);
        this._isLdapConfigSetup = false;
        this._strictSecurity = false;
        this._users = new Map();
        this._globalLoginId = 0;
    }

    private setupConfigs(forceSetup) {
        let deferred: any = jQuery.Deferred();
        let gotLdapConfig = false;

        if (this._isLdapConfigSetup && !forceSetup) {
            deferred.resolve();
        } else {
            this.getConfig()
                .then((ldapConfigMsg) => {
                    // ldapConfig is a global
                    this._ldapConfig = ldapConfigMsg.data;
                    gotLdapConfig = true;

                    if (!this._ldapConfig.ldapConfigEnabled) {
                        let errMsg = "ldap authentication is disabled";
                        xcConsole.log(errMsg);
                        return deferred.reject(errMsg);
                    }

                    if (this._ldapConfig.serverKeyFile &&
                        this._ldapConfig.serverKeyFile != "") {
                        if (!fs.existsSync(this._ldapConfig.serverKeyFile)) {
                            let errMsg = "server key file does not exist";
                            xcConsole.log(errMsg);
                            return deferred.reject(errMsg);
                        }

                        this._trustedCerts = [fs.readFileSync(
                            this._ldapConfig.serverKeyFile)];
                    }
                    this._isLdapConfigSetup = true;
                    deferred.resolve('ldap setupConfigs succeeds');
                })
                .fail((message) => {
                    let errMsg = (gotLdapConfig) ? message : message.error;
                    this._isLdapConfigSetup = false;
                    deferred.reject('ldap setupConfigs fails ' + errMsg);
                });
        }

        return deferred.promise();
    }

    private setConnection(credArray, ldapConn, ldapConfig, loginId) {
        let deferred: any = jQuery.Deferred();

        try {
            // Save the information of current user into a HashTable
            let currentUser: any = new UserInformation();
            currentUser.setLoginId(loginId);
            this._users.set(loginId, currentUser);

            // Configure parameters to connect to LDAP
            ldapConn.username = credArray.xiusername;
            ldapConn.password = credArray.xipassword;

            ldapConn.client_url = ldapConfig.ldap_uri.endsWith('/')
                ? ldapConfig.ldap_uri
                : ldapConfig.ldap_uri + '/';

            ldapConn.userDN = ldapConfig.userDN;
            ldapConn.searchFilter = ldapConfig.searchFilter;
            ldapConn.activeDir = ldapConfig.activeDir;
            ldapConn.useTLS = ldapConfig.useTLS;
            ldapConn.useSubGroupTree = false;

            ldapConn.client = ldap.createClient({
                url: ldapConn.client_url,
                timeout: 10000,
                connectTimeout: 20000
            });

            if (ldapConn.activeDir) {
                ldapConn.adUserGroup = (ldapConfig.hasOwnProperty("adUserGroup") &&
                    ldapConfig.adUserGroup !== "")
                    ? ldapConfig.adUserGroup
                    : "Xce User";

                ldapConn.adAdminGroup = (ldapConfig.hasOwnProperty("adAdminGroup") &&
                    ldapConfig.adUserGroup !== "")
                    ? ldapConfig.adAdminGroup
                    : "Xce Admin";

                if ((ldapConfig.hasOwnProperty("adDomain")) &&
                    (ldapConn.username.indexOf("@") <= -1)) {
                    ldapConn.username = ldapConn.username + "@" +
                        ldapConfig.adDomain;
                }

                if (ldapConn.username.indexOf("@") > -1) {
                    ldapConn.shortName = ldapConn.username.substring(
                        0,ldapConn.username.indexOf("@"));
                } else {
                    ldapConn.shortName = ldapConn.username;
                }

                if (ldapConfig.hasOwnProperty("adSubGroupTree")) {
                    ldapConn.useSubGroupTree = ldapConfig.adSubGroupTree;
                }

                ldapConn.searchName = (
                    ldapConfig.hasOwnProperty("adSearchShortName") &&
                    ldapConfig.adSearchShortName === true)
                    ? ldapConn.shortName
                    : ldapConn.username;
            } else {
                ldapConn.userDN = ldapConn.userDN.replace(
                        '%username%', ldapConn.username);
                ldapConn.username = ldapConn.userDN;
                ldapConn.searchName = ldapConn.userDN;
            }

            let searchFilter = (ldapConn.searchFilter !== "")
                ? ldapConn.searchFilter.replace('%username%', ldapConn.searchName)
                : undefined;

            let activeDir = ldapConn.activeDir ? ['cn', 'mail', 'memberOf'] :
                                                ['cn', 'mail', 'employeeType'];

            ldapConn.searchOpts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: activeDir
            };

            // Use TLS Protocol
            if (ldapConn.useTLS) {
                let tlsOpts = {
                    cert: this._trustedCerts,
                    rejectUnauthorized: this._strictSecurity
                };
                xcConsole.log("Starting TLS...");
                ldapConn.client.starttls(tlsOpts, [], (err) => {
                    if (err) {
                        xcConsole.log("Failure: TLS start " + err.message);
                        deferred.reject("ldap setConnection fails");
                    } else {
                        deferred.resolve('ldap setConnection succeeds');
                    }
                });
            } else {
                deferred.resolve('ldap setConnection succeeds');
            }
        } catch (e) {
            xcConsole.error(e);
            deferred.reject("ldap setConnection fails");
        }

        return deferred.promise();
    }

    private writeEntry(entry, loginId, activeDir, adUserGroup, adAdminGroup,
                useGroupSubtree) {
        if (entry.object) {
            let entryObject: any = entry.object;
            let user: any = this._users.get(loginId);
            user.setEntryCount(user.getEntryCount() + 1);
            // e-mail address and first name are optional
            // by convention, they should be empty strings if not populated
            user.setMail(entryObject.mail ? entryObject.mail : "");
            user.setFirstName(entryObject.cn ? entryObject.cn : "");
            if (activeDir) {
                user.setEmployeeType("user");
                user.setIsADUser(false);
                // if useGroupSubtree is set, we need to query the ldap,
                // so we set membership in this.groupRetrieve
                if (!useGroupSubtree && entryObject.memberOf) {
                    // For normal user, memberOf is a String
                    if (typeof (entryObject.memberOf) === "string") {
                        entryObject.memberOf = [entryObject.memberOf];
                    }
                    let array = entryObject.memberOf;
                    for (let i = 0; i < array.length; i++) {
                        let element = array[i];
                        let admin_re = new RegExp("^CN=" + adAdminGroup + ",*");
                        if (admin_re.test(element)) {
                            user.setIsADUser(true);
                            user.setEmployeeType("administrator");
                        }
                        let user_re = new RegExp("^CN=" + adUserGroup + ",*");
                        if (user_re.test(element)) {
                            user.setIsADUser(true);
                        }
                    }
                }
            } else {
                user.setEmployeeType(entryObject.employeeType);
            }
        }
    }

    private increaseLoginId() {
        this._globalLoginId++;
    }

    private authentication(ldapConn, loginId) {
        // LDAP Authentication
        let deferred: any = jQuery.Deferred();
        ldapConn.hasBind = true;
        ldapConn.client.bind(ldapConn.username, ldapConn.password, (error) => {
            if (error) {
                xcConsole.log("Failure: Binding process " + error.message);
                this.increaseLoginId();
                ldapConn.hasBind = false;
                ldapConn.client.destroy();
                deferred.reject("ldap authentication fails");
            } else {
                xcConsole.log('Success: Binding process finished!');
                let self: LdapConfig = this;
                ldapConn.client.search(ldapConn.userDN, ldapConn.searchOpts,
                    (error, search) => {
                    search.on('searchEntry', (entry) => {
                        xcConsole.log('Searching entries.....');
                        try {
                            self.writeEntry(entry, loginId, ldapConn.activeDir,
                                ldapConn.adUserGroup, ldapConn.adAdminGroup,
                                ldapConn.useSubGroupTree);
                        } catch (error) {
                            xcConsole.log('Failure: Writing entry ' + error);
                            deferred.reject("ldap authentication fails");
                        }
                    });

                    search.on('error', (error) => {
                        xcConsole.log('Failure: Searching process ' +
                            error.message);
                        deferred.reject("ldap authentication fails");
                    });

                    search.on('end', () => {
                        xcConsole.log('Success: Search process finished!');
                        deferred.resolve('ldap authentication succeeds',
                                        loginId);
                    });
                });
            }
        });
        return deferred.promise();
    }

    private groupRetrieve(ldapConn, groupType, loginId) {
        let deferred: any = jQuery.Deferred();

        if (!(ldapConn.hasBind) || !(ldapConn.activeDir) ||
            !(ldapConn.useSubGroupTree)) {
            deferred.resolve('No group retrieval needed for ' + groupType);
        } else {
            let searchFilter: string = '';
            let sAMAFilter: string = '(sAMAccountName=' + ldapConn.shortName +
                                        ')';
            if (groupType === 'user') {
                searchFilter = "(&(objectCategory=Person)" + sAMAFilter +
                    "(memberOf:1.2.840.113556.1.4.1941:=" +
                    ldapConn.adUserGroup + "))";
            } else if (groupType === 'admin') {
                searchFilter = "(&(objectCategory=Person)" + sAMAFilter +
                    "(memberOf:1.2.840.113556.1.4.1941:=" +
                    ldapConn.adAdminGroup + "))";
            } else {
                deferred.reject("Unknown group retrieve type: " + groupType);
            }

            let groupSearchOpts: any = {
                filter: searchFilter,
                scope: 'sub',
                attributes: 'sAMAccountName'
            };

            let self: LdapConfig = this;
            ldapConn.client.search(ldapConn.userDN, groupSearchOpts,
                (error, search) => {
                search.on('searchEntry', (entry) => {
                    xcConsole.log('Searching entries.....');
                    let user = self._users.get(loginId);

                    if (groupType === 'user') {
                        xcConsole.log('User ' + ldapConn.shortName +
                            ' found in user group');
                        user.setIsADUser(true);
                    } else if (groupType === 'admin') {
                        xcConsole.log('User ' + ldapConn.shortName +
                            ' found in admin group');
                        user.setIsADUser(true);
                        user.setEmployeeType("administrator");
                    }
                });

                search.on('error', (error) => {
                    xcConsole.log('Failure: Group searching process ' +
                        error.message);
                    deferred.reject("Group search process fails " + groupType);
                });

                search.on('end', () => {
                    xcConsole.log('Success: Search process finished!');
                    deferred.resolve('Group search process succeeds for ' +
                        groupType);
                });
            });
        }

        return deferred.promise();
    }

    private prepareResponse(loginId, activeDir, credArray) {
        let deferred: any = jQuery.Deferred();
        let user: any = this._users.get(loginId);
        if (user && user.getEntryCount() >= 1) {
            if (user.getEntryCount() > 1) {
                xcConsole.log("Alert: More than one matched user was found");
            }
            // The employeeType is defined when adding new user
            // "administrator" for administrators, "normal user"
            // for normal users.
            if ((activeDir) && (!user.getIsADUser())) {
                xcConsole.log('Failure: User is not in the Xcalar user group.');
                deferred.reject("prepareResponse fails");
            } else {
                let isAdmin = user.isAdmin();
                let isSupporter = user.isSupporter();
                let userInfo = {
                    "xiusername": credArray.xiusername.toLowerCase(),
                    "firstName": user.getFirstName(),
                    "mail": user.getMail(),
                    "isValid": true,
                    "isAdmin": isAdmin,
                    "isSupporter": isSupporter
                };
                deferred.resolve(userInfo);
            }
        } else {
            xcConsole.log("Failure: No matching user data found in LDAP " +
                "directory");
            deferred.reject("prepareResponse fails");
        }
        return deferred.promise();
    }

    getConfig() {
        let deferred: any = jQuery.Deferred();
        let message: any = { "status": httpStatus.OK,
                            "ldapConfigEnabled": false };
        let defaultLdapConfig: any = jQuery.extend({}, this._emptyConfig);
        let validate: any = this._ajv.compile(this._configSchema);
        let xlrRoot: string = "";

        support.getXlrRoot()
            .then((path) => {
                xlrRoot = path;
                return this.loadConfigModule(xlrRoot, this._configRelPath);
            })
            .then((moduleMsg) => {
                jQuery.extend(defaultLdapConfig, moduleMsg.data);

                let valid: boolean = validate(defaultLdapConfig);
                if (!valid) {
                    message.error = JSON.stringify(validate.errors);
                    deferred.reject(message);
                } else {
                    message.data = defaultLdapConfig;
                    deferred.resolve(message);
                }
            })
            .fail((errorMsg) => {
                message.error = (xlrRoot !== "") ?
                    errorMsg.message : errorMsg;
                deferred.reject(message);
            });

        return deferred.promise();
    }

    setConfig(ldapConfigIn) {
        let deferred: any = jQuery.Deferred();
        let ldapConfigPath: any;
        let writeLdapConfig: any = jQuery.extend();
        let message: any = { "status": httpStatus.OK, "success": false };
        let validate: any = this._ajv.compile(this._configSchema);

        let inputValid: boolean = validate(ldapConfigIn);
        if (!inputValid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
            return deferred.promise();
        }

        writeLdapConfig = jQuery.extend(true, {},
            this._emptyConfig,
            ldapConfigIn);

        let valid: boolean = validate(writeLdapConfig);
        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
        } else {
            this._ldapConfig = writeLdapConfig;

            support.getXlrRoot()
                .then((xlrRoot) => {
                    ldapConfigPath = path.join(xlrRoot, this._configRelPath);
                    return (support.makeFileCopy(ldapConfigPath));
                })
                .then(() => {
                    return (support.writeToFile(ldapConfigPath,
                                        this._ldapConfig, { "mode": 0o600 }));
                })
                .then(() => {
                    message.success = true;
                    deferred.resolve(message);
                })
                .fail((errorMsg) => {
                    message.error = errorMsg;
                    deferred.reject(message);
                });
        }
        return deferred.promise();
    }

    login(credArray) {
        let deferred: any = jQuery.Deferred();
        // Ldap configuration
        let ldapConn: any = {};
        let currLoginId: number;

        this.setupConfigs(false)
            .then(() => {
                currLoginId = this._globalLoginId;
                this.increaseLoginId();
                return this.setConnection(credArray, ldapConn,
                                                this._ldapConfig, currLoginId);
            })
            .then(() => {
                return this.authentication(ldapConn, currLoginId);
            })
            .then(() => {
                return this.groupRetrieve(ldapConn, 'user', currLoginId);
            })
            .then(() => {
                return this.groupRetrieve(ldapConn, 'admin', currLoginId);
            })
            .then((message) => {
                return this.prepareResponse(currLoginId, ldapConn.activeDir,
                            credArray);
            })
            .then((message) => {
                ldapConn.client.destroy();
                deferred.resolve(message);
            })
            .fail((errorMsg) => {
                if (ldapConn.hasBind) {
                    ldapConn.client.destroy();
                }
                deferred.reject(errorMsg);
            });

        return deferred.promise();
    }
}

class DefaultAdminConfig extends ConfigFile {
    private static DefaultAdminConfigRelPath: string = "/config/" +
                                                        "defaultAdmin.json";
    private static DefaultAdminSchema: any = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "defaultAdminConfig",
        "description": "configuration for a default administrator",
        "type": "object",
        "properties": {
            "username": {
                "description": "name of the admin user",
                "type": "string"
            },
            "password": {
                "description": "encrypted admin user password",
                "type": "string"
            },
            "email": {
                "description": "email address of the admin user",
                "type": "string"
            },
            "defaultAdminEnabled": {
                "description": "is the default admin config enabled",
                "type": "boolean"
            }
        },

        "required": ["username", "password", "email", "defaultAdminEnabled"]
    };
    private static EmptyDefaultAdminConfig: any = {
        username: "",
        password: "",
        email: "",
        defaultAdminEnabled: false
    };
    constructor() {
        super(DefaultAdminConfig.DefaultAdminConfigRelPath,
                DefaultAdminConfig.DefaultAdminSchema,
                DefaultAdminConfig.EmptyDefaultAdminConfig)
    }

    getConfig() {
        let deferred: any = jQuery.Deferred();
        let message: any = { "status": httpStatus.OK,
                            "defaultAdminEnabled": false, "config": null };
        let defaultAdminConfig: any = {};
        let validate: any = this._ajv.compile(this._configSchema);
        let xlrRoot: string = "";

        support.getXlrRoot()
            .then((path) => {
                xlrRoot = path;
                return this.loadConfigModule(xlrRoot,
                                        this._configRelPath);
            })
            .then((moduleMsg) => {
                defaultAdminConfig = jQuery.extend(true, {},
                    this._configSchema,
                    moduleMsg.data);

                return this.checkFilePerms(xlrRoot,
                                            this._configRelPath);
            })
            .then((permMsg) => {
                let valid: boolean = validate(defaultAdminConfig);
                if (!valid) {
                    message.error = JSON.stringify(validate.errors);
                    deferred.reject(message);
                } else {
                    message.data = defaultAdminConfig;
                    deferred.resolve(message);
                }
            })
            .fail((errorMsg) => {
                message.error = (xlrRoot !== "") ?
                    errorMsg.message : errorMsg;
                deferred.reject(message);
            });

        return deferred.promise();
    }

    setConfig(configIn) {
        let deferred: any = jQuery.Deferred();
        let defaultAdminConfigPath: any;
        let defaultAdminConfig: any = {};
        let message: any = { "status": httpStatus.OK, "success": false };
        let validate: any = this._ajv.compile(this._configSchema);

        let inputValid: boolean = validate(configIn);
        if (!inputValid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
            return deferred.promise();
        }

        defaultAdminConfig = jQuery.extend(true, {},
            this._emptyConfig, configIn);
        defaultAdminConfig.password = crypto.createHmac("sha256", "xcalar-salt")
            .update(defaultAdminConfig.password).digest("hex");

        let valid: boolean = validate(defaultAdminConfig);
        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
        } else {
            support.getXlrRoot()
                .then((xlrRoot) => {
                    defaultAdminConfigPath = path.join(
                                    xlrRoot, this._configRelPath);

                    return (support.writeToFile(defaultAdminConfigPath,
                                                defaultAdminConfig,
                                                { "mode": 0o600 }));
                })
                .then(() => {
                    message.success = true;
                    deferred.resolve(message);
                })
                .fail((errorMsg) => {
                    message.error = errorMsg;
                    deferred.reject(message);
                });
        }

        return deferred.promise()

    }
}

class VaultConfig extends ConfigFile {
    private static VaultConfigRelPath: string = "/config/vaultConfig.json";
    private static VaultConfigSchema: any = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "vaultConfig",
        "description": "configuration for Vault",
        "type": "object",
        "properties": {
            "vaultEnabled": {
                "description": "is vault connector active",
                "type": "boolean"
            },
            "vault": {
                "description": "vault configuration data",
                "type": "object",
                "oneOf": [
                    { "$ref": "#/definitions/vaultConfigData" }
                ]
            }
        },

        "required": ["vaultEnabled", "vault"],

        "definitions": {
            "vaultConfigData": {
                "properties": {
                    "vault_uri": {
                        "description": "uri of vault server",
                        "type": "string"
                    },
                    "vaultUserGroup": {
                        "description": "name of the vault Xcalar user group",
                        "type": "string"
                    },
                    "vaultAdminGroup": {
                        "description": "name of the vault Xcalar admin group",
                        "type": "string"
                    }
                },
                "required": ["vault_uri", "vaultUserGroup", "vaultAdminGroup"]
            }
        }
    };
    private static EmptyVaultConfig: any = {
        vaultEnabled: false,
        vault: {
            vault_uri: "",
            vaultUserGroup: "",
            vaultAdminGroup: ""
        }
    }
    constructor() {
        super(VaultConfig.VaultConfigRelPath, VaultConfig.VaultConfigSchema,
                VaultConfig.EmptyVaultConfig);
    }

    getConfig() {
        let deferred: any = jQuery.Deferred();
        let message: any = { "status": httpStatus.OK, "vaultEnabled": false };
        let vaultConfig: any = {};
        let validate: any = this._ajv.compile(this._configSchema);
        let xlrRoot: string = "";

        support.getXlrRoot()
            .then((path) => { xlrRoot = path;
                return this.loadConfigModule(xlrRoot, this._configRelPath);
            })
            .then((moduleMsg) => {
                vaultConfig = jQuery.extend(true, {},
                    this._emptyConfig,
                    moduleMsg.data);
                let valid: boolean = validate(vaultConfig);

                if (!valid) {
                    message.error = JSON.stringify(validate.errors);
                    return deferred.reject(message);
                }

                message.data = vaultConfig;

                deferred.resolve(message);
            })
            .fail((errorMsg) => {
                message.error = (xlrRoot !== "") ?
                    errorMsg.message : errorMsg;
                deferred.reject(message);
            });

        return deferred.promise();
    }

    setConfig(configIn) {
        let deferred: any = jQuery.Deferred();
        let vaultConfigPath: any;
        let vaultConfig: any = {};
        let message: any = { "status": httpStatus.OK, "success": false };
        let validate: any = this._ajv.compile(this._configSchema);

        let inputValid: boolean = validate(configIn);
        if (!inputValid) {
            message.error = JSON.stringify(validate.errors);
            xcConsole.log("invalid vaultConfig: " + message.error);
            deferred.reject(message);
            return deferred.promise();
        }

        vaultConfig = jQuery.extend(true, {},
            this._emptyConfig, configIn);

        let valid: boolean = validate(vaultConfig);
        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
        } else {
            support.getXlrRoot()
                .then((xlrRoot) => {
                    vaultConfigPath = path.join(xlrRoot, this._configRelPath);

                    return (support.writeToFile(vaultConfigPath, vaultConfig,
                                                { "mode": 0o600 }));
                })
                .then(() => {
                    message.success = true;
                    deferred.resolve(message);
                })
                .fail((errorMsg) => {
                    message.error = errorMsg;
                    deferred.reject(message);
                });
        }
    }

    login(credArray) {
        let deferred: any = jQuery.Deferred();
        let message: any = { "status": httpStatus.OK, "isValid": false };
        let vaultConfig: any = null

        this.getConfig()
            .then((vaultConfigMsg) => {
                vaultConfig = vaultConfigMsg.data;

                if (!vaultConfig.vaultEnabled) {
                    message.error = "vault is not configured";
                    deferred.reject(message);
                    return;
                }

                let options = {
                    "method": "POST",
                    "uri": vaultConfig.vault.vault_uri + "/v1/auth/ldap/login/" +
                            credArray.xiusername,
                    "json": { "password": credArray.xipassword }
                }

                request(options, (error, response, body) => {
                    if (response.statusCode === httpStatus.OK) {

                        let userInfo: any = {
                            "xiusername": credArray.xiusername.toLowerCase(),
                            "firstName": response.body.auth.metadata.username,
                            "mail": "",
                            "isAdmin": false,
                            "isValid": false,
                            "isSupporter": false
                        };

                        if (response.body.auth.policies.includes(
                            vaultConfig.vault.vaultAdminGroup)) {
                            userInfo.isAdmin = true;
                            userInfo.isValid = true;
                        } else if (response.body.auth.policies.includes(
                            vaultConfig.vault.vaultUserGroup)) {
                            userInfo.isAdmin = false;
                            userInfo.isValid = true;
                        } else {
                            let revokeOptions = {
                                "method": "POST",
                                "uri": vaultConfig.vault.vault_uri +
                                        "/v1/auth/token/revoke",
                                "json": { "token":
                                            response.body.auth.client_token },
                                "headers": { "X-Vault-Token":
                                            response.body.auth.client_token }
                            }

                            request(revokeOptions, (error, response, body) => {
                                message.error = "user " + credArray.xiusername +
                                    " does not belong to policy groups " +
                                    vaultConfig.vault.vaultAdminGroup +
                                    " and " + vaultConfig.vault.vaultUserGroup;
                                return deferred.reject(message);
                            });
                        }
                        userInfo.tokenType = "vault";
                        userInfo.token = response.body;

                        return deferred.resolve(userInfo);
                    } else {
                        message.error = error;
                        return deferred.reject(message);
                    }
                });
            })
            .fail((errorMsg) => {
                message.error = (vaultConfig) ? errorMsg : errorMsg.error;
                deferred.reject(message);
            });
        return deferred.promise();
    }

    logout(session) {
        let deferred: any = jQuery.Deferred();
        let message: any = { "status": httpStatus.OK, "isValid": false };

        if (session.credentials &&
            session.credentials["vault"]) {
            let token = session.credentials["vault"];

            this.getConfig()
                .then((vaultConfigMsg) => {
                    let vaultConfig = vaultConfigMsg.data;
                    if (!vaultConfig.vaultEnabled) {
                        message.error = "vault is not configured";
                        return deferred.reject(message);
                    }

                    let options = {
                        "method": "POST",
                        "uri": vaultConfig.vault.vault_uri +
                            "/v1/auth/token/revoke",
                        "json": { "token": token.auth.client_token },
                        "headers": { "X-Vault-Token": token.auth.client_token }
                    }

                    request(options, (error, response, body) => {
                        if (response.statusCode === httpStatus.OK) {
                            xcConsole.log("Response: " +
                                JSON.stringify(response));
                            message.isValid = true;
                            return deferred.resolve(message);
                        } else {
                            message.error = error;
                            return deferred.reject(message);
                        }
                    });
                })
                .fail((errorMsg) => {
                    message.error = errorMsg;
                    return deferred.reject(message);
                });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }
}

class MSALConfig extends ConfigFile {
    private static MsalConfigRelPath: string = "/config/msalConfig.json";
    private static MsalConfigSchema: any = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "title": "defaultAdminConfig",
        "description": "configuration for a default administrator",
        "type": "object",
        "properties": {
            "msalEnabled": {
                "description": "is the MSAL connector active",
                "type": "boolean"
            },
            "msal": {
                "description": "MSAL configuration data",
                "type": "object",
                "oneOf": [
                    { "$ref": "#/definitions/msalConfigData" }
                ]
            }
        },

        "required": ["msalEnabled", "msal"],

        "definitions": {
            "msalConfigData": {
                "properties": {
                    "clientId": {
                        "description": "id of the client application",
                        "type": "string"
                    },
                    "userScope": {
                        "description": "access uri for the scope for Xcalar " +
                            "users",
                        "type": "string"
                    },
                    "adminScope": {
                        "description": "access uri for the scope for Xcalar " +
                            "admins",
                        "type": "string"
                    },
                    "b2cEnabled": {
                        "description": "endpoint is Microsoft Azure B2C",
                        "type": "boolean"
                    },
                    "webApi": {
                        "description": "B2C web api URL",
                        "type": "string"
                    },
                    "authority": {
                        "description": "B2C authentication service",
                        "type": "string"
                    },
                    "azureEndpoint": {
                        "description": "Azure Graph API endpoint " +
                            "(reserved for future use)",
                        "type": "string"
                    },
                    "azureScopes": {
                        "description": "Azure Graph API scopes " +
                            "(reserved for future use)",
                        "type": "array",
                        "minItems": 0,
                        "items": { "type": "string" },
                        "uniqueItems": true
                    }
                },
                "required": ["clientId", "userScope", "adminScope",
                    "b2cEnabled"]
            }
        }
    };
    private static EmptyMsalConfig: any = {
        msalEnabled: false,
        msal: {
            clientId: "",
            userScope: "",
            adminScope: "",
            b2cEnabled: false,
            webApi: "",
            authority: "",
            azureEndpoint: "",
            azureScopes: []
        }
    };
    constructor() {
        super(MSALConfig.MsalConfigRelPath, MSALConfig.MsalConfigSchema,
                MSALConfig.EmptyMsalConfig);
    }

    getConfig() {
        let deferred: any = jQuery.Deferred();
        let message: any = { "status": httpStatus.OK, "msalEnabled": false };
        let msalConfig: any = {};
        let validate: any = this._ajv.compile(this._configSchema);
        let xlrRoot: string = "";

        support.getXlrRoot()
            .then((path) => {
                xlrRoot = path;
                return this.loadConfigModule(xlrRoot, this._configRelPath);
            })
            .then((moduleMsg) => {
                msalConfig = jQuery.extend(true, {},
                    this._emptyConfig,
                    moduleMsg.data);

                let valid: boolean = validate(msalConfig);
                if (!valid) {
                    message.error = JSON.stringify(validate.errors);
                    return deferred.reject(message);
                }

                message.data = msalConfig;

                authManager.enableB2C(msalConfig.msal.b2cEnabled);

                deferred.resolve(message);
            })
            .fail((errorMsg) => {
                message.error = (xlrRoot !== "") ?
                    errorMsg.message : errorMsg;
                deferred.reject(message);
            });

        return deferred.promise();
    }

    setConfig(configIn) {
        let deferred: any = jQuery.Deferred();
        let msalConfigPath: any;
        let msalConfig: any = {};
        let message: any = { "status": httpStatus.OK, "success": false };
        let validate: any = this._ajv.compile(this._configSchema);

        let inputValid: boolean = validate(configIn);
        if (!inputValid) {
            message.error = JSON.stringify(validate.errors);
            xcConsole.log("invalid msalConfig: " + message.error);
            deferred.reject(message);
            return deferred.promise();
        }

        msalConfig = jQuery.extend(true, {},
            this._emptyConfig,
            configIn);

        let valid: boolean = validate(msalConfig);
        if (!valid) {
            message.error = JSON.stringify(validate.errors);
            deferred.reject(message);
        } else {
            support.getXlrRoot()
                .then((xlrRoot) => {
                    msalConfigPath = path.join(xlrRoot, this._configRelPath);

                    authManager.enableB2C(msalConfig.msal.b2cEnabled);

                    return (support.writeToFile(msalConfigPath, msalConfig,
                                                { "mode": 0o600 }));
                })
                .then(() => {
                    message.success = true;
                    deferred.resolve(message);
                })
                .fail((errorMsg) => {
                    message.error = errorMsg;
                    deferred.reject(message);
                });
        }

        return deferred.promise();
    }
}

class LoginManager {
    private static _instance = null;
    public static get getInstance(): LoginManager {
        return this._instance || (this._instance = new this());
    }

    authConfigured: boolean;

    private _defaultAdminConfig: DefaultAdminConfig;
    private _ldapConfig: LdapConfig;
    private _vaultConfig: VaultConfig;
    private _msalConfig: MSALConfig;

    private constructor() {
        this._defaultAdminConfig = new DefaultAdminConfig();
        this._ldapConfig = new LdapConfig();
        this._vaultConfig = new VaultConfig();
        this._msalConfig = new MSALConfig();
    }

    private authenticationInit() {
        let deferred: any = jQuery.Deferred();

        xcConsole.log("Starting default admin load");
        this._defaultAdminConfig.getConfigOrNot()
            .then((msg) => {
                if (msg.data &&
                    msg.data.defaultAdminEnabled) {
                    xcConsole.log("default admin configured");
                    this.authConfigured = true;
                } else {
                    xcConsole.log("default admin not configured");
                }

                xcConsole.log("Starting MSAL load");
                return this._msalConfig.getConfigOrNot();
            })
            .then((msg) => {
                if (msg.data &&
                    msg.data.msalEnabled) {
                    xcConsole.log("msal configured");
                    this.authConfigured = true;
                } else {
                    xcConsole.log("msal not configured");
                }

                xcConsole.log("Starting LDAP config load");
                return this._ldapConfig.getConfigOrNot();
            })
            .then((msg) => {
                if (msg.data &&
                    msg.data.ldapConfigEnabled) {
                    xcConsole.log("ldap configured");
                    this.authConfigured = true;
                } else {
                    xcConsole.log("ldap not configured");
                }

                xcConsole.log("Starting Vault config load");
                return this._vaultConfig.getConfigOrNot();
            })
            .then((msg) => {
                if (msg.data &&
                    msg.data.vaultEnabled) {
                    xcConsole.log("vault configured");
                    this.authConfigured = true;
                } else {
                    xcConsole.log("vault not configured");
                }
            })
            .always(() => {
                xcConsole.log((this.authConfigured) ?
                    "Authentication is configured" :
                    "Authentication is not configured");
                deferred.resolve();
            });

        return deferred.promise();
    }

    getDefaultAdmin() {
        return this._defaultAdminConfig.getConfig();
    }

    getMsalConfig() {
        return this._msalConfig.getConfig();
    }

    setMsalConfig(msalConfigIn) {
        return this._msalConfig.setConfig(msalConfigIn);
    }

    getLdapConfig() {
        return this._ldapConfig.getConfig();
    }

    setLdapConfig(ldapConfigIn) {
        return this._ldapConfig.setConfig(ldapConfigIn);
    }

    getVaultConfig() {
        return this._vaultConfig.getConfig();
    }

    setVaultConfig(vaultConfigIn) {
        return this._vaultConfig.setConfig(vaultConfigIn);
    }

    vaultLogout(session) {
        return this._vaultConfig.logout(session);
    }

    loginAuthentication(credArray) {
        let deferred: any = jQuery.Deferred();
        let message: any = { "status": httpStatus.OK, "isValid": false };

        if (!credArray || !(credArray.hasOwnProperty("xiusername"))
            || !(credArray.hasOwnProperty("xipassword"))) {
            message.error = "Invalid login request provided";
            return deferred.reject(message).promise();
        }

        // Check if defaultAdmin is turned on
        this.getDefaultAdmin()
            .then((defaultAdminMsg) => {
                let defaultAdminConfig = defaultAdminMsg.data;
                if (!defaultAdminConfig.defaultAdminEnabled) {
                    // Default admin not enabled. Try LDAP
                    return jQuery.Deferred().reject().promise();
                }

                let hmac = crypto.createHmac("sha256", "xcalar-salt")
                    .update(credArray.xipassword).digest("hex");

                if (credArray.xiusername === defaultAdminConfig.username &&
                    hmac === defaultAdminConfig.password) {

                    // Successfully authenticated as defaultAdmin
                    let userInfo = {
                        "xiusername": defaultAdminConfig.username,
                        "firstName": "Administrator",
                        "mail": defaultAdminConfig.email,
                        "isValid": true,
                        "isAdmin": true,
                        "isSupporter": false,
                    };

                    return jQuery.Deferred().resolve(userInfo).promise();
                } else {
                    // Fall through to LDAP
                    return jQuery.Deferred().reject().promise();
                }

            })
            .then(
                // Successfully authenticated as default admin. Fall through
                (userInfo) => {
                    return jQuery.Deferred().resolve(userInfo).promise();
                },

                // Did not authenticate as default admin, either because
                // this.getDefaultAdmin() failed,
                // or credArray.defaultAdminEnabled is false
                // or credArray.xiusername/xipassword is wrong
                () => {
                    return this._ldapConfig.login(credArray);
                }
            )
            .then(
                // Successfully authenticated as default admin or ldap.
                // Fall through
                (userInfo) => {
                    return jQuery.Deferred().resolve(userInfo).promise();
                },

                // Did not authenticate as either default admin or ldap,
                // try vault auth
                () => {
                    return this._vaultConfig.login(credArray);
                }
            )
            .then((userInfo) => {
                // We've authenticated successfully with either ldap or default
                userInfo.status = message.status;
                xcConsole.log(userInfo.xiusername, "successfully logged in.");
                deferred.resolve(userInfo)
            })
            .fail((errorMsg) => {
                message.error = (errorMsg.error) ? errorMsg.error : errorMsg;
                deferred.reject(message)
            });

        return deferred.promise();
    }

    securitySetupAuth(req, res, next) {
        let message: any = { "status": httpStatus.Unauthorized,
                            "success": false };
        let self: LoginManager = LoginManager.getInstance;

        if (self.authConfigured) {
            return support.checkAuthAdmin(req, res, next);
        }

        self.authenticationInit()
            .then(() => {
                if (self.authConfigured) {
                    return support.checkAuthAdmin(req, res, next);
                }
                next();
            });
    }

    setupDefaultAdmin(req, res) {
        let self: LoginManager = LoginManager.getInstance;

        xcConsole.log("Setting default admin");
        var credArray = req.body;
        self._defaultAdminConfig.setConfig(credArray)
            .always((message) => {
                if (message.success) {
                    self.authConfigured = true;
                }
                res.status(message.status).send(message);
            });
    }
}

const loginManager = LoginManager.getInstance;
export default loginManager;
