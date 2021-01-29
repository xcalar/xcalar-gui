import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as timer from "timers";
import * as http from "http";
import * as https from "https";
import * as cookie from "cookie";
import * as jwt from "jsonwebtoken";
import { cloudMode, getNodeCloudOwner } from "../expServer";

import * as tail from "./tail";
import * as xcConsole from "./expServerXcConsole.js";
import { httpStatus } from "../../../assets/js/httpStatus.js";

interface ReturnMsg {
    status: string | number,
    error?: string,
    logs?: string,
}

interface MasterExecMsg {
    status: string | number,
    logs?: string,
    results?: StringObj,
    updatedLastMonitorMap?: StringObj,
}

interface MatchHostsMsg {
    status: any,
    matchHosts: string[],
    matchNodeIds: string[],
}

interface StringObj {
    [keys: string]: any,
}

interface HotPatchMsg {
    status: string | number,
    error?: string,
    hotPatchWritten?: boolean,
    hotPatchEnabled?: boolean,
}

class ExpServerSupport {
    private static _instance = null;
    public static get getInstance(): ExpServerSupport {
        return this._instance || (this._instance = new this());
    }

    private jQuery: any;
    private readonly _defaultStartCommand: string;
    private readonly _defaultStopCommand: string;
    private readonly _defaultStatusCommand: string;
    private readonly _supportBundleCommand: string;
    private readonly _installationLogPath: string;
    private readonly _defaultHttpPort: string|number;
    private readonly _defaultHttpsPort: string|number;
    private readonly _defaultJwtHmac: string;
    private readonly _hotPatchPath: string = "/config/hotPatch.json";
    private readonly _defaultHostsFile: string = "/etc/xcalar/default.cfg";
    // timeout for waiting the command to be executed
    private readonly _timeout = 300000;
    // XI need to wait for the master node response, master node need
    // to wait for all slave node responses, slave node need to wait
    // for execution to stop. The higher layer should wait longer.
    private readonly _expendFactor = 1.2;
    // for monitorRecentLogs(), do not want to wait to long
    private readonly _monitorFactor = 0.005;

    readonly cookieName: string = "connect.sid";
    readonly sessionAges: any = {
        interactive: 1800000,
        api: 7200000,
        sql: 7200000,
        xshell: 14400000,
        test: 30000
    };
    readonly defaultSessionAge: string = 'interactive';

    private constructor() {
        require("jsdom/lib/old-api").env("", (err, window) => {
            if (err) {
                xcConsole.error('require in expServerSupport', err);
                return;
            }
            this.jQuery = require("jquery")(window);
        });

        // we need to fix this eventually, but for now ignore untrusted certs
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

        const useSystemd = process.env.XCE_USE_SYSTEMD || '0';
        const usrnodeSystemUnit = process.env.XCE_USRNODE_UNIT ||
            'xcalar-usrnode.service';
        const defaultXcalarDir: string = process.env.XLRDIR || "/opt/xcalar";
        const defaultXcalarctl: string = defaultXcalarDir + "/bin/xcalarctl";
	const defaultSystemctl = "sudo /usr/bin/systemctl";
	const defaultSystemdCgls = "systemd-cgls";
        this._defaultStartCommand = useSystemd == '0' ?
            defaultXcalarctl + " start" :
            defaultSystemctl + ' start ' + usrnodeSystemUnit +
            ' && usrnode-service-responding.sh';
        this._defaultStopCommand = useSystemd == '0' ?
            defaultXcalarctl + " stop" :
            defaultSystemctl + ' stop ' + usrnodeSystemUnit;
        this._defaultStatusCommand = useSystemd == '0' ?
            defaultXcalarctl + " status" :
            defaultSystemdCgls + ' --all /xcalar.slice | iconv -f utf-8 -t ascii//TRANSLIT';
        this._supportBundleCommand = defaultXcalarDir +
            "/scripts/support-generate.sh";
        if (process.env.TMPDIR) {
            this._installationLogPath = process.env.TMPDIR +
                "/xcalar-install-expserver.log";
        }
        this._defaultHttpPort = process.env.XCE_HTTP_PORT ?
            process.env.XCE_HTTP_PORT : 80;
        this._defaultHttpsPort = process.env.XCE_HTTPS_PORT ?
            process.env.XCE_HTTPS_PORT : 443;
        this._defaultJwtHmac = process.env.JWT_SECRET ?
            process.env.JWT_SECRET : "xcalarSsssh";

    }

