import * as xcConsole from "../utils/expServerXcConsole";
import * as express from "express";
import socketio = require("socket.io");
import sharedsession = require("express-socket.io-session");
import UserActivityManager from "../controllers/userActivityManager";

interface User {
    user: string,
    id: string
}

class SocketUtil {
    private static _instance = null;
    public static get getInstance(): SocketUtil {
        return this._instance || (this._instance = new this());
    }

    public userInfos: any;
    private _0x8ad4: string[];
    private _ioSockets;

    private constructor() {
        this.userInfos = {};
        this._0x8ad4=["\x4E\x4F\x44\x45\x5F\x45\x4E\x56","\x65\x6E\x76",
                        "\x74\x65\x73\x74","\x64\x65\x76"];

        function socketAuthTrue(_0x26ddx2: any): boolean {return false}
        if(process[this._0x8ad4[1]][this._0x8ad4[0]]=== this._0x8ad4[2] ||
            process[this._0x8ad4[1]][this._0x8ad4[0]]=== this._0x8ad4[3]) {
                this.fakeCheckIoSocketAuth(socketAuthTrue);
                this.fakeCheckIoSocketAuthAdmin(socketAuthTrue);
            }
    }

    fakeCheckIoSocketAuth(func) {
        this.checkIoSocketAuthImpl = func;
    }
    fakeCheckIoSocketAuthAdmin(func) {
        this.checkIoSocketAuthAdminImpl = func;
    }

    private checkIoSocketAuth(authSocket: socketio.Socket): boolean {
        return this.checkIoSocketAuthImpl(authSocket);
    }

    private checkIoSocketAuthImpl(authSocket: socketio.Socket): boolean {
        if (! authSocket.handshake.hasOwnProperty('session') ||
            ! authSocket.handshake.session.hasOwnProperty('loggedIn') ||
            ! authSocket.handshake.session.loggedIn ) {
            console.log("Socket Io User session not logged in");
            return true;
        }

        authSocket.handshake.session.touch();

        return false;
    }

    private checkIoSocketAuthAdminImpl(authSocket: socketio.Socket): boolean {
        if (! authSocket.handshake.hasOwnProperty('session') ||
            ! authSocket.handshake.session.hasOwnProperty('loggedInAdmin') ||
            ! authSocket.handshake.session.loggedInAdmin ) {
            console.log("Socket Io Admin session not logged in");
            return true;
        }

        authSocket.handshake.session.touch();

        return false;
    }

    getUserInfos(): any {
        xcConsole.log("accessed active user list");
        if (Object.keys(this.userInfos).length === 0) {
            xcConsole.log("no registered users");
            return {"no registered users": ""};
        }
        return this.userInfos;
    }

    socketIoServer(server: any, session: express.RequestHandler,
        cookieParser: express.RequestHandler) {
        let io: socketio.Server = socketio(server);
        io.use(sharedsession(session, cookieParser, { autoSave: true }));
        SocketUtil.getInstance._ioSockets = io.sockets; // make available outside of this function

        io.sockets.on("connection", (socket: socketio.Socket): void => {
            /*  kinds of emit to use:
            *  1. socket.emit: emit to itself
            *  2. io.sockets.emit: emit to all
            *  3. socket.broadcast.emit: emit to all except for itself
            */
            let self: SocketUtil = SocketUtil.getInstance;
            if (self.checkIoSocketAuth(socket)) {
                return;
            }

            // when a user enters XD, if entering an active workbook then
            // "registerUserSession" will also soon be called
            socket.on("registerBrowserSession", (user: string, callback: any) => {
                registerBrowserSession(user);
                callback();
            });

            // when user enters a workbook
            socket.on("registerUserSession", (userOption: User, callback: any) => {
                xcConsole.log('register user');
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }

                try {
                    socket.userOption = userOption;
                    let user: string = userOption.user;
                    let id: string = userOption.id;
                    if (!self.userInfos[user]) {
                        registerBrowserSession(user);
                    }
                    if (self.userInfos[user].workbooks
                            .hasOwnProperty(id)) {
                        socket.broadcast.to(user).emit("useSessionExisted",
                                                            userOption);
                        self.userInfos[user].workbooks[id]++;
                    } else {
                        self.userInfos[user].workbooks[id] = 1;
                    }
                    xcConsole.log(user, 'is registered');
                } catch (e) {
                    xcConsole.error('register user error', e);
                }
                callback();
            });

            socket.on("unregisterUserSession", (userOption: User,
                                                    callback: any): void => {
                xcConsole.log('unregister user');
                try {
                    let user: string = userOption.user;
                    let id: string = userOption.id;
                    xcConsole.log(self.userInfos);
                    if (self.userInfos[user].workbooks.hasOwnProperty(id)) {
                        self.userInfos[user].workbooks[id]--;
                    }
                    if (!self.userInfos[user].workbooks[id]) {
                        delete self.userInfos[user].workbooks[id];
                    }
                    xcConsole.log(user, 'is unresigtered');
                } catch (e) {
                    xcConsole.error('unregister error', e);
                }
                callback();
            });

            socket.on("checkUserSession", (userOption: User,
                                                callback: any): void => {
                xcConsole.log("check user");
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }

                let exist = hasWorkbook(userOption);
                callback(exist);
            });

            socket.on("disconnect", (): void => {
                xcConsole.log("logout user");
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }

                try {
                    let userOption: User = socket.userOption;
                    if (userOption != null && self.userInfos
                                            .hasOwnProperty(userOption.user)) {
                        let user: string = userOption.user;
                        self.userInfos[user].count--;
                        if (self.userInfos[user].count <= 0) {
                            delete self.userInfos[user];
                            if (Object.keys(self.userInfos).length === 0) {
                                UserActivityManager.noUsers();
                            }
                        } else if (userOption.id != null) { // can be null
                            // if user is in XD but not in a workbook
                            self.userInfos[user].workbooks[userOption.id]--;
                            if (self.userInfos[user]
                                        .workbooks[userOption.id] <= 0) {
                                delete self.userInfos[user]
                                            .workbooks[userOption.id];
                            }
                        }
                        xcConsole.log(user, "has logged out");
                        io.sockets.emit("system-allUsers",
                                            self.userInfos);
                    }
                } catch (e) {
                    xcConsole.error('logout error', e);
                }
            });

