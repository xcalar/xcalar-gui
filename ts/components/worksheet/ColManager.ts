// this module support column related functions
namespace ColManager {
    // new ProgCol obj
    export function newCol(options): ProgCol {
        return new ProgCol(options);
    }
     /**
     * ColManager.parseColNum
     * @param $el
     */
    export function parseColNum($el: JQuery): number | null {
        const keyword: string = 'col';
        const classNames: string = $el.attr('class');
        if (classNames == null) {
            // this is in case we meet some error and cannot goon run the code!
            console.error('Unexpected element to parse column', $el);
            return null;
        }

        const index: number = classNames.indexOf(keyword);
        const substring: string = classNames.substring(index + keyword.length);
        const colNum: number = parseInt(substring);

        if (isNaN(colNum)) {
            console.error('Unexpected element to parse column', $el);
            return null;
        }

        return colNum;
    }

    export function newPullCol (
        colName: string,
        backColName: string,
        type?: ColumnType,
        defaultWidth?: boolean
    ): ProgCol {
        if (backColName == null) {
            backColName = colName;
        }

        let prefix = xcHelper.parsePrefixColName(backColName).prefix;
        let width = null; // not set width by default as it's a slow operation
        if (defaultWidth) {
            width = xcHelper.getDefaultColWidth(colName, prefix);
        }

        return ColManager.newCol({
            "backName": backColName,
            "name": colName,
            "type": type || null,
            "width": width,
            "isNewCol": false,
            "userStr": '"' + colName + '" = pull(' + backColName + ')',
            "func": {
                "name": "pull",
                "args": [backColName]
            },
            "sizedTo": "header"
        });
    };

    // special case, specifically for DATA col
    export function newDATACol(): ProgCol {
        return ColManager.newCol({
            "backName": "DATA",
            "name": "DATA",
            "type": ColumnType.object,
            "width": "auto",// to be determined when building table
            "userStr": "DATA = raw()",
            "func": {
                "name": "raw",
                "args": []
            },
            "isNewCol": false,
            "isMinimized": UserSettings.Instance.getPref('hideDataCol')
        });
    };

    //options
    // noAnimate: boolean, if true, no animation is applied
    export function hideCol(colNums: number[], tableId: TableId, options?): XDPromise<void> {
        options = options || {};
        // deletes an array of columns
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let table = gTables[tableId];
        let $table = $('#xcTable-' + tableId);
        let colNames = [];
        const backNames = [];
        let promises = [];
        let progCols = [];
        const types: {type: string}[] = [];
        let noAnimate = options.noAnimate || false;
        if (colNums.length > 8) {
            noAnimate = true;
        }

        // check if only 1 column and is an empty column so we call this
        // a "delete" instead of a "hide"
        let opTitle = SQLTStr.HideCol;
        if (colNums.length === 1 && table.getCol(colNums[0]).isEmptyCol()) {
            opTitle = SQLTStr.DelCol;
        }

        for (let i = 0, len = colNums.length; i < len; i++) {
            let colNum = colNums[i];
            let colIndex = colNum - i;
            let progCol = ColManager.newCol(table.getCol(colIndex));
            table.setCol(progCol, colIndex); // replace column
            colNames.push(progCol.getFrontColName(true));
            backNames.push(progCol.getBackColName());
            progCols.push(progCol);
            types.push({type: progCol.getType()});
            promises.push(delColHelper(colNum, tableId, true, colIndex,
                                       noAnimate));
        }
        if (gMinModeOn || noAnimate) {
            // for tableScrollBar
            TblFunc.moveFirstColumn();
        }

        PromiseHelper.when.apply($, promises)
        .always(function() {
            let numCols = table.getNumCols();
            // adjust column numbers
            for (let j = colNums[0]; j <= numCols; j++) {
                let oldColNum = ColManager.parseColNum($table.find('th').eq(j));
                $table.find(".col" + oldColNum)
                      .removeClass('col' + oldColNum)
                      .addClass('col' + j);
            }

            TblManager.updateHeaderAndListInfo(tableId);
            xcUIHelper.removeSelectionRange();

            let node: DagNode = DagTable.Instance.getBindNode();
            let columnDeltas = [];
            if (node) {
                let deltas = node.getColumnDeltas();
                let ordering = node.getColumnOrdering();
                backNames.forEach(name => {
                    let delta = xcHelper.deepCopy(deltas.get(name));
                    let index: number = ordering.indexOf(name);
                    if (index > -1) {
                        if (!delta) {
                            delta = {};
                        }
                        delta.order = index;
                    }
                    columnDeltas.push(delta);
                });
                node.columnChange(DagColumnChangeType.Hide, backNames, types);
            }

            Log.add(opTitle, {
                "operation": SQLOps.HideCol,
                "tableName": table.getName(),
                "tableId": tableId,
                "colNames": colNames,
                "colNums": colNums,
                "progCols": progCols,
                "columnDeltas": columnDeltas,
                "htmlExclude": ["progCols", "columnDeltas"]
            });
            deferred.resolve();
        });

        return deferred.promise();
    };

    // specifically used for json modal
    export function pullCol(colNum: number, tableId: TableId, options): XDPromise<number> {
        const deferred: XDDeferred<number> = PromiseHelper.deferred();

        options = options || {};

        let backName = options.escapedName;
        let direction = options.direction;

        let table = gTables[tableId];
        let newColName = xcHelper.getUniqColName(tableId, options.fullName, true);

        let progCol = ColManager.newPullCol(newColName, backName, undefined, options.defaultWidth);

        table.updateSortColAlias(progCol);
        let usrStr = progCol.userStr;

        let newColNum = addColHelper(colNum, tableId, progCol, {
            "direction": direction,
            "select": true,
            "noAnimate": true
        });

        let sqlOptions = {
            "operation": SQLOps.PullCol,
            "tableName": table.getName(),
            "tableId": tableId,
            "newColName": newColName,
            "colNum": colNum,
            "direction": direction,
            "pullColOptions": options,
            "htmlExclude": ["pullColOptions"]
        };

        execCol("pull", usrStr, tableId, newColNum, {noLog: true})
        .then(function(res) {
            TblManager.updateHeaderAndListInfo(tableId);
            FormHelper.updateColumns(tableId);
            Log.add(SQLTStr.PullCol, sqlOptions);
            let node: DagNode = DagTable.Instance.getBindNode();
            if (node) {
                let info = null;
                if (res && res.updateType != null) {
                    info = [{"type": res.updateType}];
                }
                node.columnChange(DagColumnChangeType.Pull, [backName], info);
            }
            deferred.resolve(newColNum);
        })
        .fail(function(error) {
            Log.errorLog("Pull Column", sqlOptions, null, error);
            // still resolve the newColNum
            deferred.resolve(newColNum);
        });

        return deferred.promise();
    };

