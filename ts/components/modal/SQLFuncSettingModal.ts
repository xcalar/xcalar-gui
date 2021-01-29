class SQLFuncSettingModal {
    private static _instance: SQLFuncSettingModal;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _onSubmit: (name: string, numInput: number) => void;
    private _onCancel: () => void;

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });
        this._addEventListeners();
    }

    /**
     * SQLFuncSettingModal.Instance.show
     * @param callback
     */
    public show(
        onSubmit: (name: string, numInput: number) => void,
        onCancel: () => void,
        numInput: number | null
    ): void {
        this._modalHelper.setup();
        const fnName: string = DagList.Instance.getValidName(null, false, true);
        this._getNameInput().val(fnName);
        if (numInput != null) {
            this._getNumInput().val(numInput)
            .addClass("xc-disabled");
        } else {
            this._getNumInput().val(1)
            .removeClass("xc-disabled");
        }
        this._onSubmit = onSubmit;
        this._onCancel = onCancel;
    }

    private _getModal(): JQuery {
        return $("#sqlFuncSettingModal");
    }

    private _getNameInput(): JQuery {
        return this._getModal().find(".fnName").find("input");
    }

    private _getNumInput(): JQuery {
        return this._getModal().find(".numInput").find("input");
    }

    private _close(isCancel: boolean): void {
        if (isCancel && typeof this._onCancel === "function") {
            this._onCancel();
        }
        this._modalHelper.clear();
        this._getNameInput().val("");
        this._getNumInput().val("");
        this._onSubmit = null;
        this._onCancel = null;
    }

    protected _submitForm(): void {
        let res = this._validate();
        if (res == null) {
            // invalid case
            return;
        }
        if (typeof this._onSubmit === "function") {
            this._onSubmit(res.name, res.num);
        }
        this._close(false);
    }

    private _validate(): {name: string, num: number} {
        const $nameInput: JQuery = this._getNameInput();
        const $numInput: JQuery = this._getNumInput();
        const name: string = $nameInput.val().trim();
        const num: number = Number($numInput.val());

        const nameError: string = DagList.Instance.validateName(name, true);
        const isValid = xcHelper.validate([{
            $ele: $nameInput
        }, {
            $ele: $nameInput,
            error: nameError,
            check: () => nameError != null
        }, {
            $ele: $numInput
        }, {
            $ele: $numInput,
            error: ErrTStr.PositiveInteger,
            check: () => {
                return isNaN(num) || num <= 0 || !Number.isInteger(num);
            }
        }]);
        if (!isValid) {
            return;
        }
        return {
            name,
            num
        }
    }

    private _addEventListeners() {
        const $modal = this._getModal();
        // click cancel or close button
        $modal.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close(true);
        });

        // click upload button
        $modal.on("click", ".confirm", () => {
            this._submitForm();
        });
    }
}