describe("DagTabPublished Test", function() {
    let dagTab;

    before(function() {
        dagTab = new DagTabPublished({name: "test"});
        dagTab._kvStore.getAndParse = () => {
            return PromiseHelper.resolve({
                name: "test",
                id: "test",
                dag: {}
            });
        };
        dagTab._kvStore.put = () => PromiseHelper.resolve();
    });

    it("should load", function(done) {
        let oldKVStore = dagTab._kvStore;
        dagTab._kvStore = {
            getAndParse: () => {
                return PromiseHelper.resolve({
                    name: "test",
                    id: "test",
                    dag: {},
                    editVersion: 0
                });
            },
            put: () => PromiseHelper.resolve()
        }

        dagTab.load()
        .then(function(res) {
            expect(res.id).to.equal("test");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            dagTab._kvStore = oldKVStore;
        });
    });

    describe("Delete Test", function() {
        let oldDeactivate;
        let oldDeleteWKBK;

        before(function() {
            oldDeactivate = XcalarDeactivateWorkbook;
            oldDeleteWKBK =  XcalarDeleteWorkbook;
        });

        it("should delete for DagTabPublished", function(done) {
            let called = 0;

            XcalarDeleteWorkbook =
            XcalarDeactivateWorkbook = () => {
                called++;
                return PromiseHelper.resolve();
            };

            dagTab.delete()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("delete should still resolve if no seesion error", function(done) {
            let called = 0;
            XcalarDeleteWorkbook = () => {
                called++;
                return PromiseHelper.reject({
                    status: StatusT.StatusSessionNotFound
                });
            };

            XcalarDeactivateWorkbook = () => {
                called++;
                return PromiseHelper.resolve();
            };

            dagTab.delete()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("delete should reject in error case", function(done) {
            XcalarDeleteWorkbook = () => {
                return PromiseHelper.reject({
                    error: "test"
                });
            }

            dagTab.delete()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error.error).to.equal("test");
                done();
            });
        });

        after(function() {
            XcalarDeactivateWorkbook = oldDeactivate;
            XcalarDeleteWorkbook = oldDeleteWKBK;
        });
    });

    it("should upload", function(done) {
        let oldUpload = XcalarUploadWorkbook;

        XcalarUploadWorkbook = () => PromiseHelper.resolve("testId");

        dagTab.upload()
        .then(function() {
            expect(dagTab.getId()).to.equal("testId");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarUploadWorkbook = oldUpload;
        });
    });

    it("should download", function(done) {
        let oldDownload = XcalarDownloadWorkbook;
        let oldHelper = xcHelper.downloadAsFile;
        let called = false;
        XcalarDownloadWorkbook = () => PromiseHelper.resolve({});
        xcHelper.downloadAsFile = () => called = true;

        dagTab.download()
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarDownloadWorkbook = oldDownload;
            xcHelper.downloadAsFile = oldHelper;
        });
    });

    describe("Publish Test", function() {
        let oldNewWKBK;
        let oldActivate;
        let oldWrite;
        let oldGetUDF;
        let oldUpload;

        before(function() {
            oldNewWKBK = XcalarNewWorkbook;
            oldActivate = XcalarActivateWorkbook;
            oldWrite = dagTab._writeToKVStore;
            oldGetUDF = UDFFileManager.Instance.getEntireUDF;
            UDFFileManager.Instance.getEntireUDF = () => PromiseHelper.resolve("test");
            oldUpload = XcalarUploadPython;
            XcalarUploadPython = () => PromiseHelper.resolve();
        });

        it("should upload", function(done) {
            let called = 0;
            XcalarNewWorkbook = () => {
                called++;
                return PromiseHelper.resolve("testPublish");
            };

            XcalarActivateWorkbook =
            dagTab._writeToKVStore = () => {
                called++;
                return PromiseHelper.resolve();
            };

            dagTab.publish()
            .then(function() {
                expect(dagTab.getId()).to.equal("testPublish");
                expect(called).to.equal(3);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should delete workbook in fail case", function(done) {
            let oldDelete = dagTab._deleteWKBK;
            let called = false;
            XcalarNewWorkbook = () => PromiseHelper.resolve("testPublish");
            dagTab._writeToKVStore = () => PromiseHelper.reject("test");

            dagTab._deleteWKBK = () => called = true;

            dagTab.publish()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(called).to.equal(true);
                expect(error.log).to.equal("test");
                done();
            })
            .always(function() {
                dagTab._deleteWKBK = oldDelete;
            });
        });

        after(function() {
            XcalarNewWorkbook = oldNewWKBK;
            XcalarActivateWorkbook = oldActivate;
            dagTab._writeToKVStore = oldWrite;
            UDFFileManager.Instance.getEntireUDF = oldGetUDF;
            XcalarUploadPython = oldUpload;
        });
    });

    it("copyUDFToLocal should work", function(done) {
        let called = 0;
        let oldList = XcalarListXdfs;
        let oldRefresh = UDFFileManager.Instance.refresh;
        let oldDownload = XcalarDownloadPython;
        let oldUpload = XcalarUploadPython;

        XcalarListXdfs = () => {
            called++;
            return PromiseHelper.resolve({
                fnDescs: [{fnName: "default:test"}]
            });
        };

        UDFFileManager.Instance.refresh = () => called++;
        XcalarDownloadPython = () => {
            called++;
            return PromiseHelper.resolve("test");
        };

        XcalarUploadPython = () => {
            called++;
            return PromiseHelper.resolve();
        };


        dagTab.copyUDFToLocal(true)
        .then(function() {
            expect(called).to.equal(4);
            done();
        })
        .fail(function() {
            done();
        })
        .always(function() {
            XcalarListXdfs = oldList;
            UDFFileManager.Instance.refresh = oldRefresh;
            XcalarDownloadPython = oldDownload;
            XcalarUploadPython = oldUpload;
        });
    });
});