namespace SqlQueryHistoryPanel {
    import QueryUpdateInfo = SqlQueryHistory.QueryUpdateInfo;
    import QueryExtInfo = SqlQueryHistory.QueryExtInfo;
    /**
     * Import symbols defined in other files from the same namespace
     * This is a hack fix for our grunt watch approach!!!
     * See BaseCard.ts for detailed reason.
     */
    import BaseCard = SqlQueryHistoryPanel.BaseCard;
    import CardOptions = SqlQueryHistoryPanel.CardOptions;
    import TableColumnCategory = SqlQueryHistoryPanel.TableColumnCategory;
    import TableDefinition = SqlQueryHistoryPanel.TableDefinition;
    import TableHeaderColumnType = SqlQueryHistoryPanel.TableHeaderColumnType;
    import TableBodyColumnTextProp = SqlQueryHistoryPanel.TableBodyColumnTextProp;
    import sortFunctions = SqlQueryHistoryPanel.sortFunctions;

    export class ExtCard extends BaseCard {
        protected _selectedQueryIds = new Set<string>();

        public setup(options: CardOptions = <CardOptions>{} ) {
            super.setup(options);

            // Delete
            const $deleteicon = this._$cardContainer.find(".selDeleteQueryHist");
            $deleteicon.on("click", () => {
                Alert.show({
                    title: SQLTStr.DeleteHistory,
                    msg: SQLTStr.DeleteHistoryMsg,
                    onConfirm: () => {
                        this._deleteHistory(this._selectedQueryIds);
                        this._updateTableUI(this.queryMap, false);
                    }
                });
            });
        }

        /**
         * @override
         * @param refresh
         */
        public show(
            refresh: boolean
        ): XDPromise<any> {
            // Disable header buttons when loading
            if (!this.getCardContainer()) {
                return; // not set up yet
            }
            this.getCardContainer().addClass('loading');
            // Show loading animation
            // The animation element will be replaced/deleted by table content,
            // so we don't need to/should not explicitly remove it.
            xcUIHelper.showRefreshIcon(this.getTableContainer(), true, null);

            // Load data
            return super.show(refresh)
            .then(() => {
                this._updateActions();
            })
            .always(() => {
                // Enable header buttons
                this.getCardContainer().removeClass('loading');
            });
        }

        /**
         * Update/Add a query with partial data
         * @param updateInfo query update information
         */
        public update(updateInfo: QueryUpdateInfo): XDPromise<void> {
            return SqlQueryHistory.getInstance().upsertQuery(updateInfo)
                .then( () => {
                    this._updateTableUI(this.queryMap, false);
                });
        }

        /**
         * Get a set of query IDs selected in the table
         */
        public getSelectedQueryIds(): Set<string> {
            return new Set(this._selectedQueryIds);
        }

        protected getTitle(): string {
            return SQLTStr.queryHistExtCardTitle;
        }
        protected getColumnsToShow(): TableColumnCategory[] {
            return [
                TableColumnCategory.SELECT,
                TableColumnCategory.STATUS,
                TableColumnCategory.QUERY,
                TableColumnCategory.TABLE,
                TableColumnCategory.STARTTIME,
                TableColumnCategory.DURATION,
                TableColumnCategory.ROWS,
                TableColumnCategory.SKEW,
            ];
        }

        protected getTableDefinition(): TableDefinition<QueryExtInfo> {
            const tableDef = <TableDefinition<QueryExtInfo>>super.getTableDefinition();

            tableDef.getKeyFunction = (data: QueryExtInfo) => data.queryId;
            tableDef.onSelectChange = (queryIdSet: Set<string>) => {
                this._selectedQueryIds = queryIdSet;
                this._updateActions();
            }

            tableDef.columns[TableColumnCategory.ROWS] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortRows,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.ROWS,
                        isEllipsis: false,
                        text: `${formatNumber(queryInfo.rows)}`
                    };
                    return prop;
                }
            };

            tableDef.columns[TableColumnCategory.SKEW] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortSkew,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.SKEW,
                        isEllipsis: false,
                        text: `${formatNumber(queryInfo.skew)}`,
                        style: genSkewStyle(queryInfo.skew)
                    };
                    return prop;
                }
            };

            tableDef.columns[TableColumnCategory.SELECT] = {
                type: TableHeaderColumnType.SELECTABLE,
            };

            return tableDef;
        }

        protected _updateActions(): void {
            let $header = this._$cardContainer.find(".cardHeader");
            let $delete = $header.find(".delete");
            // let queryMap = this.queryMap;
            let selectedQueryIds = this._selectedQueryIds;
            $delete.addClass("xc-disabled");

            if (selectedQueryIds.size > 0) {
                $delete.removeClass("xc-disabled");
            }
        }

        protected _deleteHistory(queryIdSet: Set<string>): XDPromise<void> {
            let promises: XDPromise<void>[] = [];

            queryIdSet.forEach((queryId) => {
                let promise = SqlQueryHistory.getInstance().deleteQuery(queryId);
                promises.push(promise);
            });
            return PromiseHelper.when(...promises);
        }
    }
}