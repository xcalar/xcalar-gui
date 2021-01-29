import React from 'react';
import clsx from 'clsx';
import { withStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import { AutoSizer, Column, Table } from 'react-virtualized';
import prettyBytes from 'pretty-bytes';

const Texts = {
    selectListTitle: 'Selected Files/Directories'
};

const typeList = {
    "json": "#00cf18",
    "csv": "#4287f5",
    "parquet": "#002483",
    "directory": "#888",
    "unsupported": "#333",
};


const styles = theme => ({
  flexContainer: {
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  table: {
    // temporary right-to-left patch, waiting for
    // https://github.com/bvaughn/react-virtualized/issues/454
    '& .ReactVirtualized__Table__headerRow': {
      flip: false,
      paddingRight: theme.direction === 'rtl' ? '0px !important' : undefined,
    },
  },
  tableRow: {
    cursor: 'pointer',
  },
  tableRowHover: {
    '&:hover': {
    //   backgroundColor: theme.palette.grey[200],
    },
  },
  tableCell: {
    flex: 1,
  },
  noClick: {
    cursor: 'initial',
  },
});

class MuiVirtualizedTable extends React.PureComponent {
    constructor(props) {
        super(props);
        this.getRowClassName = this.getRowClassName.bind(this);
        this.cellRenderer = this.cellRenderer.bind(this);
        this.headerRenderer = this.headerRenderer.bind(this);
        this.checkboxCellRenderer = this.checkboxCellRenderer.bind(this);
        this.checkboxHeaderRenderer = this.checkboxHeaderRenderer.bind(this);
        this.handleCheckboxClick = this.handleCheckboxClick.bind(this);
        this.onSelectAllClick = this.onSelectAllClick.bind(this);
    }

  getRowClassName({ index }) {
    const { classes } = this.props;

    return clsx(classes.tableRow, classes.flexContainer, {
      [classes.tableRowHover]: index !== -1,
    });
  };

    handleCheckboxClick(event, rowData) {
        this.props.onDeselect(new Set([rowData]));
    }

    onSelectAllClick() {
        const files = new Set();
        this.props.fileList.forEach((file) => {
            if (this.props.isSelected(file)) {
                files.add(file);
            }
        });
        this.props.onDeselect(files);
    }


  cellRenderer(info) {
    const {cellData, columnIndex} = info;
    const { classes, rowHeight } = this.props;
    let text = info.customRender ? info.customRender(info.rowData) : cellData;
    return (
      <TableCell
        component="div"
        className={clsx(classes.tableCell, classes.flexContainer, {
          [classes.noClick]: true,
        })}
        variant="body"
        style={{ height: rowHeight }}
        align={'left'}
      >
        <div className="innerCell">{text}</div>
      </TableCell>
    );
  }


  headerRenderer({ label, columnIndex }) {
    const { headerHeight, classes } = this.props;

    return (
      <TableCell
        component="div"
        className={clsx(classes.tableCell, classes.flexContainer)}
        variant="head"
        style={{ height: headerHeight }}
        align={'left'}
        onClick={this.onSelectAllClick}
      >
        <span>{label}</span>
      </TableCell>
    );
  };

  checkboxCellRenderer(info) {
    const {
        cellData: fileId,
        columnIndex
    } = info;
    const { classes, rowHeight } = this.props;

    return (
      <TableCell
        component="div"
        className={clsx(classes.tableCell, classes.flexContainer, {
          [classes.noClick]: false,
        })}
        variant="body"
        style={{ height: rowHeight }}
        align={'left'}
        onClick={event => this.handleCheckboxClick(event, info.rowData)}
      >
        <i className="icon xi-close"></i>
      </TableCell>
    );
  };

  checkboxHeaderRenderer({ label, columnIndex }) {
    const { headerHeight, classes } = this.props;
    return (
      <TableCell
        component="div"
        className={clsx(classes.tableCell, classes.flexContainer)}
        variant="head"
        style={{ height: headerHeight }}
        align={'left'}
        onClick={this.onSelectAllClick}
      >
        <i className="icon xi-close"></i>
      </TableCell>
    );
  };

  render() {
    const { classes, columns, rowHeight, headerHeight, ...tableProps } = this.props;
    return (
      <AutoSizer>
        {({ height, width }) => (
          <Table
            height={height}
            width={width}
            rowHeight={rowHeight}
            gridStyle={{
              direction: 'inherit',
            }}
            headerHeight={headerHeight}
            className={classes.table}
            size="small"
            {...tableProps}
            rowClassName={this.getRowClassName}
          >
            <Column
                key={"fileId"}
                headerRenderer={headerProps =>
                this.checkboxHeaderRenderer({
                    ...headerProps,
                    columnIndex: 0,
                })
                }
                className={classes.flexContainer}
                cellRenderer={this.checkboxCellRenderer}
                dataKey={"fileId"}
                width={30}
                label={"checkbox"}
            />
            {columns.map(({ dataKey, ...other }, index) => {
                return (
                    <Column
                        key={dataKey}
                        headerRenderer={headerProps =>
                            this.headerRenderer({
                                ...headerProps,
                                columnIndex: index + 1,
                            })
                        }
                        className={classes.flexContainer}
                        cellRenderer={this.cellRenderer}
                        dataKey={dataKey}
                        flexGrow={1}
                        {...other}
                    />
                );
            })}
          </Table>
        )}
      </AutoSizer>
    );
  }
}

MuiVirtualizedTable.defaultProps = {
    headerHeight: 32,
    rowHeight: 24,
};

// MuiVirtualizedTable.propTypes = {
//   classes: PropTypes.object.isRequired,
//   columns: PropTypes.arrayOf(
//     PropTypes.shape({
//       dataKey: PropTypes.string.isRequired,
//       label: PropTypes.string.isRequired,
//       numeric: PropTypes.bool,
//       width: PropTypes.number.isRequired,
//     }),
//   ).isRequired,
//   headerHeight: PropTypes.number,
//   onRowClick: PropTypes.func,
//   rowHeight: PropTypes.number,
// };

const VirtualizedTable = withStyles(styles)(MuiVirtualizedTable);

function SelectedFilesSummary({fileList}) {
    const typeCount = {};
    const typeSize = {};
    for (const file of fileList) {
        let fileType = file.type.toLowerCase();

        if (!(fileType in typeList)) {
            fileType = "unsupported";
        }
        if (fileType in typeCount) {
            typeCount[fileType]++;
            typeSize[fileType] += file.sizeInBytes;
        } else {
            typeCount[fileType] = 1;
            typeSize[fileType] = file.sizeInBytes;
        }
    }

    // Chart data for file count by types
    const chartData = [];
    let totalCountOfFiles = 0;
    for (const [type, count] of Object.entries(typeCount)) {
        chartData.push({
            name: type,
            value: count
        });
        totalCountOfFiles += typeCount[type];
    }

    // Chart data for file size by types
    const totalCountOfDirectories = typeCount['directory'] || 0;
    totalCountOfFiles -= totalCountOfDirectories;

    const chartData2 = [];
    for (const [type, size] of Object.entries(typeSize)) {
        if (type !== 'directory') {
            chartData2.push({
                name: type,
                value: size
            });
        }
    }

    return (
        <div className="selectedFileDistribution">
            <table >
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Count</th>
                        <th>Total Size</th>
                    </tr>
                </thead>
                <tbody>
                    {chartData.length ?
                        chartData.map((item, i) => {
                            const size = (item.name === "directory") ?  "" : prettyBytes(typeSize[item.name]);
                            return (
                                <tr key={item.name}>
                                    <td>{item.name}</td>
                                    <td>{item.value.toLocaleString()}</td>
                                    <td>{size}</td>
                                </tr>
                            )
                        })
                        :
                        <tr><td className="noFilesSelected" colSpan="3">No Files Selected</td></tr>
                    }
                </tbody>
            </table>
        </div>
    )
}

export default function ReactVirtualizedTable(props) {
    const {
        bucket,
        selectedFileDir,
        onDeselect
    } = props;

    const selectedIds = new Set();
    const fileList = [];
    const filteredSelectedFileDir = []; // only files in current bucket
    selectedFileDir.forEach((fileInfo, i) => {
        if (fileInfo.fullPath.startsWith(bucket)) {
            filteredSelectedFileDir.push(fileInfo);
            selectedIds.add(fileInfo.fileId);
            fileList.push(
                {
                    size: fileInfo.directory
                        ? null
                        : prettyBytes(fileInfo.sizeInBytes),
                    ...fileInfo
                }
            );
        }
    });

    return (
        <div className="selectedFilesArea">
            <div className="selectedFilesHeader">{Texts.selectListTitle}</div>
            <SelectedFilesSummary fileList={filteredSelectedFileDir} />
            {selectedFileDir.length ?
            <div className="innerTableWrap">
                <VirtualizedTable
                    selectedIds={selectedIds}
                    fileList={fileList}
                    onDeselect={onDeselect}
                    rowCount={fileList.length}
                    rowGetter={({ index }) => fileList[index]}
                    columns={[
                        {
                            width: 200,
                            label: 'Clear All',
                            dataKey: 'fullPath'
                        }
                    ]}
                    isSelected={(rowData) => {
                        return selectedIds.has(rowData.fileId);
                    }}
                />
            </div> : null }
        </div>
    );
}
