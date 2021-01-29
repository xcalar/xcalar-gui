class DSDBConfig extends DSConnectorPanel {
    private static _instance: DSDBConfig;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _connector: string;

    private constructor() {
        super();
        this._connector = DSTargetManager.DBConnector;
    }

    /**
     * DSDBConfig.Instance.show
     */
    public show(): void {
        DataSourceManager.switchView(DataSourceManager.View.DB);
        super.show();
    }

    protected _getCard(): JQuery {
        return $("#dsForm-dbConfig");
    }

    protected _renderTargetList():  HTML {
        let html: HTML = DSTargetManager.getConnectors(this._connector)
        .map((targetName) => `<li>${targetName}</li>`)
        .join("");
        html = '<li class="createNew">+ Create New Database Connector</li>' +
                html;
        return html;
    }


    protected _onCreateNew($input: JQuery): void {
        let title: string = "Create Database Connector";
        ConnectorConfigModal.Instance.show(title, this._connector, (targetName) => {
            $input.val(targetName);
        });
    }

    protected _onSelectConnector(connector: string): void {
        this._getPathInput().val(DSForm.getDBConnectorPath(connector));
    }
}