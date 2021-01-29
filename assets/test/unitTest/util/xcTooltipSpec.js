describe('xcTooltip Test', function() {
    var $ele = $('<div id="unitTest-tooltipTest"></div>');
    var $input = $('<input id="unitTest-tooltipTestInput">');

    before(function() {
        $("body").append($input);
        $input.after($ele);
    });

    it('Should add tooltip', function() {
        xcTooltip.add($ele, {
            "container": "#unitTest-tooltipTestInput",
            "placement": "bottom"
        });

        // test 1
        expect($ele.attr("title")).to.equal("");
        expect($ele.attr("data-original-title")).to.equal("");
        expect($ele.attr("data-toggle")).to.equal("tooltip");
        expect($ele.attr("data-container")).to.equal("#unitTest-tooltipTestInput");
        expect($ele.attr("data-placement")).to.equal("bottom");

        // test 2
        xcTooltip.add($ele, {
            "title": "test"
        });

        expect($ele.attr("title")).to.equal("");
        expect($ele.attr("data-original-title")).to.equal("test");
        expect($ele.attr("data-toggle")).to.equal("tooltip");
        expect($ele.attr("data-container")).to.equal("body");
        expect($ele.attr("data-placement")).to.equal("auto top");
    });

    it('Should remove tooltip', function() {
        xcTooltip.remove($ele);

        expect($ele.attr("title")).to.be.undefined;
        expect($ele.attr("data-original-title")).to.be.undefined;
        expect($ele.attr("data-toggle")).to.be.undefined;
        expect($ele.attr("data-container")).to.be.undefined;
        expect($ele.attr("data-placement")).to.be.undefined;
    });

    it('Should show transient in', function(done) {
        // test 1
        $ele.focus();
        var timer = xcTooltip.transient($ele, {
            "title": "test2"
        });
        expect(timer).to.be.null;
        expect($(".tooltip:visible").length).not.to.equal(0);

        // test 2
        $ele.focus();
        timer = xcTooltip.transient($ele, {
            "title": "test3"
        }, 100);
        expect(timer).not.to.be.null;
        expect($(".tooltip:visible").length).not.to.equal(0);

        setTimeout(function() {
            expect($(".tooltip:visible").length).to.equal(0);
            done();
        }, 200);
    });

    it('Should auto tooltip', function() {
        $ele.focus();
        xcTooltip.add($ele, {
            "title": "test"
        });

        var ele = $ele.get(0);
        xcTooltip.auto(ele);

        if (ele.offsetWidth < ele.scrollWidth) {
            expect($(".tooltip:visible").length).not.to.equal(0);
        } else {
            expect($(".tooltip:visible").length).to.equal(0);
        }
    });

    it('Should hide tooltip', function() {
        xcTooltip.add($ele, {
            "title": "test"
        });

        $ele.tooltip("show");

        expect($(".tooltip:visible").length).not.to.equal(0);
        xcTooltip.hideAll();
        expect($(".tooltip:visible").length).to.equal(0);
    });

    it('Should enable and disable tooltip', function() {
        xcTooltip.add($ele, {
            "title": "test"
        });

        xcTooltip.disable($ele);
        expect($ele.attr("title")).to.be.undefined;
        expect($ele.attr("data-original-title")).to.equal("test");
        expect($ele.attr("data-toggle")).to.be.undefined;

        xcTooltip.enable($ele);
        expect($ele.attr("title")).to.be.undefined;
        expect($ele.attr("data-original-title")).to.equal("test");
        expect($ele.attr("data-toggle")).to.be.equal("tooltip");
    });

    it('Should change tooltip text', function() {
        xcTooltip.add($ele, {
            "title": "test"
        });

        // test 1
        xcTooltip.changeText($ele);
        expect($ele.attr("data-original-title")).to.equal("test");

        // test 2
        xcTooltip.changeText($ele, "test2");
        expect($ele.attr("title")).to.equal("");
        expect($ele.attr("data-original-title")).to.equal("test2");
    });

    it('Should refresh tooltip', function(done) {
        xcTooltip.add($ele, {
            "title": "test"
        });

        xcTooltip.refresh($ele);
        expect($(".tooltip:visible").length).not.to.equal(0);
        xcTooltip.hideAll();

        xcTooltip.refresh($ele, 100);
        var timer = $ele.data("xc-tooltipTimer");
        expect(timer != null).to.be.true;
        expect($(".tooltip:visible").length).not.to.equal(0);

        // contiue call refresh
        xcTooltip.refresh($ele, 100);
        var newTimer = $ele.data("xc-tooltipTimer");
        expect(newTimer).not.to.equal(timer);
        expect($(".tooltip:visible").length).not.to.equal(0);

        setTimeout(function() {
            expect($(".tooltip:visible").length).to.equal(0);
            expect($ele.data("xc-tooltipTimer") != null).to.be.false;
            done();
        }, 200);
    });

    after(function() {
        $input.remove();
        $ele.remove();
    });
});