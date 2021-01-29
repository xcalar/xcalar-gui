import * as Path from 'path';
import * as React from "react";
import NavButtons from '../NavButtons'
import SelectedFilesArea from "./SelectedFilesArea"
import SingleSelectedFileArea from "./SingleSelectedFileArea"
import * as Modal from '../Modal'
import * as SchemaService from '../../services/SchemaService'
import * as S3Service from '../../services/S3Service'
import getForensics from '../../services/Forensics';
import FileBrowserTable from './FileBrowserTable'
import LoadingText from '../../../components/widgets/LoadingText';
import Pagination from '../../../components/widgets/Pagination'
import {
    PieChart, Pie, Cell, Label, ResponsiveContainer
} from 'recharts';

const typeList = {
    "JSON": "#00cf18",
    "CSV": "#4287f5",
    "PARQUET": "#002483",
    "DIRECTORY": "#888",
    "UNSUPPORTED": "#BBB",
};

const Texts = {
    title: "Browse Data Source",
    loading: "Loading ...",
    navButtonLeft: 'Cancel',
    navButtonRight: 'Done',
    updateForensics: 'Updating ...',
    getForensics: 'Get Directory Info'
};

function getSelectedIdsForCurrentView(fileMapViewing, selectedFiles) {
    const validIds = new Set(fileMapViewing.keys());
    if (validIds.size === 0) {
        return new Set();
    }

    const selectedIds = new Set();
    for (const { fileId } of selectedFiles) {
        if (validIds.has(fileId)) {
            selectedIds.add(fileId);
            if (validIds.size <= selectedIds.size) {
                break;
            }
        }
    }
    return selectedIds;
}

const pageSize = 100;

type BrowseDataSourceProps = {
    fileType: SchemaService.FileType,
    bucket: string,
    connector: string,
    homePath: string,
    selectedFileDir:  any[],
    onCancel: Function,
    onPathChange: Function,
    setSelectedFileDir: Function
};
type BrowseDataSourceState = {
    isLoading: boolean,
    path: string,
    fileMapViewing: Map<string, any>,
    selectedFileDir: any[],
    fileNamePattern: string,
    loadingFiles: Set<string>,
    showForensics: boolean,
    forensicsMessage: any[],
    isForensicsLoading: boolean,
    forensicsPath: string,
    offset: number,
    maxOffset: number
}

class BrowseDataSource extends React.Component<BrowseDataSourceProps, BrowseDataSourceState> {
    private metadataMap;
    private navCount;
    private filesCursor: S3Service.ListFilesCursor;
    constructor(props) {
        super(props);

        const { bucket, homePath, selectedFileDir, fileNamePattern } = props;
        const fullPath = Path.join(bucket, homePath);

        this.metadataMap = new Map();
        this.navCount = 0;
        this.state = {
            isLoading: true,
            path: fullPath,
            fileMapViewing: new Map(),
            selectedFileDir: selectedFileDir.map((v) => ({...v})),
            fileNamePattern: fileNamePattern,
            loadingFiles: new Set(),
            showForensics: false,
            forensicsMessage: [],
            isForensicsLoading: false,
            forensicsPath: "",
            offset: 0,
            maxOffset: Number.MAX_VALUE
        }
    }

    async componentDidMount() {
        try {
            (document.activeElement as HTMLElement).blur();
        } catch(e){}

        // browsePath
        const success = await this._browsePath(this.state.path, this.props.fileType);
        if (!success) {
            this.props.onCancel();
        }
    }

    _getListFileStats() {
        try {
            return {
                count: this.filesCursor.getSize(),
                hasMore: this.filesCursor.hasMore()
            };
        } catch(_) {
            return {
                count: 0, hasMore: false
            };
        }
    }

    async _fetchFileList(fullPath, offset, refresh?: boolean) {
        try {
            this.setState({ isLoading: true });
            let cursorOffset = offset;
            if (refresh || fullPath != this.state.path || this.filesCursor == null) {
                this.filesCursor = S3Service.createListFilesCursor({
                    targetName: this.props.connector,
                    path: Path.join('/', fullPath, '/'),
                    fileNamePattern: '*',
                    isRecursive: false
                });
                cursorOffset = 0;
                this.setState({ maxOffset: Number.MAX_VALUE });
                await this.filesCursor.preFetch();
            }
            const files = await this.filesCursor.fetchData({ offset: cursorOffset, count: pageSize });
            const fileMap = new Map();
            for (const file of files) {
                fileMap.set(file.fullPath, file);
            }
            if (files.length < pageSize) {
                this.setState({ maxOffset: this.filesCursor.getSize() - 1 });
            }

            return { fileMap: fileMap, offset: cursorOffset };
        } finally {
            this.setState({ isLoading: false });
        }
    }

