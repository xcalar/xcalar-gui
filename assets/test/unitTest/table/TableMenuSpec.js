describe('TableMenu Test', function() {
    var tableName;
    var prefix;
    var tableId;
    var $table;
    var $tableWrap;
    var $tableMenu;
    var $tableSubMenu;
    var $colMenu;
    var $colSubMenu;
    var $cellMenu;
    var rightMouseup;

    before(function(done) {
        UnitTest.onMinMode();

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            tableName = xcHelper.randName("test") + Authentication.getHashId();
            tableId = xcHelper.getTableId(tableName);
            let tableCols = [];
            tableCols[11] = ColManager.newPullCol("col12", "col12", ColumnType.integer);
            tableCols.push(ColManager.newDATACol());
            gTables[tableId] = new TableMeta({
                tableName: tableName,
                tableId: tableId,
                tableCols: tableCols
            });
            var fakeTable =
            '<div class="xcTableWrap-' + tableId + '">' +
                '<table class="xcTable-"' + tableId + '">' +
                '</table>' +
            '</div>';
            $("#container").append(fakeTable);
            $table = $('#xcTable-' + tableId);
            $tableWrap = $('#xcTableWrap-' + tableId);

            $tableMenu = $('#tableMenu');
            $tableSubMenu = $('#tableSubMenu');
            $colMenu = $('#colMenu');
            $colSubMenu = $('#colSubMenu');
            $cellMenu = $('#cellMenu');
            rightMouseup = {"type": "mouseup", "which": 3};
            done();
        });
    });

    describe('table menu actions', function() {
        before(function() {
            $tableMenu.data("tableId", tableId);
        });

        describe('main menu', function() {
            it('exportTable', function() {
                var cachedFunc = TableMenu.prototype._createNodeAndShowForm;
                var called = false;
                TableMenu.prototype._createNodeAndShowForm = function(type) {
                    expect(type).to.equal(DagNodeType.Export);
                    called = true;
                };

                $tableMenu.find('.exportTable').trigger(rightMouseup);
                expect(called).to.be.false;

                var isUnavailable = false;
                if ($tableMenu.find(".exportTable").hasClass("unavailable")) {
                    isUnavailable = true;
                    // temporarily remove unavailable class for testing
                    $tableMenu.find(".exportTable").removeClass("unavailable");
                }

                $tableMenu.find('.exportTable').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                if (isUnavailable) {
                    $tableMenu.find(".exportTable").addClass("unavailable");
                }
                TableMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it("copyTableName", function() {
                var cachedFunc = xcUIHelper.copyToClipboard;
                var called = false;
                xcUIHelper.copyToClipboard = function() {
                    called = true;
                };

                $tableMenu.find('.copyTableName').trigger(rightMouseup);
                expect(called).to.be.false;
                $tableMenu.find('.copyTableName').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                xcUIHelper.copyToClipboard = cachedFunc;
            });


            it("copyColNames", function() {
                var cachedFunc = xcUIHelper.copyToClipboard;
                var called = false;
                xcUIHelper.copyToClipboard = function() {
                    called = true;
                };
                if (!$tableMenu.find('.copyColNames').length) {
                    $tableMenu.find("ul").append("<li class='copyColNames'></li>");
                }

                $tableMenu.find('.copyColNames').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.copyColNames').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                xcUIHelper.copyToClipboard = cachedFunc;
            });

            it('multiCast', function() {
                var cachedFunc = TableMenu.prototype._createNodeAndShowForm;
                var called = false;
                TableMenu.prototype._createNodeAndShowForm = function(type, tId) {
                    expect(type).to.equal(DagNodeType.Map);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.multiCast').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.multiCast').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                TableMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('corrAgg', function() {
                var cachedFunc = AggModal.Instance.corrAgg;
                var called = false;
                AggModal.Instance.corrAgg = function(tId) {
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $tableMenu.find('.corrAgg').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableMenu.find('.corrAgg').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                AggModal.Instance.corrAgg = cachedFunc;
            });

            describe("advanced", function() {
                it('generateIcv', function() {
                    var oldGetNode = TableMenu.prototype._getCurrentNode;
                    var cachedFunc = TableMenu.prototype._createNodeAndShowForm;
                    var called = false;
                    var node = DagNodeFactory.create({
                        type: DagNodeType.Map
                    });
                    var parentNode = DagNodeFactory.create({
                        type: DagNodeType.Map
                    });
                    node.connectToParent(parentNode);
                    TableMenu.prototype._createNodeAndShowForm = function(type) {
                        expect(type).to.equal(DagNodeType.Map);
                        called = true;
                    };
                    TableMenu.prototype._getCurrentNode = function() {
                        return node;
                    };

                    $tableSubMenu.find(".generateIcv").removeClass("unavailable");
                    $tableSubMenu.find('.generateIcv').trigger(rightMouseup);
                    expect(called).to.be.false;


                    $tableSubMenu.find('.generateIcv').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    TableMenu.prototype._createNodeAndShowForm = cachedFunc;
                    TableMenu.prototype._getCurrentNode = oldGetNode;
                    $tableSubMenu.find(".generateIcv").addClass("unavailable");
                });
                it('complementTable', function() {
                    var oldGetNode = TableMenu.prototype._getCurrentNode;
                    var cachedFunc = TableMenu.prototype._createNodeAndShowForm;
                    var called = false;
                    var node = DagNodeFactory.create({
                        type: DagNodeType.Filter
                    });
                    var parentNode = DagNodeFactory.create({
                        type: DagNodeType.Map
                    });
                    node.connectToParent(parentNode);
                    TableMenu.prototype._createNodeAndShowForm = function(type) {
                        expect(type).to.equal(DagNodeType.Filter);
                        called = true;
                    };
                    TableMenu.prototype._getCurrentNode = function() {
                        return node;
                    };
                    $tableSubMenu.find(".complementTable").removeClass("unavailable");

                    $tableSubMenu.find('.complementTable').trigger(rightMouseup);
                    expect(called).to.be.false;


                    $tableSubMenu.find('.complementTable').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    $tableSubMenu.find(".complementTable").addClass("unavailable");
                    TableMenu.prototype._createNodeAndShowForm = cachedFunc;
                    TableMenu.prototype._getCurrentNode = oldGetNode;
                });

                it('skewDetails', function() {
                    var cachedFunc = SkewInfoModal.Instance.show;
                    var called = false;
                    SkewInfoModal.Instance.show = function(table) {
                        expect(table).to.equal(gTables[tableId]);
                        called = true;
                    };

                    $tableSubMenu.find('.skewDetails').trigger(rightMouseup);
                    expect(called).to.be.false;

                    $tableSubMenu.find('.skewDetails').trigger(fakeEvent.mouseup);
                    expect(called).to.be.true;

                    SkewInfoModal.Instance.show = cachedFunc;
                });
            });
        });

        describe('submenu', function() {
            it('sortForward by name', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, sortType, dir) {
                    expect(tId).to.equal(tableId);
                    expect(sortType).to.equal(ColumnSortType.name);
                    expect(dir).to.equal('forward');
                    called = true;
                };

                $tableSubMenu.find('.sortByName .sortForward')
                .trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortByName .sortForward')
                .trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('sortReverse by name', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, sortType, dir) {
                    expect(tId).to.equal(tableId);
                    expect(sortType).to.equal(ColumnSortType.name);
                    expect(dir).to.equal('reverse');
                    called = true;
                };

                $tableSubMenu.find('.sortByName .sortReverse')
                .trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortByName .sortReverse')
                .trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('sortForward by type', function(done) {
                var cachedFunc = TblManager.sortColumns;
                var called = false;
                TblManager.sortColumns = function(tId, sortType, dir) {
                    expect(tId).to.equal(tableId);
                    expect(sortType).to.equal(ColumnSortType.type);
                    expect(dir).to.equal('forward');
                    called = true;
                };

                $tableSubMenu.find('.sortByType .sortForward')
                .trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.sortByType .sortForward')
                .trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.sortColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('resizeCols', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('header');
                    called = true;
                };

                $tableSubMenu.find('.resizeCols li.sizeToHeader').trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.resizeCols li.sizeToHeader').trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });


            it('resizeCols to fit all', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('all');
                    called = true;
                };

                $tableSubMenu.find('.resizeCols li.sizeToFitAll').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.resizeCols li.sizeToFitAll').eq(0).trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('resizeCols to contents', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('contents');
                    called = true;
                };

                $tableSubMenu.find('.resizeCols li.sizeToContents').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $tableSubMenu.find('.resizeCols li.sizeToContents').eq(0).trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });

        });
    });

    describe('column menu actions', function() {
        before(function() {
            $colMenu.data('tableId', tableId);
            $colMenu.data('colNums', [12]);
            $colMenu.data('colNum', 12);
        });
        describe('main menu', function() {
            it('hideColumn', function() {
                var cachedFunc = ColManager.hideCol;
                var called = false;
                ColManager.hideCol = function(colNums, tId) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.hideColumn').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.hideColumn').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.hideCol = cachedFunc;
            });

            it('minimize', function() {
                var cachedFunc = ColManager.minimizeCols;
                var called = false;
                ColManager.minimizeCols = function(colNums, tId) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.minimize').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.minimize').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.minimizeCols = cachedFunc;
            });

            it('maximize', function() {
                var cachedFunc = ColManager.maximizeCols;
                var called = false;
                ColManager.maximizeCols = function(colNums, tId) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.maximize').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.maximize').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.maximizeCols = cachedFunc;
            });

            it('Set Op panel', function() {
                var cachedFunc = ColMenu.prototype._createNodeAndShowForm;
                var called = false;
                ColMenu.prototype._createNodeAndShowForm = function(type, tId, colNums) {
                    expect(type).to.equal(DagNodeType.Set);
                    expect(colNums[0]).to.equal(12);
                    expect(colNums.length).to.equal(1);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colSubMenu.find('.union').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.union').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('projectView', function() {
                var cachedFunc = ColMenu.prototype._createNodeAndShowForm;
                var called = false;
                ColMenu.prototype._createNodeAndShowForm = function(type, tId, colNums) {
                    expect(type).to.equal(DagNodeType.Project);
                    expect(colNums[0]).to.equal(12);
                    expect(colNums.length).to.equal(1);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.project').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.project').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('join', function() {
                var cachedFunc = ColMenu.prototype._createNodeAndShowForm;
                var called = false;
                ColMenu.prototype._createNodeAndShowForm = function(type, tId, colNums) {
                    expect(type).to.equal(DagNodeType.Join);
                    expect(colNums[0]).to.equal(12);
                    expect(colNums.length).to.equal(1);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.join').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.join').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('aggregate', function() {
                var cachedFunc = ColMenu.prototype._createNodeAndShowForm;
                var called = false;
                ColMenu.prototype._createNodeAndShowForm = function(type, tId, colNums, func) {
                    expect(type).to.equal(DagNodeType.Aggregate);
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.functions.aggregate').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.aggregate').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('filter', function() {
                var cachedFunc = ColMenu.prototype._createNodeAndShowForm;
                var called = false;
                ColMenu.prototype._createNodeAndShowForm = function(type, tId, colNums, func) {
                    expect(type).to.equal(DagNodeType.Filter);
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.functions.filter').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.filter').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('groupby', function() {
                var cachedFunc = ColMenu.prototype._createNodeAndShowForm;
                var called = false;
                ColMenu.prototype._createNodeAndShowForm = function(type, tId, colNums) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(type).to.equal(DagNodeType.GroupBy);
                    called = true;
                };

                $colMenu.find('.functions.groupby').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.groupby').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('map', function() {
                var cachedFunc = ColMenu.prototype._createNodeAndShowForm;
                var called = false;
                ColMenu.prototype._createNodeAndShowForm = function(type, tId, colNums) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(type).to.equal(DagNodeType.Map);
                    called = true;
                };

                $colMenu.find('.functions.map').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.functions.map').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColMenu.prototype._createNodeAndShowForm = cachedFunc;
            });

            it('profile', function() {
                var cachedFunc = Profile.show;
                var called = false;
                Profile.show = function(tId, colNum) {
                    expect(colNum).to.equal(12);
                    expect(tId).to.equal(tableId);
                    called = true;
                };

                $colMenu.find('.profile').trigger(rightMouseup);
                expect(called).to.be.false;

                $colMenu.find('.profile').trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                Profile.show = cachedFunc;
            });
        });

        describe('sub menu', function() {
            it('changeFormat', function() {
                var cachedFunc = ColManager.format;
                var called = false;
                ColManager.format = function(colNums, tId, formats) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(formats[0]).to.equal("percent");
                    called = true;
                };
                $colSubMenu.find('.changeFormat').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.changeFormat').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.format = cachedFunc;
            });

            it("changeFormat multi", function() {
                var cachedFunc = ColManager.format;
                var called = false;
                ColManager.format = function(colNums, tId, formats) {
                    expect(colNums.length).to.equal(1);
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(formats[0]).to.equal("percent");
                    called = true;
                };

                $colSubMenu.find('.changeFormat').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.changeFormat').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.format = cachedFunc;
            });

            it("corrAgg", function() {
                var cachedFunc = AggModal.Instance.corrAgg;
                var called = false;
                AggModal.Instance.corrAgg = function(tId, vertColNums, horColNums) {
                    expect(tId).to.equal(tableId);
                    expect(vertColNums.length).to.equal(1);
                    expect(vertColNums[0]).to.equal(12);
                    expect(horColNums[0]).to.equal(12);
                    called = true;
                };

                $colMenu.find('.corrAgg').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;
                $colMenu.find('.corrAgg').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                AggModal.Instance.corrAgg = cachedFunc;
            });

            it('textAlign', function() {
                var cachedFunc = ColManager.textAlign;
                var called = false;
                ColManager.textAlign = function(colNums, tId, elClass) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(elClass).to.equal('textAlign leftAlign');
                    called = true;
                };

                $colSubMenu.find('li.textAlign').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('li.textAlign').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.textAlign = cachedFunc;
            });

            it('resize to header', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo, colNums) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('header');
                    expect(colNums[0]).to.equal(12);
                    called = true;
                };

                $colSubMenu.find('.resize.sizeToHeader').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.resize.sizeToHeader').eq(0).trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('resize to fit all', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo, colNums) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('all');
                    expect(colNums[0]).to.equal(12);
                    called = true;
                };

                $colSubMenu.find('.resize.sizeToFitAll').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.resize.sizeToFitAll').eq(0).trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('resize to contents', function(done) {
                var cachedFunc = TblManager.resizeColumns;
                var called = false;
                TblManager.resizeColumns = function(tId, resizeTo, colNums) {
                    expect(tId).to.equal(tableId);
                    expect(resizeTo).to.equal('contents');
                    expect(colNums[0]).to.equal(12);
                    called = true;
                };

                $colSubMenu.find('.resize.sizeToContents').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('.resize.sizeToContents').eq(0).trigger(fakeEvent.mouseup);
                setTimeout(function() {
                    expect(called).to.be.true;
                    TblManager.resizeColumns = cachedFunc;
                    done();
                }, 10);
            });

            it('typeList', function() {
                // var cachedFunc = ColManager.changeType;
                // var called = false;
                // ColManager.changeType = function(colTypeInfos, tId) {
                //     expect(colTypeInfos.length).to.equal(1);
                //     expect(colTypeInfos[0].colNum).to.equal(12);
                //     expect(colTypeInfos[0].type).to.equal("boolean");
                //     expect(tId).to.equal(tableId);
                //     called = true;
                //     return PromiseHelper.resolve();
                // };

                // $colSubMenu.find('.typeList').eq(0).trigger(rightMouseup);
                // expect(called).to.be.false;

                // $colSubMenu.find('.typeList').eq(0).trigger(fakeEvent.mouseup);
                // expect(called).to.be.true;

                // ColManager.changeType = cachedFunc;
            });

            it('multi typeList', function() {
                // var cachedFunc = ColManager.changeType;
                // var called = false;
                // ColManager.changeType = function(colTypeInfos, tId) {
                //     expect(colTypeInfos.length).to.equal(2);
                //     expect(colTypeInfos[0].colNum).to.equal(11);
                //     expect(colTypeInfos[0].type).to.equal("boolean");
                //     expect(colTypeInfos[1].colNum).to.equal(12);
                //     expect(colTypeInfos[1].type).to.equal("boolean");
                //     expect(tId).to.equal(tableId);
                //     called = true;
                //     return PromiseHelper.resolve();
                // };

                // $colMenu.data("colNums", [11,12]);

                // $colSubMenu.find('.typeList').eq(0).trigger(rightMouseup);
                // expect(called).to.be.false;

                // $colSubMenu.find('.typeList').eq(0).trigger(fakeEvent.mouseup);
                // expect(called).to.be.true;

                // ColManager.changeType = cachedFunc;
            });

            it('sort', function() {
                var cachedFunc = ColManager.sortColumn;
                var called = false;
                ColManager.sortColumn = function(colNums, tId, order) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(order).to.equal(XcalarOrderingT.XcalarOrderingAscending);
                    called = true;
                };

                $colMenu.data("colNums", [12]);

                $colSubMenu.find('li.sort').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('li.sort').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.sortColumn = cachedFunc;
            });

            it('revSort', function() {
                var cachedFunc = ColManager.sortColumn;
                var called = false;
                ColManager.sortColumn = function(colNums, tId, order) {
                    expect(colNums[0]).to.equal(12);
                    expect(tId).to.equal(tableId);
                    expect(order).to.equal(XcalarOrderingT.XcalarOrderingDescending);
                    called = true;
                };

                $colSubMenu.find('li.revSort').eq(0).trigger(rightMouseup);
                expect(called).to.be.false;

                $colSubMenu.find('li.revSort').eq(0).trigger(fakeEvent.mouseup);
                expect(called).to.be.true;

                ColManager.sortColumn = cachedFunc;
            });
        });
    });

    // XXX fails in jenkins
    describe.skip('cell menu actions', function() {
        before(function() {
            $cellMenu.data("colNum", 12);
            $cellMenu.data("rowNum", 0);
            $cellMenu.data("tableId", tableId);
        });

        it('tdFilter', function() {
            var cachedFunc = CellMenu.prototype._tdFilter;
            var called = false;
            CellMenu.prototype._tdFilter = function(colNum, tId, op) {
                expect(colNum).to.equal(12);
                expect(tId).to.equal(tableId);
                expect(op).to.equal(FltOp.Filter);
                called = true;
            };

            $cellMenu.find('.tdFilter').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdFilter').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            CellMenu.prototype._tdFilter = cachedFunc;
        });

        // it('tdFilter multiple cells', function() {

        //     var table = gTables[tableId];

        //     $table.find('td.col12').eq(0).trigger(fakeEvent.mousedown);

        //     table.highlightedCells = {
        //         "0": {
        //             "12": {
        //                 colNum: 12,
        //                 rowNum: 0,
        //                 val: "3",
        //                 isUndefined: true
        //             }
        //         },
        //         "1": {
        //             "12": {
        //                 colNum: 12,
        //                 rowNum: 1,
        //                 val: "4"
        //             }
        //         },
        //         "2": {
        //             "12": {
        //                 colNum: 12,
        //                 rowNum: 2,
        //                 val: ""
        //             }
        //         }
        //     };

        //     $table.find("th.col12 .header").addClass("type-integer");

        //     var cachedFunc = FilterOpPanel.Instance.show ;
        //     var called = false;
        //     FilterOpPanel.Instance.show  = function(colNum, tId, options) {
        //         expect(colNum).to.equal(12);
        //         expect(tId).to.equal(tableId);
        //         expect(options.filterString).to.equal('or(eq(' + prefix + gPrefixSign + 'yelping_since, 4), not(exists(' + prefix + gPrefixSign + 'yelping_since' + ')))');
        //         expect(options.operator).to.equal("Filter");
        //         called = true;
        //     };

        //     $cellMenu.find('.tdFilter').trigger(rightMouseup);
        //     expect(called).to.be.false;

        //     $cellMenu.find('.tdFilter').trigger(fakeEvent.mouseup);
        //     expect(called).to.be.true;
        //     FilterOpPanel.Instance.show = cachedFunc;
        //     $table.find("th.col12 .header").removeClass("type-integer");
        // });

        // it('tdFilter on mixed column', function() {
        //     var $cell = $table.find('td.col6').filter(function() {
        //         // cannot filter null value
        //         return $(this).find(".displayedData").text() !== "null";
        //     }).eq(0);
        //     $cell.trigger(fakeEvent.mousedown);

        //     var cellText = $cell.find(".displayedData").text();
        //     var cachedFunc = FilterOpPanel.Instance.show;
        //     var called = false;
        //     FilterOpPanel.Instance.show = function(colNum, tId, options) {
        //         expect(colNum).to.equal(6);
        //         expect(tId).to.equal(tableId);
        //         var fltStr;
        //         var colName = prefix + gPrefixSign + 'mixVal';
        //         console.log(cellText);
        //         if (cellText === "FNF") {
        //             fltStr = 'not(exists(' + colName + '))';
        //         } else {
        //             var beStr = (cellText === "" || isNaN(Number(cellText)));
        //             if (cellText !== "true" && cellText !== "false" && beStr) {
        //                 cellText = JSON.stringify(cellText);
        //             }
        //             fltStr = 'eq(' + colName + ', ' + cellText + ')';
        //         }
        //         expect(options.filterString).to.equal(fltStr);
        //         expect(options.operator).to.equal("Filter");
        //         called = true;
        //     };

        //     if ($cellMenu.find('.tdFilter').hasClass("unavailable")) {
        //         console.info("error case", cellText);
        //     }

        //     $cellMenu.find('.tdFilter').trigger(rightMouseup);
        //     expect(called).to.be.false;

        //     $cellMenu.find('.tdFilter').trigger(fakeEvent.mouseup);
        //     expect(called).to.be.true;

        //     FilterOpPanel.Instance.show = cachedFunc;
        // });

        it('tdExclude', function() {
            var cachedFunc = CellMenu.prototype._tdFilter;
            var called = false;
            CellMenu.prototype._tdFilter = function(colNum, tId, op) {
                expect(colNum).to.equal(12);
                expect(tId).to.equal(tableId);
                expect(op).to.equal(FltOp.Exclude);
                called = true;
            };
            $cellMenu.find('.tdExclude').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdExclude').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            CellMenu.prototype._tdFilter = cachedFunc;
        });

        it('tdJsonModal', function() {
            var cachedFunc = JSONModal.Instance.show;
            var called = false;
            JSONModal.Instance.show = function($td, options) {
                expect(options.type).to.equal('integer');
                called = true;
            };

            $cellMenu.find('.tdJsonModal').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdJsonModal').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            JSONModal.Instance.show = cachedFunc;
        });

        it('tdUnnest', function(done) {
            var cachedFunc = ColManager.unnest;
            var called = false;
            ColManager.unnest = function(tId, colNum, rowNum) {
                expect(tId).to.equal(tableId);
                expect(colNum).to.equal(12);
                expect(rowNum).to.equal(0);

                called = true;
            };

            var checkFunc = function() {
                return called === true;
            };

            $cellMenu.find('.tdUnnest').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdUnnest').trigger(fakeEvent.mouseup);
            UnitTest.testFinish(checkFunc)
            .then(function() {
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                ColManager.unnest = cachedFunc;
            });
        });

        it("tdCopy", function() {
            var called = false;
            var cachedFn = document.execCommand;
            var table = gTables[tableId];
            table.highlightedCells = {
                "0": {
                    "1": {
                        colNum: 1,
                        rowNum: 0,
                        val: "testVal"
                    },
                    "2": {
                        colNum: 2,
                        rowNum: 0,
                        val: "otherVal"
                    }
                }
            };

            xcUIHelper.copyToClipboard = function(str) {
                var cellVals = 'testVal, otherVal';
                expect(str).to.equal(cellVals);
                called = true;
            };

            $cellMenu.find('.tdCopy').trigger(rightMouseup);
            expect(called).to.be.false;

            $cellMenu.find('.tdCopy').trigger(fakeEvent.mouseup);
            expect(called).to.be.true;

            xcUIHelper.copyToClipboard = cachedFn;
        });
    });

    describe("cell menu", function() {
        let $table;
        let $th;
        let table;
        let cellMenu;
        let filterOptionCache;

        before(function() {
            cellMenu = TableMenuManager.Instance.cellMenu;
            table =  new TableMeta({
                tableName: "test#testId",
                tableId: "testId",
                tableCols: []
            });
            gTables["testId"] = table;
            table.getCol = () => {
                return {getBackColName: () => "test"}
            };

            $table = $('<table class="table" id="xcTable-testId"></table>');
            $("#container").append($table);
            filterOptionCache = xcHelper.getFilterOptions;
        });
        it("filter integer should work", function() {
            let called = false;
            xcHelper.getFilterOptions = (op, colName, uniqueVals, isExist, isNull) => {
                expect(uniqueVals[4]).to.be.true;
                called = true;
            };
            $table.append($('<th class="col1"><div class="header type-integer"></div></th>'));
            table.highlightedCells = {1: {1: {val: "4"}}};
            cellMenu._tdFilter(1, "testId", "filter");
            expect(called).to.be.true;
        });
        it("filter string should work", function() {
            let called = false;
            xcHelper.getFilterOptions = (op, colName, uniqueVals, isExist, isNull) => {
                expect(uniqueVals['"4"']).to.be.true;
                called = true;
            };
            $table.empty();
            $table.append($('<th class="col1"><div class="header type-string"></div></th>'));
            table.highlightedCells = {1: {1: {val: "4"}}};
            cellMenu._tdFilter(1, "testId", "filter");
            expect(called).to.be.true;
        });
        it("filter timestamp should work", function() {
            let called = false;
            xcHelper.getFilterOptions = (op, colName, uniqueVals, isExist, isNull) => {
                expect(uniqueVals['timestamp("4")']).to.be.true;
                called = true;
            };
            $table.empty();
            $table.append($('<th class="col1"><div class="header type-timestamp"></div></th>'));
            table.highlightedCells = {1: {1: {val: "4"}}};
            cellMenu._tdFilter(1, "testId", "filter");
            expect(called).to.be.true;
        });
        it("filter money should work", function() {
            let called = false;
            xcHelper.getFilterOptions = (op, colName, uniqueVals, isExist, isNull) => {
                expect(uniqueVals['money("4.00")']).to.be.true;
                called = true;
            };
            $table.empty();
            $table.append($('<th class="col1"><div class="header type-money"></div></th>'));
            table.highlightedCells = {1: {1: {val: "4.00"}}};
            cellMenu._tdFilter(1, "testId", "filter");
            expect(called).to.be.true;
        });
        after(() => {
            xcHelper.getFilterOptions = filterOptionCache;
            delete gTables["testId"];
            $table.remove();
        });
    });

    // describe("hot keys", function() {
    //     before(function() {
    //         $table.find('th.col12 .dropdownBox').click();
    //     });
    //     it("hot keys should work", function() {
    //         // j = 74, join

    //         var cachedFunc = JoinOpPanel.Instance.show;
    //         var called = false;
    //         JoinOpPanel.Instance.show = function(tId, colNums) {
    //             called = true;
    //         };

    //         $(document).trigger({"type": "keydown", "which": 74});

    //         $colMenu.find('.join').eq(0).trigger(fakeEvent.mouseup);
    //         expect(called).to.be.true;

    //         JoinOpPanel.Instance.show = cachedFunc;
    //     });

    //     it("toggling keys should work", function() {
    //         $table.find('th.col12 .dropdownBox').click();

    //         expect($colMenu.find(".join .underline").length).to.equal(0);
    //         $(document).trigger({"type": "keydown", "which": keyCode.Alt});
    //         expect($colMenu.find(".join .underline").length).to.equal(1);
    //         expect($colMenu.find(".join .underline").text()).to.equal("J");

    //         $(document).trigger({"type": "keydown", "which": keyCode.Alt});
    //         expect($colMenu.find(".join .underline").length).to.equal(0);
    //     });
    // });

    after(function() {
        $tableWrap.remove();
        delete gTables[tableId];
        UnitTest.offMinMode();
    });
});