    export function sortColumn(colNums: number[], tableId: TableId, order: number, tabId: string): XDPromise<any> {
        let colInfo: xcFunction.XcFuncSortColInfo[] = [];
        for (let i = 0; i < colNums.length; i++) {
            colInfo.push({
                colNum: colNums[i],
                ordering: order,
                typeToCast: null
            });
        }
        const isSqlTable: boolean = !$("#sqlTableArea").hasClass("dagTableMode");
        let colNum = colNums[0];
        let table = gTables[tableId];

        if (colNums.length > 1) {
            // return xcFunction.sort(tableId, colInfo, {isSqlTable: isSqlTable});
            return _createSortAndExecute(colInfo, table, tabId);
        }

        let progCol = table.getCol(colNum);
        let keys = table.backTableMeta.keyAttr;
        let keyNames = table.getKeyName();
        let sortedColAlias = progCol.getSortedColAlias();
        let keyIndex = keyNames.indexOf(sortedColAlias);
        if (keyIndex === -1 ||
            order !== XcalarOrderingTFromStr[keys[keyIndex].ordering]) {
            for (let i = 0; i < keys.length; i++) {
                // do not readd current column and
                // do not include columns that are not sroted ascending or
                // descending
                if ((keys[i].name === sortedColAlias) ||
                    keys[i].name === "xcalarRecordNum" ||
                    (keys[i].ordering !==
                        XcalarOrderingTStr[XcalarOrderingTFromStr.Ascending] &&
                    keys[i].ordering !==
                        XcalarOrderingTStr[XcalarOrderingTFromStr.Descending])) {
                    continue;
                }
                colInfo.push({
                    name: keys[i].name,
                    ordering: XcalarOrderingTFromStr[keys[i].ordering],
                    typeToCast: null
                });
            }
        }

        let type = progCol.getType();

        if (type !== "string") {
            // return xcFunction.sort(tableId, colInfo, {isSqlTable: isSqlTable});
            return _createSortAndExecute(colInfo, table, tabId);
        }

        let $tds = $("#xcTable-" + tableId).find("tbody td.col" + colNum);
        let datas = [];
        let val;

        $tds.each(function() {
            val = $(this).find('.originalData').text();
            datas.push(val);
        });

        // let suggType = xcSuggest.suggestType(datas, type, 0.9);
        // if (suggType === "integer" || suggType === "float") {
        //      const deferred: XDDeferred<any> = PromiseHelper.deferred();
        //     let instr = xcStringHelper.replaceMsg(IndexTStr.SuggInstr, {
        //         "type": suggType
        //     });

        //     Alert.show({
        //         "title": IndexTStr.SuggTitle,
        //         "instr": instr,
        //         "msg": IndexTStr.SuggMsg,
        //         "onCancel": deferred.reject,
        //         "buttons": [{
        //             "name": IndexTStr.NoCast,
        //             "func": function() {
        //                 xcFunction.sort(tableId, colInfo, {isSqlTable: isSqlTable})
        //                 .then(deferred.resolve)
        //                 .fail(deferred.reject);
        //             }
        //         },
        //         {
        //             "name": IndexTStr.CastToNum,
        //             "func": function() {
        //                 colInfo[0].typeToCast = suggType;
        //                 xcFunction.sort(tableId, colInfo, {isSqlTable: isSqlTable})
        //                 .then(deferred.resolve)
        //                 .fail(deferred.reject);
        //             }
        //         }
        //         ]
        //     });
        //     return deferred.promise();
        // } else {
            // return xcFunction.sort(tableId, colInfo, {isSqlTable: isSqlTable});
            return _createSortAndExecute(colInfo, table, tabId);
        // }
    };

    function _createSortAndExecute(
        colInfo: xcFunction.XcFuncSortColInfo[],
        table: TableMeta,
        tabId: string
    ): Promise<any> {
        const isSqlTable: boolean = !$("#sqlTableArea").hasClass("dagTableMode");
        if (isSqlTable) {
            _createFromSQLTable(table, callback);
        } else {
            callback.bind(this)(tabId);
        }
        async function callback(_allNodes?: DagNode[], parentNodeId?: string, newTabId? ) {
            try {

                const type: DagNodeType = DagNodeType.Sort;
                const input: DagNodeSortInputStruct = {
                    columns: colInfo.map((col)=> {
                        let name;
                        if (col.name) {
                            name = col.name;
                        } else {
                            name = table.getCol(col.colNum).getBackColName();
                        }
                        return {
                            "columnName": name,
                            "ordering": XcalarOrderingTStr[col.ordering]
                        };
                    }),
                    newKeys: []
                };

                tabId = newTabId || tabId;

                DagTabManager.Instance.switchTab(tabId);
                parentNodeId = parentNodeId || DagTable.Instance.getBindNodeId();
                let parentNode = DagViewManager.Instance.getActiveDag().getNode(parentNodeId);
                let node: DagNodeSort;
                if (parentNode && parentNode instanceof DagNodeSort && parentNode.getParents()[0]) {
                    node = parentNode;
                    parentNode = node.getParents()[0];
                    node.setParam(input, true);
                } else {
                    node = <DagNodeSort>await DagViewManager.Instance.autoAddNode(type,
                    null, parentNodeId, input, {
                        configured: true,
                        forceAdd: true
                    });
                }

                if (node != null) {
                    await DagViewManager.Instance.run([node.getId()], false, false, true)
                    await DagViewManager.Instance.viewResult(node);
                }
            } catch (e) {
                console.error("error", e);
                Alert.error(ErrTStr.Error, ErrTStr.Unknown);
            }
        }
    }

    async function _createFromSQLTable(table, callback) {
        /*
            check if sql statement exists, if so then we create a dataflow, and copy
            and paste the nodes from this dataflow into the active dataflow in
            the dataflow panel, then we attach a node from whatever operation
            is triggered by the column menu. The callback function then configures
            that node and opens the operation panel or executes
            If sql statement doesn't exist, we just create a published table node
            from the table
        */
        try {
            let tableName: string;
            let sqlString: string;
            if (table) {
                tableName = table.getName();
                sqlString = SqlQueryHistory.getInstance().getSQLFromTableName(tableName);
            }

            if (sqlString) {
                this._restoreDataflow(sqlString)
                .then((newNodes) => {
                    let tabId = null;
                    if (DagTabManager.Instance.getNumTabs() === 0) {
                        tabId = DagTabManager.Instance.newTab();
                    }

                    let parentNodeId;
                    newNodes.forEach((node) => {
                        if (node.getChildren().length === 0) {
                            parentNodeId = node.getId();
                        }
                    });
                    callback.bind(this)(newNodes, parentNodeId, tabId);
                })
                .fail((e) => {
                    console.error("error", e);
                    Alert.error(ErrTStr.Error, ErrTStr.Unknown);
                });
            } else {
                // sql string may not exist so we just create a published
                // table node as the start point
                const tabId = DagTabManager.Instance.newTab();

                const input = {
                    "source": xcHelper.getTableName(tableName),
                    "schema": table.getAllCols(true).map((progCol) => {
                                    return {
                                        name: progCol.getBackColName(),
                                        type: progCol.getType()
                                    }
                            })
                };

                let parentNode = await DagViewManager.Instance.autoAddNode(DagNodeType.IMDTable,
                    null, null, input, {
                        configured: true,
                        forceAdd: true
                });
                if (parentNode) {
                    parentNode.setParam(input, true);
                    callback.bind(this)([parentNode], parentNode.getId(), tabId);
                } else {
                    Alert.error(ErrTStr.Error, "Module not found");
                }
            }
        }  catch (e) {
            console.error("error", e);
            Alert.error(ErrTStr.Error, ErrTStr.Unknown);
        }
    }

    // options
    // keepEditable: boolean, if true then we dont remove disabled and editable
    // class
    export function renameCol(
        colNum: number,
        tableId: TableId,
        newName: string,
        options?: any
    ): void {
        options = options || {};

        let table = gTables[tableId];
        let $table = $("#xcTable-" + tableId);
        let $th = $table.find('th.col' + colNum);
        let curCol  = table.getCol(colNum);
        let oldName = curCol.getFrontColName();
        let keepEditable = options.keepEditable || false;
        let prevWidth = curCol.width;

        curCol.name = newName;
        let wasEditable = $th.find('.flexWrap.editable').length;
        let $editableHead = $th.find('.editableHead');
        if (keepEditable) {
            // used when undoing a rename on a new column
            $th.find('.flexWrap.flex-mid').addClass('editable');
            $th.find('.header').addClass('editable');
            $editableHead.prop("disabled", false);
            let newWidth;
            if (options.prevWidth == null) {
                newWidth = ProgCol.NewCellWidth;
            } else {
                newWidth = options.prevWidth;
            }
            $th.outerWidth(newWidth);
            curCol.setWidth(newWidth);
        } else {
            $th.find('.editable').removeClass('editable');
            $editableHead.prop("disabled", true);
        }

        $editableHead.val(newName).attr("value", newName);
        if (!keepEditable && (curCol.sizedTo === "header" ||
            curCol.sizedTo === "all")) {
            TblFunc.autosizeCol($th, {
                "dblClick": true,
                "minWidth": 17,
                "includeHeader": true
            });
        }

        Log.add(SQLTStr.RenameCol, {
            "operation": SQLOps.RenameCol,
            "tableName": table.tableName,
            "tableId": tableId,
            "colName": oldName,
            "colNum": colNum,
            "newName": newName,
            "wasNew": wasEditable,
            "prevWidth": prevWidth,
            "htmlExclude": ["wasNew", "prevWidth"]
        });

        KVStore.commit();
    };