    async _browsePath(newFullPath, fileType, refresh?: boolean) {
        try {
            this.setState({
                isLoading: true,
                path: newFullPath
            });
            let homePath = newFullPath.slice(this.props.bucket.length);
            this.props.onPathChange(homePath);
            // const fileTypeFilter = SchemaService.FileTypeFilter.get(fileType);
            // const fileMap = await S3Service.listFiles(Path.join(newFullPath, '/'), ({ directory, type}) => {
            //     return directory || fileTypeFilter({ type: type });
            // });
            this.navCount++;
            let navCount = this.navCount;
            const { fileMap, offset } = await this._fetchFileList(newFullPath, this.state.offset, refresh);

            if (this.navCount !== navCount) {
                return false;
            }
            if (this.props.homePath && !newFullPath.endsWith(this.props.homePath)) {
                // navigated away while files were loading
                return false;
            }
            for (const [key, value] of fileMap) {
                if (this.state.loadingFiles.has(key)) {
                    value.isLoading = true;
                }
            }
            newFullPath = this._normalizePath(newFullPath);

            this.state.loadingFiles.forEach((val) => {
                if (Path.dirname(val) === newFullPath && !fileMap.has(val)) {
                    fileMap.set(val, {
                        directory: false,
                        fileId: val,
                        fullPath: val,
                        name: Path.basename(val),
                        sizeInBytes: 0,
                        targetName: this.props.connector,
                        type: "",
                        isLoading: true
                    });
                }
            })

            this.setState({
                // cause a reset of fileBrowser sortedList
                isLoading: true
            });
            setTimeout(() => {
                this.setState({
                    path: newFullPath,
                    fileMapViewing: fileMap,
                    isLoading: false,
                    offset: offset
                });
            }, 0);

            return true;
        } catch(e) {
            Alert.show({
                title: 'Browse path failed',
                msg: `${e.message || e.log || e.error || e}`,
                isAlert: true
            });
            console.error(e);
            return false;
        }
    }

    _normalizePath(path) {
        if (!path.startsWith("/")) {
            path = "/" + path;
        }
        if (path.endsWith("/")) {
            path = path.slice(0, -1);
        }
        return path;
    }

    _refreshPath(newPath) {
        newPath = this._normalizePath(newPath);
        if (newPath !== this.state.path) return;
        this._browsePath(this.state.path, null, true);
    }

    _selectFiles(newSelectedFiles) {
        const { fileNamePattern, fileMapViewing } = this.state;
        const selectedFiles = [];
        for (const newSelectedFile of newSelectedFiles) {
            let newSelectedFileId = newSelectedFile.fileId;
            const fileObj = fileMapViewing.get(newSelectedFileId);
            if (fileObj == null) {
                console.error(`Selected file(${newSelectedFileId}) not exist`);
                continue;
            }
            selectedFiles.push({...fileObj});
        }
        this.setState({
            selectedFileDir: selectedFiles
        });
        this.props.setSelectedFileDir(selectedFiles, fileNamePattern);
    }

    _setRegex(regex) {
        this.setState({
            fileNamePattern: regex
        });

        const { selectedFileDir } = this.state;
        const { setSelectedFileDir } = this.props;
        setSelectedFileDir(selectedFileDir, regex);
    }

    _getNumSelected() {
        return this.state.selectedFileDir.length;
    }

    _deselectFiles(files) {
        const fileIds = new Set();
        files.forEach((f) => {
            fileIds.add(f.fileId);
        });
        const selectedFiles = this.state.selectedFileDir.filter((f) => {
            return (!fileIds.has(f.fileId));
        });
        this.setState({
            selectedFileDir: selectedFiles
        });
        this.props.setSelectedFileDir(selectedFiles);
    }