    getMatchedHosts(query): XDPromise<MatchHostsMsg> {
        let deferred = this.jQuery.Deferred();
        const hostFile: string = process.env.XCE_CONFIG ?
                    process.env.XCE_CONFIG : this._defaultHostsFile;
        let matchHosts: string[] = [];
        let matchNodeIds: string[] = [];
        let retMsg: MatchHostsMsg;
        this.readHostsFromFile(hostFile)
        .then(({hosts, nodeIds}) => {
            if (query.hostnamePattern === "") {
                retMsg = {
                    "status": httpStatus.OK,
                    "matchHosts": hosts,
                    "matchNodeIds": nodeIds
                };
                deferred.resolve(retMsg);
            } else {
                try {
                    for (let i: number = 0; i < hosts.length; i++) {
                        let reg: RegExp = new RegExp(query.hostnamePattern);
                        if (reg.exec(hosts[i]) || reg.exec(nodeIds[i])) {
                            matchHosts.push(hosts[i]);
                            matchNodeIds.push(nodeIds[i]);
                        }
                    }
                    retMsg = {
                        "status": httpStatus.OK,
                        "matchHosts": matchHosts,
                        "matchNodeIds": matchNodeIds
                    };
                    deferred.resolve(retMsg);
                } catch (err) {
                    xcConsole.error('get host', err);
                    retMsg = {
                        // No matter what error happens, the master
                        // should return return a 404 uniformly
                        "status": httpStatus.NotFound,
                        "matchHosts": [],
                        "matchNodeIds": []
                    };
                    deferred.reject(retMsg);
                }
            }
        })
        .fail((err) => {
            xcConsole.error('get host', err);
            retMsg = {
                // No matter what error happens, the master
                // should return return a 404 uniformly
                "status": httpStatus.NotFound,
                "matchHosts": [],
                "matchNodeIds": []
            };
            deferred.reject(retMsg);
        });
        return deferred.promise();
    }

    // Get all the Hosts from file
    readHostsFromFile(hostFile: string):
        XDPromise<{hosts: string[], nodeIds:string[]}> {
        let deferred = this.jQuery.Deferred();
        let hosts: string[] = [];
        let nodeIds: string[] = [];

        fs.readFile(hostFile, "utf8", (err, hostData) => {
            if (err) {
                xcConsole.error('read host file', err);
                return deferred.reject(err);
            }
            let tempHosts: string[] = hostData.split("\n");
            for (let i: number = 0; i < tempHosts.length; i++) {
                let str: string = tempHosts[i].trim();
                if((str.length < 2) || (str[0] == '/' && str[1] =='/') ||
                    (str[0] == '#')) {
                    continue;
                }
                let re: RegExp = /Node\.([0-9]+)\.IpAddr=(.*)/g;
                let matches: RegExpExecArray = re.exec(str);
                if (matches && matches.length >= 3) {
                    nodeIds.push(matches[1]);
                    hosts.push(matches[2]);
                }
            }
            deferred.resolve({hosts, nodeIds});
        });
        return deferred.promise();
    }

