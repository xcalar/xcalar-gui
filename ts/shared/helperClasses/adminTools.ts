namespace adminTools {
    let monitorIntervalId: number;
    let lastReturnSucc: boolean = true;
    const timeDilutionFactor: number = 1.2;
    const timeoutBase: number = 300000;
    const timeout = timeoutBase * timeDilutionFactor * timeDilutionFactor * 2;

    interface RequestStructLogs {
        requireLineNum: number;
        isMonitoring: boolean;
        filePath: string;
        fileName: string;
        hosts: string[];
    }

    interface RequestStructHosts {
        hostnamePattern: string;
    }

    interface RequestStructMonitor {
        lastMonitorMap: string;
        isMonitoring: boolean;
        filePath: string;
        fileName: string;
        hosts: string[];
    }

    interface RequestStructRemoveSessionFiles {
        filename: string;
    }

    interface RequestStructTicket {
        contents: string;
    }

    interface RequestStructHotPatch {
        enableHotPatches: boolean;
    }

    interface MonitorReturnResults {
        status: number;
        logs?: string;
        error?: string;
    }
    let lastMonitorMap = new Map<string, MonitorReturnResults>();

    /**
     * Get the names of the hosts that matches a certain regex
     * @param hostnamePattern Regex for hostnames
     */
    export function getMatchHosts(hostnamePattern: string): JQueryPromise<any> {
        const action: string = "GET";
        const url: string = "/service/matchedHosts";
        const content: RequestStructHosts = {
            "hostnamePattern": hostnamePattern
        };
        return sendRequest<RequestStructHosts>(action, url, content);
    }

    /**
     * Get logs for a file from hosts
     * @param requireLineNum Number of lines to return
     * @param filePath Path to the file
     * @param fileName Name of the file (path + name === file)
     * @param hosts Array of host names
     */
    export function getRecentLogs(
        requireLineNum: number,
        filePath: string,
        fileName: string,
        hosts: object): JQueryPromise<any> {
        const action: string = "GET";
        const url: string = "/service/logs";
        const content: RequestStructLogs = {
            "requireLineNum": requireLineNum,
            "isMonitoring": false,
            "filePath": filePath,
            "fileName": fileName,
            "hosts": Object.keys(hosts)
        };
        return sendRequest<RequestStructLogs>(action, url, content);
    }

    /**
     * Monitor logs of hosts. Pass in callbacks to get triggered upon each post
     * return.
     * @param filePath Path to file
     * @param fileName Names of file. path + name == full path
     * @param hosts Array of host names in string
     * @param errCallback Error function callback
     * @param successCallback Success function callback
     */
    export function monitorLogs(
        filePath: string,
        fileName: string,
        hosts: object,
        errCallback: Function,
        successCallback: Function
    ): void {
        clearInterval(monitorIntervalId);
        monitorIntervalId = window.setInterval(getLog, 2000);
        getLog();

        function getLog() {
            if (lastReturnSucc) {
                lastReturnSucc = false;
                const action: string = "GET";
                const url: string = "/service/logs";
                const lmmJson: string =
                    JSON.stringify(xcHelper.mapToJsonStruct(lastMonitorMap));
                const content: RequestStructMonitor = {
                    "lastMonitorMap": lmmJson,
                    "isMonitoring": true,
                    "filePath": filePath,
                    "fileName": fileName,
                    "hosts": Object.keys(hosts)
                };
                sendRequest<RequestStructMonitor>(action, url, content)
                .then(function(ret) {
                    lastReturnSucc = true;
                    if (monitorIntervalId !== undefined) {
                        setLastMonitors(ret.updatedLastMonitorMap);
                        if (typeof(successCallback) === "function") {
                            successCallback(ret);
                        }
                    }
                })
                .fail(function(err) {
                    console.warn(err);
                    lastReturnSucc = true;
                    if (monitorIntervalId !== undefined) {
                        if (!err.updatedLastMonitorMap) {
                            // connection error
                            lastMonitorMap.clear();
                            clearInterval(monitorIntervalId);
                            monitorIntervalId = undefined;
                        } else {
                            // node failure case
                            setLastMonitors(err.updatedLastMonitorMap);
                        }
                        // If not all nodes return successfully, getLog() will
                        // enter here, then we should still keep watching the
                        // successfully return logs.
                        if (typeof errCallback === "function") {
                            errCallback(err);
                        }
                    }
                });
            }
        }
    }

    /**
     * Stop monitoring the logs in the panel
     */
    export function stopMonitorLogs(): void {
        clearInterval(monitorIntervalId);
        lastMonitorMap.clear();
        monitorIntervalId = undefined;
    }

    /**
     * Start the cluster
     */
    export function clusterStart(): JQueryPromise<any> {
        const action: string = "POST";
        const url: string = "/service/start";
        return sendRequest(action, url);
    }

    /**
     * Stop the cluster
     */
    export function clusterStop(): JQueryPromise<any> {
        const action: string = "POST";
        const url: string = "/service/stop";
        return sendRequest(action, url);
    }

    /**
     * Restart the cluster
     */
    export function clusterRestart(): JQueryPromise<any> {
        const action: string = "POST";
        const url: string = "/service/restart";
        return sendRequest(action, url);
    }

    /**
     * Get status of the cluster
     */
    export function clusterStatus(): JQueryPromise<any> {
        const action: string = "GET";
        const url: string = "/service/status";
        return sendRequest(action, url);
    }

    /**
     * Remove the session files
     * @param filename Names of the session files to remove
     */
    export function removeSessionFiles(filename: string): JQueryPromise<any> {
        const action: string = "DELETE";
        const url: string = "/service/sessionFiles";
        const content: RequestStructRemoveSessionFiles = {"filename": filename};
        return sendRequest<RequestStructRemoveSessionFiles>(action, url,
            content);
    }

    /**
     * Remove dirty SHM files. You should not be calling this function. Ever.
     */
    export function removeSHM(): JQueryPromise<any> {
        const action: string = "DELETE";
        const url: string = "/service/SHMFiles";
        return sendRequest(action, url);
    }

    /**
     * Get license for the cluster
     */
    export function getLicense(): JQueryPromise<any> {
        const action: string = "GET";
        const url: string = "/service/license";
        return sendRequest(action, url);
    }

    /**
     * adminTools.compressLicenseKey
     * compress license key from XD info to avoid exp server
     * @param key - license info to be compressed
     */
    export function compressLicenseKey(key: string): string {
        const options: object = {"to": "string"};
        return btoa(pako.gzip(key, options));
    }

    /**
     * Files a ticket on behalf of the user against zendesk
     * @param inputStr Stringified contents of the ticket
     */
    export function fileTicket(inputStr: string): JQueryPromise<any> {
        const action: string = "POST";
        const url: string = "/service/ticket";
        const content: RequestStructTicket = {"contents": inputStr};
        return sendRequest<RequestStructTicket>(action, url, content);
    }

    export function submitTicketBrowser(ticketStr: string): JQueryPromise<any> {
        var deferred: JQueryDeferred<any> = PromiseHelper.deferred();
        jQuery.ajax({
            "type": "POST",
            "data": ticketStr,
            "contentType": "application/json",
            "url": "https://1pgdmk91wj.execute-api.us-west-2.amazonaws.com/stable/zendesk",
            "cache": false,
            "timeout": adminTools.getTimeoutVal(),
            success: function(data) {
                deferred.resolve({
                    "status": 200,
                    "logs": JSON.stringify(data)
                });
            },
            error: function(err) {
                xcConsole.log(err);
                deferred.reject(err);
                return;
            }
        });

        return deferred.promise();
    }

    export function finishGettingLicense(data: any): JQueryPromise<any> {
        let deferred: JQueryDeferred<any> =  PromiseHelper.deferred();
        let key: string = data.logs || "";
        jQuery.ajax({
            "type": "GET",
            "url": "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/keyinfo/"
                    + adminTools.compressLicenseKey(key),
            success: function(data) {
                if (data.hasOwnProperty("ExpirationDate")) {
                    deferred.resolve({"key": key,
                                        "expiration": data.ExpirationDate,
                                        "organization": data.LicensedTo});
                } else {
                    deferred.reject();
                }
            },
            error: function(error) {
                deferred.reject(error);
            }
        });
        return deferred.promise();

    }

    /**
     * Get all tickets that are filed by the user
     * @param inputStr Stringified contents of the request. We should really
     * change this. This is pre typescript days.
     */
    export function getTickets(inputStr: string): JQueryPromise<any> {
        const action: string = "POST";
        const url: string = "/service/gettickets";
        const content: RequestStructTicket = {"contents": inputStr};
        return sendRequest<RequestStructTicket>(action, url, content);
    }

    export function upgradeQuery(query: any): JQueryPromise<any> {
        const action: string = "POST";
        const url: string = "/service/upgradeQuery";
        const content = query;
        return sendRequest<RequestStructTicket>(action, url, content);
    }

    /**
     * Gets the status of whether hot patching is turned on
     */
    export function getHotPatch(): JQueryPromise<any> {
        const action: string = "GET";
        const url: string = "/service/hotPatch";
        return sendRequest(action, url);
    }

    /**
     * Enable or disable hot patching. Not wired into the UI yet. TODO.
     * @param enableHotPatches Boolean to enable or disable hot patching
     */
    export function setHotPatch(enableHotPatches: boolean): JQueryPromise<any> {
        const action: string = "POST";
        const url: string = "/service/hotPatch";
        const content: RequestStructHotPatch = {"enableHotPatches":
                                                enableHotPatches};
        return sendRequest<RequestStructHotPatch>(action, url, content);
    }

    function isHTTP(): string {
        if (window.location.protocol === "http:") {
            return "true";
        } else {
            return "false";
        }
    }

    let sendRequest = function<T>(
        action: string,
        url: string,
        content?: T): JQueryPromise<any> {
        let data = prePraseSendData<T>(action, content);
        let deferred = PromiseHelper.deferred();
        HTTPService.Instance.ajax({
            "type": action,
            "data": data,
            "contentType": "application/json",
            "url": xcHelper.getAppUrl() + url,
            "cache": false,
            "timeout": timeout,
            success: function(data) {
                data = parseSuccessData(data);
                deferred.resolve(data);
            },
            error: function(xhr) {
                var data = parseErrorData(xhr);
                deferred.reject(data);
            }
        });
        return deferred.promise();
    }

    function prePraseSendData<T>(
        action: string,
        content?: T): string | object {
        let data = content ? content : {};
        // A flag to indicate whether current window is using http protocol or not
        data["isHTTP"] = isHTTP();
        // Post and Delete case, send a String
        // Get case, send a JSON object
        if (action !== "GET") {
            data = JSON.stringify(data);
        }
        return data;
    }

    function parseSuccessData(data: object): object {
        // If this request will be sent to all slave nodes
        // success state means that all slave nodes return 200
         // to master node
        if (data["logs"]) {
            data["logs"] = atob(data["logs"]);
        }
        return data;
    }

    function parseErrorData(xhr:JQueryXHR): object {
        // If this request will be sent to all slave nodes
        // error state means that some slave nodes fails to
        // return 200 to master node
        let data: object;
        if (xhr.responseJSON) {
            // under this case, server sent the response and set
            // the status code
            data = xhr.responseJSON;
            if (data["logs"]) {
                data["logs"] = atob(data["logs"]);
            }
        } else {
            // under this case, the error status is not set by
            // server, it may due to other reasons, therefore we
            // need to create our own JSON object
            data = {
                "status": xhr.status,
                "logs": xhr.statusText,
                "unexpectedError": true
            };
        }
        return data;
    }

    function setLastMonitors(map) {
        for (let node in map) {
            lastMonitorMap.set(node, <MonitorReturnResults>map[node]);
        }
    }

    export function getTimeoutVal(): number {
        return timeout;
    }

    /* Unit Test Only */
    if (window["unitTestMode"]) {
        let oldSendRequest = sendRequest;
        adminTools["__testOnly__"] = {
            prePraseSendData: prePraseSendData,
            parseSuccessData: parseSuccessData,
            parseErrorData: parseErrorData,
            getMonitorMap: function() {
                return lastMonitorMap;
            },
            setSendRequest: function(res, isErr) {
                sendRequest = function(action: string, _, content) {
                    let output = res || prePraseSendData(action, content);
                    if (isErr) {
                        return PromiseHelper.reject(output);
                    } else {
                        return PromiseHelper.resolve(output);
                    }
                };
                return sendRequest;
            },
            resetSendRequest: function() {
                sendRequest = oldSendRequest;
            }
        }
    }
    /* End Of Unit Test Only */
}

if (typeof exports !== "undefined") {
    if (typeof module !== "undefined" && module.exports) {
        exports = module.exports = adminTools;
    }
    exports.adminTools = adminTools;
}