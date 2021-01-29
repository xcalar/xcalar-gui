describe("DagComment Test", function() {
    let $dagView;
    let $dfWrap;
    let $dfArea;
    let tabId;
    let oldPut;
    let cachedUserPref;
    let node;

    before(function(done) {
        console.log("DagComment Test");
        UnitTest.onMinMode();
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            $dfArea = $dfWrap.find(".dataflowArea.active");
            cachedUserPref = UserSettings.Instance.getPref;
            UserSettings.Instance.getPref = function(val) {
                if (val === "dfAutoExecute" || val === "dfAutoPreview") {
                    return false;
                } else {
                    return cachedUserPref(val);
                }
            };
            done();
        });
    });

    it("should draw new comment", function() {
        let commentInfo = {
            id: "comment_someId",
            text: "something",
            display: {x: 100, y: 100, height: 200, width: 200}
        };
        node = new CommentNode(commentInfo);
        expect($dfArea.find(".comment").length).to.equal(0);
        DagComment.Instance.drawComment(node, $dfArea);
        expect($dfArea.find(".comment").length).to.equal(1);
        expect($dfArea.find(".comment").find("textarea").val()).to.equal("something");
        expect($dfArea.find(".comment").hasClass("selected")).to.be.false;
        expect($dfArea.find(".comment").attr("style")).to.equal("left:100px;top:100px;width:200px;height:200px;");
        expect($dfArea.find(".tempCommentArea").length).to.equal(0);
    });

    it("should remove comment", function() {
        expect($dfArea.find(".comment").length).to.equal(1);
        DagComment.Instance.removeComment("comment_someId");
        expect($dfArea.find(".comment").length).to.equal(0);
    });

    it('should draw comment and focus', function() {
        let commentInfo = {
            id: "comment_someId",
            text: "something",
            display: {x: 100, y: 100, height: 200, width: 200}
        };
        node = new CommentNode(commentInfo);
        expect($dfArea.find(".comment").length).to.equal(0);
        DagComment.Instance.drawComment(node, $dfArea, true, true);
        expect($dfArea.find(".comment").length).to.equal(1);
        expect($dfArea.find(".comment").find("textarea").val()).to.equal("something");
        expect($dfArea.find(".comment").hasClass("selected")).to.be.true;
        expect($dfArea.find(".tempCommentArea").length).to.equal(1);
        expect($dfArea.find(".tempCommentArea .comment").attr("style")).to.equal("left:100px;top:100px;width:200px;height:200px;");
    });

    it("edit comment should work", function() {
        let commentInfo = {
            id: "comment_someId",
            text: "something",
            display: {x: 100, y: 100, height: 200, width: 200}
        };
        node = new CommentNode(commentInfo);
        let graph = DagViewManager.Instance.getActiveDag();
        let called = false;
        let cacheFn = graph.getComment;
        graph.getComment = () => {
            called = true;
            return node;
        };

        $dfArea.find(".comment textarea").blur();
        DagComment.Instance.updateText("comment_someId", graph.getTabId(), "newtext");
        expect(called).to.be.true;
        expect(node.getText()).to.equal("newtext");
        expect($dfArea.find(".comment").find("textarea").val()).to.equal("newtext");

        graph.getComment = cacheFn;
    });

    it("should resize", function() {
        let graph = DagViewManager.Instance.getActiveDag();
        let cacheFn = graph.getComment;
        graph.getComment = () => {
            return node;
        };
        var $bar = $dfArea.find(".comment").find(".ui-resizable-e").eq(0);
        var pageX = $bar.offset().left;
        var pageY = $bar.offset().top;

        $bar.trigger("mouseover");
        $bar.trigger({ type: "mousedown", which: 1, pageX: pageX, pageY: pageY });
        $bar.trigger({ type: "mousemove", which: 1, pageX: pageX + 200, pageY: pageY});
        $bar.trigger({ type: "mouseup", which: 1, pageX: pageX + 200, pageY: pageY});
        expect(node.getDimensions()).to.deep.equal({
            width: 400,
            height: 200
        });

        graph.getComment = cacheFn;
    });

    it("mousedown should bring comment to front", function() {
        $dfWrap.blur();
        let commentInfo = {
            id: "comment_second",
            text: "something",
            display: {x: 100, y: 100, height: 200, width: 200}
        };
        node = new CommentNode(commentInfo);
        DagComment.Instance.drawComment(node, $dfArea);
        let $comments = $dfArea.find(".comment");
        if ($comments.eq(0).data('nodeid') === "comment_someId") {
            expect($comments.eq(0).data('nodeid')).to.equal("comment_someId");
            expect($comments.eq(1).data('nodeid')).to.equal("comment_second");
        }

        $comments.eq(0).trigger(fakeEvent.mousedown);

        $comments = $dfArea.find(".comment");
        expect($comments.eq(1).data('nodeid')).to.equal("comment_someId");
        expect($comments.eq(0).data('nodeid')).to.equal("comment_second");
        DagComment.Instance.removeComment("comment_someId");
        DagComment.Instance.removeComment("comment_second");
    });

    after(function(done) {
        UserSettings.Instance.getPref = cachedUserPref;
        UnitTest.offMinMode();

        let dagTab =  DagTabManager.Instance.getTabById(tabId);
        DagTabManager.Instance.removeTab(tabId);

        dagTab.delete()
        .always(function() {
            XcalarKeyPut = oldPut;
            done();
        });
    });
});