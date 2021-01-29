import * as React from "react";
import Pagination from '../../../components/widgets/Pagination'
import * as AdvOption from './AdvanceOption'
import LoadingText from '../../../components/widgets/LoadingText'
import { OptionSampleSize } from './OptionSampleSize'
import * as SchemaService from '../../services/SchemaService';
import { Folder, InsertDriveFileOutlined } from '@material-ui/icons';

const fileTypesNoSelect = new Set([
    SchemaService.FileType.CSV,
    SchemaService.FileType.PARQUET
]);

class FilePreview extends React.PureComponent<any, any> {
    constructor(props) {
        super(props);
    }

    render() {
        const { fileSelectProps, fileContentProps, parserType, selectedFileDir } = this.props;
        const { filesCursor } = fileSelectProps;

        if (filesCursor == null || filesCursor.getSize() === 0) {
            return null;
        }

        let headerHelpText = null;

        if (!fileTypesNoSelect.has(parserType)) {
            headerHelpText = <div className="headerHelpText">
                <i className="icon xi-info-circle-outline"></i>Select records (max to 5) to discover your schema
            </div>
        }

        return (<div className="schemaSection">
            <div className="header">
                <span>Edit Schema</span>
                <i className="qMark icon xi-unknown xc-action" style={{ position: "relative", top: "-2px", left: "4px" }} data-toggle="tooltip" data-container="body" data-title="Click here to learn more about how to verify your schema and create your table" data-placement="auto top" onClick={() => {
                    window.open("https://xcalar.com/documentation/Content/Content_QSG/qs_intro_build_datamart_2.htm");
                }}></i>
            </div>
            <AdvOption.Container>
                <AdvOption.OptionGroup>
                    <AdvOption.Option classNames={['fullRow', 'selectedDirRow']}>
                        <AdvOption.OptionLabel>Selected File / Folder</AdvOption.OptionLabel>
                        <AdvOption.OptionValue>
                           <SelectedFile {...fileSelectProps}  selectedFileDir={selectedFileDir} />
                        </AdvOption.OptionValue>
                    </AdvOption.Option>
                </AdvOption.OptionGroup>
            </AdvOption.Container>
            <FileSelectArea {...fileSelectProps} selectedFileDir={selectedFileDir} />
            {headerHelpText}
            <FileContentWrap {...fileContentProps} parserType={this.props.parserType} />
        </div>);
    }
}

function SelectedFile(props) {
    const { isLoading, selectedFileDir } = props;

    if (isLoading) {
        return (<LoadingText className="clearfix" />);
    }


    return (<React.Fragment>
        <div className="iconWrapper">
            {selectedFileDir[0].directory ?
            <Folder style={{fontSize: 20, position: "absolute", top: -2, left: -2}}/> :
            <InsertDriveFileOutlined style={{fontSize: 20, position: "absolute", top: -2, left: -2}}/>}
        </div>
        {selectedFileDir[0].fullPath}
        </React.Fragment>)
}

