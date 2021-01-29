class AdminAlertCard {
    private _id: string;

    public constructor(id: string) {
        this._id = id;
        this._addEventListeners();
    }

    public show(): void {
        this._getCard().removeClass("xc-hidden");
    }

    private _getCard(): JQuery {
        return $("#" + this._id);
    }

    protected _submitForm(): void {
        let $card: JQuery = this._getCard();
        let message: string = $card.find(".alert-msg").val();
        if (message) {
            let alertOption = {
                "title": MonitorTStr.AdminAlert,
                "message": "From " + XcUser.getCurrentUserName() + " : " + message
            };
            XcSocket.Instance.sendMessage("adminAlert", alertOption);
        }
        this._clear();
    }

    private _close(): void {
        let $card: JQuery = this._getCard();
        $card.addClass("xc-hidden");
        this._clear();
    }

    private _clear(): void {
        let $card: JQuery = this._getCard();
        $card.find(".alert-msg").val("");
        this._toggleConfirmButton(false);
    }

    private _toggleConfirmButton(enable: boolean): void {
        let $card: JQuery = this._getCard();
        let $button: JQuery = $card.find(".confirm");
        if (enable) {
            $button.removeClass("btn-disabled");
        } else {
            $button.addClass("btn-disabled");
        }
    }

    private _addEventListeners(): void {
        let $card: JQuery = this._getCard();
        $card.find(".alert-msg").on("input", (event) => {
            if (!$card.find(".alert-msg").is(":visible")) return; // ENG-8642
            let enable: boolean = $(event.currentTarget).val();
            this._toggleConfirmButton(enable);
        });
        // click cancel or close button
        $card.on("click", ".close", (event) => {
            event.stopPropagation();
            this._close();
        });
        $card.on("click", ".clear", (event) => {
            $(event.currentTarget).blur();
            this._clear();
        });
        // click send button
        $card.on("click", ".confirm", (event) => {
            $(event.currentTarget).blur();
            this._submitForm();
        });
        // press enter when input
        $card.find(".alert-msg").keypress((e) => {
            if (e.which === keyCode.Enter && !e.shiftKey) {
                e.preventDefault();
                this._submitForm();
            }
        });
    }
}
