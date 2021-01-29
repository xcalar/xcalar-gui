describe("PromiseHelper Test", function() {
    it("PromiseHelper.deferred should return a promise", function() {
        var deferred = PromiseHelper.deferred();
        expect(deferred).to.be.an("object");
        expect(deferred.then).to.be.a("Function");
    });

    it("PromiseHelper.resolve should work", function(done) {
        var deferred = PromiseHelper.resolve("a", "b");
        expect(deferred.state()).to.equal("resolved");
        deferred
        .then(function(ret1, ret2) {
            expect(ret1).to.equal("a");
            expect(ret2).to.equal("b");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.reject should work", function(done) {
        var deferred = PromiseHelper.reject("a", "b");
        expect(deferred.state()).to.equal("rejected");
        deferred
        .then(function() {
            done("fail");
        })
        .fail(function(ret1, ret2) {
            expect(ret1).to.equal("a");
            expect(ret2).to.equal("b");
            done();
        });
    });

    it("PromiseHelper.doWhile should work", function(done) {
        var condition = "opaqueArgs.cnt > opaqueArgs.threshold";
        var opaqueArgs = {"threshold": 1, "cnt": 0};
        var oneIter = function() {
            opaqueArgs.cnt++;
            return PromiseHelper.resolve();
        };
        PromiseHelper.doWhile(oneIter, null, condition, opaqueArgs)
        .then(function() {
            expect(opaqueArgs.cnt).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.while should return if not match condition", function(done) {
        var condition = "opaqueArgs.cnt > opaqueArgs.threshold";
        var opaqueArgs = {"threshold": 1, "cnt": 2};
        var oneIter = function() {
            opaqueArgs.cnt++;
            return PromiseHelper.resolve();
        };

        PromiseHelper.while(oneIter, null, condition, opaqueArgs)
        .then(function() {
            expect(opaqueArgs.cnt).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.while should work", function(done) {
        var condition = "opaqueArgs.cnt > opaqueArgs.threshold";
        var opaqueArgs = {"threshold": 1, "cnt": 1};
        var oneIter = function() {
            opaqueArgs.cnt++;
            return PromiseHelper.resolve();
        };

        PromiseHelper.while(oneIter, null, condition, opaqueArgs)
        .then(function() {
            expect(opaqueArgs.cnt).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.when should resolve null if no args", function(done) {
        PromiseHelper.when()
        .then(function(ret) {
            expect(ret).to.deep.equal([]);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.when should resolve", function(done) {
        var def1 = PromiseHelper.resolve();
        var def2 = PromiseHelper.resolve("test");
        var def3 = PromiseHelper.resolve("a", "b");

        PromiseHelper.when(def1, def2, def3)
        .then(function(ret) {
            const ret1 = ret[0];
            const ret2 = ret[1];
            const ret3 = ret[2];
            expect(ret1).to.be.undefined;
            expect(ret2).to.equal("test");
            expect(ret3[0]).to.equal("a");
            expect(ret3[1]).to.equal("b");
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.when should reject if all fails", function(done) {
        var def1 = PromiseHelper.reject();
        var def2 = PromiseHelper.reject("test");
        var def3 = PromiseHelper.reject("a", "b");

        PromiseHelper.when(def1, def2, def3)
        .then(function() {
            done("fail");
        })
        .fail(function(ret) {
            const ret1 = ret[0];
            const ret2 = ret[1];
            const ret3 = ret[2];
            expect(ret1).to.be.undefined;
            expect(ret2).to.equal("test");
            expect(ret3[0]).to.equal("a");
            expect(ret3[1]).to.equal("b");
            done();
        });
    });

    it("PromiseHelper.when should reject if part fails", function(done) {
        var def1 = PromiseHelper.reject("test");
        var def2 = PromiseHelper.resolve();
        var def3 = PromiseHelper.resolve();

        PromiseHelper.when(def1, def2, def3)
        .then(function() {
            done("fail");
        })
        .fail(function(ret) {
            expect(ret[0]).to.equal("test");
            done();
        });
    });

    it("PromiseHelper.chain should work with no args", function(done) {
        PromiseHelper.chain()
        .then(function(ret) {
            expect(ret).to.be.null;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.chain should work", function(done) {
        var promises = [];
        for (var i = 0; i < 2; i++) {
            promises.push(PromiseHelper.resolve.bind(this, i));
        }

        PromiseHelper.chain(promises)
        .then(function(ret) {
            expect(ret).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.chainHelper should work", function(done) {
        PromiseHelper.chainHelper(PromiseHelper.resolve, [1, 2])
        .then(function(ret) {
            expect(ret).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.alwaysResolve should work", function(done) {
        var deferred = PromiseHelper.reject();
        PromiseHelper.alwaysResolve(deferred)
        .then(function() {
            expect(true).to.be.true; // mark as pass
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("PromiseHelper.convertToNative should work(resolve)", function(done) {
        PromiseHelper.convertToNative(PromiseHelper.resolve())
        .then(() => {
            expect(true).to.be.true; // mark as pass
            done();
        })
        .catch(() => {
            expect(true).to.be.false; // mark as not pass
            done("fail");
        });
    });

    it("PromiseHelper.convertToNative should work(reject)", function(done) {
        PromiseHelper.convertToNative(PromiseHelper.reject())
        .then(() => {
            expect(true).to.be.false; // mark as not pass
            done("fail");
        })
        .catch(() => {
            expect(true).to.be.true; // mark as pass
            done();
        });
    });

    it("PromiseHelper.convertToJQuery should work(resolve)", function(done) {
        PromiseHelper.convertToJQuery(Promise.resolve())
        .then(() => {
            expect(true).to.be.true; // mark as pass
            done();
        })
        .fail(() => {
            expect(true).to.be.false; // mark as not pass
            done("fail");
        });
    });

    it("PromiseHelper.convertToJQuery should work(reject)", function(done) {
        PromiseHelper.convertToJQuery(Promise.reject())
        .then(() => {
            expect(true).to.be.false; // mark as not pass
            done("fail");
        })
        .fail(() => {
            expect(true).to.be.true; // mark as pass
            done();
        });
    });
});