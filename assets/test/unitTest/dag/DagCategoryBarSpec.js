describe("DagCategoryBar Test", function() {
    let $categories;
    let $operatorBar;
    let oldPut;
    let numCustomOps;
    let dagNode;
    let tabId;

    before(function(done) {
        console.clear();
        console.log("DagCategoryBar Test");

        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            oldPut = XcalarKeyPut;
            $categories = $("#dagView .categories").find(".category");
            $operatorBar = $("#dagView .operatorBar");
            XcalarKeyPut = function() {
                return PromiseHelper.resolve();
            };
            DagTabManager.Instance.newTab();
            tabId = DagViewManager.Instance.getActiveDag().getTabId();
            done();
        });
    });

    it("should have correct categories", function() {
        expect($categories.length).to.equal(10);
        expect($categories.eq(0).text().trim()).to.equal("In");
        expect($categories.eq(1).text().trim()).to.equal("Out");
        expect($categories.eq(2).text().trim()).to.equal("SQL");
        expect($categories.eq(3).text().trim()).to.equal("Column Ops");
        expect($categories.eq(4).text().trim()).to.equal("Row Ops");
        expect($categories.eq(5).text().trim()).to.equal("Join");
        expect($categories.eq(6).text().trim()).to.equal("Set");
        expect($categories.eq(7).text().trim()).to.equal("Aggregates");
        // expect($categories.eq(8).text().trim()).to.equal("Extensions");
        expect($categories.eq(8).text().trim()).to.equal("Custom");
        expect($categories.eq(9).text().trim()).to.equal("Hidden");
        expect($("#dagView .categories").find(".category:visible").length).to.equal(9);
        expect($categories.eq(9).is(":visible")).to.be.false;
    });

    it("should update categories", function() {
        expect($operatorBar.find(".category-in").find(".operator").length).to.equal(3);
        expect($operatorBar.find(".category-in").find(".operator").eq(0).find(".opTitle").text()).to.equal("SourceTable");
        expect($operatorBar.find(".category-in").find(".operator").eq(1).find(".opTitle").text()).to.equal("FunctionInput");
        expect($operatorBar.find(".category-in").find(".operator").eq(2).find(".opTitle").text()).to.equal("SQL");

        DagCategoryBar.Instance.updateCategories(new DagTabSQLFunc());

        expect($operatorBar.find(".category-in").find(".operator").length).to.equal(1);
        expect($operatorBar.find(".category-in").find(".operator").eq(0).find(".opTitle").text()).to.equal("InputTable");
    });

    it("should switch back to advanced mode", function(){
        DagCategoryBar.Instance.updateCategories(new DagTabUser());
        expect($operatorBar.find(".category-in").find(".operator").length).to.equal(3);
        expect($operatorBar.find(".category-in").find(".operator").eq(0).find(".opTitle").text()).to.equal("SourceTable");
        expect($operatorBar.find(".category-in").find(".operator").eq(1).find(".opTitle").text()).to.equal("FunctionInput");
        expect($operatorBar.find(".category-in").find(".operator").eq(2).find(".opTitle").text()).to.equal("SQL");

    });

    it("should focus on category", function() {
        $("#dagView .categoryBar").find(".category-out").trigger(fakeEvent.mousedown);
        expect($("#dagView").find(".categoryBar .category.active").length).to.equal(1);
        expect($("#dagView").find(".categoryBar .category.active.category-out").length).to.equal(1);
        expect($operatorBar.find(".category.active").length).to.equal(1);
        expect($operatorBar.find(".category.category-out.active").length).to.equal(1);

        $("#dagView .categoryBar").find(".category-in").trigger(fakeEvent.mousedown);
        expect($("#dagView").find(".categoryBar .category.active").length).to.equal(1);
        expect($("#dagView").find(".categoryBar .category.active.category-in").length).to.equal(1);
        expect($operatorBar.find(".category.active").length).to.equal(1);
        expect($operatorBar.find(".category.category-in.active").length).to.equal(1);
    });

    describe("custom node", function() {
        it("should add and delete operator", function() {
            expect($("#dagView .actionWrap").is(":visible")).to.be.false;
            numCustomOps = $operatorBar.find(".category-custom").find(".operator").length;
            dagNode = new DagNodeCustom({subGraph: {nodes: [], comments: [], display:{}}, inPorts:[], outPorts:[], customName:"testName"});
            DagCategoryBar.Instance.addOperator({categoryType: DagCategoryType.Custom, dagNode: dagNode, isHidden: false, isFocusCategory: true});
            expect($operatorBar.find(".category-custom").find(".operator").length).to.equal(numCustomOps + 1);
            expect($operatorBar.find(".category-custom").find(".operator").last().find(".opTitle").text()).to.equal("testName-1");
            expect($("#dagView").find(".categoryBar .category.active").length).to.equal(1);
            expect($("#dagView").find(".categoryBar .category.active.category-custom").length).to.equal(1);
            expect($operatorBar.find(".category.active").length).to.equal(1);
            expect($operatorBar.find(".category.category-custom.active").length).to.equal(1);
            expect($("#dagView .actionWrap").is(":visible")).to.be.true;
        });

        it("should rename operator", function() {
            DagCategoryBar.Instance._renameOperator(dagNode.getId(), "renamed");
            expect($operatorBar.find(".category-custom").find(".operator").last().find(".opTitle").text()).to.equal("renamed");
        });

        it("should update connector in", function() {
            expect($operatorBar.find(".category-custom").find(".operator").last().find(".connector.in").length).to.equal(0);
            const g = d3.select($operatorBar.find(".category-custom").find(".operator").last()[0]);
            DagCategoryBar.Instance.updateNodeConnectorIn(2, g);
            expect($operatorBar.find(".category-custom").find(".operator").last().find(".connector.in").length).to.equal(2);
        });

        it("should update connector out", function() {
            expect($operatorBar.find(".category-custom").find(".operator").last().find(".connector.out").length).to.equal(0);
            const g = d3.select($operatorBar.find(".category-custom").find(".operator").last()[0]);
            DagCategoryBar.Instance.updateNodeConnectorOut(1, g);
            expect($operatorBar.find(".category-custom").find(".operator").last().find(".connector.out").length).to.equal(1);
        });

        it("should enable action section", function() {
            expect($("#dagView .actionWrap .actions.disabled").length).to.equal(1);
            $operatorBar.find(".category-custom .operator").last().find(".main").click();
            expect($("#dagView .actionWrap .actions").length).to.equal(1);
            expect($("#dagView .actionWrap .actions.disabled").length).to.equal(0);
        });

        it("should delete operator", function() {
            DagCategoryBar.Instance._deleteOperator($operatorBar.find(".category-custom").find(".operator").eq(3).data("opid"));
            expect($operatorBar.find(".category-custom").find(".operator").length).to.equal(numCustomOps);
        });
    });

    describe("searchBar", function() {
        it("typing should render list", function() {
            expect($("#dagView .searchArea ul").is(":visible")).to.be.false;
            $("#dagView .categoryBar .searchInput").val("d").trigger(fakeEvent.input);
            expect($("#dagView .searchArea ul").is(":visible")).to.be.true;
            expect($("#dagView .searchArea li").length).to.be.eq(3);
            let $lis = $("#dagView .searchArea li");

            expect($lis.filter(function() {
                return $(this).text().indexOf("Round") > -1;
            }).length).to.be.gt(0);
            expect($lis.filter(function() {
                return $(this).text().indexOf("Explode") > -1;
            }).length).to.be.gt(0);
        });

        it("selecting item", function() {
            expect($("#dagView").find(".categoryBar .category.active.category-in").length).to.equal(0);

            $("#dagView .categoryBar .searchInput").val("Function Out").trigger(fakeEvent.input);
            expect($("#dagView .searchArea ul").is(":visible")).to.be.true;
            let $lis = $("#dagView .searchArea li");
            expect($lis.eq(0).text()).to.equal("Function Output");

            expect($operatorBar.find(".operator.link.out .selection").length).to.equal(0);

            $lis.eq(0).click();

            expect($("#dagView").find(".categoryBar .category.active").length).to.equal(1);
            expect($("#dagView").find(".categoryBar .category.active.category-out").length).to.equal(1);
            expect($operatorBar.find(".category.active").length).to.equal(1);
            expect($operatorBar.find(".category.category-out.active").length).to.equal(1);
            expect($operatorBar.find(".operator.link.out .selection").length).to.equal(1);
        })
    });

    describe("drag and drop", function() {
        it("mousedown and mousemove should work", function(){
            $(window).scrollTop(0);
            var e = $.Event('mousedown', {pageX: 0, pageY: 0, which: 1});
            $("#dagView .categoryBar").find(".category-in").trigger(fakeEvent.mousedown);

            expect($("#dagView .dataflowArea.active .operator").length).to.equal(0);
            $("#dagView .operatorBar .operator.IMDTable .main").trigger(e);
            e = $.Event('mousemove', {pageX: 2, pageY: 1});
            $(document).trigger(e);
            e = $.Event('mousemove', {pageX: 400, pageY: 200});
            $(document).trigger(e);
            var e = $.Event('mouseup', {pageX: 400, pageY: 200});
            $(document).trigger(e);

            expect($("#dagView .dataflowArea.active .operator").length).to.equal(1);
            expect($("#dagView .dataflowArea.active .operator.IMDTable").length).to.equal(1);
        });

        it("double click should add node", function() {
            var called = false;
            var cache = DagViewManager.Instance.autoAddNode;
            DagViewManager.Instance.autoAddNode = function(type, subType) {
                expect(type).to.equal(DagNodeType.IMDTable);
                expect(subType).to.equal(null);
                called = true;
            }

            $("#dagView .operatorBar .operator.IMDTable .main").dblclick();

            expect(called).to.be.true;
            DagViewManager.Instance.autoAddNode = cache;
        })
    });

    describe("scrolling", function() {
        it("should scroll left", function() {
            expect($("#dagView .categoryBar .category").eq(0).hasClass("category-in")).to.be.true;
            expect($("#dagView .categoryBar .category").eq(1).hasClass("category-out")).to.be.true;
            expect($("#dagView .categoryBar .category").eq(2).hasClass("category-SQL")).to.be.true;
            expect($("#dagView .categoryBar .category").last().hasClass("category-hidden")).to.be.true;

            $("#dagView").find(".categoryScroll .arrow.left").trigger(fakeEvent.mouseup);
            expect($("#dagView .categoryBar .category").eq(0).hasClass("category-custom")).to.be.true
            expect($("#dagView .categoryBar .category").eq(1).hasClass("category-hidden")).to.be.true
            expect($("#dagView .categoryBar .category").eq(2).hasClass("category-in")).to.be.true
        });
        it("should scroll right", function() {
            $("#dagView").find(".categoryScroll .arrow.right").trigger(fakeEvent.mouseup);
            expect($("#dagView .categoryBar .category").eq(0).hasClass("category-in")).to.be.true
            expect($("#dagView .categoryBar .category").eq(1).hasClass("category-out")).to.be.true
            expect($("#dagView .categoryBar .category").eq(2).hasClass("category-SQL")).to.be.true
            expect($("#dagView .categoryBar .category").last().hasClass("category-hidden")).to.be.true;
        });
        it("scroll right again", function(){
            $("#dagView").find(".categoryScroll .arrow.right").trigger(fakeEvent.mouseup);
            expect($("#dagView .categoryBar .category").eq(0).hasClass("category-out")).to.be.true;
            expect($("#dagView .categoryBar .category").eq(1).hasClass("category-SQL")).to.be.true;
            expect($("#dagView .categoryBar .category").eq(2).hasClass("category-columnOps")).to.be.true;
            expect($("#dagView .categoryBar .category").last().hasClass("category-in")).to.be.true;
        });
        it("scroll left", function(){
            $("#dagView").find(".categoryScroll .arrow.left").trigger(fakeEvent.mouseup);
            expect($("#dagView .categoryBar .category").eq(0).hasClass("category-in")).to.be.true;
            expect($("#dagView .categoryBar .category").eq(1).hasClass("category-out")).to.be.true;
            expect($("#dagView .categoryBar .category").eq(2).hasClass("category-SQL")).to.be.true;
            expect($("#dagView .categoryBar .category").last().hasClass("category-hidden")).to.be.true;
        });
    });

    after(function(done) {
        let dagTab =  DagTabManager.Instance.getTabById(tabId);

        DagTabManager.Instance.removeTab(tabId);
        dagTab.delete()
        .always(function() {
            XcalarKeyPut = oldPut;
            done();
        });
    });
});