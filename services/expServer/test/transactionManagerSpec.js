const { expect, assert } = require('chai');

describe("TransactionManager Test", () => {
    let TransactionManager = require(__dirname + "/../../expServer/controllers/transactionManager.js").default;
    let userActivityManager = require(__dirname + "/../../expServer/controllers/userActivityManager.js").default;

    let oldUpdate;
    before(() => {
        oldUpdate = userActivityManager.updateUserActivity;

    });
    after(() => {
        userActivityManager.updateUserActivity = oldUpdate;
    });

    it("TransactionManager.start should return transaction id", () => {
        let called = false;
        userActivityManager.updateUserActivity = () => {
            called = true;
        };
        TransactionManager._txIdCount = 1;
        let txId = TransactionManager.start("test1");
        expect(txId).to.equal(1);
        expect(called).to.be.true;
    });

    it("TransactionManager.start should increment", () => {
        let txId = TransactionManager.start("test2");
        expect(txId).to.equal(2);
    });

    it("TransactionManager.start should store transactions", () => {
        expect(TransactionManager._txCache.size).to.equal(2);
        let tx = TransactionManager._txCache.get(1);
        expect(tx.operation).to.equal("test1");
        expect(tx.interval).to.not.be.null;
    });

    it("TransactionManager.done should remove transaction", () => {
        let called = false;
        userActivityManager.updateUserActivity = () => {
            called = true;
        }
        expect(TransactionManager._txCache.has(1)).to.be.true;
        TransactionManager.done(1);
        expect(TransactionManager._txCache.has(1)).to.be.false;
        expect(called).to.be.true;
    });

    it("hasPending transaction should work", () => {
        expect(TransactionManager.hasPendingTransactions()).to.be.true;
        TransactionManager.done(2);
        expect(TransactionManager.hasPendingTransactions()).to.be.false;
    });

    it("interval should work", (done) => {
        let count = 0;
        userActivityManager.updateUserActivity = () => {
            count++;
        };
        let oldTime = TransactionManager._checkTime;
        TransactionManager._checkTime = 20;
        let txId = TransactionManager.start("test3");
        setTimeout(() => {
            let countCache = count;
            expect(count).to.be.gt(2);
            expect(count).to.be.lt(10);

            TransactionManager.done(txId);
            expect(count).to.equal(countCache + 1);

            setTimeout(() => {
                // make sure count hasn't changed and interval is off
                expect(count).to.equal(countCache + 1);
                TransactionManager._checkTime = oldTime;
                done();
            }, 100);
        }, 100);
    });
});