    _addTempFile(fileName, path) {
        const fileMapViewing = this.state.fileMapViewing;
        path = this._normalizePath(path);

        fileMapViewing.set(path + "/" + fileName, {
            directory: false,
            fileId: path + "/" + fileName,
            fullPath: path + "/" + fileName,
            name: fileName,
            sizeInBytes: 0,
            targetName: this.props.connector,
            type: "",
            isLoading: true
        });
        this.setState({
            isLoading: true
        });
        this.state.loadingFiles.add(path + "/" + fileName);
        setTimeout(() => {
            this.setState({
                isLoading: false,
                fileMapViewing: fileMapViewing,
                loadingFiles: this.state.loadingFiles
            });
        }, 0);

    }

    _removeFile(filePath) {
        const fileMapViewing = this.state.fileMapViewing;
        fileMapViewing.delete(filePath);
        this.setState({
            isLoading: true
        });
        this.state.loadingFiles.delete(filePath);
        const selectedFiles = this.state.selectedFileDir.filter(f => {
            return filePath !== f.fileId;
        });
        if (selectedFiles.length !== this.state.selectedFileDir.length) {
            this.setState({
                selectedFileDir: selectedFiles
            });
            this.props.setSelectedFileDir(selectedFiles);
        }
        setTimeout(() => {
            this.setState({
                isLoading: false,
                fileMapViewing: fileMapViewing,
                loadingFiles: this.state.loadingFiles,
            });
        }, 0);
    }

    _toggleFileLoading(filePath, isLoading, refresh) {
        const fileMapViewing = this.state.fileMapViewing;
        let file = fileMapViewing.get(filePath);
        // toggle this.state.isLoading to trigger rerender
        if (file) {
            file.isLoading = isLoading;
            this.setState({
                isLoading: true
            });
            if (isLoading) {
                this.state.loadingFiles.add(filePath);
            } else {
                this.state.loadingFiles.delete(filePath);
            }
            if (refresh) {
                setTimeout(() => {
                    this.setState({
                        isLoading: false,
                        fileMapViewing: fileMapViewing,
                        loadingFiles: this.state.loadingFiles
                    });
                }, 0);
            } else {
                this.setState({
                    isLoading: false,
                    fileMapViewing: fileMapViewing,
                    loadingFiles: this.state.loadingFiles
                });
            }
        } else if (!isLoading) {
            this.state.loadingFiles.delete(filePath);
            this.setState({
                isLoading: true
            });
            setTimeout(() => {
                this.setState({
                    isLoading: false,
                    loadingFiles: this.state.loadingFiles
                });
            }, 0);
        }
    }

    _fetchForensics(path) {
        const statusCallback = (state) => {
            this.setState({
                ...state
            });
        };
        const { bucket } = this.props;
        this.setState({
            forensicsPath: path
        });
        if (path.startsWith(bucket)) {
            path = path.slice(bucket.length);
        }

        getForensics(bucket, path, this.metadataMap, statusCallback);
    }

    getDisplayPath(path) {
        try {
            const splits = path.split('/');
            const bucketPath = DSTargetManager.getS3NameFromValue(splits[0] + '/');
            if (splits.length === 1) {
                return bucketPath;
            } else {
                return bucketPath + splits.slice(1).join("/") + '/';
            }
        } catch (e) {
            console.error(e);
            return path + '/';
        }
    }

