// XXX temporary disable it
describe.skip('TblAnim Test', function() {
    var testDs;
    var tableName;
    var tableId;
    var $table;
    var tableName2;
    var tabId;

    before(function(done) {
        console.log("TblAnim Test");
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(() => {
            var testDSObj = testDatasets.fakeYelp;
            UnitTest.addAll(testDSObj, "unitTestFakeYelp")
            .then(function(ds, tName, tPrefix, _nodeId, _tabId) {
                testDs = ds;
                tableName = tName;
                tabId = _tabId;
                tableId = xcHelper.getTableId(tableName);
                $table = $('#xcTable-' + tableId);
                done();
            });
        });
    });

    describe('column resize for table', function() {
        var $el;
        var $th;
        var startWidth;
        var startX = 0;
        var table;
        var progCol;

        before(function() {
            $el = $table.find('.colGrab').eq(0);
            $th = $el.closest('th');
            startWidth = $th.outerWidth();
            startX = 0;
            table = gTables[tableId];
            progCol = table.tableCols[0];
        });

        it('startColResize should work', function() {
            expect(TblAnim.mouseStatus).to.be.null;
            expect(startWidth).to.be.gt(50);

            var e = $.Event('mousedown', {pageX: startX});
            TblAnim.startColResize($el, e);

            expect(TblAnim.mouseStatus).to.equal("checkingResizeCol");
            expect(gRescol.index).to.equal(1);
            expect(gRescol.startWidth).to.equal(startWidth);
            expect(gRescol.newWidth).to.equal(startWidth);
            expect($('#resizeCursor').length).to.equal(0);
        });

        // xx need to test on hidden col
        it('checkColResize should work', function() {
            expect(TblAnim.mouseStatus).to.equal("checkingResizeCol");
            expect($table.hasClass('resizingCol')).to.be.false;

            var newX = 1;
            var e = $.Event('mousemove', {pageX: newX});
            TblAnim.__testOnly__.checkColResize(e);

            expect(TblAnim.mouseStatus).to.equal("checkingResizeCol");
            expect($table.hasClass('resizingCol')).to.be.false;
            expect($('#resizeCursor').length).to.equal(0);

            newX = 5;
            e = $.Event('mousemove', {pageX: newX});

            TblAnim.__testOnly__.checkColResize(e);

            expect(TblAnim.mouseStatus).to.equal('resizingCol');
            expect($table.hasClass('resizingCol')).to.be.true;
            expect($('#resizeCursor').length).to.equal(1);
        });

        it('onColResize should work', function() {
            expect($th.outerWidth()).to.equal(gRescol.newWidth);

            // moving mouse all the way to left edge of cell
            // should hit a minimum width
            var newX = -startWidth;
            var e = $.Event('mousemove', {pageX: newX});
            TblAnim.__testOnly__.onColResize(e);

            expect(TblAnim.mouseStatus).to.equal('resizingCol');
            expect(gRescol.cellMinWidth).to.equal(15);
            expect($th.outerWidth()).to.equal(gRescol.cellMinWidth);
            // increasing width by 10px
            newX = 10;
            e = $.Event('mousemove', {pageX: newX});
            TblAnim.__testOnly__.onColResize(e);
            expect($th.outerWidth()).to.equal(startWidth + newX);
        });

        it('endColResize should work', function() {
            expect(TblAnim.mouseStatus).to.equal('resizingCol');
            expect($('#resizeCursor').length).to.equal(1);
            expect(progCol.sizedTo).to.equal("header");

            TblAnim.__testOnly__.endColResize();

            expect(TblAnim.mouseStatus).to.be.null;
            expect(progCol.isMinimized).to.be.false;
            expect(progCol.width).to.equal(startWidth);
            progCol = table.tableCols[0];
            expect(progCol.width).to.equal(startWidth + 10);
            // based on onColResize width
            expect($th.outerWidth()).to.equal(startWidth + 10);
            expect($('#resizeCursor').length).to.equal(0);
            expect(progCol.sizedTo).to.equal("auto");
        });
    });


    describe('dblClickResize', function() {
        var $el;
        var $th;
        var startWidth;
        var table;
        var progCol;

        before(function() {
            $el = $table.find('.colGrab').eq(0);
            $th = $el.closest('th');
            startWidth = $th.outerWidth();
            table = gTables[tableId];
            progCol = table.tableCols[0];
        });

        // XXX may be related to the change of XD-1222 that breaks it
        it.skip("dblClickResize should work", function() {
            var resize = TblAnim.__testOnly__.dblClickResize;
            var originalWidth = progCol.width;
            expect(startWidth).to.equal(originalWidth);
            expect(progCol.sizedTo).to.equal("auto");

            gRescol.clicks = 2;
            resize($el, null, null);
            expect(progCol.sizedTo).to.equal("header");
            expect(gRescol.clicks).to.equal(0);
            expect(progCol.width).to.equal(startWidth - 10);
            expect($th.outerWidth()).to.equal(startWidth - 10);
        });
    });

    describe('test TblAnim.resizeColumn', function() {
        it('TblAnim.resizeColumn should work', function() {
            var $th = $table.find('th.col1');
            var initialWidth = $th.outerWidth();
            TblAnim.resizeColumn(tableId, 1, initialWidth, 90, "auto");
            expect($th.outerWidth()).to.equal(90);

            var table = gTables[tableId];
            var progCol = table.tableCols[0];
            expect(progCol.sizedTo).to.equal("auto");
        });
    });

    describe('Row resize', function() {
        var $el;
        var $td;
        var startHeight;
        var startY = 0;
        var rowInfo;

        before(function() {
            $el = $table.find('.rowGrab').eq(1);
            $td = $el.closest('tr').prev().find('td').eq(0);
            $tr = $el.closest('tr').prev();
            startHeight = $td.outerHeight();
            startY = 0;
            rowInfo = TblAnim.__testOnly__.rowInfo;
        });

        it('startRowResize should work', function() {
            expect(TblAnim.mouseStatus).to.be.null;
            expect(startHeight).to.equal(21);

            var e = $.Event('mousedown', {pageY: startY});

            TblAnim.startRowResize($el, e);

            expect(TblAnim.mouseStatus).to.equal("checkingRowMove");
            expect(rowInfo.startHeight).to.equal(startHeight);
            expect($('#rowResizeCursor').length).to.equal(0);
            expect($tr.find('td > div').eq(0).css('max-height')).to.equal("none");
            expect($tr.find('td > div').eq(1).css('max-height')).to.equal("none");
        });

        it('checkRowResize should work', function() {
            expect(TblAnim.mouseStatus).to.equal("checkingRowMove");

            var newY = 0;
            var e = $.Event('mousemove', {pageY: newY});
            TblAnim.__testOnly__.checkRowResize(e);

            expect(TblAnim.mouseStatus).to.equal("checkingRowMove");
            expect($('#rowResizeCursor').length).to.equal(0);
            expect($tr.find('td > div').eq(0).css('max-height')).to.equal("none");
            expect($tr.find('td > div').eq(1).css('max-height')).to.equal("none");

            newY = 5;
            e = $.Event('mousemove', {pageY: newY});

            TblAnim.__testOnly__.checkRowResize(e);

            expect(TblAnim.mouseStatus).to.equal('rowMove');
            expect($('#rowResizeCursor').length).to.equal(1);
            expect($tr.find('td > div').eq(0).css('max-height')).to.equal("21px");
            expect($tr.find('td > div').eq(1).css('max-height')).to.equal("17px");
            expect($tr.outerHeight()).to.equal(21);
        });

        it('onRowResize should work', function() {
            expect($td.outerHeight()).to.equal(rowInfo.startHeight);

            // moving mouse all the way to upper edge of cell
            // should hit a minimum height
            var newY = -startHeight;
            var e = $.Event('mousemove', {pageY: newY});
            TblAnim.__testOnly__.onRowResize(e);

            expect(TblAnim.mouseStatus).to.equal('rowMove');
            expect(gRescol.minCellHeight).to.equal(21);
            expect($tr.outerHeight()).to.equal(gRescol.minCellHeight);
            // increasing height by 10px
            newY = 10;
            e = $.Event('mousemove', {pageY: newY});
            TblAnim.__testOnly__.onRowResize(e);
            expect($tr.outerHeight()).to.equal(startHeight + newY);
            expect($tr.find('td > div').eq(0).css('max-height')).to.equal("31px");
            expect($tr.find('td > div').eq(1).css('max-height')).to.equal("27px");
        });

        it('endRowResize should work', function() {
            expect(TblAnim.mouseStatus).to.equal('rowMove');
            expect($('#rowResizeCursor').length).to.equal(1);

            TblAnim.__testOnly__.endRowResize();

            expect(TblAnim.mouseStatus).to.be.null;
            var table = gTables[tableId];
            var rowObj = table.rowHeights;
            expect(rowObj[0]).to.be.an('object');
            expect(rowObj[1]).to.be.undefined;
            expect(rowObj[0][1]).to.equal(31);
            expect(rowObj[0][2]).to.undefined;

            expect($tr.hasClass('changedHeight')).to.be.true;

            // based on onRowResize height
            expect($tr.outerHeight()).to.equal(31);
            expect($('#rowResizeCursor').length).to.equal(0);
        });
    });

    describe('test TblAnim.resizeRow', function() {
        it('TblAnim.resizeRow should work', function() {
            var $tr = $table.find('tbody tr').eq(0);
            var initialHeight = $tr.outerHeight();

            TblAnim.resizeRow(0, tableId, initialHeight, 90);

            expect($tr.outerHeight()).to.equal(90);
            expect($tr.find('td > div').eq(0).css('max-height')).to.equal("90px");
            expect($tr.find('td > div').eq(1).css('max-height')).to.equal("86px");

            var table = gTables[tableId];
            var rowObj = table.rowHeights;
            expect(rowObj[0]).to.be.an('object');
            expect(rowObj[0][1]).to.equal(90);
            expect($tr.outerHeight()).to.equal(90);
            expect($('#rowResizeCursor').length).to.equal(0);
            expect($tr.hasClass('changedHeight')).to.be.true;

            // resize to below minimum height
            TblAnim.resizeRow(0, tableId, 90, 10);
            expect($tr.outerHeight()).to.equal(21);
            expect($tr.find('td > div').eq(0).css('max-height')).to.equal("21px");
            expect($tr.find('td > div').eq(1).css('max-height')).to.equal("17px");

            table = gTables[tableId];
            rowObj = table.rowHeights;
            expect(rowObj[0]).to.be.undefined;
            expect($tr.hasClass('changedHeight')).to.be.false;
        });
    });

    // XXX this test is broken since the change of layout
    describe.skip('column drag', function() {
        var $el;
        var $th;
        var startWidth;
        var startX = 0;
        var dragInfo;

        before(function() {
            $el = $table.find('th.col1');
            $th = $el;
            startWidth = $th.outerWidth();
            startX = 0;
            dragInfo = TblAnim.__testOnly__.dragInfo;
        });

        it('startColDrag should work', function() {
            expect(TblAnim.mouseStatus).to.be.null;
            expect(startWidth).to.be.gt(50);
            expect($table.find('th').index($th)).to.equal(1);

            var e = $.Event('mousedown', {pageX: startX});
            TblAnim.startColDrag($el, e);

            expect(TblAnim.mouseStatus).to.equal("checkingMovingCol");
            expect($('#moveCursor').length).to.equal(1);
        });

        it('checkColDrag should work', function() {
            // should not trigger move
            var newX = 1;
            var e = $.Event('mousemove', {pageX: newX});
            TblAnim.__testOnly__.checkColDrag(e);
            expect(TblAnim.mouseStatus).to.equal("checkingMovingCol");

            newX = 5;
            e = $.Event('mousemove', {pageX: newX});
            TblAnim.__testOnly__.checkColDrag(e);
            expect(TblAnim.mouseStatus).to.equal("dragging");
            var numCols = gTables[tableId].tableCols.length;
            expect(numCols).to.be.gt(5);
            expect($("#fauxCol").length).to.equal(1);
            expect($("#shadowDiv").length).to.equal(1);
            expect($(".dropTarget").length).to.equal(numCols - 1);
        });

        it('onColDrag should work', function() {
            newX = 10;
            var e = $.Event('mousemove', {pageX: newX});
            TblAnim.__testOnly__.onColDrag(e);

            expect(dragInfo.pageX).to.equal(newX);
            expect(dragInfo.fauxCol.css('left')).to.equal((-MainMenu.getOffset() + 5) + "px");
        });

        it('faux column should be correctly positioned', function() {
            var $fauxCol = $('#fauxCol');
            expect($fauxCol.length).to.equal(1);
            expect($fauxCol.offset().top).to.equal($th.find('.header').offset().top);
            expect($fauxCol.width()).to.equal($th.width());
        });

        it('dragdropSwapColumns should work', function() {
            var swap = TblAnim.__testOnly__.dragdropSwapColumns;
            var $dropTarget = $('.dropTarget').eq(0);
            expect(dragInfo.colIndex).to.equal(1);

            swap($dropTarget);
            expect(dragInfo.colIndex).to.equal(2);

            swap($dropTarget);
            expect(dragInfo.colIndex).to.equal(1);

            swap($dropTarget);
            expect(dragInfo.colIndex).to.equal(2);
        });


        it('endColDrag should work', function() {
            expect(TblAnim.mouseStatus).to.equal("dragging");
            TblAnim.__testOnly__.endColDrag();
            expect(TblAnim.mouseStatus).to.be.null;
            expect($("#fauxCol").length).to.equal(0);
            expect($("#shadowDiv").length).to.equal(0);
            expect($(".dropTarget").length).to.equal(0);
            expect($('#moveCursor').length).to.equal(0);
            expect($table.find('th').index($th)).to.equal(2);
        });
    });

    after(function(done) {
        UnitTest.deleteTab(tabId)
        .then(() => {
            return UnitTest.deleteAllTables();
        })
        .always(function() {
            UnitTest.deleteAll(tableName, testDs)
            .always(function() {
                done();
            });
        });
    });
});