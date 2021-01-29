// XXX temporary disable it
describe.skip('JsonModal Test', function() {
    var testDs;
    var tableName;
    var prefix;
    var $jsonModal;
    var $modal;
    var tableId;
    var $table;
    var tabId;

    before(function(done) {
        console.log("json modal test")
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .always(function(ds, tName, tPrefix, _nodeId, _tabId) {
            testDs = ds;
            tableName = tName;
            prefix = tPrefix;
            tabId = _tabId;
            $jsonModal = $('#jsonModal');
            $modal = $jsonModal;
            tableId = xcHelper.getTableId(tableName);
            var colInfo = [{colNum: 10, ordering: XcalarOrderingT.XcalarOrderingAscending}];
            xcFunction.sort(tableId, colInfo)
            .then(function(tName) {
                tableName = tName;
                tableId = xcHelper.getTableId(tableName);
                // unhide derived sorted column
                gTables[tableId].hiddenSortCols = {};
                $table = $('#xcTable-' + tableId);
                JSONModal.Instance.show($table.find('.jsonElement').eq(0));
                // allow modal to fade in
                setTimeout(function() {
                    done();
                }, 100);
            });
        });
    });

    describe('check data browser initial state', function() {
        it('top row should be correct', function() {
            expect($jsonModal.find('.compareIcon').length).to.equal(1);
            expect($jsonModal.find('.compareIcon .xi-ckbox-empty:visible').length).to.equal(0);
            expect($jsonModal.find('.compareIcon .xi-ckbox-selected').length).to.equal(1);
            expect($jsonModal.find('.compareIcon .xi-ckbox-selected:visible').length).to.equal(0);

            expect($jsonModal.find('.btn:visible').length).to.equal(3);
            expect($jsonModal.find('.rowNum').text()).to.equal('Row:1');
        });

        it ('second row should be correct', function() {
            expect($jsonModal.find('.tab').length).to.equal(3);
            expect($jsonModal.find('.tab:visible').length).to.equal(3);
            expect($jsonModal.find('.tab').eq(2).text()).to.equal(prefix);
            expect($jsonModal.find('.tab.active').eq(0).length).to.equal(1);
            expect($jsonModal.find('.tab.active').eq(1).length).to.equal(0);
        });

        it('json text should be correct', function() {
            expect($jsonModal.find('.jObject').length).to.equal(2);
            expect($jsonModal.find('.jObject:visible').length).to.equal(2);
            var jsonObj = JSON.parse("{" + $jsonModal.find('.jObject').last().text().replace(/[\s\n]/g, "") + "}");
            expect(Object.keys(jsonObj).length).to.equal(12);
        });

        it("getMissingImmediatesHtml should work", function() {
            var html = JSONModal.Instance._getMissingImmediatesHtml({
                "something": "string"
            });
            var $html = $(html);
            expect($html.find(".jKey").text()).to.equal("something");
            expect($html.find(".jString").text()).to.equal("string");
        });
    });

    describe("modal resizing", function() {
        it("should resize", function() {
            var $bar = $modal.find(".ui-resizable-e").eq(0);
            var pageX = $bar.offset().left;
            var pageY = $bar.offset().top;

            expect($modal.find(".tabs").hasClass("small")).to.be.false;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX - 200, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX - 200, pageY: pageY});

            expect($bar.offset().left > pageX);
            expect($modal.find(".tabs").hasClass("small")).to.be.true;

            $bar.trigger("mouseover");
            $bar.trigger({ type: "mousedown", which: 1, pageX: pageX - 200, pageY: pageY});
            $bar.trigger({ type: "mousemove", which: 1, pageX: pageX, pageY: pageY});
            $bar.trigger({ type: "mouseup", which: 1, pageX: pageX, pageY: pageY});
            expect($bar.offset().left === pageY);
            expect($modal.find(".tabs").hasClass("small")).to.be.false;
        });
    });


    describe('mousedown on jsonDrag element', function() {
        it('mousedown on jsonDrag should work', function() {
            expect($("#moveCursor").length).to.equal(0);
            $jsonModal.find('.jsonDragHandle').trigger(fakeEvent.mousedown);
            expect($("#moveCursor").length).to.equal(1);
            $(document).trigger(fakeEvent.mouseup);
            expect($("#moveCursor").length).to.equal(0);
        });
    });

    describe('opening modal from td', function() {
        before(function(done) {
            JSONModal.Instance._close();
            setTimeout(function() {
                done();
            }, 100);
        });

        it('object in mixed col should work', function(done) {
            var $td = $table.find('.row0 .col11');
            $td.find('.originalData').html('{"a":"b"}');
            JSONModal.Instance.show($td, {type: "mixed"});
            // allow modal to fade in
            setTimeout(function() {
                expect($jsonModal.find('.jObject').length).to.equal(1);
                expect($jsonModal.find('.jObject:visible').length).to.equal(1);
                var text = $jsonModal.find('.prettyJson').text().replace(/[\s\n]/g, "");
                expect(text).to.equal('{"a":"b"}');

                JSONModal.Instance._close();
                setTimeout(function() {
                    done();
                }, 100);
            }, 100);
        });

        it('array in mixed col should work', function(done) {
            var $td = $table.find('.row0 .col11');
            $td.find('.originalData').html('["a","b"]');
            JSONModal.Instance.show($td, {type: "mixed"});
            // allow modal to fade in
            setTimeout(function() {
                expect($jsonModal.find('.jObject').length).to.equal(1);
                expect($jsonModal.find('.jObject:visible').length).to.equal(1);
                var text = $jsonModal.find('.prettyJson').text().replace(/[\s\n]/g, "");
                expect(text).to.equal('["a","b"]');

                JSONModal.Instance._close();
                setTimeout(function() {
                    done();
                }, 100);
            }, 100);
        });

        after(function(done) {
            JSONModal.Instance.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                done();
            }, 100);
        });
    });

    describe('test sort btn', function() {
        it('sorting should work', function() {
            expect($jsonModal.find('.mainKey').length).to.equal(13);

            expect($jsonModal.find('.sort').length).to.equal(1);
            expect($jsonModal.find('.sort.desc').length).to.equal(0);
            $jsonModal.find('.sort').click();
            expect($jsonModal.find('.sort.desc').length).to.equal(1);
            expect($jsonModal.find('.prefixedType .mainKey:eq(0) .jKey').text()).to.equal('average_stars');
            expect($jsonModal.find('.prefixedType .mainKey:eq(11) .jKey').text()).to.equal('yelping_since');

            $jsonModal.find('.sort').click();
            expect($jsonModal.find('.sort.desc').length).to.equal(0);
            expect($jsonModal.find('.prefixedType .mainKey:eq(11) .jKey').text()).to.equal('average_stars');
            expect($jsonModal.find('.prefixedType .mainKey:eq(0) .jKey').text()).to.equal('yelping_since');

            $jsonModal.find('.sort').click();
            expect($jsonModal.find('.sort.desc').length).to.equal(1);
            expect($jsonModal.find('.prefixedType .mainKey:eq(0) .jKey').text()).to.equal('average_stars');
            expect($jsonModal.find('.prefixedType .mainKey:eq(11) .jKey').text()).to.equal('yelping_since');
        });
    });

    describe('pulling out a field', function() {
        it('pulling a field out should work', function(done) {
            ColManager.hideCol([1], tableId, {noAnimate: true})
            .then(function() {
                var $averageStarsKey = $jsonModal.find('.jKey').filter(function() {
                    return ($(this).text() === "average_stars");
                });
                expect($averageStarsKey.length).to.equal(1);
                expect($averageStarsKey.siblings().text()).to.equal("5");
                $averageStarsKey.click();
                var $headerInput = $table.find('.editableHead').filter(function() {
                    return ($(this).val() === "average_stars");
                });
                expect($headerInput.length).to.equal(1);
                expect($headerInput.closest('th').hasClass('col12')).to.be.true;
                expect($table.find('.row0 .col12 .displayedData').text()).to.equal("5");

                JSONModal.Instance.show($table.find('.jsonElement').eq(0));
                // allow modal to fade in
                setTimeout(function() {
                    done();
                }, 100);
            })
            .fail(function() {
                done("fail");
            });
        });

        it('pulling a nested field out should work', function() {
            var $votesFunnyKey = $jsonModal.find('.jKey').filter(function() {
                return ($(this).text() === "funny");
            });
            expect($votesFunnyKey.length).to.equal(1);
            expect($votesFunnyKey.siblings().text()).to.equal("1");
            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "votes.funny");
            });
            expect($headerInput.length).to.equal(0);

            // trigger pull col
            $votesFunnyKey.click();

            $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "votes.funny");
            });
            expect($headerInput.length).to.equal(1);
            expect($headerInput.closest('th').hasClass('col13')).to.be.true;
            expect($table.find('.row0 .col13 .displayedData').text()).to.equal("1");
        });

        it('trying to pull out existing field should focus on field', function(done) {
            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "yelping_since");
            });
            expect($headerInput.length).to.equal(1);
            expect($headerInput.closest('th.selectedCell')).to.have.lengthOf(0);
            JSONModal.Instance.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                var $yelpingSinceKey = $jsonModal.find('.jKey').filter(function() {
                    return ($(this).text() === "yelping_since");
                });
                expect($yelpingSinceKey.length).to.equal(1);
                expect($yelpingSinceKey.siblings().text()).to.equal("2012-11");
                $yelpingSinceKey.click();
                expect($headerInput.closest('th.selectedCell')).to.have.lengthOf(1);

                done();
            }, 100);
        });
    });

    describe('opening json modal from non-data column', function() {
        // click on compliments column
        it('clicking on object column should work', function(done) {
            var colNum = gTables[tableId].getColNumByBackName(prefix + gPrefixSign + 'compliments');
            expect(colNum).to.be.gt(0);
            JSONModal.Instance.show($table.find('.row0 .col' + colNum), {type: "object"});
            UnitTest.wait(500)
            .then(function() {
                expect($jsonModal.find('.bar:visible').length).to.equal(1);
                var jsonObj = JSON.parse("{" + $jsonModal.find('.jObject').text().replace(/[\s\n]/g, "") + "}");
                expect(Object.keys(jsonObj).length).to.equal(1);
                expect(jsonObj.cool).to.equal(1);
                done();
            });
        });

        // will pull out compliments.cool
        it('pull field should work', function() {
            var colNum = gTables[tableId].getColNumByBackName(prefix + gPrefixSign + 'compliments');
            expect(colNum).to.be.gt(0);
            var $complimentsCoolKey = $jsonModal.find('.jKey').filter(function() {
                return ($(this).text() === "cool");
            });
            expect($complimentsCoolKey.length).to.equal(1);
            expect($complimentsCoolKey.siblings().text()).to.equal("1");
            var $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.cool");
            });
            expect($headerInput.length).to.equal(0);

            // trigger pull col
            $complimentsCoolKey.click();

            $headerInput = $table.find('.editableHead').filter(function() {
                return ($(this).val() === "compliments.cool");
            });
            expect($headerInput.length).to.equal(1);
            expect($headerInput.closest('th').hasClass('col' + (colNum + 1))).to.be.true;
            expect($table.find('.row0 .col'+ (colNum + 1) + ' .displayedData').text()).to.equal("1");
        });
    });

    describe('examine option in json modal', function() {
        it('examine should work', function(done) {
            var $td = $table.find('td').filter(function() {
                return $(this).find(".displayedData").text() === '2012-11';
            }).eq(0);

            JSONModal.Instance.show($td, {type: "string"});
            UnitTest.waits(500)
            .then(function() {
                expect($jsonModal.find('.jsonWrap .prettyJson').text()).to.equal('"2012-11"');
                JSONModal.Instance._close();
                setTimeout(function() {
                    done();
                }, 100);
            });
        });
    });

    describe('multiple json panels', function() {
        // select 2 dataCol cells
        before(function(done) {
            JSONModal.Instance.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                JSONModal.Instance.show($table.find('.jsonElement').eq(4));
                setTimeout(function() {
                    done();
                }, 100);
            }, 100);
        });

        it('compare matches on 2 data browser panels', function() {
            // click on 1 compare icon
            JSONModal.Instance._compareIconSelect($jsonModal.find('.compareIcon').eq(0));
            expect($jsonModal.find('.compareIcon').eq(0).hasClass('selected')).to.be.true;
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('selected')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('active')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('comparison')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.false;

            // click on 2nd compare icon
            JSONModal.Instance._compareIconSelect($jsonModal.find('.compareIcon').eq(1));
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('selected')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('comparison')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.true;

            // check matches
            expect($jsonModal.find('.matched').eq(0).children().length).to.equal(3);
            var matched1Text = $jsonModal.find('.matched').eq(0).text();
            var matched2Text = $jsonModal.find('.matched').eq(1).text();
            expect(matched1Text).to.equal(matched2Text);

            // check partial matches
            expect($jsonModal.find('.partial').eq(0).children().length).to.equal(9);
            expect($jsonModal.find('.partial').eq(1).children().length).to.equal(9);
            expect($jsonModal.find('.partial').eq(0).children().eq(0).data('key'))
            .to.equal($jsonModal.find('.partial').eq(1).children().eq(0).data('key'));
            var partialKeyText1 = $jsonModal.find('.partial').eq(0).children().children('.jKey').text();
            var partialKeyText2 = $jsonModal.find('.partial').eq(1).children().children('.jKey').text();
            expect(partialKeyText1.length).to.be.gt(40);
            expect(partialKeyText1).to.equal(partialKeyText2);

            // check non-matches
            expect($jsonModal.find('.unmatched').eq(0).children().length).to.equal(1);
            expect($jsonModal.find('.unmatched').eq(1).text()).to.equal("");
            var keyText1 = $jsonModal.find('.unmatched').eq(0).children().children('.jKey').text();
            var keyText2 = $jsonModal.find('.unmatched').eq(1).children().children('.jKey').text();
            expect(keyText1.length).to.be.gt(10);
            expect(keyText1).to.not.equal(keyText2);
        });

        it('compare matches on 3 data browser panels', function() {
            var modalWidth = $jsonModal.width();

            JSONModal.Instance.show($table.find('.jsonElement').eq(2));

            expect($jsonModal.width()).to.be.gt(modalWidth);
            JSONModal.Instance._compareIconSelect($jsonModal.find('.compareIcon').eq(2));

            // check matches
            expect($jsonModal.find('.matched').eq(2).children().length).to.equal(2);
            var matched1Text = $jsonModal.find('.matched').eq(0).text();
            var matched2Text = $jsonModal.find('.matched').eq(1).text();
            var matched3Text = $jsonModal.find('.matched').eq(2).text();
            expect(matched1Text).to.equal(matched2Text);
            expect(matched2Text).to.equal(matched3Text);


            // check partial matches
            expect($jsonModal.find('.partial').eq(2).children().length).to.equal(10);

            expect($jsonModal.find('.partial').eq(1).children().eq(0).data('key'))
            .to.equal($jsonModal.find('.partial').eq(2).children().eq(0).data('key'));
            var partialKeyText1 = $jsonModal.find('.partial').eq(1).children().children('.jKey').text();
            var partialKeyText2 = $jsonModal.find('.partial').eq(2).children().children('.jKey').text();
            expect(partialKeyText2.length).to.be.gt(40);
            expect(partialKeyText1).to.equal(partialKeyText2);

            // check non-matches
            expect($jsonModal.find('.unmatched').eq(2).children().length).to.equal(1);
            var keyText1 = $jsonModal.find('.unmatched').eq(1).children().children('.jKey').text();
            var keyText2 = $jsonModal.find('.unmatched').eq(2).children().children('.jKey').text();
            expect(keyText2.length).to.be.gt(10);
            expect(keyText1).to.not.equal(keyText2);
        });

        it('uncheck compare should work', function() {
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('selected')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(0).hasClass('comparison')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.true;
            expect($jsonModal.find('.jsonWrap').eq(2).hasClass('comparison')).to.be.true;

            // click to remove middle comparison
            JSONModal.Instance._compareIconSelect($jsonModal.find('.compareIcon').eq(1));
            expect($jsonModal.find('.compareIcon').eq(1).hasClass('selected')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('active')).to.be.false;
            expect($jsonModal.find('.jsonWrap').eq(1).hasClass('comparison')).to.be.false;
            expect($jsonModal.find('.comparison').length).to.equal(2);
            expect($jsonModal.find('.matched').length).to.equal(2);

            expect($jsonModal.find('.matched').eq(0).children().length).to.equal(3);
            var matched1Text = $jsonModal.find('.matched').eq(0).text();
            var matched2Text = $jsonModal.find('.matched').eq(1).text();
            expect(matched1Text).to.equal(matched2Text);

            // check partial matches
            expect($jsonModal.find('.partial').eq(0).children().length).to.equal(10);
            expect($jsonModal.find('.partial').eq(1).children().length).to.equal(10);
            expect($jsonModal.find('.partial').eq(0).children().eq(0).data('key'))
            .to.equal($jsonModal.find('.partial').eq(1).children().eq(0).data('key'));
            var partialKeyText1 = $jsonModal.find('.partial').eq(0).children().children('.jKey').text();
            var partialKeyText2 = $jsonModal.find('.partial').eq(1).children().children('.jKey').text();
            expect(partialKeyText1.length).to.be.gt(40);
            expect(partialKeyText1).to.equal(partialKeyText2);

            // check non-matches
            expect($jsonModal.find('.unmatched').eq(0).children().length).to.equal(0);
            expect($jsonModal.find('.unmatched').eq(1).children().length).to.equal(0);
        });

        it("sort columns should work", function() {
            var data = JSONModal.Instance._jsonData;
            var firstVal = data[0].immediates.user_id;
            var secondVal = data[1].immediates.user_id;
            var thirdVal = data[2].immediates.user_id;

            JSONModal.Instance._resortJsons(0, 2);
            expect(data[0].immediates.user_id).to.equal(secondVal);
            expect(data[1].immediates.user_id).to.equal(thirdVal);
            expect(data[2].immediates.user_id).to.equal(firstVal);
            JSONModal.Instance._resortJsons(2, 0);
            expect(data[0].immediates.user_id).to.equal(firstVal);
            expect(data[1].immediates.user_id).to.equal(secondVal);
            expect(data[2].immediates.user_id).to.equal(thirdVal);
        })

        it('remove panel should work', function() {
            expect($jsonModal.find('.jsonWrap').length).to.equal(3);
            expect($jsonModal.find('.matched').length).to.equal(2);
            expect($jsonModal.find('.comparison').length).to.equal(2);
            var modalWidth = $jsonModal.width();

            // click on remove last panel
            $jsonModal.find('.remove').eq(2).click();
            expect($jsonModal.width()).to.be.lt(modalWidth);
            expect($jsonModal.find('.jsonWrap').length).to.equal(2);
            expect($jsonModal.find('.comparison').length).to.equal(0);
            expect($jsonModal.find('.matches').length).to.equal(0);
            expect($jsonModal.find('.jsonWrap').eq(0).find('.rowNum').text()).to.equal('Row:1');
            expect($jsonModal.find('.jsonWrap').eq(1).find('.rowNum').text()).to.equal('Row:5');

            // remove 2nd panel
            $jsonModal.find('.remove').eq(1).click();
            expect($jsonModal.find('.jsonWrap').length).to.equal(1);
            expect($jsonModal.find('.jsonWrap').eq(0).find('.rowNum').text()).to.equal('Row:1');
        });
    });

    describe("dropdownBox", function() {
        it(".dropdownBox should work", function() {
            var $menu = $jsonModal.find(".menu");
            var $dropdownBox = $jsonModal.find(".dropdownBox");
            expect($menu.length).to.equal(1);
            expect($menu.is(":visible")).to.be.false;
            expect($dropdownBox.length).to.equal(1);
            expect($dropdownBox.is(":visible")).to.be.true;

            $dropdownBox.click();
            expect($menu.is(":visible")).to.be.true;

            $dropdownBox.click();
            expect($menu.is(":visible")).to.be.false;
        });
    });

    describe('multiSelectMode', function() {
        var $jsonWrap;
        before(function(done) {
            $jsonWrap = $jsonModal.find('.jsonWrap');
            JSONModal.Instance.show($table.find('.jsonElement').eq(0));
            setTimeout(function() {
                done();
            }, 100);
        });

        it('toggle multiSelectMode should work', function() {
            expect($jsonWrap.hasClass('multiSelectMode')).to.be.false;
            expect($jsonWrap.find('.submitMultiPull').is(":visible")).to.be.false;
            expect($jsonWrap.find('.jsonModalMenu .multiSelectionOpt .check').is(":visible")).to.be.false;

             // multiSelect mode
            $jsonWrap.find('.jsonModalMenu .multiSelectionOpt').trigger(fakeEvent.mouseup);

            expect($jsonWrap.hasClass('multiSelectMode')).to.be.true;
            expect($jsonWrap.find('.submitMultiPull').is(":visible")).to.be.true;
            expect($jsonWrap.find(".pulled").length).to.equal(14);
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("0/8 fields selected to pull");
        });

        it('selecting a field should work', function() {
            $jsonWrap.find('.jInfo:not(".pulled")').find('.jKey').eq(0).click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("1/8 fields selected to pull");
        });

        it('select and deselect all should work', function() {
            $jsonWrap.find('.selectAll').click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("8/8 fields selected to pull");

            $jsonWrap.find('.jInfo:not(".pulled")').find('.jKey').eq(0).click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("7/8 fields selected to pull");

            $jsonWrap.find('.clearAll').click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("0/8 fields selected to pull");
        });

        it('clicking on json key element should select key', function() {
            var $checkbox = $jsonWrap.find(".jsonCheckbox:visible").eq(0);

            $checkbox.click();
            expect($checkbox.siblings(".keySelected").length).to.equal(1);

            $checkbox.click();
            expect($checkbox.siblings(".keySelected").length).to.equal(0);
        });

        it('back to select mode', function() {
            $jsonWrap.find('.jInfo:not(".pulled")').find('.jKey').eq(0).click();
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("1/8 fields selected to pull");

            $jsonWrap.find('.jsonModalMenu .selectionOpt').trigger(fakeEvent.mouseup);

            expect($jsonWrap.hasClass('multiSelectMode')).to.be.false;
            expect($jsonWrap.find('.submitMultiPull').is(":visible")).to.be.false;
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').text()).to.equal("0/8 fields selected to pull");
            expect($jsonWrap.find('.multiSelectModeBar .numColsSelected').is(":visible")).to.be.false;
        });

        it("selectSome should work", function(done) {
            var cachedFn = ColManager.unnest;
            var called = false;
            ColManager.unnest = function(tId, colNum, rowNum, colNames) {
                expect(tId).to.equal(tableId);
                expect(colNum).to.equal(15);
                expect(rowNum).to.equal(0);
                expect(colNames.length).to.equal(2);
                colNames.sort();
                expect(colNames[0]).to.equal(prefix + "::" + "average_stars");
                expect(colNames[1]).to.equal(prefix + "::" + "yelping_since");
                called = true;
            };

            $jsonWrap.find('.jsonModalMenu .multiSelectionOpt').trigger(fakeEvent.mouseup);

            $jsonWrap.find(".jKey").filter(function() {
                return $(this).text() === "average_stars";
            }).click();

            $jsonWrap.find(".jKey").filter(function() {
                return $(this).text() === "yelping_since";
            }).click();

            $jsonModal.find(".submitMultiPull").click();

            UnitTest.wait(1)
            .then(function() {
                expect(called).to.be.true;
                ColManager.unnest = cachedFn;
                done();
            });
        });

        after(function(done) {
            JSONModal.Instance.show($table.find('.jsonElement').eq(0));
            setTimeout(function() {
                $jsonModal.find('.jsonWrap').removeClass('multiSelectMode');
                done();
            }, 100);
        });
    });

    describe('saveLastMode() function test', function() {
        it('save last mode should work', function() {
            var $wrap = $jsonModal.find(".jsonWrap");
            expect($wrap.length).to.equal(1);
            var $secondWrap = $wrap.clone();
            $wrap.after($secondWrap);

            $wrap.addClass("multiSelectMode"); // 1 multi
            expect(JSONModal.Instance._saveLastMode()).to.equal("single");

            $secondWrap.addClass("multiSelectMode"); // 2 multi
            expect(JSONModal.Instance._saveLastMode()).to.equal("multiple");

            $wrap.removeClass("multiSelectMode"); // 1 single, 1 multi
            expect(JSONModal.Instance._saveLastMode()).to.equal("single");

            $secondWrap.remove();
        });
    });

    describe('tabs should work', function() {
        it('tabbing should work', function() {
            expect($jsonModal.find('.tab').length).to.equal(3);
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.true;
            expect($jsonModal.find('.tab').eq(2).hasClass('active')).to.be.false;
            expect($jsonModal.find('.prefixGroupTitle').is(":visible")).to.be.true;
            expect($jsonModal.find('.prefix').is(":visible")).to.be.true;

            JSONModal.Instance._selectTab($jsonModal.find('.tab').eq(2));
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.false;
            expect($jsonModal.find('.tab').eq(2).hasClass('active')).to.be.true;
            expect($jsonModal.find('.prefixGroupTitle').is(":visible")).to.be.false;
            expect($jsonModal.find('.prefix').is(":visible")).to.be.false;
            expect($jsonModal.find('.mainKey').length).to.equal(13);
            expect($jsonModal.find('.mainKey:visible').length).to.equal(12);

            JSONModal.Instance._selectTab($jsonModal.find('.tab').eq(0));
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.true;
            expect($jsonModal.find('.tab').eq(2).hasClass('active')).to.be.false;
            expect($jsonModal.find('.prefixGroupTitle').is(":visible")).to.be.true;
            expect($jsonModal.find('.prefix').is(":visible")).to.be.true;
            expect($jsonModal.find('.mainKey').length).to.equal(13);
            expect($jsonModal.find('.mainKey:visible').length).to.equal(13);

            // test mousedown
            $jsonModal.find('.tab').eq(2).trigger(fakeEvent.mousedown);
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.false;
            expect($jsonModal.find('.tab').eq(2).hasClass('active')).to.be.true;

            $jsonModal.find('.tab').eq(0).trigger(fakeEvent.mousedown);
            expect($jsonModal.find('.tab.seeAll').hasClass('active')).to.be.true;
            expect($jsonModal.find('.tab').eq(2).hasClass('active')).to.be.false;
        });
    });

    describe("search", function() {
        it('toggling search should work', function() {
            expect($("#jsonSearch").hasClass('closed')).to.be.true;

            $("#jsonSearch").find(".searchIcon").click();
            expect($("#jsonSearch").hasClass('closed')).to.be.false;
            $("#jsonSearch").find("input").val("unitTest");
            expect($("#jsonSearch").find("input").val()).to.equal("unitTest");

            $("#jsonSearch").find(".searchIcon").click();
            expect($("#jsonSearch").hasClass('closed')).to.be.true;
            expect($("#jsonSearch").find("input").val()).to.equal("");
        });

        it("search should work", function() {
            $("#jsonSearch").find(".searchIcon").click();
            $("#jsonSearch").find("input").val("yelping").trigger(fakeEvent.input);

            expect($jsonModal.find(".highlightedText").length).to.equal(1);
            expect($jsonModal.find(".highlightedText").text()).to.equal("yelping");
            expect($("#jsonSearch").find('.position').text()).to.equal("1");
            expect($("#jsonSearch").find('.total').text()).to.equal("of 1");

            $("#jsonSearch").find(".closeBox").click();
            expect($("#jsonSearch").find("input").val()).to.equal("");
            expect($jsonModal.find(".highlightedText").length).to.equal(0);
        });
    });

    describe('function rehighlightTds', function() {
        it('rehighlightTds should work', function() {
            var numRows = $table.find('tbody tr').length;
            expect(numRows).to.be.gt(30);
            expect($table.find('.jsonElement').length).to.equal(numRows);
            expect($table.find('.modalHighlighted').length).to.equal(numRows);
            $table.find('.jsonElement:lt(20)').removeClass('modalHighlighted');
            expect($table.find('.modalHighlighted').length).to.equal(numRows - 20);
            expect($table.find('.jsonModalHighlightBox').length).to.equal(1);
            $table.find('.jsonModalHighlightBox').remove();
            expect($table.find('.jsonModalHighlightBox').length).to.equal(0);

            JSONModal.Instance.rehighlightTds($table);
            expect($table.find('.modalHighlighted').length).to.equal(numRows);
            expect($table.find('.jsonModalHighlightBox').length).to.equal(1);
        });
    });

    describe('pull all button', function() {
        before(function(done) {
            var numCols = gTables[tableId].tableCols.length;
            var colNums = [];
            for (var i = 0; i < numCols - 1; i++) {
                colNums.push(i + 1); // colnums 1 indexed
            }
            ColManager.hideCol(colNums, tableId, {noAnimate: true})
            .then(function() {
                $jsonModal.find(".jsonWrap").data("colnum", 1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it('pull all should work', function(done) {
            expect($table.find('th').length).to.equal(2);
            // the "1" comes from the row number td
            expect($table.find('tbody tr:eq(0) td:not(".jsonElement")').text()).to.equal("1");
            $jsonModal.find(".pullAll").eq(0).click();
            setTimeout(function() {
                expect(1).to.equal(1);
                expect($table.find('th').length).to.be.gt(5).and.lt(30);
                var rowText = $table.find('tbody tr:eq(0) td:not(".jsonElement")').text();
                expect(rowText.indexOf("SEDFpR4oMPKqXMjbJiMGog")).to.not.equal(-1);
                expect(rowText.indexOf('"useful":1')).to.not.equal(-1);
                done();
            }, 1);
        });

        it('pull all should not pull if all cols pulled already', function(done) {
            JSONModal.Instance.show($table.find('.jsonElement').eq(0));
            // allow modal to fade in
            setTimeout(function() {
                var numCols = gTables[tableId].tableCols.length;
                expect($table.find('th').length).to.equal(numCols + 1);
                var rowText = $table.find('tbody tr:eq(0) td:not(".jsonElement")').text();
                $jsonModal.find(".pullAll").eq(0).click();
                setTimeout(function() {
                    expect($table.find('th').length).to.equal(numCols + 1);
                    var newRowText = $table.find('tbody tr:eq(0) td:not(".jsonElement")').text();
                    expect(newRowText).to.equal(rowText);
                    done();
                }, 1);
            }, 100);
        });
    });

    after(function(done) {
        UnitTest.deleteTab(tabId)
        .then(() => {
            return UnitTest.deleteAllTables();
        })
        .then(function() {
            UnitTest.deleteDS(testDs)
            .always(function() {
                UnitTest.offMinMode();
                done();
            });
        })
        .fail(function() {
            done("fail");
        });
    });
});
