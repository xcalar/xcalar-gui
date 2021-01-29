class LicenseModal {
    private static _instance: LicenseModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;

    private _getModal(): JQuery {
        return $("#licenseModal");
    }

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            "noResize": true
        });

        this._addEventListeners();
    }

    /**
     * LicenseModal.Instance.show
     */
    public show() {
        this._modalHelper.setup();

        let licenseKey: string = "123456789";
        this._getModal().find(".newLicenseKey").attr("placeholder", licenseKey);
    }

    private _close(): void {
        this._modalHelper.clear();
        this._getModal().find(".newLicenseKey").val("");
    }

    protected _submitForm(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let newLicense = this._getModal().find(".newLicenseKey").val();
        XcalarUpdateLicense(newLicense)
        .then(() => {
            xcUIHelper.showSuccess(SuccessTStr.UpdateLicense);
            deferred.resolve();
        })
        .fail((error) => {
            xcUIHelper.showFail("Update License Error: " + xcHelper.parseError(error));
            deferred.reject(error);
        });
        this._close();
        return deferred.promise();
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.find(".confirm").click(() => {
            this._submitForm();
        });
    }
}