    export function format(colNums: number[], tableId: TableId, formats: string[]): void {
        // pass in array of format is for undo to bring back origin formats
        let table = gTables[tableId];
        let oldFormats = [];
        let colNames = [];
        let filteredColNums = [];
        let filteredFormats = [];

        colNums.forEach(function(colNum, i) {
            let progCol = table.getCol(colNum);
            let format = formats[i];
            let colFormat = progCol.getFormat();
            if (format === colFormat) {
                return;
            }

            filteredColNums.push(colNum);
            filteredFormats.push(format);
            oldFormats.push(colFormat);
            colNames.push(progCol.getFrontColName(true));

            progCol.setFormat(format);
            updateColumnFormat(tableId, colNum);
        });

        if (!filteredColNums.length) {
            return;
        }

        Log.add(SQLTStr.ChangeFormat, {
            "operation": SQLOps.ChangeFormat,
            "tableName": table.getName(),
            "tableId": tableId,
            "colNames": colNames,
            "colNums": filteredColNums,
            "formats": filteredFormats,
            "oldFormats": oldFormats,
            "htmlExclude": ["oldFormats"]
        });
    };

    // currently only being used by drag and drop (and undo/redo)
    // options {
    //      undoRedo: boolean, if true change html of columns
    // }
    export function reorderCol(
        tableId: TableId,
        oldColNum: number,
        newColNum: number,
        options
    ): void {
        let $table = $("#xcTable-" + tableId);
        let table = gTables[tableId];
        let colName = table.getCol(oldColNum).getFrontColName(true);

        let progCol = table.removeCol(oldColNum);
        table.addCol(newColNum, progCol);

        $table.find('.col' + oldColNum)
                 .removeClass('col' + oldColNum)
                 .addClass('colNumToChange');

        if (oldColNum > newColNum) {
            for (let i = oldColNum; i >= newColNum; i--) {
                $table.find('.col' + i)
                       .removeClass('col' + i)
                       .addClass('col' + (i + 1));
            }
        } else {
            for (let i = oldColNum; i <= newColNum; i++) {
                $table.find('.col' + i)
                       .removeClass('col' + i)
                       .addClass('col' + (i - 1));
            }
        }

        $table.find('.colNumToChange')
            .addClass('col' + newColNum)
            .removeClass('colNumToChange');

        if (options && options.undoRedo) {
            let target = newColNum;
            if (newColNum < oldColNum) {
                target = newColNum - 1;
            }

            $table.find('th').eq(target)
                             .after($table.find('th.col' + newColNum));

            $table.find('tbody tr').each(function() {
                $(this).find('td').eq(target)
                                  .after($(this).find('td.col' + newColNum));
            });
        }
        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            let colNames = table.getAllCols().map(col => col.getBackColName());
            node.columnChange(DagColumnChangeType.Reorder, colNames);
        }

