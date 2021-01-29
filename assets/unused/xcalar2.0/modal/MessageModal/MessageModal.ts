interface MessageModalOptions extends Alert.AlertOptions {
    isInfo?: boolean;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

class MessageModal {
    private static _instance: MessageModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _defaultWidth: number = 650;
    private _defaultHeight: number = 223;
    private _heightNoCheckbox: number = 193;

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            "noResize": true,
            "sizeToDefault": true
        });
        this._addEventListeners();
    }

    /**
     * MessageModal.Instance.show
     */
    public show(options: MessageModalOptions): void {
        this._setTitle(options.title, options.isInfo);
        this._setMessage(options.msg);
        this._setCheckBox(options.isCheckBox);
        this._setButtons(options);
        this._modalHelper.setup({sizeCallBack: this._sizeModal.bind(this, options)});
        if (typeof mixpanel !== "undefined") {
            xcMixpanel.track("messageModal", {
                title: options.title,
                msg: options.msg
            });
        }
    }

    private _getModal(): JQuery {
        return $("#messageModal");
    }

    private _getCheckboxSection(): JQuery {
        return this._getModal().find(".checkboxSection");
    }

    private _close(callback: Function): void {
        let $checkbox = this._getCheckboxSection().find(".checkbox");
        let hasChecked: boolean = $checkbox.hasClass("checked")

        this._modalHelper.clear();
        this._setTitle("", false);
        $checkbox.removeClass("checked");
        this._getModal().off(".messageModal");

        if (callback instanceof Function) {
            callback(hasChecked);
        }
    }

    private _setTitle(title: string, isInfo: boolean): void {
        let $title = this._getModal().find(".title");
        $title.find(".text").text(title);
        if (isInfo) {
            $title.find(".icon")
                .addClass("xi-info-circle")
                .removeClass("xi-warning");
        } else {
            $title.find(".icon")
                .removeClass("xi-info-circle")
                .addClass("xi-warning");
        }
    }

    private _setMessage(message: string): void {
        this._getModal().find(".message").html(message);
    }

    private _setCheckBox(isCheckBox: boolean): void {
        let $modal = this._getModal();
        if (isCheckBox) {
            $modal.removeClass("noCheckbox");
        } else {
            $modal.addClass("noCheckbox");
        }
    }

    private _setButtons(options: MessageModalOptions): void {
        let $modal = this._getModal();
        let $cancelBtn = $modal.find(".cancel");
        let $confirmBtn = $modal.find(".confirm");

        if (options.isAlert) {
            $cancelBtn.text(AlertTStr.Close);
            $confirmBtn.hide();
        } else {
            $cancelBtn.text(AlertTStr.Cancel);
            $confirmBtn.show();
        }

        if (options.cancelButtonText) {
            $cancelBtn.text(options.cancelButtonText);
        } else {
            $cancelBtn.text("Close");
        }

        if (options.confirmButtonText) {
            $confirmBtn.text(options.confirmButtonText);
        } else {
            $confirmBtn.text("Confirm");
        }

        $modal.on("click.messageModal", ".close, .cancel", (e) => {
            e.stopPropagation();
            this._close(options.onCancel);
        });

        // set confirm button
        $modal.on("click.messageModal", ".confirm", (e) => {
            e.stopPropagation();
            this._close(options.onConfirm);
        });
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".checkboxSection", (e) => {
            e.stopPropagation();
            $(e.currentTarget).find(".checkbox").toggleClass("checked");
        });
    }

    private _sizeModal(options: Alert.AlertOptions): void {
        const $modal: JQuery = this._getModal();
        let height: number;
        if (options.isCheckBox) {
            height = this._defaultHeight;
        } else {
            height = this._heightNoCheckbox;
        }
        $modal.height(height);
        $modal.show(); // show to get height/width

        if (options.size) {
            switch (options.size) {
                case ("medium"):
                    $modal.width(500);
                    break;
                default:
                    break;
            }
        } else {
            $modal.width(this._defaultWidth);
        }

        if (options.sizeToText) {
            let headerHeight = $modal.find(".modalHeader").outerHeight();
            let contentHeight = $modal.find(".message").outerHeight() + $modal.find(".checkboxSection").outerHeight();
            let bottomHeight = $modal.find(".modalBottom").outerHeight();
            $modal.height(contentHeight + headerHeight + bottomHeight);
        }
        $modal.hide(); // hide after we get width/height
    }
}