    render() {
        const {
            bucket, // string
            homePath, // string
            fileType, // SchemaService.FileType
            connector,
        } = this.props;

        const {
            isLoading,
            path,
            fileMapViewing,
            selectedFileDir,
            fileNamePattern,
            offset, maxOffset
        } = this.state;

        let rootFullPath = Path.join(bucket);
        if (rootFullPath.startsWith("/")) {
            rootFullPath = rootFullPath.slice(1);
        }
        if (rootFullPath.endsWith("/")) {
            rootFullPath = rootFullPath.slice(0, -1);
        }

        rootFullPath = rootFullPath.split('/')[0];

        let currentFullPath = path;
        if (currentFullPath.startsWith("/")) {
            currentFullPath = currentFullPath.slice(1);
        }
        if (currentFullPath.endsWith("/")) {
            currentFullPath = currentFullPath.slice(0, -1);
        }
        const displayFullPath = this.getDisplayPath(currentFullPath);
        const forensicsStats = this.metadataMap.get(this.state.forensicsPath);
        let upFolderClass = "icon xi-upload-folder xc-icon-action upFolderIcon";
        if (rootFullPath === currentFullPath) {
            upFolderClass += " xc-disabled";
        }

        // List file pagination
        const pagePrev = offset > 0 && !isLoading
            ? () => {
                const fetchData = async () => {
                    try {
                        const newOffset = offset - pageSize;
                        const { fileMap } = await this._fetchFileList(path, newOffset);
                        this.setState({
                            fileMapViewing: fileMap,
                            offset: newOffset
                        });
                    } catch(e) {
                        Alert.show({
                            title: 'Browse path failed',
                            msg: `${e.message || e.log || e.error || e}`,
                            isAlert: true
                        });
                    }
                };
                fetchData();
            }
            : null;
        const pageNext = (offset + pageSize) <= maxOffset && !isLoading
            ? () => {
                const fetchData = async () => {
                    try {
                        const newOffset = offset + pageSize;
                        const { fileMap } = await this._fetchFileList(path, newOffset);
                        this.setState({
                            fileMapViewing: fileMap,
                            offset: newOffset
                        });
                    } catch(e) {
                        Alert.show({
                            title: 'Browse path failed',
                            msg: `${e.message || e.log || e.error || e}`,
                            isAlert: true
                        });
                    }
                };
                fetchData();
            }
            : null;
        const { count: numFiles, hasMore: hasMoreFiles } = this._getListFileStats();
        let page = Math.floor(offset / pageSize) + 1;
        return (
            <div className="browseDataSourceScreen">
                { selectedFileDir.length > 0 &&
                <SingleSelectedFileArea
                    bucket={bucket}
                    selectedFileDir={selectedFileDir}
                    fileNamePattern={fileNamePattern}
                    onDeselect={(files) => { this._deselectFiles(files); }}
                    onPatternChange={(regex) => { this._setRegex(regex); }}
                />
                }
                <div className="fileBrowserPath">
                    <div className="sourcePathHeader heading">Source Path</div>
                    <div className="flexContainer">
                        <i className={upFolderClass}
                            data-toggle="tooltip"
                            data-placement="auto top"
                            data-container="body"
                            data-original-title="Go to parent directory"
                            onClick={() => {
                                if (rootFullPath === currentFullPath) {
                                    return;
                                }
                                const parentPath = Path.dirname(currentFullPath);
                                this._browsePath(parentPath, fileType);
                            }}>
                        </i>
                        <input value={displayFullPath} readOnly disabled />
                        {!isLoading ? <div className="numItems">{numFiles.toLocaleString()}{hasMoreFiles ? "+" : ""} {numFiles === 1 ? "item" : "items"}</div>
                        : null}
                    </div>
                </div>

                <div className="fileListTableArea">

                    <div className="fileListTableWrap">
                    {isLoading ? <LoadingText className="loadingText">Loading</LoadingText> :
                        (
                        <FileBrowserTable
                            currentFullPath={currentFullPath}
                            fileMap={fileMapViewing}
                            selectedIds={getSelectedIdsForCurrentView(fileMapViewing, selectedFileDir)}
                            onPathChange={(newFullPath) => { this._browsePath(newFullPath, fileType); }}
                            onSelect={(files) => {
                                // if (this._getNumSelected() + files.size > 1) {
                                //     Alert.show({
                                //         title: 'Error',
                                //         msg: 'Only one file or folder can be selected',
                                //         isAlert: true
                                //     });
                                // } else {
                                //     this._selectFiles(files);
                                // }
                                this._selectFiles(files);
                            }}
                            onDeselect={(files) => { this._deselectFiles(files); }}
                            onInfoClick={(path) => { this._fetchForensics(path); }}
                            fileType={fileType}
                            canUpload={DSTargetManager.isPrivateS3Bucket(this.props.connector, bucket)}
                            addTempFile={(fileName, path) => {this._addTempFile(fileName, path)}}
                            removeFile={(filePath) => {this._removeFile(filePath)}}
                            toggleFileLoading={(filePath, isLoading, refresh) => {this._toggleFileLoading(filePath, isLoading, refresh)}}
                            refreshPath={(path) => {this._refreshPath(path)}}
                        /> )
                    }
                    <Pagination onNext={pageNext} onPrev={pagePrev} page={page} />
                    </div>
                    {/* <Rnd
                        className="rightAreaResizable"
                        default={{width: 300}}
                        minWidth={100}
                        maxWidth={"50%"}
                        bounds="parent"
                        disableDragging={true}
                        resizeHandleWrapperClass="resizeHandles"
                        enableResizing={{ top:false, right:false, bottom:false, left:true, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
                    >
                        <div className="rightArea">
                            {this.state.showForensics ?
                                <Rnd
                                    bounds="parent"
                                    disableDragging={true}
                                    resizeHandleWrapperClass="resizeHandles"
                                    enableResizing={{ top:false, right:false, bottom:true, left:false, topRight:false, bottomRight:false, bottomLeft:false, topLeft:false }}
                                >
                                    <ForensicsContent
                                        path={this.state.forensicsPath}
                                        isShow={ this.state.showForensics }
                                        stats={ forensicsStats }
                                        message={ this.state.forensicsMessage }
                                    />
                                </Rnd> : null
                            }
                            <SelectedFilesArea
                                bucket={bucket}
                                selectedFileDir={selectedFileDir}
                                onDeselect={(files) => { this._deselectFiles(files); }}
                            />
                        </div>

                        </Rnd> */}
                </div>
            </div>
        );
    }
}

