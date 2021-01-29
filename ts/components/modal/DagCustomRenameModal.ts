class DagCustomRenameModal {
    private static _instance: DagCustomRenameModal;
    private _$container: JQuery;
    private _modalHelper: ModalHelper;
    private _model: {
        name: string,
        validateFunc: (newName: string) => boolean,
        onSubmit: (newName: string) => void
    };

    public static get Instance(): DagCustomRenameModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._$container = $('#dagCustomRenameModal');
        this._modalHelper = new ModalHelper(this._$container, {
            noEnter: true
        });
        this._model = {
            name: '', validateFunc: () => true, onSubmit: () => {}
        };
    }

    /**
     * Show the modal
     * @param props.name name of the operator
     * @param props.validateFunc Function to validate the name
     * @param props.onSubmit The callback function when clicking save
     */
    public show(props: {
        name: string,
        validateFunc: (name: string) => boolean,
        onSubmit: (name: string) => void
    }): boolean {
        if (this._$container.is(":visible")) {
            return false;
        }

        this._model.name = props.name;
        this._model.validateFunc = props.validateFunc;
        this._model.onSubmit = props.onSubmit;

        this._renderUI();
        this._modalHelper.setup();
        return true;
    }

    private _renderUI(): void {
        // Fill the input with current name
        const $elemNameInput = this._$container.find('.selName');
        $elemNameInput.val(this._model.name);

        // Event handlers
        const $elemCancelButtons = this._$container.find('.close, .cancel');
        $elemCancelButtons.off();
        $elemCancelButtons.on('click', () => {
            this._hide();
        });

        const $elemSaveButton = this._$container.find('.selSave');
        if (this._isValidName()) {
            this._enableSave();
        } else {
            this._disableSave();
        }
        $elemSaveButton.off();
        $elemSaveButton.on('click', () => {
            this._hide();
            this._model.onSubmit(this._model.name);
        });

        $elemNameInput.off();
        $elemNameInput.on('input', (event) => {
            if (!$elemNameInput.is(":visible")) return; // ENG-8642
            this._model.name = $(event.target).val().trim();
            if (this._isValidName()) {
                this._enableSave();
            } else {
                this._disableSave();
            }
        });
    }

    private _enableSave() {
        const $elemSaveButton = this._$container.find('.selSave');
        $elemSaveButton.removeClass('btn-disabled');
    }

    private _disableSave() {
        const $elemSaveButton = this._$container.find('.selSave');
        if (!$elemSaveButton.hasClass('btn-disabled')) {
            $elemSaveButton.addClass('btn-disabled');
        }
    }

    private _isValidName(): boolean {
        return this._model.validateFunc(this._model.name);
    }

    private _hide() {
        this._modalHelper.clear();
    }
}


if (typeof exports !== 'undefined') {
    exports.DagCustomRenameModal = DagCustomRenameModal;
};

if (typeof runEntity !== "undefined") {
    runEntity.DagCustomRenameModal = DagCustomRenameModal;
}