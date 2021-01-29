namespace SqlQueryHistoryPanel {
    import QueryInfo = SqlQueryHistory.QueryInfo;
    import QueryExtInfo = SqlQueryHistory.QueryExtInfo;
    /**
     * Import symbols defined in other files from the same namespace
     * This is a hack fix for our grunt watch approach!!!
     *
     * In grunt dev, tsc goes through all the ts files(in the src folder),
     * and is smart enough to prefix symbols with the correct namespace.
     *
     * In grunt watch, only the file modified is present in the build src(tswatchtmp),
     * and tsc has no idea of the scope of symbols because lack of context.
     * Ex. DynaTalbe would be treated as a global class, if its definition
     * file(DynaTable.ts) is not provided.
     *
     * The long term solution should be compiling ts files directly from source folder,
     * but we have to keep the pseudo imports here before that happens.
     */
    import DynaTable = SqlQueryHistoryPanel.DynaTable;
    import TableColumnCategory = SqlQueryHistoryPanel.TableColumnCategory;
    import TableDefinition = SqlQueryHistoryPanel.TableDefinition;
    import TableHeaderColumnType = SqlQueryHistoryPanel.TableHeaderColumnType;
    import TableBodyColumnStatusProp = SqlQueryHistoryPanel.TableBodyColumnStatusProp;
    import TableBodyColumnTextLinkProp = SqlQueryHistoryPanel.TableBodyColumnTextLinkProp;
    import TableBodyColumnTextProp = SqlQueryHistoryPanel.TableBodyColumnTextProp;
    import SortOrder = SqlQueryHistoryPanel.SortOrder;

    export class BaseCard {
        protected _$cardContainer: JQuery = null;
        protected _tableComponent: DynaTable<QueryInfo> = null;
        protected _searchTerm = '';

        public setup({
            isShowAll = false,
            checkContainerVisible,
            $container
        }: CardOptions = <CardOptions>{} ) {
            this._$cardContainer = $container.find('.selQueryHistCard');

            this._tableComponent = this._createTableComponent({
                checkContainerVisible: checkContainerVisible,
                numRowToShow: isShowAll ? -1 : 200
            });

            // Title
            const $title = this._$cardContainer.find('.cardHeader .title');
            $title.html(this.getTitle());

            // Refresh
            const $refreshicon = this._$cardContainer.find(".selRefreshQueryHist");
            $refreshicon.on('click', () => {
                this.show(true);
            });

            // Cancel
            const $cancelicon = this._$cardContainer.find(".selCancelQueryHist");
            $cancelicon.on("click", () => {
                SQLEditorSpace.Instance.cancelExecution();
            });

            // Search box
            const $searchBox = this._$cardContainer.find(".selSearch");
            let searchTimeout = null
            $searchBox.off().on('input', () => {
                if (!$searchBox.is(":visible")) return; // ENG-8642
                if (searchTimeout != null) {
                    clearTimeout(searchTimeout);
                    searchTimeout = null;
                }
                searchTimeout = setTimeout(() => {
                    this._searchTerm = $searchBox.val();
                    this._updateTableUI(this.queryMap, false);
                }, 500);
            });
            SqlQueryHistModal.getInstance().setup();
        }

        protected getTableContainer(): JQuery {
            return this._$cardContainer.find('.cardMain');
        }

        protected getCardContainer(): JQuery {
            return this._$cardContainer;
        }

        protected getTitle(): string {
            return SQLTStr.queryHistCardTitle;
        }

        protected getColumnsToShow(): TableColumnCategory[] {
            return [
                TableColumnCategory.STATUS,
                TableColumnCategory.QUERY,
                TableColumnCategory.STARTTIME,
                TableColumnCategory.DURATION,
                TableColumnCategory.TABLE
            ];
        }

        protected getTableDefinition(): TableDefinition<QueryInfo> {
            const tableDef: TableDefinition<QueryInfo> = { columns: {} };
            tableDef.columns[TableColumnCategory.STATUS] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortStatus,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnStatusProp = {
                        category: TableColumnCategory.STATUS,
                        status: queryInfo.status
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.QUERY] = {
                type: TableHeaderColumnType.REGULAR,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextLinkProp = {
                        category: TableColumnCategory.QUERY,
                        text: queryInfo.queryString,
                        onLinkClick: () => this._onClickQuery(queryInfo.queryString)
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.STARTTIME] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortStartTime,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.STARTTIME,
                        isEllipsis: false,
                        text: formatDateTime(queryInfo.startTime)
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.DURATION] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortDuration,
                convertFunc: (queryInfo) => {
                    const duration = getDuration(queryInfo) || "N/A";
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.DURATION,
                        isEllipsis: true,
                        text: duration === "N/A"
                            ? duration
                            : xcTimeHelper.getElapsedTimeStr(
                                duration < 0 ? 0 : duration,
                                (queryInfo.endTime == null)
                            )
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.TABLE] = {
                type: TableHeaderColumnType.REGULAR,
                convertFunc: (queryInfo) => {
                    let text = "";
                    if (queryInfo.status === SQLStatus.Failed) {
                        text = queryInfo.errorMsg;
                    } else if (queryInfo.statementType &&
                        queryInfo.statementType !== SQLStatementType.Select) {
                        text = "";
                    } else if (queryInfo.status === SQLStatus.Done) {
                        text = "View";
                    }
                    const prop: TableBodyColumnTextLinkProp = {
                        category: TableColumnCategory.TABLE,
                        text: text,
                        isError: queryInfo.status === SQLStatus.Failed,
                        onLinkClick: () => {
                            if (queryInfo.status === SQLStatus.Failed) {
                                this._onClickError({
                                    title: AlertTStr.queryHistorySQLErrorTitle,
                                    errorMsg: queryInfo.errorMsg
                                });
                            } else if (queryInfo.statementType &&
                                queryInfo.statementType !== SQLStatementType.Select) {
                                return;
                            } else if (queryInfo.status === SQLStatus.Done) {
                                this._onClickTable(queryInfo);
                            }
                        }
                    };
                    return prop;
                }
            };
            return tableDef;
        }
        /**
         * Show the history table
         * @param refresh if this is a manual refresh triggered by click on icon
         * @description
         * If the queryMap is not null, the table is shown with existing data
         */
        public show(
            refresh: boolean
        ): XDPromise<any> {
            if (SqlQueryHistory.getInstance().isLoaded() && !refresh) {
                this._updateTableUI(this.queryMap, false);
                return PromiseHelper.resolve();
            } else {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                SqlQueryHistory.getInstance().readStore(refresh)
                .then( () => {
                    this._updateTableUI(this.queryMap, true);
                    if (!refresh) {
                        this._cleanupQueries(this.queryMap).then((updated) => {
                            if (updated) {
                                this._updateTableUI(this.queryMap, false);
                            }
                        });
                    }
                    // this._checkRunningQuery(this.queryMap);
                    deferred.resolve();
                })
                .fail( () => {
                    Alert.show({
                        title: AlertTStr.queryHistoryReadErrorTitle,
                        msg: SQLErrTStr.InvalidSQLQuery,
                        isAlert: true,
                        align: 'left',
                        preSpace: true,
                        sizeToText: true
                    });
                    deferred.resolve();
                });
                return deferred.promise();
            }
        }

        protected get queryMap(): SqlQueryMap {
            const searchTerm = this._searchTerm.toLowerCase();
            const queryMap = SqlQueryHistory.getInstance().getQueryMap();
            if (searchTerm.length > 0) {
                for (const sqlId of Object.keys(queryMap)) {
                    const queryInfo = queryMap[sqlId];
                    if (queryInfo != null && queryInfo.queryString != null) {
                        if (queryInfo.queryString.toLowerCase().indexOf(searchTerm) < 0) {
                            delete queryMap[sqlId];
                        }
                    }
                }
            }
            return queryMap;
        }

        protected _createTableComponent(props: {
            numRowToShow: number,
            checkContainerVisible?: () => boolean
        }): DynaTable<QueryInfo> {
            const { numRowToShow, checkContainerVisible } = props;

            return new DynaTable<QueryInfo>({
                columnsToShow: this.getColumnsToShow(),
                tableDef: this.getTableDefinition(),
                defaultSorting: {
                    sortBy: TableColumnCategory.STARTTIME,
                    sortOrder: SortOrder.DESC
                },
                numRowsToShow: numRowToShow,
                enableAutoRefresh: checkContainerVisible,
                msRefreshDuration: 2000,
                container: <any>this.getTableContainer()[0]
            });
        }

        /**
         * Recover the incomplete query information, which may be caused by accidently interruption such as refreshing page, closing browser ...
         * @returns boolean flag indicating if any queries have been updated
         * @description
         * Part of the recovering is already done by SqlQueryHistory.readStore(). This is a complement.
         * 1. Get queries left in backend
         * 2. Fix the status, time ... etc.
         * 3. Update the KVStore with updated information
         * 4. Remove the queries from backend
         */
        protected _cleanupQueries(queryMap: SqlQueryMap): XDPromise<boolean> {
            return XcalarQueryList(`${DagNodeSQL.PREFIX}*`)
            .then((queries: Xcrpc.Query.QueryInfo[]) => {
                // Step 1: Get queries left in backend
                const missingQueries = new Map<string, {state: number, elapsed: number}>();
                const getMissingQueries = queries.map(({name}) => {
                    const deferred: XDDeferred<void> = PromiseHelper.deferred();
                    XcalarQueryState(name)
                    .then((ret: XcalarApiQueryStateOutputT) => {
                        missingQueries.set(name, {
                            state: ret.queryState,
                            elapsed: ret.elapsed.milliseconds
                        });
                    })
                    .always(() => deferred.resolve());
                    return deferred.promise();
                });

                const queriesToDelete: string[] = [];
                const updatedQueries: QueryInfo[] = [];
                const deferred: XDDeferred<number> = PromiseHelper.deferred();
                PromiseHelper.when(...getMissingQueries)
                    // Step 2: Fix query information
                    .then(() => {
                        for (const [name, {state, elapsed}] of missingQueries) {
                            const queryInfo = queryMap[name];
                            if (queryInfo != null) {
                                if (fixQuery(queryInfo, state, elapsed)) {
                                    updatedQueries.push(queryInfo);
                                }
                            } else {
                                // it is in backend but not in KVStore
                                // This should never happen!
                                console.error(`Query ${name} not found`);
                            }

                            // All backend queries(except in running) need to be deleted
                            if (state !== QueryStateT.qrProcessing) {
                                queriesToDelete.push(name);
                            }
                        }
                    })
                    .then(() => {
                        // Step 4: Remove queries from backend
                        // We don't care about the result, so don't need to wait for it
                        removeQuries(queriesToDelete);
                        // Step 3: Update KVStore
                        return updateQueries(updatedQueries);
                    })
                    .then((updateCount) => deferred.resolve(updateCount))
                    .fail(() => deferred.resolve(0));

                return deferred.promise();
            })
            // Here is the return value of this method
            .then((updateCount) => updateCount > 0);

            /**
             * Helper function to update the query KVStore.
             * @param queryList
             * @returns number of queries successfully updated.
             * @description The return promise will always be resolved
             */
            function updateQueries(queryList: QueryInfo[]): XDPromise<number> {
                if (queryList.length === 0) {
                    return PromiseHelper.resolve(0);
                }
                let updateCount = 0;
                const promises = queryList.map((queryInfo) => {
                    const deferred: XDDeferred<void> = PromiseHelper.deferred();
                    SqlQueryHistory.getInstance().upsertQuery(queryInfo)
                        .then(() => { updateCount ++; })
                        // .then(() => console.log(`Update SQL ${queryInfo.queryId}`))
                        .always(() => deferred.resolve());
                    return deferred.promise();
                });

                const deferred: XDDeferred<number> = PromiseHelper.deferred();
                PromiseHelper.when(...promises)
                    .always(() => deferred.resolve(updateCount))
                return deferred.promise();
            }

            /**
             * Helper function to delete queries from backend
             * @param queryIds
             * @returns number of queries successfully updated. It will never fail
             * @description The return promise will always be resolved
             */
            function removeQuries(queryIds: string[]): XDPromise<number> {
                if (queryIds.length === 0) {
                    return PromiseHelper.resolve();
                }
                let removeCount = 0;
                const promises = queryIds.map((name) => {
                    const deferred: XDDeferred<void> = PromiseHelper.deferred();
                    XcalarQueryDelete(name)
                        .then(() => { removeCount ++; })
                        // .then(() => console.log(`Delete SQL ${name}`))
                        .always(() => deferred.resolve());
                    return deferred.promise();
                });

                const deferred: XDDeferred<number> = PromiseHelper.deferred();
                PromiseHelper.when(...promises)
                    .always(() => deferred.resolve(removeCount));
                return deferred.promise();
            }

            function fixQuery(queryInfo: QueryInfo, state: QueryStateT, elapsed: number): boolean {
                let isUpdated = false;
                const sqlStatus = <SQLStatus>convertState(state);
                if (queryInfo.status === SQLStatus.Running) {
                    if (sqlStatus !== SQLStatus.Running) {
                        queryInfo.status = sqlStatus || SQLStatus.Failed;
                        if (queryInfo.endTime == null) {
                            if (queryInfo.startTime == null) {
                                queryInfo.startTime = Date.now() - elapsed;
                            }
                            queryInfo.endTime = queryInfo.startTime + elapsed;
                        }
                        isUpdated = true;
                    }
                } else if (queryInfo.status === SQLStatus.Failed) {
                    if (sqlStatus === SQLStatus.Failed && queryInfo.endTime == null) {
                        if (queryInfo.startTime == null) {
                            queryInfo.startTime = Date.now() - elapsed;
                        }
                        queryInfo.endTime = queryInfo.startTime + elapsed;
                        isUpdated = true;
                    }
                } else if (queryInfo.status === SQLStatus.Cancelled) {
                    if (sqlStatus === SQLStatus.Cancelled && queryInfo.endTime == null) {
                        if (queryInfo.startTime == null) {
                            queryInfo.startTime = Date.now() - elapsed;
                        }
                        queryInfo.endTime = queryInfo.startTime + elapsed;
                        isUpdated = true;
                    }
                }

                return isUpdated;
            }

            function convertState(state: QueryStateT): string {
                const mapping: {[key: string]: string} = {};
                mapping[QueryStateT.qrCancelled] = SQLStatus.Cancelled;
                mapping[QueryStateT.qrError] = SQLStatus.Failed;
                mapping[QueryStateT.qrFinished] = SQLStatus.Done;
                mapping[QueryStateT.qrProcessing] = SQLStatus.Running;
                return mapping[state];
            }
        }

        // protected _checkRunningQuery(queryMap: SqlQueryMap): void {
        //     let runningQueryMap: SqlQueryMap = {};
        //     let hasRunningQuery: boolean = false;
        //     for (let id in queryMap) {
        //         let queryInfo = queryMap[id];
        //         if (queryInfo && queryInfo.status === SQLStatus.Running) {
        //             runningQueryMap[id] = queryInfo;
        //             hasRunningQuery = true;
        //         }
        //     }

        //     if (hasRunningQuery) {
        //         XcalarQueryList(DagNodeSQL.PREFIX + "*")
        //         .then((res) => {
        //             try {
        //                 let set: Set<string> = new Set();
        //                 res.queries.forEach((query) => {
        //                     set.add(query.name);
        //                 });

        //                 for (let id in runningQueryMap) {
        //                     if (!set.has(id)) {
        //                         // the query is finishing running but we somehow lose meta
        //                         let queryInfo = runningQueryMap[id];
        //                         queryInfo.status = SQLStatus.Done;
        //                         SQLHistorySpace.Instance.update(queryInfo);
        //                     } else {
        //                         // XXX TODO add a checking for running status
        //                         // if it's not tracked yet (like a refresh case)
        //                     }
        //                 }
        //             } catch (e) {
        //                 console.error(e);
        //             }
        //         })
        //     }
        // }

        protected _updateTableUI(queryMap: SqlQueryMap, isResetSorting: boolean): void {
            this._tableComponent.show(
                Object.keys(queryMap).map((sqlId) => queryMap[sqlId]),
                { isClearSorting: isResetSorting }
            );
        }

        // Event handler for query click
        protected _onClickQuery(query: string): void {
            // Show the query modal
            SqlQueryHistModal.getInstance().show({query: query});
        }

        protected _onClickError(
            {title, errorMsg}: {title: string, errorMsg: string}
        ): void {
            Alert.show({
                title: title,
                msg: errorMsg,
                isAlert: true,
                align: 'left',
                preSpace: true,
                sizeToText: true
            });
        }

        // Event handler for table click
        protected _onClickTable(queryInfo: QueryInfo): void {
            // Show the table
            let tableName = queryInfo.tableName;
            let tableId = xcHelper.getTableId(tableName);
            if (!tableId) {
                // invalid case
                this._noTableExistHandler(queryInfo);
                return;
            }
            let columns = queryInfo.columns;
            TableTabManager.Instance.openTab(tableName, TableTabType.SQLHistory, {
                tableName,
                columns
            });
        }

        protected _noTableExistHandler(queryInfo: QueryInfo): void {
            Alert.show({
                title: SQLErrTStr.Err,
                msg: SQLErrTStr.ResultDropped,
                onConfirm: () => {
                    // scroll to the latest history
                    $('#sqlWorkSpacePanel .historySection .flexTable .body').scrollTop(0);
                    SQLEditorSpace.Instance.execute(queryInfo.queryString);
                }
            });
        }
    }

    export const sortFunctions = {
        sortStartTime: (a: QueryInfo, b: QueryInfo) => (
            a.startTime - b.startTime
        ),
        sortDuration: (a: QueryInfo, b: QueryInfo) => {
            const now = Date.now();
            let aValue = getDuration(a, now);
            aValue = normalizeNumber(aValue);
            let bValue = getDuration(b, now);
            bValue = normalizeNumber(bValue);
            return aValue - bValue;
        },
        sortStatus: (a: QueryInfo, b: QueryInfo) => (
            a.status > b.status? 1: (a.status < b.status? -1: 0)
        ),
        sortRows: (a: QueryExtInfo, b: QueryExtInfo) => {
            let aValue = a.rows;
            aValue = normalizeNumber(aValue);
            let bValue = b.rows;
            bValue = normalizeNumber(bValue);
            return aValue - bValue;
        },
        sortSkew: (a: QueryExtInfo, b: QueryExtInfo) => {
            let aValue = a.skew;
            aValue = normalizeNumber(aValue);
            let bValue = b.skew;
            bValue = normalizeNumber(bValue);
            return aValue - bValue;
        }
    };

    export function getDuration(queryInfo: QueryInfo, currentTime?: number): number | null {
        // Failed queries show N/A
        if (queryInfo.status === SQLStatus.Failed) {
            return null;
        }
        if (queryInfo.endTime != null) {
            return queryInfo.endTime - queryInfo.startTime;
        } else if (queryInfo.status === SQLStatus.Running) {
            currentTime = currentTime || Date.now();
            return currentTime - queryInfo.startTime
        } else {
            return null;
        }
    }

    export function normalizeNumber(num: number | null): number {
        if (num == null) {
            num = Number.MAX_VALUE;
        }
        return num;
    }

    export function formatDateTime(dateTime: Date|number): string {
        const dt = new Date(dateTime);
        return moment(dt.getTime()).format("HH:mm:ss MM/DD/YYYY");
    }

    export function formatNumber(number: Number): string {
        const strNA = 'N/A';
        if (number == null) {
            return strNA;
        }
        const n = Number(number);
        return Number.isNaN(n) ? strNA : n.toLocaleString();
    }

    export function genSkewStyle(skew: number): string {
        const color = TableSkew.getSkewColorStyle(skew);
        return color.length > 0 ? `color:${color};` : '';
    }

    export interface CardOptions {
        isShowAll?: boolean,
        $container: JQuery,
        checkContainerVisible?: () => boolean // Set to null, if dont need auto-refresh
    }
}