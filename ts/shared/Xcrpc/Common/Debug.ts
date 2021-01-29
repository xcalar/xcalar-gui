const performanceLog: Array<Array<any>> = new Array();
let isPerfLogEnabled = false;
const PERF_LOG_LENGTH = 100;

function perfAsync(logName: string): MethodDecorator {
    return function(_target: Object, _name: string, descriptor: PropertyDescriptor) {
        const oldFunc = descriptor.value;
        descriptor.value = async function(...args) {
            const startTime = Date.now();
            try {
                const result = await oldFunc.apply(this, args);
                const time = Date.now() - startTime;
                appendPerfLog(logName, time, args, result);
                return result;
            } catch(e) {
                const time = Date.now() - startTime;
                appendPerfLog(logName, time, args, e);
                throw e;
            }
        }
    };
}

function appendPerfLog(logName, time, request, response) {
    if (!isPerfLogEnabled) {
        return;
    }
    if (performanceLog.length >= PERF_LOG_LENGTH) {
        performanceLog.shift();
    }
    performanceLog.push([logName, time, request, response]);
}

function enablePerfLog(isEnable: boolean = true) {
    isPerfLogEnabled = isEnable;
}

function getPerfLog() {
    return performanceLog.slice();
}

function clearPerfLog() {
    performanceLog.splice(0, performanceLog.length);
}

export { perfAsync, getPerfLog, clearPerfLog, enablePerfLog };