describe("Admin Alert Card Test", function() {
    var $card;
    var adminAlertCard;

    before(function(){
        console.clear();
        console.log("Admin Alert Card Test");
        $card = $("#adminAlertCard");

        let id = xcHelper.randName("test");
        let html = '<div id="' + id + '">' +
                    '<textarea class="alert-msg"></textarea>' +
                    '<button class="confirm"></button>' +
                    '<button class="clear"></button>';
        $card = $(html);

        $("body").append($card);

        adminAlertCard = new AdminAlertCard(id);
    });

    it ("should be the correct instance", function() {
        expect(adminAlertCard).to.be.an.instanceof(AdminAlertCard);
    });

    it("should show admin alert card", function() {
        adminAlertCard.show();
        expect($card.hasClass("xc-hidden")).to.be.false;
    });

    it("_toggleConfirmButton work", function() {
        adminAlertCard._toggleConfirmButton(true);
        expect($card.find(".confirm").hasClass("btn-disabled")).to.be.false;
        // case 2
        adminAlertCard._toggleConfirmButton(false);
        expect($card.find(".confirm").hasClass("btn-disabled")).to.be.true;
    });

    it("_clear should work", function() {
        adminAlertCard._toggleConfirmButton(true);
        $card.find(".alert-msg").val("test");

        adminAlertCard._clear();
        expect($card.find(".alert-msg").val()).to.be.empty;
        expect($card.find(".confirm").hasClass("btn-disabled")).to.be.true;
    });

    it("_submitForm should work", function() {
        var oldFunc = XcSocket.Instance.sendMessage;
        var called = false;
        XcSocket.Instance.sendMessage = function() {
            called = true;
        };
        $card.find(".alert-msg").val("test");
        $card.find(".confirm").click();
        expect($card.find(".alert-msg").val()).to.be.empty;
        expect(called).to.be.true;
        XcSocket.Instance.sendMessage = oldFunc;
    });

    it("_close should work", function() {
        adminAlertCard._close();
        expect($card.hasClass("xc-hidden")).to.be.true;
    });

    after(function() {
        $card.remove();
    });
});