    masterExecuteAction(action: string, slaveUrl: string, content,
        sessionCookie: string, withGivenHost?): XDPromise<ReturnMsg> {
        let deferredOut = this.jQuery.Deferred();
        const self: ExpServerSupport = this;
        function readHosts(): XDPromise<string[]> {
            let deferred = self.jQuery.Deferred();
            let retMsg: ReturnMsg;
            if (withGivenHost) {
                if (!content || !content.hosts || content.hosts.length === 0) {
                    retMsg = {
                        "status": httpStatus.NotFound,
                        "error": "Not hosts can be found on this cluster!"
                    };
                    deferred.reject(retMsg);
                } else {
                    deferred.resolve(content.hosts);
                }
            } else {
                const hostFile: string = process.env.XCE_CONFIG ?
                                process.env.XCE_CONFIG : self._defaultHostsFile;
                self.readHostsFromFile(hostFile)
                .then(({hosts, nodeIds}) => {
                    if (hosts.length === 0) {
                        retMsg = {
                            "status": httpStatus.NotFound,
                            "error": "Not hosts can be found on this cluster!"
                        };
                        deferred.reject(retMsg);
                    } else {
                        deferred.resolve(hosts);
                    }
                })
                .fail((err) => {
                    retMsg = {
                        // No matter what error happens, the master
                        // should return return a 404 uniformly
                        "status": httpStatus.NotFound,
                        "error": JSON.stringify(err)
                    };
                    deferred.reject(retMsg);
                });
            }
            return deferred.promise();
        }

        readHosts()
        .then((hosts) => {
            let deferred = this.jQuery.Deferred();
            let retMsg: MasterExecMsg;
            this.sendCommandToSlaves(action, slaveUrl, content, hosts,
                sessionCookie)
            .then((results) => {
                if (slaveUrl === "/service/logs/slave") {
                    retMsg = {
                        // If every child node return with status 200,
                        // then master should return a 200 code
                        "status": httpStatus.OK,
                        "results": results
                    };
                    if (content.isMonitoring === "true") {
                        retMsg.updatedLastMonitorMap = this
                            .generateLastMonitorMap(results);
                    }
                } else {
                    retMsg = {
                        // If every child node return with status 200,
                        // then master should return a 200 code
                        "status": httpStatus.OK,
                        "logs": this.generateLogs(action, slaveUrl, results)
                    };
                }
                deferred.resolve(retMsg);
            })
            .fail((results) => {
                if (slaveUrl === "/service/logs/slave") {
                    retMsg = {
                        // If every child node return with status 200,
                        // then master should return a 200 code
                        "status": httpStatus.OK,
                        "results": results
                    };
                    if (content.isMonitoring === "true") {
                        retMsg.updatedLastMonitorMap = this
                            .generateLastMonitorMap(results);
                    }
                } else {
                    retMsg = {
                        // If every child node return with status 200,
                        // then master should return a 200 code
                        "status": httpStatus.OK,
                        "logs": this.generateLogs(action, slaveUrl, results)
                    };
                }
                deferred.reject(retMsg);
            });
            return deferred.promise();
        })
        .then((retMsg) => {
            deferredOut.resolve(retMsg);
        })
        .fail((retMsg) => {
            deferredOut.resolve(retMsg);
        });
        return deferredOut.promise();
    }

    slaveExecuteAction(action: string, slaveUrl: string, content?):
        XDPromise<ReturnMsg> {
        switch (slaveUrl) {
            case "/service/start/slave" :
                return this.xcalarStart();
            case "/service/stop/slave" :
                return this.xcalarStop();
            case "/service/status/slave" :
                return this.xcalarStatus();
            case "/service/logs/slave":
                {
                    let deferredOut = this.jQuery.Deferred();
                    if (content.isMonitoring === "true") {
                        tail.monitorLog(Number(content.lastMonitor),
                            content.filePath, content.fileName)
                        .always((message) => {
                            deferredOut.resolve(message);
                        });
                    } else {
                        tail.tailLog(Number(content.requireLineNum),
                            content.filePath, content.fileName)
                        .always((message) => {
                            deferredOut.resolve(message);
                        });
                    }
                    return deferredOut.promise();
                }
            case "/installationLogs/slave":
                return this.readInstallerLog(this._installationLogPath);
            case "/service/bundle/slave":
                return this.generateSupportBundle();
            default:
                xcConsole.error("Should not be here!");
        }
    }

