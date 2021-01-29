describe("Alert Modal Test", function() {
    var minModeCache;
    var $alertModal;
    var $alertTitle;
    var $alertMsg;
    var $alertInstr;
    var $modalBg;

    function closeModal() {
        $alertModal.find(".logout, .downloadLog, .genSub").remove();
        $modalBg.removeClass("locked");
        $alertModal.removeClass("locked");
        $alertModal.find(".close").click();
        $("#container").removeClass("locked");
    }

    before(function(){
        // turn off min mode, as it affectes DOM test
        minModeCache = gMinModeOn;
        gMinModeOn = true;

        $alertModal = $("#alertModal");
        $alertTitle = $("#alertHeader").find(".text");
        $alertMsg = $("#alertContent").find(".text");
        $alertInstr = $("#alertInstruction").find(".text");
        $modalBg = $("#modalBackground");
    });

    it("Should show alert", function() {
        var title = "Alert Test";
        var instr = "test instruction";
        var msg = "test message";

        Alert.show({
            "title": title,
            "instr": instr,
            "msg": msg,
            "isAlert": true
        });

        expect(Alert.isOpen()).to.be.true;
        assert.isFalse($("#alertCheckBox").is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertInstr.text()).to.equal(instr);
        expect($alertMsg.text()).to.equal(msg);
    });

    it("should hide alert", function() {
        Alert.hide();
        expect($alertModal.hasClass("xc-hidden"));
    });

    it("should unhide alert", function() {
        Alert.unhide();
        expect($alertModal.hasClass("xc-hidden"));
    });

    it("Should close alert", function() {
        $alertModal.find(".close").click();
        expect(Alert.isOpen()).to.be.false;
    });

    it("should update message", function() {
        var id = Alert.show({
            "title": "test",
            "msg": "test",
            "isAlert": true
        });
        var $text = $("#alertContent .text");
        // error case
        Alert.updateMsg(null, "update");
        expect($text.text()).to.equal("test");

        Alert.updateMsg(id, "update");
        expect($text.text()).to.equal("update");
    });

    it("should force close alert", function() {
        $modalBg.addClass("locked");
        $alertModal.addClass("locked");

        Alert.forceClose();

        expect($modalBg.hasClass("locked")).to.be.false;
        expect($alertModal.hasClass("locked")).to.be.false;
    });

    it("Should show alert with checkbox", function() {
        var title = "Alert with checkbox test";
        var msg = "test message2";

        Alert.show({
            "title": title,
            "msg": msg,
            "isCheckBox": true
        });

        assert.isTrue($alertModal.is(":visible"));
        assert.isTrue($("#alertCheckBox").is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(msg);

        // toggle check box
        $checkbox = $alertModal.find(".checkbox");
        var hasChecked = $checkbox.hasClass("checked");
        $checkbox.click();
        expect($checkbox.hasClass("checked")).to.equal(!hasChecked);
        // toggle back
        $checkbox.click();
        expect($checkbox.hasClass("checked")).to.equal(hasChecked);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should size to text", function() {
        var msg = new Array(300).fill("a");
        Alert.show({title: "title", msg: msg});
        var height = $alertModal.height();
        $alertModal.find(".close").click();

        Alert.show({title: "title", msg: msg, sizeToText: true});
        expect($alertModal.height()).to.be.above(height);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should show alert with msgTemplate", function() {
        var html =  "<a>test</a>";
        Alert.show({
            msgTemplate: html
        });

        expect($alertMsg.html()).to.contains(html);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show error", function() {
        var title = "Error Alert Test";
        var error = "test error";
        Alert.error(title, error);

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(error);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show error with error object", function() {
        var title = "Error Alert Test2";
        var error = {
            "error": "test error"
        };
        Alert.error(title, error);

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(error.error);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should show error with no message", function() {
        var title = "test title";
        Alert.error(title);
        expect($alertMsg.text()).to.equal(title);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should show error with details", function() {
        expect($alertModal.hasClass("hasDetail")).to.be.false;

        Alert.error("test", {error: "error", log: "log"});
        expect($alertModal.hasClass("hasDetail")).to.be.true;
        expect($alertModal.hasClass("expandDetail")).to.be.false;
        expect($("#alertDetail").find(".detailContent").text()).to.equal("log");

        // click to expand
        var $button = $("#alertDetail .detailAction");
        $button.click();
        expect($alertModal.hasClass("expandDetail")).to.be.true;
        $button.click();
        expect($alertModal.hasClass("expandDetail")).to.be.false;
    });

    it("Should show alert with buttons", function() {
        var title = "buttons test";
        var msg = "buttons";
        var test = false;

        Alert.show({
            "title": title,
            "msg": msg,
            "buttons": [{
                "name": "button1",
                "className": "button1",
                "func": function() { test = true; }
            }, {
                "name": "button2",
                "className": "button2"
            }]
        });

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(msg);
        expect($alertModal.find(".button1").length).to.equal(1);
        expect($alertModal.find(".button2").length).to.equal(1);

        $alertModal.find(".button1").click();
        expect(test).to.be.true;
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should hide buttons", function() {
        Alert.show({
            "title": "test",
            "msg": "test",
            "hideButtons": ["cancel"]
        });

        assert.isTrue($alertModal.is(":visible"));
        assert.isFalse($alertModal.find(".cancel").is(":visible"));

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should go to noCancel modal", function() {
        Alert.show({
            "title": "test",
            "msg": "test",
            "noCancel": true
        });

        assert.isTrue($alertModal.is(":visible"));
        assert.isFalse($alertModal.find(".cancel").is(":visible"));
        assert.isFalse($alertModal.find(".close").is(":visible"));

        $alertModal.find(".confirm").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should cancel", function() {
        var test = false;
        Alert.show({
            "title": "test",
            "msg": "test",
            "onCancel": function() {
                test = true;
            }
        });

        assert.isTrue($alertModal.is(":visible"));
        $alertModal.find(".cancel").click();
        expect(test).to.be.true;
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should confirm", function() {
        var test = false;
        Alert.show({
            "title": "test",
            "msg": "test",
            "onConfirm": function() {
                test = true;
            }
        });

        assert.isTrue($alertModal.is(":visible"));
        $alertModal.find(".confirm").click();
        expect(test).to.be.true;
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show alert with lock screen", function() {
        var title = "lock screen test";
        var msg = "lock screen";

        Alert.show({
            "title": title,
            "msg": msg,
            "lockScreen": true,
            "logout": true
        });

        assert.isTrue($alertModal.is(":visible"));
        // lock modal and background
        assert.isTrue($alertModal.hasClass("locked"));
        assert.isTrue($modalBg.hasClass("locked"));
        // has right button
        assert.isTrue($alertModal.find(".logout").length > 0);
        assert.isTrue($alertModal.find(".downloadLog").length > 0);
        assert.isTrue($alertModal.find(".genSub").length > 0);
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(msg);


        // trigger another show still lock it
        Alert.show({
            "title": title,
            "msg": msg,
            "noLogout": true,
            "logout": false
        });
        assert.isTrue($alertModal.hasClass("locked"));
        assert.isTrue($modalBg.hasClass("locked"));
        assert.isFalse($alertModal.find(".logout").length > 0);

        closeModal();
    });

    it("should lock screen with expired case", function() {
        Alert.show({
            "title": "test",
            "msg": "test",
            "lockScreen": true,
            "expired": true
        });

        var $button = $alertModal.find("button:visible");
        expect($button.length).to.equal(1);
        expect($button.text()).to.equal("Log Out");

        closeModal();
    });

    it("should lock screen with noLogout case", function() {
        Alert.show({
            "title": "test",
            "msg": "test",
            "lockScreen": true,
            "noLogout": true
        });

        var $button = $alertModal.find("button:not(.adminOnly):visible");
        expect($button.length).to.equal(2);

        closeModal();
    });

    it("should lock screen with other case", function() {
        Alert.show({
            "title": "test",
            "msg": "test",
            "lockScreen": true
        });

        var $button = $alertModal.find("button:not(.adminOnly):visible");
        expect($button.length).to.equal(3);

        closeModal();
    });

    it("should apply highZindex, ultraHighZindex and align options", function() {
        expect($alertModal.hasClass("highZindex")).to.be.false;
        expect($alertModal.hasClass("ultraHighZindex")).to.be.false;
        expect($alertModal.hasClass("left-align")).to.be.false;

        Alert.show({
            highZindex: true,
            ultraHighZindex: true,
            align: "left"
        });

        expect($alertModal.hasClass("highZindex")).to.be.true;
        expect($alertModal.hasClass("ultraHighZindex")).to.be.true;
        expect($alertMsg.hasClass("left-align")).to.be.true;

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });


    it("supportButton should work", function() {
        // caase 1
        var $btn = Alert.__testOnly__.supportButton("log");
        expect($btn.hasClass("downloadLog")).to.be.true;
        // case 2
        $btn = Alert.__testOnly__.supportButton("support");
        expect($btn.hasClass("genSub")).to.be.true;
        // case 3
        $btn = Alert.__testOnly__.supportButton();
        expect($btn.hasClass("logout")).to.be.true;
    });

    after(function() {
        gMinModeOn = minModeCache;
    });
});