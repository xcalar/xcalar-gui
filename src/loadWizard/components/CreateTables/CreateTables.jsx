import React from "react";
import LoadTable from './LoadTable'

const Texts = {
    createTableAll: 'Create All',
    totalCost: 'Total Cost: $',
    totalTime: 'Total Time: ',
    timeSeconds: 'seconds',
    navButtonLeft: 'Back',
    navButtonRight: 'Navigate to Notebook',
    navToNotebookHint: "Please create a table first",
};

class CreateTables extends React.Component {
    render() {
        const {
            isLoading,
            page, rowsPerPage,
            schemas, // Array<{schema: {hash, columns}, files: { count, size, maxPath, hasMore }}>
            schemasInProgress,  // Set<schemaName>
            schemasFailed,  // Map<schemaName, errorMsg>
            tablesInInput, // Map<schemaName, tableName>
            tables, // Map<schemaName, tableName>
            onClickCreateTable = (schemaName, tableName) => {},
            onClickCancel = () => {},
            onShowICV,
            onLoadSchemaDetail = (schemaHash) => {},
            onLoadFailureDetail = () => {},
            onFetchData,
            onTableNameChange,
            children
        } = this.props;

        return (
            <div className="tableLoad">
                {children}{isLoading ? ' ... loading' : null}
                <div className="browsersContainer">
                    <LoadTable
                        isLoading={isLoading}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        onFetchData={onFetchData}
                        schemas={schemas}
                        schemasInProgress={schemasInProgress}
                        schemasFailed={schemasFailed}
                        tablesInInput={tablesInInput}
                        tables={tables}
                        onClickSchema={(schemaName) => { onLoadSchemaDetail(schemaName); }}
                        onClickFailedSchema={() => { onLoadFailureDetail(); }}
                        onClickCreateTable={onClickCreateTable}
                        onClickCancel={onClickCancel}
                        onTableNameChange={onTableNameChange}
                        onShowICV={onShowICV}
                    />
                </div>
            </div>
        );
    }

    _navToNotebook() {
        HomeScreen.switch(UrlToTab.notebook);
    }
}

export default CreateTables;
