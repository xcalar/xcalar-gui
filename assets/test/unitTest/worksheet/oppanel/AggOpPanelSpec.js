describe("AggOpPanel Test", function() {
    var aggOpPanel;
    var $aggOpPanel;
    var node;
    var editor;
    var $functionsInput;
    var $functionsList;
    var $argSection;
    var prefix = "prefix";
    var openOptions;

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            node = new DagNodeAggregate({});
            const parentNode = new DagNodeAggregate({});
            parentNode.getLineage = function() {
                return {getColumns: function() {
                    return [new ProgCol({
                        backName: xcHelper.getPrefixColName(prefix, 'average_stars'),
                        type: "number"
                    })]
                }}
            };
            node.getParents = function() {
                return [parentNode];
            }
            openOptions = {udfDisplayPathPrefix: UDFFileManager.Instance.getCurrWorkbookDisplayPath()};

            oldJSONParse = JSON.parse;
            aggOpPanel = AggOpPanel.Instance;
            editor = aggOpPanel.getEditor();
            $aggOpPanel = $('#aggOpPanel');
            $functionsInput = $aggOpPanel.find('.functionsInput');
            $functionsList = $functionsInput.siblings('.list');
            $argSection = $aggOpPanel.find('.argsSection').eq(0);
            done()
        });
    });

    describe("Basic Aggregate Panel UI Tests", function() {

        it ("Should be hidden at start", function () {
            aggOpPanel.close();
            expect($('#aggOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            expect($('#aggOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            aggOpPanel.close();
            expect($('#aggOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            $('#aggOpPanel .close').click();
            expect($('#aggOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Aggregate Panel Tests", function() {

        before(function () {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), $.extend({}, openOptions, {autofillColumnNames: [prefixCol]}));
            $functionsInput = $aggOpPanel.find('.functionsInput');
            $functionsList = $functionsInput.siblings('.list');
            $argSection = $aggOpPanel.find('.argsSection').eq(0);
        });

        it('clicking on functions input should work', function() {
            expect($functionsInput.length).to.equal(1);
            expect($functionsInput.is(":visible")).to.true;
            expect($functionsList.length).to.equal(1);
            expect($functionsList.is(":visible")).to.be.false;

             // dropdown requires mousedown and click
            $functionsInput.mousedown();
            $functionsInput.click();

            expect($functionsList.is(":visible")).to.be.true;
            var numLis = $functionsList.find('li:visible').length;
            expect(numLis).to.be.gt(10);

            $functionsInput.click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('clicking on functions input iconWrapper produce full list', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);

            $functionsInput.val('is').trigger(fakeEvent.input);
            expect($functionsList.find("li:visible").length).to.be.lt(numLis);

            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.find('li:visible').length).to.equal(numLis);
        });

        it('functions list li highlighting should work', function() {
            $functionsInput.siblings('.iconWrapper').click();
            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find("li.highlighted").length).to.equal(0);
            expect($functionsList.hasClass("hovering")).to.be.false;

            $functionsList.find("li").eq(0).trigger('mouseenter');
            expect($functionsList.find("li.highlighted").length).to.equal(1);
            expect($functionsList.find("li").eq(0).hasClass("highlighted")).to.be.true;
            expect($functionsList.hasClass("hovering")).to.be.true;

            $functionsList.find("li").eq(0).trigger('mouseleave');
            expect($functionsList.find("li.highlighted").length).to.equal(0);
            expect($functionsList.hasClass("hovering")).to.be.false;

            $functionsList.addClass("disableMouseEnter");
            $functionsList.find("li").eq(0).trigger("mouseenter");
            expect($functionsList.hasClass("disableMouseEnter")).to.be.false;
            expect($functionsList.find("li.highlighted").length).to.equal(0);
            expect($functionsList.hasClass("hovering")).to.be.false;

            $functionsList.addClass("disableMouseEnter");
            $functionsList.find("li").eq(0).addClass("highlighted");
            $functionsList.find("li").eq(0).trigger("mouseleave");
            expect($functionsList.find("li.highlighted").length).to.equal(1);
            expect($functionsList.find("li").eq(0).hasClass("highlighted")).to.be.true;

            $functionsList.removeClass("disableMouseEnter");
            $functionsList.find("li").removeClass("highlighted");
        });

        it('keydown enter and tab should update argument section', function() {
            $functionsInput.val('').trigger(fakeEvent.enterKeydown);
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;

            $functionsInput.val('avg').trigger(fakeEvent.enterKeydown);
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);


            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Tab});
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;

            $functionsInput.val('avg').trigger({type: "keydown", which: keyCode.Tab});
            expect($argSection.hasClass('inactive')).to.be.false;

            prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;
        });

        it("keydown escape should close dropdowns", function() {
            $aggOpPanel.find(".list").show();
            expect($aggOpPanel.find(".list:visible").length).to.be.gt(1);
            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Escape});
            expect($aggOpPanel.find(".list:visible").length).to.equal(0);
        });

        it('$.change on input should update argument section', function() {
            StatusBox.forceHide();

            $functionsInput.val('').change();
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;
            expect($('#statusBox:visible').length).to.equal(0);

            $functionsInput.val('avg').change();
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $functionsInput.trigger(fakeEvent.mousedown);
            $functionsInput.val('invalidFunction').change();
            expect($('#statusBox:visible').length).to.equal(0);

            // trigger change via submit button to see if status box error shows
            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $aggOpPanel.find('.submit').trigger(fakeEvent.mousedown);
            $functionsInput.val('test').change();
            expect($('#statusBox:visible').length).to.equal(1);
            StatusBox.forceHide();
        });

        it('functions list should scroll with key events', function() {
            var numLis = $functionsList.find('li').length;
            $functionsInput.val("");
            $functionsInput.siblings('.iconWrapper').mousedown();
            $functionsInput.siblings('.iconWrapper').click();

            expect($functionsList.is(":visible")).to.be.true;
            expect($functionsList.find('li:visible').length).to.equal(numLis);
            expect(numLis).to.be.gt(10);
            expect($functionsList.find('li.highlighted').length).to.equal(0);

            $('body').trigger({type: "keydown", which: keyCode.Down});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').eq(0).hasClass('highlighted')).to.be.true;

            $('body').trigger({type: "keydown", which: keyCode.Up});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').last().hasClass('highlighted')).to.be.true;

            $('body').trigger({type: "keydown", which: keyCode.Down});
            $('body').trigger({type: "keydown", which: keyCode.Down});
            expect($functionsList.find('li.highlighted').length).to.equal(1);
            expect($functionsList.find('li').eq(1).hasClass('highlighted')).to.be.true;
            expect($functionsInput.val()).to.equal("avgNumeric");

            $functionsInput.val("");
            $aggOpPanel.mousedown();
            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Escape});
            // close dropdown
        });

        it("dblclick should select full text", function() {
            $functionsInput.val("$something");
            expect($functionsInput.range().length).to.equal(0);
            $functionsInput.trigger("dblclick");
            expect($functionsInput.range().length).to.equal(10);
        });


        describe("validate", function() {
            var oldValidateGroups;
            before(function() {
               oldValidateGroups = AggOpPanel.Instance.model.validateGroups;

            });

            it("validate with function error should work", function() {
                AggOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 0,
                        type: "function"
                    }
                };
                AggOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("This operation is not supported.");
            });

            it("validate with blank error should work", function() {
                $functionsInput.val('avg').trigger(fakeEvent.enterKeydown);
                AggOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "blank"
                    }
                };
                AggOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("Please fill out this field.");
            });

            it("validate with columnType error should work", function() {
                AggOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "columnType",
                        error: "custom error"
                    }
                };
                AggOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with other error should work", function() {
                AggOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "other",
                        error: "custom error"
                    }
                };
                AggOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with type error should work", function() {
                AggOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "valueType",
                        error: "custom error"
                    }
                };
                AggOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with missingFields error should work", function() {
                AggOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "missingFields",
                        error: "custom error2"
                    }
                };
                AggOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error2");
            });

            after(function() {
                AggOpPanel.Instance.model.validateGroups = oldValidateGroups;
            })
        });
    });

    describe("Advanced Mode related Aggregate Panel Tests", function() {
        it("Should show statusbox error if columns isnt a field", function() {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            $("#aggOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify({}, null, 4));
            $("#aggOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            aggOpPanel.close();
        });
    });

    describe("Final output", function() {
        it ("final node should have correct input", function() {
            DagConfigNodeModal.Instance.show(node, "", $(".operator"), openOptions);
            $("#aggOpPanel .bottomSection .xc-switch").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"evalString":"","dest":""}');
            let aggName = "^a" + Date.now();
            $functionsInput.val('count').trigger(fakeEvent.enterKeydown);
            $argSection.find('.arg').eq(0).val("$col").trigger("change");
            $argSection.find('.arg').eq(1).val(aggName).trigger("change");
            $aggOpPanel.find(".submit").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"evalString":"count(col)","dest":"' + aggName + '"}');
        });
    });

    after(function() {
        aggOpPanel.close();
    });
});
