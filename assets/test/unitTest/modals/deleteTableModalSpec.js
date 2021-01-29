// XXX TODO, enable it with jest
describe.skip("Delete Table Modal Test", function() {
    var oldGetTables;
    var oldTimestamp;

    before(function() {
        UnitTest.onMinMode();
        oldGetTables = XcalarGetTables;
        // fake the thrift call
        XcalarGetTables = function() {
            var nodeInfo = [{
                "name": "unitTest1#tt1",
                "size": 123
            }, {
                "name": "unitTest2#tt2",
                "size": 123456
            }];

            return PromiseHelper.resolve({
                "numNodes": 2,
                "nodeInfo": nodeInfo
            });
        };

        oldTimestamp = DagTblManager.Instance.getTimeStamp;

        DagTblManager.Instance.getTimeStamp = function(name) {
            return 123219304;
        }
    });

    describe("Basic Functoin Test", function() {
        it("getTableListHTMl should work", function() {
            var tableName = "test#tt1";
            var table = {
                "name": "test#tt1",
                "size": 123456
            };

            var res = DeleteTableModal.Instance._getTableListHTML([table]);
            expect(res).to.contain(tableName);
        });

        it("hasCheckedTables should work", function() {
            var res = DeleteTableModal.Instance._hasCheckedTables();
            expect(res).to.equal(false);
        });
    });

    describe("Public Api and Behavior Test", function() {
        var $modal;
        var $listSection;
        var $alertModal;
        var oldDelete;
        var oldSweep;

        before(function() {
            $modal = $("#deleteTableModal");
            $listSection = $("#deleteTableModal-list");
            $alertModal = $("#alertModal");
            oldDelete = DagTblManager.Instance.deleteTable;
            oldSweep = DagTblManager.Instance.forceDeleteSweep;
        });

        it("Should show the modal", function(done) {
            DeleteTableModal.Instance.show()
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($listSection.find(".grid-unit").length)
                .to.equal(2);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("show modal again should have no side effect", function(done) {
            DeleteTableModal.Instance.show()
            .then(function() {
                assert.isTrue($modal.is(":visible"));
                expect($listSection.find(".grid-unit").length)
                .to.equal(2);
                done();
            })
            .fail(function() {
                throw "error case";
            });
        });

        it("Should toggle checok box", function() {
            var $grid = $listSection.find(".grid-unit").eq(0);
            var $checkbox = $grid.find(".checkbox");
            expect($checkbox.hasClass("checked")).to.be.false;
            // check
            $grid.click();
            expect($checkbox.hasClass("checked")).to.be.true;
            // toggle back
            $grid.click();
            expect($checkbox.hasClass("checked")).to.be.false;
        });

        it("Should toggle check of the whole section", function() {
            var $checkbox = $listSection.find(".titleSection .checkboxSection");
            expect($listSection.find(".checked").length).to.equal(0);
            $checkbox.click();
            // 2 on grid-unit and 1 on title
            expect($listSection.find(".checked").length).to.equal(3);
            // toggle back
            $checkbox.click();
            expect($listSection.find(".checked").length).to.equal(0);
        });

        it("Should sory by name", function() {
            var $nameTitle = $listSection.find(".title.name");
            expect($nameTitle.hasClass("active")).to.be.false;
            var $grid = $listSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest1#tt1");

            // reverse sort
            $nameTitle.find(".label").click();
            expect($nameTitle.hasClass("active")).to.be.true;
            $grid = $listSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest2#tt2");
        });

        it("Should sort by size", function() {
            var $sizeTitle = $listSection.find('.title[data-sortkey="size"]');
            expect($sizeTitle.hasClass("active")).to.be.false;
            // ascending sort
            $sizeTitle.find(".label").click();
            expect($sizeTitle.hasClass("active")).to.be.true;
            var $grid = $listSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest1#tt1");
            // descending sort
            $sizeTitle.find(".label").click();
            expect($sizeTitle.hasClass("active")).to.be.true;
            $grid = $listSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest2#tt2");
        });

        it("Should sort by date", function() {
            // their date is unkown
            var $dateTitle = $listSection.find('.title[data-sortkey="date"]');
            expect($dateTitle.hasClass("active")).to.be.false;
            // ascending sort
            $dateTitle.find(".label").click();
            expect($dateTitle.hasClass("active")).to.be.true;
            var $grid = $listSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest1#tt1");
            // descending sort
            $dateTitle.find(".label").click();
            expect($dateTitle.hasClass("active")).to.be.true;
            $grid = $listSection.find(".grid-unit").eq(0);
            expect($grid.find(".name").text()).to.equal("unitTest2#tt2");
        });

        it("Should keep checkbox when sort", function() {
            var $grid = $listSection.find(".grid-unit").eq(0);
            $grid.click();
            var name = $grid.find(".name").text();
            expect($grid.find(".checkbox").hasClass("checked")).to.be.true;
            // sort by name
            $listSection.find(".title.name").click();
            $checkbox = $listSection.find(".checked");
            expect($checkbox.length).to.equal(1);
            // verify it's the same grid
            var $sameGrid = $checkbox.closest(".grid-unit");
            expect($sameGrid.find(".name").text()).to.equal(name);
        });

        it("Should show alert when submit", function() {
            $modal.find(".confirm").click();
            assert.isTrue($alertModal.is(":visible"));

            $alertModal.find(".cancel").click();
            assert.isFalse($alertModal.is(":visible"));
        });

        it("Should handle submit error", function() {
            DagTblManager.Instance.deleteTable = function(name, truth, truth2) {
                return;
            };

            DagTblManager.Instance.forceDeleteSweep = function() {
                return PromiseHelper.reject({"fails": [{
                    "tables": "unitTest1#tt1",
                    "error": "test"
                }]})
            };
            $modal.find(".confirm").click();
            assert.isTrue($alertModal.is(":visible"));
            $alertModal.find(".confirm").click();
            assert.isFalse($alertModal.is(":visible"));

            assert.isTrue($("#statusBox").is(":visible"));
            expect($listSection.find(".checked").length).to.eq(0);
            StatusBox.forceHide();
        });

        it("Should submit form", function() {
            DagTblManager.Instance.deleteTable = function(name, truth, truth2) {
                return;
            };

            DagTblManager.Instance.forceDeleteSweep = function() {
                return PromiseHelper.resolve();
            }

            $listSection.find(".grid-unit").eq(0).click();
            expect($listSection.find(".checked").length).to.eq(1);
            $modal.find(".confirm").click();
            assert.isTrue($alertModal.is(":visible"));
            $alertModal.find(".confirm").click();
            assert.isFalse($alertModal.is(":visible"));
        });

        it("Should close the modal", function() {
            $modal.find(".cancel").click();
            assert.isFalse($modal.is(":visible"));
        });

        after(function() {
            DagTblManager.Instance.deleteTable = oldDelete;
            DagTblManager.Instance.forceDeleteSweep = oldSweep;
        });
    });

    describe('failHandler test error messages', function() {
        before(function() {
            StatusBox.forceHide();
        });

        it('1 regular fail, 1 locked fail', function() {
            DeleteTableModal.Instance._failHandler(["fakeTable"]);
            expect($("#statusBox").is(":visible")).to.be.false;

            DeleteTableModal.Instance._failHandler([{
                "fails": [{
                    "tables": "unitTest1#tt1",
                    "error": "test"
                }, {
                    "tables": "unitTest1#tt1",
                    "error": ErrTStr.CannotDropLocked
                }]
            }]);

            UnitTest.hasStatusBoxWithError("test. " + ErrTStr.NoResultSetDeleted);
        });

        it('1 success, 1 regular fail, 1 locked fail', function() {
            DeleteTableModal.Instance._failHandler([["fakeTable"], {
                "fails": [{
                    "tables": "unitTest1#tt1",
                    "error": "test"
                }, {
                    "tables": "unitTest1#tt1",
                    "error": ErrTStr.CannotDropLocked
                }]
            }]);

            UnitTest.hasStatusBoxWithError("test. " + StatusMessageTStr.PartialDeleteResultSetFail + ".");
        });

        it('1 success, 1 locked fail', function() {
            DeleteTableModal.Instance._failHandler([["fakeTable"], {
                "fails": [{"tables": "unitTest1#tt1",
                            "error": ErrTStr.CannotDropLocked
                        }]
            }]);

            UnitTest.hasStatusBoxWithError(ErrTStr.CannotDropLocked + ". Result set unitTest1#tt1 was not dropped.");
        });
    });

    after(function() {
        UnitTest.offMinMode();
        XcalarGetTables = oldGetTables;
        DagTblManager.Instance.getTimeStamp = oldTimestamp;
    });
});