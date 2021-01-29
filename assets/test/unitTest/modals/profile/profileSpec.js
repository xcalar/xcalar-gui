describe("Profile Test", function() {
    var tableName, tableId, colNum;
    var $modal;

    before(function() {
        $modal = $("#profileModal");
        UnitTest.onMinMode();

        tableId = xcHelper.randName("test");
        tableName = "yelp_profile_test#" + tableId;
        let progCol = ColManager.newPullCol("average_stars", "average_stars", ColumnType.float);
        let tableCols = [progCol, ColManager.newDATACol()];
        let table = new TableMeta({
            tableId,
            tableName,
            tableCols
        });
        gTables[tableId] = table;
    });

    describe("Show Profile Test", function() {
        it("should handle fail case", function(done) {
            var oldFunc = ProfileEngine.prototype.genProfile;

            ProfileEngine.prototype.genProfile = function() {
                return PromiseHelper.reject({error: "test"});
            };

            var table = gTables[tableId];
            var backCol = "average_stars";
            colNum = table.getColNumByBackName(backCol);

            Profile.show(tableId, colNum)
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($modal.attr("data-state")).to.equal("failed");
                expect($modal.find(".errorSection .text").text()).to.equal("test");
                $modal.find(".close").click();
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                ProfileEngine.prototype.genProfile = oldFunc;
            });
        });

        it("should show profile", function(done) {
            var table = gTables[tableId];
            var backCol = "average_stars";
            colNum = table.getColNumByBackName(backCol);

            Profile.show(tableId, colNum)
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Profile Cache Test", function() {
        it("Profile.getCache should work", function() {
            var cache = Profile.getCache();
            expect(cache).to.be.an("object");
        });

        it("Profile.deleteCache should work", function() {
            var cache = Profile.getCache();
            var key = xcHelper.randName("testKey");
            cache[key] = "test";

            Profile.deleteCache(key);
            expect(cache.hasOwnProperty(key)).to.be.false;
        });

        it("Profile.copy should handle no cache case", function() {
            var cache = Profile.getCache();
            var key = xcHelper.randName("testKey");
            var key2 = xcHelper.randName("testKey2");

            var res = Profile.copy(key, key2);
            expect(res).to.be.false;
            expect(cache.hasOwnProperty(key2)).to.be.false;
        });

        it("Profile.copy should handle table row now match case", function() {
            var cache = Profile.getCache();
            var key = xcHelper.randName("testKey");
            var key2 = xcHelper.randName("testKey2");

            gTables[key] = new TableMeta({
                tableName: "test",
                tableId: 1
            });
            gTables[key2] = new TableMeta({
                tableName: "test",
                tableId: 2
            });
            gTables[key].resultSetCount = 1;
            gTables[key2].resultSetCount = 2;

            var res = Profile.copy(key, key2);
            expect(res).to.be.false;
            expect(cache.hasOwnProperty(key2)).to.be.false;

            delete gTables[key];
            delete gTables[key2];
        });

        it("Profile.copy should work", function() {
            var cache = Profile.getCache();
            var key = xcHelper.randName("testKey");
            var key2 = xcHelper.randName("testKey2");
            cache[key] = "test";

            gTables[key] = new TableMeta({
                tableName: "test",
                tableId: 1
            });
            gTables[key2] = new TableMeta({
                tableName: "test",
                tableId: 2
            });
            gTables[key].resultSetCount = 1;
            gTables[key2].resultSetCount = 1;

            var res = Profile.copy(key, key2);
            expect(res).to.be.true;
            expect(cache.hasOwnProperty(key2)).to.be.true;

            Profile.deleteCache(key);
            Profile.deleteCache(key2);
            delete gTables[key];
            delete gTables[key2];
        });
    });

    describe("Profile SVG Test", function() {
        it("addNullValue should work", function() {
            var addNullValue = Profile.__testOnly__.addNullValue;
            var data = [];
            addNullValue({"groupByInfo": {}}, data);
            expect(data.length).to.equal(0);

            // csae 2
            addNullValue({
                "groupByInfo": {
                    "nullCount": 10,
                    "buckets": {
                        0: "test"
                    }
                }
            }, data);
            expect(data.length).to.equal(1);
        });

        // it("Should hover on bar area", function() {
        //     var $barArea = $modal.find(".barChart .area").eq(0);
        //     $barArea.trigger("mouseenter");
        //     // .hasClass not work on svg
        //     var classList = $barArea.get(0).classList;
        //     expect(classList.contains("hover")).to.be.true;
        //     var tooltipLen = $(".chartTip:visible").length;
        //     expect(tooltipLen).to.be.at.least(1);
        //     // not hover
        //     $modal.trigger("mouseenter");
        //     classList = $barArea.get(0).classList;
        //     expect(classList.contains("hover")).to.be.false;
        //     newTooltipLen = $(".chartTip:visible").length;
        //     expect(newTooltipLen).to.equal(tooltipLen - 1);
        // });

        // it("Should toggle between percentage display", function() {
        //     var $label = $modal.find(".xlabel").eq(0);
        //     expect($label.text().includes("%")).to.be.false;
        //     // click without event.which = 1 not do anyting
        //     $label.click();
        //     expect($label.text().includes("%")).to.be.false;
        //     // to percentage display
        //     $label.trigger(fakeEvent.click);
        //     expect($label.text().includes("%")).to.be.true;
        //     // turn back
        //     $label.trigger(fakeEvent.click);
        //     expect($label.text().includes("%")).to.be.false;
        // });

        // it("should change to pie chart", function() {
        //     $modal.find(".graphSwitch").click();
        //     expect($modal.find(".pieChart").length).to.equal(1);
        //     expect($modal.find(".barChart").length).to.equal(0);
        // });

        // it("should change to bar chart", function() {
        //     $modal.find(".graphSwitch").click();
        //     expect($modal.find(".pieChart").length).to.equal(0);
        //     expect($modal.find(".barChart").length).to.equal(1);
        // });

        // it("should download as png", function(done) {
        //     var oldFunc = domtoimage.toPng;
        //     var oldSuccess = xcUIHelper.showSuccess;
        //     var test = false;
        //     var called = false;
        //     domtoimage.toPng = function() {
        //         test = true;
        //         return new Promise(function(resolve) {
        //             resolve(null);
        //         });
        //     };
        //     xcUIHelper.showSuccess = function() { called = true; };

        //     $("#profile-download").click();
        //     UnitTest.testFinish(function() {
        //         return called;
        //     })
        //     .then(function() {
        //         expect(test).to.be.true;
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     })
        //     .always(function() {
        //         domtoimage.toPng = oldFunc;
        //         xcUIHelper.showSuccess = oldSuccess;
        //     });
        // });

        // it("down handle fail case", function(done) {
        //     var oldFunc = domtoimage.toPng;
        //     var oldSuccess = xcUIHelper.showFail;
        //     var test = false;
        //     var called = false;
        //     domtoimage.toPng = function() {
        //         test = true;
        //         return new Promise(function(resolve, reject) {
        //             reject("test error");
        //         });
        //     };
        //     xcUIHelper.showFail = function() { called = true; };

        //     $("#profile-download").click();
        //     UnitTest.testFinish(function() {
        //         return called;
        //     })
        //     .then(function() {
        //         expect(test).to.be.true;
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     })
        //     .always(function() {
        //         domtoimage.toPng = oldFunc;
        //         xcUIHelper.showFail = oldSuccess;
        //     });
        // });
    });

    // describe("Decimal Places Test", function() {
    //     var $decimalInput;

    //     before(function() {
    //         $decimalInput = $modal.find(".decimalInput");
    //     });

    //     it("should click to change decimal", function() {
    //         $decimalInput.find(".more").click();
    //         expect($decimalInput.find("input").val()).to.equal("0");

    //         $decimalInput.find(".less").click();
    //         expect($decimalInput.find("input").val()).to.equal("");
    //     });

    //     it("should intput to changne decimal", function() {
    //         var $input = $decimalInput.find("input");
    //         var $less = $decimalInput.find(".less");

    //         $input.val(2).trigger(fakeEvent.enterKeydown);
    //         expect($less.hasClass("xc-disabled")).to.be.false;

    //         $input.val(6).trigger(fakeEvent.enterKeydown);
    //         var err = xcStringHelper.replaceMsg(ErrWRepTStr.IntInRange, {
    //             "lowerBound": 0,
    //             "upperBound": 5
    //         });
    //         UnitTest.hasStatusBoxWithError(err);

    //         $input.val("").trigger(fakeEvent.enterKeydown);
    //         expect($less.hasClass("xc-disabled")).to.be.true;
    //     });
    // });

    // describe("Skip Rows Test", function() {
    //     var $skipInput;
    //     var $scrollSection;

    //     before(function() {
    //         $skipInput = $("#profile-rowInput");
    //         $scrollSection = $modal.find(".scrollSection");
    //     });

    //     it("Should skip to rows", function(done) {
    //         $skipInput.val(50).trigger(fakeEvent.enter);

    //         waitForFetch()
    //         .then(function() {
    //             assert.isTrue($modal.find(".left-arrow").is(":visible"));
    //             assert.isTrue($modal.find(".right-arrow").is(":visible"));
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should click right arrow to change row num", function(done) {
    //         var rowNum = $skipInput.val();
    //         $modal.find(".right-arrow").trigger(fakeEvent.mousedown);

    //         waitForFetch()
    //         .then(function() {
    //             expect($skipInput.val()).to.above(rowNum);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should click left arrow to change row num", function(done) {
    //         var rowNum = $skipInput.val();
    //         $modal.find(".left-arrow").trigger(fakeEvent.mousedown);

    //         waitForFetch()
    //         .then(function() {
    //             expect($skipInput.val()).to.below(rowNum);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should use scroll bar to move", function(done) {
    //         var $scrollerBar = $scrollSection.find(".scrollBar");
    //         var $scroller = $scrollSection.find(".scroller");
    //         var offset = $scrollerBar.offset().left;
    //         var rowNum = $skipInput.val();

    //         $scrollerBar.trigger(fakeEvent.mousedown);
    //         var event1 = jQuery.Event("mousedown", {"pageX": offset + 5});
    //         $scroller.trigger(event1);
    //         expect($scroller.hasClass("scrolling")).to.be.true;
    //         // move scroll bar
    //         var oldLeft = $scroller.css("left");
    //         var event2 = jQuery.Event("mousemove", {"pageX": offset + 50});
    //         $(document).trigger(event2);
    //         expect($scroller.css("left")).to.above(oldLeft);
    //         var event3 = jQuery.Event("mouseup", {"pageX": offset + 50});
    //         $(document).trigger(event3);

    //         expect($scroller.hasClass("scrolling")).to.be.false;

    //         waitForFetch()
    //         .then(function() {
    //             expect($skipInput.val()).to.above(rowNum);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should display more rows", function(done) {
    //         var $displayInput = $modal.find(".displayInput");
    //         var numRows = Number($displayInput.find(".numRows").val());
    //         expect(numRows).to.equal(20);

    //         $modal.find(".displayInput .more").click();
    //         waitForFetch()
    //         .then(function() {
    //             var numRows = Number($displayInput.find(".numRows").val());
    //             expect(numRows).to.equal(30);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should display less rows", function(done) {
    //         var $displayInput = $modal.find(".displayInput");
    //         $modal.find(".displayInput .less").click();

    //         waitForFetch()
    //         .then(function() {
    //             var numRows = Number($displayInput.find(".numRows").val());
    //             expect(numRows).to.equal(20);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     function waitForFetch() {
    //         // XXX it's a hack here to manually add the class
    //         // and wait till fetchGroupbyData finish to remove the class
    //         $scrollSection.addClass("disabled");

    //         var checkFunc = function() {
    //             return !$scrollSection.hasClass("disabled");
    //         };

    //         return UnitTest.testFinish(checkFunc);
    //     }
    // });

    // describe("Sort Behavior Test", function() {
    //     var $sortSection;

    //     before(function() {
    //         $sortSection = $modal.find(".sortSection");
    //     });

    //     it("Default should in origin sort", function() {
    //         expect($sortSection.find(".origin").hasClass("active"))
    //         .to.be.true;
    //     });

    //     it("Should do asc sort", function(done) {
    //         var $asc = $sortSection.find(".asc");
    //         $asc.click();
    //         expect($modal.attr("data-state")).to.equal("pending");

    //         var checkFunc = function() {
    //             return $modal.attr("data-state") === "finished";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($asc.hasClass("active")).to.be.true;
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should do desc sort", function(done) {
    //         var $desc = $sortSection.find(".desc");
    //         $desc.click();
    //         expect($modal.attr("data-state")).to.equal("pending");

    //         var checkFunc = function() {
    //             return $modal.attr("data-state") === "finished";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($desc.hasClass("active")).to.be.true;
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should back to origin sort", function(done) {
    //         var $origin = $sortSection.find(".origin");
    //         $origin.click();
    //         expect($modal.attr("data-state")).to.equal("pending");

    //         var checkFunc = function() {
    //             return $modal.attr("data-state") === "finished";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($origin.hasClass("active")).to.be.true;
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });
    // });

    // describe("Range bucket test", function() {
    //     var $rangeSection;
    //     var $dropdown;

    //     before(function() {
    //         $rangeSection = $modal.find(".rangeSection");
    //         $dropdown = $rangeSection.find(".dropDownList");
    //     });

    //     it("Should in single bucket by default", function() {
    //         expect($dropdown.find("input").val()).to.equal("Single");
    //     });

    //     it("Should range bucket", function(done) {
    //         var $range = $dropdown.find('li[name="range"]');
    //         $range.trigger(fakeEvent.mouseup);
    //         expect($dropdown.find("input").val()).to.equal("Range");

    //         $("#profile-range").val(10).trigger(fakeEvent.enter);
    //         expect($modal.attr("data-state")).to.equal("pending");

    //         var checkFunc = function() {
    //             return $modal.attr("data-state") === "finished";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($modal.find(".bar").length).to.equal(1);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should range log bucket", function(done) {
    //         var $range = $dropdown.find('li[name="rangeLog"]');
    //         $range.trigger(fakeEvent.mouseup);
    //         expect($dropdown.find("input").val()).to.equal("Range (log scale)");

    //         var checkFunc = function() {
    //             return $modal.attr("data-state") === "finished";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($modal.find(".bar").length).to.equal(1);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should fit all", function(done) {
    //         var $fitAll = $dropdown.find('li[name="fitAll"]');
    //         $fitAll.trigger(fakeEvent.mouseup);
    //         expect($modal.attr("data-state")).to.equal("pending");

    //         var checkFunc = function() {
    //             return $modal.attr("data-state") === "finished";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($dropdown.find("input").val()).to.equal("Fit all");
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("Should have correct fit all range values", function() {
    //         var $rangeValues = $("#profileModal g tspan");
    //         expect($rangeValues.size()).to.equal(6);
    //         var previousVal = 0;
    //         if ($rangeValues.size() > 1) {
    //             previousVal = parseInt($rangeValues[0].innerHTML);
    //         }
    //         for (var i = 1; i < $rangeValues.size(); i++) {
    //             var currVal = parseInt($rangeValues[i].innerHTML);
    //             expect(previousVal).to.equal(currVal - 1);
    //             previousVal = currVal;
    //         }
    //     });

    //     it("Should back to single bucket", function(done) {
    //         var $single = $dropdown.find('li[name="single"]');
    //         $single.trigger(fakeEvent.mouseup);
    //         expect($modal.attr("data-state")).to.equal("pending");

    //         var checkFunc = function() {
    //             return $modal.attr("data-state") === "finished";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($dropdown.find("input").val()).to.equal("Single");
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });
    // });

    // describe("Stats Test", function() {
    //     var $statsSection;

    //     before(function() {
    //         $statsSection = $("#profile-stats");
    //     });

    //     it("should gen agg", function(done) {
    //         var $btn = $statsSection.find(".genAgg");
    //         $btn.click();
    //         expect($btn.hasClass("xc-disabled"));

    //         var checkFunc = function() {
    //             return !$btn.hasClass("xc-disabled");
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             var $avg = $statsSection.find(".aggInfo .info").eq(1);
    //             expect($avg.find(".text").text()).to.equal("3.778");
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("should gen stats", function(done) {
    //         var $statsInfo = $statsSection.find(".statsInfo");
    //         expect($statsInfo.hasClass("hasStats")).to.be.false;

    //         $statsInfo.find(".genStats").click();
    //         var checkFunc = function() {
    //             var $zeroQuantile = $statsInfo.find(".info").eq(0);
    //             return $zeroQuantile.find(".text").text() === "1";
    //         };

    //         UnitTest.testFinish(checkFunc)
    //         .then(function() {
    //             expect($statsInfo.hasClass("hasStats")).to.be.true;
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         });
    //     });

    //     it("should click to go to corr modal", function() {
    //         var oldCorr = AggModal.Instance.corrAgg;
    //         var test = false;
    //         AggModal.Instance.corrAgg = function() {
    //             test = true;
    //         };

    //         $("#profile-corr").click();
    //         expect(test).to.be.true;
    //         assert.isFalse($modal.is(":visible"));
    //         AggModal.Instance.corrAgg = oldCorr;
    //     });
    // });

    after(function() {
        delete gTables[tableId];
        $modal.find(".close").click();
        UnitTest.offMinMode();
    });
});