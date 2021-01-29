describe('Sort Op Panel Test', function() {
    var $sortOpPanel;
    var $sortTable;
    var $table;
    var tabId;
    var nodeId;
    var dsName, tableName, tableId, oldTableName;
    var prefix = "prefix";
    var node;

    before(function(done){
        console.clear();
        console.log("Sort panel test");

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            node = new DagNodeSort({});
            const parentNode = new DagNodeMap({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'average_stars'),
                        type: "number"
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
            $sortOpPanel = $("#sortOpPanel");
            $sortTable = $("#sortOpPanel .opSection");
            done();
        });
    });

    describe("Basic Function Test", function() {
        it("Should show the Sort View", function(done) {
            expect($sortOpPanel.is(":visible")).to.be.false;
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect($sortOpPanel.is(":visible")).to.be.true;
            expect($sortTable.find(".flexrow").length).to.equal(1);
            expect($sortTable.find(".selInput").length).to.equal(1);
            expect($sortTable.find(".selInput").val()).to.equal("");
            expect($sortTable.find(".dropDownList .text").val()).to.equal("Ascending");
            setTimeout(function() {
                // need to wait for event listeners to set up
                done();
            }, 1);
        });

        it("Should select column", function(done) {
            $sortTable.find(".colNameMenuIcon").click();
            expect($sortTable.find(".list.hint").is(":visible")).to.be.true;
            expect($sortTable.find(".list.hint li").length).to.equal(2);
            $sortTable.find(".list.hint li").eq(0).trigger(fakeEvent.mouseup);
            expect($sortTable.find(".selInput").val()).to.equal("$prefix::average_stars");
            setTimeout(function() {
                // need to wait for li click to execute callback
                done();
            }, 1);
        });

        it("Should change column order", function(done) {
            $sortTable.find(".flexCol-right .iconWrapper").click();
            $sortTable.find(".flexCol-right .list li").eq(1).trigger(fakeEvent.mouseup);
            expect($sortTable.find(".dropDownList .text").val()).to.equal("Descending");
            setTimeout(function() {
                // need to wait for li click to execute callback
                done();
            }, 1);
        });

        it("should add another column", function() {
            expect($sortTable.find(".hasRemoveBtn").length).to.equal(0);
            expect($sortTable.find(".flexrow").length).to.equal(1);
            $sortTable.find(".addArg").click();
            expect($sortTable.find(".flexrow").length).to.equal(2);
            expect($sortTable.find(".hasRemoveBtn").length).to.equal(2);
        });

        it("should remove column", function() {
            expect($sortTable.find(".flexrow").length).to.equal(2);
            $sortTable.find(".removeItemIcon").eq(1).click();
            expect($sortTable.find(".flexrow").length).to.equal(1);
        });

        it("Should submit the form and close the view", function(done) {
            expect($sortOpPanel.is(":visible")).to.be.true;
            SortOpPanel.Instance._submitForm();
            expect($sortOpPanel.is(":visible")).to.be.false;
            const input = node.getParam();
            expect(input).to.deep.equal({
                "columns": [
                    {
                        "columnName": "prefix::average_stars",
                        "ordering": "Descending"
                    }
                ],
                "newKeys": [],
                outputTableName: ""
            });
            setTimeout(function() {
                done();
            }, 1);
        });

        it("should show form with first column filled in", function(done) {
            expect($sortOpPanel.is(":visible")).to.be.false;
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            expect($sortOpPanel.is(":visible")).to.be.true;
            expect($sortTable.find(".flexrow").length).to.equal(1);
            expect($sortTable.find(".selInput").length).to.equal(1);
            expect($sortTable.find(".selInput").val()).to.equal("$prefix::average_stars");
            expect($sortTable.find(".dropDownList .text").val()).to.equal("Descending");
            setTimeout(function() {
                // need to wait for event listeners to set up
                done();
            }, 1);
        });

        it("add another column", function(done) {
            expect($sortTable.find(".flexrow").length).to.equal(1);
            $sortTable.find(".addArg").click();
            expect($sortTable.find(".flexrow").length).to.equal(2);
            setTimeout(function() {
                // need to wait for li click to execute callback
                done();
            }, 1);
        });

        it("should add another duplicate column", function(done) {
            $sortTable.find(".colNameMenuIcon").eq(1).click();
            $sortTable.find(".list.hint:visible li").eq(0).trigger(fakeEvent.mouseup);
            expect($sortTable.find(".selInput").eq(1).val()).to.equal("$prefix::average_stars");
            setTimeout(function() {
                // need to wait for li click to execute callback
                done();
            }, 1);
        });

        it("Should show error when submitting the form if duplicate column exists", function() {
            expect($sortOpPanel.is(":visible")).to.be.true;
            SortOpPanel.Instance._submitForm();
            expect($sortOpPanel.is(":visible")).to.be.true;
            UnitTest.hasStatusBoxWithError("Duplicate column names are not allowed: prefix::average_stars");
            SortOpPanel.Instance.close();
        });
    });

    describe('column pickers should work', function() {
        var $table;
        var wasHidden;
        before(function(done) {
            $table = $('<div class="xcTable">' +
                            '<div class="header">' +
                                '<div class="topHeader"><div class="prefix">' + prefix +
                                '</div></div>' +
                                '<input class="editableHead" value="average_stars">' +
                            '</div>' +
                        '</div>');
            $("#sqlTableArea").append($table);
            if ($("#sqlTableArea").hasClass("xc-hidden")) {
                $("#sqlTableArea").removeClass("xc-hidden");
                wasHidden = true;
            }

            node = new DagNodeSort({});
            const parentNode = new DagNodeMap({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'average_stars'),
                        type: "number"
                    }), new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'stringCol'),
                        type: "string"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            };

            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});

            setTimeout(function() {
                done();
            }, 100);
        });

        it ('input should fill from column header', function(done) {
            window.focus();
            $sortTable.find(".selInput").focus().trigger('focus').val(""); // focus & trigger to make sure
            expect($sortTable.find(".selInput").val()).to.equal("");

            setTimeout(function() {
                var $header = $table.find('.header');
                expect($header.find('input').val()).to.equal('average_stars');
                $header.click();

                setTimeout(function() {
                    var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                    if ($sortTable.find(".selInput").val() === "") {
                        // focus doesn't work if console is open
                        done();
                        return;
                    }
                    expect($sortTable.find(".selInput").val()).to.equal(gColPrefix + prefixCol);
                    done();
                }, 100);
            }, 100);
        });

        it("column picker should not work when sortOpPanel closes", function(done) {
            // close operations view
            $("#sortOpPanel .close").click();
            expect($sortOpPanel.hasClass('xc-hidden')).to.equal(true);
            $sortTable.find(".selInput").focus().trigger('focus').val(""); // focus & trigger to make sure
            expect($sortTable.find(".selInput").val()).to.equal("");

            setTimeout(function() {
                var $header = $table.find('.header');
                expect($header.find('input').val()).to.equal('average_stars');
                $header.click();

                setTimeout(function() {
                    expect($sortTable.find(".selInput").val()).to.equal("");
                    done();
                }, 1);
            }, 1);
        });

        after(function() {
            $table.remove();
            SortOpPanel.Instance.close();
            if (wasHidden) {
                $("#sqlTableArea").addClass("xc-hidden");
            }
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
            expect($sortOpPanel.find(".advancedEditor").is(":visible")).to.be.false;
            $sortOpPanel.find(".switch").click();
            expect($sortOpPanel.find(".advancedEditor").is(":visible")).to.be.true;
            expect(JSON.parse(SortOpPanel.Instance._editor.getValue())).to.deep.equal({
                "columns": [
                    {
                        "columnName": "",
                        "ordering": "Ascending"
                    }
                ],
                "newKeys": [],
                outputTableName: ""
            });
            SortOpPanel.Instance._editor.setValue(JSON.stringify({
                "columns": [
                    {
                        "columnName": "prefix::average_stars",
                        "ordering": "Descending"
                    }
                ],
                "newKeys": ["test"],
                outputTableName: ""
            }));
            $sortOpPanel.find(".switch").click();
            expect($sortTable.find(".flexrow").length).to.equal(1);
            expect($sortTable.find(".selInput").length).to.equal(1);
            expect($sortTable.find(".selInput").val()).to.equal("$prefix::average_stars");
            expect($sortTable.find(".dropDownList .text").val()).to.equal("Descending");
        });

        it("should submit from advanced mode", function() {
            $sortOpPanel.find(".switch").click();
            expect(JSON.parse(SortOpPanel.Instance._editor.getValue())).to.deep.equal({
                "columns": [
                    {
                        "columnName": "prefix::average_stars",
                        "ordering": "Descending"
                    }
                ],
                "newKeys": ["test"],
                outputTableName: ""
            });
            SortOpPanel.Instance._submitForm();
            expect($sortOpPanel.is(":visible")).to.be.false;
            const input = node.getParam();
            expect(input).to.deep.equal({
                "columns": [
                    {
                        "columnName": "prefix::average_stars",
                        "ordering": "Descending"
                    }
                ],
                "newKeys": ["test"],
                outputTableName: ""
            });
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), {});
            $sortOpPanel.find(".switch").click();
            SortOpPanel.Instance.close();
        });
    });
});