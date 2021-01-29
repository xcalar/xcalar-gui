import React from "react";
import { SourcePath } from './SourcePath'

const Texts = {
    Reset: "Reset Selected Files"
};


function ResetButton(props) {
    const {canReset, onReset} = props;
    const classNames = ["resetAll", "xc-action"];
    if (canReset) {
        return (
            <div className={classNames.join(" ")} onClick={(e) => onReset(e.target)}>
                {Texts.Reset}
            </div>
        )
    } else {
        classNames.push("xc-disabled");
        return (
            <div className={classNames.join(" ")}>
                {Texts.Reset}
            </div>
        )
    }
}

class SourceData extends React.Component {
    render() {
        const {
            connector,
            bucket,
            path,
            fileType,
            onClickBrowse,
            onBucketChange,
            onPathChange,
            fetchForensics,
            isForensicsLoading,
            onFileTypeChange = (newType) => {},
            onConnectorChange = (connector) => {},
            selectedFileDir,
            fileSelectProps
        } = this.props;

        return (
            <div className="topSection">
                <SourcePath
                    bucket={bucket}
                    path={path}
                    onBucketChange={(newBucket) => { onBucketChange(newBucket); }}
                    onPathChange={(newPath) => { onPathChange(newPath); }}
                    fileType={fileType}
                    onFileTypeChange={onFileTypeChange}
                    onNextScreen={onClickBrowse}
                    fetchForensics={fetchForensics}
                    isForensicsLoading={isForensicsLoading}
                    connector={connector}
                    onConnectorChange={onConnectorChange}
                    selectedFileDir={selectedFileDir}
                    filesSelected={fileSelectProps}
                />
                {/* <div className="modelInfo">
                    Model rules:
                    <br/>
                    <b>{JSON.stringify(modelInfo)}</b>
                </div> */}
                <div className="formActions">
                    <ResetButton canReset={this.props.canReset} onReset={this.props.onReset} />
                </div>
            </div>
        );
    }
}

export default SourceData;