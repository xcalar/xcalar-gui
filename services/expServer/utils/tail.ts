import * as fs from "fs";
import * as path from "path";
import * as xcConsole from "./expServerXcConsole"
import * as HttpStatus from "../../../assets/js/httpStatus";
const httpStatus = HttpStatus.httpStatus;
import { exec, ChildProcess } from "child_process"

const bufferSize: number = 1024 * 1024;
const gMaxLogs: number = 500;

let jQuery: any;
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    jQuery = require("jquery")(window);
});

interface ReturnMsg {
    status: number,
    error?: string,
    logs?: string,
    lastMonitor?: number
}

//*** This file is broken into two parts due to different OS requiring different
//*** methods to access syslog. On Ubuntu, we tail /var/log/Xcalar.log
//*** On centos, we call journalctl

// *************************** tail Xcalar.log ****************************** //
// Tail Xcalar.log
export function tailLog(requireLineNum: number, filePath: string, fileName: string) {
    let deferredOut: any = jQuery.Deferred();
    function checkLineNum(requireLineNumInput: any): XDPromise<ReturnMsg> {
        let deferred: any = jQuery.Deferred();
        let requireLineNum: number = Number(requireLineNumInput);
        if (!isLogNumValid(requireLineNum)) {
            let retMsg: ReturnMsg = {
                "status": httpStatus.BadRequest, // Bad Request
                "error": "Please enter a non-negative number less than 500"
            };
            deferred.reject(retMsg);
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    }

    checkLineNum(requireLineNum)
    .then(function() {
        return getPath(filePath, fileName);
    })
    .then(function(ret: any): XDPromise<{fd: fs.PathLike, stat: fs.Stats}> {
        const logPath: fs.PathLike = ret.logPath;
        const stat: fs.Stats= ret.stat;
        let deferred: any = jQuery.Deferred();
        if (!stat || stat.size === 0) {
            let retMsg: ReturnMsg = {
                "status": httpStatus.InternalServerError, // Server Internal error
                "error": "Empty File"
            };
            // reject doesn't means that the status can't be 200, it means that
            // we already know the result and do not need to pass parameters
            // and move forward to next steps
            deferred.reject(retMsg);
        } else {
            fs.open(logPath, 'r', function(err: any, fd: number): void {
                if (err) {
                    let retMsg: ReturnMsg = {
                        "status": httpStatus.InternalServerError, // Server Internal error
                        "error": "fail to open the file: " + err.message
                    };
                    deferred.reject(retMsg);
                } else {
                    deferred.resolve({fd, stat});
                }
            });
        }
        return deferred.promise();
    })
    .then(function(ret: any) {
        const fd: number = ret.fd;
        const stat: fs.Stats = ret.stat;
        let deferred: any = jQuery.Deferred();
        //  How many line end have been meet
        let lineEndNum: number = 0;
        let lines: string = '';
        let readFromEnd: (buf: Buffer) => XDPromise<{lines: string, stat: fs.Stats}> =
            function(buf: Buffer): XDPromise<{lines: string, stat: fs.Stats}> {
                let startPosition: number;
                let bufferReadLength: number;
                // If the file is large, fill in the whole buf
                if ((stat.size - lines.length) >= buf.length) {
                    startPosition = stat.size - lines.length - buf.length;
                    bufferReadLength = buf.length;
                // If the file is small, fill in part of the buf
                } else {
                    startPosition = 0;
                    bufferReadLength = stat.size - lines.length;
                }
                fs.read(fd, buf, 0, bufferReadLength, startPosition,
                    function(err: any, _bytesRead: number, buffer: Buffer): void {
                        if (err) {
                            let retMsg: ReturnMsg = {
                                "status": httpStatus.Forbidden,
                                "error": "fail to read the file: " + err.message
                            };
                            deferred.reject(retMsg);
                        } else {
                            for (let i: number = bufferReadLength - 1; i >= 0; i--) {
                                // If we don't have requireNum lines and we already
                                // reach the beginning of the this file, don't read
                                // the last bits as they are non sense
                                if ((lines.length + 1) >= stat.size) {
                                    lines = lines.substring(lines.length - stat.size);
                                    deferred.resolve({lines, stat});
                                    return;
                                }
                                // meet a '\n'
                                if (buffer[i] === 0x0a) {
                                    lineEndNum++;
                                    // as the last line always ends with '\n', if you
                                    // want to have requireNum + 1 lines, you need to
                                    // meet require + 1 '\n'
                                    if (lineEndNum === requireLineNum + 1) {
                                        deferred.resolve({lines, stat});
                                        return;
                                    }
                                }
                                lines = String.fromCharCode(buffer[i]) + lines;
                            }
                            readFromEnd(new Buffer(bufferSize));
                        }
                    });
                return deferred.promise();
        };
        return readFromEnd(new Buffer(bufferSize));
    })
    .then(function(ret: any): void {
        const lines: string = ret.lines;
        const stat: fs.Stats = ret.stat;
        let retMsg: ReturnMsg = {
            "status": httpStatus.OK,
            "logs": lines,
            "lastMonitor": stat.size
        };
        if (lines) {
            xcConsole.log(lines.substring(0, lines.length - 1));
        }
        deferredOut.resolve(retMsg);
    })
    .fail(function(retMsg) {
        deferredOut.reject(retMsg);
    });

    return deferredOut.promise();
}

// Tail -f
export function monitorLog(lastMonitor: number, filePath: string,
    fileName: string): XDPromise<ReturnMsg> {
    if (lastMonitor === -1) {
        return tailLog(10, filePath, fileName);
    } else {
        return sinceLastMonitorLog(Number(lastMonitor), filePath, fileName);
    }
}

// Send delta Xcalar.log logs
function sinceLastMonitorLog(lastMonitor: number, filePath: string,
    fileName: string): XDPromise<any> {
    let deferredOut: any = jQuery.Deferred();
    getPath(filePath, fileName)
    .then(function(ret: any): XDPromise<{fd: number, stat: fs.Stats}> {
        const logPath: fs.PathLike = ret.logPath;
        const stat: fs.Stats = ret.stat;
        var deferred = jQuery.Deferred();
        if (!stat || stat.size === 0) {
            let retMsg: ReturnMsg = {
                "status": httpStatus.InternalServerError, // Server Internal error
                "error": "Empty File"
            };
            // reject doesn't means that the status can't be 200, it means that
            // we already know the result and do not need to pass parameters
            // and move forward to next steps
            deferred.reject(retMsg);
        } else {
            fs.open(logPath, 'r', function(err: any, fd: number): void {
                if (err) {
                    var retMsg = {
                        "status": httpStatus.Forbidden,
                        "error": "fail to open the file: " + err.message
                    };
                    deferred.reject(retMsg);
                } else {
                    deferred.resolve({fd, stat});
                }
            });
        }
        return deferred.promise();
    })
    .then(function(ret: any): XDPromise<{lines: string, stat: fs.Stats}> {
        const fd: number = ret.fd;
        const stat: fs.Stats = ret.stat;
        let lines: string = '';
        let buf: Buffer = new Buffer(bufferSize);
        let deferred: any = jQuery.Deferred();
        let readRecentLogs: () => XDPromise<{lines: string, stat: fs.Stats}> =
            function(): XDPromise<{lines: string, stat: fs.Stats}> {
            fs.read(fd, buf, 0, bufferSize, lastMonitor,
                function(err: any, bytesRead: number, buf: Buffer): void {
                    if (err) {
                        let retMsg: ReturnMsg = {
                            "status": httpStatus.Forbidden,
                            "error": "fail to read the file: " + err.message
                        };
                        deferred.reject(retMsg);
                    }
                    for (let i: number = 0; i < bytesRead; i++) {
                        lines = lines + String.fromCharCode(buf[i]);
                    }
                    if (bytesRead === bufferSize) {
                        readRecentLogs();
                    } else {
                        deferred.resolve({lines, stat});
                    }
                });
            return deferred.promise();
        };
        return readRecentLogs();
    })
    .then(function(ret: any): void {
        const lines: string = ret.lines;
        const stat: fs.Stats = ret.stat;
        if (lines) {
            xcConsole.log(lines.substring(0, lines.length - 1));
        }
        let retMsg: ReturnMsg = {
            "status": httpStatus.OK,
            "logs": lines,
            "lastMonitor": stat.size
        };
        deferredOut.resolve(retMsg);
    })
    .fail(function(retMsg) {
        deferredOut.reject(retMsg);
    });
    return deferredOut.promise();
}


// *************************** Common Functions ***************************** //
function isLogNumValid(num: any): boolean {
    if (isNaN(num)) {
        return false;
    } else {
        if (Number.isInteger(num) && num >= 0 && num <= gMaxLogs) {
            return true;
        }
        return false;
    }
}

function getFileName(fileName: string): XDPromise<string> {
    let deferred: any = jQuery.Deferred();
    if (fileName === "node.*.out" || fileName === "node.*.err"
        || fileName === "node.*.log") {
        getNodeId()
        .then(function(nodeID) {
            xcConsole.log("NodeID: " + nodeID);
            if (fileName === "node.*.out") {
                deferred.resolve("node." + nodeID + ".out");
            } else if (fileName === "node.*.err") {
                deferred.resolve("node." + nodeID + ".err");
            } else {
                deferred.resolve("node." + nodeID + ".log");
            }
        })
        .fail(function(err) {
            var retMsg = {
                // Server Internal error
                "status": httpStatus.InternalServerError,
                "error": "Can not get the Node ID " + err
            };
            deferred.reject(retMsg);
        });
    } else {
        deferred.resolve(fileName);
    }
    return deferred.promise();
}

function getPath(filePath: string, fileName: string): XDPromise<any> {
    let deferredOut: any = jQuery.Deferred();
    getFileName(fileName)
    .then(function(realName): XDPromise<any> {
        let logPath: string = path.join(filePath, realName);
        xcConsole.log("Reading file stat: " + logPath);
        return readFileStat(logPath);
    })
    .then(function(ret: any): void {
        deferredOut.resolve(ret);
    })
    .fail(function(retMsg): void {
        deferredOut.reject(retMsg);
    });
    return deferredOut.promise();
}

function getNodeId(): XDPromise<any> {
    let deferredOut: any = jQuery.Deferred();
    let defaultXcalarctl: string = process.env.XLRDIR ?
    process.env.XLRDIR + "/bin/xcalarctl" : "/opt/xcalar/bin/xcalarctl";
    let command: string = defaultXcalarctl + " status";
    let reg: RegExp = /^Node\sID:\s([0-9]+)$/;
    let lineData: string = "";
    let out: ChildProcess = exec(command);

    out.stdout.on('data', function(data) {
        lineData += data;
    });

    out.stdout.on('close', function() {
        let lines: string[] = lineData.split("\n");
        if (lines.length === 0) {
            deferredOut.reject();
            return;
        }
        for (let i: number = 0; i < lines.length; i++) {
            let line: string = lines[i].trim();
            let arr: RegExpExecArray = reg.exec(line);
            if (arr && arr.length > 0) {
                deferredOut.resolve(arr[1]);
                return;
            }
        }
        deferredOut.reject();
    });

    out.stdout.on('error', function(err) {
        xcConsole.log(err);
        deferredOut.reject(err);
    });
    return deferredOut.promise();
}

function readFileStat(currFile: fs.PathLike): XDPromise<{logPath: fs.PathLike, stat: fs.Stats}> {
    let deferred: any = jQuery.Deferred();
    fs.stat(currFile, function(err: any, stat: fs.Stats): void {
        let retMsg: ReturnMsg;
        if (err) {
            xcConsole.log(err);
            retMsg = {
                // Server Internal error
                "status": httpStatus.InternalServerError,
                "error": "Fail to read file stat " + err
            };
            deferred.reject(retMsg);
        } else if (stat.size === 0) {
            retMsg = {
                // Server Internal error
                "status": httpStatus.InternalServerError,
                "error": "File " + currFile + " is empty."
            };
            deferred.reject(retMsg);
        } else {
            deferred.resolve({logPath: currFile, stat: stat});
        }
    });
    return deferred.promise();
}

function getCurrentTime(): string {
    function addLeading0(val: number): string | number {
        if (val < 10) {
            return "0" + val;
        }
        return val;
    }

    let date: Date = new Date();
    let month: string | number = addLeading0(date.getMonth() + 1);
    let day: string | number = addLeading0(date.getDate());
    let year: number = date.getFullYear();
    let hour: string | number = addLeading0(date.getHours());
    let minute: string | number = addLeading0(date.getMinutes());
    let second: string | number = addLeading0(date.getSeconds());
    let formatedDate: string = '"' + year + '-' + month + '-' + day + ' ' + hour +
                       ':' + minute + ':' + second + '"';
    return formatedDate;
}

// Below part is only for unit test
function fakeGetNodeId(): void {
    getNodeId = function(): XDPromise<number> {
        return jQuery.Deferred().resolve(0).promise();
    }
}
function fakeGetPath(): void {
    getPath = function(_filePath, _fileName): XDPromise<any> {
        const logPath: string = "Invalid Path";
        const stat: any = {stat:"success"};
        return jQuery.Deferred().resolve({logPath, stat}).promise();
    }
}
function fakeTailLog(): void {
    tailLog = function(): XDPromise<string> {
        return jQuery.Deferred().resolve("success").promise();
    }
}
function fakeSinceLastMonitorLog(): void {
    sinceLastMonitorLog = function(): XDPromise<string> {
        return jQuery.Deferred().resolve("success").promise();
    }
}

if (process.env.NODE_ENV === "test") {
    exports.isLogNumValid = isLogNumValid;
    exports.getPath = getPath;
    exports.readFileStat = readFileStat;
    exports.getCurrentTime = getCurrentTime;
    exports.sinceLastMonitorLog = sinceLastMonitorLog;
    exports.getNodeId = getNodeId;
    exports.getFileName = getFileName;
    // Fake functions
    exports.fakeGetNodeId = fakeGetNodeId;
    exports.fakeGetPath = fakeGetPath;
    exports.fakeTailLog = fakeTailLog;
    exports.fakeSinceLastMonitorLog = fakeSinceLastMonitorLog;
}