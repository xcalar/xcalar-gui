import { HashFunction, hashFunc } from './Api'

/**
 * LoginUser depends on XD's login
 */
interface IXcalarUser {
    getUserName(): string;
    getUserId(): number;
    getHashFunc(): HashFunction;
}

 class LoginUser implements IXcalarUser {
    public getUserName() {
        // Global variable
        return userIdName;
    }

    public getUserId() {
        // Global variable
        return userIdUnique;
    }

    public getHashFunc() {
        return hashFunc;
    }
}

const DEFAULT_USERNAME = "xcalar-lw-internal";
function computeUserId(userName) {
    return Number.parseInt("0x" + hashFunc(userName).substring(0, 5)) + 4000000;
};
class User implements IXcalarUser {
    private _userName: string;
    private _userId: number;

    constructor({ userName = DEFAULT_USERNAME} = {}) {
        this._userName = userName;
        this._userId = computeUserId(userName);
    }

    public getUserName() {
        return this._userName;
    }

    public getUserId() {
        return this._userId;
    }

    public getHashFunc() {
        return hashFunc;
    }
}

export { IXcalarUser, LoginUser, User };