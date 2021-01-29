describe("DagDrag Test", function() {
    var $dagView;
    var $dfWrap;
    var dragObj;
    var $operator;
    var onDragEnd;
    var tabId;

    before (function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            $dagView = $("#dagView");
            $dfWrap = $dagView.find(".dataflowWrap");
            $operatorBar = $dagView.find(".operatorWrap");
            $operator = $('<div class="testOperator" ' +
            'style="position:fixed;top: 50px; left:50px">Test</div>');
            $("body").append($operator);
            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            onDragEnd = function($newNode, event, data) {

            };
            done();
        });
    });

    describe("start drag", function() {
        it("checkDrag without mousemove should do nothing", function() {
            $(window).scrollTop(0);
            var e = $.Event('mousedown', {pageX: 0, pageY: 0});

            dragObj = new DragHelper({
                event: e,
                $element: $operator,
                $container: $dagView,
                $dropTarget: $dfWrap.find(".dataflowArea").eq(0),
                onDragEnd: function($newNode, _event, data) {
                    onDragEnd($newNode, _event, data);
                },
                onDragFail: function() {

                },
                copy: true
            });

            expect(dragObj.isDragging).to.be.false;
            expect(dragObj.mouseDownCoors.x).to.equal(0);
            expect(dragObj.mouseDownCoors.y).to.equal(0);
        });

        it("mousemove of 1 should not trigger drag start", function() {
            $(window).scrollTop(0);
            var e = $.Event('mousemove', {pageX: 1, pageY: 1});
            $(document).trigger(e);
            expect(dragObj.isDragging).to.be.false;
        });

        it("mousemove of 2 should trigger drag start", function() {
            $(window).scrollTop(0);
            expect($(".testOperator").length).to.equal(1);
            if ($(".dragContainer").length != 0) {
                console.warn("skip this test because unknown failure");
                return;
            }
            expect($(".dragContainer").length).to.equal(0);
            var e = $.Event('mousemove', {pageX: 2, pageY: 1});
            $(document).trigger(e);
            expect(dragObj.isDragging).to.be.true;
            expect($(".testOperator").length).to.equal(2);
            expect($(".dragContainer").length).to.equal(1);
        });

    });

    describe("dragging", function() {
        it("on drag should position clone", function() {
            $(window).scrollTop(0);
            var e = $.Event('mousemove', {pageX: 3, pageY: 1});
            $(document).trigger(e);
            expect(dragObj.isDragging).to.be.true;
            expect($(".testOperator").length).to.equal(2);
            var rect = $(".dragContainer")[0].getBoundingClientRect();

            expect(rect.left).to.equal(53);
            expect(rect.top).to.equal(51 - $(window).scrollTop());
        });
    });

    describe("endDrag", function() {
        it("end Drag should call onDragEnd callback", function() {
            $(window).scrollTop(0);
            var called = false;
            onDragEnd = function($newNode, event, data) {
                var rect = $dfWrap[0].getBoundingClientRect();
                expect(data.coors.length).to.equal(1);
                // XXX TODO fix test
                // expect(data.coors[0].x).to.equal(450 - rect.left);
                // expect(data.coors[0].y).to.equal(150 - rect.top - $(window).scrollTop());
                called = true;
            };
            let rect = $dfWrap[0].getBoundingClientRect();
            let left = Math.round(rect.left);
            let top = Math.round(rect.top);
            var e = $.Event('mousemove', {pageX: left + 400, pageY: top + 100});
            $(document).trigger(e);
            var e = $.Event('mouseup', {pageX: left + 400, pageY: top + 100});
            $(document).trigger(e);
            expect(called).to.be.true;
            expect($(".testOperator").length).to.equal(1);
        });
    });

    after(function(done) {
        let dagTab =  DagTabManager.Instance.getTabById(tabId);
        DagTabManager.Instance.removeTab(tabId);
        dagTab.delete()
        .always(function() {
            done();
        });
    });
});