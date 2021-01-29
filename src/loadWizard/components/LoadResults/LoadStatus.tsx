import * as React from 'react';
import LoadingText from '../../../components/widgets/LoadingText';

let Texts = {
    createButtonLabel: 'Create Table',
    creatingTable: 'Creating table',
    created: 'Table Created. Please go into a notebook project and check',
    createdCheckError: 'Table Created.',
    createdWithComplement: 'Table created with errors.',
    createError: 'Error',
    ComplementTableHint: 'Some rows in the source files may not be loaded, click to check the errors.',
    ComplementTableHint2: 'Some rows in the source files cannot be loaded, click to see the errors.',
    Canceled: 'Canceled'
};

export default function LoadStatus({currentApp, updateApp}) {
    let status;
    let progress;
    if (currentApp) {
        progress = currentApp.progress;
        status = currentApp.status;
    } else {
        progress = 0;
    }

    return (
        <div>
            <div>Table name: {currentApp._tableInfo.name}</div>
            {(status === "inProgress") ?
                <InProgress progress={progress} currentApp={currentApp} />
                : null
            }
            {status === "done" ? Texts.created : null}
            {status === "canceled" ? Texts.Canceled : null}
            {status === "error" ? Texts.createError: null}
        </div>
    )
}

function InProgress({progress, currentApp}) {
    const state = currentApp._tableInfo.state;
    let loadingText;
    let cancelSection = null;
    if (state === window["PbTblState"].Loading || state === window["PbTblState"].Canceling) {
        let cancelClass = "cancel";
        if ( state === window["PbTblState"].Canceling) {
            cancelClass += " xc-disabled";
        }
        // loadingText = currentApp._tableInfo.loadMsg;
        loadingText = <LoadingBar message={progress} />
        cancelSection = <div className={cancelClass} onClick={() => {currentApp.cancel()}}>Cancel</div>;
    } else {
        loadingText = <LoadingBar message={progress} />
    }

    return (
        <div className="loadingContainer">
            {loadingText}
            {cancelSection}
        </div>
    );
}



function LoadingBar({ message, onClick = () => {} }) {
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
    </div>);
}
