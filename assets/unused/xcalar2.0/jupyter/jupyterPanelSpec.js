describe.skip("JupyterPanel Test", function() {
    var $iframe;
    var sendMessage;
    before(function() {
        UnitTest.onMinMode();
        $iframe = $('<iframe>');
        $("body").append($iframe);
        $("#jupyterTab .mainTab").click();
        sendMessage = function(msg) {
            var deferred = PromiseHelper.deferred();
            var strMsg = JSON.stringify(msg);
            $iframe.contents().find("html").html('<script>parent.postMessage(JSON.stringify(' + strMsg + '), "*")</script>');
            setTimeout(function() {
                deferred.resolve();
            }, 1);
            return deferred.promise();
        };

        var progCol1 = new ProgCol({
            "name": "testCol1",
            "backName": "prefix::testCol1",
            "isNewCol": false,
            "func": {
                "name": "pull"
            }
        });
        var progCol2 = new ProgCol({
            "name": "DATA",
            "backName": "DATA",
            "isNewCol": false,
            "func": {
                "name": "raw"
            }
        });

        var tableName = "fakeTable#zz999";
        var tableId = "zz999";
        var table = new TableMeta({
            "tableId": tableId,
            "tableName": tableName,
            "status": TableType.Active,
            "tableCols": [progCol1, progCol2]
        });
        gTables[tableId] = table;
    });

    describe("testing message listener", function() {
        it("alert should show", function(done) {
            sendMessage({action: "alert", options: {msg: "Alerted!"}})
            .then(function() {
                UnitTest.hasAlertWithText("Alerted!");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("autofillImportUdf with stub should trigger udf modal", function(done) {
            var called = false;
            var cacheFn = JupyterUDFModal.Instance.show;
            JupyterUDFModal.Instance.show = function(type, params) {
                expect(type).to.equal("newImport");
                expect(params.target).to.equal("targ");
                expect(params.filePath).to.equal("path");
                called = true;
            };
            sendMessage({action:"autofillImportUdf", includeStub: "true",
            target: "targ", filePath: "path"})
            .then(function() {
                expect(called).to.be.true;

                JupyterUDFModal.Instance.show = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("autofillImportUdf without stub should open udf panel", function(done) {
            var called1 = false;
            var called3 = false;
            var cacheFn1 = JupyterPanel.appendStub;
            var cacheFn3 = UDFPanel.Instance.openUDF;
            JupyterPanel.appendStub = function() {
                called1 = true;
            };
            UDFPanel.Instance.openUDF = function() {
                called3 = true;
            };
            sendMessage({action:"autofillImportUdf", includeStub: "false",
            target: "targ", filePath: "path"})
            .then(function() {
                expect(called1).to.be.true;
                expect(called3).to.be.true;

                JupyterPanel.appendStub = cacheFn1;
                UDFPanel.Instance.openUDF = cacheFn3;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("mixPanel should be triggered", function(done) {
            var called = false;
            mixpanel = window.mixpanel || {};
            xcMixpanel = window.xcMixpanel || {};
            var cacheFn = xcMixpanel.track;
            xcMixpanel.track = function() {
                called = true;
            };
            var cacheFn2 = xcMixpanel.forDev;
            xcMixpanel.forDev = function() {
                return true;
            };
            var cacheFn3 = xcMixpanel.errorEvent;
            xcMixpanel.errorEvent = () => {};
            sendMessage({action: "mixpanel"})
            .then(function() {
                expect(called).to.be.true;
                xcMixpanel.track = cacheFn;
                xcMixpanel.forDev = cacheFn2;
                xcMixpanel.errorEvent = cacheFn3;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("sendInit should be triggered", function(done) {
            var called = false;
            var cacheFn = JupyterPanel.sendInit;
            JupyterPanel.sendInit = function(isNew) {
                expect(isNew).to.be.true;
                called = true;
            };

            sendMessage({action: "newUntitled"})
            .then(function() {
                expect(called).to.be.true;
                JupyterPanel.sendInit = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("enterNotebookList should be triggered", function(done) {
            var called = false;
            var cacheFn = JupyterPanel.sendInit;
            JupyterPanel.sendInit = function(isNew) {
                expect(isNew).to.not.be.true;
                called = true;
            };

            sendMessage({action: "enterNotebookList"})
            .then(function() {
                expect(called).to.be.true;
                JupyterPanel.sendInit = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });


        it("udfToMapForm should be triggered", function(done) {
            var called = false;
            var cacheFn = UDFFileManager.Instance.refresh;
            UDFFileManager.Instance.refresh = function(isNew) {
                called = true;
                return PromiseHelper.resolve();
            };

            sendMessage({action: "udfToMapForm", tableName: "testTable"})
            .then(function() {
                expect(called).to.be.true;
                UnitTest.hasAlertWithText("Table testTable is not present in any active modules.");
                UDFFileManager.Instance.refresh = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("udfToMapForm should not be triggered if fail", function(done) {
            var called = false;
            var cacheFn = UDFFileManager.Instance.refresh;
            UDFFileManager.Instance.refresh = function(isNew) {
                called = true;
                return PromiseHelper.reject();
            };

            sendMessage({action: "udfToMapForm", tableName: "testTable"})
            .then(function() {
                expect(called).to.be.true;
                UnitTest.hasAlertWithText("Could not update UDF list.");
                UDFFileManager.Instance.refresh = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("udfToDSPreview should be triggered", function(done) {
            var called = false;
            var cacheFn = UDFFileManager.Instance.refresh;
            UDFFileManager.Instance.refresh = function(isNew) {
                called = true;
                return PromiseHelper.resolve();
            };

            sendMessage({action: "udfToDSPreview", tableName: "testTable"})
            .then(function() {
                expect(called).to.be.true;
                UnitTest.hasAlertWithText(JupyterTStr.DSFormInactive);
                UDFFileManager.Instance.refresh = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("updateLocation should be triggered", function(done) {
            var called = false;
            var cacheFn =  KVStore.prototype.put;
            KVStore.prototype.put = function(isNew) {
                called = true;
                return PromiseHelper.resolve();
            };

            sendMessage({action: "updateLocation"})
            .then(function() {
                expect(called).to.be.true;
                KVStore.prototype.put = cacheFn;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Main functions", function() {
        it("JupyterPanel.autofillImportUdfModal should work", function() {
            var called1 = false;
            var called3 = false;
            var cacheFn1 = JupyterPanel.appendStub;
            var cacheFn3 = UDFPanel.Instance.openUDF;
            JupyterPanel.appendStub = function(type) {
                expect(type).to.equal("importUDF");
                called1 = true;
            };
            UDFPanel.Instance.openUDF = function() {
                called3 = true;
            };

            var prevNB = JupyterPanel.__testOnly__.getCurNB();
            JupyterPanel.__testOnly__.setCurNB(true);

            JupyterPanel.autofillImportUdfModal(null, null, false);
            expect(called1).to.be.true;
            expect(called3).to.be.true;

            JupyterPanel.appendStub = cacheFn1;
            UDFPanel.Instance.openUDF = cacheFn3;

            JupyterPanel.__testOnly__.setCurNB(prevNB);
        });
    });

    describe("menu dropdown", function() {
        it("should be visible on click", function() {
            expect($(".jupyterMenu").is(":visible")).to.be.false;
            $("#jupyterPanel").find(".topBar .dropdownBox").click();
            expect($(".jupyterMenu").is(":visible")).to.be.true;

            $("#jupyterPanel").find(".topBar .dropdownBox").click();
            expect($(".jupyterMenu").is(":visible")).to.be.false;
        });

        it("map li should work", function() {
            var called = false;
            var cacheFn = JupyterUDFModal.Instance.show;
            JupyterUDFModal.Instance.show = function(type) {
                expect(type).to.equal("map");
                called = true;
            }
            $(".jupyterMenu li[data-action='basicUDF']").click();
            expect(called).to.be.true;
            JupyterUDFModal.Instance.show = cacheFn;
        });

        it("import udf li should work", function() {
            var called = false;
            var cacheFn = JupyterUDFModal.Instance.show;
            JupyterUDFModal.Instance.show = function(type) {
                expect(type).to.equal("newImport");
                called = true;
            }
            $(".jupyterMenu li[data-action='importUDF']").click();
            expect(called).to.be.true;
            JupyterUDFModal.Instance.show = cacheFn;
        });


        it("import udf li should work", function() {
            var called = false;
            var cacheFn = JupyterPanel.appendStub;
            JupyterPanel.appendStub = function(name) {
                expect(name).to.equal("connWorkbook");
                called = true;
            }
            $(".jupyterMenu li[data-action='connWorkbook']").click();
            expect(called).to.be.true;
            JupyterPanel.appendStub = cacheFn;
        });
    });

    describe("other functions", function() {
        it("showMapForm should work", function() {
            var called1 = false;
            var called2 = false;
            var oldOpenPanel = MainMenu.openPanel;
            var oldGetTabs = DagTabManager.Instance.getTabs;
            var oldSwitch = DagTabManager.Instance.switchTab;
            var oldAddNode = DagViewManager.Instance.autoAddNode;
            var oldExecute = DagNodeMenu.execute;
            var tableName = "fakeTable#zz999";
            DagTabManager.Instance.getTabs = function() {
                let node = DagNodeFactory.create({
                    type: DagNodeType.Map,
                    table: tableName
                });
                let graph = new DagGraph();
                graph.addNode(node);
                let tab = new DagTabUser({
                    name: "test",
                    dagGraph: graph
                });
                return [tab];
            }


            MainMenu.openPanel = function(type) {
                expect(type).to.equal("sqlPanel");
                called1 = true;
            };

            var called2 = false;
            DagViewManager.Instance.autoAddNode = function(type, subType, nodeId, input) {
                expect(type).to.equal(DagNodeType.Map);
                expect(input.eval[0].evalString).to.includes("prefix::testCol1");
                called2 = true;
            };

            DagNodeMenu.execute = function() {};
            JupyterPanel.__testOnly__.showMapForm(tableName, ["prefix::testCol1"], "a", "b");
            expect(called1).to.be.true;
            expect(called2).to.be.true;
            MainMenu.openPanel = oldOpenPanel;
            DagTabManager.Instance.getTabs = oldGetTabs;
            DagTabManager.Instance.switchTab = oldSwitch;
            DagViewManager.Instance.autoAddNode = oldAddNode;
            DagNodeMenu.execute = oldExecute;
        });

        it("showDSForm should work", function() {
            var wasHidden = $("#dsForm-config").hasClass("xc-hidden");
            $("#dsForm-config").removeClass("xc-hidden");
            var text = $("#fileFormatMenu").find('li[name="UDF"]').text();
            var prevText = $("#fileFormat .text").val();
            $("#fileFormat .text").val(text);



            var called1 = false;
            var called2 = false;
            var cache1 = MainMenu.openPanel;
            MainMenu.openPanel = function(type, subType) {
                expect(type).to.equal("datastorePanel");
                expect(subType).to.equal("inButton");
                called1 = true;
            };
            $("#dsForm-applyUDF").on("click.testClick", function() {
                called2 = true;
            });

            var cacheFn3 = xcMixpanel.errorEvent;
            xcMixpanel.errorEvent = () => {};

            JupyterPanel.__testOnly__.showDSForm("a", "b");
            expect(called1).to.be.true;
            expect(called2).to.be.true;
            MainMenu.openPanel = cache1;
            xcMixpanel.errorEvent = cacheFn3;

            if (wasHidden) {
                $("#dsForm-config").addClass("xc-hidden");
            }
            $("#fileFormat .text").val(prevText);
            $("#dsForm-applyUDF").off("click.testClick");
        });
    });

    after(function() {
        $iframe.remove();
        UnitTest.offMinMode();
        delete gTables["zz999"];
    });
});
