import React from "react";
import * as Path from 'path'
import { defaultConnector } from "../../services/SchemaLoadService"
import InputDropdown from "../../../components/widgets/InputDropdown"
import Pagination from '../../../components/widgets/Pagination'
import LoadingText from '../../../components/widgets/LoadingText'
import QMark from '../../../components/widgets/QMark'
import NavButtons from '../NavButtons'
import { Folder, FileCopy, InsertDriveFileOutlined } from '@material-ui/icons'
import ConnectorsModal from '../ConnectorsModal'
const Texts = {
    bucketName: 'S3 Bucket',
    noBuckets: 'No bucket to select',
    path: 'Source Path',
    fileType: 'File Type',
    typeCsv: 'CSV',
    typeJson: 'JSON',
    typeJsonl: 'JSONL',
    typeParquet: 'Parquet',
    navButtonRight: 'Browse',
    updateForensics: 'Updating ...',
    getForensics: 'Get Directory Info',
    connector: 'Connector'
};

/**
 * Pure Component: get forensics button
 * @param {*} props
 */
function GetForensicsButton(props) {
    const { isLoading = false, disabled = false, onClick = () => {} } = props || {};
    const buttonText = isLoading ? Texts.updateForensics : Texts.getForensics;
    const disableButton = isLoading || disabled;
    const classes = ['getForensics', 'btn', 'btn-secondary'].concat(disableButton ? ['btn-disabled'] : []);

    return (
        <button type="button" className={classes.join(' ')} onClick={() => { onClick() }}>{buttonText}</button>
    );
}

function isBucketNameInvalid(bucketName) {
    if (bucketName == null) {
        return true;
    }
    bucketName = Path.join('/', bucketName.trim());
    if (bucketName === '/') {
        return true;
    }
    return false;
}

function getConnectorList(connectors) {
    let list = connectors.map(type => {
        return {text: type, value: type};
    });
    return list;
}

function SourcePath({
    bucket,
    onBucketChange,
    path,
    onPathChange,
    // fileType = FileType.CSV,
    // onFileTypeChange = (newType) => {},
    onNextScreen,
    connector,
    onConnectorChange = (connector) => {},
    isForensicsLoading,
    fetchForensics,
    selectedFileDir,
    filesSelected
}) {

    // the getAvailableS3Bucket is async call, it may not be ready the first it's rendernder,
    // so need to put it in the onOpen callback
    const [s3Buckets, setS3Buckets] = React.useState([]);
    const [connectors, setConnectors] = React.useState([]);
    const [showConnectorModal, setShowConnectorModal] = React.useState(false);

    const isBucketInvalid = isBucketNameInvalid(bucket);
    DSTargetManager.updateSelectedConnector = (newConnector) => {
        onConnectorChange(newConnector);
    }

    const s3Suffix = ' (using S3 Select parser)';
    // isS3() always resturns false before targets get loaded from backend,
    // so force the default connector to be s3 as a workaround
    const connectorText = connector == defaultConnector || DSTargetManager.isS3(connector)
        ? connector + s3Suffix
        : connector;

    return (
        <React.Fragment>
        <div className="sourceForm">
            <form onSubmit={(e) => { e.preventDefault(); }}>
                <a className="needHelp xc-action" style={{ position: "relative", top: "4px" }} href="https://xcalar.com/documentation/Content/Content_QSG/qs_intro_build_datamart.htm" target="_blank">Need help?</a>
                <div className="row">
                    <div className="connectorSelection">
                        <label className="label">{Texts.connector}
                        </label>
                        <div className="inputRow">
                            <InputDropdown
                                val={connectorText}
                                onSelect={onConnectorChange}
                                onOpen={() => {
                                    const connectors = [];
                                    const targets = DSTargetManager.getAllTargets();
                                    for (let i in targets) {
                                        connectors.push(i);
                                    }
                                    connectors.sort();
                                    setConnectors(connectors);
                                }}
                                list={getConnectorList(connectors)}
                                readOnly
                            />
                            <button id="manageConnectorsBtn" type="button" className="btn btn-secondary btn-new" onClick={() => {
                                setShowConnectorModal(true);
                            }}>Manage Connectors</button>
                        </div>
                    </div>
                </div>
                <div className="row">
                    <div className="bucketSelection">
                        <label className="label">{Texts.bucketName}</label>
                        <div className="inputRow">
                            <InputDropdown
                                val={DSTargetManager.getS3NameFromValue(bucket)}
                                onInputChange={(newBucket) => {
                                    onBucketChange(newBucket.trim());
                                }}
                                onSelect={(newBucket) => {
                                    onBucketChange(newBucket.trim());
                                }}
                                onOpen={() => {
                                    if (XVM.isOnAWS() && DSTargetManager.isAWSConnector(connector)) {
                                        setS3Buckets([...DSTargetManager.getAvailableS3Buckets()]);
                                    } else {
                                        setS3Buckets([]);
                                    }
                                }}
                                list={s3Buckets.length
                                    ? s3Buckets.map((bucket) => {
                                        return {text: DSTargetManager.getS3NameFromValue(bucket), value: bucket}
                                    })
                                    : []
                                }
                                hint={Texts.noBuckets}
                            />
                        </div>
                    </div>
                    {/* <GetForensicsButton
                        isLoading={ isForensicsLoading }
                        disabled={isBucketInvalid}
                        onClick={ () => { fetchForensics(bucket, path) }}
                    /> */}
                </div>
                <div className="row">
                    <div className="pathSelection">
                        <label className="label">{Texts.path}</label>
                        <div className="inputRow">
                            <input
                                className="xc-input input"
                                type="text"
                                value={path}
                                onChange={(e) => { onPathChange(e.target.value.trim()); }}
                                spellCheck="false"
                                placeholder="optional"
                            />
                            <NavButtons right={{
                                label: Texts.navButtonRight,
                                classNames: ["btn-secondary", "browse"].concat(isBucketInvalid ? ['btn-disabled'] : []),
                                onClick: () => { onNextScreen() }
                                }
                            }/>
                        </div>
                    </div>
                </div>
                { selectedFileDir.length > 0 ?
                    <React.Fragment>
                    <div className="row">
                        <div className="selectedFileName">
                            <label className="label">Selected {selectedFileDir[0].directory ? "Folder" : "File"}</label>
                            <div className="inputRow">
                                <div className="fileName">
                                    {selectedFileDir[0].directory ?
                                        <Folder style={{fontSize: 20, position: "relative", top: 6, left: 2}}/> :
                                        <InsertDriveFileOutlined style={{fontSize: 20, position: "relative", top: 6, left: 2}}/>
                                    }
                                    {selectedFileDir[0].name}
                                </div>
                                {selectedFileDir[0].directory ? null:
                                    <NavButtons right={{
                                        label: "View Raw Data",
                                        classNames: ["btn-secondary", "viewRawData"],
                                        onClick: () => {
                                            RawFileModal.Instance.show({
                                                targetName: connector,
                                                path: selectedFileDir[0].fullPath,
                                                fileName: selectedFileDir[0].name
                                            });
                                        }
                                        }
                                    }/>
                                }
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <FileSelectArea {...filesSelected} connector={connector} selectedFileDir={selectedFileDir} />
                    </div>
                    </React.Fragment>
                : null}
            </form>
        </div>
        {showConnectorModal &&
            <ConnectorsModal
                onClose={()=>{
                    setShowConnectorModal(false);
                }}
            />}
        </React.Fragment>
    );
}

