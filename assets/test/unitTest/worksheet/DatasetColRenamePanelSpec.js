describe("DatasetColRenamePanel Test", function() {
    var datasetOpPanel;
    var node;
    var oldListDS;
    var oldJSONParse;
    var oldGetDS;
    let oldPut;
    let cachedUserPref;
    let graph;
    let $renameSection;

    before(function() {
        console.log("DatasetColRenamePanel Test");
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        cachedUserPref = UserSettings.Instance.getPref;
        UserSettings.Instance.getPref = function(val) {
            if (val === "dfAutoExecute" || val === "dfAutoPreview") {
                return false;
            } else {
                return cachedUserPref(val);
            }
        };
        node = new DagNodeDataset({
            "type": "dataset",
            "input": {
                "source": "fakeuser.19434.classes",
                "prefix": "classes",
                "synthesize": false,
                "loadArgs": "{\n    \"operation\": \"XcalarApiBulkLoad\",\n    \"comment\": \"\",\n    \"tag\": \"\",\n    \"state\": \"Unknown state\",\n    \"args\": {\n        \"dest\": \"fakeuser.19434.classes\",\n        \"loadArgs\": {\n            \"sourceArgsList\": [\n                {\n                    \"targetName\": \"Default Shared Root\",\n                    \"path\": \"/netstore/datasets/indexJoin/classes/classes.json\",\n                    \"fileNamePattern\": \"\",\n                    \"recursive\": false\n                }\n            ],\n            \"parseArgs\": {\n                \"parserFnName\": \"default:parseJson\",\n                \"parserArgJson\": \"{}\",\n                \"fileNameFieldName\": \"\",\n                \"recordNumFieldName\": \"\",\n                \"allowFileErrors\": false,\n                \"allowRecordErrors\": false,\n                \"schema\": []\n            },\n            \"size\": 10737418240\n        }\n    }\n}"
            },
            "id": "dag_5C9BA7740E4668D3_1553722314230_36",
            "state": "Configured",
            "configured": true,
            "aggregates": [],
            "stats": {},
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
            "parents": []
        });
        graph = new DagGraph();
        graph.addNode(node);
        // Add a dummy child for rename panel to show up
        node.connectToChild(new DagNodeAggregate({}));
        oldListDS = DS.listDatasets;
        DS.listDatasets = function() {
            return [
                {
                    path: "ds1",
                    id: "support@ds1",
                    suffix: "",
                    options: {inActivated: false}
                },
                {
                    path: "/folder/ds2",
                    id: "support@ds2",
                    suffix: "",
                    options: {inActivated: false}
                }
            ]
        }
        datasetOpPanel = DatasetOpPanel.Instance;
        oldJSONParse = JSON.parse;
        oldGetDS = DS.getDSObj;
        DS.getDSObj = function(str) {
            if (str == "support@ds1") {
                return { val: "true"};
            }
        };

        $renameSection = $("#datasetOpColumnAssignment");
    });

    describe("Standard Rename Panel Tests", function() {
        it("Should display rename panel", function() {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect($("#datasetOpColumnAssignment").is(":visible")).to.be.false;
            let struct = JSON.parse(datasetOpPanel._editor.getValue());
            struct.schema = [
                {
                    "name": "class_name_after",
                    "type": "string"
                },
                {
                    "name": "class_id",
                    "type": "integer"
                }
            ];

            datasetOpPanel._editor.setValue(JSON.stringify(struct, null, 4));
            $('#datasetOpPanel .bottomSection .submit').click();
            expect($renameSection.is(":visible")).to.be.true;
        });

        it('rename panel should have correct items', function () {
            expect($renameSection.find(".resultSection .lists.newTable").length).to.equal(1);
            expect($renameSection.find(".resultSection .inputCol").length).to.equal(2);
            expect($renameSection.find(".resultSection .resultCol").length).to.equal(2);

            expect($renameSection.find(".resultSection .inputCol .colName").eq(0).text()).to.equal("");
            expect($renameSection.find(".resultSection .inputCol .colName").eq(1).text()).to.equal("");
            expect($renameSection.find(".resultSection .resultCol").length).to.equal(2);
            expect($renameSection.find(".resultSection .resultCol .resultInput").eq(0).val()).to.equal("classes::class_name_after");
            expect($renameSection.find(".resultSection .resultCol .resultInput").eq(1).val()).to.equal("classes::class_id");

            expect($renameSection.find(".candidateSection .inputCol").length).to.equal(2);
            expect($renameSection.find(".candidateSection .inputCol").eq(0).text()).to.equal("classes::class_name");
            expect($renameSection.find(".candidateSection .inputCol").eq(1).text()).to.equal("classes::class_id");
        });

        it("Should select column name", function() {
            $renameSection.find(".resultSection .inputCol").eq(0).find(".down").eq(0).click();
            expect($renameSection.find(".resultSection .inputCol").eq(0).find("li").length).to.equal(5);
            expect($renameSection.find(".resultSection .inputCol").eq(0).find("li").text()).to.equal("No MatchEmpty Listclasses::class_nameclasses::class_id");
            $renameSection.find(".resultSection .list li").eq(3).trigger(fakeEvent.mouseup);
            expect($renameSection.find(".resultSection .inputCol").text()).to.equal("classes::class_name");

            expect($renameSection.find(".candidateSection .inputCol").length).to.equal(1);
            expect($renameSection.find(".candidateSection .inputCol").eq(0).text()).to.equal("classes::class_id");
        });

        it("Should submit valid arguments", function() {
            let called = false;
            let cachedFn = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = () => {
                return graph;
            }
            graph.applyColumnMapping = (nodeId, renameMap) => {
                expect(nodeId).to.equal(node.getId());
                expect(renameMap).to.deep.equal({
                    "columns": {
                        "classes::class_name": "classes::class_name_after"
                    },
                    "prefixes": {
                        "classes": "classes"
                    }
                });
                called = true;
            };
            $renameSection.find(".confirmRename").click();
            expect(called).to.be.true;
            DagViewManager.Instance.getActiveDag = cachedFn;
            expect($renameSection.is(":visible")).to.be.false;
        });
    });

    describe("test no columns", function() {
        it("Should display rename panel", function() {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect($("#datasetOpColumnAssignment").is(":visible")).to.be.false;
            let struct = JSON.parse(datasetOpPanel._editor.getValue());
            struct.schema = [
                {
                    "name": "class_name",
                    "type": "string"
                },
                {
                    "name": "class_id",
                    "type": "integer"
                }
            ];

            datasetOpPanel._editor.setValue(JSON.stringify(struct, null, 4));
            let count = 0;
            let lineageCache = node.getLineage;
            node.getLineage = () => {
                count++;
                if (count === 1) {
                    return lineageCache.bind(node)();
                }
                return {
                    getColumns: () => [],
                    reset: () => {}
                }
            };
            $('#datasetOpPanel .bottomSection .submit').click();
            expect($renameSection.is(":visible")).to.be.true;
        });

        it("should have no columns", function() {
            expect($renameSection.find(".resultSection .lists.newTable").length).to.equal(1);
            expect($renameSection.find(".resultSection .inputCol").length).to.equal(1);
            expect($renameSection.find(".resultSection .resultCol").length).to.equal(1);

            expect($renameSection.find(".resultSection .inputCol").text()).to.equal("");
            expect($renameSection.find(".resultSection .resultCol .resultInput").eq(0).val()).to.equal("");

            expect($renameSection.find(".candidateSection .inputCol").length).to.equal(2);
            expect($renameSection.find(".candidateSection .inputCol").eq(0).text()).to.equal("classes::class_name_after");
            expect($renameSection.find(".candidateSection .inputCol").eq(1).text()).to.equal("classes::class_id");
        });

        it("should click to add column", function() {
            $renameSection.find(".candidateSection .inputCol").click();
            expect($renameSection.find(".resultSection .lists.newTable").length).to.equal(1);
            expect($renameSection.find(".resultSection .inputCol").length).to.equal(2);
            expect($renameSection.find(".resultSection .resultCol").length).to.equal(2);

            expect($renameSection.find(".resultSection .inputCol").eq(0).text()).to.equal("");
            expect($renameSection.find(".resultSection .inputCol").eq(1).text()).to.equal("classes::class_name_after");
            expect($renameSection.find(".resultSection .resultCol .resultInput").eq(0).val()).to.equal("");
            expect($renameSection.find(".resultSection .resultCol .resultInput").eq(1).val()).to.equal("class_name_after");
            expect($renameSection.find(".resultSection .resultCol .typeList input").eq(1).val()).to.equal("string");

            expect($renameSection.find(".candidateSection .inputCol").length).to.equal(1);
            expect($renameSection.find(".candidateSection .inputCol").eq(0).text()).to.equal("classes::class_id");
        });

        it("should handle blank field", function() {
            $renameSection.find(".confirmRename").click();
            expect($renameSection.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError("Please fill out this field.");
        });

        it("should remove blank field", function() {
            expect($renameSection.find(".resultSection .inputCol").length).to.equal(2);
            expect($renameSection.find(".resultSection .resultCol").length).to.equal(2);
            $renameSection.find(".removeColInRow").eq(0).click();

             expect($renameSection.find(".resultSection .inputCol").length).to.equal(1);
            expect($renameSection.find(".resultSection .resultCol").length).to.equal(1);

            expect($renameSection.find(".resultSection .inputCol").eq(0).text()).to.equal("classes::class_name_after");
            expect($renameSection.find(".resultSection .resultCol .resultInput").eq(0).val()).to.equal("class_name_after");
            expect($renameSection.find(".resultSection .resultCol .typeList input").eq(0).val()).to.equal("string");

            expect($renameSection.find(".candidateSection .inputCol").length).to.equal(1);
            expect($renameSection.find(".candidateSection .inputCol").eq(0).text()).to.equal("classes::class_id");
        });

        it("should handle invalid name", function() {
            $renameSection.find(".resultSection .resultCol .resultInput").eq(0).val("sdf::abc").trigger("input").change();
            $renameSection.find(".confirmRename").click();
            expect($renameSection.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError(ColTStr.ColNameInvalidChar);

        });

        it("should handle submit", function() {
            $renameSection.find(".resultSection .resultCol .resultInput").eq(0).val("abc").trigger("input").change();
            $renameSection.find(".confirmRename").click();
            expect($renameSection.is(":visible")).to.be.false;
        });
    });

    after(function() {
        DS.listDatasets = oldListDS;
        JSON.parse = oldJSONParse;
        DS.getDSObj = oldGetDS;
        UserSettings.Instance.getPref = cachedUserPref;
        XcalarKeyPut = oldPut;
        datasetOpPanel.close();
    });
});