describe("DagUDFErrorModal Test", function() {
    var $modal;
    var dagViewCache;
    var node;
    let nodeId;

    before(function(done) {
        UnitTest.onMinMode();

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            $modal = $("#dagUDFErrorModal");
            const parentNode = new DagNodeMap({});
            parentNode.getTable = () => "table";
            dagViewCache = DagViewManager.Instance.getActiveDag;
            node = DagNodeFactory.create({type: DagNodeType.Map});
            node.setUDFError({
                opFailureSummary: [
                    {
                        failureSummName: "test",
                        failureSummInfo: [
                            {numRowsFailed: 20, failureDesc: "test1"},
                            {numRowsFailed: 30, failureDesc: "test2"}
                        ]
                    }
                ],
                numRowsFailedTotal: 50
            });

            node.getParents = function() {
                return [parentNode];
            }
            nodeId = node.getId();
            DagViewManager.Instance.getActiveDag = function() {
                return {
                    getNode: function() {
                        return node;
                    }
                };
            };
            done();
        });
    });
    describe("testing show and initial state", function() {
        before(() => {

        });
        it("should not show if node is not found", () => {
            let cache = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = function() {
                return {
                    getNode: () => null
                };
            };
            expect(DagUDFErrorModal.Instance.show("invalidId")).to.be.false;
            expect($modal.is(":visible")).to.be.false;
            expect(DagUDFErrorModal.Instance.isOpen()).to.be.false;
            DagViewManager.Instance.getActiveDag = cache;
        });
        it("should show", () => {
            let cache = DagViewManager.Instance.getActiveTab;
            let called = false;
            DagViewManager.Instance.getActiveTab = () => {
                called = true;
                return cache.bind(DagViewManager.Instance)();
            }
            expect(DagUDFErrorModal.Instance.show(nodeId)).to.be.true;
            expect($modal.is(":visible")).to.be.true;
            expect(DagUDFErrorModal.Instance.isOpen()).to.be.true;
            expect(called).to.be.true;
            DagViewManager.Instance.getActiveTab = cache;
        });
        it("should show correct instructions", function() {
            expect($modal.find(".numErrors").text().trim()).to.equal("50");
            expect($modal.find(".extraErrors").length).to.equal(1);
            expect($modal.find(".extraErrors:visible").length).to.equal(0);
        });
        it("should show errors", function() {
            expect($modal.find(".errorRow").length).to.equal(2);
            expect($modal.find(".errorRow").eq(0).text().trim().startsWith("20 failures")).to.be.true;
            expect($modal.find(".errorRow").eq(0).text().trim().endsWith("test1")).to.be.true;
        });
        it("should have genErrorTable button", () => {
            expect($modal.find(".genErrorTable").length).to.equal(1);
            expect($modal.find(".genErrorTable:visible").length).to.equal(1);
            expect($modal.find(".genErrorTable").hasClass("unavailable")).to.be.false;
        });
        it("should not open if already open", function() {
            DagUDFErrorModal.Instance.show(nodeId);
        });
    });

    describe("submitting", function() {
        it("genErrorTable should work", async function(done) {
            let oldFunc = UserSettings.Instance.getPref;
            let called = false;
            let called2 = false;
            let called3 = false;
            let cacheRun =  DagViewManager.Instance.run;
            let cachePreview = DagViewManager.Instance.viewResult;
            let cacheAdd = DagViewManager.Instance.autoAddNode;
            UserSettings.Instance.getPref = () => false;

            DagViewManager.Instance.run = () => {
                called = true;
                return PromiseHelper.resolve();
            }
            DagViewManager.Instance.viewResult = () => {
                called2 = true;
            }
            DagViewManager.Instance.autoAddNode = () => {
                called3 = true;
                return new DagNodeMap({});
            }
            await DagUDFErrorModal.Instance._genErrorTable();

            console.log(called, called2, called3);
            expect(called && called2 && called3).to.be.true;

            DagViewManager.Instance.run = cacheRun;
            DagViewManager.Instance.viewResult = cachePreview;
            DagViewManager.Instance.autoAddNode = cacheAdd;
            UserSettings.Instance.getPref = oldFunc;
            done();
        });

        it("should be close", function() {
            expect(DagUDFErrorModal.Instance.isOpen()).to.be.false;
            expect($modal.is(":visible")).to.be.false;
        });
    });

    describe("edge cases", function() {
        it("should handle no parent node", () => {
            expect(DagUDFErrorModal.Instance.isOpen()).to.be.false;
            node.getParents = function() {
                return [];
            }
            expect(DagUDFErrorModal.Instance.show(nodeId)).to.be.true;
            expect($modal.find(".genErrorTable").length).to.equal(1);
            expect($modal.find(".genErrorTable:visible").length).to.equal(1);
            expect($modal.find(".genErrorTable").hasClass("unavailable")).to.be.true;
            $modal.find(".close").click();
        });
    });

    after(function() {
        UnitTest.offMinMode();
        DagViewManager.Instance.getActiveDag = dagViewCache;
    });


    var testError = {
        "numRowsFailedTotal": 205663,
        "opFailureSummary": [
            {
                "failureSummName": "DayOfWeek_udf",
                "failureSummInfo": [
                    {
                        "numRowsFailed": 20518,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 55, in funcFailsMulti\n    ncol = 2/0\nZeroDivisionError: division by zero\n"
                    },
                    {
                        "numRowsFailed": 20212,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 61, in funcFailsMulti\n    ncol = 5/0\nZeroDivisionError: division by zero\n"
                    },
                    {
                        "numRowsFailed": 20210,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 63, in funcFailsMulti\n    ncol = 6/0\nZeroDivisionError: division by zero\n"
                    },
                    {
                        "numRowsFailed": 20130,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 59, in funcFailsMulti\n    ncol = 4/0\nZeroDivisionError: division by zero\n"
                    },
                    {
                        "numRowsFailed": 17722,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 69, in funcFailsMulti\n    ncol = funcFails1()\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 17, in funcFails1\n    y = time.time()\nNameError: name 'time' is not defined\n"
                    }
                ]
            },
            {
                "failureSummName": "TaxiIn_udf",
                "failureSummInfo": [
                    {
                        "numRowsFailed": 47493,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 69, in funcFailsMulti\n    ncol = funcFails1()\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 17, in funcFails1\n    y = time.time()\nNameError: name 'time' is not defined\n"
                    },
                    {
                        "numRowsFailed": 20917,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 61, in funcFailsMulti\n    ncol = 5/0\nZeroDivisionError: division by zero\n"
                    },
                    {
                        "numRowsFailed": 17474,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 63, in funcFailsMulti\n    ncol = 6/0\nZeroDivisionError: division by zero\n"
                    },
                    {
                        "numRowsFailed": 15503,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 59, in funcFailsMulti\n    ncol = 4/0\nZeroDivisionError: division by zero\n"
                    },
                    {
                        "numRowsFailed": 3568,
                        "failureDesc": "Traceback (most recent call last):\n  File \"/var/opt/xcalar/workbooks/admin/5D781059319265B9/udfs/python/mapfailmulti.py\", line 55, in funcFailsMulti\n    ncol = 2/0\nZeroDivisionError: division by zero\n"
                    }
                ]
            },
            {
                "failureSummName": "",
                "failureSummInfo": [
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    }
                ]
            },
            {
                "failureSummName": "",
                "failureSummInfo": [
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    }
                ]
            },
            {
                "failureSummName": "",
                "failureSummInfo": [
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    },
                    {
                        "numRowsFailed": 0,
                        "failureDesc": ""
                    }
                ]
            }
        ]
    };
});
