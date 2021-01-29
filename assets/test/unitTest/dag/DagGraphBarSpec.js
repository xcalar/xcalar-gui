describe("DagGraphBar Test", function() {
    let oldActiveDag;
    let oldActiveTab;
    let topBar;
    let $topBar;

    before(function() {
        console.log("DagGraphBar Test");
        oldActiveDag = DagViewManager.Instance.getActiveDag;
        oldActiveTab = DagViewManager.Instance.getActiveTab;
        DagViewManager.Instance.getActiveDag = function() {
            return null;
        };

        topBar = DagGraphBar.Instance;
        $topBar = $("#dagGraphBar");
    });

    it("Should lock", function() {
        $topBar.removeClass("locked");
        topBar.lock();
        expect($topBar.hasClass("locked")).to.be.true;
        $topBar.removeClass("locked");
    });

    it("Should unlock", function() {
        $topBar.removeClass("locked");
        topBar.unlock();
        expect($topBar.hasClass("locked")).to.be.false;
        $topBar.removeClass("locked");
    });

    it("Should render all expected buttons", function () {
        expect($topBar.find(".topButton").length).to.equal(11);
        expect($topBar.find(".undo").length).to.equal(1);
        expect($topBar.find(".redo").length).to.equal(1);
        expect($topBar.find(".run").length).to.equal(1);
        expect($topBar.find(".stop").length).to.equal(1);
        expect($topBar.find(".optionsBtn").length).to.equal(1);
    });

    it("toggleDisable should work", function() {
        let $btn = $topBar.find(".topButtons").eq(0);
        let disabled = $btn.hasClass("xc-disabled");

        $btn.removeClass("xc-disabled");
        DagGraphBar.Instance.toggleDisable(true);
        expect($btn.hasClass("xc-disabled")).to.be.true;
        // case 2
        DagGraphBar.Instance.toggleDisable(false);
        expect($btn.hasClass("xc-disabled")).to.be.false;

        // restore
        DagGraphBar.Instance.toggleDisable(disabled);
    });

    describe("zooming", function() {
        it("Should disable zooming out button if at or below 25%", function() {
            let graph = new DagGraph();
            graph.setScale(.25);
            DagViewManager.Instance.getActiveDag = function() {
                return graph;
            };
            $topBar.find(".zoomOut").removeClass("disabled");
            topBar.reset();
            expect($topBar.find(".zoomOut").hasClass("disabled")).to.be.true;
        });

        it("Should disable zooming in button if at 200%", function() {
            let graph = new DagGraph();
            graph.setScale(2);
            DagViewManager.Instance.getActiveDag = function() {
                return graph;
            };
            $topBar.find(".zoomIn").removeClass("disabled");
            topBar.reset();
            expect($topBar.find(".zoomIn").hasClass("disabled")).to.be.true;
        });

        it("Should not disable either zooming button if between 25% and 200%", function() {
            let graph = new DagGraph();
            graph.setScale(1.5);
            DagViewManager.Instance.getActiveDag = function() {
                return graph;
            };
            $topBar.find(".zoomOut").addClass("disabled");
            $topBar.find(".zoomIn").addClass("disabled");
            topBar.reset();
            expect($topBar.find(".zoomOut").hasClass("disabled")).to.be.false;
            expect($topBar.find(".zoomIn").hasClass("disabled")).to.be.false;
        });
    });

    describe("states", function() {
        // XXX todo: fix it
        // it("Should disable most buttons on null dagtab", function () {
        //     topBar.setState(null);
        //     expect($topBar.find(".topButton.xc-disabled").length).to.equal(7);
        //     topBar.setState(new DagTab({name: "name"}));
        //     expect($topBar.find(".topButton.xc-disabled").length).to.equal(2);
        // });

        // XXX need to fix
        it("Should disable/enable run on different tabs", function () {
            topBar.setState(new DagTabUser({name: "name"}));
            expect($topBar.find(".run").hasClass("xc-disabled")).to.be.false;
            topBar.setState(new DagTab({name: "name"}));
            expect($topBar.find(".run").hasClass("xc-disabled")).to.be.false;
            topBar.setState(new DagTabOptimized({name: "name"}));
            expect($topBar.find(".run").hasClass("xc-disabled")).to.be.false;
        });

        it("Should set the scale correctly", function() {
            let graph = new DagGraph();
            graph.setScale(1.5);
            let tab = new DagTab({
                name: "name",
                id: "3",
                dagGraph: graph
            });
            topBar.setState(tab);
            $topBar.find(".zoomPercentInput").val("150");
        });

        it("Should enable stop if the graph has an executor", function() {
            let graph = new DagGraph();
            graph.setExecutor(new DagGraphExecutor([], graph, {}));
            let tab = new DagTab({
                name: "name",
                id: "3",
                dagGraph: graph
            });

            expect($topBar.find(".stop").hasClass("running")).to.be.false;

            DagViewManager.Instance.getActiveTab = function() {
                return tab;
            };
            topBar.setState(tab);
            expect($topBar.find(".stop").hasClass("running")).to.be.true;
        });
    });

    after(function() {
        DagViewManager.Instance.getActiveDag = oldActiveDag;
        DagViewManager.Instance.getActiveTab = oldActiveTab;
        topBar.setState(DagViewManager.Instance.getActiveTab());
    });
});