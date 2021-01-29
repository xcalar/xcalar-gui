import * as React from 'react';
import LoadApp from './LoadApp';
import LoadStatus from './LoadStatus';
import LoadHistoryView from './LoadHistoryView';
import SchemaView from './SchemaView';

window["reactHack"] = window["reactHack"] || {};
const Text = {
    "NoTables": "There are no table loads currently in progress.",
    "CreatingTable": "Creating table..."
};

// ctx is a this reference for the LoadResultsPage component
function setLoadFn(ctx) {
    const loadAppListener = (tableInfo, app) => {
        ctx.setLoadMsg(tableInfo.loadMsg);
        ctx.setCurrentApp(app);
    };

    window["reactHack"]["newLoad"] = async (tableName, args, newLoadSchema, tableInfo) => {
        ctx.setLoadMsg(Text.CreatingTable);
        const cleanupCancelledJobs = [];
        const SchemaLoadService = window["LoadServices"].SchemaLoadService;
        let loadAppObj;
        let log;
        try {
            tableInfo.state = window["PbTblState"].Loading;
            const { path, filePattern, isRecursive, connector } = window["TblSource"].Instance._adaptNewSourceArg(args);
            const inputSerialization = window["TblSource"].Instance._adaptInputSerialization(args);
            const schema = newLoadSchema;

            ctx.setState({activeView: "history"});

            const app = await SchemaLoadService.createDiscoverApp({
                targetName: connector
            });

            const appId = app.appId;
            let loadLog = ctx.state.loadLog;

            log = loadLog.add(appId, {
                id: appId,
                name: tableName,
                time: Date.now(),
                args: args,
                status: "inProgress"
            }, true);
            ctx.setState({
                loadLog: loadLog
            });
            loadAppObj = new LoadApp(app, tableInfo, loadAppListener);
            tableInfo.loadApp = loadAppObj;
            let modifiedLoadApps = {...ctx.state.loadApps};
            modifiedLoadApps[appId] = loadAppObj;

            ctx.setLoadApps(modifiedLoadApps);
            ctx.setCurrentApp(loadAppObj);

            // // Get create table dataflow
            const { cancel: getQueryCancel, done: getQueryDone, cleanup: getQueryCleanup } = app.getCreateTableQueryWithCancel({
                path,
                filePattern,
                inputSerialization,
                isRecursive,
                schema,
                progressCB: (progress) => {
                    loadAppObj.updateProgress(progress, [0, 30]);
                }
            });
            loadAppObj.setCancelEvent(getQueryCancel);
            cleanupCancelledJobs.push(getQueryCleanup);
            const query = await getQueryDone();
            ctx.setCurrentApp(loadAppObj);
            // Create data session tables
            const { cancel: createCancel, done: createDone } = app.createResultTablesWithCancel(query, (progress) => {
                loadAppObj.updateProgress(progress, [30, 95]);
            });
            loadAppObj.setCancelEvent(createCancel);
            const tables = await createDone();
            ctx.setCurrentApp(loadAppObj);

            // Publish tables
            try {
                const dataTableName = await window["TblSource"].Instance._publishDataTable(tables.load, tableName, query.dataQueryComplete);
                loadAppObj.setDataTableName(dataTableName);
                ctx.setCurrentApp(loadAppObj);
                ctx.createNewLog(loadLog);
                tableInfo.state = null;
            } catch (e) {
                loadAppObj.status = "error";
                ctx.setCurrentApp(loadAppObj);
                await Promise.all([
                    tables.load.destroy(),
                    // tables.data.destroy(),
                    // tables.comp.destroy()
                ]);
                throw e;
            }

            return loadAppObj;
        } catch (e) {
            console.error(e);
            for (const job of cleanupCancelledJobs) {
                await job();
            }
            tableInfo.state = window["PbTblState"].Error;
            if (e !== SchemaLoadService.JobCancelExeption) {
                let error = e.message || e.error || e;
                error = xcHelper.parseError(error);
                tableInfo.errorMsg = error;
                throw new Error(error);
            } else {
                tableInfo.errorMsg = xcHelper.parseError(e);
                throw e;
            }
            return null;
        } finally {
            let status = "done";
            if (loadAppObj) {
                status = loadAppObj.status
            }
            log.duration = Date.now() - log.time;
            log.status = status;
            ctx.state.loadLog.flush();
            ctx.createNewLog(ctx.state.loadLog);
            ctx.setLoadMsg(null);
            if (loadAppObj) {
                ctx.setCurrentApp(loadAppObj);
            }
        }
    };
}

export default class LoadResultsPage extends React.Component<any, any>  {
    constructor(props) {
        super(props);
        this.state = {
            isVisible: false,
            loadApps: {},
            currentApp: null,
            loadMsg: "",
            loadLog: null,
            activeView: "history",
            activeSchema: null
        };

        window["reactHack"]["setLoadResultsPageVisible"] = (isVisible) => {
            this.setVisible(isVisible);
        };

        if (!window["reactHack"]["newLoad"]) {
            setLoadFn(this);
        }
    }

    setCurrentApp(app) {
        this.setState({currentApp: app})
    }

    setVisible(isVisible) {
        this.setState({isVisible: isVisible})
    }

    setLoadMsg(loadMsg) {
        this.setState({loadMsg: loadMsg});
    }

    setLoadApps(loadApps) {
        this.setState({loadApps: loadApps});
    }

    createNewLog(loadLog) {
        this.setState({
            loadLog: loadLog
        });
    }

    toggleView(info) {
        if (this.state.activeView === "history") {
            this.setState({activeView: "schema", activeSchema: info});
        } else {
            this.setState({activeView: "history"});
        }
    }

    render() {
        let emptyMessage;
        if (this.state.currentApp == null && this.state.loadMsg) {
            emptyMessage = this.state.loadMsg;
        } else {
            emptyMessage = Text.NoTables;
        }
        let viewClass = "viewContainer " + this.state.activeView
        return (
            <div className={viewClass}>
                <div className="historyView">
                    <div className="currentLoadArea">
                    {(this.state.currentApp != null) ?
                        <LoadStatus currentApp={this.state.currentApp} updateApp={this.state.setCurrentApp} />
                        :
                        <div className="noProgress">{emptyMessage}</div>
                    }
                    </div>
                    <LoadHistoryView loadLog={this.state.loadLog} toggleView={this.toggleView.bind(this)} createNewLog={this.createNewLog.bind(this)} />
                </div>
                {this.state.activeSchema ? <SchemaView schema={this.state.activeSchema} toggleView={this.toggleView.bind(this)} /> : null }
            </div>
        );
    }

}