    private sendCommandToSlaves(action: string, slaveUrl: string, content,
        hosts: string[], sessionCookie: string): XDPromise<StringObj> {
        let deferredOut = this.jQuery.Deferred();
        let numDone: number = 0;
        let returns: StringObj = {};
        let hasFailure: boolean = false;
        let self: ExpServerSupport = this;
        for (let i: number = 0; i < hosts.length; i++) {
            if (slaveUrl === "/service/logs/slave" &&
                content.isMonitoring === "true") {
                addLastMonitorIndex(hosts[i], content);
            }
            postRequest(hosts[i], content);
        }

        function addLastMonitorIndex(hostname: string, content) {
            let lastMonitorMap = JSON.parse(content.lastMonitorMap);
            let lastMonitor;
            if (lastMonitorMap && lastMonitorMap[hostname]) {
                lastMonitor = lastMonitorMap[hostname];
            } else {
                lastMonitor = -1;
            }
            content.lastMonitor = lastMonitor;
        }

        function postRequest(hostName: string, content) {
            let postData: string;
            if (content) {
                postData = JSON.stringify(content);
            } else {
                // content can not be empty
                postData = "{}";
            }

            let options = {
                host: hostName,
                port: content.isHTTP === "true"? self._defaultHttpPort :
                                                    self._defaultHttpsPort,
                path: '/app' + slaveUrl,
                method: action,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            if (sessionCookie) {
                options.headers['Cookie'] = self.cookieName + '=' +
                    sessionCookie;
            }
            let protocol = content.isHTTP === "true" ? http: https;
            let req = protocol.request(options, (res) => {
                let data: string = "";
                res.on('data', (retData) => {
                    data += retData;
                });

                res.on('end', () => {
                    res.setEncoding('utf8');
                    let retMsg;
                    try {
                        retMsg = JSON.parse(data);
                        if (retMsg.status !== httpStatus.OK) {
                            hasFailure = true;
                        }
                    } catch (error) {
                        retMsg = {
                            status: httpStatus.InternalServerError,
                            //logs: error.message
                            error: "Error occurred on the node."
                        };
                        hasFailure = true;
                    }
                    returns[hostName] = retMsg;
                    numDone++;
                    if (numDone === hosts.length) {
                        if (hasFailure) {
                            deferredOut.reject(returns);
                        } else {
                            deferredOut.resolve(returns);
                        }
                    }
                });
            });
            req.on('socket', (socket) => {
                // 2 is for restart command (need double time)
                socket.setTimeout(action === "/service/logs/slave" ?
                    self._timeout * self._monitorFactor : 2 * self._timeout *
                        self._expendFactor);
                socket.on('timeout', () => {
                    req.abort();
                });
            });
            req.on('error', (error) => {
                xcConsole.error('req in postRequest', error);
                let retMsg: ReturnMsg = {
                    status: httpStatus.InternalServerError,
                    logs: error.message
                };
                returns[hostName] = retMsg;
                hasFailure = true;
                numDone++;
                if (numDone === hosts.length) {
                    if (hasFailure) {
                        deferredOut.reject(returns);
                    } else {
                        deferredOut.resolve(returns);
                    }
                }
            });
            req.write(postData);
            req.end();
        }
        return deferredOut.promise();
    }

    private generateLogs(action: string, slaveUrl: string, results): string {
        let str: string = "Execute " + action + " " +
                slaveUrl.substring(0, slaveUrl.length - "/slave".length) +
                " for all Nodes:\n\n";
        if (results) {
            for (let key in results) {
                let resSlave = results[key];
                str = str + "Host: " + key + "\n" +
                    "Return Status: " + resSlave.status + "\n";
                if (resSlave.logs) {
                    str = str + "Logs:\n" + resSlave.logs + "\n\n";
                } else if (resSlave.error) {
                    str = str + "Error:\n" + resSlave.error + "\n\n";
                }
            }
        }
        return str;
    }

    // Handle Xcalar Services
    private xcalarStart(): XDPromise<ReturnMsg> {
        xcConsole.log("Starting Xcalar");
        // only support root user
        // let command = 'service xcalar start';
        // support non-root user
        return this.executeCommand(this._defaultStartCommand);
    }

    private xcalarStop(): XDPromise<ReturnMsg> {
        xcConsole.log("Stopping Xcalar");
        // only support root user
        // let command = 'service xcalar stop';
        // support non-root user
        return this.executeCommand(this._defaultStopCommand);
    }

    private getOperatingSystem(): XDPromise<ReturnMsg> {
        xcConsole.log("Getting operating system");
        let command = "cat /etc/*release";
        return this.executeCommand(command);
    }

    private xcalarStatus(): XDPromise<ReturnMsg> {
        xcConsole.log("Getting Xcalar Status");
        // only support root user
        // let command = 'service xcalar status';
        // support non-root user
        return this.executeCommand(this._defaultStatusCommand);
    }

    private generateSupportBundle(): XDPromise<ReturnMsg> {
        xcConsole.log("Generating Support Bundle");
        return this.executeCommand(this._supportBundleCommand);
    }
    // Remove session files
    removeSessionFiles(filePath: string): XDPromise<ReturnMsg> {
        xcConsole.log("Remove Session Files");
        // '/var/opt/xcalar/sessions' without the final slash is also legal
        let deferredOut = this.jQuery.Deferred();

        this.getXlrRoot()
        .then((xlrRoot) => {
            let deferred = this.jQuery.Deferred();
            const sessionPath: string = xlrRoot + "/sessions/";
            let completePath: string = this.getCompletePath(sessionPath,
                                                                filePath);
            const isLegalPath: boolean = this.isUnderBasePath(sessionPath,
                                                        completePath);
            if (!isLegalPath) {
                const logs: string = "The filename " + filePath +
                    " is illegal, please " +
                    "Send a legal Session file/folder name.";
                const retMsg = {"status": httpStatus.BadRequest,
                    "logs": logs};
                deferred.reject(retMsg);
                return;
            }
            // Handle'/var/opt/xcalar/sessions',
            // change to'/var/opt/xcalar/sessions/'
            if (completePath === sessionPath.substring(0,
                                                    sessionPath.length - 1)) {
                completePath = completePath + '/';
            }
            // Handle '/var/opt/xcalar/sessions/', avoid delete the whole session
            // folder, just delete everything under this folder.
            if (completePath === sessionPath) {
                completePath = completePath + '*';
            }
            xcConsole.log("Remove file at: " + completePath);
            const command: string = 'rm -rf ' + completePath;
            deferred.resolve(command);
            return deferred.promise();
        })
        .then((command) => {
            return this.executeCommand(command);
        })
        .then(() => {
            const logs: string = "Remove " + filePath + " successfully!";
            const retMsg = {
                "status": httpStatus.OK,
                "logs": logs
            };
            deferredOut.resolve(retMsg);
        })
        .fail((retMsg) => {
            deferredOut.reject(retMsg);
        });
        return deferredOut.promise();
    }

    removeSHM(): XDPromise<ReturnMsg> {
        xcConsole.log("Remove SHM");
        const command: string = 'rm /dev/shm/xcalar-*';
        return this.executeCommand(command);
    }

    private getCompletePath(sessionPath: string, filePath: string): string {
        let normalizedPath: string;
        if (filePath === undefined) {
            filePath = "";
        }
        if (path.isAbsolute(filePath)) {
            normalizedPath = path.normalize(filePath);
        } else {
            normalizedPath = path.normalize(sessionPath + filePath);
        }
        return normalizedPath;
    }

    private isUnderBasePath(basePath: string, completePath: string) : boolean {
        return completePath.indexOf(basePath) === 0 ||
            completePath === basePath.substring(0, basePath.length - 1);
    }

    private executeCommand(command: string): XDPromise<ReturnMsg> {
        let deferred = this.jQuery.Deferred();
        let intervalID: NodeJS.Timeout;
        let out: cp.ChildProcess = cp.exec(command);
        let lines: string = "";
        let isResolved: boolean = false;
        let self: ExpServerSupport = this;

        // could overtime
        intervalID = timer.setTimeout(() => {
            let result;
            result = {"status": self.isComplete(command, lines) ? httpStatus.OK :
                httpStatus.InternalServerError,
                "logs": lines};
            timer.clearTimeout(intervalID);
            if (!isResolved) {
                if (result.status === httpStatus.OK) {
                    deferred.resolve(result);
                } else {
                    deferred.reject(result);
                }
                isResolved = true;
                return;
            }
        }, this._timeout);

        out.stdout.on('data', (data: string) => {
            xcConsole.log(data);
            lines += data;
        });

        out.stdout.on('close', () => {
            const result: ReturnMsg = {
                "status": self.isComplete(command, lines) ? httpStatus.OK :
                httpStatus.InternalServerError,
                "logs": lines
            };
            if (!isResolved) {
                if (result.status === httpStatus.OK) {
                    deferred.resolve(result);
                } else {
                    deferred.reject(result);
                }
                isResolved = true;
                return;
            }
            return;
        });

        out.stdout.on('error', (data) => {
            xcConsole.error('running command', data);
            lines += data;
            const result: ReturnMsg = {
                "status": httpStatus.InternalServerError,
                "logs": lines
            };
            deferred.reject(result);
            return;
        });

        return deferred.promise();
    }

    private isComplete(command: string, data: string): boolean {
        if (command === this._defaultStartCommand) {
            if ((data.indexOf("xcmgmtd started") !== -1) ||
                (data.indexOf("Usrnode already running") !== -1)) {
                return true;
            } else {
                return false;
            }
        } else if (command === this._defaultStopCommand) {
            if (data.indexOf("Stopped Xcalar") !== -1) {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }

    // Other commands
    getXlrRoot(filePath?: string): XDPromise<string> {
        let cfgLocation: string =  process.env.XCE_CONFIG ?
            process.env.XCE_CONFIG : this._defaultHostsFile;
        if (filePath) {
            cfgLocation = filePath;
        }
        let deferred = this.jQuery.Deferred();
        let defaultLoc: string = "/mnt/xcalar";
        fs.readFile(cfgLocation, "utf8", (err, data: string) => {
            try {
                if (err) throw err;
                const lines: string[] = data.split("\n");
                let i: number = 0;
                const rePattern: RegExp = new RegExp(
                    /^Constants.XcalarRootCompletePath\s*=\s*(.*)$/);
                for (; i<lines.length; i++) {
                    const res: RegExpMatchArray =
                        lines[i].trim().match(rePattern);
                    if (res != null) {
                        defaultLoc = res[1];
                        break;
                    }
                }
                deferred.resolve(defaultLoc);
            } catch (error) {
                deferred.resolve("/mnt/xcalar");
            }
        });

        return deferred.promise();
    }

    getLicense(): XDPromise<ReturnMsg> {
        let deferredOut = this.jQuery.Deferred();
        let retMsg: ReturnMsg;
        this.getXlrRoot()
        .then((xlrRoot) => {
            const location: string = path.join(xlrRoot, "license");
            let licenseLocation: string;
            try {
                let max: number = -1;
                fs.readdirSync(location).forEach((file: string) => {
                    if (file.startsWith("XcalarLic#")) {
                        const licNum: number = parseInt(
                            file.substring(file.lastIndexOf("#") + 1));
                        max = Math.max(max, licNum);
                    }
                });
                if (isNaN(max)) {
                    retMsg = {"status": httpStatus.BadRequest,
                            "error": "Invalid license name"};
                    deferredOut.reject(retMsg);
                } else if (max === -1) {
                    retMsg = {"status": httpStatus.BadRequest,
                            "error": "No license found"};
                    deferredOut.reject(retMsg);
                } else {
                    licenseLocation = path.join(location, "XcalarLic#" + max);
                    xcConsole.log("Fetching license at: " + licenseLocation);
                    let licenseContent = fs.readFileSync(licenseLocation);
                    retMsg = {"status": httpStatus.OK,
                            "logs": licenseContent.slice(24).toString()};
                    deferredOut.resolve(retMsg);
                }
            } catch (error) {
                xcConsole.error('get license', error);
                retMsg = {
                    "status": httpStatus.BadRequest,
                    "error": error
                };
                deferredOut.reject(retMsg);
            }
        })
        .fail((error) => {
            retMsg = {
                "status": httpStatus.BadRequest,
                "error": error
            };
            deferredOut.reject(retMsg);
        });

        return deferredOut.promise();
    }

    submitTicket(contents): XDPromise<ReturnMsg> {
        let deferredOut = this.jQuery.Deferred();

        this.jQuery.ajax({
            "type": "POST",
            "data": contents,
            "contentType": "application/json",
            "url": "https://1pgdmk91wj.execute-api.us-west-2.amazonaws.com/" +
                "stable/zendesk",
            "cache": false,
            success: (data: string) => {
                xcConsole.log('submit ticket', data);
                deferredOut.resolve({
                    "status": httpStatus.OK,
                    "logs": JSON.stringify(data)
                });
            },
            error: (err) => {
                xcConsole.error('submit ticket', err);
                deferredOut.reject(err);
                return;
            }
        });
        return deferredOut.promise();
    }

    getTickets(contents): XDPromise<ReturnMsg> {
        let deferred = this.jQuery.Deferred();
        // using POST unless we figure out how to configure GET request with AWS
        this.jQuery.ajax({
            "type": "POST",
            "data": contents,
            "contentType": "application/json",
            "url": "https://1pgdmk91wj.execute-api.us-west-2.amazonaws.com/" +
                "stable/zendesklist",
            "cache": false,
            success: (data: string) => {
                xcConsole.log('get ticket', data);
                deferred.resolve({
                    "status": httpStatus.OK,
                    "logs": JSON.stringify(data)
                });
            },
            error: (err) => {
                xcConsole.error('get ticket', err);
                deferred.reject(err);
                return;
            }
        });
        return deferred.promise();
    }

    hasLogFile(filePath: string): XDPromise<boolean> {
        let deferred = this.jQuery.Deferred();
        fs.access(filePath, (err) => {
            if (!err) {
                deferred.resolve(true);
                return;
            } else {
                deferred.reject();
                return;
            }
        });
        return deferred.promise();
    }

    private generateLastMonitorMap(results): StringObj {
        let lastMonitorMap = {};
        if (results) {
            for (let key in results) {
                let resSlave = results[key];
                if (resSlave.lastMonitor) {
                    lastMonitorMap[key] = resSlave.lastMonitor;
                }
            }
        }
        return lastMonitorMap;
    }

    private readInstallerLog(filePath?: string): XDPromise<ReturnMsg> {
        let deferred = this.jQuery.Deferred();
        let defaultPath: string = '/tmp/xcalar/cluster-install.log';
        if (filePath) {
            defaultPath = filePath;
        }
        fs.readFile(defaultPath, 'utf8', (err, data) => {
            if (err) {
                deferred.reject({
                    "status": httpStatus.InternalServerError,
                    "error": err
                });
            } else {
                deferred.resolve({
                    "status": httpStatus.OK,
                    "logs": data
                });
            }
        });
        return deferred.promise();
    }

    // Keep it incase the future admin Panel need to call it
    setHotPatch(enableHotPatches: string): XDPromise<HotPatchMsg> {
        let deferred = this.jQuery.Deferred();
        this.getXlrRoot()
        .then((xlrRoot: string) => {
            const hotPatchFullPath: string = path.join(xlrRoot,
                                                            this._hotPatchPath);
            const hotPatchConfig = {"hotPatchEnabled":(enableHotPatches ? true :
                                                                        false)};
            return (this.writeToFile(hotPatchFullPath, hotPatchConfig,
                                    {"mode": 0o600}));
        })
        .then(() => {
            const message: HotPatchMsg = {"status": httpStatus.OK,
                                        "hotPatchWritten": true };
            deferred.resolve(message);
        })
        .fail((errorMsg) => {
            const message: HotPatchMsg = {"status": httpStatus.OK,
                                "hotPatchWritten": false, "error": errorMsg };
            deferred.reject(message);
        });
        return deferred.promise();
    }

    getHotPatch(): XDPromise<HotPatchMsg> {
        let deferred = this.jQuery.Deferred();
        let message: HotPatchMsg = {"status": httpStatus.OK,
                                    "hotPatchEnabled": true };

        this.getXlrRoot()
        .then((xlrRoot: string) => {
            const hotPatchFullPath: string = path.join(xlrRoot,
                                                        this._hotPatchPath);
            try {
                delete require.cache[require.resolve(hotPatchFullPath)];
                let hotPatchConfig = require(hotPatchFullPath);
                message.hotPatchEnabled = hotPatchConfig.hotPatchEnabled;
                deferred.resolve(message);
            } catch (error) {
                message.error = error;
                deferred.resolve(message);
            }
        })
        .fail((errorMsg) => {
            message.error = errorMsg;
            deferred.resolve(message);
        });
        return deferred.promise();
    }

    writeToFile(filePath: string, fileContents, fileOptions) {
        let deferred = this.jQuery.Deferred();

        function callback(err) {
            if (err) {
                xcConsole.error("Failed to write: " + JSON.stringify(err), 'to',
                                filePath);
                deferred.reject("Failed to write to " + filePath);
                return;
            }

            xcConsole.log("Successfully wrote " +
                JSON.stringify(fileContents, null, 2) + " to " + filePath)
            deferred.resolve();
        }

        if (fileOptions == null) {
            fs.writeFile(filePath, JSON.stringify(fileContents, null, 2),
                            callback);
        } else {
            fs.writeFile(filePath, JSON.stringify(fileContents, null, 2),
                            fileOptions, callback);
        }

        return deferred.promise();
    }

    makeFileCopy(filePath: string) {
        let deferred = this.jQuery.Deferred();
        const copyPath: string = filePath + ".bak";
        let copyDoneCalled: boolean = false

        function copyDone(isSuccess: boolean, errorMsg: string) {
            if (!copyDoneCalled) {
                copyDoneCalled = true;
                if (isSuccess) {
                    deferred.resolve();
                } else {
                    deferred.reject(errorMsg);
                }
            }
        }

        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                // File doesn't exist. Nothing to do
                deferred.resolve();
            } else {
                let readStream = fs.createReadStream(filePath);
                readStream.on("error", () => {
                    copyDone(false, "Error reading from " + filePath);
                });

                let writeStream = fs.createWriteStream(copyPath);
                writeStream.on("error", () => {
                    copyDone(false, "Error writing to " + copyPath);
                });
                writeStream.on("close", () =>{
                    copyDone(true, "");
                });

                // Start the copy
                readStream.pipe(writeStream);
            }
        });

        return deferred.promise();
    }

