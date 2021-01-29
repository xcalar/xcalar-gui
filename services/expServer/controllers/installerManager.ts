import { Status } from "../utils/supportStatusFile";
import { exec, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as stream from "stream";
import * as zlib from "zlib";
import * as crypto from "crypto";
import support from "../utils/expServerSupport";
import * as xcConsole from "../utils/expServerXcConsole";
import { httpStatus } from "../../../assets/js/httpStatus";

interface ReturnMsg {
    status: number,
    curStepStatus?: number,
    verified?: boolean,
    data?: any,
    retVal?: string[],
    reason?: string,
    errorLog?: string, // the error message by script running
    installationLogs?: any // all installation logs
}

interface Credentials {
    password?: string,
    sshKey?: string,
    sshUserSettings?: string
}

interface NFSOption {
    option: string,
    nfsServer?: string,
    nfsMountPoint?: string,
    nfsUsername?: string,
    nfsGroup?: string,
    nfsReuse?: string,
    copy?: boolean
}

interface LDAPOption {
    deployOption: string,
    domainName?: string,
    companyName?: string,
    password?: string
}

interface AdminConfig {
    defaultAdminEnabled: boolean,
    username?: string,
    email?: string,
    password?: string
}

interface CredArray {
    credentials: Credentials,
    username: string,
    port: string,
    nfsOption: NFSOption,
    installationDirectory: string,
    ldap: LDAPOption,
    defaultAdminConfig: AdminConfig,
    serializationDirectory: string,
    preConfig: boolean,
    supportBundles: boolean,
    enableHotPatches: boolean,
    hostnames?: string[],
    privHostNames?: string[],
    licenseKey?: string
}

interface InstallerInput {
    hasPrivHosts: boolean,
    credArray: CredArray
}

interface InstallerInterface {
    Error: number,
    Done: number,
    Running: number,
}

class InstallerManager {
    private static _instance = null;
    public static get getInstance(): InstallerManager{
        return this._instance || (this._instance = new this());
    }

    private _curStep: any;
    private _errorLog: string;
    private _cliArguments: string ;
    private _hostnameLocation: string;
    private _privHostnameLocation: string;
    private _ldapLocation: string;
    private _discoveryResultLocation: string;
    private _licenseLocation: string;
    private _credentialLocation: string;
    private _scriptDir: string;
    private readonly _installStatus: InstallerInterface = {
        "Error": -1,
        "Done": 2,
        "Running": 1
    };
    private readonly _getNodeRegex: RegExp = /\[([0-9]+)\]/;
    private readonly _getStatusRegex: RegExp = /\[([A-Z]+)\]/;

    private constructor() {
        this._curStep = {};
        this._errorLog = "";

        const scriptRoot = process.env.XCE_INSTALLER_ROOT || "";
        this._cliArguments = "";
        this._hostnameLocation = path.join(scriptRoot, "/config/hosts.txt");
        this._privHostnameLocation = path.join(scriptRoot,
                                                    "/config/privHosts.txt");
        this._ldapLocation = path.join(scriptRoot,
                                            "/config/ldapConfig.json");
        this._discoveryResultLocation = path.join(scriptRoot,
                                                        "/tmp/config.json");
        this._licenseLocation = path.join(scriptRoot,
                                                "/config/license.txt");
        this._credentialLocation = path.join(scriptRoot,
                                                "/tmp/key.txt");
        this._scriptDir = path.join(scriptRoot, "/installer");
    }

    private initStepArray(): void {
        this._curStep = {
            "stepString": "Step [0] Starting...",
            "nodesCompletedCurrent": [],
            "status": Status.Running,
        };
    }

    private clearErrorLog(): void {
        this._errorLog = "";
    }

    private genExecString(input: InstallerInput): string {
        let hasPrivHosts: boolean = input.hasPrivHosts;
        let credentialsOption: Credentials = input.credArray.credentials;
        let username: string = input.credArray.username;
        let port: string = input.credArray.port;
        let nfsOption: NFSOption = input.credArray.nfsOption;
        let installationDirectory: string = input.credArray.installationDirectory;
        let ldapOption: LDAPOption = input.credArray.ldap;
        let defaultAdminOption: AdminConfig = input.credArray.defaultAdminConfig;
        let serDes: string = input.credArray.serializationDirectory;
        let preConfig: boolean = input.credArray.preConfig;
        let supportBundles: boolean = input.credArray.supportBundles;
        let enableHotPatches: boolean = input.credArray.enableHotPatches;

        let execString: string = " -h " + this._hostnameLocation;
        execString += " -l " + username;
        if (hasPrivHosts) {
            execString += " --priv-hosts-file " + this._privHostnameLocation;
        }
        if ("password" in credentialsOption) {
            execString += " --ssh-mode password";
            execString += " --password-file " + this._credentialLocation;
        } else if ("sshKey" in credentialsOption) {
            execString += " --ssh-mode key";
            execString += " -i " + this._credentialLocation;
        } else if ("sshUserSettings" in credentialsOption) {
            execString += " --ssh-mode user";
        }
        execString += " -p " + port;
        execString += " --license-file " + this._licenseLocation;
        // execString += " --installer " + installerLocation;

        if (nfsOption) {
            // Xcalar to mount NFS
            if (nfsOption.option === "customerNfs") {
                execString += " --nfs-mode external";
                execString += " --nfs-host " + nfsOption.nfsServer;
                execString += " --nfs-folder " + nfsOption.nfsMountPoint;
                if (nfsOption.nfsUsername) {
                    execString += " --nfs-uid " + nfsOption.nfsUsername;
                }
                if (nfsOption.nfsGroup) {
                    execString += " --nfs-gid " + nfsOption.nfsGroup;
                }
            } else if (nfsOption.option === "readyNfs") {
                // Xcalar Root Already mounted
                execString += " --nfs-mode reuse";
                execString += " --nfs-reuse " + nfsOption.nfsReuse;
            } else if (nfsOption.option === "xcalarNfs") {
                execString += " --nfs-mode create";
            }

            if (nfsOption.copy) {
                execString += " --nfs-copy";
            }
        }
        if (ldapOption) {
            if (ldapOption.deployOption === "xcalarLdap") {
                execString += " --ldap-mode create";
                execString += " --ldap-domain " + ldapOption.domainName;
                execString += " --ldap-org " + '"' + ldapOption.companyName + '"';
                execString += " --ldap-password " + '"' + this.encryptPassword(ldapOption.password) + '"';
            } else if (ldapOption.deployOption === "customerLdap") {
                execString += " --ldap-mode external";
            }
        }
        if (defaultAdminOption) {
            if (defaultAdminOption.defaultAdminEnabled) {
                execString += " --default-admin";
                execString += " --admin-username " + '"' + defaultAdminOption.username + '"';
                execString += " --admin-email " + '"' + defaultAdminOption.email + '"';
                execString += " --admin-password " + '"' + defaultAdminOption.password + '"';
            }
        }
        if (serDes) {
            execString += " --serdes " + '"' + serDes + '"';
        }
        if (!preConfig) {
            execString += " --pre-config";
        }
        if (installationDirectory) {
            execString += " --install-dir " + installationDirectory;
        }
        if (supportBundles) {
            execString += " --support-bundles";
        }
        if (enableHotPatches) {
            execString += " --enable-hotPatches";
        }

        return execString;
    }

    private encryptPassword(password: string): string {
        let shasum: crypto.Hash = crypto.createHash('sha1');

        let salt: Buffer = crypto.randomBytes(4);
        let encryptedPassword: string = "";

        shasum.update(password);
        shasum.update(salt);

        let bufSalt: Buffer = Buffer.from(salt);
        let hexSSHA: Buffer = Buffer.from(shasum.digest('hex') + bufSalt.toString('hex'),
                                    'hex');

        encryptedPassword = '{SSHA}' + hexSSHA.toString('base64');

        return encryptedPassword;
    }

    private stdOutCallback(dataBlock: string): void {
        let lines: string[] = dataBlock.split("\n");
        let self: InstallerManager = InstallerManager.getInstance;
        for (let i = 0; i<lines.length; i++) {
            let data: string = lines[i];
            xcConsole.log("Start ==" + data + "==");
            if (data.indexOf("Step [") === 0 || data.indexOf("STEP [") === 0) {
                // New Step! Means all the old ones are done
                self._curStep.stepString = data;
                self._curStep.nodesCompletedCurrent = [];
            } else if (data.indexOf("[") === 0) {
                // One node completed current step!
                let hostId: string = (self._getNodeRegex.exec(data))[1];
                let status: string = (self._getStatusRegex.exec(data))[1];
                if (status === "SUCCESS") {
                    self._curStep.nodesCompletedCurrent[hostId] = true;
                } else {
                    self._curStep.nodesCompletedCurrent[hostId] = false;
                    // XXX error message?
                }
            }
        }
    }

    private stdErrCallback(dataBlock: string): void {
        InstallerManager.getInstance._errorLog += dataBlock + "\n";
    }

    private initialStep(credArray: CredArray): Promise<any> {
        let deferred: any = jQuery.Deferred();
        if ("password" in credArray.credentials) {
            let password: string = credArray.credentials.password;
            fs.writeFile(this._credentialLocation, password,
                        {mode: parseInt('600', 8)},
                        function(err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            deferred.resolve();
                        });
        } else if ("sshKey" in credArray.credentials) {
            let sshkey: string = credArray.credentials.sshKey;
            fs.writeFile(this._credentialLocation, sshkey,
                        {mode: parseInt('600', 8)},
                        function(err) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            deferred.resolve();
                        });
        } else {  // when it contains sshUserSettings
            deferred.resolve();
        }
        return deferred.promise();
    }

    private installUpgradeUtil(credArray: CredArray, execCommand: string,
        script?: string): Promise<any> {
        // Write files to /config and chmod
        let deferredOut: any = jQuery.Deferred();
        let hostArray: string[] = credArray.hostnames;
        let hasPrivHosts = false;
        this.clearErrorLog();


        this.initialStep(credArray)
        .then(() => {
            let deferred: any = jQuery.Deferred();
            fs.writeFile(this._hostnameLocation, hostArray.join("\n"), (err) => {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                deferred.resolve();
            });
            return deferred.promise();
        })
        .then(() => {
            let deferred: any = jQuery.Deferred();
            if (credArray.privHostNames.length > 0) {
                fs.writeFile(this._privHostnameLocation,
                            credArray.privHostNames.join("\n"),
                            (err) => {
                                if (err) {
                                    deferred.reject(err);
                                    return;
                                }
                                hasPrivHosts = true;
                                deferred.resolve();
                            });
            } else {
                fs.writeFile(this._privHostnameLocation, credArray.hostnames.join("\n"),
                            (err) => {
                                if (err) {
                                    deferred.reject(err);
                                    return;
                                }
                                hasPrivHosts = true;
                                deferred.resolve();
                            });
            }
            return deferred.promise();
        })
        .then(() => {
            let deferred: any = jQuery.Deferred();
            fs.writeFile(this._ldapLocation, JSON.stringify(credArray.ldap, null, 4),
                        (err) => {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            deferred.resolve();
                        });
            return deferred.promise();
        })
        .then(() => {
            let deferred: any = jQuery.Deferred();
            let execString: string = this._scriptDir + "/" + execCommand;
            this._cliArguments = this.genExecString({
                "hasPrivHosts": hasPrivHosts,
                "credArray": credArray
            });

            execString += this._cliArguments;
            this.initStepArray();
            let out: ChildProcess;
            if (script) {
                out = exec(script);
            } else {
                out = exec(execString);
            }

            out.stdout.on('data', this.stdOutCallback);
            out.stderr.on('data', this.stdErrCallback);

            out.on('close', (code) => {
                // Exit code. When we fail, we return non 0
                if (code) {
                    xcConsole.log("Failure: Executing " + execString +
                    " fails. " + this._errorLog);
                    this._curStep.curStepStatus = this._installStatus.Error;
                    deferred.reject();
                } else {
                    this._curStep.curStepStatus = this._installStatus.Done;
                    deferred.resolve();
                }
            });
            return deferred.promise();
        })
        .then(() => {
            deferredOut.resolve();
        })
        .fail((err) => {
            xcConsole.log("Failure: Xcalar installation fails. " + err);
            this._curStep.curStepStatus = this._installStatus.Error;
            deferredOut.reject(err);
        });
        return deferredOut.promise();
    }

    private discoverUtil(credArray: any, execCommand: string,
        script?: string): Promise<any> {
        // Write files to /config and chmod
        let deferredOut: any = jQuery.Deferred();
        let hostArray: string[] = credArray.hostnames;
        let hasPrivHosts: boolean = false;
        let retMsg: ReturnMsg;
        this.clearErrorLog();

        function initialStep(): Promise<void> {
            let deferred: any = jQuery.Deferred();
            let self: InstallerManager = InstallerManager.getInstance;
            if ("password" in credArray.credentials) {
                let password: string = credArray.credentials.password;
                fs.writeFile(self._credentialLocation, password,
                            {mode: parseInt('600', 8)},
                            (err) => {
                                if (err) {
                                    deferred.reject(err);
                                    return;
                                }
                                deferred.resolve();
                            });
            } else if ("sshKey" in credArray.credentials) {
                let sshkey: string = credArray.credentials.sshKey;
                fs.writeFile(self._credentialLocation, sshkey,
                            {mode: parseInt('600', 8)},
                            (err) => {
                                if (err) {
                                    deferred.reject(err);
                                    return;
                                }
                                deferred.resolve();
                            });
            } else {  // when it contains sshUserSettings
                deferred.resolve();
            }
            return deferred.promise();
        }

        initialStep()
        .then(() => {
            let deferred: any = jQuery.Deferred();
            fs.writeFile(this._hostnameLocation, hostArray.join("\n"), (err) => {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                deferred.resolve();
            });
            return deferred.promise();
        })
        .then(() => {
            let deferred: any = jQuery.Deferred();
            let execString: string = this._scriptDir + "/" + execCommand;
            this._cliArguments = this.genExecString({
                "hasPrivHosts": hasPrivHosts,
                "credArray": credArray
            });
            execString += this._cliArguments;
            this.initStepArray();
            let out: ChildProcess;
            if (script) {
                out = exec(script);
            } else {
                out = exec(execString);
            }

            out.stdout.on('data', this.stdOutCallback);
            out.stderr.on('data', this.stdErrCallback);

            out.on('close', (code) => {
                // Exit code. When we fail, we return non 0
                if (code) {
                    xcConsole.log("Failure: Executing " + execString +
                                " fails. " + this._errorLog);
                    deferred.reject(code);
                } else {
                    fs.readFile(this._discoveryResultLocation, "utf8", (err, data) => {
                        if (err) deferred.reject(err);
                        let discoveryResult: any = JSON.parse(data.replace(/\n$/, ''));
                        deferred.resolve(discoveryResult);
                    });
                }
            });
            return deferred.promise();
        })
        .fail((err) => {
            xcConsole.log("Failure: Xcalar discovery failed with return code: " + err);
            support.slaveExecuteAction("GET", "/installationLogs/slave",
                {isHTTP: "true"})
            .always((message) => {
                retMsg = {
                    "status": httpStatus.InternalServerError,
                    "errorLog": this._errorLog, // the error message by script running
                    "installationLogs": message.logs // all installation logs
                };
                deferredOut.reject(retMsg);
            });
        })
        .done((discoveryResult) => {
            xcConsole.log("Success: Xcalar discovery succeeded.");
            deferredOut.resolve(discoveryResult);
        });

        return deferredOut.promise();
    }

    public createStatusArray(credArray: CredArray): Promise<ReturnMsg> {
        let deferred: any = jQuery.Deferred();
        let ackArray: string[] = [];
        // Check global array that has been populated by prev step
        for (let i: number = 0; i < credArray.hostnames.length; i++) {
            if (this._curStep.nodesCompletedCurrent[i] === true) {
                ackArray.push(this._curStep.stepString + " (Done)");
            } else if (this._curStep.nodesCompletedCurrent[i] === false) {
                ackArray.push("FAILED: " + this._curStep.stepString);
            } else {
                ackArray.push(this._curStep.stepString + " (Executing)");
            }
        }
        let retMsg: ReturnMsg;
        if (this._curStep.curStepStatus === this._installStatus.Error) {
            support.slaveExecuteAction("GET", "/installationLogs/slave",
                                        {isHTTP: "true"})
            .always((message) => {
                retMsg = {
                    "status": httpStatus.OK,
                    "curStepStatus": this._curStep.curStepStatus,
                    "retVal": ackArray,
                    "errorLog": this._errorLog, // the error message by script running
                    "installationLogs": message.logs // all installation logs
                };
                deferred.reject(retMsg);
            });
        } else {
            retMsg = {
                "status": httpStatus.OK,
                "curStepStatus": this._curStep.curStepStatus,
                "retVal": ackArray
            };
            deferred.resolve(retMsg);
        }
        xcConsole.log("Success: send status array");
        return deferred.promise();
    }

    public checkLicense(credArray: any, script?: string): Promise<ReturnMsg> {
        let deferredOut: any = jQuery.Deferred();
        let fileLocation: string = this._licenseLocation;
        let compressedLicense: Buffer = Buffer.from(credArray.licenseKey,
                                                        'base64');
        let licenseStream: stream.PassThrough = new stream.PassThrough();

        licenseStream.write(compressedLicense);
        licenseStream.end();

        let zlibStream: zlib.Gunzip = zlib.createGunzip();
        let licenseFileStream: fs.WriteStream = fs.createWriteStream(fileLocation);
        licenseStream.pipe(zlibStream).pipe(licenseFileStream);

        let retMsg: ReturnMsg;
        zlibStream.on('error', (err) => {
            // will hit this when has error format license
            xcConsole.error('zlibStream', err);
            retMsg = {"status": httpStatus.InternalServerError};
            if (err) {
                deferredOut.reject(retMsg);
                return;
            }
        });

        licenseFileStream.on('error', (err) => {
            xcConsole.error('licenseFileStream', err);
            retMsg = {"status": httpStatus.InternalServerError};
            if (err) {
                deferredOut.reject(retMsg);
                return;
            }
        });

        licenseFileStream.on('close', (data) => {
            let out: ChildProcess;
            if (script) {
                out = exec(script);
            } else {
                out = exec(this._scriptDir + '/01-* --license-file ' + fileLocation);
            }
            out.stdout.on('data', (data) => {
                if (data.indexOf("SUCCESS") > -1) {
                    retMsg = {"status": httpStatus.OK, "verified": true};
                    xcConsole.log("Success: Check License");
                    // deferredOut.resolve(retMsg);
                } else if (data.indexOf("FAILURE") > -1) {
                    retMsg = {"status": httpStatus.OK, "verified": false};
                    xcConsole.log("Failure: Check License");
                    // deferredOut.reject(retMsg);
                }
            });
            out.stdout.on('close', (data) => {
                if (retMsg && retMsg.hasOwnProperty("verified") && retMsg.verified) {
                    // Only resolve when verified is true
                    retMsg['data'] = {};
                    let licenseDataStr: string = fs.readFileSync(fileLocation).toString();
                    licenseDataStr.split('\n').forEach((line) => {
                        let arr: string[] = line.split('=');
                        if (arr[0] !== '') {
                            retMsg.data[arr[0]] = arr[1];
                        }
                    });

                    deferredOut.resolve(retMsg);
                } else {
                    // This can be: 1. verified is false.
                    // 2. For test case when data does not contain SUCCESS or FAILURE
                    retMsg = retMsg || {"status": httpStatus.InternalServerError};
                    deferredOut.reject(retMsg);
                }
            });
        });

        return deferredOut.promise();
    }

    public installXcalar(credArray: CredArray): void {
        this.installUpgradeUtil(credArray, "cluster-install.sh");
    }

    public upgradeXcalar(credArray: CredArray): void {
        this.installUpgradeUtil(credArray, "cluster-upgrade.sh");
    }

    public uninstallXcalar(credArray: CredArray): void {
        this.installUpgradeUtil(credArray, "cluster-uninstall.sh");
    }

    public discoverXcalar(credArray: CredArray): Promise<any> {
        return this.discoverUtil(credArray, "cluster-discover.sh");
    }
}

const installerManager = InstallerManager.getInstance;
export default installerManager;
