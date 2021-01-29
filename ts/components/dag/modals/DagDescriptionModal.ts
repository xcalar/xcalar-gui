class DagDescriptionModal {
    private static _instance: DagDescriptionModal;
    private _$modal: JQuery;
    private _$textArea: JQuery; // $modal.find(".xc-textArea")
    private _modalHelper: ModalHelper;
    private _node: DagNode;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._$modal = $("#dagDescriptionModal");
        this._$textArea = this._$modal.find(".xc-textArea");

        this._modalHelper = new ModalHelper(this._$modal, {
            noEnter: true
        });
        this._addEventListeners();
    }

    /**
     * DagDescriptionModal.Instance.show
     * @returns {boolean}
     * @param nodeId
     */
    public show(nodeId: DagNodeId, viewOnly?: boolean): boolean {
        if (this._$modal.is(":visible")) {
            return false;
        }

        this._node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        if (this._node == null) {
            // error case
            return false;
        }
        if (viewOnly) {
            this._$modal.addClass("viewOnly");
            this._$textArea.prop('readonly', true)
        } else {
            this._$modal.removeClass("viewOnly");
            this._$textArea.prop('readonly', false);
        }
        const curDescription: string = this._node.getDescription();
        this._$textArea.val(curDescription);

        this._modalHelper.setup();
        this._$textArea.focus();
        this._$textArea.scrollTop(0);
        return true;
    };

    private _addEventListeners(): void {
        const self = this;
        this._$modal.on("click", ".close, .cancel", function() {
            self._closeModal();
        });

        this._$modal.on("click", ".confirm", function() {
            self._submitForm();
        });

        this._$modal.find(".clear").click(function() {
            self._$textArea.val("").focus();
        });
    }

    private _closeModal(): void {
        this._modalHelper.clear();
        this._reset();
    }

    private _reset(): void {
        this._node = null;
        this._$textArea.val("");
    }

    protected _submitForm(): XDPromise<void> {
        let newDescription = this._$textArea.val().trim();
        let descriptionLen = newDescription.length;
        if (descriptionLen > XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen) {
            const errMsg = 'The maximum allowable description length is ' +
                        XcalarApisConstantsT.XcalarApiMaxDagNodeCommentLen +
                        ' but you provided ' + descriptionLen + ' characters.';
            StatusBox.show(errMsg, this._$textArea);
            return PromiseHelper.reject();
        }
        const nodeId: DagNodeId = this._node.getId();
        this._closeModal();
        return DagViewManager.Instance.editDescription(nodeId, newDescription);
    }
}