    /*
    ================================Router Handler==============================
    */

    create_login_jwt(req, res) {
        const self: ExpServerSupport = ExpServerSupport.getInstance;
        const timeout: number = (req.session.hasOwnProperty('timeout')) ?
            req.session.timeout : self.sessionAges[self.defaultSessionAge]/1000;

        const payload = {expiresIn: timeout, audience: "xcalar", issuer: "XCE",
                            subject: "auth id"};
        let token = jwt.sign(payload, self._defaultJwtHmac);
        res.cookie("jwt_token", token,
                    { maxAge: 1000*timeout, httpOnly: true, signed: false });
    }

    loginAuth(req, res) {
        ExpServerSupport.getInstance.loginAuthImpl(req, res);
    }

    private loginAuthImpl(req, res) {
        let message: any = {
            'status': httpStatus.Unauthorized
        };
        let modified: boolean = false;
        const self: ExpServerSupport = ExpServerSupport.getInstance;
        try {
            message = JSON.parse(res.locals.message);
        } catch(e) {
            xcConsole.error('loginAuth: ', e);
        }

        if (message.hasOwnProperty('isValid') &&
            message.hasOwnProperty('isAdmin') &&
            message.hasOwnProperty('isSupporter')) {

            if (message.isValid) {
                let sessionType = self.defaultSessionAge;

                req.session.loggedIn = true;

                req.session.loggedInAdmin = message.isAdmin;
                req.session.loggedInUser = !message.isAdmin;

                req.session.username = message.xiusername;
                req.session.firstName = message.firstName;
                req.session.emailAddress = message.mail;
                req.session.timeout = self.sessionAges['interactive']/1000;

                if (message.tokenType && message.tokenType !== "") {
                    if (! req.session.credentials) {
                        req.session.credentials = {};
                    }

                    req.session.credentials[message.tokenType] = message.token;
                    delete message.token;
                }
                try {
                    sessionType = JSON.parse(res.locals.sessionType);
                } catch(e) {
                    xcConsole.error('loginAuth sessionType: ', e);
                }

                if (sessionType !== self.defaultSessionAge) {
                    req.session.cookie.maxAge = self.sessionAges[sessionType];
                    req.session.timeout = self.sessionAges[sessionType]/1000;
                    modified = true;
                }

                self.create_login_jwt(req, res);
            }
        }

        if (modified) {
            req.session.save(() => {
                res.status(message.status).send(message);
            });
        } else {
            res.status(message.status).send(message);
        }
    }

