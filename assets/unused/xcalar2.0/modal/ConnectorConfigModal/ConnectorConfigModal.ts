class ConnectorConfigModal {
    private static _instance: ConnectorConfigModal;
    private _modalHelper: ModalHelper;
    private _callback: Function;
    private _connector;

    public static get Instance(): ConnectorConfigModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal());
        this._addEventListeners();
    }

    /**
     * ConnectorConfigModal.Instance.show
     */
    public show(
        title: string,
        connector: string,
        callback: Function
    ): void {
        this._connector = connector;
        let $modal = this._getModal();
        if (connector === DSTargetManager.DBConnector) {
            $modal.addClass("db");
        } else {
            $modal.removeClass("db");
        }
        $modal.css("height", "");
        $modal.css("width", "");
        $modal.find(".modalHeader .title .text").text(title);
        this._modalHelper.reset({
            sizeToDefault: true,
        });
        this._modalHelper.setup();
        this._callback = callback;

        $modal.addClass("loading");
        DSTargetManager.getTargetTypeList(true)
        .then(() => {
            this._render();
            // XXX TODO: make the modalHelper auto resolve it
            this._modalHelper.refreshTabbing();
        })
        .fail((error) => {
            console.error(error);
            $modal.addClass("error");
        })
        .always(() => {
            $modal.removeClass("loading")
        });
    }

    private _getModal(): JQuery {
        return $("#connectorConfigModal");
    }

    private _getModalMain(): JQuery {
        return this._getModal().find(".modalMain");
    }

    private _getNameEl(): JQuery {
        return this._getModalMain().find(".formSection.name input");
    }

    private _getParamsEl(): JQuery {
        return this._getModalMain().find(".formContent");
    }

    private _render(): void {
        let html = DSTargetManager.renderConnectorConfig(this._connector);
        this._getParamsEl().html(html);
    }

    private _close(): void {
        this._modalHelper.clear();
        this._callback = null;
        this._getNameEl().val("");
        this._getParamsEl().empty();
        this._getModal().removeClass("loading")
                        .removeClass("error");
    }

    private _submitForm(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $name = this._getNameEl();
        let $params = this._getParamsEl();
        let $submitBtn = this._getModal().find(".modalBottom .confirm");
        DSTargetManager.createConnector(this._connector, $name, $params, $submitBtn)
        .then((targetName) => {
            if (typeof this._callback === "function") {
                this._callback(targetName);
            }
            this._close();
            deferred.resolve();
        })
        .fail((error) => {
            if (error != null) {
                StatusBox.show(FailTStr.Target, $submitBtn, false, {
                    detail: error.log
                });
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.find('.confirm').click(() => {
            this._submitForm();
        });
    }
}