function FileSelectArea(props) {
    const { isLoading, filesCursor, fileSelected, onSelect, selectedFileDir } = props;

    if (!selectedFileDir[0].directory) {
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

    let filesArray = [];
    for (const file of files) {
        filesArray.push(
        <DirectoryLine key={`${file.fileId}`} isDirectory={file.directory} checked={fileSelected && fileSelected.fileId === file.fileId} onChange={(checked) => {
            onSelect(file)
        }}>
            <div>{file.name}</div>
        </DirectoryLine>)
    }

    // const handleInputChange = (e) => {
    //     let num = parseInt(e.target.value);
    //     if (!isNaN(num)) {
    //         num = Math.max(1, Math.floor(num));
    //         num = Math.min(num, numPages);
    //         setCurrPage("" + num);
    //         setOffset((num - 1) * pageSize);
    //     } else {
    //         setCurrPage("" + (Math.floor(offset / pageSize) + 1));
    //     }
    // }

    const numFiles = filesCursor.getSize();
    const hasMoreFiles = filesCursor.hasMore();
    let page = Math.floor(offset / pageSize) + 1;

    return <div className="fileListArea">
                <div className="fileListHeader">
                    Select a file to detect your schema
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

class FileContentWrap extends React.PureComponent<any, any> {

    render() {
        const {
            isLoading, error, content, isAutoDetect, linesSelected, lineOffset, sampleSize,
            onLineChange,
            onAutoDetectChange,
            onSampleSizeChange,
            onClickDiscover,
            onOffsetChange,
            linesHaveError,
            parserType
        } = this.props;


        if (isLoading) {
            return (<LoadingText className="clearfix" />);
        }

        if (error != null) {
            return (<pre className="preview-error">{error}</pre>);
        }

        const pageSize = 10;
        const prevOffset = lineOffset - pageSize;
        const pagePrev = prevOffset >= 0
            ? () => { onOffsetChange(prevOffset); }
            : null;
        const nextOffset = lineOffset + pageSize;
        const pageNext = nextOffset < content.length
            ? () => { onOffsetChange(nextOffset); }
            : null;

        // Find out empty column names
        // For example in CSV:
        // a,b,c,,
        // 1,2,3,4,5
        let noNameError = null;
        try {
            for (const { status } of content) {
                const { hasError, unsupportedColumns } = status;
                if (hasError) {
                    for (const { name } of unsupportedColumns) {
                        if (name.length === 0 || name === '""') {
                            throw 'Field(s) with no names detected';
                        }
                    }
                }
            }
        } catch(e) {
            noNameError = `${e}`;
        }

        if (fileTypesNoSelect.has(parserType)) {
            if (linesHaveError) {
                let errorLines = [];
                content.forEach(({data, status}, index) => {
                    if (status.hasError) {
                        errorLines.push({
                            line: data,
                            status: status
                        });
                    }
                })
                return (<React.Fragment>
                    {noNameError && <div className="preview-error">{noNameError}</div>}
                    <ErrorFileContent {...this.props} data={errorLines} />
                </React.Fragment>);
            } else {
                return null;
            }
        }

        return (<div>
            {noNameError && <div className="preview-error">{noNameError}</div>}
            {/* <AutoDetectOption checked={isAutoDetect} onChange={(checked) => { onAutoDetectChange(checked); }}></AutoDetectOption> */}
            {isAutoDetect || <FileContent
                data={content.map(({data, status}) => ({line: data, status: status}))}
                selected={linesSelected}
                onSelectChange={(indexList, isSelect) => { onLineChange(indexList, isSelect); }}
                offset={lineOffset}
                numRows={pageSize}
            >
                <Pagination onNext={pageNext} onPrev={pagePrev} />
            </FileContent>}
            { isAutoDetect &&
                <AutoDetectSection
                    sampleSize={sampleSize}
                    style={{paddingLeft: '12px'}}
                    onSampleSizeChange={onSampleSizeChange}
                    onDiscover={onClickDiscover}
                />}
        </div>);
    }
}

class AutoDetectSection extends React.PureComponent<any, any> {
    constructor(props) {
        super(props);
    }

    render() {
        const { sampleSize, onSampleSizeChange, onDiscover, style = {} } = this.props;

        return (<div style={style}>
            <AdvOption.Container><AdvOption.OptionGroup>
                <OptionSampleSize
                    sampleSize={sampleSize}
                    onChange={(size) => { onSampleSizeChange(size); }}
                >Sample Size:</OptionSampleSize>
            </AdvOption.OptionGroup></AdvOption.Container>
            <button className="btn btn-secondary btn-new" onClick={() => { onDiscover(); }}>Discover</button>
        </div>);
    }
}

function FileContent(props: any) {
    const { data = [], onSelectChange, selected = [], children, offset = 0, numRows = -1 } = props;

    if (data.length === 0) {
        return (<span>No Content</span>);
    }

    const startIndex = offset;
    const endIndex = startIndex + (numRows > 0 ? numRows : data.length) - 1;
    return (<div>
        <div className="scrollSection">
            <div className="innerScrollSection">
            {data.map(({line, status}, index) => {
                const { hasError =  false, errorMessage = null, unsupportedColumns = [] } = status;
                const lineCssClass = hasError ? 'fileLine-error': null;
                const hintProps = hasError ? {
                    'data-toggle': "tooltip",
                    'data-container': "body",
                    'data-placement': "top auto",
                    'data-original-title': JSON.stringify(unsupportedColumns, null, ' ')
                } : {};

                return (<FileLine key={`${index}`} lineNum={index + 1} checked={selected.indexOf(index) >= 0} onChange={(checked) => {
                    onSelectChange([index], checked)
                }}>

                    <span className={lineCssClass} {...hintProps}>
                        {line}
                    </span>
                </FileLine>);
            }).filter((v, i) => (i >= startIndex && i <= endIndex))}
            </div>
        </div>
        { children }
    </div>);
}

function ErrorFileContent(props: any) {
    const {
        data
    } = props;
    const pageSize = 5;
    const [lineOffset, setLineOffset] = React.useState(0);
    const onOffsetChange = (offset) => {
        setLineOffset(offset);
    };
    const prevOffset = lineOffset - pageSize;
    const pagePrev = prevOffset >= 0
        ? () => { onOffsetChange(prevOffset); }
        : null;
    const nextOffset = lineOffset + pageSize;
    const pageNext = nextOffset < data.length
        ? () => { onOffsetChange(nextOffset); }
        : null;

    const startIndex = lineOffset;
    const endIndex = startIndex + (pageSize > 0 ? pageSize : data.length) - 1;
    return (<div className="csvErrorSection">
        <div className="preview-error">Errors were found in the following rows:</div>
        <div className="scrollSection">
            <div className="innerScrollSection">
            {data.map(({line, status}, index) => {
                const { hasError =  false, errorMessage = null, unsupportedColumns = [] } = status;
                const hintProps = {
                    'data-toggle': "tooltip",
                    'data-container': "body",
                    'data-placement': "top auto",
                    'data-original-title': line
                };

                return (<div className="csvArgs-chkbox" key={index}>
                    <div className="lineNum">{index + 1}</div>
                    <span className="preview-line">
                        <span className={"fileLine-warn"}>
                            {JSON.stringify(unsupportedColumns)}
                        </span>
                    </span>
                </div>);
            }).filter((v, i) => (i >= startIndex && i <= endIndex))}
            </div>
        </div>
        <Pagination onNext={pageNext} onPrev={pagePrev} />
    </div>);
}

function FileLine(props) {
    const { checked, onChange, children, lineNum } = props;
    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
    let rowClass = "csvArgs-chkbox";
    if (checked) {
        rowClass += " selected";
    }
    return (
        <div className={rowClass}>
            <i style={{fontSize: '14px'}} className={iconClasses.join(' ')}  onClick={() => { onChange(!checked) }} />
            <div className="lineNum">{lineNum}</div>
            <span className="preview-line">{children}</span>
        </div>
    );
}

function DirectoryLine(props) {
    const { checked, onChange, children, isDirectory } = props;
    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];
    let rowClass = "csvArgs-chkbox";
    if (checked) {
        rowClass += " selected";
    }
    return (
        <div className={rowClass}>
            <i style={{fontSize: '14px'}} className={iconClasses.join(' ')}  onClick={() => { onChange(!checked) }} />
            <div className="fileType">{isDirectory ?
                <Folder style={{fontSize: 20, position: "absolute", top: 5, left: 6}}/> :
                <InsertDriveFileOutlined style={{fontSize: 20, position: "absolute", top: 5, left: 6}}/>}
            </div>
            <span className="fileName">{children}</span>
        </div>
    );
}

function AutoDetectOption(props) {
    const { checked, onChange } = props;
    const iconClasses = ['icon', checked ? 'xi-ckbox-selected' : 'xi-ckbox-empty'];

    return (
        <div className="csvArgs-chkbox">
            <i className={iconClasses.join(' ')}  onClick={() => { onChange(!checked) }} />
            <span style={{paddingLeft: '4px'}} onClick={() => { onChange(!checked); }}>Auto Detect Schema</span>
        </div>
    );
}

export { FilePreview };