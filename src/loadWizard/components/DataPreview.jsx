import React from "react"
import { useTable, useFlexLayout, useResizeColumns } from 'react-table'
import Pagination from '../../components/widgets/Pagination'
import LoadingText from '../../components/widgets/LoadingText'
import * as Modal from './Modal'

function Table({ columns, data }) {
    const defaultColumn = React.useMemo(
      () => ({
        minWidth: 50,
        width: 100,
        maxWidth: 200,
      }),
      []
    )

    const {
      getTableProps,
      headerGroups,
      rows,
      prepareRow,
    } = useTable(
      {
        columns,
        data,
        defaultColumn,
      },
      useFlexLayout,
      useResizeColumns
    )

    return (
        <div className="table-wrapper">
            <div {...getTableProps()} className="table">
                <div className="thead">
                    {headerGroups.map(headerGroup => (
                        <div {...headerGroup.getHeaderGroupProps()} className="tr">
                            {headerGroup.headers.map((column, i) => (
                                <div {...column.getHeaderProps()} className="th">
                                    {column.render('Header')}
                                    {column.canResize &&
                                        <div
                                        {...column.getResizerProps()}
                                        className={`resizer ${column.isResizing ? 'isResizing' : ''}`}
                                        />
                                    }
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="tbody">
                    {rows.map((row, i) => {
                        prepareRow(row);
                        const trClasses = ['tr'].concat((i % 2) == 0 ? [] : ['tr-grey']);
                        return (
                            <div {...row.getRowProps()} className={trClasses.join(' ')}>
                                {row.cells.map(cell => {
                                return (
                                    <div {...cell.getCellProps()} className="td">
                                        {cell.render('Cell')}
                                    </div>
                                )
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

class DataPreview extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            metadata: {
                totalSize: 0,
                columns: []
            },
            offset: 0,
            data: []
        };
    }

    async componentDidMount() {
        const { offset } = this.state;
        const { pageSize = 10 } = this.props;
        await this._fetchMeta();
        await this._fetchData(offset, pageSize);
    }

    async _fetchMeta() {
        const { onFetchMeta = async () => ({numRows: 0, columns: []}) } = this.props;
        try {
            this.setState({isLoading: true});
            const { numRows, columns } = await onFetchMeta();
            this.setState({
                metadata: {
                    totalSize: numRows,
                    columns: columns.map(column => ({ ...column }))
                }
            });
        } catch(e) {
            // XXX TODO: error handling
            console.error(e);
        } finally {
            this.setState({isLoading: false});
        }
    }

    async _fetchData(offset, pageSize) {
        try {
            // this.setState({isLoading: true});

            const { onFetchData = async () => [] } = this.props;
            const data = await onFetchData({offset, pageSize});
            this.setState({
                offset: offset,
                data: data.map((d, i) => injectIndex(d, offset + i))
            });
        } catch(e) {
            // XXX TODO: error handling
            console.error(e);
        } finally {
            // this.setState({isLoading: false});
        }

        function injectIndex(data, index) {
            return { index: index, ...data };
        }
    }

    _createColumnsDefs(columns = []) {
        const dataColumns = [
            {
                Header: '',
                width: 30,
                disableResizing: true,
                accessor: 'index',
                Cell: ({row}) => row.original.index + 1
            },
            ...columns.map(({ name, type }) => {
                return {
                    Header: () => {
                        const classNames = ['type-icon', 'icon', xcUIHelper.getColTypeIcon(type)];
                        return (<React.Fragment>
                            <i className={classNames.join(' ')} />
                            <span className="column-name">{name}</span>
                            </React.Fragment>);
                    },
                    accessor: name,
                    Cell: ({row}) => `${row.original[name]}`
                }
            })
        ];
        return dataColumns;
    }

    render() {
        const { pageSize = 10 } = this.props || {};
        const { data, offset, isLoading, metadata } = this.state;

        const prevOffset = Math.max(offset - pageSize, 0);
        const pagePrev = (offset > 0 && !isLoading)
            ? () => { this._fetchData(prevOffset, pageSize); }
            : null;
        const nextOffset = offset + pageSize;
        const pageNext = (nextOffset < metadata.totalSize && !isLoading)
            ? () => { this._fetchData(nextOffset, pageSize); }
            : null;

        const page = Math.floor(offset / pageSize) + 1;

        const columns = this._createColumnsDefs(metadata.columns);
        return (<React.Fragment>
            {columns.length > 1 &&
                <div className="previewTable">
                    <Table columns={columns} data={data} />
                </div>
            }
            {(!isLoading && metadata.totalSize == 0) && <div>0 rows</div> }
            {isLoading && <LoadingText className="clearfix" />}
            <Pagination onNext={pageNext} onPrev={pagePrev} page={page} />
        </React.Fragment>);
    }
}

class DataPreviewModal extends React.Component {
    render() {
        const { onClose, onFetchData, onFetchMeta, title = 'Table Preview' } = this.props;
        return (
            <Modal.Dialog>
                <Modal.Header onClose={onClose}>{title}</Modal.Header>
                <Modal.Body style={{padding: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                    <DataPreview pageSize={20} onFetchData={onFetchData} onFetchMeta={onFetchMeta}/>
                </Modal.Body>
            </Modal.Dialog>
        );
    }
}

export { DataPreview, DataPreviewModal }