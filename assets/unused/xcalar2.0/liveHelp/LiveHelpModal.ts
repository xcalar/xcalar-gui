class LiveHelpModal {
    private static _instance: LiveHelpModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    // var $modal;  // $("#liveHelpModal");
    private _modalHelper: ModalHelper;
    private _userName: string;
    private _fullName: string;
    private _email: string;
    private _timer: any;
    private _socket: SocketIOClient.Socket;
    private _thread;
    private _ticketId: string;
    private _firstMsg: boolean;
    private _connected: boolean;
    private _licenseInfo;
    private readonly _url: string = "https://livechat.xcalar.com/";

    private constructor() {
        this._connected = false;
        this._modalHelper = new ModalHelper(this._getModal(), {
            "sizeToDefault": true,
            "noBackground": true,
            "noCenter": true,
            "noEnter": true
        });
        this._addEventListeners();
    }

    /**
     * LiveHelpModal.Instance.show
     * Three steps for user to connect to liveHelp:
     * 1. Request a connection
     * 2. Wait to be served by one of the supports
     * 3. Start chatting
     * Everytime click on 'liveHelp' on menu
     */
    public show(): void {
        let $modal = this._getModal();
        if ($modal.is(":visible")) {
            // already open
            return;
        }
        this._userName = XcUser.getCurrentUserName().split("@")[0];
        this._modalHelper.setup();
        $modal.find(".xi-fullscreen").hide();
        // If reqConn UI is displayed, hide all other UIs
        if ($modal.find(".reqConn").is(":visible")) {
            $modal.find(".confirmTicket").removeClass("xc-disabled");
            $modal.find(".confirmBox").hide();
            $modal.find(".chatBox").hide();
            $modal.find(".sendArea").hide();
            $modal.find(".emailInfo").show();
            $modal.find(".emailError").hide();
            $modal.find(".sendEmail").attr("data-original-title", AlertTStr.EmailDisabled);
            $modal.find(".sendEmail").addClass("email-disabled");
            $modal.find(".sendEmail").hide();
            // Auto-filling username and email
            $modal.find(".name").val(this._userName);
            let autoFillEmail = XcUser.getCurrentUserName();
            if (this._isValidEmail(autoFillEmail)) {
                $modal.find(".email").val(autoFillEmail);
            }
            if (this._infoComplete()) {
                $modal.find(".reqConnBtn").removeClass("btn-disabled");
            }
        }
    }

    /**
     * LiveHelpModal.Instance.userLeft
     */
    public userLeft(): void {
        let $modal = this._getModal();
        if (!$modal.find(".reqConn").is(":visible") &&
            $modal.find(".sendEmail").is(":visible")
        ) {
            this._closeSocket();
            this._autoSendEmail();
            this._updateTicket();
        }
    }

    private _getModal(): JQuery {
        return $("#liveHelpModal");
    }

    // Only for sending messages
    private _submitForm(): void {
        let content: string = this._getModal().find(".sendMsg").val();
        this._sendMsgToSocket({
            "room": this._thread,
            "content": content,
            "sender": this._fullName
        });
        this._appendMsg(content, "userMsg", this._fullName);
        this._clearInput();
    }

    // Leave the conversation, reset liveHelp modal
    private _close(): void {
        this.userLeft();
        if (this._socket) {
            this._socket.disconnect();
        }
        this._connected = false;
        this._thread = null;
        this._ticketId = null;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }

        let $modal = this._getModal();
        if ($modal.height() === 36) {
            this._minimizeOrRestore();
        }
        $modal.find(".confirmBox").hide();
        $modal.find(".reqConn").show();
        $modal.find(".chatMsg").html("");
        this._clearInput();
        this._modalHelper.clear();
    }

    // Request a connection to the support
    private _requestConn(autoResend: boolean): void {
        if (!autoResend) {
            // If the client is not connected to socket yet
            if (!this._connected) {
                this._socket = io.connect(this._url);
                this._addSocketEvent();
            }
            this._appendMsg(AlertTStr.EmailFunc, "sysMsg", null);
            this._appendMsg(AlertTStr.WaitChat, "sysMsg", null);
        }
        var reqTimer = setInterval(() => {
            if (this._connected) {
                // Send the request to socket
                this._sendReqToSocket();
                this._firstMsg = true;
                clearInterval(reqTimer);
            }
        }, 500);

        this._timer = setTimeout(() => {
            this._appendMsg(AlertTStr.NoSupport, "sysMsg", null);
            this._confirmTicket();
        }, 120000);

        // Hide reqConn UI, display chatting UI
        let $modal = this._getModal();
        $modal.find(".reqConn").hide();
        $modal.find(".chatBox").show();
        $modal.find(".sendArea").show();
        $modal.find(".sendEmail").show();
        this._clearInput();
    }

    private _sendReqToSocket(): void {
        this._socket.emit("liveHelpConn", {
            userName: this._userName,
            email: this._email,
            fullName: this._fullName
        });
    }

    private _confirmTicket(): void {
        this._getModal().find(".confirmBox.genTicket").show();
        this._resizeChatMsg();
    }

    private _sendMsgToSocket(message: any): void {
        this._socket.emit("liveHelpMsg", message);
    }

    // Update the chat messages in chat box
    private _appendMsg(
        content: string,
        type: string,
        sender: string | null
    ): void {
        let row = "<div class='" + type + "'></div>";
        let $modal = this._getModal();

        if (type !== "sysMsg") {
            // It seems that slack has already helped us escape it.
            // So we don't do it anymore
            //content = xcStringHelper.escapeHTMLSpecialChar(content);
            row = "<div class='" + type + "Sender'>" +
                    "<p>" + sender + "</p>" +
                "</div>" + row;
            if ($modal.find(".sendEmail").hasClass("email-disabled")) {
                $modal.find(".sendEmail").removeClass("email-disabled");
                $modal.find(".sendEmail").attr("data-original-title",
                                               AlertTStr.EmailEnabled);
            }
        }
        content = content.replace(/\n/g,"</br>");
        let $content = $modal.find(".chatMsg");
        $modal.find(".chatMsg").append(row);
        $modal.find(".chatMsg").find("." + type).last()
                .html("<p class='text'>" + content + "</p>");
        $content.scrollTop($content[0].scrollHeight);
    }

    // Clear all input
    private _clearInput(): void {
        let $modal = this._getModal();
        $modal.find(".sendMsg").val("");
        this._resizeSendArea();
        $modal.find("input").val("");
        $modal.find(".reqConnBtn").addClass("btn-disabled");
    }

    // Resize send area
    private _resizeSendArea(): void {
        let $modal = this._getModal();
        let $sendArea = $modal.find(".sendArea").eq(0);
        let $chatBox = $modal.find(".chatBox").eq(0);
        $sendArea.css("height", "80px");
        $chatBox.css("height", "calc(100% - 80px)");
    }

    // Send email
    private _prepareEmail(dest: string): void {
        let $modal = this._getModal();
        if (dest && !$modal.find(".reqConn").is(":visible")) {
            let content: string = "";
            $modal.find(".userMsg, .supportMsg").each((_i, el) => {
                let $el = $(el);
                content += $el.prev().text() + ": " + $el.text() + "\n";
            });

            if (content) {
                if (this._licenseInfo == null) {
                    SupTicketModal.Instance.fetchLicenseInfo()
                    .then((licenseObj: any) => {
                        this._licenseInfo = AlertTStr.LicenseKey + "\n" +
                                            licenseObj.key + "\n\n" +
                                            AlertTStr.LicenseExpire + "\n" +
                                            licenseObj.expiration + "\n\n";
                    })
                    .fail(() => {
                        this._licenseInfo = "No license information";
                    });
                }
                content += "\n=====Here is your license information=====\n\n" +
                           this._licenseInfo;
                let msgBody = "=====Your ticket ID is " + this._ticketId + "=====\n\n";
                if (!this._ticketId) {
                    msgBody = "=====No ticket is created=====\n\n";
                }
                let mailOpts = {
                    from: 'support-internal@xcalar.com',
                    to: dest,
                    subject: 'Support Chat History for ' + this._fullName,
                    text: msgBody + content
                };
                this._appendMsg(AlertTStr.EmailSending, "sysMsg", null);
                this._sendEmail(mailOpts);
            }
        }
    }

    private _sendEmail(mailOpts: object): void {
        this._socket.emit("sendEmail", mailOpts, () => {
            this._appendMsg(AlertTStr.EmailSent, "sysMsg", null);
        });
    }

    private _startChatting(): void {
        let $modal = this._getModal();
        this._fullName = $modal.find(".name").val();
        this._email = $modal.find(".email").val();
        if (!this._isValidEmail(this._email)) {
            $modal.find(".emailInfo").hide();
            $modal.find(".emailError").show();
            return;
        }
        this._requestConn(false);
    }

    private _infoComplete(): boolean {
        let $modal = this._getModal();
        return ($modal.find(".name").val() && $modal.find(".email").val());
    }

    private _resizeChatMsg(): void {
        let $modal = this._getModal();
        let $chatMsg = $modal.find(".chatMsg").eq(0);
        if ($modal.find(".confirmBox:visible").length === 0) {
            $chatMsg.css("height", "100%");
            $chatMsg.css("margin-top", "0");
        } else {
            if ($modal.find(".confirmBox:visible").length === 1) {
                $chatMsg.css("height", "calc(100% - 52px)");
            } else {
                $chatMsg.css("height", "calc(100% - 107px)");
            }
            $chatMsg.css("margin-top", "-3px");
        }
    }

    // Minimze the liveHelp modal
    private _minimizeOrRestore(): void {
        let $modal = this._getModal();
        let width: number = $modal.parent().width();
        let height: number = $modal.parent().height();
        if ($modal.height() !== 36) {
            $modal.css("min-height","36px");
            $modal.animate({
                height: 36,
                width: 425,
                left: width - (15 + 425),
                top: height - (10 + 36)
            }, 200, function() {
                $modal.find(".modalContent").hide();
                $modal.find(".ui-resizable-handle").hide();
                $modal.find(".xi-exit-fullscreen").hide();
                $modal.find(".xi-fullscreen").show();
            });
        } else {
            $modal.css("min-height","300px");
            $modal.animate({
                height: 536,
                width: 425,
                left: width - (15 + 425),
                top: height - (10 + 536)
            }, 200, function() {
                $modal.find(".modalContent").show();
                $modal.find(".ui-resizable-handle").show();
                $modal.find(".xi-fullscreen").hide();
                $modal.find(".xi-exit-fullscreen").show();
            });
        }
    }

    private _submitTicket(triggerPd: boolean, failure: number): void {
        this._firstMsg = false;

        let $modal = this._getModal();
        if (failure < 1) {
            $modal.find(".confirmTicket").addClass("xc-disabled");
            this._appendMsg(AlertTStr.WaitTicket, "sysMsg", null);
        }
        let info: string;
        let success: boolean = true;
        let ticketObj = {
            "ticketId": null,
            "comment": "======This ticket is auto-generated from LiveChat=====",
            "userIdName": userIdName,
            "userIdUnique": userIdUnique,
            "severity": 4,
            "fromChat": true,
            "triggerPd": triggerPd
        };
        let licenseKey: string;
        let expiration: string;

        SupTicketModal.Instance.fetchLicenseInfo()
        .then((licenseObj: any) => {
            licenseKey = licenseObj.key;
            expiration = licenseObj.expiration;
            return SupTicketModal.Instance.submitTicket(ticketObj, licenseObj, true, true);
        })
        .then((ret: any) => {
            try {
                let logs = JSON.parse(ret.logs);
                if (logs.error) {
                    console.error(logs.error);
                    success = false;
                } else {
                    this._ticketId = logs.ticketId;
                    let admin = logs.admin;
                    this._licenseInfo = AlertTStr.LicenseKey + "\n" +
                                  licenseKey + "\n\n" +
                                  AlertTStr.LicenseExpire + "\n" +
                                  expiration + "\n\n";
                    info = AlertTStr.CaseId + "\n" +  this._ticketId + "\n\n" +
                            this._licenseInfo +
                            AlertTStr.XcalarAdmin + "\n" + admin;
                }
            } catch (err) {
                console.error(err);
                success = false;
            }
        })
        .fail((err) => {
            console.error(err);
            success = false;
        })
        .always(() => {
            if (!success) {
                this._firstMsg = true;
                // It's like a lock. Realse it at this point
                // We only set the lock for ticket creation process
                if (failure < 2) {
                    this._timer = setTimeout(() => {
                        this._submitTicket(triggerPd, failure + 1);
                    }, 5000);
                } else {
                    info = AlertTStr.TicketError;
                    this._appendMsg(info, "sysMsg", null);
                    $modal.find(".confirmTicket").removeClass("xc-disabled");
                }
            } else {
                this._appendMsg(info, "sysMsg", null);
                $modal.find(".confirmBox.genTicket .confirmCancel").click();
            }
        });
    }

    private _isValidEmail(emailAddress: string): boolean {
        let pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
        return pattern.test(emailAddress);
    }

    private _autoSendEmail(): void {
        // Only enable auto-sending email when modal is shown
        let $modal = this._getModal();
        let email = this._email;
        if ($modal.is(":visible") && this._isValidEmail(email)) {
            this._prepareEmail(email);
        }
    }

    private _updateTicket(): void {
        let content: string = "";
        let $modal = this._getModal();
        $modal.find(".userMsg, .supportMsg").each((_i, el) => {
            let $el = $(el);
            if ($el.hasClass("userMsg")) {
                content += "You: " + $el.text() + "\n\n";
            } else {
                content += "Xcalar: " + $el.text() + "\n\n";
            }
        });

        if (content !== "" && this._ticketId) {
            let ticketObj = {
                "ticketId": this._ticketId,
                "comment": "======This ticket is auto-generated from LiveChat" +
                           "=====\n"+ content,
                "userIdName": userIdName,
                "userIdUnique": userIdUnique,
                "severity": 4,
                "fromChat": true,
                "triggerPd": false
            };

            SupTicketModal.Instance.fetchLicenseInfo()
            .then((licenseObj) => {
                SupTicketModal.Instance.submitTicket(ticketObj, licenseObj, true, true);
            });
        }
    }

    private _closeSocket(): void {
        if (this._socket != null) {
            this._socket.emit("userLeft", {
                "room": this._thread,
                "ticketId": this._ticketId
            });
        }
    }

    private _onInputMessage(): void {
        let $modal = this._getModal();
        let $sendArea = $modal.find(".sendArea").eq(0);
        let $sendMsg = $modal.find(".sendMsg").eq(0);
        let $chatBox = $modal.find(".chatBox").eq(0);
        // First, try to resize to default
        this._resizeSendArea();
        let scrollHeight = $sendMsg.prop("scrollHeight");
        let toIncrease = scrollHeight - $sendArea.height();
        // If need to increase height
        if (toIncrease > 0 ) {
            let newHeight = $sendArea.height() + toIncrease;
            // If the new height is below max-height, adjust accordingly
            if (newHeight <= 200) {
                $sendArea.height($sendArea.height() + toIncrease);
                $chatBox.css("height", "calc(100% - " + (newHeight) + "px)");
            } else {
                // Set to max-height
                $sendArea.height(200);
                $chatBox.css("height", "calc(100% - 200px)");
            }
        }
    }

    private _onLeave(): void {
        // If it is not on reqConn UI, ask the user if he needs all messages
        // to be sent to his email
        let $modal = this._getModal();
        if (!$modal.find(".reqConn").is(":visible") &&
            $modal.find(".sendEmail").is(":visible")) {
            let $confirmClose = $modal.find(".confirmBox.endChat").eq(0);
            if ($confirmClose.is(":visible")) {
                $confirmClose.find(".confirmBoxRight").addClass("animated");
                setTimeout(() => {
                    $confirmClose.find(".confirmBoxRight")
                                .removeClass("animated");
                }, 300);
            } else {
                $modal.find(".confirmBox.endChat").show();
            }
            this._resizeChatMsg();
        } else {
            this._close();
        }
    }

    private _addSocketEvent(): void {
        let socket = this._socket;
        socket.on("connect", () => {
            this._connected = true;
        });

        // For user, simply append message
        socket.on("liveChatMsg", (message) => {
            if (this._firstMsg) {
                if (this._timer) {
                    clearTimeout(this._timer);
                    this._timer = null;
                }
                this._appendMsg(AlertTStr.StartChat, "sysMsg", null);
            }
            this._appendMsg(message.content, "supportMsg", message.sender);
            if (this._firstMsg) {
                this._submitTicket(false, 0);
            }
        });

        socket.on("joinRoom", (room) => {
            this._thread = room;
        });
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        // Enable requesting connection only when both name and email are given
        $modal.find(".reqConn input").keypress((e) => {
            if (e.which === keyCode.Enter && this._infoComplete()) {
                this._startChatting();
            }
        });
        $modal.find(".reqConn input").on("input", () => {
            if (!$modal.find(".reqConn input").is(":visible")) return; // ENG-8642
            if (this._infoComplete()) {
                $modal.find(".reqConnBtn").removeClass("btn-disabled");
            } else {
                $modal.find(".reqConnBtn").addClass("btn-disabled");
            }
        });

        // Click 'send' button when it is for requesting connection
        $modal.on("click", ".reqConnBtn", () => {
            this._startChatting();
        });

        // press enter when input
        $modal.find(".sendMsg").keypress((e) => {
            if (e.which === keyCode.Enter &&
                !e.shiftKey &&
                $(e.currentTarget).val()
            ) {
                e.preventDefault();
                this._submitForm();
                this._resizeSendArea();
            }
        });

        // Enable sending message only when user enters chat message
        $modal.find(".sendMsg").on("input", () => {
            if (!$modal.find(".sendMsg").is(":visible")) return; // ENG-8642
            this._onInputMessage();
        });

        $modal.on("click", ".sendEmail", () => {
            this._prepareEmail(this._email);
        });

        // Click leave button
        $modal.on("click", ".close", () => {
            this._onLeave();
        });

        $modal.on("click", ".confirmClose", () => {
            this._close();
        });

        $modal.on("click", ".confirmCancel", (event) => {
            $(event.currentTarget).closest(".confirmBox").hide();
            if ($modal.find(".confirmBox:visible").length === 1) {
                $modal.find(".chatMsg").css("height", "calc(100% - 52px)");
            } else {
                $modal.find(".chatMsg").css("height", "100%");
            }
            this._resizeChatMsg();
        });

        $modal.on("click", ".confirmTicket", () => {
            this._submitTicket(true, 0);
        });

        // Click on minimize button
        $modal.on("click", ".minimize", () => {
            this._minimizeOrRestore();
        });
    }
}