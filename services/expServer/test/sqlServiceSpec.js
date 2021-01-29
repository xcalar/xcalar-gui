const { expect, assert } = require('chai');
describe("sdk sql service Test", () => {
    require('xcalar');
    require('../utils/dag/dagUtils.js');

    const sql_pb = proto.xcalar.compute.localtypes.Sql;
    const sqlService = require(__dirname +
        '/../../expServer/controllers/sdk_service_impls/sqlService.js');
    const sqlManager = require(__dirname +
        '/../../expServer/controllers/sqlManager.js').default;
    const oldFunc = sqlManager.executeSql;

    function fakeExecuteSql(func) {
        sqlManager.executeSql = func;
    }

    describe("Functional Test", ()=> {
        const ret = {
            tableName: "tableName",
            columns: [
                {
                    colName: "colName",
                    colId: 1,
                    colType: "colType",
                    rename: "rename"
                }
            ]
        }
        it("sqlService.ExecuteSql should work", async () => {
            let sqlQueryResp;
            const fakeFunc = () => PromiseHelper.resolve(ret);
            fakeExecuteSql(fakeFunc);

            let req = new sql_pb.SQLQueryRequest();
            let optimizations = new sql_pb.SQLQueryRequest.Optimizations();
            req.setOptimizations(optimizations);

            try {
                sqlQueryResp = await convertPromise(sqlService.ExecuteSQL(req));
                expect(sqlQueryResp != null).to.be.true;
                expect(sqlQueryResp.getTablename()).to.eq(ret.tableName)
                const columnsList = sqlQueryResp.getOrderedcolumnsList();
                expect(columnsList != null).to.be.true;
                expect(columnsList.length).to.eq(1)
                expect(columnsList[0].getColname()).to.eq(ret.columns[0].colName);
                expect(columnsList[0].getColid()).to.eq(ret.columns[0].colId);
                expect(columnsList[0].getColtype()).to.eq(ret.columns[0].colType);
                expect(columnsList[0].getRename()).to.eq(ret.columns[0].rename);
            } catch(e) {
                errorHandling(e);
            } finally {
                fakeExecuteSql(oldFunc);
            }
        });
        it("sqlService.ExecuteSql should fail", async () => {
            let sqlQueryResp;
            const error = "Error";
            const fakeFunc = () => PromiseHelper.reject(error);
            fakeExecuteSql(fakeFunc);

            let req = new sql_pb.SQLQueryRequest();
            let optimizations = new sql_pb.SQLQueryRequest.Optimizations();
            req.setOptimizations(optimizations);

            try {
                sqlQueryResp = await convertPromise(sqlService.ExecuteSQL(req));
                assert.fail("sqlService.ExecuteSql should fail");
            } catch(e) {
                expect(e).to.eq(error);
            } finally {
                fakeExecuteSql(oldFunc);
            }
        });
    })
})

function errorHandling(e) {
    if (e != null && e.type != null && typeof e.type === 'string') {
        assert.fail(e.type);
    } else {
        console.log(e);
        assert.fail(JSON.stringify(e || "unknown error"));
    }
}

function convertPromise(promise) {
    if (promise.fail != null) {
        // JQuery promise
        return new Promise((resolve, reject) => {
            try {
                promise.then((ret) => resolve(ret)).fail((e) => reject(e));
            } catch(e) {
                reject(e);
            }
        });
    } else {
        // Native promise
        return promise;
    }
}
