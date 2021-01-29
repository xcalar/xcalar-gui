const { expect, assert } = require('chai');

describe.skip("UserActivityManager Test", () => {
    let userActivityManager = require(__dirname + "/../../expServer/controllers/userActivityManager.js").default;
    let socket = require(__dirname + "/../../expServer/controllers/socket.js").default;
    var cloudManager = require(__dirname + "/../../expServer/controllers/cloudManager.js").default;

    let oldClusterWarning;
    let oldLogoutMessage;
    before(() => {
        oldClusterWarning = socket.sendClusterStopWarning;
        oldLogoutMessage = socket.logoutMessage;
        oldStopCluster = cloudManager.stopCluster;
    });
    after(() => {
        socket.sendClusterStopWarning = oldClusterWarning;
        socket.logoutMessage = oldLogoutMessage;
        cloudManager.stopCluster = oldStopCluster;
    });

    it("updateUserActivity should work but not log out", (done) => {
        let oldTime = userActivityManager._inactivityTime;
        console.log("oldTime", oldTime);
        userActivityManager._inactivityTime = 50;
        console.log(userActivityManager);
        let warningSet = false;
        socket.sendClusterStopWarning = () => {
            warningSet = true;
        };

        let logoutSet = false;
        socket.oldLogoutMessage = () => {
            logoutSet = true;
        };

        userActivityManager.updateUserActivity();
        setTimeout(() => {
            expect(warningSet).to.be.true;
            expect(logoutSet).to.be.false;
            userActivityManager._inactivityTime = oldTime;
            done();
        }, 100);
    });

    it("should logout and stop cluster", (done) => {
        let oldTime = userActivityManager._inactivityTime;
        let oldLogoutTime = userActivityManager._logoutWarningTime;
        userActivityManager._inactivityTime = 50;
        userActivityManager._logoutWarningTime = 50;

        let warningSet = false;
        socket.sendClusterStopWarning = () => {
            warningSet = true;
        };

        let logoutSet = false;
        socket.logoutMessage = () => {
            logoutSet = true;
        };

        let clusterStopped = false;
        cloudManager.stopCluster = () => {
            clusterStopped = true;
        };

        userActivityManager.updateUserActivity();
        setTimeout(() => {
            expect(warningSet).to.be.true;
            expect(logoutSet).to.be.true;
            expect(clusterStopped).to.be.true;
            userActivityManager._inactivityTime = oldTime;
            userActivityManager._logoutWarningTime = oldLogoutTime;
            done();
        }, 200);
    });

});