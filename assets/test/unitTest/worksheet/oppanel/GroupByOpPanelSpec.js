describe("GroupByOpPanel Test", function() {
    var groupByOpPanel;
    var $groupByOpPanel;
    var node;
    var editor;
    var $functionsInput;
    var $functionsList;
    var $argSection;
    var prefix = "prefix";
    var openOptions = {};

    before(function() {
        node = new DagNodeGroupBy({});
        let parentNode = new DagNodeGroupBy({});
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
        }
        openOptions = {udfDisplayPathPrefix: UDFFileManager.Instance.getCurrWorkbookDisplayPath()};

        oldJSONParse = JSON.parse;
        groupByOpPanel = GroupByOpPanel.Instance;
        editor = groupByOpPanel.getEditor();
        $groupByOpPanel = $('#groupByOpPanel');
        $functionsInput = $groupByOpPanel.find('.functionsInput');
        $functionsList = $functionsInput.siblings('.list');
        $argSection = $groupByOpPanel.find('.argsSection').eq(0);

    });

    describe("Basic GroupBy Panel UI Tests", function() {

        it ("Should be hidden at start", function () {
            groupByOpPanel.close();
            expect($('#groupByOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {

            groupByOpPanel.show(node, openOptions);
            expect($('#groupByOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            groupByOpPanel.show(node, openOptions);
            groupByOpPanel.close();
            expect($('#groupByOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            groupByOpPanel.show(node, openOptions);
            $('#groupByOpPanel .close').click();
            expect($('#groupByOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("GroupBy Panel Tests", function() {

        before(function(done) {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
            DagConfigNodeModal.Instance.show(node, null, $(), options);
            setTimeout(() => {
                // group by op panel show is async, sos wait for it
                $functionsInput = $groupByOpPanel.find('.functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $groupByOpPanel.find('.argsSection').eq(0);
                $groupByOpPanel.find(".gbOnArg").val(prefixCol).trigger("input").trigger("change");
                done();
            }, 1000);
        });

        describe("groupby functions input list", function() {
            var $groupByInput;
            var $categoryMenu;
            var $functionsMenu;
            var $strPreview;

            before(function() {
                $strPreview = $groupByOpPanel.find('.strPreview');
                $categoryMenu = $groupByOpPanel.find('.categoryMenu');
                $functionsMenu = $groupByOpPanel.find('.functionsMenu');
                $groupByInput = $groupByOpPanel.find('.functionsInput');
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

                $functionsInput.val('sum').trigger(fakeEvent.enterKeydown);
                expect($argSection.hasClass('inactive')).to.be.false;
                expect($argSection.find(".arg:visible").length).to.equal(2);
                expect($argSection.find('.arg').eq(0).val()).to.equal("");
                expect($argSection.find('.arg').eq(1).val()).to.equal("");
                expect($argSection.find('.arg').eq(0).is(document.activeElement)).to.be.true;

                $functionsInput.val('').trigger({type: "keydown", which: keyCode.Tab});
                expect($argSection.length).to.equal(1);
                expect($argSection.find(".arg:visible").length).to.equal(0);
                expect($argSection.hasClass('inactive')).to.be.true;

                $functionsInput.val('sum').trigger({type: "keydown", which: keyCode.Tab});
                expect($argSection.hasClass('inactive')).to.be.false;

                expect($argSection.find(".arg:visible").length).to.equal(2);
                expect($argSection.find('.arg').eq(0).val()).to.equal("");
                expect($argSection.find('.arg').eq(1).val()).to.equal("");
                expect($argSection.find('.arg').eq(0).is(document.activeElement)).to.be.true;
            });

            it("keydown escape should close dropdowns", function() {
                $groupByOpPanel.find(".list").show();
                expect($groupByOpPanel.find(".list:visible").length).to.be.gt(1);
                $functionsInput.val('').trigger({type: "keydown", which: keyCode.Escape});
                expect($groupByOpPanel.find(".list:visible").length).to.equal(0);
            });

            it('$.change on input should update argument section', function() {
                StatusBox.forceHide();

                $functionsInput.val('').change();
                expect($argSection.length).to.equal(1);
                expect($argSection.hasClass('inactive')).to.be.true;
                expect($('#statusBox:visible').length).to.equal(0);

                $functionsInput.val('sum').change();
                expect($argSection.hasClass('inactive')).to.be.false;
                expect($argSection.find(".arg:visible").length).to.equal(2);
                expect($argSection.find('.arg').eq(0).val()).to.equal("");
                expect($argSection.find('.arg').eq(1).val()).to.equal("");
                expect($argSection.find('.arg').eq(0).is(document.activeElement)).to.be.true;

                StatusBox.forceHide();
                expect($('#statusBox:visible').length).to.equal(0);
                $functionsInput.trigger(fakeEvent.mousedown);
                $functionsInput.val('invalidFunction').change();
                expect($argSection.find(".arg:visible").length).to.equal(0);
                expect($('#statusBox:visible').length).to.equal(0);

                // trigger change via submit button to see if status box error shows
                StatusBox.forceHide();
                expect($('#statusBox:visible').length).to.equal(0);
                $groupByOpPanel.find('.submit').trigger(fakeEvent.mousedown);
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
                expect($functionsInput.val()).to.equal("avgNumeric");  // 2nd item

                $functionsInput.val("");
                $groupByOpPanel.mousedown();
                $functionsInput.val('').trigger({type: "keydown", which: keyCode.Escape});
                // close dropdown
            });

            it("dblclick should select full text", function() {
                $functionsInput.val("$something");
                expect($functionsInput.range().length).to.equal(0);
                $functionsInput.trigger("dblclick");
                expect($functionsInput.range().length).to.equal(10);
            });


            // describe("special argument cases", function() {
            //     it("addExtraArg should work", function() {
            //         $categoryMenu.find("li:contains('user-defined')").click();
            //         $functionsMenu.find("li:contains('default:multiJoin')").click();
            //         expect($groupByOpPanel.find(".addExtraArg").length).to.equal(1);
            //         expect($groupByOpPanel.find(".arg:visible").length).to.equal(2);
            //         $groupByOpPanel.find(".addExtraArg").click();
            //         expect($groupByOpPanel.find(".arg:visible").length).to.equal(3);
            //     });

            //     it("boolean checkbox should work", function() {
            //         $categoryMenu.find("li:contains('conditional')").click();
            //         $functionsMenu.find("li:contains('startsWith')").click();
            //         expect($groupByOpPanel.find(".boolArg").length).to.equal(1);

            //         $groupByOpPanel.find(".boolArgWrap").click();
            //         expect($groupByOpPanel.find(".boolArgWrap .checkbox").hasClass("checked")).to.be.true;
            //         expect($groupByOpPanel.find(".arg").eq(2).val()).to.equal("true");
            //     });

            //     it("no arg box should be visible for optional args", function() {
            //         $categoryMenu.find("li:contains('type-casting')").click();
            //         $functionsMenu.find("li:contains('int')").click();
            //         expect($groupByOpPanel.find(".checkboxWrap:visible").length).to.equal(1);
            //     });
            // });
        });

        describe('argument section', function() {
            let $argInputs;
            var $groupByInput;
            var $categoryMenu;
            var $functionsMenu;
            var $strPreview;

            before(function() {
                $strPreview = $groupByOpPanel.find('.strPreview');
                $categoryMenu = $groupByOpPanel.find('.categoryMenu');
                $functionsMenu = $groupByOpPanel.find('.genFunctionsMenu');
                $groupByInput = $groupByOpPanel.find('.functionsInput');

                $functionsMenu.find('li').filter(function() {
                    return ($(this).text() === "avg");
                }).trigger(fakeEvent.mouseup);
            });

            it('should have 3 visible text inputs', function() {
                expect($groupByOpPanel.find('.arg[type=text]:visible')).to.have.lengthOf(3);
                $argInputs = $groupByOpPanel.find('.arg[type=text]:visible');
            });

            it('advancedSection should be visible', function() {
                expect($groupByOpPanel.find('.advancedSection:visible')).to.have.lengthOf(1);
            });

            it('should have 3 checkboxes in advanced section', function() {
                $groupByOpPanel.find('.advancedTitle').click();
                expect($groupByOpPanel.find('.advancedSection .checkbox:visible')).to.have.lengthOf(3);
            });

            it("include ER checkbox should work", function() {
                expect(GroupByOpPanel.Instance.model._getParam().icv).to.be.false;
                $groupByOpPanel.find(".icvMode").click();
                expect($groupByOpPanel.find(".icvMode .checkbox.checked").length).to.equal(1);
                expect(GroupByOpPanel.Instance.model._getParam().icv).to.be.true;
                $groupByOpPanel.find(".icvMode").click();
                expect($groupByOpPanel.find(".icvMode .checkbox.checked").length).to.equal(0);
                expect(GroupByOpPanel.Instance.model._getParam().icv).to.be.false;
            });

            it("joinback checkbox should work", function() {
                expect(GroupByOpPanel.Instance.model._getParam().joinBack).to.be.false;
                $groupByOpPanel.find(".joinBack").click();
                expect($groupByOpPanel.find(".joinBack .checkbox.checked").length).to.equal(1);
                expect(GroupByOpPanel.Instance.model._getParam().joinBack).to.be.true;
                $groupByOpPanel.find(".joinBack").click();
                expect($groupByOpPanel.find(".joinBack .checkbox.checked").length).to.equal(0);
                expect(GroupByOpPanel.Instance.model._getParam().joinBack).to.be.false;
            });


            it("incSample checkbox should work", function() {
                expect(GroupByOpPanel.Instance.model._getParam().includeSample).to.be.false;
                $groupByOpPanel.find(".incSample").click();
                expect($groupByOpPanel.find(".incSample .checkbox.checked").length).to.equal(1);
                expect(GroupByOpPanel.Instance.model._getParam().includeSample).to.be.true;
                $groupByOpPanel.find(".incSample").click();
                expect($groupByOpPanel.find(".incSample .checkbox.checked").length).to.equal(0);
                expect(GroupByOpPanel.Instance.model._getParam().includeSample).to.be.false;
            });

            it("keydown down direction on arg field should highlight list", function() {
                var $arg = $groupByOpPanel.find(".arg").eq(0);
                var $list = $groupByOpPanel.find(".arg").eq(0).siblings(".list").find("ul");
                $list.html("<li>col1</li><li>col2</li>");
                $list.show();
                $list.parent().show().addClass("openList");

                var e = {type: "keydown", which: 40};
                $arg.trigger(e);
                expect($list.find("li").eq(0).hasClass("highlighted")).to.be.true;
                expect($list.find("li").eq(1).hasClass("highlighted")).to.be.false;
                expect($arg.val()).to.equal("$col1");
                $arg.val("");
                $list.empty();
                $list.parent().hide().removeClass("openList");
            });

            // purposely fail the submitform check to prevent submitting
            it("keypress enter on arg field should submitForm", function() {
                var $arg = $groupByOpPanel.find(".arg").eq(0);
                var $list = $groupByOpPanel.find(".arg").eq(0).siblings(".list").find("ul");
                $list.html('<li class="highlighted">col1</li><li>col2</li>');
                $list.show();
                $list.parent().show().addClass("openList");

                expect($arg.val()).to.equal("");
                $arg.trigger(fakeEvent.enter);
                expect($arg.val()).to.equal("$col1");
                expect($("#statusBox").is(":visible")).to.be.false;

                $list.find(".highlighted").removeClass("highlighted");
                StatusBox.forceHide();
                $arg.trigger(fakeEvent.enter);
                expect($("#statusBox").is(":visible")).to.be.true;
                StatusBox.forceHide();
                $list.parent().hide().removeClass("openList");
            });

            it("keypress enter on any input field except functionsInput should submit form", function(done) {
                var submitCount = 0;
                var promises = [];
                $groupByOpPanel.find("input:not(.functionsInput)").each(function(i) {
                    promises.push(promise.bind(null, $(this), i));
                });

                PromiseHelper.chain(promises)
                .then(function() {
                    expect(submitCount).to.be.gt(4);
                    done();
                });

                // need timeouts to open and close statusboxes
                function promise($input, timeout) {
                    var deferred = PromiseHelper.deferred();
                    setTimeout(function() {
                        StatusBox.forceHide();
                        expect($("#statusBox").is(":visible")).to.be.false;

                        $input.trigger(fakeEvent.enter);

                        expect($("#statusBox .message").text()).to.equal("Please fill out this field.");
                        expect($("#statusBox").is(":visible")).to.be.true;

                        StatusBox.forceHide();
                        submitCount++;
                        deferred.resolve();

                    }, timeout * 2);
                    return deferred.promise();
                }
            });

            it('empty option checkboxes should work', function() {
                var $checkboxWrap = $groupByOpPanel.find(".checkboxWrap").eq(2);
                var $checkbox = $checkboxWrap.find(".checkbox");
                var $row = $checkboxWrap.closest('.row');
                var $input = $row.find(".arg");
                $input.val("test");

                expect($checkbox.hasClass("checked")).to.be.false;
                expect($input.val()).to.equal("test");

                $checkbox.click();

                expect($checkbox.hasClass("checked")).to.be.true;
                expect($row.find(".inputWrap").hasClass("semiHidden")).to.be.true;
                expect($input.val()).to.equal("");
                expect($row.find(".cast").hasClass("semiHidden")).to.be.true;

                $checkbox.click();

                expect($checkbox.hasClass("checked")).to.be.false;
                expect($row.find(".inputWrap").hasClass("semiHidden")).to.be.false;
                expect($row.find(".cast").hasClass("semiHidden")).to.be.false;
            });

            it("argSuggest() should work", function() {
                var fn = groupByOpPanel._argSuggest.bind(groupByOpPanel);
                var $arg = $groupByOpPanel.find(".arg").eq(0);
                var $ul = $arg.siblings(".list");
                var time = Date.now();
                var colName = time + "1234";
                $arg.val(colName);
                $ul.find("li").remove();

                parentNode = new DagNodeGroupBy({});
                parentNode.getLineage = function() {
                    return {getColumns: function() {
                        return [new ProgCol({
                            backName: colName,
                            type: "number"
                        })]
                    }}
                };
                node.getParents = function() {
                    return [parentNode];
                };

                groupByOpPanel.refreshColumns();

                expect($ul.is(":visible")).to.be.false;
                expect($ul.hasClass("openList")).to.be.false;
                expect($ul.find("li").length).to.equal(0);

                fn($arg);

                expect($ul.is(":visible")).to.be.true;
                expect($ul.hasClass("openList")).to.be.true;
                expect($ul.find("li").length).to.equal(1);
                expect($ul.find("li").text()).to.equal(colName);

                // close dropdown
                $(document).trigger({type: "keydown", which: keyCode.Escape});
                expect($ul.is(':visible')).to.be.false;

                parentNode = new DagNodeGroupBy({});
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
                }

                groupByOpPanel.refreshColumns();
            });
        });

        describe("autogengroupbyname", function() {
            it("autoGenNewGroubyName should work", function() {
                var $el = $('<div class="groupbyGroup">' +
                                '<div class="argsSection">' +
                                '<div class="functionsList">' +
                                    '<input value="test">'+
                                '</div>' +
                                '<input class="aggArg" value="hello">' +
                                '<div class="colNameSection"><input class="arg"></div>' +
                                '</div>' +
                            '</div>');
                let fn = groupByOpPanel._onArgChange;
                groupByOpPanel._onArgChange = ()=>{};
                groupByOpPanel._autoGenNewGroupByName($el.find(".aggArg"));

                expect($el.find(".colNameSection .arg").val()).to.equal("hello_test");
                $el.remove();
                groupByOpPanel._onArgChange = fn;
            });
        });

        describe("minimize and maximize groups", function() {
            before(function () {
                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
                groupByOpPanel.show(node, options);
                $functionsInput = $groupByOpPanel.find('.functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $groupByOpPanel.find('.argsSection').eq(0);
            });

            var addGroup = function() {$groupByOpPanel.find(".addExtraGroup").click()};
            var removeGroup = function($group) {
                $group.find(".removeExtraGroup").click();
            };

            it('adding and removing map args should work', function() {
                expect($groupByOpPanel.find('.group').length).to.equal(1);

                addGroup();

                expect($groupByOpPanel.find('.group').length).to.equal(2);
                $groupByOpPanel.find('.group').eq(1).find(".functionsInput").val("count").trigger("input").trigger(fakeEvent.enterKeydown);

                // add another group
                $groupByOpPanel.find(".addExtraGroup").click();
                expect($groupByOpPanel.find('.group').length).to.equal(3);

                // remove middle group
                removeGroup($groupByOpPanel.find('.group').eq(1));

                expect($groupByOpPanel.find('.group').length).to.equal(2);

                // back to 1 group
                $groupByOpPanel.find(".removeExtraGroup").last().click();
                expect($groupByOpPanel.find('.group').length).to.equal(1);
            });
        });

        describe("validate", function() {
            var oldValidateGroups;
            before(function() {
               oldValidateGroups = GroupByOpPanel.Instance.model.validateGroups;
               $groupByOpPanel.find('.group').eq(0).find(".functionsInput").val("count").trigger("input").trigger(fakeEvent.enterKeydown);
            });

            it("validate with function error should work", function() {
                GroupByOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 0,
                        type: "function"
                    }
                };
                GroupByOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("This operation is not supported.");
            });

            it("validate with blank error should work", function() {
                GroupByOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "blank"
                    }
                };
                GroupByOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("Please fill out this field.");
            });

            it("validate with columnType error should work", function() {
                GroupByOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "columnType",
                        error: "custom error"
                    }
                };
                GroupByOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with other error should work", function() {
                GroupByOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "other",
                        error: "custom error"
                    }
                };
                GroupByOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with type error should work", function() {
                GroupByOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "valueType",
                        error: "custom error"
                    }
                };
                GroupByOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with missingFields error should work", function() {
                GroupByOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "missingFields",
                        error: "custom error2"
                    }
                };
                GroupByOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error2");
            });

            it("validate with empty new field error should work", function() {
                GroupByOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "newField",
                        error: "custom error3"
                    }
                };
                GroupByOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error3");
            });

            after(function() {
                GroupByOpPanel.Instance.model.validateGroups = oldValidateGroups;
            });
        });
    });

    describe('multiGroupBy from multiple selected columns', function() {
        before(function(done) {
            $("#groupByOpPanel .close").click();
            setTimeout(function() {
                done();
            }, 500);
        });

        it('2 selected columns should produce 2 group on inputs', function() {
            var prefixCol1 = xcHelper.getPrefixColName(prefix, 'average_stars');
            var prefixCol2 = xcHelper.getPrefixColName(prefix, 'stringCol');
            var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol1, prefixCol2]});
            node = new DagNodeGroupBy({});
            node.input.input.groupBy = [prefixCol1, prefixCol2];
            groupByOpPanel.show(node, options);
            expect($groupByOpPanel.find('.gbOnArg').length).to.equal(2);
            expect($groupByOpPanel.find('.gbOnArg').eq(0).val()).to.equal(gColPrefix + prefix + gPrefixSign + "average_stars");
            expect($groupByOpPanel.find('.gbOnArg').eq(1).val()).to.equal(gColPrefix + prefix + gPrefixSign + "stringCol");

        });
    });

    describe("addGroupbyGroup", function() {
        it("addGroupbyGroup should work", function() {
            expect($groupByOpPanel.find(".groupbyGroup").length).to.equal(1);
            $groupByOpPanel.find(".addExtraGroup").click();
            expect($groupByOpPanel.find(".groupbyGroup").length).to.equal(2);
            expect($groupByOpPanel.find(".groupbyGroup").eq(0).find(".argsSection").length).to.equal(1);
            expect($groupByOpPanel.find(".groupbyGroup").eq(0).find(".groupOnSection").length).to.equal(1);
            expect($groupByOpPanel.find(".groupbyGroup").eq(1).find(".argsSection").length).to.equal(1);
            expect($groupByOpPanel.find(".groupbyGroup").eq(1).find(".groupOnSection").length).to.equal(0);
            $groupByOpPanel.find(".removeExtraGroup").click();
            expect($groupByOpPanel.find(".groupbyGroup").length).to.equal(1);
        });
    });


    describe("Advanced Mode related GroupBy Panel Tests", function() {
        it("Should show statusbox error if columns isnt a field", function() {
            groupByOpPanel.show(node, openOptions);
            $("#groupByOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify({}, null, 4));
            $("#groupByOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            groupByOpPanel.close();
        });
    });

    describe("Final output", function() {
        it ("final node should have correct input", function() {
            node = new DagNodeGroupBy({});
            groupByOpPanel.show(node, openOptions);
            $("#groupByOpPanel .bottomSection .xc-switch").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"groupBy":[""],"aggregate":[{"operator":"","sourceColumn":"","destColumn":"","distinct":false,"cast":null}],"includeSample":false,"joinBack":false,"icv":false,"groupAll":false,"newKeys":[],"dhtName":"","outputTableName":""}');
            $functionsInput.val('count').trigger("input").trigger(fakeEvent.enterKeydown);
            $groupByOpPanel.find(".gbOnArg").val("test1").trigger("change");
            $argSection.find('.arg').eq(0).val("test2").trigger("change");
            $argSection.find('.arg').eq(1).val("test3").trigger("change");
            $argSection.find('.arg').eq(2).val("outputName").trigger("change");
            $groupByOpPanel.find(".submit").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"groupBy":["test1"],"aggregate":[{"operator":"count","sourceColumn":"\\\"test2\\\"","destColumn":"test3","distinct":false,"cast":null}],"includeSample":false,"joinBack":false,"icv":false,"groupAll":false,"newKeys":[],"dhtName":"","outputTableName":""}');
        });
    });

    after(function() {
        groupByOpPanel.close();
    });
});
