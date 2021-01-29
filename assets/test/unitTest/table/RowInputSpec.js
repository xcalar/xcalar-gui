// XXX temporary disable it
describe.skip("RowInput Test", function() {
    var testDs;
    var tableName;
    var tableId;
    var $table;
    var $input;
    var tabId;

    before(function(done) {
        console.clear();
        UnitTest.onMinMode();
        var testDSObj = testDatasets.fakeYelp;
        UnitTest.addAll(testDSObj, "unitTestFakeYelp")
        .then(function(ds, tName, tPrefix, _nodeId, _tabId) {
            testDs = ds;
            tableName = tName;
            tableId = xcHelper.getTableId(tableName);
            $table = $('#xcTable-' + tableId);
            $input = $(".rowInputArea input");
            tabId = _tabId;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("row input", function() {
        var cachedAddRows;
        before(function() {
            cachedAddRows = RowManager.prototype.addRows;
        });

        it("enter should not work if table is locked", function() {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
            };
            gTables[tableId].lock();
            $input.val(100).trigger(fakeEvent.enter);
            expect(addRowsCalled).to.be.false;
            gTables[tableId].unlock();
        });

        it("enter should not work if table is in scroll", function() {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
            };
            $table.addClass("scrolling");
            $input.val(100).trigger(fakeEvent.enter);
            expect(addRowsCalled).to.be.false;
            $table.removeClass("scrolling");
        });

        it("enter should not work if table is not scrollable", function() {
            var cache = TblFunc.isTableScrollable;
            var isScrollableCalled = false;
            TblFunc.isTableScrollable = function() {
                isScrollableCalled = true;
                return false;
            };
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            $input.val(100).trigger(fakeEvent.enter);
            expect(isScrollableCalled).to.be.true;
            expect(addRowsCalled).to.be.false;
            expect($input.val()).to.equal("1");
            expect($input.data("val")).to.equal(1);

            TblFunc.isTableScrollable = cache;
        });

        it("invalid input should not work", function() {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            $input.val("five");
            expect($input.val()).to.equal("");

            $input.val(100.5).trigger(fakeEvent.enter);
            expect(addRowsCalled).to.be.false;
            expect($input.val()).to.equal("1");
        });

        // to row 100
        it("valid input should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.be.lt(100);
                expect(numRowsToAdd).to.equal(60);
                expect(dir).to.equal(RowDirection.Bottom);
                expect(info.bulk).to.be.true;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            $input.val(100).trigger(fakeEvent.enter);
            UnitTest.wait(1)
            .then(function() {
                expect(addRowsCalled).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        // to row 0
        it("valid input should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.equal(0);
                expect(numRowsToAdd).to.equal(60);
                expect(dir).to.equal(RowDirection.Bottom);
                expect(info.bulk).to.be.true;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            $input.val(0).trigger(fakeEvent.enter);
            UnitTest.wait(1)
            .then(function() {
                expect(addRowsCalled).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            RowManager.prototype.addRows = cachedAddRows;
        });
    });

    // cannot work because cannot always trigger scrolling
    describe.skip("scrollbar scroll", function() {
        var $scrollBar;
        var $tbodyWrap;
        var table;
        var cachedAddRows;
        var scrollTriggered = false;

        before(function(){
            $scrollBar = $("#xcTableWrap-" + tableId).find(".tableScrollBar");
            $tbodyWrap = $("#xcTbodyWrap-" + tableId);
            table = gTables[tableId];
            cachedAddRows = RowManager.prototype.addRows;
            $scrollBar.on("scroll.unitTest", function() {
                scrollTriggered = true;
            });
        });

        it("scrolling on scrollbar should work", function(done) {
            table.scrollMeta.isTableScrolling = false;
            expect(table.scrollMeta.isBarScrolling).to.be.false;
            expect($scrollBar.scrollTop()).to.not.equal(50);
            scrollTriggered = false;
            $(window).focus();
            $scrollBar.scrollTop(50);

            if (!ifvisible.now()) {
                $scrollBar.scroll();
            }

            UnitTest.testFinish(function () {
                console.log("top", $tbodyWrap.scrollTop(), $scrollBar.scrollTop());
                return $tbodyWrap.scrollTop() === 50;
            })
            .then(function() {
                expect($tbodyWrap.scrollTop()).to.equal(50);
                return UnitTest.wait(1);
            })
            .then(function() {
                table.scrollMeta.isBarScrolling = false;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("dragging scrollbar should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function() {
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };
            scrollTriggered = false;
            $scrollBar.trigger(fakeEvent.mousedown);
            $scrollBar.scrollTop(100);

            if (!ifvisible.now()) {
                $scrollBar.scroll();
            }
            gTables[tableId].rowHeights[0] = {1: 300};

            UnitTest.testFinish(function() {
                return $scrollBar.scrollTop() === 100;
            })
            .then(function() {
                return UnitTest.testFinish(function() {
                    return addRowsCalled === false;
                });
            })
            .then(function() {
                expect(table.scrollMeta.isBarScrolling).to.be.false;
                expect($tbodyWrap.scrollTop()).to.equal(50);
                $(document).mouseup();

                return UnitTest.testFinish(function() {
                    return $tbodyWrap.scrollTop() === 100;
                });
            })
            .then(function() {
                expect($tbodyWrap.scrollTop()).to.equal(100);
                expect(addRowsCalled).to.be.true;
                delete gTables[tableId].rowHeights[0];
                return UnitTest.wait(1);
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            RowManager.prototype.addRows = cachedAddRows;
            $scrollBar.off("scroll.unitTest");
        });
    });

    describe.skip("table scrolling", function() {
        var $scrollBar;
        var $tbodyWrap;
        var cachedAddRows;

        before(function(){
            $scrollBar = $("#xcTableWrap-" + tableId).find(".tableScrollBar");
            $tbodyWrap = $("#xcTbodyWrap-" + tableId);
            $table.removeClass('autoScroll');
            cachedAddRows = RowManager.prototype.addRows;
        });

        it("scrolling down should work", function(done) {
            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.equal(60);
                expect(numRowsToAdd).to.equal(20);
                expect(dir).to.equal(RowDirection.Bottom);
                expect(info.bulk).to.be.false;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            var scrollBarTop = $scrollBar.scrollTop();
            $tbodyWrap.scrollTop(10000);

            if (!ifvisible.now()) {
                $tbodyWrap.scroll();
            }

            UnitTest.testFinish(function() {
                return $scrollBar.scrollTop() > scrollBarTop || $tbodyWrap.scrollTop() > 0;
            })
            .then(function() {
                expect(addRowsCalled).to.be.true;
                expect($scrollBar.scrollTop()).to.be.gt(scrollBarTop);
                return UnitTest.wait(300);
            })
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it.skip("scrolling up should work", function(done) {
            $table.find(".row0").removeClass("row0").addClass("tempRow0");

            var addRowsCalled = false;
            RowManager.prototype.addRows = function(backRow, numRowsToAdd, dir, info) {
                expect(backRow).to.equal(0);
                expect(numRowsToAdd).to.equal(0);
                expect(dir).to.equal(RowDirection.Top);
                expect(info.bulk).to.be.false;
                addRowsCalled = true;
                return PromiseHelper.resolve();
            };

            var scrollBarTop = $scrollBar.scrollTop();
            $tbodyWrap.scrollTop(0);
            if (!ifvisible.now()) {
                $tbodyWrap.scroll();
            }

            UnitTest.testFinish(function() {
                return $scrollBar.scrollTop() < scrollBarTop;
            })
            .then(function() {
                expect(addRowsCalled).to.be.true;
                expect($scrollBar.scrollTop()).to.be.lt(scrollBarTop);
                $table.find(".tempRow0").removeClass("tempRow0").addClass("row0");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        after(function() {
            RowManager.prototype.addRows = cachedAddRows;
        });
    });

    after(function(done) {
        delete gTables["fakeTable"];
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