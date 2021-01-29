import * as React from 'react';
import MUIDataTable from "mui-datatables";
import { ThemeProvider, createMuiTheme } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';


const theme = createMuiTheme({
    palette: {
      type: "dark",
    }
  });

export default function SchemaView({schema, toggleView}) {
    const schemaHeaders = [
        {
            name: "name",
            label: "Column Name",
            options: {
            filter: true,
            sort: true,
            }
        },
        {
            name: "type",
            label: "Type",
            options: {
            filter: true,
            sort: true,
            }
        }
    ];
    const sourcesHeaders = [
        {
            name: "targetName",
            label: "Connector",
            options: {
            filter: true,
            sort: true,
            }
        },
        {
            name: "path",
            label: "Path",
            options: {
            filter: true,
            sort: true,
            }
        }
    ];

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
    };

    const sourcesOptions = {
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
        responsive: "scroll",
        customFooter: () => {
            return <div></div>
        }
    }

    return (
        <div className="schemaView">
            <div className="row">
                <button onClick={toggleView} className="btn btn-secondary backBtn">Back</button>
            </div>
            <div className="sourcesTable" >
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <MUIDataTable
                        title={"Sources"}
                        data={schema.sources}
                        columns={sourcesHeaders}
                        options={tableOptions}
                    />
                </ThemeProvider>
            </div>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <MUIDataTable
                    title={"Schema"}
                    data={schema.schema}
                    columns={schemaHeaders}
                    options={tableOptions}
                />
            </ThemeProvider>
            {/* <pre>{JSON.stringify(schema, null, 2)}</pre> */}
        </div>
    );
}