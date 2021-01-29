describe("Cloud Login Test", () => {
    let cloudLoginFunctions;
    before(function() {
        CloudLogin.setup();
        cloudLoginFunctions = CloudLogin["__testOnly__"];
    });

    describe("Cloud Login Validations", function() {
        it("validateEmail should work", () => {
            const wrongEmails = [
                '',
                'a',
                'abcabcabcabc',
                'a@c',
                'abcabc@abcabc',
                'abcabc@xcalarcom',
                '@xcalarcom',
                '@xcalar.com',
                'abcabc@.com',
                'abcabc@xcalar.'
            ];

            const correctEmails = [
                'a@a.a',
                'abcabc@gmail.com',
                '123123@xcalar.com',
                'a1@example.org',
                'ABC@ABCABC.IO'
            ];

            wrongEmails.forEach((email) => {
                wrongValidation = cloudLoginFunctions.validateEmail(email);
                expect(wrongValidation).to.be.null;
            });

            correctEmails.forEach((email) => {
                correctValidation = cloudLoginFunctions.validateEmail(email);
                expect(correctValidation).to.not.be.null;
            });
        });

        it("validatePassword should work", () => {
            const wrongPasswords = [
                '',
                'a',
                'abcabcabcabc',
                'abcabc123456',
                'abcABC123456',
                'ABCABC123!@#',
                'abcABC!@#!@#',
                'aA1!'
            ];

            const correctPasswords = [
                'abcabcA1!',
                '!!!!!!!!!aA1',
                'Example1*'
            ];

            wrongPasswords.forEach((password) => {
                wrongValidation = cloudLoginFunctions.validatePassword(password);
                expect(wrongValidation).to.be.null;
            });

            correctPasswords.forEach((password) => {
                correctValidation = cloudLoginFunctions.validatePassword(password);
                expect(correctValidation).to.not.be.null;
            });
        });
    });

    describe("Cloud Login Fetches", function() {
        let oldFetch;
        let fetchArgs;

        before(function() {
            oldFetch = fetch;
            fetch = (...args) => {
                fetchArgs = args;
                return Promise.reject();
            }
        });

        it("/status should be called correctly", function(done) {
            cloudLoginFunctions.initialStatusCheck();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/status")).to.be.true;
            expect(fetchParams.credentials).to.equal('include');
            done();
        });

        it("/login should be called correctly", function(done) {
            cloudLoginFunctions.cookieLogin('testLogin', 'testPassword');
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/login")).to.be.true;
            expect(fetchParams.credentials).to.equal('include');
            expect(fetchParams.body).to.equal('{"username":"testLogin","password":"testPassword"}');
            done();
        });

        it("/logout should be called correctly", function(done) {
            cloudLoginFunctions.cookieLogout();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/logout")).to.be.true;
            expect(fetchParams.credentials).to.equal('include');
            done();
        });

        it("/billing/get should be called correctly", function(done) {
            cloudLoginFunctions.checkCredit();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/billing/get")).to.be.true;
            expect(fetchParams.body).to.exist;
            done();
        });

        it("/cluster/get should be called correctly", function(done) {
            cloudLoginFunctions.getCluster();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/cluster/get")).to.be.true;
            expect(fetchParams.body).to.exist;
            done();
        });

        it("/cluster/start should be called correctly", function(done) {
            cloudLoginFunctions.startCluster();
            const [fetchUrl, fetchParams] = [fetchArgs[0], fetchArgs[1]];
            expect(fetchUrl.endsWith("/cluster/start")).to.be.true;
            expect(fetchParams.body).to.exist;
            done();
        });

        after(function() {
            fetch = oldFetch;
        });
    });

    describe("Successful fetch responses handled correctly", function() {
        let oldFetch;
        let response;
        let endpointsCalled = [];
        let paramsPassed = [];

        before(function(done) {
            oldFetch = fetch;
            fetch = (...args) => {
                endpointsCalled.push(args[0]);
                paramsPassed.push(args[1]);
                return new Promise((resolve) => {
                    resolve({
                        status: httpStatus.OK,
                        json: () => new Promise((resolve) => {
                            resolve(response)
                        })
                    });
                });
            }
            done();
        });

        it("if /status is loggedIn then /billing/get/ is called", (done) => {
            response = {
                loggedIn: true
            };
            cloudLoginFunctions.initialStatusCheck();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/status'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/billing/get'))).to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("if /status is not loggedIn then /billing/get/ is not called", (done) => {
            response = {
                loggedIn: false
            };
            cloudLoginFunctions.initialStatusCheck();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/status'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/billing/get'))).not.to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("if /login is successful then /billing/get/ is called", (done) => {
            response = {
            };
            cloudLoginFunctions.cookieLogin();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/login'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/billing/get'))).to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("if /login is successful but /billing/get/ returns 0 credits then /cluster/get/ is not called", (done) => {
            response = {
                status: ClusterLambdaApiStatusCode.OK,
                credits: 0,
            };
            cloudLoginFunctions.cookieLogin();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/login'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/billing/get'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/cluster/get'))).not.to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("if /login is successful and /billing/get/ returns > 0 credits then /cluster/get/ is called", (done) => {
            response = {
                status: ClusterLambdaApiStatusCode.OK,
                credits: 100,
            };
            cloudLoginFunctions.cookieLogin();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/login'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/billing/get'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/cluster/get'))).to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("if /logout is called nothing else is called", (done) => {
            response = {
            };
            cloudLoginFunctions.cookieLogout();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/logout'))).to.include(true);
                // doesn't work because checkExpServerIsUp /getTime
                // keeps being recursively called from previous test
                // expect(endpointsCalled.length).to.be.equal(1);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        // with HTML could be checked for progress bars
        it("if /cluster/get is successful ...", (done) => {
            response = {
                status: ClusterLambdaApiStatusCode.OK,
            };
            cloudLoginFunctions.getCluster();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/cluster/get'))).to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("if /cluster/get returns not OK exception logout is called", (done) => {
            response = {
                status: ClusterLambdaApiStatusCode.AUTH_ERROR,
            };
            cloudLoginFunctions.getCluster();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/logout'))).to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("if /cluster/start is called, then /cluster/get is called", (done) => {
            response = {
            };
            cloudLoginFunctions.startCluster();
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/cluster/start'))).to.include(true);
                expect(endpointsCalled.map(url => url.endsWith('/cluster/get'))).to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        it("handleExceptions calls logout", (done) => {
            cloudLoginFunctions.handleException({error: 'test'});
            UnitTest.wait(1)
            .then(() => {
                expect(endpointsCalled.map(url => url.endsWith('/logout'))).to.include(true);
                endpointsCalled = [];
                endpointsCparamsPassedalled = [];
                done();
            })
            .fail(() => {
                done('fail');
            });
        });

        after(function() {
            fetch = oldFetch;
        });
    });

    describe("getErrorMessage should correctly process errors", function() {
        it("should return string unchanged", () => {
            const argumentStrings = [
                '',
                'Error',
                '123.@3123',
                'An error has occurred: Error!'
            ];

            returnedStrings = argumentStrings.map(string => cloudLoginFunctions.getErrorMessage(string));
            expect(returnedStrings).to.deep.equal(argumentStrings);
            expect(cloudLoginFunctions.getErrorMessage('test1', 'test2')).to.equal('test1');
        });

        it("should show object error string", () => {
            expect(cloudLoginFunctions.getErrorMessage({error: 'test1'})).to.equal('test1');
            expect(cloudLoginFunctions.getErrorMessage({message: 'test2'})).to.equal('test2');
            expect(cloudLoginFunctions.getErrorMessage({hello: 'one', message: 'test3'})).to.equal('test3');
            expect(cloudLoginFunctions.getErrorMessage({error: 'test5', message: 'test4'})).to.equal('test4');
            expect(cloudLoginFunctions.getErrorMessage({error: 'test6'}, 'test7')).to.equal('test6');
        });

        it("should show default error otherwise", () => {
            expect(cloudLoginFunctions.getErrorMessage()).to.equal('unknown error');
            expect(cloudLoginFunctions.getErrorMessage(123)).to.equal('unknown error');
            expect(cloudLoginFunctions.getErrorMessage({})).to.equal('unknown error');
            expect(cloudLoginFunctions.getErrorMessage({test: 'test'})).to.equal('unknown error');
            expect(cloudLoginFunctions.getErrorMessage({test: 'test'}, 'test1')).to.equal('test1');
        });
    });
});