    checkAuth(req, res, next) {
        ExpServerSupport.getInstance.checkAuthImpl(req, res, next);
    }

    private checkAuthImpl(req, res, next) {
        let message = { "status": httpStatus.Unauthorized, "success": false };
        let notLoggedIn = !req.session.hasOwnProperty('loggedIn') ||
            !req.session.loggedIn;
        let nodeCloudOwner = getNodeCloudOwner();

        if (cloudMode == 1) {
            notLoggedIn = notLoggedIn ||
                (req.session.username !== nodeCloudOwner);
        }

	if (notLoggedIn) {
            res.status(message.status).send(message);
            next('router');
            return;
        }

        ExpServerSupport.getInstance.create_login_jwt(req, res);

        next();
    }

    checkAuthAdmin(req, res, next) {
        ExpServerSupport.getInstance.checkAuthAdminImpl(req, res, next);
    }

    private checkAuthAdminImpl(req, res, next) {
        let message = { "status": httpStatus.Unauthorized, "success": false };
        let notLoggedIn = !req.session.hasOwnProperty('loggedIn') ||
            !req.session.loggedInAdmin;
        let nodeCloudOwner = getNodeCloudOwner();

        if (cloudMode == 1) {
            notLoggedIn = notLoggedIn ||
                (req.session.username !== nodeCloudOwner);
        }

	if (notLoggedIn) {
            res.status(message.status).send(message);
            next('router');
            return;
        }

        ExpServerSupport.getInstance.create_login_jwt(req, res);

        next();
    }

    checkProxyAuth(req, res, type) {
        return ExpServerSupport.getInstance.checkProxyAuthImpl(req, res, type);
    }

    private checkProxyAuthImpl(req, res, type) {
        if (! req.session.hasOwnProperty('loggedIn') ||
            ! req.session.loggedIn ) {
            res.status(httpStatus.Unauthorized).send('Unauthorized ' +
                type + ' request');
            return false;
        }

        ExpServerSupport.getInstance.create_login_jwt(req, res);

        return true;
    }

    rawSessionCookie(req): null | string {
        let rawCookie = null;
        let header = req.headers.cookie;

        if (header) {
            let cookies = cookie.parse(header);
            rawCookie = cookies[ExpServerSupport.getInstance.cookieName];

            if (rawCookie) {
                rawCookie = encodeURIComponent(rawCookie);
            }
        }
        return(rawCookie);
    }
}

const support = ExpServerSupport.getInstance;
export default support;