        Log.add(SQLTStr.ReorderCol, {
            "operation": SQLOps.ReorderCol,
            "tableName": table.tableName,
            "tableId": tableId,
            "colName": colName,
            "oldColNum": oldColNum,
            "newColNum": newColNum
        });
    };
    // args:
    // noLog: boolean, if true, no sql will be logged
    export function execCol(operation: string, usrStr: string, tableId: TableId, colNum: number, args?: {
        value?: string,
        searchBar?: SearchBar,
        initialTableId?: TableId,
        undo?: boolean,
        backName?: string,
        noLog?: boolean
    }): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let table = gTables[tableId];

        switch (operation) {
            case ("pull"):
                let origCol = table.tableCols[colNum - 1];
                let origType = origCol.type;
                let origFunc = xcHelper.deepCopy(origCol.func);
                let origUsrStr = origCol.userStr;
                let backName = origCol.backName;
                let frontName = origCol.name;
                let wasNewCol = origCol.isNewCol;
                let progCol = ColManager.newCol({
                    "name": frontName,
                    "width": origCol.width,
                    "userStr": usrStr,
                    "isNewCol": false,
                    "sizedTo": origCol.sizedTo,
                    "type": origCol.type
                });
                progCol.parseFunc();
                if ((!args || !args.undo) && !parsePullColArgs(progCol) ) {
                    console.error("Arg parsing failed");
                    deferred.reject("Arg parsing failed");
                    break;
                }

                if (args && args.undo) {
                    progCol.setBackColName(args.backName);
                } else {
                    progCol.setBackColName(progCol.func.args[0]);
                }

                table.updateSortColAlias(progCol);

                table.tableCols[colNum - 1] = progCol;
                pullColHelper(colNum, tableId);

                if (!args || !args.noLog) {
                    let sqlOptions = {
                        "operation": SQLOps.PullCol,
                        "tableName": table.tableName,
                        "tableId": tableId,
                        "colName": frontName,
                        "colNum": colNum,
                        "usrStr": usrStr,
                        "origUsrStr": origUsrStr,
                        "wasNewCol": wasNewCol,
                        "func": origFunc,
                        "type": origType,
                        "backName": backName,
                        "htmlExclude": ["pullColOptions", "usrStr",
                                        "origUsrStr", "wasNewCol", "func",
                                        "type", "backName"]
                    };
                    Log.add(SQLTStr.PullCol, sqlOptions);
                }
                let curType: ColumnType = progCol.getType();
                deferred.resolve({
                    updateType: curType
                });
                break;
            case ("raw"):
                deferred.resolve(null);
                break;
            case ("search"):
                searchColNames(args.value, args.searchBar, args.initialTableId);
                deferred.resolve();
                break;
            default:
                console.warn("No such function yet!");
                deferred.resolve();
                break;
        }

        return deferred.promise();
    };

    // returns true if error found
    // options:
    // strictDuplicates: if true, prefix:col1 and col1 (derived) will be flagged
    // as a duplicate
    // stripColPrefix: if true, will strip $ from colname,
    // ignoreNewCol: if true, will not error if matches a new empty column
    export function checkColName(
        $colInput: JQuery,
        tableId: TableId,
        colNum: number,
        options
    ): boolean {
        let columnName = $colInput.val().trim();
        let error;
        let table: TableMeta = gTables[tableId];
        if (!table) {
            table = gDroppedTables[tableId];
        }
        xcTooltip.hideAll();

        options = options || {};
        if (options.stripColPrefix) {
            if (columnName[0] === gColPrefix) {
                columnName = columnName.slice(1);
            }
        }

        let nameErr = xcHelper.validateColName(columnName);
        if (nameErr != null) {
            error = nameErr;
        } else if (table.getImmediateNames().includes(columnName)) {
            error = ColTStr.ImmediateClash;
        } else if (ColManager.checkDuplicateName(tableId, colNum, columnName,
                                                 options)) {
            error = ErrTStr.ColumnConflict;
        }

        if (error) {
            let $toolTipTarget = $colInput.parent();
            xcTooltip.transient($toolTipTarget, {
                "title": error,
                "template": xcTooltip.Template.Error
            });

            $colInput.click(hideTooltip);

            let timeout = setTimeout(function() {
                hideTooltip();
            }, 5000);

            function hideTooltip() {
                $toolTipTarget.tooltip('destroy');
                $colInput.off('click', hideTooltip);
                clearTimeout(timeout);
            }
        }

        return (error != null);
    };

    // options:
    // strictDuplicates: if true, prefix:col1 and col1 (derived) will be flagged
    // as a duplicate,
    // ignoreNewCol: if true, will not error if matches a new empty colum,n
    export function checkDuplicateName(
        tableId: TableId,
        colNum: number,
        colName: string,
        options?
    ): boolean {
        options = options || {};
        let table = gTables[tableId];
        if (!table) {
            table = gDroppedTables[tableId];
        }
        let numCols = table.getNumCols();
        for (let curColNum = 1; curColNum <= numCols; curColNum++) {
            if (colNum != null && colNum === curColNum) {
                continue;
            }

            let progCol = table.getCol(curColNum);
            // check both backend name and front name
            let incPrefix = !options.strictDuplicates;
            if (progCol.getFrontColName(incPrefix) === colName ||
                (!progCol.isDATACol() &&
                 progCol.getBackColName() === colName))
            {
                if (options.ignoreNewCol && progCol.isEmptyCol()) {
                    return false;
                } else {
                    return true;
                }
            }
        }
        return false;
    };

    export function minimizeCols(colNums: number[], tableId: TableId): XDPromise<any> {
        // for multiple columns
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let $table = $("#xcTable-" + tableId);
        let table = gTables[tableId];
        let colNames = [];
        let colNumsMinimized = [];
        let promises = [];
        let animOpt = {"width": gHiddenColumnWidth};
        let noAnim = false;
        const columns: ProgCol[] = [];
        const backNames: string[] = [];
        if (colNums.length > 8) { // too much lag if multile columns
            noAnim = true;
        }

        colNums.forEach(function(colNum) {
            let progCol = table.getCol(colNum);
            if (progCol.hasMinimized()) {
                return;
            } else {
                colNumsMinimized.push(colNum);
            }
            progCol = ColManager.newCol(progCol);
            table.tableCols[colNum - 1] = progCol;

            let $th = $table.find("th.col" + colNum);
            let columnName = progCol.getFrontColName();
            columns.push(progCol);
            colNames.push(columnName);
            backNames.push(progCol.getBackColName());
            progCol.minimize();

            // change tooltip to show name, and also need escape the columnName

            xcTooltip.changeText($th.find(".dropdownBox"), xcStringHelper.escapeHTMLSpecialChar(columnName));

            let $cells = $table.find("th.col" + colNum + ",td.col" + colNum);
            if (!gMinModeOn && !noAnim) {
                let innerDeferred = PromiseHelper.deferred();

                $cells.addClass("animating");
                $th.animate(animOpt, 250, "linear", function() {
                    $cells.removeClass("animating");
                    $cells.addClass("userHidden");
                    innerDeferred.resolve();
                });

                promises.push(innerDeferred.promise());
            } else {
                $th.outerWidth(gHiddenColumnWidth);
                $cells.addClass("userHidden");
            }
        });

        xcUIHelper.removeSelectionRange();

        PromiseHelper.when.apply(window, promises)
        .done(function() {
            if (colNumsMinimized.length) {
                TblFunc.matchHeaderSizes($table);
                Log.add(SQLTStr.MinimizeCols, {
                    "operation": SQLOps.MinimizeCols,
                    "tableName": table.getName(),
                    "tableId": tableId,
                    "colNames": colNames,
                    "colNums": colNumsMinimized
                });

                let node: DagNode = DagTable.Instance.getBindNode();
                if (node) {
                    const colInfo = backNames.map((_colName, i) => {
                        return {
                            width: columns[i].getWidth(),
                            sizedTo: columns[i].sizedTo,
                            isMinimized: columns[i].hasMinimized()
                        }
                    });
                    node.columnChange(DagColumnChangeType.Resize, backNames, colInfo);
                }
            }
            deferred.resolve();
        });

        return deferred.promise();
    };

    export function maximizeCols(colNums: number[], tableId: TableId, noAnim?: boolean): XDPromise<void> {
         const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let $table = $("#xcTable-" + tableId);
        let table = gTables[tableId];
        let colNames = [];
        let promises = [];
        let colNumsMaximized = [];
        const columns: ProgCol[] = [];
        const backNames: string[] = [];
        if (colNums.length > 8) { // too much lag if multile columns
            noAnim = true;
        }

        colNums.forEach(function(colNum) {
            let progCol = table.getCol(colNum);
            if (progCol.hasMinimized()) {
                colNumsMaximized.push(colNum);
            } else {
                return;
            }
            progCol = ColManager.newCol(progCol);
            table.tableCols[colNum - 1] = progCol;

            let originalColWidth = progCol.getWidth();
            progCol.maximize();
            colNames.push(progCol.getFrontColName());
            backNames.push(progCol.getBackColName());
            columns.push(progCol);

            let $th = $table.find(".th.col" + colNum);
            let $cell = $table.find("th.col" + colNum + ",td.col" + colNum);

            if (!gMinModeOn && !noAnim) {
                let innerDeferred = PromiseHelper.deferred();
                let animOpt = {"width": originalColWidth};

                $cell.addClass("animating");
                $th.animate(animOpt, 250, "linear", function() {
                    $cell.removeClass('animating');
                    innerDeferred.resolve();
                });

                promises.push(innerDeferred.promise());
            } else {
                $th.css("width", originalColWidth);
            }

            $cell.removeClass("userHidden");

            // change tooltip to show column options
            xcTooltip.changeText($th.find(".dropdownBox"),
                                TooltipTStr.ViewColumnOptions);
        });

        PromiseHelper.when.apply(window, promises)
        .done(function() {
            if (colNumsMaximized.length) {
                TblFunc.matchHeaderSizes($table);
                Log.add(SQLTStr.MaximizeCols, {
                    "operation": SQLOps.MaximizeCols,
                    "tableName": table.getName(),
                    "tableId": tableId,
                    "colNames": colNames,
                    "colNums": colNums
                });

                let node: DagNode = DagTable.Instance.getBindNode();
                if (node) {
                    const colInfo = backNames.map((_colName, i) => {
                        return {
                            width: columns[i].getWidth(),
                            sizedTo: columns[i].sizedTo,
                            isMinimized: columns[i].hasMinimized()
                        }
                    });
                    node.columnChange(DagColumnChangeType.Resize, backNames, colInfo);
                }
            }

            deferred.resolve();
        });

        return deferred.promise();
    };

    export function textAlign(colNums: number[], tableId: TableId, alignment: ColTextAlign | string): void {
        let cachedAlignment = alignment;
        if (alignment.indexOf("leftAlign") > -1) {
            alignment = ColTextAlign.Left;
        } else if (alignment.indexOf("rightAlign") > -1) {
            alignment = ColTextAlign.Right;
        } else if (alignment.indexOf("centerAlign") > -1) {
            alignment = ColTextAlign.Center;
        } else {
            alignment = ColTextAlign.Wrap;
        }
        let table = gTables[tableId];
        let $table = $("#xcTable-" + tableId);
        let colNames = [];
        let backNames = [];
        let prevAlignments = [];

        for (let i = 0, numCols = colNums.length; i < numCols; i++) {
            let colNum = colNums[i];
            let progCol = ColManager.newCol(table.getCol(colNum));

            prevAlignments.push(progCol.getTextAlign());
            colNames.push(progCol.getFrontColName());
            backNames.push(progCol.getBackColName());
            let $tds = $table.find("td.col" + colNum);

            for (let key in ColTextAlign) {
                $tds.removeClass("textAlign" + ColTextAlign[key]);
            }

            $tds.addClass("textAlign" + alignment);
            progCol.setTextAlign(alignment);
            table.setCol(progCol, colNum);
        }
        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            node.columnChange(DagColumnChangeType.TextAlign, backNames, {alignment: alignment});
        }

        Log.add(SQLTStr.TextAlign, {
            "operation": SQLOps.TextAlign,
            "tableName": table.getName(),
            "tableId": tableId,
            "colNames": colNames,
            "colNums": colNums,
            "alignment": alignment,
            "prevAlignments": prevAlignments,
            "cachedAlignment": cachedAlignment,
            "htmlExclude": ["prevAlignments", "cachedAlignment"]
        });
    };

    // jsonData is an array of stringified json with each array item
    // representing a row
    export function pullAllCols(
        startIndex: number,
        jsonData,
        table: TableMeta,
        direction: number,
        rowToPrependTo: number
    ): JQuery {
        let tableId: TableId = table.getId();
        let tableCols = table.tableCols;
        let numCols = table.getNumCols();
        let indexedColNums = [];
        let nestedVals = [];
        if (typeof jsonData !== "object" || !(jsonData instanceof Array)) {
            jsonData = [""];
        }

        let $table = $('#xcTable-' + tableId);
        let tBodyHTML = "";
        let nested;
        let hasIndexStyle = table.showIndexStyle();
        let keys = table.getKeyName();

        startIndex = startIndex || 0;

        for (let i = 0; i < numCols; i++) {
            let progCol = tableCols[i];
            if (progCol.isDATACol() || progCol.isEmptyCol()) {
                // this is the data Column
                nestedVals.push({nested: [""]});
            } else {
                let backColName = progCol.getBackColName();
                if (!isValidColToPull(backColName)) {
                    nested = {nested: [""]};
                } else {
                    nested = parseColFuncArgs(backColName);
                }

                nestedVals.push(nested);
                let sortedColAlias = progCol.getSortedColAlias();
                // get the column number of the column the table was indexed on
                if ((keys.includes(sortedColAlias))) {
                    indexedColNums.push(i);
                }
            }
        }
        let numRows;
        // Handle special case where resultant table has 0 rows
        if (jsonData.length === 1 && jsonData[0] === "") {
            tBodyHTML += '<tr class="row0">' +
                '<td class="emptyTable">' + TblTStr.EmptyTable + '</td>' +
                '</tr>';
        } else {
            // loop through table tr and start building html
            let knownTypes: boolean[] = tableCols.map(isKnownType);
            for (let row = 0, numRows = jsonData.length; row < numRows; row++) {
                let tdValue = parseRowJSON(jsonData[row]);
                let rowNum = row + startIndex;

                tBodyHTML += '<tr class="row' + rowNum + '">' +
                                '<td align="center" class="col0">' +
                                    '<div class="idWrap">' + // Line Marker Column
                                        '<span class="idSpan">' +
                                            (rowNum + 1) +
                                        '</span>' +
                                        '<div class="rowGrab"></div>' +
                                    '</div>' +
                                '</td>';

                // loop through table tr's tds
                let nestedTypes;
                for (let colNum = 0; colNum < numCols; colNum++) {
                    nested = nestedVals[colNum].nested;
                    nestedTypes = nestedVals[colNum].types;

                    let indexed = (indexedColNums.indexOf(colNum) > -1);
                    let parseOptions = {
                        "hasIndexStyle": hasIndexStyle,
                        "indexed": indexed,
                        "knownType": knownTypes[colNum]
                    };
                    let res = parseTdHelper(tdValue, nested, nestedTypes,
                                            tableCols[colNum], parseOptions);
                    let tdClass = "col" + (colNum + 1);

                    if (res.tdClass !== "") {
                        tdClass += " " + res.tdClass;
                    }

                    tBodyHTML += '<td class="' + tdClass + '">' +
                                    res.td +
                                '</td>';
                }
                // end of loop through table tr's tds
                tBodyHTML += '</tr>';
            }
            // end of loop through table tr and start building html
        }

        // assign column type class to header menus
        let $tBody = $(tBodyHTML);
        attachRows($table, $tBody, rowToPrependTo, direction, numRows);

        for (let colNum = 1; colNum <= numCols; colNum++) {
            styleColHeadHelper(colNum, tableId);
        }

        return $tBody;
    };

    function attachRows(
        $table: JQuery,
        $rows: JQuery,
        rowToPrependTo: number,
        direction: RowDirection,
        numRows: number
    ): void {
        if (direction === RowDirection.Top) {
            if (rowToPrependTo != null && rowToPrependTo > -1) {
                let $rowToPrependTo = getRowToPrependTo($table, rowToPrependTo);
                if (!$rowToPrependTo) {
                    $table.find('tbody').prepend($rows);
                } else {
                    if ($rowToPrependTo.prev().hasClass('tempRow')) {
                        $rowToPrependTo.prevAll(".tempRow:lt(" + numRows + ")")
                                       .remove();
                    }
                    $rowToPrependTo.before($rows);
                }
            } else {
                $table.find(".tempRow").slice(0, numRows).remove();
                $table.find('tbody').prepend($rows);
            }
        } else {
            let $prevRow = $table.find(".tempRow").eq(0).prev();
            $table.find(".tempRow").slice(0, numRows).remove();
            if ($prevRow.length) {
                $prevRow.after($rows);
            } else {
                $table.find('tbody').append($rows);
            }
        }
    }

    function getRowToPrependTo($table: JQuery, rowNum: number): JQuery {
        // $('.row' + rowNum) may not exist,
        // so we find the previous row and call next
        let $row = $table.find(".row" + (rowNum - 1)).next();

        if (!$row.length) {
            $row = $table.find('.row' + rowNum);
            if (!$row.length) {
                $row = null;
                $table.find('tbody tr').each(function() {
                    $row = $(this);
                    if (RowManager.parseRowNum($row) > rowNum) {
                        return false;
                    }
                });
            }
        }

        return $row;
    }

    // used when pulling multiple columns from data column or from an object or array cell
    // colNames is optional, if not provided then will try to pull all cols
    export function unnest(tableId: TableId, colNum: number, rowNum: number, colNames?: string[]): void {
        let $table = $('#xcTable-' + tableId);
        let $jsonTd = $table.find('.row' + rowNum).find('td.col' + colNum);
        let jsonTdObj = parseRowJSON($jsonTd.find('.originalData').text());
        let table = gTables[tableId];
        let hiddenSortCols = table.getHiddenSortCols();
        // do not pull out columns that should be hidden due to sort aliases
        for (let colName in hiddenSortCols) {
            delete jsonTdObj[colName];
        }

        // if datacol, make sure the json obj includes all the immediates
        if ($jsonTd.hasClass("jsonElement")) {
            let immediates = table.getImmediates();
            immediates.forEach(function(immediate) {
                if (!jsonTdObj.hasOwnProperty(immediate.name) &&
                    !hiddenSortCols[immediate.name]) {
                    jsonTdObj[immediate.name] = true;
                }
            });
        }

        if (jsonTdObj == null) {
            return;
        }

        let progCol = table.getCol(colNum);
        let isDATACol = progCol.isDATACol();
        let colNums = [];

        let parsedCols = parseUnnestTd(table, progCol, jsonTdObj, colNames);
        let numKeys = parsedCols.length;

        if (numKeys === 0) {
            StatusBox.show("All fields have been pulled.", $jsonTd, null, {
                side: "top",
                offsetY: 12
            });
            return;
        }

        let ths = "";
        let finalColNames: string[] = [];
        parsedCols.forEach(function(parsedCol, index) {
            let colName = xcHelper.parsePrefixColName(parsedCol.colName).name;
            let backColName = parsedCol.escapedColName;
            finalColNames.push(backColName);
            let newProgCol = ColManager.newPullCol(colName, backColName, null, true);
            table.updateSortColAlias(newProgCol);
            let newColNum = isDATACol ? colNum + index : colNum + index + 1;

            table.addCol(newColNum, newProgCol);
            ths += TblManager.getColHeadHTML(newColNum, tableId, {
                "columnClass": " selectedCell"
            });
            colNums.push(newColNum);
        });

        let $colToUnnest = $table.find('.th.col' + colNum);
        if (isDATACol) {
            $colToUnnest.before(ths);
        } else {
            $colToUnnest.after(ths);
        }
        pullRowsBulkHelper(tableId);
        FormHelper.updateColumns(tableId);

        let node: DagNode = DagTable.Instance.getBindNode();
        if (node) {
            let info: {type: ColumnType}[] = getColumnTypeChangeInfo(tableId, finalColNames);
            node.columnChange(DagColumnChangeType.Pull, finalColNames, info);
        }
        Log.add(SQLTStr.PullCols, {
            "operation": SQLOps.PullMultipleCols,
            "tableName": table.getName(),
            "tableId": tableId,
            "colNum": colNum,
            "colNums": colNums,
            "rowNum": rowNum,
            "colNames": colNames,
            "htmlExclude": ["colNames"]
        });
    };

    function getColumnTypeChangeInfo(
        tableId: TableId,
        colNames: string[]
    ): {type: ColumnType}[] {
        let info = null;
        try {
            let table: TableMeta = gTables[tableId];
            info = colNames.map((colName) => {
                let progCol = table.getColByBackName(colName);
                return progCol ? {"type": progCol.getType()} : null;
            });
        } catch (e) {
            console.error(e);
        }
        return info;
    }

    // used for mixed columns when we want to get the type inside a td
    export function getCellType($td: JQuery, tableId: TableId): ColumnType  {
        let table = gTables[tableId];
        let tdColNum = ColManager.parseColNum($td);
        let colName = table.getCol(tdColNum).getBackColName();
        let dataColNum = gTables[tableId].getColNumByBackName("DATA");
        let $table = $("#xcTable-" + tableId);
        var rowNum = RowManager.parseRowNum($td.closest("tr"));
        let $dataTd = $table.find(".row" + rowNum + " .col" + dataColNum);
        let data = $dataTd.find('.originalData').text();
        let parsed = false;

        if ($td.find(".undefined").length) {
            return ColumnType.undefined;
        }
        try {
            data = JSON.parse(data);
            parsed = true;
        } catch (error) {
            console.error(error, data);
        }
        if (!parsed) {
            return ColumnType.undefined;
        }
        let nestedInfo = parseColFuncArgs(colName);
        let nested = nestedInfo.nested;
        let nestedTypes = nestedInfo.types;
        let val = getTdInfo(data, nested, nestedTypes).tdValue;

        return (xcHelper.parseColType(val));
    };

    function isValidColToPull(colName: string): boolean {
        if (colName === "" || colName == null) {
            return false;
        } else {
            return true;
        }
    }

    function isKnownType(progCol: ProgCol): boolean {
        return progCol && progCol.getType() != null;
    }

    function parseTdHelper(
        rowData,
        nested: string[],
        nestedTypes: string[],
        progCol: ProgCol,
        options?: {
            hasIndexStyle: boolean,
            indexed: boolean,
            knownType: boolean
        }
    ):  {
        td: string,
        tdClass: string
    } {
        options = options || {
            hasIndexStyle: undefined,
            indexed: undefined,
            knownType: undefined
        };

        let knf = false;
        let truncLimit = 1000; // the character limit for the data td
        let colTruncLimit = 500; // the character limit for other tds
        let tdClass = "clickable";
        let isDATACol = false;
        let tdValue;

        if (progCol.isDATACol()) {
            isDATACol = true;
            tdClass += " jsonElement";
            tdValue = rowData;
        } else if (progCol.isEmptyCol()) {
            tdValue = "";
        } else if (rowData === null) {
            knf = true;
            tdValue = null;
        } else {
            if (!nested) {
                console.error('Error this value should not be empty');
                tdValue = "";
            } else {
                let tdInfo = getTdInfo(rowData, nested, nestedTypes);
                tdValue = tdInfo.tdValue;
                knf = tdInfo.knf;
            }

            // define type of the column
            if (!options.knownType && !knf) {
                progCol.updateType(tdValue);
            }

            // class for textAlign
            if (progCol.textAlign === "Left") {
                tdClass += " textAlignLeft";
            } else if (progCol.textAlign === "Right") {
                tdClass += " textAlignRight";
            } else if (progCol.textAlign === "Wrap") {
                tdClass += " textAlignWrap";
            } else if (progCol.textAlign === "Center") {
                tdClass += " textAlignCenter";
            }
        }

        if (options.indexed) {
            tdClass += " indexedColumn";

            if (!options.hasIndexStyle) {
                tdClass += " noIndexStyle";
            }
        }

        // formatting
        let parsedVal = xcHelper.parseJsonValue(tdValue, knf, true);
        let formatVal = parsedVal;
        let format = progCol.getFormat();

        if (!knf && tdValue != null && (format !== ColFormat.Default &&
            typeof parsedVal !== "string"))
        {
            formatVal = formatColumnCell(parsedVal, format);
        }

        let limit = isDATACol ? truncLimit : colTruncLimit;
        let tdValLen = formatVal.length;
        let truncated = (tdValLen > limit);

        if (truncated) {
            let truncLen = tdValLen - limit;
            formatVal = formatVal.substr(0, limit) +
                        "...(" + (xcStringHelper.numToStr(truncLen)) +
                        " " + TblTStr.Truncate + ")";
            tdClass += " truncated";
        }

        if (!isDATACol) {
            if (typeof formatVal === "string") {
                formatVal = xcUIHelper.styleNewLineChar(formatVal);
            }
        }

        // For formated number, need seprate display of formatVal
        // and original val, also applys to numbers in mixed columns
        if (!knf && tdValue != null && (progCol.isNumberCol() ||
            progCol.getType() === ColumnType.mixed)) {
            truncated = true;
        }

        let td = getTableCellHtml(formatVal, truncated, parsedVal, isDATACol);
        return {
            "td": td,
            "tdClass": tdClass.trim(),
        };
    }

    // helper function for parseTdHelper that returns an object with
    // tdValue string, and knf boolean
    function getTdInfo(tdValue: string, nested: string[], types: string[]): {
        tdValue: string,
        knf: boolean
    } {
        let knf = false;
        let nestedLength = nested.length;
        let curVal;

        for (let i = 0; i < nestedLength; i++) {
            if (types && types[i - 1] === "object" && Array.isArray(tdValue)) {
                knf = true;
                tdValue = null;
                break;
            }
            curVal = tdValue[nested[i]];
            if (curVal === null) {
                // when tdValue is null (not undefined)
                tdValue = curVal;
                break;
            } else if (jQuery.isEmptyObject(tdValue) || curVal == null) {
                knf = true;
                tdValue = null;
                break;
            } else {
                tdValue = curVal;
            }
        }

        return ({
            "tdValue": tdValue,
            "knf": knf
        });
    }

    function styleColHeadHelper(colNum: number, tableId: TableId): void {
        let $table = $("#xcTable-" + tableId);
        let table = gTables[tableId];
        let progCol = table.getCol(colNum);
        let $th = $table.find("th.col" + colNum);
        let $header = $th.find("> .header");
        let colType = progCol.getType();

        $header.removeClass("type-mixed")
                .removeClass("type-string")
                .removeClass("type-integer")
                .removeClass("type-float")
                .removeClass("type-object")
                .removeClass("type-array")
                .removeClass("type-undefined")
                .removeClass("type-boolean")
                .addClass("type-" + colType);

        // for integer or float, if we cannot distinct (if no info from backend)
        // then we say it's a number
        let adjustedColType = colType;
        // if (!progCol.isKnownType() && progCol.isNumberCol()) {
        //     adjustedColType = "number";
        // }
        if (colType === ColumnType.money) {
            adjustedColType = TooltipTStr.twodp;
        }
        adjustedColType = xcStringHelper.capitalize(adjustedColType);
        xcTooltip.changeText($header.find(".iconHelper"), adjustedColType);

        if (progCol.hasMinimized()) {
            $table.find("td.col" + colNum).addClass("userHidden");
        }
        if ([ColumnType.integer, ColumnType.float, ColumnType.string,
            ColumnType.boolean, ColumnType.number, ColumnType.timestamp, ColumnType.money].indexOf(colType) > -1
            && !progCol.isEmptyCol()) {
            $th.addClass("sortable");
        } else {
            $th.removeClass("sortable");
        }
        let keys = table.getKeys();
        let sortedColAlias = progCol.getSortedColAlias();
        let indexed = keys.find(function(k) {
            return k.name === sortedColAlias;
        });
        if (indexed) {
            $th.addClass("indexedColumn");
        } else {
            $th.removeClass("indexedColumn");
        }

        if ($th.hasClass("selectedCell") ||
            $th.hasClass("modalHighlighted")) {
            TblManager.highlightColumn($th, true,
                                        $th.hasClass("modalHighlighted"));
        }
        if (!progCol.isEmptyCol()) {
            $th.removeClass('newColumn');
        }

        if (progCol.getPrefix() !== "") {
            $th.find('.prefix').removeClass('immediate');
        }
    }

    function pullColHelper(colNum: number, tableId: TableId): void {
        let table = gTables[tableId];
        let progCol = table.getCol(colNum);
        let backColName = progCol.getBackColName();

        if (!isValidColToPull(backColName)) {
            return;
        }

        let $table = $("#xcTable-" + tableId);
        let $dataCol = $table.find("tr:first th").filter(function() {
            return ($(this).find("input").val() === "DATA");
        });

        let dataColNum = ColManager.parseColNum($dataCol);

        let startingIndex = parseInt($table.find("tbody tr:first")
                                           .attr('class').substring(3));
        let endingIndex = parseInt($table.find("tbody tr:last")
                                           .attr('class').substring(3)) + 1;

        let nestedInfo = parseColFuncArgs(backColName);
        let nested = nestedInfo.nested;
        let nestedTypes = nestedInfo.types;

        let keys = table.getKeys();
        let sortedColAlias = progCol.getSortedColAlias();
        let indexed = keys.find(function(k) {
            return k.name === sortedColAlias;
        });

        let hasIndexStyle = table.showIndexStyle();
        $table.find(".col" + colNum).removeClass("indexedColumn");
        let knownType: boolean = isKnownType(progCol);
        for (let i = startingIndex; i < endingIndex; i++) {
            let $jsonTd = $table.find('.row' + i + ' .col' + dataColNum);
            let jsonStr = $jsonTd.find('.originalData').text();
            let tdValue = parseRowJSON(jsonStr) || "";
            let res = parseTdHelper(tdValue, nested, nestedTypes, progCol, {
                "indexed": indexed,
                "hasIndexStyle": hasIndexStyle,
                "knownType": knownType
            });

            let $td = $table.find('.row' + i + ' .col' + colNum);
            $td.html(res.td);
            if (res.tdClass !== "") {
                $td.addClass(res.tdClass);
            }
        }

        styleColHeadHelper(colNum, tableId);
        let sortIcon = "";
        if (indexed) {
            let order = indexed.ordering;
            let sorted = false;
            if (order ===
                XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending]) {
                sortIcon = '<div class="sortIcon"  data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'data-placement="auto top" data-original-title="' +
                        TooltipTStr.ClickToSortDesc + '"' +
                            '><i class="icon xi-arrow-up fa-9"></i>';
                sorted = true;
            } else if (order ===
                XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                sortIcon = '<div class="sortIcon" data-toggle="tooltip" ' +
                            'data-container="body" ' +
                            'data-placement="auto top" data-original-title="' +
                            TooltipTStr.ClickToSortAsc + '"><i class="icon ' +
                            'xi-arrow-down fa-9"></i>';
                sorted = true;
            }
            if (sorted) {
                let keyNames = table.getKeyName();
                if (keyNames.length > 1) {
                    let sortNum = keyNames.indexOf(sortedColAlias);
                    sortIcon += '<span class="sortNum">' + (sortNum + 1) +
                                '</span>';
                }
                sortIcon += '</div>';
                $table.find("th.col" + colNum).find(".sortIcon")
                      .replaceWith(sortIcon);
            }
        } else {
            sortIcon = '<div class="sortIcon">' +
                        '<div class="sortAsc sortHalf" data-toggle="tooltip" ' +
                        'data-container="body" ' +
                        'data-placement="auto top" data-original-title="' +
                        TooltipTStr.ClickToSortAsc + '"></div>' +
                        '<div class="sortDesc sortHalf" data-toggle="tooltip"' +
                        'data-container="body" ' +
                        'data-placement="auto top" data-original-title="' +
                        TooltipTStr.ClickToSortDesc + '"></div>' +
                        '<i class="icon xi-sort fa-12"></i>' +
                        '</div>';
            $table.find("th.col" + colNum).find(".sortIcon")
                      .replaceWith(sortIcon);
        }
    }

    function addColHelper(colNum: number, tableId: TableId, progCol: ProgCol, options?): number {
        let $tableWrap = $("#xcTableWrap-" + tableId);
        let $table = $tableWrap.find(".xcTable");
        let table = gTables[tableId];
        let numCols = table.tableCols.length;
        let newColNum = colNum;

        // options
        options = options || {};
        let select = options.select || false;
        let noAnimate = options.noAnimate || false;

        let width = progCol.getWidth();
        let isNewCol = progCol.isEmptyCol();
        let isMinimized = progCol.hasMinimized();
        let columnClass = "";

        if (options.direction !== ColDir.Left) {
            newColNum += 1;
        }

        if (isNewCol) {
            select = true;
        }

        if (select) {
            columnClass += " selectedCell";
            $(".selectedCell").removeClass("selectedCell");
        }

        table.addCol(newColNum, progCol);

        // change table class before insert a new column
        for (let i = numCols; i >= newColNum; i--) {
            $tableWrap.find('.col' + i)
                      .removeClass('col' + i)
                      .addClass('col' + (i + 1));
        }
        // insert new th column
        let $th = $(TblManager.getColHeadHTML(newColNum, tableId, {
            "columnClass": columnClass
        }));
        $tableWrap.find('.th.col' + (newColNum - 1)).after($th);

        if (gMinModeOn || noAnimate) {
            TblManager.updateHeaderAndListInfo(tableId);
            TblFunc.moveFirstColumn();
        } else {
            $th.width(10);
            if (!isMinimized) {
                columnClass += " animating";
                $th.animate({width: width}, 300, function() {
                    TblManager.updateHeaderAndListInfo(tableId);
                    $table.find('.col' + newColNum).removeClass('animating');
                });
            } else {
                TblManager.updateHeaderAndListInfo(tableId);
            }
        }

        // get the first row in UI and start to add td to each row
        let idOfFirstRow = $table.find("tbody tr:first").attr("class");
        let idOfLastRow = $table.find("tbody tr:last").attr("class");
        let startingIndex = idOfFirstRow ?
                                parseInt(idOfFirstRow.substring(3)) : 1;
        let endingIndex = parseInt(idOfLastRow.substring(3));
        let newCellHTML = '<td ' + 'class="' + columnClass.trim() +
                          ' col' + newColNum + '"></td>';

        let i = startingIndex;
        while (i <= endingIndex) {
            $table.find(".row" + i + " .col" + (newColNum - 1))
                  .after(newCellHTML);
            i++;
        }

        if (isNewCol) {
            // Without doing this, the lastTarget will still be a div
            // even we focus on the input, so press space will make table scroll
            $th.find(".flexContainer").mousedown();
            let $input = $th.find(".editableHead").focus();
            gMouseEvents.setMouseDownTarget($input);
            gMouseEvents.setClickTarget($input);
        }

        return newColNum;
    }

    // Help Functon for pullAllCols and pullCOlHelper
    // parse tableCol.func.args
    // assumes legal syntax ie. votes[funny] and not votes[funny]blah
    export function parseColFuncArgs(key: string): {
        nested: string[],
        types?: string[]
    } {
        if (key == null) {
            return {nested: []};
        }
        key += ""; // if number, convert to string

        // replace votes[funny] with votes.funny but votes\[funny\] will remain
        // XXX this is waiting for backend to fix, after that
        // we should not have votes\[fuuny\]
        let isEscaped = false;
        let bracketOpen = false;
        let types = [];
        for (let i = 0; i < key.length; i++) {
            if (isEscaped) {
                isEscaped = false;
            } else {
                if (key[i] === "[") {
                    key = key.substr(0, i) + "." + key.substr(i + 1);
                    bracketOpen = true;
                    types.push("array");
                } else if (key[i] === "]") {
                    if (bracketOpen) {
                        key = key.substr(0, i) + key.substr(i + 1);
                        i--;
                        bracketOpen = false;
                    }
                } else if (key[i] === "\\") {
                    isEscaped = true;
                } else if (key[i] === ".") {
                    types.push("object");
                }
            }
        }
        let nested: string[] = key.match(/([^\\.]|\\.)+/g);

        if (nested == null) {
            return {nested: []};
        }
        for (let i = 0; i < nested.length; i++) {
            nested[i] = xcHelper.unescapeColName(nested[i]);
        }
        return {nested: nested, types: types};
    }


    // parse json string of a table row
    function parseRowJSON(jsonStr: string): any {
        if (!jsonStr) {
            return "";
        }

        let value;

        try {
            value = jQuery.parseJSON(jsonStr);
        } catch (err) {
            // XXX may need extra handlers to handle the error
            console.error(err, jsonStr);
            value = null;
        }

        return value;
    }
    // End Of Help Functon for pullAllCols and pullCOlHelper

    // colNames is optional, if not provided then will try to pull all cols
    function parseUnnestTd(
        table: TableMeta,
        progCol: ProgCol,
        jsonTd,
        colNames: string[]
    ): {colName: string, escapedColName: string}[]{
        let parsedCols = [];
        let isArray = (progCol.getType() === ColumnType.array);
        let isNotDATACol = !progCol.isDATACol();
        let openSymbol = "";
        let closingSymbol = "";
        let unnestColName;
        colNames = colNames || [];

        if (isNotDATACol) {
            if (!isArray) {
                openSymbol = ".";
            } else {
                if (!colNames.length) {
                    openSymbol = "[";
                    closingSymbol = "]";
                }
            }
            unnestColName = progCol.getBackColName();
        }

        if (colNames.length) {
            for (let i = 0; i < colNames.length; i++) {
                addParsedColName(colNames[i]);
            }
        } else {
            for (let tdKey in jsonTd) {
                addParsedColName(tdKey, true);
            }
        }

        // only escaping if column names not passed into parseUnnestTd
        function addParsedColName(colName: string, escape?: boolean): void {
            let escapedColName;
            if (escape) {
                escapedColName = xcHelper.escapeColName(colName);
            } else {
                escapedColName = colName;
            }

            if (isNotDATACol) {
                colName = unnestColName + openSymbol + colName + closingSymbol;
                escapedColName = unnestColName + openSymbol +
                                escapedColName + closingSymbol;
            }

            if (!table.hasColWithBackName(escapedColName)) {
                parsedCols.push({
                    "colName": colName,
                    "escapedColName": escapedColName
                });
            }
        }

        return parsedCols;
    }

    function pullRowsBulkHelper(tableId: TableId): void {
        let $table = $("#xcTable-" + tableId);
        // will change colNum in the follwing, so should
        // get datColNum here
        let dataColNum = ColManager.parseColNum($table.find("th.dataCol"));
        $table.find("th").each(function(newColNum) {
            let $th = $(this);
            if (!$th.hasClass("rowNumHead")) {
                let colNum = ColManager.parseColNum($th);
                $th.removeClass("col" + colNum).addClass("col" + newColNum);
                $th.find(".col" + colNum).removeClass("col" + colNum)
                                            .addClass("col" + newColNum);
            }
        });

        let $tbody = $table.find("tbody");
        let rowNum = RowManager.parseRowNum($tbody.find("tr:eq(0)"));
        let jsonData = [];
        $tbody.find(".col" + dataColNum).each(function() {
            jsonData.push($(this).find(".originalData").text());
        });
        $tbody.empty(); // remove tbody contents for pullrowsbulk

        TblManager.pullRowsBulk(gTables[tableId], jsonData, rowNum, RowDirection.Bottom);
        TblManager.updateHeaderAndListInfo(tableId);
        TblFunc.moveFirstColumn();
    }

    function delColHelper(
        colNum: number,
        tableId: TableId,
        multipleCols: boolean,
        colId: number,
        noAnim: boolean
    ): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let table = gTables[tableId];
        let numCols = table.getNumCols();
        let $tableWrap = $("#xcTableWrap-" + tableId);

        // temporarily no animation when deleting multiple duplicate cols
        if (gMinModeOn || noAnim) {
            $tableWrap.find(".col" + colNum).remove();
            if (!multipleCols) {
                table.removeCol(colNum);

                for (let i = colNum + 1; i <= numCols; i++) {
                    $tableWrap.find(".col" + i)
                              .removeClass("col" + i)
                              .addClass("col" + (i - 1));
                }

                let $table = $('#xcTable-' + tableId);
                TblFunc.matchHeaderSizes($table);
            } else {
                table.removeCol(colId);
            }

            deferred.resolve();
            return (deferred.promise());
        }
        $tableWrap.find('.col' + colNum).addClass('animating');
        $tableWrap.find("th.col" + colNum).animate({width: 0}, 200, function() {
            let currColNum = ColManager.parseColNum($(this));
            $tableWrap.find(".col" + currColNum).remove();
            if (!multipleCols) {
                for (let j = currColNum + 1; j <= numCols; j++) {
                    $tableWrap.find(".col" + j)
                              .removeClass("col" + j)
                              .addClass("col" + (j - 1));
                }
                deferred.resolve();
            } else {
                deferred.resolve();
            }
        });

        if (!multipleCols) {
            table.removeCol(colNum);
        } else {
            table.removeCol(colId);
        }

        return (deferred.promise());
    }

    // checks to make sure func.name is "pull" and that pull has
    // exactly one argument
    function parsePullColArgs(progCol: ProgCol): boolean {
        if (progCol.func.name !== "pull") {
            console.warn("Wrong function!");
            return (false);
        }

        if (progCol.func.args.length !== 1) {
            console.warn("Wrong number of arguments!");
            return (false);
        }

        let type = typeof progCol.func.args[0];
        if (type !== "string" && type !== "number") {
            console.warn("argument is not a string or number!");
            return (false);
        }
        return (true);
    }

    function getTableCellHtml(
        value: string,
        isTruncated: boolean,
        rawValue: string,
        isDATACol: boolean
    ): HTML {
        let tdClass;
        let html;

        if (isDATACol) {
            tdClass = isTruncated ? " truncated" : " originalData";
            html = '<i class="pop icon xi_popout fa-15 xc-action" ' +
                    xcTooltip.Attrs + ' data-title="' + TooltipTStr.Examine +
                    '"></i>' +
                    '<div class="dataColText clickable displayedData' +
                        tdClass + '">' +
                            value +
                    '</div>';
            if (isTruncated) {
                html += '<div class="dataColText originalData">' +
                            rawValue +
                        '</div>';
            }

        } else {
            html =
                '<div class="tdText displayedData clickable">' +
                    value +
                '</div>' +
                '<div class="tdText originalData">' +
                    rawValue +
                '</div>';
        }
        return (html);
    }

    function searchColNames(val: string, searchBar: SearchBar, initialTableId: TableId): void {
        val = val.toLowerCase();
        let $functionArea = $('#functionArea');
        let $headerInputs = $('.xcTableWrap:visible').find('.editableHead');
        let $tableTitles = $('.xcTableWrap:visible').find('.tableTitle .text');
        let $searchableFields = $headerInputs.add($tableTitles);
        if (val === "") {
            searchBar.clearSearch(function() {
                $('.xcTable:visible').find('.selectedCell')
                                     .removeClass('selectedCell')
                                     .end()
                                     .closest('.xcTableWrap')
                                     .find('.tblTitleSelected')
                                     .removeClass('tblTitleSelected');
                if (initialTableId && initialTableId === gActiveTableId) {
                } else {
                    TableComponent.empty();
                }
            });
            $functionArea.find('.position').hide();
            $functionArea.find('.counter').hide();
            $functionArea.find('.arrows').hide();
            return;
        }

        $functionArea.find('.position').show();
        $functionArea.find('.counter').show();
        $functionArea.find('.arrows').show();

        let $matchedInputs = $searchableFields.filter(function() {
            if ($(this).is('.editableHead')) {
                return ($(this).val().toLowerCase().indexOf(val) !== -1);
            } else if ($(this).is('.text')) {
                return ($(this).data('title').toLowerCase().indexOf(val) !== -1);
            }

        });
        let numMatches = $matchedInputs.length;
        let position = Math.min(1, numMatches);
        let $matches = $matchedInputs.closest('th')
                                     .add($matchedInputs
                                     .closest('.tableTitle'));
        searchBar.$matches = $matches;
        searchBar.numMatches = numMatches;
        $functionArea.find('.position').html(position + "");
        $functionArea.find('.total').html('of ' + numMatches);
        $('.xcTable:visible').find('.selectedCell')
                             .removeClass('selectedCell')
                             .end()
                             .closest('.xcTableWrap')
                             .find('.tblTitleSelected')
                             .removeClass('tblTitleSelected');

        TableComponent.empty();
        if (numMatches !== 0) {
            searchBar.scrollMatchIntoView($matches.eq(0));
            searchBar.highlightSelected($matches.eq(0));
        }
    }

    function updateColumnFormat(tableId: TableId, colNum: number): void {
        let $table = $("#xcTable-" + tableId);
        let progCol = gTables[tableId].getCol(colNum);
        let format = progCol.getFormat();
        let isMixed = progCol.getType() === ColumnType.mixed;

        $table.find("td.col" + colNum).each(function() {
            let $td = $(this);
            if (isMixed) {
                // do not format cell if not a number
                let cellType = ColManager.getCellType($td, tableId);
                if (cellType !== ColumnType.integer && cellType !==
                    ColumnType.float) {
                    return;
                }
            }
            let oldVal = $td.find(".originalData").text();
            if (oldVal != null && !$td.find(".undefined").length &&
                !$td.find(".null").length) {
                // not knf
                let newVal = formatColumnCell(oldVal, format);
                $td.children(".displayedData").text(newVal);
            }
        });
    }

    /*
    *@property {string} val: Text that would be in a table td
    *@property {string} format: "percent" or null
    */
    function formatColumnCell(val: string, format: ColFormat) {
        let cachedVal = val;
        let valNum: number = parseFloat(val);

        if (isNaN(valNum)) {
            return cachedVal;
        }

        switch (format) {
            case ColFormat.Percent:
                // there is a case that 2009.877 * 100 =  200987.69999999998
                // so must round it
                let newVal = valNum * 100;
                let decimalPartLen;
                let pow;
                let decimalPart = (val + "").split(".")[1];
                if (decimalPart != null) {
                    decimalPartLen = decimalPart.length;
                    pow = Math.pow(10, decimalPartLen);
                } else {
                    pow = 1;
                }

                newVal = Math.round(newVal * pow) / pow;
                return newVal + "%";
            default:
                val = val + ""; // change to type string
                return val;
        }
    }

    export let __testOnly__: any = {};

    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__.parsePullColArgs = parsePullColArgs;
        __testOnly__.parseColFuncArgs = parseColFuncArgs;
        __testOnly__.formatColumnCell = formatColumnCell;
        __testOnly__.getTdInfo = getTdInfo;
        __testOnly__.attachRows = attachRows;
    }
}
