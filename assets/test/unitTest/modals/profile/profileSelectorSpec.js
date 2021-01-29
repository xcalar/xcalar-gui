describe("ProfileSelector Test", function() {
    let profileSelector;
    
    before(function() {
        profileSelector = new ProfileSelector("profileModal", "profile-chart");
    });

    it("should be a correct instance", function() {
        expect(profileSelector).to.be.an.instanceof(ProfileSelector);
    });

    describe("Basic Function Test", function() {
        it("fltExist should work", function() {
            var fltExist = profileSelector._fltExist;
            var res = fltExist(FltOp.Filter, "test");
            expect(res).to.equal("not(exists(test))");
            // case 2
            res = fltExist(FltOp.Filter, "test", "fltStr");
            expect(res).to.equal("or(fltStr, not(exists(test)))");
            // case 3
            res = fltExist(FltOp.Exclude, "test");
            expect(res).to.equal("exists(test)");
            // case 4
            res = fltExist(FltOp.Exclude, "test", "fltStr");
            expect(res).to.equal("and(fltStr, exists(test))");
        });

        it("getBucketFltOpt should work", function() {
            var chartBuilder = ProfileChart.get("bar", {bucketSize: 1});
            profileSelector._chartBuilder = chartBuilder;

            // case 1
            var res = profileSelector._getBucketFltOpt(null, "test", {});
            expect(res).to.be.null;

            // case 2
            res = profileSelector._getBucketFltOpt(FltOp.Filter, "test", {
                1: true,
                2: true
            }, true);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("or(or(and(ge(test, 1), lt(test, 2)), and(ge(test, 2), lt(test, 3))), not(exists(test)))");

            // caser 3
            res = profileSelector._getBucketFltOpt(FltOp.Exclude, "test", {
                2: true,
                3: true
            }, false);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("and(or(lt(test, 2), ge(test, 3)), or(lt(test, 3), ge(test, 4)))");
        });

        it("getNumFltOpt should work", function() {
            // case 1
            var chartBuilder = ProfileChart.get("bar", {bucketSize: 0});
            profileSelector._chartBuilder = chartBuilder;
            var res = profileSelector._getNumFltOpt(FltOp.Filter, "test", [], true);
            expect(res).to.be.an("object");
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString).to.equal("not(exists(test))");
            // case 2
            res = profileSelector._getNumFltOpt(FltOp.Filter, "test", [[1]], true);
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("or(eq(test, 1), not(exists(test)))");
            // case 3
            res = profileSelector._getNumFltOpt(FltOp.Filter, "test", [[1, 2]]);
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("and(ge(test, 1), le(test, 2))");
            // case 4
            res = profileSelector._getNumFltOpt(FltOp.Exclude, "test", [[1]]);
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("neq(test, 1)");
            // case 5
            res = profileSelector._getNumFltOpt(FltOp.Exclude, "test", [[1, 2]]);
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("or(lt(test, 1), gt(test, 2))");
            // case 6
            res = profileSelector._getNumFltOpt("wrongOperator", "test", []);
            expect(res.operator).to.equal("wrongOperator");
            expect(res.filterString).to.equal("");
            // case 7 (change bucket size to 1)
            chartBuilder = ProfileChart.get("bar", {bucketSize: 1});
            profileSelector._chartBuilder = chartBuilder;

            res = profileSelector._getNumFltOpt(FltOp.Filter, "test", [[1]], false);
            expect(res.operator).to.equal(FltOp.Filter);
            expect(res.filterString)
            .to.equal("and(ge(test, 1), lt(test, 2))");
            // case 8
            res = profileSelector._getNumFltOpt(FltOp.Exclude, "test", [[1]], false);
            expect(res.operator).to.equal(FltOp.Exclude);
            expect(res.filterString)
            .to.equal("or(lt(test, 1), ge(test, 2))");
            // case 9
            res = profileSelector._getNumFltOpt("wrongOperator", "test", [[1]], false);
            expect(res.operator).to.equal("wrongOperator");
            expect(res.filterString).to.equal("");
        });

        after(function() {
            profileSelector.clear();
        });
    });

    describe("Public Api Test", function() {
        it("off should work", function() {
            profileSelector.off();
            expect(profileSelector.isOn()).to.be.false;
        });

        it("clear should work", function(done) {
            var $filterOption = $("#profile-filterOption");
            $filterOption.show();
            profileSelector.clear();
            // hide filterOption has a fade out
            setTimeout(function() {
                assert.isFalse($filterOption.is(":visible"));
                done();
            }, 500);
        });
    });

    describe("Selector Test", function() {
        var $modal;
        var $filterOption;

        function moveSelection(offset) {
            var e = jQuery.Event("mousemove", {
                "pageX": offset.left + 100,
                "pageY": offset.top + 100
            });
            // need to trigger twice mousemove
            $(document).trigger(e);
            $(document).trigger(e);
            $(document).trigger("mouseup");
        }

        function buildChart(type) {
            var len = 20;
            var val = 10;
            var data = Array(len).fill(1).map(function(d, i) {
                return {x: i, y: val, rowNum: (i + 1)};
            });
            var chartBuilder = ProfileChart.get(type, {
                data: data,
                bucketSize: 0,
                xName: "x",
                yName: "y",
                nullCount: 0,
                max: val,
                sum: val * len,
                decimal: 0,
                initial: true,
            });
            chartBuilder.build();
            return chartBuilder;
        }

        before(function() {
            $modal = $("#profileModal");
            $modal.show();
            $filterOption = $("#profile-filterOption");
        });

        describe("Bar Chart Selector Test", function() {
            function getChartOffset() {
                return $("#profile-chart").offset();
            }

            it("should create selection", function() {
                var chartBuilder = buildChart("bar");
                var offset = getChartOffset();
                profileSelector.select({
                    chartBuilder: chartBuilder,
                    x: offset.left + 50,
                    y: offset.top + 50
                });

                expect($("#profile-filterSelection").length).to.equal(1);
                expect($modal.hasClass("drawing")).to.be.true;
                expect($modal.hasClass("selecting")).to.be.true;
            });

            it("should move selection", function() {
                var offset = getChartOffset();
                moveSelection(offset);
                assert.isTrue($filterOption.is(":visible"));
                expect($modal.find(".area.selected").length).to.be.at.least(1);
            });

            it("filter should work", function() {
                var res = profileSelector.filter(FltOp.Filter, {
                    colName: "a",
                    type: ColumnType.integer
                });
                expect(res).to.be.an("object");
                expect(res.operator).to.equal(FltOp.Filter);
                expect(res.filterString).to.equal("and(ge(a, 0), le(a, 2))");
            });

            after(function() {
                profileSelector.clear();
            });
        });
    
        describe("Pie Chart Selection Test", function() {
            function getPieChartOffset() {
                return $("#profile-chart .pieChart").offset();
            }

            it("should create selection", function() {
                var chartBuilder = buildChart("pie");
                var offset = getPieChartOffset();
                profileSelector.select({
                    chartBuilder: chartBuilder,
                    x: offset.left + 50,
                    y: offset.top + 50
                });

                expect($("#profile-filterSelection").length).to.equal(1);
                expect($modal.hasClass("drawing")).to.be.true;
                expect($modal.hasClass("selecting")).to.be.true;
            });

            it("should move selection", function() {
                var offset = getPieChartOffset();
                moveSelection(offset);
                assert.isTrue($filterOption.is(":visible"));
                expect($modal.find(".area.selected").length).to.be.at.least(1);
            });

            after(function() {
                profileSelector.clear();
            });
        });

        after(function() {
            $("#profileModal").hide();
            $("#profileModal .groupbyChart").empty();
        });
    });
});