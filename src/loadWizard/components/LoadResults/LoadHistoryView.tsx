import * as React from 'react';
import LoadLog from './LoadLog';
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';

const theme = createMuiTheme({
  palette: {
    type: "dark"
  }
});

export default class LoadHistoryView extends React.Component<any,any> {

    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            loadLog: null,
            logs: [],
            status: null,
            allLoaded: false
        };

        window["reactHack"]["setupLoadHistoryView"] = () => {
            let log = new LoadLog();
            window["loadLog"] = log;
            log.event((event) => {
                this.setState({logs: log.getAllArray()});
            });
            this.props.createNewLog(log);
        }

        window["reactHack"]["getInitialLogs"] = async () => {
            if (this.state.loaded || !this.props.loadLog) return;
            this.setState({loaded: true});
            const numMoreLogs = LoadLog.DEFAULT_PAGE_SIZE - this.props.loadLog.size();
            const res = await this.props.loadLog.loadMore(numMoreLogs);
            if (!res.length || res.length < LoadLog.DEFAULT_PAGE_SIZE) {
                this.setState({allLoaded: true});
            }
        }
    }

    async loadMoreLogs() {
        this.setState({status: "loadingMore"})
        let res = await this.props.loadLog.loadMore(LoadLog.DEFAULT_PAGE_SIZE);
        if (!res.length || res.length < LoadLog.DEFAULT_PAGE_SIZE) {
            this.setState({allLoaded: true});
        }
        this.setState({logs: this.props.loadLog.getAllArray(), status: null});
    };

    viewDetails(rowInfo) {
        this.props.toggleView(rowInfo.rowData[4]);
    }

    render() {

        const data = this.state.logs.map((log) => {
            return {
                name: log.name,
                duration: window["xcTimeHelper"].getElapsedTimeStr(log.duration, false, true),
                time: window["moment"](log.time).calendar(null, {
                    sameElse: 'll LT'
                }),
                status: window["xcStringHelper"].camelCaseToRegular(log.status || ""),
                details: log.args
            }
        });


        const headers = [
            {
                name: "name",
                label: "Table Name",
                options: {
                filter: true,
                sort: true,
                }
            },
            {
                name: "time",
                label: "Date Created",
                options: {
                sort: true
                }
            },
            {
                name: "duration",
                label: "Duration",
                options: {
                sort: true,
            }
            },
            {
                name: "status",
                label: "Status",
                options: {
                    sort: true,
                }
            },
            {
                name: "details",
                label: "Details",
                options: {
                    sort: false,
                    customBodyRender: (columnMeta, rowInfo) => {
                        return <div className="viewDetails xc-action" onClick={this.viewDetails.bind(this,rowInfo)}>View</div>
                    }
                }
            }
        ]

        let moreRowsClass = "moreRows xc-action";
        if (this.state.status === "loadingMore") {
            moreRowsClass += " xc-disabled";
        }
        return <div className="loadHistoryView">
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <MUIDataTable
                    title={"Load History"}
                    data={data}
                    columns={headers}
                    options={tableOptions}
                />
                {!this.state.allLoaded ? <div className={moreRowsClass} onClick={this.loadMoreLogs.bind(this)}>More rows...</div> : null }
            </ThemeProvider>

        </div>
    }
}

// const columns = ["Table Name", "Duration"];
const tableOptions = {
    elevation: 0,
    rowsPerPage: 100,
    serverSide: true,
    download: false,
    filter: false,
    print: false,
    search: false,
    sortFilterList: false,
    viewColumns: false,
    selectableRows: false,
    responsive: "scroll"
}
