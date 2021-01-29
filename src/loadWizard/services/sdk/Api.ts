import * as crypto from 'crypto';

function getCurrentSession(): string {
    // Global variable: sessionName
    return sessionName;
}

function getThriftHandler() {
    // Global variable: tHandle
    return tHandle;
}

function getCurrentUser(): {
    userName: string,
    userId: number
} {
    // Global variables
    return {
        userName: userIdName,
        userId: userIdUnique
    };
}

type HashFunction = (str: string) => string;
function hashFunc(str: string): string {
    return crypto.createHash('md5').update(str).digest('hex');
}

function switchSession(callSession: string): () => void {
    const currentSession = getCurrentSession();
    setSessionName(callSession);

    // Return a restore function
    return () => {
        setSessionName(currentSession);
    };
}

function switchUser(
    userName: string,
    userId: number,
    hashFunction: HashFunction = hashFunc
): () => void {
    // Global variables
    const currentUser = getCurrentUser();
    setUserIdAndName(userName, userId, hashFunction);

    // Return a restore function
    return () => {
        setUserIdAndName(currentUser.userName, currentUser.userId, hashFunction);
    };
}

function callApiInSession<T>(
    callSession: string,
    callUserName: string,
    callUserId: number,
    func: () => Promise<T>,
    hashFunction: HashFunction = hashFunc
): Promise<T> {
    const restoreUser = switchUser(callUserName, callUserId, hashFunction);
    const restoreSession = switchSession(callSession);
    try {
        const result = PromiseHelper.convertToNative(func());
        return result;
    } finally {
        restoreSession();
        restoreUser();
    }
}

function randomName(): string {
    const pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

function createGlobalScope() {
    const scope = new proto.xcalar.compute.localtypes.Workbook.WorkbookScope();
    scope.setGlobl(new proto.xcalar.compute.localtypes.Workbook.GlobalSpecifier());
    return scope;
}

function createSessionScope(params: {
    userName: string,
    sessionName: string
}) {
    const { userName, sessionName } = params;
    const scope = new proto.xcalar.compute.localtypes.Workbook.WorkbookScope();

    const nameInfo = new proto.xcalar.compute.localtypes.Workbook.WorkbookSpecifier.NameSpecifier();
    nameInfo.setUsername(userName);
    nameInfo.setWorkbookname(sessionName);
    const sessionInfo = new proto.xcalar.compute.localtypes.Workbook.WorkbookSpecifier();
    sessionInfo.setName(nameInfo);

    scope.setWorkbook(sessionInfo);

    return scope;
}

function normalizeQueryString(queryCli: string): string {
    return queryCli.endsWith(',')
        ? queryCli.substr(0, queryCli.length - 1)
        : queryCli;
}

export {
    callApiInSession,
    HashFunction, hashFunc,
    getThriftHandler,
    randomName,
    createGlobalScope,
    createSessionScope,
    normalizeQueryString
};
