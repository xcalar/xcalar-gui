namespace Redo {
    var redoFuncs = {};

    export function run(xcLog: XcLog): XDPromise<void> {
        xcAssert((xcLog != null), "invalid log");

        var deferred: XDDeferred<void> = PromiseHelper.deferred();

        var options: any = xcLog.getOptions();
        var operation: string = xcLog.getOperation();

        if (redoFuncs.hasOwnProperty(operation)) {
            var minModeCache: boolean = gMinModeOn;
            // do not use any animation
            gMinModeOn = true;

            redoFuncs[operation](options)
            .then(function(){
                deferred.resolve();
            })
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("redo failed");
            })
            .always(function() {
                gMinModeOn = minModeCache;
            });
        } else {
            console.warn("Unknown operation cannot redo", operation);
            deferred.reject("Unknown operation");

        }

        return (deferred.promise());
    };

    /* START BACKEND OPERATIONS */
    redoFuncs[SQLOps.Sort] = function(options): XDPromise<XcViewer> {
        return TblManager.refreshTable([options.newTableName], null, [options.tableName]);
    };
    /* END BACKEND OPERATIONS */

    /* Dag operations */

    redoFuncs[SQLOps.DisconnectOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex, options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ConnectOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        var isReconnect: boolean = options.prevParentNodeId != null;
        DagViewManager.Instance.connectNodes(options.parentNodeId, options.childNodeId,
                            options.connectorIndex, options.dataflowId, isReconnect, options.spliceIn);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RemoveOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.removeNodes(options.nodeIds, options.dataflowId);
    };

    redoFuncs[SQLOps.AddOperation] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.addBackNodes([options.nodeId], options.dataflowId);
    };

    redoFuncs[SQLOps.PasteOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.addBackNodes(options.nodeIds, options.dataflowId);
    };

    redoFuncs[SQLOps.MoveOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.moveNodes(options.dataflowId, options.nodeInfos);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.NewDagTab] = function(options): XDPromise<void> {
        DagTabManager.Instance.unhideTab(options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DupDagTab] = function(options): XDPromise<void> {
        DagTabManager.Instance.unhideTab(options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditDescription] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.editDescription(options.nodeId, options.newDescription);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.EditNodeTitle] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.editNodeTitle(options.nodeId, options.dataflowId, options.newTitle);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.NewComment] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.addBackNodes([options.commentId], options.dataflowId);
    };

    redoFuncs[SQLOps.EditComment] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagComment.Instance.updateText(options.commentId, options.dataflowId, options.newComment);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DagBulkOperation] = function(options): XDPromise<void> {
        const dagTab: DagTab = DagTabManager.Instance.getTabById(options.dataflowId);
        dagTab.turnOffSave();
        let tasks: XDPromise<void> = PromiseHelper.resolve();
        if (options.actions != null) {
            for (const action of options.actions) {
                const operation: string = action.operation;
                if (operation == null || !redoFuncs.hasOwnProperty(operation)) {
                    console.error(`Redo function for ${operation} not supported`);
                    continue;
                }
                const redoFunc: Function = redoFuncs[operation];
                tasks = tasks.then(() => redoFunc(action));
            }
        }
        tasks = tasks.then(() => {
            dagTab.turnOnSave();
            return dagTab.save();
        })
        .fail((err) => {
            dagTab.turnOnSave();
            return PromiseHelper.reject(err);
        });
        return tasks;
    }

    /* USER STYLING/FORMATING OPERATIONS */

    redoFuncs[SQLOps.MinimizeCols] = function(options): XDPromise<void> {
        return ColManager.minimizeCols(options.colNums, options.tableId);
    };

    redoFuncs[SQLOps.MaximizeCols] = function(options): XDPromise<void> {
        return ColManager.maximizeCols(options.colNums, options.tableId);
    };

    redoFuncs[SQLOps.HideCol] = function(options): XDPromise<void> {
        return (ColManager.hideCol(options.colNums, options.tableId));
    };

    redoFuncs[SQLOps.PullCol] = function(options): XDPromise<number> {
        return ColManager.pullCol(options.colNum, options.tableId,
                                        options.pullColOptions);
    };

    redoFuncs[SQLOps.PullMultipleCols] = function(options): XDPromise<void> {
        ColManager.unnest(options.tableId, options.colNum, options.rowNum,
                          options.colNames);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ReorderCol] = function(options): XDPromise<void> {
        ColManager.reorderCol(options.tableId, options.oldColNum,
                              options.newColNum, {"undoRedo": true});
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.SortTableCols] = function(options): XDPromise<void> {
        TblManager.sortColumns(options.tableId, options.sortKey, options.direction);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ResizeTableCols] = function(options): XDPromise<void> {
        var sizeTo: string[] = [];
        for (var i = 0; i < options.newColumnWidths.length; i++) {
            sizeTo.push(options.sizeTo);
        }
        TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                     options.newColumnWidths, sizeTo);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DragResizeTableCol] = function(options): XDPromise<void> {
        TblAnim.resizeColumn(options.tableId, options.colNum, options.fromWidth,
                             options.toWidth, options.sizedTo);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.DragResizeRow] = function(options): XDPromise<void> {
        TblAnim.resizeRow(options.rowNum, options.tableId, options.fromHeight,
                          options.toHeight);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.RenameCol] = function(options): XDPromise<void> {
        ColManager.renameCol(options.colNum, options.tableId, options.newName);
        var $th: JQuery = $('#xcTable-' + options.tableId)
                    .find('th.col' + options.colNum);
        TblManager.highlightColumn($th);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.TextAlign] = function(options): XDPromise<void> {
        ColManager.textAlign(options.colNums, options.tableId,
                             options.cachedAlignment);
        return PromiseHelper.resolve(null);
    };

    redoFuncs[SQLOps.ChangeFormat] = function(options): XDPromise<void> {
        ColManager.format(options.colNums, options.tableId, options.formats);
        return PromiseHelper.resolve(null);
    };

    /* END USER STYLING/FORMATING OPERATIONS */
}
