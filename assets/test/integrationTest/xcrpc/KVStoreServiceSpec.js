const expect = require('chai').expect;
const { ErrorType } = require('xcalarsdk').Error;

exports.testSuite = function(KVstoreService, KVSCOPE, STATUS,  SessionService, SessionSCOPE) {
    let newKey = new Set();
    let newKeyWorkbook = new Set();
    const testUserName = "testUserKVStore" + new Date().getTime();
    const testSessionName = "testSessionKVStore" + new Date().getTime();
    const scopeInfo = {userName: testUserName, workbookName: testSessionName};
    describe("KVStoreService Test: ", async function () {
        before(async function(){
            await  SessionService.create({
                sessionName: testSessionName,
                fork: false,
                forkedSessionName: "",
                scope: SessionSCOPE.WORKBOOK,
                scopeInfo:scopeInfo
            });
            await  SessionService.activate({
                sessionName: testSessionName,
                scope: SessionSCOPE.WORKBOOK,
                scopeInfo: scopeInfo
            });
        });

        it("lookup() should handle key not found error correctly in global scope", async function () {
            let result;
            try {
                result = await KVstoreService.lookup({keyName: "*", kvScope: KVSCOPE.GLOBAL});
            } catch(err) {
                console.log("lookup() did not handle not found error in global scope");
                expect.fail(null, null, err.error);
            }
            expect(result).to.be.null;
        });

        it("lookup() should handle key not found error correctly in workbook scope", async function () {
            let result;
            try {
                result = await KVstoreService.lookup({keyName: "*", kvScope:  KVSCOPE.WORKBOOK, scopeInfo:scopeInfo});
            } catch(err) {
                console.log("lookup() did not handle not found error in workbook scope");
                expect.fail(null, null, err.error);
            }
            expect(result).to.be.null;
        });

        it("list() should works in global scope", async function() {
            let keyName = "testList";
            newKey.add(keyName);
            let result, result2, result3;
            try {
                result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.not.include(keyName);
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persist: false, kvScope: KVSCOPE.GLOBAL});
                result2 = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result2.numKeys).to.equal(result.numKeys+1);
                expect(result2.keys).to.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                result3 = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result3.numKeys).to.equal(result2.numKeys-1);
                expect(result3.keys).to.not.include(keyName);
            } catch(err) {
                expect.fail(null, null, err.error);
            }
        });

        it("list() should works in workbook scope", async function(){
            let keyName = "testListWorkbook";
            newKeyWorkbook.add(keyName);
            try{
                const result = await KVstoreService.list({kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:keyName,
                    scopeInfo:scopeInfo});
                expect(result.keys).to.not.include(keyName);
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persist: false, kvScope: KVSCOPE.WORKBOOK,
                    scopeInfo:scopeInfo});
                const result2 = await KVstoreService.list({kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:keyName,
                    scopeInfo:scopeInfo});
                expect(result2.numKeys).to.equal(result.numKeys+1);
                expect(result2.keys).to.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope: KVSCOPE.WORKBOOK,
                    scopeInfo:scopeInfo});
                const result3 = await KVstoreService.list({kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:keyName,
                    scopeInfo:scopeInfo});
                expect(result3.numKeys).to.equal(result2.numKeys-1);
                expect(result3.keys).to.not.include(keyName);
            } catch(err) {
                console.log("list() not work in workbook scope");
                expect.fail(null, null, err.error);
            }
        })

        it("list() should catch the error when keyRegex not match in global scope", async function(){
            let result;
            try {
                result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:"notExsit"});

            } catch(err) {
                console.log("when kvKeyRegex does not match in global scope, should return an empty array");
                expect.fail(null, null, err.error);
            }
            expect(result.numKeys).to.equal(0);
            expect(result.keys).to.be.an('array').that.is.empty;
        });

        it("list() should catch the error when keyRegex not match in workbook scope", async function(){
            let result;
            try {
                result = await KVstoreService.list({kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:"notExsit", scopeInfo:scopeInfo});
            } catch(err) {
                console.log("when kvKeyRegex does not match in workbook scope, should return an empty array");
                expect.fail(null, null, err.error);
            }
            expect(result.numKeys).to.equal(0);
            expect(result.keys).to.be.an('array').that.is.empty;
        });

        it("addOrReplace() should add a new key in workbook scope", async function () {
            let keyName = "mykeyworkbook";
            newKeyWorkbook.add(keyName);
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persist: false, kvScope: KVSCOPE.WORKBOOK,
                    scopeInfo:scopeInfo});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result).to.be.null;
                const result2 = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.WORKBOOK, scopeInfo:scopeInfo});
                expect(result2.value).to.equal('a');
            } catch(err){
                console.log("addOrReplace() did not add new key successfully in workbook scope");
                expect.fail(null, null, err.error);
            }
        });

        it("addOrReplace() should add a new key in global scope", async function () {
            let keyName = "mykey";
            newKey.add(keyName);
            let result;
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "aa", persist: false, kvScope: KVSCOPE.GLOBAL});
                result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
            } catch(err){
                console.log("addOrReplace() did not add new key successfully in global scope");
                expect.fail(null, null, err.error);
            }
            expect(result.value).to.equal('aa');
        });

        it("addOrReplace() should replace a existed key value in workbook scope", async function () {
            let keyName = "mykeyworkbook";
            newKeyWorkbook.add(keyName);
            try {
                const result = await KVstoreService.list({ kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:keyName, scopeInfo:scopeInfo});
                expect(result.keys).to.include(keyName);
                await KVstoreService.addOrReplace({key: keyName, value: "b", persist: false, kvScope: KVSCOPE.WORKBOOK, scopeInfo:scopeInfo});
                const result2 = await KVstoreService.lookup({keyName: keyName, kvScope: KVSCOPE.WORKBOOK, scopeInfo:scopeInfo});
                expect(result2.value).to.equal('b');
            } catch(err){
                console.log("addOrReplace() did not replace a exised key value successfully in workbook scope");
                expect.fail(null, null, err.error);
            }
        });

        it("addOrReplace() should replace a existed key value in global scope", async function () {
            let keyName = "mykey";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.include(keyName);
                await KVstoreService.addOrReplace({key: keyName, value: "bb", persist: false, kvScope: KVSCOPE.GLOBAL});
                const result2 = await KVstoreService.lookup({keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result2.value).to.equal('bb');
            } catch(err){
                console.log("addOrReplace() did not replace a exised key value successfully in global scope");
                expect.fail(null, null, err.error);
            }
        });

        it("multiAddOrReplace() should not work in global scope", async function() {
            const kvMap = new Map();
            kvMap.set('multiadddrop/gtest', 'anyvalue');
            let error = null;
            try {
                await KVstoreService.multiAddOrReplace({
                    kvMap: kvMap, persist: false, kvScope: KVSCOPE.GLOBAL
                });
            } catch(err) {
                error = err;
            }

            expect(error).to.not.be.null;
            expect(error.type).to.equal(ErrorType.UNKNOWN); // This is thrown from client code(limitation of backend)
        });

        it("multiAddOrReplace() should work in workbook scope", async function() {
            const keys = ['multiadddrop/gtest1', 'multiadddrop/gtest2'];
            keys.forEach((key) => { newKeyWorkbook.add(key); });
            const values1 = ['value1_1', 'value1_2']; // Initial values
            const values2 = ['value2_1', 'value2_2']; // Modified values
            const kvMap1 = keys.reduce((map, key, index) => {
                map.set(key, values1[index]);
                return map;
            }, new Map());
            const kvMap2 = keys.reduce((map, key, index) => {
                map.set(key, values2[index]);
                return map;
            }, new Map());

            let error = null;
            let newResult = null;
            let replaceResult = null;
            try {
                // New keys
                await KVstoreService.multiAddOrReplace({
                    kvMap: kvMap1, persist: false, kvScope: KVSCOPE.WORKBOOK, scopeInfo:scopeInfo
                });
                newResult = [];
                for (const key of keys) {
                    newResult.push(await KVstoreService.lookup({
                        keyName: key, kvScope: KVSCOPE.WORKBOOK, scopeInfo: scopeInfo
                    }));
                }
                // Replace
                await KVstoreService.multiAddOrReplace({
                    kvMap: kvMap2, persist: false, kvScope: KVSCOPE.WORKBOOK, scopeInfo:scopeInfo
                });
                replaceResult = [];
                for (const key of keys) {
                    replaceResult.push(await KVstoreService.lookup({
                        keyName: key, kvScope: KVSCOPE.WORKBOOK, scopeInfo: scopeInfo
                    }));
                }
            } catch(err) {
                error = err;
            }

            expect(error).to.be.null;
            // Check result of new keys
            expect(newResult).to.not.be.null;
            expect(newResult.length).to.equal(keys.length);
            expect(newResult.map(v => v.value)).to.deep.equal(values1);
            // Check result for replace
            expect(replaceResult).to.not.be.null;
            expect(replaceResult.length).to.equal(keys.length);
            expect(replaceResult.map(v => v.value)).to.deep.equal(values2);
        });

        it("deleteKey() should delete an existed key in global scope", async function () {
            //should use key list to make sure deleteKey sucessfully
            let keyName = "mykey";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope: KVSCOPE.GLOBAL})
                const result2 = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result2.numKeys).to.equal(result.numKeys-1);
                expect(result2.keys).to.not.include(keyName);
            } catch(err){
                console.log("deleteKey() did not delete an existed key successfull in global scope");
                expect.fail(null, null, err.error);
            }
        });

        it("deleteKey() should delete an existed key in workbook scope", async function () {
            //should use key list to make sure deleteKey sucessfully
            let keyName = "mykeyworkbook";
            newKeyWorkbook.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:keyName, scopeInfo:scopeInfo});
                expect(result.keys).to.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope: KVSCOPE.WORKBOOK,scopeInfo:scopeInfo})
                const result2 = await KVstoreService.list({kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:keyName, scopeInfo:scopeInfo});
                expect(result2.numKeys).to.equal(result.numKeys-1);
                expect(result2.keys).to.not.include(keyName);
            } catch(err){
                console.log("deleteKey() did not delete an existed key successfull in workbook scope");
                expect.fail(null, null, err.error);
            }
        });

        it("deleteKey() should handle the unexisted key in global scope", async function () {
            let keyName = "mykey";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.GLOBAL, kvKeyRegex:keyName});
                expect(result.keys).to.not.include(keyName);
                await KVstoreService.deleteKey({ keyName: keyName, kvScope:KVSCOPE.GLOBAL})
            } catch(err){
                console.log("deleteKey() did not hanlde the unexisted key");
                expect.fail(null, null, err.error);
            }
        });

        it("deleteKey() should handle the unexisted key in workbook scope", async function () {
            let keyName = "mykeyworkbook";
            newKeyWorkbook.add(keyName);
            try {
                const result = await KVstoreService.list({kvScope: KVSCOPE.WORKBOOK, kvKeyRegex:keyName, scopeInfo:scopeInfo});
                expect(result.keys).to.not.include(keyName);
                await KVstoreService.deleteKey({ kkeyName: keyName, kvScope: KVSCOPE.WORKBOOK,scopeInfo:scopeInfo})
            } catch(err){
                console.log("deleteKey() did not hanlde the unexisted key");
                expect.fail(null, null, err.error);
            }
        });

        it("append() should append the value when the key exists in global scope", async function () {
            let keyName = "testAppend1";
            newKey.add(keyName);
            let result;
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "a", persist: false, kvScope: KVSCOPE.GLOBAL});
                await KVstoreService.append({keyName: keyName, kvScope:  KVSCOPE.GLOBAL,
                    persist:false, kvSuffix: "bb"});
                result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
            } catch(err) {
                console.log("append() did not append the value when the key exists");
                expect.fail(null, null, err.error);
            }
            expect(result.value).to.equal('abb');
        });

        it("append() should append the value when the key exists in global scope", async function () {
            let keyName = "testAppend1workbook";
            newKeyWorkbook.add(keyName);
            let result;
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: "aa", persist: false, kvScope: KVSCOPE.GLOBAL});
                await KVstoreService.append({keyName: keyName, kvScope:  KVSCOPE.GLOBAL,
                    persist:false, kvSuffix: "bb"});
                result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
            } catch(err) {
                console.log("append() did not append the value when the key exists");
                expect.fail(null, null, err.error);
            }
            expect(result.value).to.equal('aabb');
        });

        it("append() should add the key when key does not exist", async function () {
            let keyName = "testAppend2";
            newKey.add(keyName);
            let result;
            try {
                await KVstoreService.append({keyName: keyName, kvScope:  KVSCOPE.GLOBAL,
                    persist:false, kvSuffix: "cc"});
                result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
            } catch(err) {
                console.log("append() did not append the value when the key exists");
                expect.fail(null, null, err.error);
            }
            expect(result.value).to.equal('cc');
        });

        it("setIfEqual() should set the value for the existed key in workbook scope", async function() {
            let keyName = "testSetIfEqualworkbook";
            let keyValue = "testValue";
            let keyValueSet = "replaceValue";
            newKeyWorkbook.add(keyName);
            let result, result2, result3;
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: keyValue, persist: false, kvScope: KVSCOPE.WORKBOOK, scopeInfo:scopeInfo});
                result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.WORKBOOK, scopeInfo:scopeInfo});
                result2 = await KVstoreService.setIfEqual({kvScope: KVSCOPE.WORKBOOK,
                    persist:false, countSecondaryPairs: 0, kvKeyCompare: keyName, kvValueCompare: keyValue, kvValueReplace: keyValueSet,
                    scopeInfo:scopeInfo});
                result3 = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.WORKBOOK,scopeInfo:scopeInfo});
            } catch(err) {
                console.log("setIfEqual() did not set the value for the existed key correctly");
                expect.fail(null, null, err.error);
            }
            expect(result2.noKV).to.be.false;
            expect(result.value).to.not.equal(result3.value);
            expect(result3.value).to.equal(keyValueSet);
        });

        it("setIfEqual() should set the value for the existed key in globl scope", async function() {
            let keyName = "testSetIfEqual";
            let keyValue = "testValue";
            let keyValueSet = "replaceValue";
            newKey.add(keyName);
            try {
                await KVstoreService.addOrReplace({ key: keyName, value: keyValue, persist: false, kvScope: KVSCOPE.GLOBAL});
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                const result2 = await KVstoreService.setIfEqual({kvScope: KVSCOPE.GLOBAL,
                    persist:false, countSecondaryPairs: 0, kvKeyCompare: keyName, kvValueCompare: keyValue, kvValueReplace: keyValueSet});
                expect(result2.noKV).to.be.false;
                const result3 = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                expect(result.value).to.not.equal(result3.value);
                expect(result3.value).to.equal(keyValueSet);
            } catch(err) {
                console.log("setIfEqual() did not set the value for the existed key correctly");
                expect.fail(null, null, err.error);
            }
        });

        it("setIfEqual() should handle the error when the key does not exist", async function() {
            let keyName = "testSetIfEqual2";
            let keyValue = "testValue";
            let keyValueSet = "replaceValue";
            newKey.add(keyName);
            let result2;
            try {
                result2 = await KVstoreService.setIfEqual({kvScope: KVSCOPE.GLOBAL,
                    persist:false, countSecondaryPairs: 0, kvKeyCompare: keyName, kvValueCompare: keyValue, kvValueReplace: keyValueSet});
            } catch(err) {
                console.log("setIfEqual() cannot throw an error when the key does not exist");
                expect.fail(null, null, err.error);
            }
            expect(result2.noKV).to.be.true;
        });

        it("setIfEqual() should return error when the keyValue does not match", async function(){
            let keyName = "testSetIfEqual";
            let keyValueSet = "replaceValue";
            newKey.add(keyName);
            try {
                const result = await KVstoreService.lookup({ keyName: keyName, kvScope: KVSCOPE.GLOBAL});
                let keyValue = result.value + "notExist"
                const result2 = await KVstoreService.setIfEqual({kvScope: KVSCOPE.GLOBAL,
                    persist:false, countSecondaryPairs: 0, kvKeyCompare: keyName, kvValueCompare: keyValue, kvValueReplace: keyValueSet});
                expect.fail("when keyValue does not match, shoul throw error")
            } catch(err) {
                expect(err.status).to.equal(STATUS.STATUS_KV_ENTRY_NOT_EQUAL);
            }
        });

        after(async function() {
            for (const val of newKey) {
                try {
                    await KVstoreService.deleteKey({ keyName: val, kvScope:KVSCOPE.GLOBAL});
                } catch {
                    // Ignore the error and continue
                }
            }
            for (const val of newKeyWorkbook) {
                try {
                    await KVstoreService.deleteKey({ keyName: val, kvScope:KVSCOPE.WORKBOOK, scopeInfo:scopeInfo});
                } catch {
                    // Ignore the error and continue
                }
            }
        });
    });
}
