namespace Undo {
    let undoFuncs = {};

    // isMostRecent - boolean, true if it's the most recent operation performed
    export function run(xcLog: XcLog, isMostRecent?: boolean): XDPromise<void> {
        xcAssert((xcLog != null), "invalid log");

        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        let options: any = xcLog.getOptions();
        let operation: string = xcLog.getOperation();

        if (undoFuncs.hasOwnProperty(operation)) {
            let minModeCache: boolean = gMinModeOn;
            // do not use any animation
            gMinModeOn = true;
            undoFuncs[operation](options, isMostRecent)
            .then(deferred.resolve)
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("undo failed");
            })
            .always(function() {
                gMinModeOn = minModeCache;
            });
        } else {
            console.warn("Unknown operation cannot undo", operation);
            deferred.reject("Unknown operation");
        }

        return (deferred.promise());
    };

    /* START BACKEND OPERATIONS */
    undoFuncs[SQLOps.Sort] = function(options): XDPromise<XcViewer> {
        return TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName]);
    };
    /* END BACKEND OPERATIONS */

    /* Dataflow operations */
    undoFuncs[SQLOps.DisconnectOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.connectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex, options.dataflowId, false, options.wasSpliced, options.identifiers, options.setNodeConfig);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ConnectOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.disconnectNodes(options.parentNodeId, options.childNodeId, options.connectorIndex, options.dataflowId);
        if (options.prevParentNodeId) {
            DagViewManager.Instance.connectNodes(options.prevParentNodeId, options.childNodeId,
                                 options.connectorIndex, options.dataflowId);
        }
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.RemoveOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.addBackNodes(options.nodeIds, options.dataflowId, options.spliceInfo, options.identifiers);
    };

    undoFuncs[SQLOps.AddOperation] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.removeNodes([options.nodeId], options.dataflowId);
    };

    undoFuncs[SQLOps.PasteOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.removeNodes(options.nodeIds, options.dataflowId);
    };

    undoFuncs[SQLOps.MoveOperations] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        const nodeInfos = [];
        options.nodeInfos.forEach(function(nodeInfo) {
            nodeInfos.push({
                type: nodeInfo.type,
                position: nodeInfo.oldPosition,
                id: nodeInfo.id
            });
        })
        DagViewManager.Instance.moveNodes(options.dataflowId, nodeInfos);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.NewDagTab] = function(options): XDPromise<void> {
        DagTabManager.Instance.hideTab(options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.DupDagTab] = function(options): XDPromise<void> {
        DagTabManager.Instance.hideTab(options.dataflowId);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.EditDescription] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.editDescription(options.nodeId, options.oldDescription);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.EditNodeTitle] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagViewManager.Instance.editNodeTitle(options.nodeId, options.dataflowId, options.oldTitle);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.NewComment] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        return DagViewManager.Instance.removeNodes([options.commentId], options.dataflowId);
    };

    undoFuncs[SQLOps.EditComment] = function(options): XDPromise<void> {
        DagTabManager.Instance.switchTab(options.dataflowId);
        DagComment.Instance.updateText(options.commentId, options.dataflowId, options.oldComment);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.DagBulkOperation] = function(options): XDPromise<void> {
        const dagTab: DagTab = DagTabManager.Instance.getTabById(options.dataflowId);
        const dagGraph: DagGraph = dagTab.getGraph();
        if (dagGraph != null) {
            dagGraph.turnOnBulkStateSwitch();
        }
        try {
            dagTab.turnOffSave();
            let tasks: XDPromise<void> = PromiseHelper.resolve();
            if (options.actions != null) {
                for (let i = options.actions.length - 1; i >= 0; i --) {
                    const action: {operation: string} = options.actions[i];
                    const operation: string = action.operation;
                    if (operation == null || !undoFuncs.hasOwnProperty(operation)) {
                        console.error(`Undo function for ${operation} not supported`);
                        continue;
                    }
                    const undoFunc: Function = undoFuncs[operation];
                    tasks = tasks.then(() => undoFunc(action));
                }
            }
            tasks = tasks.then(() => {
                dagTab.turnOnSave();
                return dagTab.save();
            })
            .then(() => {
                if (dagGraph != null) {
                    dagGraph.turnOffBulkStateSwitch();
                }
            })
            .fail((err) => {
                if (dagGraph != null) {
                    dagGraph.turnOffBulkStateSwitch();
                }
                dagTab.turnOnSave();
                return PromiseHelper.reject(err);
            });
            return tasks;
        } catch (e) {
            console.error(e);
            dagTab.turnOnSave();
            return PromiseHelper.reject(e);
        }
    }
    /* USER STYLING/FORMATING OPERATIONS */

    undoFuncs[SQLOps.MinimizeCols] = function(options): XDPromise<void> {
        return ColManager.maximizeCols(options.colNums, options.tableId);
    };

    undoFuncs[SQLOps.MaximizeCols] = function(options): XDPromise<void> {
        return ColManager.minimizeCols(options.colNums, options.tableId);
    };

    undoFuncs[SQLOps.HideCol] = function(options): XDPromise<void> {
        undoDeleteColHelper(options);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.PullCol] = function(options): XDPromise<void> {
        let colNum = options.colNum;
        if (options.direction === ColDir.Right) {
            colNum++;
        }
        return (ColManager.hideCol([colNum], options.tableId));
    };

    undoFuncs[SQLOps.PullMultipleCols] = function(options): XDPromise<void> {
        return (ColManager.hideCol(options.colNums, options.tableId,
                                 {"noAnimate": true}));
    };

    undoFuncs[SQLOps.ReorderCol] = function(options): XDPromise<void> {
        ColManager.reorderCol(options.tableId, options.newColNum,
                              options.oldColNum, {"undoRedo": true});
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.SortTableCols] = function(options): XDPromise<void> {
        TblManager.orderAllColumns(options.tableId, options.originalOrder);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ResizeTableCols] = function(options): XDPromise<void> {
        TblManager.resizeColsToWidth(options.tableId, options.columnNums,
                                     options.oldColumnWidths,
                                     options.oldSizedTo, options.wasHidden);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.DragResizeTableCol] = function(options): XDPromise<void> {
        TblAnim.resizeColumn(options.tableId, options.colNum, options.toWidth,
                             options.fromWidth, options.oldSizedTo);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.DragResizeRow] = function(options): XDPromise<void> {
        TblAnim.resizeRow(options.rowNum, options.tableId, options.toHeight,
                          options.fromHeight);
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.RenameCol] = function(options): XDPromise<void>  {
        ColManager.renameCol(options.colNum, options.tableId, options.colName, {
            "keepEditable": options.wasNew,
            "prevWidth": options.prevWidth
        });
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.TextAlign] = function(options): XDPromise<void>  {
        let numCols: number = options.colNums.length;
        let alignment: string;
        for (let i = 0; i < numCols; i++) {
            alignment = options.prevAlignments[i];
            if (alignment === "Left") {
                alignment = "leftAlign";
            } else if (alignment === "Right"){
                alignment = "rightAlign";
            } else if (alignment === "Center") {
                alignment = "centerAlign";
            } else {
                alignment = "wrapAlign";
            }
            ColManager.textAlign([options.colNums[i]], options.tableId,
                                 alignment);
        }
        return PromiseHelper.resolve(null);
    };

    undoFuncs[SQLOps.ChangeFormat] = function(options): XDPromise<void>  {
        ColManager.format(options.colNums, options.tableId, options.oldFormats);
        return PromiseHelper.resolve(null);
    };
    /* END USER STYLING/FORMATING OPERATIONS */

    // for undoing deleted table columns
    function undoDeleteColHelper(options: {progCols: ProgCol[], tableId: TableId, colNums: number[], columnDeltas: any}): void {
        let progCols: ProgCol[] = options.progCols;
        let tableId: TableId = options.tableId;
        let table: TableMeta = gTables[tableId];
        let currProgCols: ProgCol[] = table.tableCols;
        let colNums: number[] = options.colNums;
        let $table: JQuery = $('#xcTable-' + tableId);
        let dataIndex: number = ColManager.parseColNum($table.find('th.dataCol'));
        let newProgCol: ProgCol;
        const colNames: string[] = [];
        const shift: number = -1;

        for (let i = 0, len = progCols.length; i < len; i++) {
            newProgCol = ColManager.newCol(progCols[i]);
            currProgCols.splice(colNums[i] + shift, 0, newProgCol);
            colNames.push(newProgCol.getBackColName());
        }

        let jsonData: string[] = [];
        $table.find('tbody').find('.col' + dataIndex).each(function() {
            jsonData.push($(this).find('.originalData').text());
        });

        let tableHtml: HTML = TblManager.generateTheadTbody(tableId);
        let rowNum: number = RowManager.parseRowNum($table.find('tbody').find('tr:eq(0)'));

        $table.html(tableHtml);

        TblManager.pullRowsBulk(table, jsonData, rowNum, RowDirection.Bottom);
        TblManager.addColListeners($table, tableId);
        TblManager.updateHeaderAndListInfo(tableId);
        TblFunc.moveFirstColumn();

        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            let columnDeltas = xcHelper.deepCopy(options.columnDeltas)
            node.columnChange(DagColumnChangeType.Pull, colNames, columnDeltas);
        }
    }
}

