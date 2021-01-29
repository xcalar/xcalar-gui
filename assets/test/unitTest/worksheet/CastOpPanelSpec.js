describe('CastOpPanel Test', function() {
    var $castOpPanel;
    var $castSection;
    var $table;
    var tabId;
    var nodeId;
    var dsName, tableName, tableId, oldTableName;
    var prefix = "prefix";
    var node;

    before(function(done){
        console.clear();
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            if ($(".dataflowWrapBackground .newTab").is(":visible")) {
                $(".dataflowWrapBackground .newTab").click();
            }
            console.log("Cast panel test");
            node = new DagNodeMap({subType: "cast"});
            const parentNode = new DagNodeFilter({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'average_stars'),
                        type: "integer"
                    }), new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'stringCol'),
                        type: "string"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            };

            xcTooltip.hideAll();
            $castOpPanel = $("#castOpPanel");
            $castSection = $("#castOpPanel .opSection");
            $("#configNodeContainer").parent().addClass("forceShow");
            done();
        });
    });

    describe("Basic Function Test", function() {
        it("Should show the Cast View", function() {
            expect($castOpPanel.is(":visible")).to.be.false;
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect($castOpPanel.is(":visible")).to.be.true;
            expect($castOpPanel.find(".resultSection .lists.newTable").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .inputCol").length).to.equal(0);
            expect($castOpPanel.find(".resultSection .resultCol").length).to.equal(0);

            expect($castSection.find(".candidateSection .inputCol").length).to.equal(2);
            expect($castSection.find(".candidateSection .inputCol").eq(0).text()).to.equal("prefix::average_stars");
            expect($castSection.find(".candidateSection .inputCol").eq(1).text()).to.equal("prefix::stringCol");
        });

        it("Should select column", function() {
            $castSection.find(".candidateSection .inputCol").eq(0).click();
            expect($castSection.find(".candidateSection .inputCol").length).to.equal(1);
            expect($castSection.find(".candidateSection .inputCol").text()).to.equal("prefix::stringCol");

            expect($castOpPanel.find(".resultSection .inputCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .inputCol .colName").text()).to.equal("prefix::average_stars")
            expect($castOpPanel.find(".resultSection .resultCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .resultCol .resultInput").val()).to.equal("average_stars");

            expect($castOpPanel.find(".resultSection .typeList input").val()).to.equal("integer");
            expect($castOpPanel.find(".resultSection .typeList .list li").length).to.equal(6);
            expect($castOpPanel.find(".resultSection .typeList .list li").text()).to.equal("stringintegerfloatbooleantimestampmoney");
        });

        it("Should change column type", function() {
            $castSection.find(".resultSection .typeList .dropdown").click();
            $castSection.find(".resultSection .list li").eq(0).trigger(fakeEvent.mouseup);
            expect($castOpPanel.find(".resultSection .typeList input").val()).to.equal("string");

            $castSection.find(".resultSection .typeList .dropdown").click();
            $castSection.find(".resultSection .list li").eq(5).trigger(fakeEvent.mouseup);
            expect($castOpPanel.find(".resultSection .typeList input").val()).to.equal("money");
        });

        it("should add another column", function() {
            $castSection.find(".candidateSection .inputCol").eq(0).click();
            expect($castSection.find(".candidateSection .inputCol").length).to.equal(0);

            expect($castOpPanel.find(".resultSection .inputCol").length).to.equal(2);
            expect($castOpPanel.find(".resultSection .inputCol .colName").eq(0).text()).to.equal("prefix::average_stars");
            expect($castOpPanel.find(".resultSection .inputCol .colName").eq(1).text()).to.equal("prefix::stringCol");
            expect($castOpPanel.find(".resultSection .resultCol").length).to.equal(2);
            expect($castOpPanel.find(".resultSection .resultCol .resultInput").eq(0).val()).to.equal("average_stars");
            expect($castOpPanel.find(".resultSection .resultCol .resultInput").eq(1).val()).to.equal("stringCol");

            expect($castOpPanel.find(".resultSection .typeList input").eq(0).val()).to.equal("money");
            expect($castOpPanel.find(".resultSection .typeList input").eq(1).val()).to.equal("string");
            expect($castOpPanel.find(".resultSection .typeList .list").eq(1).find("li").length).to.equal(6);
            expect($castOpPanel.find(".resultSection .typeList .list").eq(1).find("li").text()).to.equal("stringintegerfloatbooleantimestampmoney");
        });

        it("should remove column", function() {
            expect($castSection.find(".removeColInRow").length).to.equal(2);
            $castSection.find(".removeColInRow").eq(1).click();
            expect($castSection.find(".removeColInRow").length).to.equal(1);

            expect($castSection.find(".candidateSection .inputCol").length).to.equal(1);
            expect($castSection.find(".candidateSection .inputCol").text()).to.equal("prefix::stringCol");

            expect($castOpPanel.find(".resultSection .inputCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .inputCol .colName").text()).to.equal("prefix::average_stars")
            expect($castOpPanel.find(".resultSection .resultCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .resultCol .resultInput").val()).to.equal("average_stars");

            expect($castOpPanel.find(".resultSection .typeList input").val()).to.equal("money");
            expect($castOpPanel.find(".resultSection .typeList .list li").length).to.equal(6);
            expect($castOpPanel.find(".resultSection .typeList .list li").text()).to.equal("stringintegerfloatbooleantimestampmoney");
        });

        it("Should submit the form and close the view", function(done) {
            expect($castOpPanel.is(":visible")).to.be.true;
            $castOpPanel.find(".submit").click();
            expect($castOpPanel.is(":visible")).to.be.false;
            const input = node.getParam();
            expect(input).to.deep.equal({
                "eval": [
                    {
                        "evalString": "money(prefix::average_stars)",
                        "newField": "average_stars"
                    }
                ],
                "icv": false,
                outputTableName: ""
            });
            setTimeout(function() {
                done();
            }, 1);
        });

        it("should show form with first column filled in", function() {
            expect($castOpPanel.is(":visible")).to.be.false;
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect($castOpPanel.is(":visible")).to.be.true;

            expect($castSection.find(".candidateSection .inputCol").length).to.equal(1);
            expect($castSection.find(".candidateSection .inputCol").text()).to.equal("prefix::stringCol");

            expect($castOpPanel.find(".resultSection .inputCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .inputCol .colName").text()).to.equal("prefix::average_stars")
            expect($castOpPanel.find(".resultSection .resultCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .resultCol .resultInput").val()).to.equal("average_stars");

            expect($castOpPanel.find(".resultSection .typeList input").val()).to.equal("money");
            expect($castOpPanel.find(".resultSection .typeList .list li").length).to.equal(6);
            expect($castOpPanel.find(".resultSection .typeList .list li").text()).to.equal("stringintegerfloatbooleantimestampmoney");
        });

        it("should show error if invalid output name", function() {
            $castOpPanel.find(".resultSection .resultCol .resultInput").val("123abc").trigger("input").trigger("change");
            $castOpPanel.find(".submit").click();
            expect($castOpPanel.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError("Invalid name: a name can only begin with a letter or underscore(_).");
        });

        it("should show error when submitting form if duplicate column exists", function() {
            $castSection.find(".candidateSection .inputCol").eq(0).click();
            $castOpPanel.find(".resultSection .resultCol .resultInput").eq(0).val("abc").trigger("input").trigger("change");
            $castOpPanel.find(".resultSection .resultCol .resultInput").eq(1).val("abc").trigger("input").trigger("change");
            $castOpPanel.find(".submit").click();
            UnitTest.hasStatusBoxWithError("Duplicate column names detected");
        });

        it("Should show error when submitting the form if no columns selected", function() {
            expect($castSection.find(".removeColInRow").length).to.equal(2);
            $castSection.find(".removeColInRow").eq(0).click();
            $castSection.find(".removeColInRow").eq(0).click();
            expect($castSection.find(".removeColInRow").length).to.equal(0);

            expect($castOpPanel.is(":visible")).to.be.true;
            $castOpPanel.find(".submit").click();
            expect($castOpPanel.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError("Please select columns for this operation.");
            CastOpPanel.Instance.close();
        });
    });

    describe("advanced mode", function() {
        before(function(done) {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            setTimeout(function() {
                done();
            }, 100);
        });

        it("should switch modes", function() {
            expect($castOpPanel.find(".advancedEditor").is(":visible")).to.be.false;
            $castOpPanel.find(".switch").click();
            expect($castOpPanel.find(".advancedEditor").is(":visible")).to.be.true;
            expect(JSON.parse(CastOpPanel.Instance._editor.getValue())).to.deep.equal({
                "eval": [
                    {
                        "evalString": "money(prefix::average_stars)",
                        "newField": "average_stars"
                    }
                ],
                "icv": false,
                outputTableName: ""
            });

            CastOpPanel.Instance._editor.setValue(JSON.stringify({
                "eval": [
                    {
                        "evalString": "string(prefix::average_stars)",
                        "newField": "abc"
                    }
                ],
                "icv": false,
                outputTableName: ""
            }));
            $castOpPanel.find(".switch").click();
            expect($castSection.find(".candidateSection .inputCol").length).to.equal(1);
            expect($castSection.find(".candidateSection .inputCol").text()).to.equal("prefix::stringCol");

            expect($castOpPanel.find(".resultSection .inputCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .inputCol .colName").text()).to.equal("prefix::average_stars")
            expect($castOpPanel.find(".resultSection .resultCol").length).to.equal(1);
            expect($castOpPanel.find(".resultSection .resultCol .resultInput").val()).to.equal("abc");

            expect($castOpPanel.find(".resultSection .typeList input").val()).to.equal("string");
            expect($castOpPanel.find(".resultSection .typeList .list li").length).to.equal(6);
            expect($castOpPanel.find(".resultSection .typeList .list li").text()).to.equal("stringintegerfloatbooleantimestampmoney");
        });

        it("should submit from advanced mode", function() {
            $castOpPanel.find(".switch").click();
            expect(JSON.parse(CastOpPanel.Instance._editor.getValue())).to.deep.equal({
                "eval": [
                    {
                        "evalString": "string(prefix::average_stars)",
                        "newField": "abc"
                    }
                ],
                "icv": false,
                outputTableName: ""
            });
            CastOpPanel.Instance._submit();
            expect($castOpPanel.is(":visible")).to.be.false;
            const input = node.getParam();
            expect(input).to.deep.equal({
                "eval": [
                    {
                        "evalString": "string(prefix::average_stars)",
                        "newField": "abc"
                    }
                ],
                "icv": false,
                outputTableName: ""
            });
        });

        it("should detect invalid type", function() {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            CastOpPanel.Instance._editor.setValue(JSON.stringify({
                "eval": [
                    {
                        "evalString": "stringyyy(prefix::average_stars)",
                        "newField": "abc"
                    }
                ],
                "icv": false
            }));
            CastOpPanel.Instance._submit();
            expect($castOpPanel.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError("Invalid type: stringyyy");
        });

        it("should detect missing column", function() {
            CastOpPanel.Instance._editor.setValue(JSON.stringify({
                "eval": [
                    {
                        "evalString": "string()",
                        "newField": "abc"
                    }
                ],
                "icv": false
            }));
            CastOpPanel.Instance._submit();
            expect($castOpPanel.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError("Field name not provided: string()");
        });

        it("should detect missing new field", function() {
            CastOpPanel.Instance._editor.setValue(JSON.stringify({
                "eval": [
                    {
                        "evalString": "string(prefix::average_stars)",
                        "newField": ""
                    }
                ],
                "icv": false
            }));
            CastOpPanel.Instance._submit();
            expect($castOpPanel.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError("eval[0].newField should NOT be shorter than 1 characters");

            CastOpPanel.Instance._editor.setValue(JSON.stringify({
                "eval": [
                    {
                        "evalString": "string(prefix::average_stars)",
                        "newField": "a"
                    }
                ],
                "icv": false
            }));
            $castOpPanel.find(".switch").click();
            CastOpPanel.Instance.close();
        });
    });

    after(function() {
        CastOpPanel.Instance.close();
    });
});