function FileSelectArea(props) {
    const {filesCursor, isLoading, selectedFileDir, connector } = props;

    if (!selectedFileDir[0].directory || filesCursor == null) {
        return null;
    }

    if (isLoading) {
        return (<LoadingText className="clearfix" />);
    }

    const pageSize = 5;
    const [offset, setOffset] = React.useState(0);
    const [maxOffset, setMaxOffset] = React.useState(Number.MAX_VALUE);
    // const [currPage, setCurrPage] = React.useState("1");
    const [files, setFiles] = React.useState([]);

    React.useEffect(() => {
        const fetchData = async () => {
            if (filesCursor != null) {
                const files = await filesCursor.fetchData({
                    offset: offset,
                    count: pageSize
                });
                setFiles(files);
                if (files.length < pageSize) {
                    setMaxOffset(filesCursor.getSize() - 1);
                }
            }
        };
        fetchData();
    }, [filesCursor, offset, pageSize]);

    const pagePrev = offset > 0
        ? () => {
            setOffset(offset - pageSize);
            // setCurrPage("" + (Math.floor((offset - pageSize) / pageSize) + 1));
        }
        : null;
    const pageNext = (offset + pageSize) <= maxOffset
        ? () => {
            setOffset(offset + pageSize);
            // setCurrPage("" + (Math.floor((offset + pageSize) / pageSize) + 1));
        }
        : null;
    // const numPages = Math.ceil(files.length / pageSize);
    const page = Math.floor(offset / pageSize) + 1;

    let filesArray = [];
    for (const file of files) {
        filesArray.push(
            <div className="folderFile" key={file.fileId}>
                <div className="fileType">{file.directory ?
                    <Folder style={{fontSize: 20, position: "absolute", top: 5, left: 6}}/> :
                    <InsertDriveFileOutlined style={{fontSize: 20, position: "absolute", top: 5, left: 6}}/>}
                </div>
                <span className="fileName">{file.name}</span>
                <button type="button" className="btn btn-secondary btn-new" onClick={() => {
                    RawFileModal.Instance.show({
                        targetName: connector,
                        path: file.fullPath,
                        fileName: file.name
                    });
                }}>View Raw Data</button>
            </div>
        )
    }

    // const handleInputChange = (e) => {
    //     let num = parseInt(e.target.value);
    //     if (!isNaN(num)) {
    //         num = Math.max(1, Math.floor(num));
    //         num = Math.min(num, Math.max(1, numPages));
    //         setCurrPage("" + num);
    //         setOffset((num - 1) * pageSize);
    //     } else {
    //         setCurrPage("" + (Math.floor(offset / pageSize) + 1));
    //     }
    // }

    const numFiles = filesCursor.getSize();
    const hasMoreFiles = filesCursor.hasMore();

    return <div className="fileListArea">
                <div className="fileListHeader">
                    The files below are located in the above folder. View the raw data of any file.
                    <div className="numFiles">{numFiles.toLocaleString()}{hasMoreFiles ? "+" : ""} {numFiles === 1 ? "item" : "items"}</div>
                </div>
                <div className="scrollSection fileListSection">
                    <div className="innerScrollSection">
                    {filesArray}
                    </div>
                </div>
                <div className="paginationRow">
                    <Pagination onNext={pageNext} onPrev={pagePrev} page={page} />
                    {/* <div className="skipToPage">Page <input className="xc-input" value={currPage}
                    onChange={(e) => {
                        setCurrPage(e.target.value);
                    }}
                    onKeyDown={(e) => {
                        if (e.which === 13) {
                            handleInputChange(e);
                        }
                    }}
                    onBlur={(e) => {
                        handleInputChange(e);
                    }} /> / {numPages.toLocaleString()}</div> */}
                </div>
            </div>
}

export { SourcePath };