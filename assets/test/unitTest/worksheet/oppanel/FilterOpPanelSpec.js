describe("FilterOpPanel Test", function() {
    var filterOpPanel;
    var $filterOpPanel;
    var node;
    var editor;
    var $functionsInput;
    var $functionsList;
    var $argSection;
    var prefix = "prefix";
    var openOptions = {};

    before(function(done) {
        node = new DagNodeFilter({});
        const parentNode = new DagNodeFilter({});
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
        filterOpPanel = FilterOpPanel.Instance;
        editor = filterOpPanel.getEditor();
        $filterOpPanel = $('#filterOpPanel');
        $functionsInput = $filterOpPanel.find('.functionsInput');
        $functionsList = $functionsInput.siblings('.list');
        $argSection = $filterOpPanel.find('.argsSection').eq(0);

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    describe("Basic Filter Panel UI Tests", function() {

        it ("Should be hidden at start", function () {
            filterOpPanel.close();
            expect($('#filterOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {

            filterOpPanel.show(node, openOptions);
            expect($('#filterOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            filterOpPanel.show(node, openOptions);
            filterOpPanel.close();
            expect($('#filterOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            filterOpPanel.show(node, openOptions);
            $('#filterOpPanel .close').click();
            expect($('#filterOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Filter Panel Tests", function() {

        before(function () {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            DagConfigNodeModal.Instance.show(node, null, $(), $.extend({}, openOptions, {autofillColumnNames: [prefixCol]}));
            $functionsInput = $filterOpPanel.find('.functionsInput');
            $functionsList = $functionsInput.siblings('.list');
            $argSection = $filterOpPanel.find('.argsSection').eq(0);
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

            $functionsInput.val('and').trigger(fakeEvent.enterKeydown);
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Tab});
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;

            $functionsInput.val('and').trigger({type: "keydown", which: keyCode.Tab});
            expect($argSection.hasClass('inactive')).to.be.false;

            prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;
        });

        it("keydown escape should close dropdowns", function() {
            $filterOpPanel.find(".list").show();
            expect($filterOpPanel.find(".list:visible").length).to.be.gt(1);
            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Escape});
            expect($filterOpPanel.find(".list:visible").length).to.equal(0);
        });

        it('$.change on input should update argument section', function() {
            StatusBox.forceHide();

            $functionsInput.val('').change();
            expect($argSection.length).to.equal(1);
            expect($argSection.hasClass('inactive')).to.be.true;
            expect($('#statusBox:visible').length).to.equal(0);

            $functionsInput.val('and').change();
            expect($argSection.hasClass('inactive')).to.be.false;
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            expect($argSection.find('.arg').eq(0).val()).to.equal(gColPrefix + prefixCol);
            expect($argSection.find('.arg').eq(1).val()).to.equal("");
            expect($argSection.find('.arg').eq(1).is(document.activeElement)).to.be.true;

            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $functionsInput.trigger(fakeEvent.mousedown);
            $functionsInput.val('invalidFunction').change();
            expect($('#statusBox:visible').length).to.equal(0);

            // trigger change via submit button to see if status box error shows
            StatusBox.forceHide();
            expect($('#statusBox:visible').length).to.equal(0);
            $filterOpPanel.find('.submit').trigger(fakeEvent.mousedown);
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
            expect($functionsInput.val()).to.equal("between");

            $functionsInput.val("");
            $filterOpPanel.mousedown();
            $functionsInput.val('').trigger({type: "keydown", which: keyCode.Escape});
            // close dropdown
        });

        it("dblclick should select full text", function() {
            $functionsInput.val("$something");
            expect($functionsInput.range().length).to.equal(0);
            $functionsInput.trigger("dblclick");
            expect($functionsInput.range().length).to.equal(10);
        });

        var addGroup = function() {$filterOpPanel.find(".addExtraGroup").click()};
        var removeGroup = function($group) {
            $group.find(".removeExtraGroup").click();
        };

        it('minimizing group with no args should work', function() {
            $filterOpPanel.find('.functionsInput').val("");
            expect($argSection.hasClass('inactive')).to.be.true;
            expect($filterOpPanel.find('.minGroup').length).to.equal(1);
            expect($filterOpPanel.find('.altFnTitle:visible').length).to.equal(0);
            expect($filterOpPanel.find('.functionsInput').val()).to.equal("");
            expect($filterOpPanel.find('.group').hasClass('minimized')).to.be.false;

            $filterOpPanel.find('.minGroup').click();

            expect($filterOpPanel.find('.group').hasClass('minimized')).to.be.true;
            expect($filterOpPanel.find('.altFnTitle:visible').length).to.equal(1);
            expect($filterOpPanel.find('.group').attr('data-numargs')).to.equal("0");
        });

        it('unminimize should work', function() {
            expect($filterOpPanel.find('.group').hasClass('minimized')).to.be.true;
            $filterOpPanel.find('.group').mouseup();
            expect($filterOpPanel.find('.group').hasClass('minimized')).to.be.false;
        });

        it('minimizing group with args should work', function() {
            // check state
            expect($argSection.hasClass('inactive')).to.be.true;
            expect($filterOpPanel.find('.minGroup').length).to.equal(1);
            expect($filterOpPanel.find('.altFnTitle:visible').length).to.equal(0);
            expect($filterOpPanel.find('.functionsInput').val()).to.equal("");
            expect($filterOpPanel.find('.group').hasClass('minimized')).to.be.false;
            expect($argSection.find('.arg:visible').length).to.equal(0);

            // trigger function and arg section
            $functionsInput.val('eq').trigger(fakeEvent.enterKeydown);
            expect($argSection.hasClass('inactive')).to.be.false;
            expect($argSection.find('.arg:visible').length).to.equal(2);

            // click minimize
            $filterOpPanel.find('.minGroup').click();

            // check
            expect($filterOpPanel.find('.group').hasClass('minimized')).to.be.true;
            expect($filterOpPanel.find('.group').attr('data-numargs')).to.equal("2");
            expect($filterOpPanel.find('.altFnTitle:visible').length).to.equal(0);

            // unminimize
            $filterOpPanel.find('.group').mouseup();
        });

        it('adding and removing filter args should work', function() {
            expect($filterOpPanel.find('.group').length).to.equal(1);
            expect($filterOpPanel.find('.group').eq(0).hasClass('minimized')).to.be.false;

            addGroup();

            expect($filterOpPanel.find('.group').length).to.equal(2);
            expect($filterOpPanel.find('.group').eq(0).hasClass('minimized')).to.be.true;
            expect($filterOpPanel.find('.group').eq(0).attr('data-numargs')).to.equal("2");
            expect($filterOpPanel.find('.group').eq(1).hasClass('minimized')).to.be.false;
            $filterOpPanel.find('.group').eq(1).find(".functionsInput").val("between").change();

            // add another group
            $filterOpPanel.find(".addExtraGroup").click();
            expect($filterOpPanel.find('.group').length).to.equal(3);

            // switch and to or to and
            expect($filterOpPanel.find(".strPreview").text().indexOf("and(")).to.be.gt(-1);
            expect($filterOpPanel.find(".strPreview").text().indexOf("or(")).to.equal(-1);

            $filterOpPanel.find(".switch").click();
            expect($filterOpPanel.find(".strPreview").text().indexOf("and(")).to.equal(-1);
            expect($filterOpPanel.find(".strPreview").text().indexOf("or(")).to.be.gt(-1);

            $filterOpPanel.find(".switch").click();
            expect($filterOpPanel.find(".strPreview").text().indexOf("and(")).to.be.gt(-1);
            expect($filterOpPanel.find(".strPreview").text().indexOf("or(")).to.equal(-1);

            // cache 3rd group
            var $thirdGroup = $filterOpPanel.find('.group').eq(2);
            expect($thirdGroup.find('.functionsList').data('fnlistnum')).to.equal(2);

            // remove middle group
            removeGroup($filterOpPanel.find('.group').eq(1));

            expect($filterOpPanel.find('.group').length).to.equal(2);
            expect($filterOpPanel.find('.group').eq(1).find(".functionsList").data('fnlistnum')).to.equal(1);

            // back to 1 group
            $filterOpPanel.find(".removeExtraGroup").last().click();
            expect($filterOpPanel.find('.group').length).to.equal(1);
            expect($filterOpPanel.find('.andOrToggle').is(":visible")).to.be.false;
        });

        describe("additional args", function() {
            it("additional arg button should appear", function() {
                expect($filterOpPanel.find(".addExtraArg").length).to.equal(0);
                $functionsInput.val('in').trigger({type: "keydown", which: keyCode.Enter});
                expect($filterOpPanel.find(".addExtraArg").length).to.equal(1);
            });

            it("additional arg button should create new input", function() {
                expect($filterOpPanel.find(".arg").length).to.equal(2);
                $filterOpPanel.find(".addExtraArg").click();
                expect($filterOpPanel.find(".arg").length).to.equal(3);
            });

            it("additional new input should be removed", function() {
                expect($filterOpPanel.find(".arg").length).to.equal(3);
                $filterOpPanel.find(".extraArg .xi-cancel").click();
                expect($filterOpPanel.find(".arg").length).to.equal(2);
            });
        });

        describe("validate", function() {
            var oldValidateGroups;
            before(function() {
               oldValidateGroups = FilterOpPanel.Instance.model.validateGroups;

            });

            it("validate with function error should work", function() {
                FilterOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 0,
                        type: "function"
                    }
                };
                FilterOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("This operation is not supported.");
            });

            it("validate with blank error should work", function() {
                FilterOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "blank"
                    }
                };
                FilterOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("Please fill out this field or keep it empty by checking the checkbox.");
            });

            it("validate with columnType error should work", function() {
                FilterOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "columnType",
                        error: "custom error"
                    }
                };
                FilterOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with other error should work", function() {
                FilterOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "other",
                        error: "custom error"
                    }
                };
                FilterOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with type error should work", function() {
                FilterOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "valueType",
                        error: "custom error"
                    }
                };
                FilterOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with missingFields error should work", function() {
                FilterOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "missingFields",
                        error: "custom error2"
                    }
                };
                FilterOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error2");
            });

            after(function() {
                FilterOpPanel.Instance.model.validateGroups = oldValidateGroups;
            })
        });
    });

    describe("Advanced Mode related Filter Panel Tests", function() {
        it("Should show statusbox error if columns isnt a field", function() {
            filterOpPanel.show(node, openOptions);
            $("#filterOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify({}, null, 4));
            $("#filterOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            filterOpPanel.close();
        });
    });

    describe("Final output", function() {
        it ("final node should have correct input", function() {
            filterOpPanel.show(node, openOptions);
            $("#filterOpPanel .bottomSection .xc-switch").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"evalString":"","outputTableName":""}');

            $functionsInput.val('eq').trigger(fakeEvent.enterKeydown);
            $argSection.find('.arg').eq(0).val(1).trigger("change");
            $argSection.find('.arg').eq(1).val(2).trigger("change");
            $filterOpPanel.find(".submit").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"evalString":"eq(1, 2)","outputTableName":""}');
        });
    });

    after(function() {
        filterOpPanel.close();
    });
});
