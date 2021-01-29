describe("MonitorDonuts Test", function() {
    let $panel;
    let monitorDonuts;

    before(function() {
        $panel = $("#monitor-donuts");
        monitorDonuts = MonitorPanel.getDounts();
    });

    it("should be the correct instance", function() {
        expect(monitorDonuts).to.be.instanceof(MonitorDonuts); 
    });

    it("should update", function() {
        let allStats = [{"used":6574159840,"total":134774259712,"nodes":[{"node":0,"xdbUsed":3847150576,"xdbTotal":47145107456,"used":3847150576,"total":67386687488},{"node":1,"xdbUsed":2727009264,"xdbTotal":47145762816,"used":2727009264,"total":67387572224}],"datasetUsage":3133333056,"xdbUsed":6574159840,"xdbTotal":94290870272,"memUsedInBytes":129563095040,"sysMemUsed":122988935200,"pubTableUsage":2093875200,"userTableUsage":468975616,"otherTableUsage":877975968,"xdbFree":87716710432,"nonXdb":40483389440,"sysMemFree":5211164672},{"used":3932160,"total":68719468544,"nodes":[{"node":0,"used":3932160,"total":34359734272},{"node":1,"used":0,"total":34359734272}]},{"used":0.33988829415871535,"total":100,"nodes":[{"node":0,"used":0.41,"total":100},{"node":1,"used":0.27,"total":100}]},{"used":12529,"total":25989,"nodes":[{"node":0,"used":6162,"total":14037},{"node":1,"used":6367,"total":11952}]}];
        monitorDonuts._ramData = [];
        monitorDonuts._xdbData = [];
        monitorDonuts.update(allStats);
        expect(monitorDonuts._ramData.length).to.equal(6);
        expect(monitorDonuts._xdbData.length).to.equal(3);
    });
    
    it("_toggleDisplay should work", function() {
        let $section = $('<div class="open"></div>');
        monitorDonuts._toggleDisplay($section);
        expect($section.hasClass("open")).to.be.false;

        monitorDonuts._toggleDisplay($section);
        expect($section.hasClass("open")).to.be.true;
    });

    it("_toggleDountPctMode should work", function() {
        let $div = $('<div class="donutSection"><span></span></div>');
        let $el = $div.find("span");
        monitorDonuts._toggleDountPctMode($el);
        expect($div.hasClass("pctMode")).to.be.true;
        monitorDonuts._toggleDountPctMode($el);
        expect($div.hasClass("pctMode")).to.be.false;
    });

    it("_ramDonutMouseEnter should work", function() {
        monitorDonuts._ramDonutMouseEnter(1, 4, false);
        expect($panel.find(".hover").length).to.be.at.least(1);    
    });

    it("_ramDonutMouseLeave should work", function() {
        monitorDonuts._ramDonutMouseLeave();
        expect($panel.find(".hover").length).to.equal(0);    
    });
});