/**
 * Pure Component: forensics information
 * @param {*} props
 */
function ForensicsContent(props) {
    const {
        isShow = false,
        message = [],
        stats,
        path = ""
    } = props || {};

    let pieCharts = null;
    if (stats && Object.keys(stats).length) {
         // TODO need better stats for pie charts
        // pieCharts = <React.Fragment>
        //                 <div className="pieHeader">{path}</div>
        //                 <BucketChart stats={stats} />
        //             </React.Fragment>;
        pieCharts = <React.Fragment>
                        <div className="pieHeader">{path}</div>
                        <pre>{JSON.stringify(stats, null, '  ')}</pre>
                    </React.Fragment>;
    }

    if (isShow) {
        return (
            <div className="forensicsContent">
                {message.length ?
                    <div className="forensicMessages">{ message.map((m, i) => (<div key={i}>{m}</div>)) }</div>
                    : null
                }
                {pieCharts}
            </div>
        );
    } else {
        return null;
    }
}


function BrowseDataSourceModal(props) {
    const [selectedFiles, setSelectedFileDir] = React.useState(props.selectedFileDir);
    const [fileNamePattern, setFileNamePattern] = React.useState(props.fileNamePattern);
    return (
        <Modal.Dialog id="fileBrowserModal">
            <Modal.Header onClose={props.onCancel}>{Texts.title}</Modal.Header>
            <Modal.Body>
                <BrowseDataSource {...props}
                    setSelectedFileDir={(selected, regex) => {
                        setSelectedFileDir(selected);
                        setFileNamePattern(regex);
                    }}
                />
            </Modal.Body>
            <Modal.Footer>
                <NavButtons
                    left={{ label: Texts.navButtonLeft, onClick: () => { props.onCancel() } }}
                    right={{
                        label: Texts.navButtonRight,
                        onClick: () => { props.onDone(selectedFiles, fileNamePattern) }
                    }}
                />
            </Modal.Footer>
        </Modal.Dialog>
    );
}

function BucketChart({stats}) {
    const typeCount = {};
    const typeSize = {};
    const chartData = [];
    for (const file in stats.type) {
        let fileType = file.toUpperCase();
        if (!(fileType in typeList)) {
            fileType = "UNSUPPORTED";
        }
        if (fileType in typeCount) {
            typeCount[fileType] += stats.type[file];
        } else {
            typeCount[fileType] = stats.type[file];
        }

    }

    for (const [type, count] of Object.entries(typeCount)) {
        chartData.push({
            name: type,
            value: count
        });
    }

    return (
        <div className="chartArea">
            <ResponsiveContainer height={200} width="100%">
                <PieChart height={200}>
                    <Pie
                        dataKey="value"
                        isAnimationActive={false}
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        outerRadius="50%"
                        fill="#8884d8"
                        label={({name, value}) => name + ': ' + value.toLocaleString()}
                    >
                        {/* <Label position="top">Count</Label> */}
                        {
                            chartData.map((entry, index) =>
                                <Cell key={entry.name} fill={typeList[entry.name.toUpperCase()]}/>
                            )
                        }
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export { BrowseDataSource, BrowseDataSourceModal };