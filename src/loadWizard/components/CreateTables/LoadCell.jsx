import React from 'react';
import LoadingText from '../../../components/widgets/LoadingText'

const Texts = {
    createButtonLabel: 'Create Table',
    creatingTable: 'Creating table ...',
    created: 'Table Created.',
    createdWithComplement: 'Table created with errors.',
    createError: 'Error',
    ComplementTableHint: 'Some rows in the source files may not be loaded, click to check the errors.',
    ComplementTableHint2: 'Some rows in the source files cannot be loaded, click to see the errors.'
};

function Create({ onClick }) {
    return <button className="btn btn-secondary btn-new" onClick={onClick}>{Texts.createButtonLabel}</button>
}

function Loading({ message, onClick = () => {} }) {
    const pct = parseInt(message);
    const loadingMessage = !Number.isNaN(pct)
        ? <div className="loadingProgress">
            <div className="loadingProgress-text">Creating... {pct + "%"}</div>
            <div className="loadingProgress-wrap">
                <div className="loadingProgress-bg" />
                <div className="loadingProgress-bar" style={{width: pct + "%"}} ></div>
            </div>
        </div>
        : <span>{`Creating ... ${message || ''}`}</span>;
    return (<div className="loadingWrap">
        {loadingMessage}
        <div className="loading-cancel" onClick={onClick}>
            <i className="icon xi-close" />
        </div>
    </div>);
}

function Loading2({ message, onClick = () => {}}) {
    let loadingMessage = Texts.creatingTable;
    if (message) {
        loadingMessage += " (" + message + ")";
    }
    let pct = parseInt(message);
    if (!isNaN(pct)) {
        loadingMessage = <div className="loadingBarWrap">
                <div className="loadingBar" style={{width: pct + "%"}} ></div>
                <div className="loadingText">Creating... {pct + "%"}</div>
            </div>;
    }
    return (<div className="loadingCell">
        <span>{loadingMessage}</span>
        <button className="btn btn-secondary btn-new btn-cancel loadingCell-btn" onClick={onClick}>Cancel</button>
    </div>);
}

function Success({ isLoading, dataTable, icvTable, onShowICV = () => {} }) {
    if (icvTable == null) {
        // Hasn't been checked
        if (isLoading) {
            return <LoadingText>{Texts.created} Checking for Errors</LoadingText>
        } else {
            return (
                <span>
                    {Texts.created}
                    <span className="xc-action loadingCell-link" onClick={() => onShowICV()}>Check for Errors</span>
                    <i className="icon qMark xi-unknown" data-toggle="tooltip" data-container="body" data-title={Texts.ComplementTableHint}></i>
                </span>
            )
        }
    } else if (icvTable.length == 0) {
        // no error
        return (<span><i className="icon xi-tick"></i>{Texts.created}</span>);
    }

    // checked and has error
    return (
        <span>
            {Texts.created}
            <span className="xc-action loadingCell-link" onClick={() => onShowICV()}>Show Errors</span>
            <i className="icon qMark xi-unknown" data-toggle="tooltip" data-container="body" data-title={Texts.ComplementTableHint2}></i>
        </span>
    );
}

function Error({
    error
}) {
    const [toExpand, setExpandState] = React.useState(false);
    if (error.length <= 20) {
        // when error is too short
        return (
            <span>error</span>
        )
    } else if (toExpand) {
        return (
            <span className="error">
                <pre style={{whiteSpace: 'normal'}}>{error}</pre>
                <span className="action xc-action" onClick={() => { setExpandState(false); }}>Collapse</span>
            </span>
        )
    } else {
        return (
            <span className="error">
                <span className="label">{Texts.createError}</span>
                <span data-toggle="tooltip" data-container="body" data-title={error}>
                    {"(" + error.substring(0, 7) + "...)"}
                </span>
                <span className="action xc-action" onClick={() => { setExpandState(true); }}>Expand</span>
            </span>
        )
    }
}

function Table({ name }) {
    return (
        <span>{name}</span>
    );
}

export { Create, Loading, Success, Error, Table };
// function LoadCell({schemasObject, setSchemasObject, schemaName, fileIdToStatus, setFileIdToStatus}) {

//     if (loadCellValue) {
//         return (<span>{loadCellValue}</span>);
//     } else {
//         function onClick() {
//             const tableName = 'A' + Math.random().toString(36).substring(2, 15).toUpperCase()
//             setLoadCellValue("Creating ...");
//             createTableFromSchema(tableName, schemasObject[schemaName].fileIds, schemasObject[schemaName].schema)
//             .then((resultTableName) => {
//                 schemasObject[schemaName].status = "Done!"
//                 schemasObject[schemaName].table = resultTableName;
//                 schemasObject[schemaName].fileIds.forEach(fileId => {
//                     fileIdToStatus[fileId] = resultTableName;
//                 });
//                 setFileIdToStatus({...fileIdToStatus});
//                 setSchemasObject(schemasObject);
//                 setLoadCellValue(resultTableName);
//             })
//             .catch((e) => {
//                 setLoadCellValue('Failed');
//                 console.error(e);
//             })

//         }
//         return <button onClick={onClick}>Create</button>
//     }
// }