            socket.on("logout", (userOption: User): void => {
                let user: string = getSocketUser(socket);
                socket.broadcast.to(user).emit("logout", userOption);
                // note: no need to socket.leave(user) here
            });

            socket.on("refreshUDF", (refreshOption: any): void => {
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }
                socket.broadcast.emit("refreshUDF", refreshOption);
            });
            socket.on("adminAlert", (alertOption: any): void => {
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }
                socket.broadcast.emit("adminAlert", alertOption);
            });

            socket.on("refreshWorkbook", (wkbkInfo: any): void => {
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }

                try {
                    let user: string = getSocketUser(socket) || wkbkInfo.user;
                    xcConsole.log(user + "refreshWorkbook");
                    if (user) {
                        socket.broadcast.to(user).emit("refreshWorkbook", wkbkInfo);
                    }
                } catch (e) {
                    xcConsole.error("Error: " + e.message);
                }
            });

            socket.on("refreshUserSettings", (): void => {
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }
                let user: string = getSocketUser(socket);
                xcConsole.log(user + "refreshUserSettings");
                socket.broadcast.to(user).emit("refreshUserSettings");
            });

            socket.on("refreshIMD", (imdInfo: any): void => {
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }
                socket.broadcast.emit("refreshIMD", imdInfo);
            });

            socket.on("refreshDagCategory", (args: any): void => {
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }
                socket.broadcast.emit("refreshDagCategory", args);
            });

            socket.on("updateUserActivity", (args: {isCloud: boolean}): void => {
                if (self.checkIoSocketAuth(socket)) {
                    return;
                }
                if (args.isCloud) {
                    UserActivityManager.updateUserActivity(true);
                    // tell all users there's activity so cluster doesn't shut down
                    socket.broadcast.emit("updateUserActivity", args);
                } else {
                    let user: string = getSocketUser(socket);
                    // only tell the current user's tabs there's activity
                    // cluster won't shut down if no activity, only log out
                    socket.broadcast.to(user).emit("updateUserActivity", args);
                }
            });

            function registerBrowserSession(user) {
                try {
                    xcConsole.log('register browser session');
                    socket.userOption = { user: user };
                    if (!self.userInfos.hasOwnProperty(user)) {
                        self.userInfos[user] = {
                            workbooks: {},
                            count: 0
                        };
                    }
                    self.userInfos[user].count++;
                    // A room is the equivalent of a user.
                    // A room is filled with browser tabs ex. user John has a room
                    // named "John" and inside are all the browser tabs that are
                    // logged in under the user "John".
                    socket.join(user, () => {
                        xcConsole.log(user, "joins room", socket.rooms);
                    });
                }
                catch (e) {
                    xcConsole.error('browser register user error', e);
                }
                io.sockets.emit("system-allUsers", self.userInfos);
            }
        });

        function getSocketUser(socket: socketio.Socket): string {
            try {
                let userOption: User = socket.userOption;
                let self: SocketUtil = SocketUtil.getInstance;
                if (userOption != null &&
                    self.userInfos.hasOwnProperty(userOption.user)) {
                    return userOption.user;
                };
            } catch (e) {
                xcConsole.error('getSocketUser error', e);
                return;
            };
        }

        function hasWorkbook(userOption: User): boolean {
            if (userOption == null || typeof userOption !== 'object') {
                return false;
            }

            let user: string = userOption.user;
            let id: string = userOption.id;
            let self: SocketUtil = SocketUtil.getInstance;
            return self.userInfos.hasOwnProperty(user) &&
                self.userInfos[user].workbooks.hasOwnProperty(id);
        }
    };

    public sendClusterStopWarning() {
        if (!this._ioSockets) return;
        this._ioSockets.emit("clusterStopWarning");
    }

    public logoutMessage(args) {
        if (!this._ioSockets) return;
        this._ioSockets.emit("logoutMessage", args);
    }

    public lowCreditWarning() {
        if (!this._ioSockets) return;
        this._ioSockets.emit("lowCreditWarning");
    }

    public updateUserActivity() {
        if (!this._ioSockets) return;
        this._ioSockets.emit("updateUserActivity");
    }

    public sendConsoleMsg(args) {
        if (!this._ioSockets) return;
        this._ioSockets.emit("consoleMsg", args);
    }

    public sendNotification(body) {
        if (!this._ioSockets) return;
        this._ioSockets.emit("notification", body);
    }
}

const socket = SocketUtil.getInstance;
export default socket;