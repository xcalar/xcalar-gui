const { expect } = require('chai');
const request = require('request-promise-native');

describe("CloudManager Test", () => {
    let socket = require(__dirname + "/../../expServer/controllers/socket.js").default;
    let cloudManager = require(__dirname + "/../../expServer/controllers/cloudManager.js").default;
    let url = cloudManager._awsURL;
    let oldRequestPost;
    let oldNumCredits;
    let oldUpdateCreditsTime;
    let expectBody;

    before(() => {
        oldRequestPost = request.post;
        oldNumCredits = cloudManager._numCredits;
        oldUpdateCreditsTime = cloudManager._updateCreditsTime;
        expectBody = {
            username: "test@xcalar.com",
            instanceId: "i-test"
        };

        request.post = () => new Promise((res) => res());
        cloudManager.setup("test@xcalar.com", "i-test");
        clearTimeout(cloudManager._updateCreditsInterval);
    });

    after(() => {
        request.post = oldRequestPost;
        cloudManager._numCredits = oldNumCredits;
        cloudManager._updateCreditsTime = oldUpdateCreditsTime;
    });

    it("stopCluster should work", (done) => {
        let called = false;
        request.post = (args) => {
            expect(args).to.deep.equal({
                url: url + '/cluster/stop',
                body: expectBody,
                json: true
              });
            called = true;
            return new Promise((res,rej) => res());
        }
        cloudManager.stopCluster()
        .then(res => {
            expect(called).to.be.true;
            done();
        })
        .catch(() => {
            done("fail");
        });
    });

    it("stopCluster fail should be handled", (done) => {
        let called = false;
        request.post = (args) => {
            expect(args).to.deep.equal({
                url: url + '/cluster/stop',
                body: expectBody,
                json: true
              });
            called = true;
            return new Promise((res,rej) => rej({status: 404}));
        }
        cloudManager.stopCluster()
        .then(res => {
            expect(called).to.be.true;
            expect(res).to.deep.equal({
                error: {
                    status: 404
                }
            });
            done();
        })
        .catch((res) => {
            done("fail");
        });
    });

    it("checkCluster should work", (done) => {
        let called = false;
        request.post = (args) => {
            console.log("*#&(*#W&$W(#*&$W(#&", args)
            expect(args).to.deep.equal({
                url: url + '/cluster/get',
                body: expectBody,
                json: true
              });
            called = true;
            return new Promise((res,rej) => res());
        }
        cloudManager.checkCluster()
        .then(res => {
            expect(called).to.be.true;
            done();
        })
        .catch(() => {
            done("fail");
        });
    });

    it("get num credits should work", () => {
        cloudManager._numCredits = 1.23;
        let res = cloudManager.getNumCredits();
        expect(res).to.equal(1.23);
    });

    it("_updateCredits should not work if fetch doesn't return status", (done) => {
        cloudManager._updateCreditsTime = 100;
        let count = 0;
        request.post = (args) => {
            count++;
            if (count == 1 || count === 3) {
                expect(args).to.deep.equal({
                    url: url + '/billing/deduct',
                    body: expectBody,
                    json: true
                });
                return new Promise((res,rej) => res());
            } else if (count === 2 || count === 4) {
                expect(args).to.deep.equal({
                    url: url + '/billing/get',
                    body: expectBody,
                    json: true
                });
                return new Promise((res,rej) => res({credits: 2.34}));
            }
        }

        cloudManager._updateCredits();

        setTimeout(() => {
            expect(count).to.equal(4);
            let res = cloudManager.getNumCredits();
            expect(res).to.be.null;
            done();
        }, 150);
    });

    it("_updateCredits should work", (done) => {
        cloudManager._updateCreditsTime = 100;
        let count = 0;
        request.post = (args) => {
            count++;
            if (count == 1 || count === 3) {
                expect(args).to.deep.equal({
                    url: url + '/billing/deduct',
                    body: expectBody,
                    json: true
                });
                return new Promise((res,rej) => res());
            } else if (count === 2 || count === 4) {
                expect(args).to.deep.equal({
                    url: url + '/billing/get',
                    body: expectBody,
                    json: true
                });
                return new Promise((res,rej) => res({status: 0, credits: 2.34}));
            }
        }

        cloudManager._updateCredits();

        setTimeout(() => {
            expect(count).to.equal(4);
            let res = cloudManager.getNumCredits();
            expect(res).to.equal(2.34);
            done();
        }, 150);
    });


    it("_updateCredits should shutdown cluster if credits == 0", (done) => {
        cloudManager._updateCreditsTime = 100;
        let count = 0;
        request.post = (args) => {
            count++;
            if (count == 1) {
                expect(args).to.deep.equal({
                    url: url + '/billing/deduct',
                    body: expectBody,
                    json: true
                });
                return new Promise((res,rej) => res());
            } else if (count === 2) {
                expect(args).to.deep.equal({
                    url: url + '/billing/get',
                    body: expectBody,
                    json: true
                });
                return new Promise((res,rej) => res({credits: 0, status: 0}));
            }
        }
        expect(cloudManager._stopClusterMessageSent).to.be.false;

        let socketCalled = false;
        let oldSocket = socket.logoutMessage;
        socket.logoutMessage = (data) => {
            expect(data).to.deep.equal({type: "noCredits"});
            socketCalled = true;
        };

        let stopClusterCalled = false;
        let oldStopCluster = cloudManager.stopCluster;
        cloudManager.stopCluster = () => {
            stopClusterCalled = true;
        }

        cloudManager._updateCredits();

        setTimeout(() => {
            expect(count).to.equal(2);
            let res = cloudManager.getNumCredits();
            expect(res).to.equal(0);
            expect(socketCalled).to.be.true;
            expect(stopClusterCalled).to.be.true;
            expect(cloudManager._stopClusterMessageSent).to.be.true;
            cloudManager._stopClusterMessageSent = false;
            socket.logoutMessage = oldSocket;
            cloudManager.stopCluster = oldStopCluster;
            done();
        }, 50);
    });
});