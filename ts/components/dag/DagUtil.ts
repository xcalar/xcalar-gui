// this class should be a lower level util class
// and should have no any dependency
class DagUtil {
    private static _deleteDelay: number = 100;
    private static _tablesPendingDelete: string[] = [];

    public static isInView($el: JQuery, $container: JQuery): boolean {
        return this._isInView($el, $container, false);
    }

    public static scrollIntoView($el: JQuery, $container: JQuery): boolean {
        return this._isInView($el, $container, true);
    }

    public static focusOnNode(tabId: string, nodeId: string): void {
        try {
            const activeTab = DagViewManager.Instance.getActiveTab();
            if (activeTab && activeTab.getId() !== tabId) {
                DagTabManager.Instance.switchTab(tabId);
            }
            const $node: JQuery = DagViewManager.Instance.getNode(nodeId);
            const $container: JQuery = DagViewManager.Instance.getAreaByTab(tabId);
            DagUtil.scrollIntoView($node, $container)
            DagViewManager.Instance.deselectNodes();
            DagViewManager.Instance.selectNodes(tabId, [nodeId]);
        } catch (e) {
            console.error(e);
            throw new Error('Cannot find the operator');
        }
    }

    /**
     * DagUtil.showPinWarning
     * @param lockedTable
     */
    public static showPinWarning(pinnedTable: string): void {
        Alert.error(DFTStr.LockedTableWarning, DFTStr.LockedTableMsg, {
            detail: `Pinned Table: ${pinnedTable}`,
            sizeToText: true
        });
    }

    /**
     * DagUtil.deleteTable
     * @param tableName
     */
    public static deleteTable(tableName: string): XDPromise<any> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let generalTableName = tableName;
        let allTables = DagTblManager.Instance.deleteTable(generalTableName, true);
        allTables.push(tableName);
        let hasPendingDelete = this._tablesPendingDelete.length > 0;
        this._tablesPendingDelete = this._tablesPendingDelete.concat(allTables);
        if (hasPendingDelete) {
            return PromiseHelper.resolve();
        } else {
            setTimeout(() => {
                let tables = this._tablesPendingDelete;
                this._tablesPendingDelete = [];

                this._deleteTableHelper(tables)
                .then(deferred.resolve)
                .fail(deferred.reject);
            }, this._deleteDelay);
        }
        return deferred.promise();
    }

    private static _deleteTableHelper(tables: string[]): XDPromise<void> {
        tables = [...new Set(tables)]; // remove duplicate tables
        if (!tables.length) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // Delete the node's table now
        var sql = {
            "operation": SQLOps.DeleteTable,
            "tables": tables,
            "tableType": TableType.Unknown
        };
        var txId = Transaction.start({
            "operation": SQLOps.DeleteTable,
            "sql": sql,
            "steps": tables.length,
            "track": true
        });

        let deleteQuery = tables.map((name: string) => {
            return {
                operation: "XcalarApiDeleteObjects",
                args: {
                    namePattern: name,
                    srcType: "Table"
                }
            }
        });

        XIApi.deleteTables(txId, deleteQuery, null)
        .then(() => {
            Transaction.done(txId, {noLog: true});
            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "failMsg": "Deleting Tables Failed",
                "error": error,
                "noAlert": true,
                "title": "DagView"
            });
            deferred.reject(error);
        });
        return deferred.promise();
    }

    // XXX TODO: combine with the scrollMatchIntoView function in DagTabSearchBar
    private static _isInView(
        $match: JQuery,
        $container: JQuery,
        toScroll: boolean
    ): boolean {
        try {
            const offset = $match.offset();
            const matchOffsetLeft: number = offset.left;
            const bound: ClientRect = $container[0].getBoundingClientRect();
            const leftBoundaray: number = bound.left;
            const rightBoundary: number = bound.right;
            const matchWidth: number = $match.width();
            const matchDiff: number = matchOffsetLeft - (rightBoundary - matchWidth);

            let isInView: boolean = true;
            if (matchDiff > 0 || matchOffsetLeft < leftBoundaray) {
                if (toScroll) {
                    const scrollLeft: number = $container.scrollLeft();
                    const viewWidth: number = $container.width();
                    $container.scrollLeft(scrollLeft + matchDiff +
                                            ((viewWidth - matchWidth) / 2));
                }
                isInView = false;
            }

            const matchOffSetTop: number = offset.top;
            const topBoundary: number = bound.top;
            const bottomBoundary: number = bound.bottom;
            const matchHeight: number = $match.height();
            const matchHeightDiff: number = matchOffSetTop - (bottomBoundary - matchHeight);
            if (matchHeightDiff > 0 || matchOffSetTop < topBoundary) {
                if (toScroll) {
                    const scrollTop: number = $container.scrollTop();
                    const viewHeight: number = $container.height();
                    $container.scrollTop(scrollTop + matchHeightDiff +
                                            ((viewHeight - matchHeight) / 2));
                }
                isInView = false;
            }
            return isInView;
        } catch (e) {
            return false;
        }
    }

}