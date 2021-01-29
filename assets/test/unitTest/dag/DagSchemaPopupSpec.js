describe("DagSchemaPopup Test", function() {
    let tabId;
    let $dagView;
    let $dfWrap;
    let $dfArea;
    let datasetNodeId;
    let mapNodeId;
    let castNodeId;
    let groupByNodeId;
    let filterNodeId;
    let sqlNodeId;
    let $popup;
    let dagSchemaPopup;
    let dagGraph;

    before(function(done) {
        console.log("Dag Schema Popup Test");
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            $popup = $("#dagSchemaPopup");
            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            dagGraph = DagViewManager.Instance.getActiveDag();
            $dagView = $("#dagView");
            $dfWrap = $dagView.find(".dataflowWrap");
            $dfArea = $dfWrap.find(".dataflowArea.active");
            let dagView = DagViewManager.Instance.getActiveDagView();
            // dataset, cast, map, group by, and filter(unconnected) node
            let nodeInfos = [
                {
                    "type": "dataset",
                    "subType": null,
                    "display": {
                        "x": 120,
                        "y": 40
                    },
                    "description": "",
                    "input": {
                        "source": "rudy.19434.classes",
                        "prefix": "classes",
                        "synthesize": false,
                        "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"rudy.19434.classes\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/datasets/indexJoin/classes/classes.json\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseJson\",\n                \"parserArgJson\": \"{}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": []\n            },\n            \"size\": 10737418240\n        }\n    },\n    \"annotations\": {}\n}"
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "schema": [
                        {
                            "name": "class_name",
                            "type": "string"
                        },
                        {
                            "name": "class_id",
                            "type": "integer"
                        }
                    ],
                    "parents": [],
                    "nodeId": "dag_5C2E5E0B0EF91A85_1551910568274_43"
                },
                {
                    "type": "map",
                    "subType": "cast",
                    "display": {
                        "x": 260,
                        "y": 40
                    },
                    "description": "",
                    "input": {
                        "eval": [
                            {
                                "evalString": "money(classes::class_id)",
                                "newField": "class_id"
                            }
                        ],
                        "icv": false
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "parents": [
                        "dag_5C2E5E0B0EF91A85_1551910568274_43"
                    ],
                    "nodeId": "dag_5C2E5E0B0EF91A85_1552410078861_36",
                    "columnDeltas": [
                        {
                            "name": "classes::class_name",
                            "isHidden": true,
                            "type": "string"
                        }
                    ],
                },
                {
                    "type": "map",
                    "subType": null,
                    "display": {
                        "x": 400,
                        "y": 40
                    },
                    "description": "",
                    "input": {
                        "eval": [
                            {
                                "evalString": "eq(class_id, 2.25)",
                                "newField": "mapCol"
                            }
                        ],
                        "icv": false
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "parents": [
                        "dag_5C2E5E0B0EF91A85_1552410078861_36"
                    ],
                    "nodeId": "dag_5C2E5E0B0EF91A85_1552410099514_37"
                },
                {
                    "type": "groupBy",
                    "subType": null,
                    "display": {
                        "x": 560,
                        "y": 40
                    },
                    "description": "",
                    "input": {
                        "groupBy": [
                            "mapCol"
                        ],
                        "aggregate": [
                            {
                                "operator": "count",
                                "sourceColumn": "mapCol",
                                "destColumn": "gbCol",
                                "distinct": false,
                                "cast": null
                            }
                        ],
                        "includeSample": false,
                        "joinBack": false,
                        "icv": false,
                        "groupAll": false,
                        "newKeys": [],
                        "dhtName": ""
                    },
                    "state": "Configured",
                    "configured": true,
                    "aggregates": [],
                    "parents": [
                        "dag_5C2E5E0B0EF91A85_1552410099514_37"
                    ],
                    "nodeId": "dag_5C2E5E0B0EF91A85_1552410208227_38"
                },
                {
                    "type": "filter",
                    "subType": null,
                    "display": {
                        "x": 700,
                        "y": 40
                    },
                    "description": "",
                    "input": {
                        "evalString": ""
                    },
                    "state": "Unused",
                    "configured": false,
                    "aggregates": [],
                    "parents": [],
                    "nodeId": "dag_5C2E5E0B0EF91A85_1552416079052_36"
                },
                {
                    "type": "sql",
                    "subType": null,
                    "display": {
                        "x": 260,
                        "y": 140
                    },
                    "description": "",
                    "input": {
                        "sqlQueryStr": "",
                        "identifiers": {},
                        "identifiersOrder": [],
                        "dropAsYouGo": true
                    },
                    "state": "Unused",
                    "configured": false,
                    "aggregates": [],
                    "parents": ["dag_5C2E5E0B0EF91A85_1551910568274_43"],
                    "nodeId": "dag_5C38E57232629A41_1552421080646_41"
                }
            ];

            dagView.validateAndPaste(JSON.stringify(nodeInfos));
            groupByNodeId = $dfArea.find(".operator.groupBy").data("nodeid");
            datasetNodeId = $dfArea.find(".operator.dataset").data("nodeid");
            mapNodeId = $dfArea.find('.operator.map[data-subtype=""]').data("nodeid");
            castNodeId = $dfArea.find('.operator.map[data-subtype="cast"]').data("nodeid");
            filterNodeId = $dfArea.find('.operator.filter').data("nodeid");
            sqlNodeId = $dfArea.find('.operator.sql').data("nodeid");
            done();
        });
    });

    describe("general tests", function() {
        it("test state should be correct", function() {
            expect($dfArea.find(".operator").length).to.equal(6);
        });

        it("should show", function() {
            $popup = $(".dagSchemaPopup");
            expect($popup.length).to.equal(0);
            dagSchemaPopup = new DagSchemaPopup(groupByNodeId, tabId);
            $popup = $(".dagSchemaPopup");
            expect($popup.length).to.equal(1);
            expect($popup.is(":visible")).to.be.true;
        });

        it("should hide on mousedown", function() {
            expect($popup.is(":visible")).to.be.true;
            $(document).mousedown();
            expect($popup.is(":visible")).to.be.false;
            $popup = $(".dagSchemaPopup");
            expect($popup.length).to.equal(0);
        });

        it("should have correct rows", function() {
            dagSchemaPopup = new DagSchemaPopup(groupByNodeId, tabId);
            $popup = $(".dagSchemaPopup");
            expect($popup.find("li").length).to.equal(3);

            expect($popup.find("li").eq(0).attr("class")).to.equal("changeType-remove");
            expect($popup.find("li").eq(0).text()).to.equal("-moneyclass_id");

            expect($popup.find("li").eq(1).attr("class")).to.equal("changeType-remove hidden");
            expect($popup.find("li").eq(1).text()).to.equal("-stringclasses::class_name");

            expect($popup.find("li").eq(2).attr("class")).to.equal("changeType-add");
            expect($popup.find("li").eq(2).text()).to.equal("+integergbCol");
            dagSchemaPopup.remove();
        });

        it("should show replace", function() {
            dagSchemaPopup = new DagSchemaPopup(castNodeId, tabId);
            $popup = $(".dagSchemaPopup");
            expect($popup.find("li").length).to.equal(3);
            expect($popup.find("li").eq(0).attr("class")).to.equal("changeType-replace changeType-remove");
            expect($popup.find("li").eq(0).text()).to.equal("+integerclasses::class_id");
            expect($popup.find("li").eq(1).attr("class")).to.equal("changeType-replace");
            expect($popup.find("li").eq(1).text()).to.equal("+moneyclass_id");
            expect($popup.find("li").eq(2).attr("class")).to.equal("changeType-hidden hidden");
            expect($popup.find("li").eq(2).text()).to.equal("stringclasses::class_name");
            dagSchemaPopup.remove();
        });

        it("should handle no columns", function() {
            dagSchemaPopup = new DagSchemaPopup(filterNodeId, tabId);
            $popup = $(".dagSchemaPopup");
            expect($popup.find("li").length).to.equal(0);
            expect($popup.find(".content").text()).to.equal("No Changes Detected");
            dagSchemaPopup.remove();
        });
    });

    describe("clicking on li", function() {
        before(function() {
            dagSchemaPopup = new DagSchemaPopup(groupByNodeId, tabId);
            $popup = $(".dagSchemaPopup");
        });
        it("should show 4 highlighted operators", function() {
            expect($dfArea.find(".operator.lineageSelected").length).to.equal(0);
            expect($dfArea.find(".edge").length).to.equal(4);
            expect($dfArea.find(".edge.lineageSelected").length).to.equal(0);
            $popup.find("li").eq(1).trigger(fakeEvent.mouseup);
            expect($dfArea.find(".operator.lineageSelected").length).to.equal(4);
            expect($dfArea.find(".edge.lineageSelected").length).to.equal(3);
        });

        it("should show removed tip", function() {
            expect($dfArea.find(".lineageTip").length).to.equal(3);
            expect($dfArea.find(".lineageTip").eq(0).text()).to.equal("Removed");
            let nodeRect = $dfArea.find(".operator.groupBy")[0].getBoundingClientRect();
            let tipRect = $dfArea.find(".lineageTip")[0].getBoundingClientRect();
            expect(tipRect.left - nodeRect.left).to.be.gt(10);
            expect(tipRect.left - nodeRect.left).to.be.lt(40);
            expect(tipRect.top - nodeRect.top).to.be.gt(-30);
            expect(tipRect.top - nodeRect.top).to.be.lt(-10);
        });
        it("should show created tip", function() {
            expect($dfArea.find(".lineageTip").eq(2).text()).to.equal("Created");
            let nodeRect = $dfArea.find(".operator.dataset")[0].getBoundingClientRect();
            let tipRect = $dfArea.find(".lineageTip")[2].getBoundingClientRect();
            expect(tipRect.left - nodeRect.left).to.be.gt(10);
            expect(tipRect.left - nodeRect.left).to.be.lt(50);
            expect(tipRect.top - nodeRect.top).to.be.gt(-30);
            expect(tipRect.top - nodeRect.top).to.be.lt(-10);
        });

        it("should show renamed tooltip", function() {
            $popup.find("li").eq(0).trigger(fakeEvent.mouseup);
            expect($dfArea.find(".lineageTip").length).to.equal(3);

            expect($dfArea.find(".lineageTip").eq(2).text()).to.equal("Created");
            let nodeRect = $dfArea.find(".operator.dataset")[0].getBoundingClientRect();
            let tipRect = $dfArea.find(".lineageTip")[2].getBoundingClientRect();
            expect(tipRect.left - nodeRect.left).to.be.gt(10);
            expect(tipRect.left - nodeRect.left).to.be.lt(50);
            expect(tipRect.top - nodeRect.top).to.be.gt(-30);
            expect(tipRect.top - nodeRect.top).to.be.lt(-10);

            expect($dfArea.find(".lineageTip").eq(1).text()).to.equal("Renamed");
            nodeRect = $dfArea.find('.operator.map[data-subtype="cast"]')[0].getBoundingClientRect();
            tipRect = $dfArea.find(".lineageTip")[1].getBoundingClientRect();
            expect(tipRect.left - nodeRect.left).to.be.gt(10);
            expect(tipRect.left - nodeRect.left).to.be.lt(40);
            expect(tipRect.top - nodeRect.top).to.be.gt(-30);
            expect(tipRect.top - nodeRect.top).to.be.lt(-10);

            expect($dfArea.find(".lineageTip").eq(0).text()).to.equal("Removed");
            nodeRect = $dfArea.find(".operator.groupBy")[0].getBoundingClientRect();
            tipRect = $dfArea.find(".lineageTip")[0].getBoundingClientRect();
            expect(tipRect.left - nodeRect.left).to.be.gt(10);
            expect(tipRect.left - nodeRect.left).to.be.lt(40);
            expect(tipRect.top - nodeRect.top).to.be.gt(-30);
            expect(tipRect.top - nodeRect.top).to.be.lt(-10);
        });

        it("should show created tooltip on groupBy node", function() {
            $popup.find("li").eq(2).trigger(fakeEvent.mouseup);
            expect($dfArea.find(".lineageTip").length).to.equal(1);

            expect($dfArea.find(".lineageTip").eq(0).text()).to.equal("Created");
            let nodeRect = $dfArea.find('.operator.groupBy')[0].getBoundingClientRect();
            let tipRect = $dfArea.find(".lineageTip")[0].getBoundingClientRect();
            expect(tipRect.left - nodeRect.left).to.be.gt(10);
            expect(tipRect.left - nodeRect.left).to.be.lt(40);
            expect(tipRect.top - nodeRect.top).to.be.gt(-30);
            expect(tipRect.top - nodeRect.top).to.be.lt(-10);
        });

        it("should handle hidden column in current node", function() {
            dagSchemaPopup.remove();
            dagSchemaPopup = new DagSchemaPopup(castNodeId, tabId);
            $popup = $(".dagSchemaPopup");

            $popup.find("li").eq(2).trigger(fakeEvent.mouseup);
            expect($dfArea.find(".lineageTip").length).to.equal(2);

            expect($dfArea.find(".lineageTip").eq(0).text()).to.equal("Hidden");
            expect($dfArea.find(".lineageTip").eq(1).text()).to.equal("Created");
            dagSchemaPopup.remove();
        });

        describe("sql node", function() {
            let sqlNode;
            before(function() {
                sqlNode = DagViewManager.Instance.getActiveDag().getNode(sqlNodeId);
                const xcQueryString = JSON.stringify([
                    {
                        "operation": "XcalarApiSynthesize",
                        "args": {
                            "source": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904757568_0",
                            "dest": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759046_1",
                            "columns": [
                                {
                                    "sourceColumn": "classes::class_name",
                                    "destColumn": "CLASS_NAME",
                                    "columnType": "DfString"
                                },
                                {
                                    "sourceColumn": "classes::class_id",
                                    "destColumn": "CLASS_ID",
                                    "columnType": "DfInt64"
                                }
                            ],
                            "sameSession": true,
                            "numColumns": 2
                        }
                    },
                    {
                        "operation": "XcalarApiFilter",
                        "args": {
                            "source": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759046_1",
                            "dest": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759453_2",
                            "eval": [
                                {
                                    "evalString": "gt(CLASS_ID,2)",
                                    "newField": null
                                }
                            ]
                        }
                    },
                    {
                        "operation": "XcalarApiDeleteObjects",
                        "args": {
                            "namePattern": "table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759046_1",
                            "srcType": "Table"
                        }
                    }
                ]);

                sqlNode.setXcQueryString(xcQueryString);
                sqlNode.setIdentifiers(new Map([[1, "a"]]));
                sqlNode.setTableSrcMap({"table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904757568_0": 1});
                sqlNode.setNewTableName("table_DF2_5C80235E021381C6_1551904753779_0_dag_5C80235E021381C6_1551904753891_36#t_1551904759453_2");
                sqlNode.setParam({
                    "sqlQueryStr": "SELECT * FROM a WHERE class_id > 2",
                    "identifiers": {
                        "1": "a"
                    },
                    "identifiersOrder": [
                        1
                    ],
                    "dropAsYouGo": true
                });
                sqlNode.setColumns([{
                        "colName": "CLASS_NAME",
                        "colId": 3,
                        "colType": "string"
                    },
                    {
                        "colName": "CLASS_ID",
                        "colId": 4,
                        "colType": "int"
                    }]);
                sqlNode.updateSubGraph();
                sqlNode.beConfiguredState();
            });

            it("should have correct rows", function() {
                dagSchemaPopup = new DagSchemaPopup(sqlNodeId, tabId);
                $popup = $(".dagSchemaPopup");

                expect($popup.find("li").length).to.equal(4);
                expect($popup.find("li").eq(0).attr("class")).to.equal("changeType-replace changeType-remove");
                expect($popup.find("li").eq(0).text()).to.equal("+stringclasses::class_name");
                expect($popup.find("li").eq(1).attr("class")).to.equal("changeType-replace");
                expect($popup.find("li").eq(1).text()).to.equal("+stringCLASS_NAME");
                expect($popup.find("li").eq(2).attr("class")).to.equal("changeType-replace changeType-remove");
                expect($popup.find("li").eq(2).text()).to.equal("+integerclasses::class_id");
                expect($popup.find("li").eq(3).attr("class")).to.equal("changeType-replace");
                expect($popup.find("li").eq(3).text()).to.equal("+integerCLASS_ID");

            });

            it("click on sql li should trigger compile", function() {
                let called = false;
                let cacheSubGraphFn = sqlNode.getSubGraph;
                sqlNode.getSubGraph = () => {};
                let cacheCompileFn = sqlNode.compileSQL;
                sqlNode.compileSQL = () => {
                    called = true;
                    return PromiseHelper.resolve();
                }
                $popup.find("li").eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                sqlNode.getSubGraph = cacheSubGraphFn;
                sqlNode.compileSQL = cacheCompileFn;
            });

            it("should show renamedtip", function() {
                expect($dfArea.find(".lineageTip").length).to.equal(2);
                expect($dfArea.find(".lineageTip").eq(0).text()).to.equal("Renamed");
                let nodeRect = $dfArea.find(".operator.sql")[0].getBoundingClientRect();
                let tipRect = $dfArea.find(".lineageTip")[0].getBoundingClientRect();
                expect(tipRect.left - nodeRect.left).to.be.gt(10);
                expect(tipRect.left - nodeRect.left).to.be.lt(50);
                expect(tipRect.top - nodeRect.top).to.be.gt(-30);
                expect(tipRect.top - nodeRect.top).to.be.lt(-10);
            });
            it("should show created tip", function() {
                expect($dfArea.find(".lineageTip").eq(1).text()).to.equal("Created");
                let nodeRect = $dfArea.find(".operator.dataset")[0].getBoundingClientRect();
                let tipRect = $dfArea.find(".lineageTip")[1].getBoundingClientRect();
                expect(tipRect.left - nodeRect.left).to.be.gt(10);
                expect(tipRect.left - nodeRect.left).to.be.lt(50);
                expect(tipRect.top - nodeRect.top).to.be.gt(-30);
                expect(tipRect.top - nodeRect.top).to.be.lt(-10);
            });

            it("click on li again should not trigger compile", function() {
                let called = false;
                let cacheCompileFn = sqlNode.compileSQL;
                sqlNode.compileSQL = () => {
                    called = true;
                    return PromiseHelper.resolve();
                }
                $popup.find("li").eq(1).trigger(fakeEvent.mouseup);
                expect(called).to.be.false;
                sqlNode.compileSQL = cacheCompileFn;
            });

            it("should show renamedtip", function() {
                expect($dfArea.find(".lineageTip").length).to.equal(2);
                expect($dfArea.find(".lineageTip").eq(0).text()).to.equal("Renamed");
                let nodeRect = $dfArea.find(".operator.sql")[0].getBoundingClientRect();
                let tipRect = $dfArea.find(".lineageTip")[0].getBoundingClientRect();
                expect(tipRect.left - nodeRect.left).to.be.gt(10);
                expect(tipRect.left - nodeRect.left).to.be.lt(50);
                expect(tipRect.top - nodeRect.top).to.be.gt(-30);
                expect(tipRect.top - nodeRect.top).to.be.lt(-10);
            });
            it("should show created tip", function() {
                expect($dfArea.find(".lineageTip").eq(1).text()).to.equal("Created");
                let nodeRect = $dfArea.find(".operator.dataset")[0].getBoundingClientRect();
                let tipRect = $dfArea.find(".lineageTip")[1].getBoundingClientRect();
                expect(tipRect.left - nodeRect.left).to.be.gt(10);
                expect(tipRect.left - nodeRect.left).to.be.lt(50);
                expect(tipRect.top - nodeRect.top).to.be.gt(-30);
                expect(tipRect.top - nodeRect.top).to.be.lt(-10);
            });
        });
    });

    after(function(done) {
        dagSchemaPopup.remove();
        let dagTab =  DagTabManager.Instance.getTabById(tabId);

        DagTabManager.Instance.removeTab(tabId);
        dagTab.delete()
        .always(function() {
            done();
        });
    })
});