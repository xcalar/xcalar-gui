describe("LiveHelpModal Test", function() {
    var userName;
    var $modal;
    var testMsg;
    var oldSendReqToSocket;
    var oldSendEmail;
    var oldSendMsgToSocket;
    var oldSubmitTicket;
    var oldFetchLicenseInfo;
    before(function(){
        UnitTest.onMinMode();
        oldSendReqToSocket = LiveHelpModal.Instance._sendReqToSocket;
        oldSendEmail = LiveHelpModal.Instance._sendEmail;
        oldSendMsgToSocket = LiveHelpModal.Instance._sendMsgToSocket;
        oldCloseSocket = LiveHelpModal.Instance._closeSocket;
        oldFetchLicenseInfo = SupTicketModal.Instance.fetchLicenseInfo;
        oldSubmitTicket = SupTicketModal.Instance.submitTicket;
        LiveHelpModal.Instance._sendReqToSocket = function() {};
        LiveHelpModal.Instance._sendEmail = function() {};
        LiveHelpModal.Instance._sendMsgToSocket = function() {};
        LiveHelpModal.Instance._closeSocket = function() {};
        SupTicketModal.Instance.fetchLicenseInfo = function() {
            return PromiseHelper.deferred().resolve({"key":"test","expiration":"test"})
                   .promise();
        };
        SupTicketModal.Instance.submitTicket = function(){
            return PromiseHelper.deferred()
                   .resolve({"logs":'{"ticketId":"test","admin":"test"}'})
                   .promise();
        };

        $modal = $("#liveHelpModal");
        userName = "testUser";
        testMsg = "testing\n\n\n\n\n";
    });
    describe("Basic API Test", function() {
        it("Should show liveHelp", function() {
            LiveHelpModal.Instance.show();
            assert.isTrue($modal.is(":visible"));
            assert.isFalse($modal.find(".xi-fullscreen").is(":visible"));
            assert.isTrue($modal.find(".emailInfo").is(":visible"));
        });
    });
    describe("UI Behavior Test", function() {
        // Clear user info
        it("Should disable start button when user info is empty", function() {
            $modal.find(".reqConn input").val("");
            var inputEvent = $.Event("input");
            $modal.find(".reqConn input").trigger(inputEvent);
            assert.isTrue($modal.find(".reqConnBtn").hasClass("btn-disabled"));
        });
        // Manually type user info and start chatting but given invalid email
        it("Should show error message if email is invalid ", function() {
            $modal.find(".name").val(userName);
            $modal.find(".email").val("invalidEmail");
            var keyEvent = $.Event("keypress", {which: keyCode.Enter});
            $modal.find(".reqConn input").trigger(keyEvent);
            assert.isTrue($modal.find(".emailError").is(":visible"));
        });
        // Click "Start" button
        it("Should request connection", function() {
            $modal.find(".name").val(userName);
            $modal.find(".email").val("wlu@xcalar.com");
            $modal.find(".reqConnBtn").click();

            assert.isFalse($modal.find(".reqConn").is(":visible"));
            assert.isTrue($modal.find(".chatBox").is(":visible"));
        });
        it("Should submit ticket", function() {
            LiveHelpModal.Instance._submitTicket();
            expect($modal.find(".sysMsg").last().text()).to.include(AlertTStr.CaseId);
        });
        // When type messages as input
        it("Should be able to auto-size the send area", function() {
            var inputEvent = $.Event("input");
            $modal.find(".sendMsg").val(testMsg);
            $modal.find(".sendMsg").trigger(inputEvent);
            expect($modal.find(".sendArea").height()).to.be.above(80);
            testMsg += "\n\n\n\n\n";

            // When reach the max height
            $modal.find(".sendMsg").val(testMsg);
            $modal.find(".sendMsg").trigger(inputEvent);
            expect($modal.find(".sendArea").height()).to.equal(200);
        });
        // Press enter to send message
        it("Should be able to send message", function() {
            var keyEvent = $.Event("keypress", {which: keyCode.Enter});
            $modal.find(".sendMsg").trigger(keyEvent);
            expect($modal.find(".userMsg").last().text()).to.equal(testMsg.trim());
        });
        it("Should clear input after sending", function() {
            expect($modal.find(".sendMsg").val()).to.be.empty;
        });

        // Click "Minimize" button
        it("Should minimize the modal", function(done) {
            $modal.find(".minimize").click();
            setTimeout(function() {
                assert.isTrue($modal.find(".xi-fullscreen").is(":visible"));
                expect($modal.height()).to.equal(36);
                done();
            }, 300);
            // Click again
        });
        // Click again to restore
        it("Should restore the modal", function(done) {
            $modal.find(".minimize").click();
            setTimeout(function() {
                assert.isFalse($modal.find(".xi-fullscreen").is(":visible"));
                expect($modal.height()).to.equal(536);
                done();
            }, 300);
        });

        // Click "Send Email" button
        it("Should send emails", function() {
            $modal.find(".sendEmail").click();
            expect($modal.find(".sysMsg").text()).to.include(AlertTStr.EmailSending);
        });

        // Click "Close" button
        it("Should require confirmation when close the modal", function() {
            $modal.find(".close").click();
            assert.isTrue($modal.find(".confirmBox.endChat").is(":visible"));
        });

        // Click confirm button
        it("Should close the modal and disconenct from socket when confirm", function(done) {
            // When the user left the conversation
            $modal.find(".confirmClose").click();
            assert.isFalse($modal.is(":visible"));
            setTimeout(function() {
                assert.isFalse(LiveHelpModal.Instance._connected);
                done();
            }, 500);
        });
    });

    after(function() {
        UnitTest.offMinMode();
        $modal.find(".close").click();
        $modal.find(".confirmClose").click();
        LiveHelpModal.Instance._sendReqToSocket = oldSendReqToSocket;
        LiveHelpModal.Instance._sendEmail = oldSendEmail;
        LiveHelpModal.Instance._sendMsgToSocket = oldSendMsgToSocket;
        LiveHelpModal.Instance._closeSocket = oldCloseSocket;
        SupTicketModal.Instance.submitTicket = oldSubmitTicket;
        SupTicketModal.Instance.fetchLicenseInfo = oldFetchLicenseInfo;
    });
});