describe("SQLUtil Test", function() {
    describe("sendToPlanner Test", function() {
        let oldAjax;
        let testOptions

        before(function() {
            oldAjax = jQuery.ajax;
            jQuery.ajax = function(options) {
                testOptions = options;
                testOptions.success("test");
            }
        });

        beforeEach(function() {
            testOptions = null;
        });

        it("should update", function() {
            SQLUtil.sendToPlanner("test", "update");
            expect(testOptions.url).to.include("schemasupdate");
            expect(testOptions.type).to.equal("PUT");
        });

        it("should dropAll", function() {
            SQLUtil.sendToPlanner("test", "dropAll");
            expect(testOptions.url).to.include("schemadrop");
            expect(testOptions.type).to.equal("DELETE");
        });

        it("should query", function() {
            SQLUtil.sendToPlanner("test", "query");
            expect(testOptions.url).to.include("sqlquery");
            expect(testOptions.type).to.equal("POST");
        });

        it("should parse", function() {
            SQLUtil.sendToPlanner("test", "parse");
            expect(testOptions.url).to.include("sqlparse");
            expect(testOptions.type).to.equal("POST");
        });

        it("should reject invalid type of request", function(done) {
            SQLUtil.sendToPlanner("test", "test")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal("Invalid type for updatePlanServer");
                done();
            });
        });

        it("should succeed", function(done) {
            SQLUtil.sendToPlanner("test", "update")
            .then(function(data) {
                expect(data).to.equal("test");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should fail with error", function(done) {
            let ajax = jQuery.ajax;
            jQuery.ajax = function(options) {
                testOptions = options;
                testOptions.error("test");
            };
            SQLUtil.sendToPlanner("test", "update")
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.equal(JSON.stringify("test"));
                done();
            })
            .always(function() {
                jQuery.ajax = ajax;
            });
        });

        after(function() {
            jQuery.ajax = oldAjax;
        });
    });

    it("SQLUtil._parseError should work", function() {
        let tests = [{
            value: {responseText: "{\"exceptionMsg\":\"test\"}"},
            expect: "test"
        }, {
            value: {responseText: "abc"},
            expect: SQLErrTStr.PlannerFailure + ". Failed to parse error message: " + JSON.stringify({responseText: "abc"})
        }, {
            value: {status: 0},
            expect: SQLErrTStr.FailToConnectPlanner
        }, {
            value: "test",
            expect: JSON.stringify("test")
        }, {
            value: null,
            expect: SQLErrTStr.PlannerFailure
        }];

        tests.forEach(function(test) {
            let res = SQLUtil._parseError(test.value);
            if (res !== test.expect) {
                console.error("Unexpect result for test", JSON.stringify(test));
            }
            expect(res).to.equal(test.expect);
        });
    });

    it("SQLUtil.getSQLStruct should work", function(done) {
        let oldFunc = SQLUtil.sendToPlanner;
        SQLUtil.sendToPlanner = function() {
            let ret = JSON.stringify({ret: ["test"]});
            return PromiseHelper.resolve(ret);
        };

        SQLUtil.getSQLStruct("select * from TEST")
        .then(function(sqlStruct) {
            expect(sqlStruct).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            SQLUtil.sendToPlanner = oldFunc;
        });
    });

    it("SQLUtil.getSQLStruct should handle error parse case", function(done) {
        let oldFunc = SQLUtil.sendToPlanner;
        SQLUtil.sendToPlanner = function() {
            return PromiseHelper.resolve("test");
        };

        SQLUtil.getSQLStruct("select * from TEST")
        .then(function() {
            done("fail");
        })
        .fail(function(e) {
            expect(e).to.be.a("string");
            done();
        })
        .always(function() {
            SQLUtil.sendToPlanner = oldFunc;
        });
    });

    it("SQLUtil.getSQLStruct should handle fail case", function(done) {
        let oldFunc = SQLUtil.sendToPlanner;
        SQLUtil.sendToPlanner = function() {
            return PromiseHelper.reject("test");
        };

        SQLUtil.getSQLStruct("select * from TEST")
        .then(function() {
            done("fail");
        })
        .fail(function(e) {
            expect(e).to.be.equal("test");
            done();
        })
        .always(function() {
            SQLUtil.sendToPlanner = oldFunc;
        });
    });

    it("SQLUtil.getSQLStruct should handle fail case 2", function(done) {
        let oldFunc = SQLUtil.sendToPlanner;
        let fail = {"test": true};
        SQLUtil.sendToPlanner = function() {
            return PromiseHelper.reject(fail);
        };

        SQLUtil.getSQLStruct("select * from TEST")
        .then(function() {
            done("fail");
        })
        .fail(function(e) {
            expect(e).to.be.equal(JSON.stringify(fail));
            done();
        })
        .always(function() {
            SQLUtil.sendToPlanner = oldFunc;
        });
    });

    it("SQLUtil.throwError should work", function() {
        let oldReset = SQLUtil.resetProgress;
        let oldAlert = Alert.show;
        let called = 0;
        SQLUtil.resetProgress = function() {
            called++;
        };
        Alert.show = function() {
            called++;
        };

        SQLUtil.throwError();
        expect(called).to.equal(2);
        SQLUtil.resetProgress = oldReset;
        Alert.show = oldAlert;
    });

    it("should lock and reset progress", function() {
        SQLUtil.lockProgress();
        expect($(".sqlOpPanel").find(".btn-submit").hasClass("btn-disabled")).to.be.true;
        SQLUtil.resetProgress();
        expect($(".sqlOpPanel").find(".btn-submit").hasClass("btn-disabled")).to.be.false;
    });
});