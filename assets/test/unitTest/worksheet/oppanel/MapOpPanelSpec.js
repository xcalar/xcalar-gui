describe("MapOpPanel Test", function() {
    var mapOpPanel;
    var $mapOpPanel;
    var node;
    var editor;
    var $functionsInput;
    var $functionsList;
    var $argSection;
    var prefix = "prefix";
    var openOptions = {};

    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            node = new DagNodeMap({});
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
            }
            openOptions = {
                udfDisplayPathPrefix : UDFFileManager.Instance.getCurrWorkbookDisplayPath()
            };

            mapOpPanel = MapOpPanel.Instance;
            editor = mapOpPanel.getEditor();
            $mapOpPanel = $('#mapOpPanel');
            $functionsInput = $mapOpPanel.find('.functionsInput');
            $functionsList = $functionsInput.siblings('.list');
            $argSection = $mapOpPanel.find('.argsSection').eq(0);
            done();
        });
    });

    describe("Basic Map Panel UI Tests", function() {

        it ("Should be hidden at start", function () {
            mapOpPanel.close();
            expect($('#mapOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {

            mapOpPanel.show(node, openOptions);
            expect($('#mapOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            mapOpPanel.show(node, openOptions);
            mapOpPanel.close();
            expect($('#mapOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            mapOpPanel.show(node, openOptions);
            $('#mapOpPanel .close').click();
            expect($('#mapOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe("Map Panel Tests", function() {

        before(function () {
            var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
            var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
            DagConfigNodeModal.Instance.show(node, null, $(), options);
            $functionsInput = $mapOpPanel.find('.functionsInput');
            $functionsList = $functionsInput.siblings('.list');
            $argSection = $mapOpPanel.find('.argsSection').eq(0);
        });

        describe("map function list", function() {
            var $filterInput;
            var $categoryMenu;
            var $functionsMenu;
            var $strPreview;

            before(function() {
                $strPreview = $mapOpPanel.find('.strPreview');
                $categoryMenu = $mapOpPanel.find('.categoryMenu');
                $functionsMenu = $mapOpPanel.find('.functionsMenu');
                $filterInput = $mapOpPanel.find('.functionsInput');
            });

            describe('map\'s search filter', function() {

            });

            describe('autofilled input args', function() {
                it('should select category when clicked', function() {
                    // string - concat
                    $functionsMenu.find("input").val("add").trigger("change");
                    var $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    var prefixCol = xcHelper.getPrefixColName(prefix, "average_stars");
                    expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                    expect($argInputs.eq(1).val()).to.equal("");
                    expect($argInputs.eq(2).val()).to.startsWith("average_stars_add");

                    $functionsMenu.find("input").val("default:splitWithDelim").trigger("change");

                    $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                    expect($argInputs.eq(1).val()).to.equal("");
                    expect($argInputs.eq(2).val()).to.equal("");
                    expect($argInputs.eq(3).val()).to.startsWith("average_stars_splitWithDelim");

                    // check arg descriptions
                    var $descriptions = $argInputs.closest('.row').find('.description');
                    expect($descriptions.eq(0).text()).to.equal("txt:");
                    expect($descriptions.eq(1).text()).to.equal("index:");
                    expect($descriptions.eq(2).text()).to.equal("delim:");
                    expect($descriptions.eq(3).text()).to.equal("New Resultant Column Name: ");

                });

                it('should focus on first empty input', function() {
                    $functionsMenu.find("input").val("concat").trigger("change");

                    var $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    expect($argInputs.eq(1).is(document.activeElement)).to.be.true;
                });
            });

            describe("special argument cases", function() {
                it("addExtraArg should work", function() {
                    $functionsMenu.find("input").val("default:multiJoin").trigger("change");
                    expect($mapOpPanel.find(".addExtraArg").length).to.equal(1);
                    expect($mapOpPanel.find(".arg:visible").length).to.equal(2);
                    $mapOpPanel.find(".addExtraArg").click();
                    expect($mapOpPanel.find(".arg:visible").length).to.equal(3);
                });

                it("boolean checkbox should work", function() {
                    $functionsMenu.find("input").val("startsWith").trigger("change");
                    expect($mapOpPanel.find(".boolArg").length).to.equal(1);

                    $mapOpPanel.find(".boolArgWrap").click();
                    expect($mapOpPanel.find(".boolArgWrap .checkbox").hasClass("checked")).to.be.true;
                    expect($mapOpPanel.find(".arg").eq(2).val()).to.equal("true");
                });

                it("no arg box should be visible for optional args", function() {
                    $functionsMenu.find("input").val("int").trigger("change");

                    expect($mapOpPanel.find(".checkboxWrap:visible").length).to.equal(1);
                });
            });

            describe('run map functions', function() {
                var submitForm;
                before(function() {
                    submitForm = mapOpPanel.model.submit.bind(mapOpPanel.model);
                });

                it ('string-concat should work', function(done) {
                    var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                    var options = {
                        category: "string",
                        func: "concat",
                        args: [{
                            num: 0,
                            str: gColPrefix + prefixCol
                        }, {
                            num: 1,
                            str: "zz"
                        }],
                        expectedMapStr: 'concat(' + prefixCol + ', "zz")',
                        expectedCliMapStr: 'concat(' + prefixCol + ', "zz")',
                        transform: function(colVal) {
                            return (colVal + this.args[1].str);
                        }
                    };

                    runMap(options)
                    .always(function() {
                        done();
                    });
                });

                it.skip('string-concat with empty param should work', function(done) {
                    var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                    var options = {
                        category: "string",
                        func: "concat",
                        args: [{
                            num: 0,
                            str: gColPrefix + prefixCol
                        },{
                            num: 1,
                            str: ""
                        }],
                        expectedMapStr: 'concat(' + prefixCol + ')',
                        expectedCliMapStr: 'concat(' + prefixCol + 'yelping_since)',
                        transform: null
                    };

                    runMap(options)
                    .always(function() {
                        done();
                    });
                });

                it ('arithmetic-add with string should not work', function(done) {
                    var options = {
                        category: "arithmetic",
                        func: "add",
                        args: [{
                            num: 0,
                            str: '"2"'
                        }, {
                            num: 1,
                            str: '"3"'
                        }],
                        expectedMapStr: 'add("2", "3")',
                        expectedCliMapStr: 'add("2", "3")',
                        transform: null
                    };

                    runMap(options)
                    .always(function() {
                        done();
                    });
                });

                it ('udf default:splitWithDelim should work', function(done) {
                    var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                    var mapStr = 'default:splitWithDelim(' + prefixCol + ', 1, "-")';
                    var options = {
                        category: "Custom scalar function",
                        func: "default:splitWithDelim",
                        args: [{
                            num: 0,
                            str: gColPrefix + prefixCol
                        }, {
                            num: 1,
                            str: 1
                        }, {
                            num: 2,
                            str: "-"
                        }],
                        expectedMapStr: mapStr,
                        expectedCliMapStr: mapStr,
                        transform: function(colVal) {
                            var delim = "-";
                            var index = this.args[1].str;
                            return colVal.split(delim).splice(index).join(delim);
                        }
                    };

                    runMap(options)
                    .always(function() {
                        done();
                    });
                });

                it ('add with string to int conversion should work', function(done) {
                    var prefixCol = xcHelper.getPrefixColName(prefix, "yelping_since");
                    var options = {
                        category: "arithmetic",
                        func: "add",
                        args: [{
                            num: 0,
                            str: 'int(' + prefixCol + ', 10)'
                        }, {
                            num: 1,
                            str: 5
                        }],
                        expectedMapStr: 'add(int(' + prefixCol + ', 10), 5)',
                        expectedCliMapStr: 'add(int(' + prefixCol + ', 10), 5)',
                        transform: function(colVal) {
                            return parseInt(colVal) + this.args[1].str + "";
                        }
                    };

                    runMap(options)
                    .always(function() {
                        done();
                    });
                });

                function runMap(options) {
                    var deferred = PromiseHelper.deferred();
                    var category = options.category;
                    var func = options.func;
                    var args = options.args;
                    var expectedMapStr = options.expectedMapStr;
                    var expectedCliMapStr = options.expectedCliMapStr;

                    $functionsMenu.find("input").val(func).trigger("change");

                    var $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    for (var i = 0; i < args.length; i++) {
                        var argNum = args[i].num;
                        $argInputs.eq(argNum).val(args[i].str).trigger(fakeEvent.input).trigger("change");
                        $argInputs = $mapOpPanel.find('.arg[type=text]:visible'); // inputs can be rerendered
                    }

                    var promise = function() {
                        var innerDeferred = PromiseHelper.deferred();
                        setTimeout(function() {
                            // quotes/parsing doesn't get applied until 200 ms after inputed
                            var previewStr = $strPreview.find('.descArgs').text();
                            expect(previewStr).to.equal(expectedMapStr);
                            innerDeferred.resolve();
                        }, 250);
                        return innerDeferred.promise();
                    };

                    promise()
                    .then(function() {
                        submitForm();
                        expect(node.getParam().eval[0].evalString).to.equal(expectedMapStr);
                        deferred.resolve();
                    })
                    .fail(function() {
                        expect(options.transform).to.be.null;
                        deferred.reject();
                    });

                    return deferred.promise();
                }
            });

            describe("cast helper", function() {
                // assumes "add" function is chosen
                it("add on string col should show cast helper", function() {
                    $filterInput.val('add').trigger(fakeEvent.input).trigger(fakeEvent.enterKeydown);
                    var $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    var prefixCol = gColPrefix + xcHelper.getPrefixColName(prefix, "stringCol");
                    $argInputs.eq(0).val(prefixCol).change();
                    $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    $argInputs.eq(1).val(5).change();
                    $argInputs.eq(2).val("outputCol").change();

                    $("#mapOpPanel .bottomSection .btn-submit").click();

                    expect($mapOpPanel.find(".strPreview").text().indexOf("float(")).to.equal(-1);

                    var $castSection = $mapOpPanel.find(".cast.showing");
                    expect($castSection.length).to.equal(1);
                    expect($castSection.find(".list").is(":visible")).to.be.false;
                    $castSection.find("input").trigger(fakeEvent.mousedown);
                    $castSection.find("input").click();

                    expect($castSection.find(".list").is(":visible")).to.be.true;
                    $castSection.find("li").filter(function() {
                        return $(this).text() === "float";
                    }).trigger(fakeEvent.mouseup);

                    expect($mapOpPanel.find(".strPreview").text().indexOf("float(")).to.be.gt(-1);
                });
            });
        });

        describe('column pickers test', function() {
            var $categoryMenu;
            var $functionsMenu;
            var $argInputs;

            before(function() {
                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
                DagConfigNodeModal.Instance.show(node, null, $(), options);
                $functionsInput = $mapOpPanel.find('.functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $mapOpPanel.find('.argsSection').eq(0);

                $categoryMenu = $mapOpPanel.find('.categoryMenu');
                $functionsMenu = $mapOpPanel.find('.functionsMenu');
            });

            describe.skip('functions menu in map', function() {
                it('should not have selected li', function() {
                    expect($functionsMenu.find('li.active').length).to.equal(0);
                    expect($mapOpPanel.find('.argsSection').hasClass('inactive')).to.equal(true);
                });
                it('should select function name when clicked', function() {
                    $functionsMenu.find('li').filter(function() {
                        return ($(this).text() === "concat");
                    }).trigger(fakeEvent.click);
                    expect($functionsMenu.find("li.active").text()).to.equal('concat');
                });
                it ('should show arguments after clicking function name', function() {
                    expect($mapOpPanel.find('.argsSection').hasClass('inactive')).to.equal(false);
                });
            });

            describe('argument section in map', function() {
                it('should have 3 visible text inputs', function() {
                    $functionsMenu.find("input").val("concat").trigger("change");
                    expect($mapOpPanel.find('.arg[type=text]:visible')).to.have.length(3);
                    $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                });
                it ('should have 1 hidden checkbox for ICV', function() {
                    expect($mapOpPanel.find('.checkbox')).to.have.lengthOf(5);
                    expect($mapOpPanel.find('.checkbox:visible')).to.have.lengthOf(0);
                });
            });

            describe('column pickers should work', function() {
                var $table;
                var wasHidden;
                before(function() {
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
                });

                // it('input should fill from column header', function() {
                //     $argInputs.eq(0).focus().trigger('focus').val(""); // focus & trigger to make sure
                //     expect($argInputs.eq(0).val()).to.equal("");

                //     var $header = $table.find('.header');
                //     expect($header.find('input').val()).to.equal('average_stars');
                //     $header.click();

                //     $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                //     var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                //     expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);

                //     var $allEls = $header.find('*');
                //     var count = 0;
                //     // go through each element inside .header and click
                //     $allEls.each(function() {
                //         if ($(this).closest('.dropdownBox').length ||
                //             !$(this).is(":visible")) {
                //             return;
                //         }
                //         var $hiddenParents = $(this).parents().andSelf()
                //                 .filter(function() {
                //                     return $(this).css('visibility') === "hidden";
                //                 });
                //         if ($hiddenParents.length) {
                //             return;
                //         }

                //         $argInputs.eq(0).focus().trigger('focus').val("");
                //         expect($argInputs.eq(0).val()).to.equal("");
                //         $(this).click();
                //         $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                //         expect($argInputs.eq(0).val()).to.equal(gColPrefix + prefixCol);
                //         count++;
                //     });
                //     expect(count).to.be.at.least(2);
                // });

                it("column picker should not work when mapOpPanel closes", function() {
                    // close operations view
                    $("#mapOpPanel .close").click();
                    expect($mapOpPanel.hasClass('xc-hidden')).to.equal(true);
                    // argsSection should stil be open even when mapOpPanel is closed
                    expect($mapOpPanel.find('.argsSection').hasClass('inactive')).to.equal(false);

                    $argInputs.eq(0).focus().trigger('focus').val(""); // focus & trigger to make sure
                    expect($argInputs.eq(0).val()).to.equal("");
                    var $header = $table.find('.header');
                    expect($header.find('input').val()).to.equal('average_stars');
                    $header.click();
                    expect($argInputs.eq(0).val()).to.equal("");
                });

                after(function() {
                    $table.remove();
                    if (wasHidden) {
                        $("#sqlTableArea").addClass("xc-hidden");
                    }
                });
            });

            after(function(done) {
                MapOpPanel.Instance.close();
                setTimeout(function() { // allow time for op menu to close
                    done();
                }, 500);
            });
        });

        describe("auto new column name", function() {
            var $categoryMenu;
            var $functionsMenu;
            var $argInputs;

            before(function() {
                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                var options = $.extend({}, openOptions);
                DagConfigNodeModal.Instance.show(node, null, $(), options);
                $functionsInput = $mapOpPanel.find('.functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $mapOpPanel.find('.argsSection').eq(0);

                $categoryMenu = $mapOpPanel.find('.categoryMenu');
                $functionsMenu = $mapOpPanel.find('.functionsMenu');
            });

            describe('setup inputs', function() {
                it.skip('should select function name when clicked', function() {
                    $functionsMenu.find('li').filter(function() {
                        return ($(this).text() === "concat");
                    }).trigger(fakeEvent.click);
                    expect($functionsMenu.find("li.active").text()).to.equal('concat');
                });

                it ('should show arguments after clicking function name', function() {
                    $functionsMenu.find("input").val("concat").trigger("change");
                    expect($mapOpPanel.find('.argsSection').hasClass('inactive')).to.equal(false);
                });

                it('should have 3 visible text inputs', function() {
                    expect($mapOpPanel.find('.arg[type=text]:visible')).to.have.length(3);
                    $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                });

                it("autofill", function() {
                    $argInputs.eq(0).val("test").trigger("change");
                    $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    expect($argInputs.eq(2).val()).to.equal("");

                    $argInputs.eq(0).val("$test").trigger("change");
                    $argInputs = $mapOpPanel.find('.arg[type=text]:visible');
                    expect($argInputs.eq(2).val()).to.equal("test_concat");
                });
            });

            after(function(done) {
                MapOpPanel.Instance.close();
                setTimeout(function() { // allow time for op menu to close
                    done();
                }, 500);
            });
        });

        describe("minimize and maximize groups", function() {
            before(function () {
                var prefixCol = xcHelper.getPrefixColName(prefix, 'average_stars');
                var options = $.extend({}, openOptions, {autofillColumnNames: [prefixCol]});
                DagConfigNodeModal.Instance.show(node, null, $(), options);
                $functionsInput = $mapOpPanel.find('.functionsInput');
                $functionsList = $functionsInput.siblings('.list');
                $argSection = $mapOpPanel.find('.argsSection').eq(0);
            });

            var addGroup = function() {$mapOpPanel.find(".addExtraGroup").click()};
            var removeGroup = function($group) {
                $group.find(".removeExtraGroup").click();
            };

            it('minimizing group with no args should work', function() {
                $functionsInput.val("").trigger("change");
                expect($mapOpPanel.find('.argsSection').eq(0).hasClass('inactive')).to.be.true;
                expect($mapOpPanel.find('.minGroup').length).to.equal(1);
                expect($mapOpPanel.find('.altFnTitle:visible').length).to.equal(0);
                expect($mapOpPanel.find('.functionsInput').val()).to.equal("");
                expect($mapOpPanel.find('.group').hasClass('minimized')).to.be.false;

                $mapOpPanel.find('.minGroup').click();

                expect($mapOpPanel.find('.group').hasClass('minimized')).to.be.true;
                expect($mapOpPanel.find('.altFnTitle:visible').length).to.equal(1);
                expect($mapOpPanel.find('.group').attr('data-numargs')).to.equal("0");
            });

            it('unminimize should work', function() {
                expect($mapOpPanel.find('.group').hasClass('minimized')).to.be.true;
                $mapOpPanel.find('.group').mouseup();
                expect($mapOpPanel.find('.group').hasClass('minimized')).to.be.false;
            });

            it('minimizing group with args should work', function() {
                // check state
                expect($argSection.hasClass('inactive')).to.be.true;
                expect($mapOpPanel.find('.minGroup').length).to.equal(1);
                expect($mapOpPanel.find('.altFnTitle:visible').length).to.equal(0);
                expect($mapOpPanel.find('.functionsInput').val()).to.equal("");
                expect($mapOpPanel.find('.group').hasClass('minimized')).to.be.false;
                expect($argSection.find('.arg:visible').length).to.equal(0);

                // trigger function and arg section
                $functionsInput.val("eq").trigger("change");
                expect($argSection.hasClass('inactive')).to.be.false;
                expect($argSection.find('.arg:visible').length).to.equal(3);

                // click minimize
                $mapOpPanel.find('.minGroup').click();

                // check
                expect($mapOpPanel.find('.group').hasClass('minimized')).to.be.true;
                expect($mapOpPanel.find('.group').attr('data-numargs')).to.equal("2");
                expect($mapOpPanel.find('.altFnTitle:visible').length).to.equal(0);

                // unminimize
                $mapOpPanel.find('.group').mouseup();
            });

            it('adding and removing map args should work', function() {
                expect($mapOpPanel.find('.group').length).to.equal(1);
                expect($mapOpPanel.find('.group').eq(0).hasClass('minimized')).to.be.false;

                addGroup();

                expect($mapOpPanel.find('.group').length).to.equal(2);
                expect($mapOpPanel.find('.group').eq(0).hasClass('minimized')).to.be.true;
                expect($mapOpPanel.find('.group').eq(0).attr('data-numargs')).to.equal("2");
                expect($mapOpPanel.find('.group').eq(1).hasClass('minimized')).to.be.false;
                $mapOpPanel.find('.group').eq(1).find(".functionsInput").val("eq").trigger("change");

                // add another group
                $mapOpPanel.find(".addExtraGroup").click();
                expect($mapOpPanel.find('.group').length).to.equal(3);

                // remove middle group
                removeGroup($mapOpPanel.find('.group').eq(1));

                expect($mapOpPanel.find('.group').length).to.equal(2);

                // back to 1 group
                $mapOpPanel.find(".removeExtraGroup").last().click();
                expect($mapOpPanel.find('.group').length).to.equal(1);
                expect($mapOpPanel.find('.andOrToggle').is(":visible")).to.be.false;
            });
        });

        describe("additional args", function() {
            it("additional arg button should appear", function() {
                expect($mapOpPanel.find(".addExtraArg").length).to.equal(0);
                $functionsInput.val('in').trigger("change");
                expect($mapOpPanel.find(".addExtraArg").length).to.equal(1);
            });

            it("additional arg button should create new input", function() {
                expect($mapOpPanel.find(".arg").length).to.equal(3);
                $mapOpPanel.find(".addExtraArg").click();
                expect($mapOpPanel.find(".arg").length).to.equal(4);
            });

            it("additional new input should be removed", function() {
                expect($mapOpPanel.find(".arg").length).to.equal(4);
                $mapOpPanel.find(".extraArg .xi-cancel").click();
                expect($mapOpPanel.find(".arg").length).to.equal(3);
            });
        });

        describe("validate", function() {
            var oldValidateGroups;
            before(function() {
               oldValidateGroups = MapOpPanel.Instance.model.validateGroups;
            });

            it("validate with function error should work", function() {
                MapOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 0,
                        type: "function",
                        error: ErrTStr.NoEmpty
                    }
                };
                MapOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("Please fill out this field.");
            });

            it("validate with blank error should work", function() {
                MapOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "blank"
                    }
                };
                MapOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("Please fill out this field or keep it empty by checking the checkbox.");
            });

            it("validate with columnType error should work", function() {
                MapOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "columnType",
                        error: "custom error"
                    }
                };
                MapOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with other error should work", function() {
                MapOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "other",
                        error: "custom error"
                    }
                };
                MapOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with type error should work", function() {
                MapOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "valueType",
                        error: "custom error"
                    }
                };
                MapOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error");
            });

            it("validate with missingFields error should work", function() {
                MapOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "missingFields",
                        error: "custom error2"
                    }
                };
                MapOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error2");
            });

            it("validate with empty new field error should work", function() {
                MapOpPanel.Instance.model.validateGroups = function() {
                    return {
                        group: 0,
                        arg: 1,
                        type: "newField",
                        error: "custom error3"
                    }
                };
                MapOpPanel.Instance._validate();
                UnitTest.hasStatusBoxWithError("custom error3");
            });

            after(function() {
                MapOpPanel.Instance.model.validateGroups = oldValidateGroups;
            });
        });
    });

    describe("Advanced Mode related Map Panel Tests", function() {
        it("Should show statusbox error if columns isnt a field", function() {
            mapOpPanel.show(node, openOptions);
            $("#mapOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify({}, null, 4));
            $("#mapOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            mapOpPanel.close();
        });
    });

    describe("Final output", function() {
        it ("final node should have correct input", function() {
            node = new DagNodeMap({});
            $("#configNodeContainer").parent().removeClass("xc-hidden");
            mapOpPanel.show(node, openOptions);
            $("#mapOpPanel .bottomSection .xc-switch").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"eval":[{"evalString":"","newField":""}],"icv":false,"outputTableName":""}');
            $functionsInput.val('eq').trigger("change");
            $argSection.find('.arg').eq(0).val(1).trigger("change");
            $argSection.find('.arg').eq(1).val(2).trigger("change");
            $argSection.find('.arg').eq(2).val("outputName").trigger("change");
            $mapOpPanel.find(".submit").click();
            expect(JSON.stringify(node.getParam())).to.equal('{"eval":[{"evalString":"eq(1, 2)","newField":"outputName"}],"icv":false,"outputTableName":""}');
            $("#configNodeContainer").parent().addClass("xc-hidden");
        });
    });

    after(function() {
        mapOpPanel.close();
    });
});
