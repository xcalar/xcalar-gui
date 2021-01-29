
type PbTblInfo = any;
type HTML = any;
class LoadApp {
    private _app: any;
    private _tableInfo: PbTblInfo;
    private _dataTableName: string;
    private _cancelAction: Function;
    private _icvTable: any;
    private _isCreatingICV: boolean;
    private _eventListener;
    public status: string; // "inProgress", "canceled", "done", "error";
    public progress: number;

    private Texts = {
        createButtonLabel: 'Create Table',
        creatingTable: 'Creating table',
        created: 'Table Created. Please go into a notebook project and check.',
        createdCheckError: 'Table Created.',
        createdWithComplement: 'Table created with errors.',
        createError: 'Error',
        ComplementTableHint: 'Some rows in the source files may not be loaded, click to check the errors.',
        ComplementTableHint2: 'Some rows in the source files cannot be loaded, click to see the errors.'
    };

    constructor(app: any, tableInfo: PbTblInfo, eventListener) {
        this._app = app;
        this._tableInfo = tableInfo;
        this._isCreatingICV = false;
        this._eventListener = eventListener;
        this.status = "inProgress";
    }

    get app() {
        return this._app;
    }

    public setCancelEvent(event: Function): void {
        this._cancelAction = event;
    }

    // signifies that operation is done
    public setDataTableName(dataTableName: string): void {
        if (dataTableName) {
            this.status = "done";
        }
        this._dataTableName = dataTableName;
        this._refreshPreview();
    }

    public getDataTableName(): string {
        return this._dataTableName;
    }

    public updateProgress(progress, range) {
        progress = this._convertProgress(progress, range);
        this.progress = progress;
        this._tableInfo.loadMsg = `${this.Texts.creatingTable}`;
        this._refreshPreview();
    }

    public async cancel(): Promise<boolean> {
        const confirmed = await this._confirm({
            title: 'Confirm',
            message: 'Do you want to cancel the loading?'
        });
        if (this._cancelAction != null && confirmed) {
            this._cancelAction();
            this.status = "canceled";
            this._eventListener(this._tableInfo, this);
            return true;
        }
    }

    public async createICVTable(): Promise<void> {
        if (!this._dataTableName) {
            return;
        }

        try {
            this._tableInfo.loadMsg = null;
            this._isCreatingICV = true;
            this._refreshPreview();
            this._icvTable = await this._app.createICVTable(this._dataTableName);
        } catch (e) {
            console.error(e);
        } finally {
            this._isCreatingICV = false;
            this._refreshPreview();
        }
    }

    private _refreshPreview(): void {
        this._eventListener(this._tableInfo, this);
        // TblSourcePreview.Instance.show(this._tableInfo, this._tableInfo.loadMsg);
    }

    public getStatusHTML(): HTML {
        const state = this._tableInfo.state;
        if (state === window["PbTblState"].Loading || state === window["PbTblState"].Canceling) {
            return this._getLoadingAndCancelingHTML(this._tableInfo.loadMsg, state === window["PbTblState"].Canceling);
        } else {
            return this._getSuccessHTML();
        }
    }

    private _getLoadingAndCancelingHTML(text: string, isCancelling: boolean): HTML {
        const html: HTML =
        '<div class="loadingContainer">' +
            this._getLoadingHTML(text) +
            '<div class="cancel' + (isCancelling ? ' xc-disabled' : '') + '">' +
                'Cancel' +
            '</div>' +
        '</div>';
        return html;
    }

    private _getSuccessHTML(): HTML {
        if (false && this._icvTable == null) {
            if (this._isCreatingICV) {
                return (
                    '<div class="loadingContainer">' +
                        this._getLoadingHTML(`${this.Texts.createdCheckError} Checking for Errors`) +
                    '</div>'
                )
            } else {
                return (
                    '<span>' +
                       this.Texts.createdCheckError +
                       '<span class="xc-action createICV">' +
                           'Check for Errors' +
                       '</span>' +
                       '<i class="icon qMark xi-unknown"' +
                       ' data-toggle="tooltip"' +
                       ' data-container="body"' +
                       ' data-title="' + this.Texts.ComplementTableHint + '"></i>' +
                    '</span>'
                );
            }
        } else {
            return (
                '<span>' +
                    // '<i class="icon xi-tick"></i>' +
                    this.Texts.created +
                '</span>'
            );
        }
    }

    private _getLoadingHTML(text: string): HTML {
        return (
            '<div class="loading animatedEllipsisWrapper">' +
                '<div class="text">' +
                text +
                '</div>' +
                '<div class="wrap">' +
                    '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                    '<div class="animatedEllipsis staticEllipsis">....</div>' +
                '</div>' +
            '</div>'
        );
    }

    private async _confirm({ title, message }): Promise<boolean> {
        return new Promise((resolve) => {
            Alert.show({
                title,
                msg: message,
                onCancel: () => { resolve(false); },
                onConfirm: () => { resolve(true); }
            });
        });
    }

    private _convertProgress(progress: number, range: number[]): number {
        const [start, end] = range;
        return Math.min(Math.ceil(progress / 100 * (end - start) + start), end);
    }
}

export default LoadApp;