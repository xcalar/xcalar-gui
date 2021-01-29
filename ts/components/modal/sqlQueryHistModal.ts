class SqlQueryHistModal {
    private static _instance = null;
    public static getInstance(): SqlQueryHistModal {
        return this._instance || (this._instance = new this());
    }

    private _$modal: JQuery = null;
    private _$content: JQuery = null;
    private _modalHelper: ModalHelper = null;

    public setup() {
        this._$modal = $('#sqlQueryHistModal');
        this._$content = this._$modal.find('[data-xcid="content"]');
        this._modalHelper = new ModalHelper(this._$modal, {});

        // Setup event listeners
        const eventNameSpace = 'SqlQueryHistModal';
        this._$modal.off(`.${eventNameSpace}`);
        this._$modal.on(`click.close.${eventNameSpace}`, '.close, .cancel', () => this._close());
    }

    public show(
        {query = '', errorMsg = ''}: {query: string, errorMsg?: string}
    ): void {
        let html = xcStringHelper.escapeHTMLSpecialChar(query);
        if (errorMsg != null && errorMsg.length > 0) {
            html += `<br/><br/>${SQLTStr.queryFailMessage}:<br/>${xcStringHelper.escapeHTMLSpecialChar(errorMsg)}`;
        }
        this._modalHelper.setup();
        this._$content.html(html);
    }

    private _close() {
        this._modalHelper.clear();
    }
}