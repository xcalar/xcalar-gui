class DSS3Config extends DSConnectorPanel {
    private static _instance: DSS3Config;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _connector: string;

    private constructor() {
        super();
        this._connector = DSTargetManager.S3Connector;
        this._getCard().find(".back").text(CommonTxtTstr.Clear);
    }

    /**
     * DSS3Config.Instance.show
     */
    public show(): void {
        DataSourceManager.switchView(DataSourceManager.View.S3);
        super.show();
    }

    protected _getCard(): JQuery {
        return $("#dsForm-s3Config");
    }

    protected _renderTargetList():  HTML {
        let html: HTML = DSTargetManager.getConnectors(this._connector)
        .map((targetName) => `<li>${targetName}</li>`)
        .join("");
        html = '<li class="createNew">+ Create New Amazon S3 Connector</li>' +
                '<li class="public">' + DSTargetManager.getPublicS3Connector() + '</li>' +
                html +
                // XXX hack DataMart that should be removed
                '<li>Default Shared Root</li>';
        return html;
    }


    protected _onCreateNew($input: JQuery): void {
        let title: string = "Create Amazon S3 Connector";
        ConnectorConfigModal.Instance.show(title, this._connector, (targetName) => {
            $input.val(targetName);
        });
    }

    protected _onSelectConnector(_connector: string): void {};
}