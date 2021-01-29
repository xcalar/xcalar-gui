const { expect, assert } = require('chai');
const fs = require('fs');
const path = require('path');

require('../../../expServer/utils/dag/dagUtils.js');
require('../../../expServer/controllers/sqlManager.js');
const XDFList = require('./xdfList.js');

describe('DagComponent Test', function() {
    this.timeout(50000);
    let listXdfsStr;
    before(() => {
        // To run test locally, setup the planServer before invoke mocha
        // ex. export NODE_PLANSERVER="https://localhost:8889/https://skywalker.int.xcalar.com:8443/sql"
        global.planServer = process.env.NODE_PLANSERVER || global.planServer;
        // XXX TODO: call xcrpc api to get xdfs, once the api is ready
        return XDFList.getXdfsStr().then((ret) => {
            listXdfsStr = ret;
        });
    });

    // It's testing the module denpendencies rather than correctness
    describe('Non-optimized DF:', () => {
        const testConfig = {
            workbook: 'testWB',
            userName: 'dftest',
            sessionId: 'test1',
            dfNames: ['testRow', 'testCol', 'testJoin', 'testSet', 'testSql', 'testAggr']
        };
        let dfStrList;
        before(() => {
            const info = readInfoFromKVContent(`${testConfig.workbook}.kv.json`);
            dfStrList = info.dfStrList.map((v) => v);
        });

        for (const dfName of testConfig.dfNames) {
            it(`${dfName}`, async () => {
                let xcalarQuery;
                try {
                    let ret = await convertPromise(DagHelper.convertKvs(
                        dfStrList, dfName, false, listXdfsStr,
                        testConfig.userName, testConfig.sessionId, testConfig.workbook
                    ));
                    xcalarQuery = ret;
                } catch(e) {
                    console.error("Non-optimized DF failed", e);
                    if (e != null && e.type != null && typeof e.type === 'string') {
                        assert.fail(e.type);
                    } else {
                        assert.fail(JSON.stringify(e || 'unknown error'));
                    }
                }
                expect(xcalarQuery != null).to.be.true;
                expect(xcalarQuery.length).to.gt(0);
            });
        }
    });

    describe('Optimized DF:', () => {
        const testConfig = {
            workbook: 'testWB',
            userName: 'dftest',
            sessionId: 'test1',
            dfNames: [
                'testOpt', 'testSynDS', // Legacy DFs w/ optimized node
                'testRow', 'testCol', 'testJoin', 'testSet', 'testSql', 'testAggr' // New DFs w/ normal linkOut
            ]
        };
        let dfStrList;
        before(() => {
            const info = readInfoFromKVContent(`${testConfig.workbook}.kv.json`);
            dfStrList = info.dfStrList.map((v) => v);
        });

        for (const dfName of testConfig.dfNames) {
            it(`${dfName}`, async () => {
                let xcalarQuery;
                try {
                    xcalarQuery = JSON.stringify(await convertPromise(DagHelper.convertKvs(
                        dfStrList, dfName, true, listXdfsStr,
                        testConfig.userName, testConfig.sessionId, testConfig.workbook
                    )));
                } catch(e) {
                    console.error("optimized df failed", e);
                    if (e != null && e.type != null && typeof e.type === 'string') {
                        assert.fail(e.type);
                    } else {
                        assert.fail(JSON.stringify(e || 'unknown error'));
                    }
                }
                expect(xcalarQuery != null).to.be.true;
                expect(xcalarQuery.length).to.gt(0);
            });
        }
    });
});

function readInfoFromKVContent(name) {
    const content = fs.readFileSync(path.resolve(__dirname, name), { encoding: 'UTF8'});
    const json = JSON.parse(content);
    const dagList = JSON.parse(json['gDagListKey-1']).dags;
    const dfList = dagList.map(({id}) => {
        return json[id];
    });
    return { dfStrList: dfList };
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