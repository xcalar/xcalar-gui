class SQLWindow {
    static compile(node: TreeNode): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const loopStruct: SQLLoopStruct = {cli: "", node: node};
        let cli = "";

        // Window should has one child
        SQLUtil.assert(node.children.length === 1, SQLErrTStr.WindowChildren +
                                                          node.children.length);

        // Sort the table first because windowExps in same window node
        // share same order
        // If no sortOrder specified => aggregate window, no need to sort
        const tableName = node.children[0].newTableName;
        const options = {renamedCols: node.renamedCols, tableName: tableName};
        loopStruct.groupByCols = SQLWindow.__genGBColArray(
                                             node.value.partitionSpec, options);
        const evalStructArray: SQLEvalStruct[] = [];
        loopStruct.sortColsAndOrder = SQLSort.genSortStruct(node.value.orderSpec,
                                                      evalStructArray, options);
        let curPromise: XDPromise<any>;
        if (loopStruct.sortColsAndOrder.length === 0
                                && loopStruct.groupByCols.length === 0) {
            const innerDeferred = PromiseHelper.deferred();
            innerDeferred.resolve({"cli": "",
                                   "newTableName": tableName});
            curPromise = innerDeferred.promise();
        } else {
            curPromise = SQLSimulator.sort(SQLWindow.__concatColInfoForSort(
                                        loopStruct.groupByCols,
                                        loopStruct.sortColsAndOrder), tableName);
        }

        // Generate row number after sort, may check if needed
        // to reduce operation number
        let tableId = xcHelper.getTableId(tableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        loopStruct.indexColStruct = {colName: "XC_ROW_COL_" + Authentication
                                     .getHashId().substring(3) + "_" + tableId,
                                     colType: SQLColumnType.Integer};
        node.xcCols.push(loopStruct.indexColStruct);
        curPromise = curPromise.then(function(ret) {
            cli += ret.cli;
            return SQLSimulator.genRowNum(ret.newTableName,
                         SQLCompiler.getCurrentName(loopStruct.indexColStruct));
        });

        // If no partition specified, need to add a temp column to group by
        // Use groupAll instead

        // Traverse windowExps, generate desired rows
        const windowStruct = SQLWindow.__categoryWindowOps(
                                         node.value.windowExpressions, options);
        for (const item in windowStruct) {
            if (item === "lead") {
                if (!jQuery.isEmptyObject(windowStruct[item])) {
                    for (const offset in windowStruct[item]) {
                        curPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                  curPromise, item, windowStruct[item][offset]);
                    }
                }
            } else if (item === "agg" || item === "first" || item === "last") {
                windowStruct[item].forEach(function (obj) {
                    curPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                                         curPromise, item, obj);
                })
            } else if (windowStruct[item].newCols.length != 0) {
                curPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                          curPromise, item, windowStruct[item]);
            }
        }

        curPromise = curPromise.then(function(ret) {
            cli += loopStruct.cli;
            cli += ret.cli;
            node.xcCli = cli;
            node.newTableName = ret.newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }
    // Need to remove duplicate
    static __genGBColArray(
        cols: SQLColumn[],
        options: SQLOption
    ): SQLColumn[] {
        const colInfoArray = [];
        const idSet = new Set();
        for (let i = 0; i < cols.length; i++) {
            SQLUtil.assert(cols[i][0].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference",
                SQLErrTStr.BadGenGBArray + cols[i][0].class);
            if (idSet.has(cols[i][0].exprId.id)) {
                continue;
            }
            idSet.add(cols[i][0].exprId.id);
            const colStruct: SQLColumn = {
                colName: SQLCompiler.cleanseColName(cols[i][0].name),
                colType: SQLCompiler.convertSparkTypeToXcalarType(
                                                           cols[i][0].dataType),
                colId: cols[i][0].exprId.id
            };
            if (options && options.renamedCols && options.renamedCols[cols[i][0].exprId.id]) {
                colStruct.rename = options.renamedCols[cols[i][0].exprId.id];
            }
            colInfoArray.push(colStruct);
        }
        return colInfoArray;
    }

    static __prepareWindowOp(
        node: TreeNode,
        options: SQLOption
    ): SQLWindowOpStruct {
        let newCol;
        let opName;
        const args: SQLWindowOperatorArg[] = [];
        // Not supported currently
        let frameInfo;
        // Window functions create new columns, so should be alias node
        SQLUtil.assert(node.value.class ===
                       "org.apache.spark.sql.catalyst.expressions.Alias",
                       SQLErrTStr.NotAliasWindowExpr + node.value.class);
        newCol = SQLCompiler.genSQLColumn(node.value, options);
        const weNode = node.children[0];
        SQLUtil.assert(weNode.value.class ===
                "org.apache.spark.sql.catalyst.expressions.WindowExpression",
                SQLErrTStr.NoWENode + weNode.value.class);
        let curNode = weNode.children[weNode.value.windowFunction];
        if (curNode.value.class === "org.apache.spark.sql.catalyst." +
            "expressions.aggregate.AggregateExpression") {
            curNode = curNode.children[0];
            SQLUtil.assert(curNode.value.class.indexOf(
                "org.apache.spark.sql.catalyst.expressions.aggregate.") != -1,
                "Child of AggregateExpression node should be Aggregate");
            opName = curNode.value.class.substring(
                "org.apache.spark.sql.catalyst.expressions.aggregate.".length);
        } else {
            opName = curNode.value.class.substring(
                "org.apache.spark.sql.catalyst.expressions.".length);
        }
        for (let i = 0; i < curNode.children.length; i++) {
            let argNode = curNode.children[i];
            if (argNode.value.class === "org.apache.spark.sql.catalyst." +
                "expressions.AttributeReference") {
                args.push({colStruct: SQLCompiler.genSQLColumn(argNode.value, options),
                           argType: null});
            } else if (argNode.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Cast") {
                // Happen when applying sum/../avg on int columns. Ignore it
                argNode = argNode.children[0];
                args.push({colStruct: SQLCompiler.genSQLColumn(argNode.value, options),
                           argType: null});
            } else {
                SQLUtil.assert(argNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal",
                    "Arg should be literal if not AR or Cast");
                const type: SQLColumnType = SQLCompiler.convertSparkTypeToXcalarType(
                                                        argNode.value.dataType);
                if (argNode.value.value == null) {
                    args.push({literalEval: type + "(None)", argType: type});
                } else {
                    args.push({literalEval: argNode.value.value, argType: type});
                }
            }
        }
        curNode = weNode.children[weNode.value.windowSpec];
        const frameNode = curNode.children[curNode.value.frameSpecification];
        frameInfo = {
            typeRow: frameNode.value.frameType.object ===
                     "org.apache.spark.sql.catalyst.expressions.RowFrame$",
            upper: null,
            lower: null
        };
        curNode = frameNode.children[frameNode.value.lower];
        if (curNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal") {
            SQLUtil.assert(curNode.value.dataType !== "calendarinterval",
                           SQLErrTStr.CalendarIntervalFrame);
            frameInfo.lower = curNode.value.value * 1;
        } else if (curNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.CurrentRow$") {
            frameInfo.lower = 0;
        }
        curNode = frameNode.children[frameNode.value.upper];
        if (curNode.value.class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal") {
            SQLUtil.assert(curNode.value.dataType !== "calendarinterval",
                           SQLErrTStr.CalendarIntervalFrame);
            frameInfo.upper = curNode.value.value * 1;
        } else if (curNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.CurrentRow$") {
            frameInfo.upper = 0;
        }
        curNode = SQLCompiler.secondTraverse(
                                weNode.children[weNode.value.windowFunction],
                                {}, true, node.tablePrefix);
        newCol.colType = SQLCompiler.getColType(curNode);
        SQLUtil.assert(opName !== "CollectList",
                       "CollectList is not supported in window");
        return {newColStruct: newCol, opName: opName, args: args, frameInfo: frameInfo};
    }

    static __categoryWindowOps(
        opList, options
    ) {
        const retStruct: SQLWindowStruct = {agg: [],
                         first: [],
                         last: [],
                         lead: {},
                         nTile: {newCols: [], groupNums: []},
                         rowNumber: {newCols: []},
                         rank: {newCols: []},
                         percentRank: {newCols: []},
                         cumeDist: {newCols: []},
                         denseRank: {newCols: []}};
        const multiOperations = [];
        for (let i = 0; i < opList.length; i++) {
            let found: boolean = false;
            const opStruct: SQLWindowOpStruct =
                                SQLWindow.__prepareWindowOp(
                                    SQLCompiler.genTree(undefined, opList[i],
                                                options.prefix), options);
            if (opStruct.opName === "First" || opStruct.opName === "Last") {
                const key = opStruct.opName.toLowerCase();
                retStruct[key].forEach(function(obj) {
                    if (JSON.stringify(obj.frameInfo)
                                === JSON.stringify(opStruct.frameInfo)) {
                        obj.newCols.push(opStruct.newColStruct);
                        obj.aggCols.push(opStruct.args[0]);
                        obj.ignoreNulls.push(opStruct.args[1]);
                        found = true;
                    }
                })
                if (!found) {
                    const obj = {newCols: [], aggCols: [], aggTypes: [],
                                 ignoreNulls: [], frameInfo: {}};
                    obj.newCols.push(opStruct.newColStruct);
                    obj.aggCols.push(opStruct.args[0]);
                    obj.ignoreNulls.push(opStruct.args[1]);
                    obj.frameInfo = opStruct.frameInfo;
                    retStruct[key].push(obj);
                }
            } else if (opStruct.opName === "Lead" || opStruct.opName === "Lag") {
                let offset;
                if (opStruct.opName === "Lead") {
                    offset = opStruct.args[1].literalEval;
                } else {
                    offset = Number(opStruct.args[1].literalEval) * -1;
                }
                if (retStruct.lead[offset]) {
                    retStruct.lead[offset].newCols
                                            .push(opStruct.newColStruct);
                    retStruct.lead[offset].keyCols
                                            .push(opStruct.args[0]);
                    retStruct.lead[offset].defaults
                                            .push(opStruct.args[2]);
                } else {
                    retStruct.lead[offset] =
                            {newCols: [opStruct.newColStruct],
                             keyCols: [opStruct.args[0]],
                             defaults: [opStruct.args[2]],
                             offset: offset};
                }
            } else if (opStruct.opName === "NTile") {
                // Ntile should have 1 argument
                // XXX According to definition, it could be some
                // expression but here I assume it as an literal
                // Not sure how to build query with expression in ntile
                SQLUtil.assert(opStruct.args.length === 1 &&
                               opStruct.args[0].literalEval != null,
                               SQLErrTStr.ExprInNtile + opStruct.args);
                SQLUtil.assert(Number(opStruct.args[0].literalEval) > 0,
                               SQLErrTStr.InvalidNtile + opStruct.args[0]);
                retStruct.nTile.groupNums.push(Number(opStruct.args[0].literalEval));
                retStruct.nTile.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "RowNumber") {
                retStruct.rowNumber.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "Rank") {
                retStruct.rank.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "PercentRank") {
                retStruct.percentRank.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "CumeDist") {
                retStruct.cumeDist.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "DenseRank") {
                retStruct.denseRank.newCols.push(opStruct.newColStruct);
            } else if (opStruct.opName === "StddevPop"
                       || opStruct.opName === "StddevSamp"
                       || opStruct.opName === "VariancePop"
                       || opStruct.opName === "VarianceSamp") {
                const aggObj: SQLWindowArgument = {newCols: [], ops: [],
                                    aggCols: [], frameInfo: opStruct.frameInfo};
                aggObj.newCols.push(opStruct.newColStruct);
                aggObj.ops.push(SparkExprToXdf["aggregate." + opStruct.opName]);
                aggObj.aggCols.push(opStruct.args[0]);
                multiOperations.push(aggObj);
            } else {
                if ((opStruct.opName === "Sum" || opStruct.opName === "Max" ||
                opStruct.opName === "Min") && (opStruct.args[0].argType === "int"
                || opStruct.args[0].argType == null
                && opStruct.args[0].colStruct.colType === "int")) {
                    opStruct.opName = opStruct.opName + "Integer";
                } else if ((opStruct.opName === "Sum" || opStruct.opName === "Max"
                || opStruct.opName === "Min" || opStruct.opName === "Average")
                && (opStruct.args[0].argType === "money" || opStruct.args[0].argType == null
                && opStruct.args[0].colStruct.colType === "money")) {
                    opStruct.opName = opStruct.opName + "Numeric";
                }
                retStruct.agg.forEach(function(aggObj) {
                    if (JSON.stringify(aggObj.frameInfo)
                                === JSON.stringify(opStruct.frameInfo)) {
                        aggObj.newCols.push(opStruct.newColStruct);
                        aggObj.ops.push(SparkExprToXdf["aggregate." + opStruct.opName]);
                        aggObj.aggCols.push(opStruct.args[0]);
                        found = true;
                    }
                })
                if (!found) {
                    const aggObj: SQLWindowArgument = {newCols: [], ops: [],
                                    aggCols: [], frameInfo: opStruct.frameInfo};
                    aggObj.newCols.push(opStruct.newColStruct);
                    aggObj.ops.push(SparkExprToXdf["aggregate." + opStruct.opName]);
                    aggObj.aggCols.push(opStruct.args[0]);
                    retStruct.agg.push(aggObj);
                }
            }
        }
        retStruct.agg = retStruct.agg.concat(multiOperations);
        return retStruct;
    }

    static __genGroupByTable(ret, operators, groupByCols,
                            aggColNames, windowStruct): XDPromise<CliStruct> {
        const deferred = PromiseHelper.deferred();
        // Save original table for later use
        windowStruct.origTableName = ret.newTableName;
        windowStruct.cli += ret.cli;
        let tableId = xcHelper.getTableId(windowStruct.origTableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        windowStruct.gbTableName  = "XC_GB_Table" + tableId
                                    + "_" + Authentication.getHashId();
        if (!windowStruct.tempGBCols) {
            windowStruct.tempGBCols = [];
            for (let i = 0; i < operators.length; i++) {
                windowStruct.tempGBCols.push("XC_" + operators[i].toUpperCase()
                    + "_" + tableId
                    + "_" + Authentication.getHashId().substring(3));
            }
        }
        // If the new column will be added to usrCols later
        // don't add it to gbColInfo (will later concat to xcCols) here
        const resultGBCols = SQLCompiler.deleteIdFromColInfo(groupByCols);
        windowStruct.resultGBCols = resultGBCols;
        if (windowStruct.addToUsrCols) {
            windowStruct.gbColInfo = resultGBCols;
        } else {
            windowStruct.gbColInfo = windowStruct.tempGBCols.map(function(colName) {
                                         return {colName: colName, colType: "DfUnknown"};
                                     }).concat(resultGBCols);
        }
        const gbArgs = [];
        for (let i = 0; i < operators.length; i++) {
            gbArgs.push({operator: operators[i], aggColName: aggColNames[i],
                         newColName: windowStruct.tempGBCols[i]})
        }
        SQLSimulator.groupBy(groupByCols.map(function(col) {
                            return SQLCompiler.getCurrentName(col);}),
                        gbArgs, windowStruct.origTableName,
                        {newTableName: windowStruct.gbTableName})
        .then(function(ret) {
            deferred.resolve(ret);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __joinTempTable(ret, joinType, leftJoinCols, rightJoinCols,
                                windowStruct, nullSafe = false): XDPromise<CliStruct> {
        const deferred = PromiseHelper.deferred();
        windowStruct.cli += ret.cli;
        if (leftJoinCols.length === 0) {
            joinType = JoinOperatorT.CrossJoin;
        }
        const lTableInfo = {
            "tableName": windowStruct.joinRetAsLeft ?
                         ret.newTableName : windowStruct.leftTableName,
            "columns": leftJoinCols.map(function(col) {
                            return SQLCompiler.getCurrentName(col);}),
            "rename": []
        };
        const rTableInfo = {
            "tableName": windowStruct.joinRetAsLeft ?
                         windowStruct.rightTableName : ret.newTableName,
            "columns": rightJoinCols.map(function(col) {
                            return SQLCompiler.getCurrentName(col);}),
            "rename": []
        }
        let newRenames;
        if (windowStruct.renameFromCols) {
            // Make a copy of renameFromCols to avoid change by other reference
            windowStruct.renameFromCols = jQuery.extend(true, [],
                                          windowStruct.renameFromCols);
            const targetCols = Array(windowStruct.renameFromCols.length);
            const renamed = Array(windowStruct.renameFromCols.length);
            renamed.fill(false, 0, renamed.length);
            // Find the target column struct and rename it before resolve collision
            windowStruct.rightColInfo.forEach(function(item) {
                const colIndex = windowStruct.renameFromCols.map(function(col) {
                                   return SQLCompiler.getCurrentName(col);
                               }).indexOf(SQLCompiler.getCurrentName(item));
                if (colIndex != -1) {
                    item.colName = SQLCompiler.getCurrentName(windowStruct
                                                .renameToUsrCols[colIndex]);
                    item.colId = windowStruct.renameToUsrCols[colIndex].colId;
                    delete item.rename;
                    targetCols[colIndex] = item;
                }
            });
            newRenames = SQLCompiler.resolveCollision(windowStruct.leftColInfo,
                windowStruct.rightColInfo, lTableInfo.rename, rTableInfo.rename,
                lTableInfo.tableName, rTableInfo.tableName);
            // This struct is used by backend, so need to replace
            // target column name with column name before rename
            rTableInfo.rename.forEach(function(item) {
                const colIndex = windowStruct.renameToUsrCols.map(function(col) {
                                   return SQLCompiler.getCurrentName(col);
                               }).indexOf(item.orig);
                if (colIndex != -1) {
                    item.orig = SQLCompiler.getCurrentName(windowStruct.renameFromCols[colIndex]);
                    renamed[colIndex] = true;
                }
            });
            // If it is not renamed, add the rename info into rTableInfo.rename
            for (let i = 0; i < renamed.length; i++) {
                if (!renamed[i]) {
                    rTableInfo.rename.push(
                        {"new": SQLCompiler.getCurrentName(windowStruct.renameToUsrCols[i]),
                        "orig": SQLCompiler.getCurrentName(windowStruct.renameFromCols[i]),
                        "type": DfFieldTypeT.DfUnknown}); // XXX Not sure with type
                }
                windowStruct.rightColInfo.splice(windowStruct.rightColInfo
                                         .indexOf(targetCols[i]),1);
                windowStruct.node.usrCols.push(targetCols[i]);
            }
        } else if (windowStruct.addToUsrCols) {
            newRenames = SQLCompiler.resolveCollision(windowStruct.leftColInfo,
                windowStruct.rightColInfo.concat(windowStruct.addToUsrCols),
                lTableInfo.rename, rTableInfo.rename,
                lTableInfo.tableName, rTableInfo.tableName);
        } else {
            newRenames = SQLCompiler.resolveCollision(windowStruct.leftColInfo,
                                            windowStruct.rightColInfo,
                                            lTableInfo.rename, rTableInfo.rename,
                                    lTableInfo.tableName, rTableInfo.tableName);
        }
        // If left table is the trunk table, modify column info of node
        // otherwise modify temp column info
        if (windowStruct.node) {
            windowStruct.node.xcCols = windowStruct.node.xcCols
                                            .concat(windowStruct.rightColInfo);
            if (windowStruct.addToUsrCols) {
                windowStruct.node.usrCols = windowStruct.node.usrCols
                                            .concat(windowStruct.addToUsrCols);
            }
            windowStruct.node.renamedCols = SQLCompiler.combineRenameMaps(
                                [windowStruct.node.renamedCols, newRenames]);
        } else {
            windowStruct.leftColInfo = windowStruct.leftColInfo
                                            .concat(windowStruct.rightColInfo);
            windowStruct.leftRename = SQLCompiler.combineRenameMaps(
                                [windowStruct.leftRename,newRenames]);
        }
        let evalString = "";
        if (joinType === JoinOperatorT.CrossJoin) {
            for (let i = 0; i < leftJoinCols.length; i++) {
                if (evalString === "") {
                    evalString = "eq(" + SQLCompiler.getCurrentName(leftJoinCols[i]) +
                                 "," + SQLCompiler.getCurrentName(rightJoinCols[i]) + ")";
                } else {
                    evalString = "and(" + evalString + "," + "eq("
                                 + SQLCompiler.getCurrentName(leftJoinCols[i]) + ","
                                 + SQLCompiler.getCurrentName(rightJoinCols[i]) + "))";
                }
            }
            lTableInfo.columns = [];
            rTableInfo.columns = [];
        }
        SQLSimulator.join(joinType, lTableInfo, rTableInfo, {evalString: evalString,
                                nullSafe: nullSafe == null ? false : nullSafe,
                                keepAllColumns: false})
        .then(function(ret) {
            deferred.resolve(ret);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __groupByAndJoinBack(ret, operators, groupByCols,
                    aggColNames, joinType, windowStruct): XDPromise<CliStruct> {
        const deferred = PromiseHelper.deferred();
        if (windowStruct.addToUsrCols) {
            windowStruct.tempGBCols = windowStruct.addToUsrCols.map(function(col) {
                return SQLCompiler.getCurrentName(col);
            });
        }
        SQLWindow.__genGroupByTable(ret, operators, groupByCols,
                                                aggColNames, windowStruct)
        .then(function(ret) {
            windowStruct.leftTableName = windowStruct.origTableName;
            windowStruct.rightColInfo = windowStruct.gbColInfo;
            return ret;
        })
        .then(function(ret) {
            if (windowStruct.joinBackByIndex) {
                SQLUtil.assert(windowStruct.tempGBCols.length === 1, "TempGBCols should have length 1");
                let rightIndexColStruct;
                for (let i = 0; i < windowStruct.rightColInfo.length; i++) {
                    if (SQLCompiler.getCurrentName(windowStruct.rightColInfo[i])
                        === windowStruct.tempGBCols[0]) {
                        rightIndexColStruct = windowStruct.rightColInfo[i];
                        break;
                    }
                }
                return SQLWindow.__joinTempTable(ret, joinType,
                            [windowStruct.indexColStruct],
                            [rightIndexColStruct], windowStruct, true);
            }
            return SQLWindow.__joinTempTable(ret, joinType, groupByCols,
                                windowStruct.resultGBCols, windowStruct, true);
        })
        .then(function(ret) {
            if (ret.tempCols) {
                if (windowStruct.node) {
                    windowStruct.node.xcCols = windowStruct.node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: "DfUnknown"}; // XXX xiApi temp columns
                                        }));
                } else {
                    windowStruct.leftColInfo = windowStruct.leftColInfo
                        .concat(ret.tempCols.map(function(colName) {
                            return {colName: colName,
                                    colType: "DfUnknown"}; // XXX xiApi temp columns
                        }));
                }
            }
            deferred.resolve(ret);
        })
        .fail(deferred.reject);
        return deferred;
    }

    // XXX should add collision detection
    static windowExpressionHelper(
        loopStruct: SQLLoopStruct,
        curPromise: XDPromise<any>,
        opName: string,
        opStruct: SQLWindowArgument
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        const node = loopStruct.node;
        let cli = "";
        const groupByCols = loopStruct.groupByCols;
        const sortColsAndOrder = loopStruct.sortColsAndOrder;
        const indexColStruct = loopStruct.indexColStruct;
        const newColStructs = opStruct.newCols;
        curPromise = curPromise.then(function(ret) {
            const newRenames = SQLCompiler.resolveCollision(
                                node.usrCols.concat(node.xcCols)
                                            .concat(node.sparkCols),
                                newColStructs, [], [], "",
                                node.children[0].newTableName);
            node.renamedCols = SQLCompiler.combineRenameMaps([node.renamedCols,
                                                              newRenames]);
            return ret;
        });

        switch (opName) {
            case ("agg"): {
                // Common aggregate expressions, do a group by
                // and join back
                let windowStruct;
                const mapStrs = [];
                const newColNames = [];
                const tempColStructs = [];
                const tempColsToKeep: SQLColumn[] = opStruct.tempColsToKeep || [];
                // Handle literal aggregate case: create temp column of that literal value
                for (const i in opStruct.aggCols) {
                    if (opStruct.aggCols[i].argType) {
                        mapStrs.push(opStruct.aggCols[i].argType + "("
                                     + opStruct.aggCols[i].literalEval + ")");
                        const tempColName = SQLCompiler.cleanseColName(
                                          "XC_WINDOW_" + opStruct.aggCols[i].argType +
                                          "_" + opStruct.aggCols[i].literalEval +
                                          "_" + Authentication.getHashId()
                                          .substring(3) + "_"+ i);
                        newColNames.push(tempColName);
                        tempColStructs.push({colName: tempColName});
                        opStruct.aggCols[i].colStruct = tempColStructs[tempColStructs.length - 1];
                    }
                }
                if (mapStrs.length !== 0) {
                    node.xcCols = node.xcCols.concat(tempColStructs);
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        return SQLSimulator.map(mapStrs, ret.newTableName, newColNames);
                    });
                }
                if (opStruct.frameInfo.lower == undefined
                    && opStruct.frameInfo.upper == undefined) {
                    curPromise = curPromise.then(function(ret) {
                        const aggColNames = [];
                        for (const i in opStruct.aggCols) {
                            aggColNames.push(SQLCompiler.getCurrentName(
                                                opStruct.aggCols[i].colStruct));
                        }
                        node.xcCols = [indexColStruct].concat(tempColsToKeep);
                        windowStruct = {leftColInfo: node.usrCols
                                            .concat(node.xcCols)
                                            .concat(node.sparkCols),
                                        node: node, cli: "",
                                        addToUsrCols: newColStructs};
                        return SQLWindow.__groupByAndJoinBack(ret, opStruct.ops,
                                                    groupByCols, aggColNames,
                                                    JoinOperatorT.InnerJoin,
                                                    windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        return ret;
                    });
                } else {
                    let origTableName;
                    let leftIndexStruct;
                    let rightIndexStruct;
                    const leftGBColStructs = [];
                    const rightGBColStructs = [];
                    const rightAggColStructs = [];
                    const leftOrderColStructs = [];
                    const rightOrderColStructs = [];
                    const leftCols = [];
                    const rightCols = [];
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        origTableName = ret.newTableName;
                        const lTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        const rTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        const joinType = groupByCols.length === 0 ?
                            JoinOperatorT.CrossJoin : JoinOperatorT.InnerJoin;
                        // It's very compilated to make useful column list here
                        // So just keep all and drop redundants at the end
                        node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                                    .forEach(function(item) {
                            const lColStruct = {
                                colName: SQLCompiler.getCurrentName(item),
                                colType: item.colType
                            };
                            const rColStruct = {
                                colName: SQLCompiler.getCurrentName(item),
                                colType: item.colType
                            };
                            leftCols.push(lColStruct);
                            rightCols.push(rColStruct);
                            if (item === indexColStruct) {
                                leftIndexStruct = lColStruct;
                                rightIndexStruct = rColStruct;
                            }
                            for (let i = 0; i < groupByCols.length; i++) {
                                if (groupByCols[i].colId === item.colId) {
                                    leftGBColStructs.push(lColStruct);
                                    rightGBColStructs.push(rColStruct);
                                    lTableInfo.columns.push(
                                        SQLCompiler.getCurrentName(lColStruct));
                                    rTableInfo.columns.push(
                                        SQLCompiler.getCurrentName(rColStruct));
                                    break;
                                }
                            }
                            for (let i = 0; i < opStruct.aggCols.length; i++) {
                                if (opStruct.aggCols[i].colStruct.colId &&
                                    opStruct.aggCols[i].colStruct.colId === item.colId ||
                                    SQLCompiler.getCurrentName(opStruct.aggCols[i].colStruct)
                                    === SQLCompiler.getCurrentName(item)) {
                                    rightAggColStructs[i] = rColStruct;
                                }
                            }
                            for (let i = 0; i < sortColsAndOrder.length; i++) {
                                if (sortColsAndOrder[i].colId === item.colId) {
                                    const lSortColStruct = {colStruct: lColStruct,
                                                            ordering: sortColsAndOrder[i].ordering};
                                    const rSortColStruct = {colStruct: rColStruct,
                                                            ordering: sortColsAndOrder[i].ordering};
                                    leftOrderColStructs.push(lSortColStruct);
                                    rightOrderColStructs.push(rSortColStruct);
                                    break;
                                }
                            }
                        });
                        SQLCompiler.resolveCollision(leftCols, rightCols,
                                           lTableInfo.rename, rTableInfo.rename,
                                           ret.newTableName, ret.newTableName);
                        const evalString = SQLWindow.__generateFrameEvalString(
                                        opStruct, [], [], leftIndexStruct,
                                        rightIndexStruct, leftOrderColStructs,
                                        rightOrderColStructs);
                        return SQLSimulator.join(joinType, lTableInfo, rTableInfo,
                                        {evalString: evalString, nullSafe: true,
                                         keepAllColumns: false});
                    })
                    .then(function(ret) {
                        node.xcCols = [indexColStruct].concat(tempColsToKeep);
                        windowStruct = {leftColInfo: node.usrCols
                                        .concat(node.xcCols).concat(node.sparkCols),
                                        node: node, cli: "",
                                        addToUsrCols: newColStructs,
                                        tempGBCols: newColStructs.map(function(col) {
                                            return SQLCompiler.getCurrentName(col);
                                        })};
                        const aggColNames = [];
                        for (let i = 0; i < opStruct.aggCols.length; i++) {
                            aggColNames.push(SQLCompiler.getCurrentName(
                                                        rightAggColStructs[i]));
                        }
                        return SQLWindow.__genGroupByTable(ret, opStruct.ops,
                                  [leftIndexStruct], aggColNames, windowStruct);
                    })
                    .then(function(ret) {
                        windowStruct.leftTableName = origTableName;
                        windowStruct.rightColInfo = windowStruct.gbColInfo;
                        return SQLWindow.__joinTempTable(ret,
                                JoinOperatorT.LeftOuterJoin, [indexColStruct],
                                [leftIndexStruct], windowStruct);
                    })
                    .then(function(ret) {
                        if (ret.tempCols) {
                            node.xcCols = node.xcCols.concat(ret.tempCols
                                            .map(function(colName) {
                                                return {colName: colName}; // XXX xiApi temp columns
                                            }));
                        }
                        cli += windowStruct.cli;

                        const columnListForMap = [];
                        for (let i = 0; i < opStruct.ops.length; i++) {
                            if (opStruct.ops[i] === "count") {
                                columnListForMap.push(opStruct.newCols[i]);
                            }
                        }
                        if (columnListForMap.length === 0) {
                            return ret;
                        } else {
                            cli += ret.cli;
                            const mapStrList = [];
                            for (let i = 0; i < columnListForMap.length; i++) {
                                const curMapStr = "ifInt(exists(" +
                                SQLCompiler.getCurrentName(columnListForMap[i]) + ")," +
                                SQLCompiler.getCurrentName(columnListForMap[i]) + ",0)";
                                mapStrList.push(curMapStr);
                            }
                            return SQLSimulator.map(mapStrList, ret.newTableName,
                                    columnListForMap.map(function(col) {
                                        return SQLCompiler.getCurrentName(col);
                                    }));
                        }
                    })
                }
                break;
            }
            case ("first"):
            case ("last"): {
                // assert(sortColsAndOrder.length > 0, SQLErrTStr.NoSortFirst);
                let windowStruct;
                // Generate a temp table only contain the
                // first/last row of each partition by getting
                // minimum/maximum row number in each partition
                // and left semi join back
                const mapStrs = [];
                const newColNames = [];
                const tempColStructs = [];
                const tempColsToKeep = opStruct.tempColsToKeep || [];
                const colIdsUsed = [];
                for (const i in opStruct.aggCols) {
                    if (opStruct.aggCols[i].argType) {
                        mapStrs.push(opStruct.aggCols[i].argType + "("
                                     + opStruct.aggCols[i].literalEval + ")");
                        const tempColName = SQLCompiler.cleanseColName("XC_WINDOW_"
                                    + opStruct.aggCols[i].argType + "_"
                                    + opStruct.aggCols[i].literalEval + "_"
                                    + Authentication.getHashId().substring(3)
                                    + "_" + i);
                        newColNames.push(tempColName);
                        tempColStructs.push({colName: tempColName});
                        opStruct.aggCols[i].colStruct = tempColStructs[tempColStructs.length - 1];
                    } else if (colIdsUsed.indexOf(opStruct.aggCols[i].colStruct.colId) !== -1) {
                        // If same column is used in multiple first/last, need to make copy first
                        mapStrs.push(opStruct.aggCols[i].colStruct.colType + "("
                                     + SQLCompiler.getCurrentName(opStruct.aggCols[i].colStruct) + ")");
                        const tempColName = SQLCompiler.cleanseColName("XC_WINDOW_"
                                                + opStruct.aggCols[i].colStruct.colName + "_"
                                                + Authentication.getHashId().substring(3)
                                                + "_" + i);
                        newColNames.push(tempColName);
                        tempColStructs.push({colName: tempColName});
                        opStruct.aggCols[i].colStruct = tempColStructs[tempColStructs.length - 1];
                    } else {
                        colIdsUsed.push(opStruct.aggCols[i].colStruct.colId);
                    }
                }
                if (mapStrs.length !== 0) {
                    node.xcCols = node.xcCols.concat(tempColStructs);
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        return SQLSimulator.map(mapStrs, ret.newTableName,
                                                newColNames);
                    });
                }
                if (opStruct.frameInfo.lower == undefined && opName === "first" ||
                    opStruct.frameInfo.upper == undefined && opName === "last") {
                    curPromise = curPromise.then(function(ret) {
                        windowStruct = {cli: ""};
                        windowStruct.node = node;
                        // Columns in temp table should not have id
                        windowStruct.leftColInfo =
                            SQLCompiler.deleteIdFromColInfo(jQuery.extend(true,
                            [], node.usrCols.concat(node.xcCols)
                                            .concat(node.sparkCols)));
                        windowStruct.leftRename = [];
                        let gbOpName;
                        if (opName === "last") {
                            gbOpName = "max";
                        } else {
                            gbOpName = "min";
                        }
                        // The flag joinBackByIndex is used when we
                        // want to join back by other column
                        // = result column of group by
                        // rather than groupByCols = groupByCols
                        // In that case, indexColStruct should be set
                        windowStruct.joinBackByIndex = true;
                        windowStruct.indexColStruct = indexColStruct;
                        return SQLWindow.__groupByAndJoinBack(ret,
                                    [gbOpName], groupByCols,
                                    [SQLCompiler.getCurrentName(indexColStruct)],
                                    JoinOperatorT.LeftSemiJoin,
                                    windowStruct);
                    })
                    // Inner join original table and temp table
                    // rename the column needed
                    .then(function(ret) {
                        // If renameFromCol and renameToUsrCol are
                        // specified, helper function will rename
                        // the column and move that column to usrCols
                        windowStruct.renameFromCols = opStruct.aggCols.map(function(arg) {
                                                            return arg.colStruct;
                                                        });
                        windowStruct.renameToUsrCols = newColStructs;
                        const rightGBColStructs = [];
                        for (let i = 0; i < groupByCols.length; i++) {
                            for (let j = 0; j < windowStruct.leftColInfo.length; j++) {
                                if (SQLCompiler.getCurrentName(
                                        windowStruct.leftColInfo[j]) ===
                                    SQLCompiler.getCurrentName(groupByCols[i])) {
                                    rightGBColStructs.push(windowStruct.leftColInfo[j]);
                                    break;
                                }
                            }
                        }
                        windowStruct.rightColInfo = jQuery.extend(true, [],
                                                    windowStruct.renameFromCols
                                                    .concat(rightGBColStructs));
                        node.xcCols = [indexColStruct].concat(tempColsToKeep);
                        windowStruct.leftColInfo = node.usrCols
                                                       .concat(node.xcCols)
                                                       .concat(node.sparkCols);
                        return SQLWindow.__joinTempTable(ret,
                                        JoinOperatorT.InnerJoin, groupByCols,
                                        rightGBColStructs, windowStruct, true);
                    });
                } else {
                    // Frame case, first do a join and groupby to get index map
                    // Then join original table on both sides to get result
                    let origTableName;
                    let leftIndexStruct;
                    let rightIndexStruct;
                    const indexColStructCopy = {colName: SQLCompiler.getCurrentName(indexColStruct),
                                              colType: indexColStruct.colType};
                    const leftGBColStructs = [];
                    const rightGBColStructs = [];
                    const leftAggColStructs = [];
                    const leftOrderColStructs = [];
                    const rightOrderColStructs = [];
                    const leftCols = [];
                    const rightCols = [];
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        origTableName = ret.newTableName;
                        const lTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        const rTableInfo = {
                            "tableName": ret.newTableName,
                            "columns": [],
                            "rename": []
                        };
                        const joinType = groupByCols.length === 0 ?
                            JoinOperatorT.CrossJoin : JoinOperatorT.InnerJoin;
                        node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                            .forEach(function(item) {
                            const lColStruct = {
                                colName: SQLCompiler.getCurrentName(item),
                                colType: item.colType
                            };
                            const rColStruct = {
                                colName: SQLCompiler.getCurrentName(item),
                                colType: item.colType
                            };
                            leftCols.push(lColStruct);
                            rightCols.push(rColStruct);
                            if (item === indexColStruct) {
                                leftIndexStruct = lColStruct;
                                rightIndexStruct = rColStruct;
                            }
                            for (let i = 0; i < groupByCols.length; i++) {
                                if (groupByCols[i].colId === item.colId) {
                                    leftGBColStructs.push(lColStruct);
                                    rightGBColStructs.push(rColStruct);
                                    lTableInfo.columns.push(
                                        SQLCompiler.getCurrentName(lColStruct));
                                    rTableInfo.columns.push(
                                        SQLCompiler.getCurrentName(rColStruct));
                                    break;
                                }
                            }
                            for (let i = 0; i < opStruct.aggCols.length; i++) {
                                if (opStruct.aggCols[i].colStruct.colId &&
                                    opStruct.aggCols[i].colStruct.colId === item.colId ||
                                    SQLCompiler.getCurrentName(opStruct.aggCols[i].colStruct)
                                    === SQLCompiler.getCurrentName(item)) {
                                    leftAggColStructs[i] = lColStruct;
                                    break;
                                }
                            }
                            for (let i = 0; i < sortColsAndOrder.length; i++) {
                                if (sortColsAndOrder[i].colId === item.colId) {
                                    const lSortColStruct = {colStruct: lColStruct,
                                                            ordering: sortColsAndOrder[i].ordering};
                                    const rSortColStruct = {colStruct: rColStruct,
                                                            ordering: sortColsAndOrder[i].ordering};
                                    leftOrderColStructs.push(lSortColStruct);
                                    rightOrderColStructs.push(rSortColStruct);
                                    break;
                                }
                            }
                        });
                        SQLCompiler.resolveCollision(leftCols, rightCols,
                                           lTableInfo.rename, rTableInfo.rename,
                                           ret.newTableName, ret.newTableName);
                        const evalString = SQLWindow.__generateFrameEvalString(
                                        opStruct, [], [], leftIndexStruct,
                                        rightIndexStruct, leftOrderColStructs,
                                        rightOrderColStructs);
                        return SQLSimulator.join(joinType, lTableInfo, rTableInfo,
                                      {evalString: evalString, nullSafe: true,
                                       keepAllColumns: false});
                    })
                    .then(function(ret) {
                        windowStruct = {leftColInfo: node.usrCols
                                        .concat(node.xcCols).concat(node.sparkCols),
                                        node: node, cli: ""};
                        const aggColNames = [SQLCompiler.getCurrentName(
                                                             rightIndexStruct)];
                        let gbOpName;
                        if (opName === "last") {
                            gbOpName = "max";
                        } else {
                            gbOpName = "min";
                        }
                        return SQLWindow.__genGroupByTable(ret, [gbOpName],
                                [leftIndexStruct], aggColNames, windowStruct);
                    })
                    .then(function(ret) {
                        // Update right index with result of min/max
                        rightIndexStruct = {colName: windowStruct.tempGBCols[0],
                                            colType: "int"};
                        windowStruct.leftTableName = origTableName;
                        windowStruct.rightColInfo = windowStruct.gbColInfo;
                        return SQLWindow.__joinTempTable(ret,
                                JoinOperatorT.LeftOuterJoin, [indexColStruct],
                                [leftIndexStruct], windowStruct);
                    })
                    .then(function(ret) {
                        windowStruct.rightColInfo = leftAggColStructs.concat([indexColStructCopy]);
                        windowStruct.rightTableName = origTableName;
                        node.xcCols = [indexColStruct, rightIndexStruct].concat(tempColsToKeep);
                        windowStruct.leftColInfo = node.usrCols
                                    .concat(node.xcCols).concat(node.sparkCols);
                        windowStruct.renameFromCols = leftAggColStructs;
                        windowStruct.renameToUsrCols = newColStructs;
                        windowStruct.joinRetAsLeft = true;

                        return SQLWindow.__joinTempTable(ret,
                                JoinOperatorT.LeftOuterJoin, [rightIndexStruct],
                                [indexColStructCopy], windowStruct);
                    });
                }
                // windowStruct.cli contains the clis for one
                // operation before window and all the
                // windowStruct involved operations except for
                // last one, which will be added in next then
                curPromise = curPromise.then(function(ret) {
                    if (ret.tempCols) { // This needed or not depends on behavior of innerjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: null};
                                        }));
                    }
                    cli += windowStruct.cli;
                    return ret;
                });
                break;
            }
            case ("lead"): {
                let windowStruct;
                const rightKeyColStructs = [];
                opStruct.colStructTrack = Array(opStruct.keyCols.length);
                const keyColIds = opStruct.keyCols.map(function(item) {
                    return item.colStruct ? item.colStruct.colId : undefined;
                })
                const keyColNames = [];
                const mapStrs = [];
                const newColNames = [];
                const tempColStructs = [];
                const tempColsToKeep = opStruct.tempColsToKeep || [];
                // Handle literal arguments by creating columns
                for (const i in opStruct.keyCols) {
                    if (opStruct.keyCols[i].argType) {
                        mapStrs.push(opStruct.keyCols[i].argType + "(" +
                                     opStruct.keyCols[i].literalEval + ")");
                        const tempColName = SQLCompiler.cleanseColName("XC_WINDOW_" +
                                    opStruct.keyCols[i].argType + "_" +
                                    opStruct.keyCols[i].literalEval + "_" +
                                    Authentication.getHashId().substring(3) +
                                    "_" + i);
                        newColNames.push(tempColName);
                        keyColNames.push(tempColName);
                        tempColStructs.push({colName: tempColName, colType: opStruct.keyCols[i].argType});
                        opStruct.keyCols[i].colStruct =
                                      tempColStructs[tempColStructs.length - 1];
                    } else {
                        keyColNames.push(SQLCompiler.getCurrentName(
                                                opStruct.keyCols[i].colStruct));
                    }
                }
                if (mapStrs.length !== 0) {
                    curPromise = curPromise.then(function(ret) {
                        cli += ret.cli;
                        return SQLSimulator.map(mapStrs, ret.newTableName,
                                                newColNames);
                    });
                }
                windowStruct = {cli: "",node: node};
                const leftJoinCols = [];
                const rightJoinCols = [];
                let newIndexColName;
                let newIndexColStruct;
                // Map on index column with offset
                curPromise = curPromise.then(function(ret) {
                    windowStruct.leftTableName = ret.newTableName;
                    cli += ret.cli;
                    node.xcCols = [indexColStruct].concat(tempColStructs)
                                            .concat(tempColsToKeep);
                    windowStruct.leftColInfo = node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols);
                    windowStruct.rightColInfo = jQuery.extend(true, [],
                                        node.usrCols.concat(node.xcCols)
                                        .concat(node.sparkCols));
                    node.usrCols.forEach(function(item) {
                        for (let i = 0; i < groupByCols.length; i++) {
                            if (item.colId === groupByCols[i].colId) {
                                leftJoinCols[i] = item;
                                break;
                            }
                        }
                    });
                    windowStruct.rightColInfo.forEach(function(item) {
                        if (item.colId && keyColIds.indexOf(item.colId) != -1 ||
                            keyColNames.indexOf(SQLCompiler.getCurrentName(item))
                            != -1) {
                            if (item.colId && keyColIds.indexOf(item.colId) != -1) {
                                for (let i = 0; i < keyColIds.length; i++) {
                                    if (keyColIds[i] === item.colId) {
                                        opStruct.colStructTrack[i] = item;
                                    }
                                }
                            } else {
                                for (let i = 0; i < keyColNames.length; i++) {
                                    if (keyColNames[i] === SQLCompiler.getCurrentName(item)) {
                                        opStruct.colStructTrack[i] = item;
                                    }
                                }
                            }
                            rightKeyColStructs.push(item);
                        }
                        for (let i = 0; i < groupByCols.length; i++) {
                            if (item.colId === groupByCols[i].colId) {
                                rightJoinCols[i] = item;
                                break;
                            }
                        }
                        delete item.colId;
                    });
                    newIndexColName = SQLCompiler.getCurrentName(indexColStruct)
                           + "_right" + Authentication.getHashId().substring(3);
                    newIndexColStruct = {colName: newIndexColName,
                                         colType: SQLColumnType.Integer};
                    windowStruct.rightColInfo = rightKeyColStructs.concat(rightJoinCols).concat([newIndexColStruct]);
                    let mapStr;
                    mapStr = "subInteger(" + SQLCompiler.getCurrentName(indexColStruct)
                                 + ", " + opStruct.offset + ")";
                    return SQLSimulator.map([mapStr], windowStruct.leftTableName,
                                            [newIndexColName]);
                })
                // Outer join back with index columnm
                .then(function(ret) {
                    // Not cross join because group on index which cannot be FNF
                    return SQLWindow.__joinTempTable(ret,
                            JoinOperatorT.LeftOuterJoin,
                            [{colName: SQLCompiler.getCurrentName(indexColStruct),
                              colType: SQLColumnType.Integer}],
                            [newIndexColStruct], windowStruct);
                });
                // Map again to set default value
                curPromise = curPromise.then(function(ret) {
                    if (ret.tempCols) { // This needed or not depends on behavior of leftouterjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: null}; // XXX xiApi temp columns
                                        }));
                    }
                    cli += windowStruct.cli;
                    cli += ret.cli;
                    node.usrCols = node.usrCols.concat(newColStructs);
                    const mapStrs = [];
                    for (let i = 0; i < opStruct.colStructTrack.length; i++) {
                        let mapStr = "if(";
                        switch (opStruct.colStructTrack[i].colType) {
                            case ("int"):
                                mapStr = "ifInt(";
                                break;
                            case ("string"):
                                mapStr = "ifStr(";
                                break;
                            case ("timestamp"):
                                mapStr = "ifTimestamp";
                                break;
                            case ("money"):
                                mapStr = "ifNumeric(";
                                break;
                            default:
                                break;
                        }
                        let defaultValue: string = opStruct.defaults[i].literalEval;
                        if (opStruct.defaults[i].argType === "string") {
                            defaultValue = JSON.stringify(defaultValue);
                        } else if (opStruct.defaults[i].argType == null) {
                            if (node.renamedCols[opStruct.defaults[i].colStruct.colId]) {
                                defaultValue = node.renamedCols[opStruct.defaults[i].colStruct.colId];
                            } else {
                                defaultValue = SQLCompiler.getCurrentName(opStruct.defaults[i].colStruct);
                            }
                        }
                        // Need to check rename here
                        for (let j = 0; j < leftJoinCols.length - 1; j++) {
                            mapStr += "and(eq(" +
                            SQLCompiler.getCurrentName(leftJoinCols[j]) + ", " +
                            SQLCompiler.getCurrentName(rightJoinCols[j]) + "),";
                        }
                        if (groupByCols.length === 0) {
                            mapStr += "exists(" +
                                SQLCompiler.getCurrentName(newIndexColStruct) +
                                "), " +
                                SQLCompiler.getCurrentName(opStruct.colStructTrack[i])
                                + ", " + defaultValue + ")";
                        } else {
                            mapStr += "eq(" +
                                SQLCompiler.getCurrentName(
                                leftJoinCols[leftJoinCols.length - 1]) + ", " +
                                SQLCompiler.getCurrentName(
                                rightJoinCols[leftJoinCols.length - 1]) + ")" +
                                Array(leftJoinCols.length).join(")") + ", " +
                                SQLCompiler.getCurrentName(opStruct.colStructTrack[i])
                                + ", " + defaultValue + ")";
                        }
                        mapStrs.push(mapStr);
                    }
                    return SQLSimulator.map(mapStrs, ret.newTableName,
                                    newColStructs.map(function(col) {
                                        return SQLCompiler.getCurrentName(col);
                                    }));
                });
                break;
            }
            // Rank function
            case ("nTile"):
                const groupNums = opStruct.groupNums;
            case ("rowNumber"): {
                let windowStruct;
                // Group by and join back to generate minimum row number
                // in each partition
                curPromise = curPromise.then(function(ret) {
                    node.xcCols = [indexColStruct];
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    return SQLWindow.__groupByAndJoinBack(ret, ["min"],
                                groupByCols,
                                [SQLCompiler.getCurrentName(indexColStruct)],
                                JoinOperatorT.InnerJoin, windowStruct);
                });
                if (opName === "rowNumber") {
                    // Row number = index - minIndexOfPartition + 1
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        node.usrCols = node.usrCols.concat(newColStructs);
                        const mapStr = "addInteger(subInteger(" +
                                    SQLCompiler.getCurrentName(indexColStruct) +
                                    ", " + windowStruct.tempGBCols[0] + "), 1)";
                        const mapStrs = Array(newColStructs.length).fill(mapStr);
                        return SQLSimulator.map(mapStrs, ret.newTableName,
                                    newColStructs.map(function(col) {
                                        return SQLCompiler.getCurrentName(col);
                                    }));
                    });
                } else {
                    // ntile = int((index - minIndexOfPartition)
                    // * groupNum / sizeOfPartition + 1)
                    // Here use count group by partition columns
                    // to generate partition size
                    let tempMinIndexColName;
                    curPromise = curPromise.then(function(ret){
                        cli += windowStruct.cli;
                        tempMinIndexColName = windowStruct.tempGBCols[0];
                        windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                        return SQLWindow.__groupByAndJoinBack(ret, ["count"],
                                groupByCols,
                                [SQLCompiler.getCurrentName(indexColStruct)],
                                JoinOperatorT.InnerJoin, windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        node.usrCols = node.usrCols.concat(newColStructs);
                        const mapStrs = [];
                        for (let i = 0; i < newColStructs.length; i++) {
                            const groupNum = groupNums[i];
                            const bracketSize = "int(div(" + windowStruct.tempGBCols[0]
                                    + ", " + groupNum + "))";
                            const extraRowNum = "mod(" + windowStruct.tempGBCols[0]
                                    + ", " + groupNum + ")";
                            const rowNumSubOne = "subInteger("
                                        + SQLCompiler.getCurrentName(indexColStruct)
                                        + ", " + tempMinIndexColName + ")";
                            const threashold = "mult(" + extraRowNum + ", add(1, "
                                    + bracketSize + "))";
                            const mapStr = "ifInt(lt(" + rowNumSubOne + ", " + threashold
                                    + "), addInteger(div(" + rowNumSubOne + ", add(1, "
                                    + bracketSize + ")), 1), addInteger(div(sub("
                                    + rowNumSubOne + ", " + threashold + "), "
                                    + "ifInt(eq(" + bracketSize + ", 0), 1, "
                                    + bracketSize + ")), 1, " + extraRowNum + "))";
                            mapStrs.push(mapStr);
                        }
                        return SQLSimulator.map(mapStrs, ret.newTableName,
                                            newColStructs.map(function(col) {
                                                return SQLCompiler.getCurrentName(col);
                                            }));
                    });
                }
                break;
            }
            case ("rank"):
            case ("percentRank"):
            case ("cumeDist"): {
                let windowStruct;
                let partitionMinColName;
                let psGbColName;
                curPromise = curPromise.then(function(ret) {
                    node.xcCols = [indexColStruct];
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    return SQLWindow.__groupByAndJoinBack(ret, ["min"],
                                groupByCols, [SQLCompiler.getCurrentName(indexColStruct)],
                                JoinOperatorT.InnerJoin, windowStruct);
                })
                .then(function(ret) {
                    // Those three give duplicate row same number
                    // so need to generate min/max index
                    // for each (partition + sort columns) pair (eigen)
                    cli += windowStruct.cli;
                    partitionMinColName = windowStruct.tempGBCols[0];
                    let operator = "min";
                    windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                    if (opName === "cumeDist") {
                        operator = "max";
                    }
                    return SQLWindow.__groupByAndJoinBack(ret, [operator],
                            SQLWindow.__concatColInfoForSort(groupByCols,
                            sortColsAndOrder).map(function(col) {
                                const retCol: SQLColumn = {
                                    colName: col.name,
                                    colType: xcHelper.convertColTypeToSQLType(col.type)
                                };
                                return retCol;
                            }), [SQLCompiler.getCurrentName(indexColStruct)],
                            JoinOperatorT.InnerJoin, windowStruct);
                });
                if (opName === "rank") {
                    // rank = minForEigen - minForPartition + 1
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        psGbColName = windowStruct.tempGBCols[0];
                        node.usrCols = node.usrCols.concat(newColStructs);
                        const mapStr = "addInteger(subInteger(" + psGbColName
                                     + ", " + partitionMinColName + "), 1)";
                        const mapStrs = Array(newColStructs.length).fill(mapStr);
                        return SQLSimulator.map(mapStrs, ret.newTableName,
                                               newColStructs.map(function(col) {
                                                return SQLCompiler.getCurrentName(col);
                                               }));
                    });
                } else {
                    // percent_rank = (minForEigen - minForPartition)
                    // / (sizeOfPartition - 1)
                    // if sizeOfPartition == 1, set denominator to be 1
                    // cume_dist = (maxForEigen - minFor Partition + 1)
                    // / sizeOfPartition
                    let tempCountColName;
                    curPromise = curPromise.then(function(ret) {
                        cli += windowStruct.cli;
                        psGbColName = windowStruct.tempGBCols[0];
                        windowStruct = {leftColInfo: node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols),
                            node: node, cli: ""};
                        return SQLWindow.__groupByAndJoinBack(ret, ["count"],
                                groupByCols, [SQLCompiler.getCurrentName(indexColStruct)],
                                JoinOperatorT.InnerJoin, windowStruct);
                    })
                    .then(function(ret) {
                        cli += windowStruct.cli;
                        cli += ret.cli;
                        tempCountColName = windowStruct.tempGBCols[0];
                        node.usrCols = node.usrCols.concat(newColStructs);
                        let mapStr;
                        if (opName === "percentRank") {
                            mapStr = "div(sub(" + psGbColName + ", "
                                + partitionMinColName + "), if(eq(sub("
                                + tempCountColName + ", 1), 0), 1.0, sub("
                                + tempCountColName + ", 1)))";
                        } else {
                            mapStr = "div(add(sub(" + psGbColName + ", "
                                     + partitionMinColName + "), 1),"
                                     + tempCountColName + ")";
                        }
                        const mapStrs = Array(newColStructs.length).fill(mapStr);
                        return SQLSimulator.map(mapStrs, ret.newTableName,
                                               newColStructs.map(function(col) {
                                                return SQLCompiler.getCurrentName(col);
                                               }));
                    });
                }
                break;
            }
            case ("denseRank"): {
                let windowStruct;
                let drIndexColName;
                let origTableName;
                // Dense_rank treat rows with same eigen as one so do
                // a group by to eliminate duplicate eigens => t1
                curPromise = curPromise.then(function(ret) {
                    windowStruct = {cli: ""};
                    return SQLWindow.__genGroupByTable(ret, ["count"],
                                SQLWindow.__concatColInfoForSort(groupByCols,
                                sortColsAndOrder).map(function(col) {
                                    const retCol: SQLColumn = {
                                        colName: col.name,
                                        colType: xcHelper.convertColTypeToSQLType(col.type)
                                    };
                                    return retCol;
                                }), [SQLCompiler.getCurrentName(indexColStruct)], windowStruct);
                })
                // Sort t1 because group by may change order
                .then(function(ret) {
                    cli += windowStruct.cli;
                    // Need to reset windowStruct.cli here because
                    // it has been added to cli
                    windowStruct.cli = "";
                    cli += ret.cli;
                    origTableName = windowStruct.origTableName;
                    windowStruct.leftColInfo =
                        [{colName: windowStruct.tempGBCols[0], colType: "DfUnknown"}]
                        .concat(SQLCompiler.deleteIdFromColInfo(groupByCols))
                        .concat(sortColsAndOrder.map(function(col) {
                            return {colName: col.name, colType: col.type};
                        }));
                    if (ret.tempCols) {
                        windowStruct.leftColInfo = windowStruct.leftColInfo
                            .concat(ret.tempCols.map(function(colName) {
                                return {colName: colName,
                                        colType: "DfUnknown"}; // XXX xiApi temp columns
                            }));
                    }
                    delete windowStruct.tempGBCols;
                    windowStruct.leftRename = [];
                    return SQLSimulator.sort(
                            SQLWindow.__concatColInfoForSort(groupByCols,
                            sortColsAndOrder), ret.newTableName);
                })
                // Genrow and same steps as in row_number
                // to get rank for each eigen
                .then(function(ret) {
                    cli += ret.cli;
                    let tableId = xcHelper.getTableId(ret.newTableName);
                    if (typeof tableId === "string") {
                        tableId = tableId.toUpperCase();
                    }
                    drIndexColName = "XC_ROW_COL_" + Authentication.getHashId()
                                     .substring(3) + "_" + tableId;
                    windowStruct.leftColInfo
                                .push({colName: drIndexColName, colType: "int"});
                    return SQLSimulator.genRowNum(ret.newTableName,
                                                 drIndexColName);
                })
                .then(function(ret){
                    return SQLWindow.__groupByAndJoinBack(ret, ["min"],
                                groupByCols, [drIndexColName],
                                JoinOperatorT.InnerJoin, windowStruct);
                })
                .then(function(ret) {
                    cli += windowStruct.cli;
                    windowStruct.cli = "";
                    cli += ret.cli;
                    const mapStr = "addInteger(subInteger(" + drIndexColName
                                 + ", " + windowStruct.tempGBCols + "), 1)";
                    windowStruct.leftColInfo = windowStruct.leftColInfo.concat(newColStructs);
                    const mapStrs = Array(newColStructs.length).fill(mapStr);
                    return SQLSimulator.map(mapStrs, ret.newTableName,
                                           newColStructs.map(function(col) {
                                            return SQLCompiler.getCurrentName(col);
                                           }));
                })
                // Join back temp table with rename
                .then(function(ret) {
                    windowStruct.leftTableName = origTableName;
                    windowStruct.node = node;
                    windowStruct.rightColInfo = windowStruct.leftColInfo;
                    node.xcCols = [indexColStruct];
                    windowStruct.leftColInfo = node.usrCols
                            .concat(node.xcCols).concat(node.sparkCols);
                    const rightGBColStructs = [];
                    const rightGBColNames = SQLWindow.__concatColInfoForSort(groupByCols,
                                            sortColsAndOrder).map(function(col) {
                                                return col.name;
                                            });
                    for (let i = 0; i < rightGBColNames.length; i++) {
                        for (let j = 0; j < windowStruct.rightColInfo.length; j++) {
                            if (SQLCompiler.getCurrentName(windowStruct.rightColInfo[j])
                                === rightGBColNames[i]) {
                                rightGBColStructs.push(windowStruct.rightColInfo[j]);
                                break;
                            }
                        }
                    }
                    return SQLWindow.__joinTempTable(ret,
                                           JoinOperatorT.InnerJoin,
                            SQLWindow.__concatColInfoForSort(groupByCols,
                                sortColsAndOrder).map(function(col) {
                                    const retCol: SQLColumn = {
                                        colName: col.name,
                                        colType: xcHelper.convertColTypeToSQLType(col.type)
                                    };
                                    return retCol;
                                }), rightGBColStructs, windowStruct, true);
                })
                .then(function(ret) {
                    // add cli in window and move the new column
                    // from xcCols to usrCols
                    if (ret.tempCols) { // This needed or not depends on behavior of innerjoin
                        node.xcCols = node.xcCols.concat(ret.tempCols
                                        .map(function(colName) {
                                            return {colName: colName,
                                                    colType: null};
                                        }));
                    }
                    cli += windowStruct.cli;
                    node.usrCols = node.usrCols.concat(newColStructs);
                    for (let i = 0; i < newColStructs.length; i++) {
                        node.xcCols.splice(node.xcCols
                                   .indexOf(newColStructs[i]),1);
                    }
                    return ret;
                });
                break;
            }
            default: {
                SQLUtil.assert(false, SQLErrTStr.UnsupportedWindow + opName);
                break;
            }
        }

        curPromise = curPromise.then(function(ret) {
            loopStruct.cli += cli;
            if (node.usrCols.length + node.xcCols.length
                                            + node.sparkCols.length > 500) {
                loopStruct.cli += ret.cli;
                node.xcCols = [indexColStruct];
                SQLSimulator.project(node.usrCols.concat(node.xcCols), ret.newTableName)
                .then(function(ret) {
                    deferred.resolve(ret);
                })
                .fail(deferred.reject);
            } else {
                deferred.resolve(ret);
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __generateFrameEvalString(
        opStruct,
        leftGBColStructs,
        rightGBColStructs,
        leftIndexStruct,
        rightIndexStruct,
        leftOrderColStructs,
        rightOrderColStructs
    ): string {
        let evalString = "";
        for (let i = 0; i < leftGBColStructs.length; i++) {
            const evalElement = "eq(" +
                         SQLCompiler.getCurrentName(leftGBColStructs[i]) + "," +
                         SQLCompiler.getCurrentName(rightGBColStructs[i]) + ")";
            if (evalString === "") {
                evalString = evalElement;
            } else {
                evalString = "and(" + evalString + "," + evalElement + ")";
            }
        }
        if (opStruct.frameInfo.typeRow) {
            if (opStruct.frameInfo.lower != null) {
                const evalElement = "ge(" +
                        SQLCompiler.getCurrentName(rightIndexStruct) + ",add(" +
                        SQLCompiler.getCurrentName(leftIndexStruct) + "," +
                        opStruct.frameInfo.lower + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
            if (opStruct.frameInfo.upper != null) {
                const evalElement = "le(" +
                        SQLCompiler.getCurrentName(rightIndexStruct) + ",add(" +
                        SQLCompiler.getCurrentName(leftIndexStruct) + "," +
                        opStruct.frameInfo.upper + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
        } else if (opStruct.frameInfo.lower || opStruct.frameInfo.upper) {
            SQLUtil.assert(leftOrderColStructs.length === 1, SQLErrTStr.RangeWindowMultipleCol);
            const isAsc = leftOrderColStructs[0].ordering ===
                          XcalarOrderingT.XcalarOrderingAscending;
            if (opStruct.frameInfo.lower != null) {
                const evalElement = (isAsc ? "ge(" : "le(") +
                           SQLCompiler.getCurrentName(rightOrderColStructs[0].colStruct) +
                           (isAsc ? ",add(" : ",sub(") +
                           SQLCompiler.getCurrentName(leftOrderColStructs[0].colStruct) +
                           "," + opStruct.frameInfo.lower + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
            if (opStruct.frameInfo.upper != null) {
                const evalElement = (isAsc ? "le(" : "ge(") +
                           SQLCompiler.getCurrentName(rightOrderColStructs[0].colStruct) +
                           (isAsc ? ",add(" : ",sub(") +
                           SQLCompiler.getCurrentName(leftOrderColStructs[0].colStruct) +
                           "," + opStruct.frameInfo.upper + "))";
                if (evalString === "") {
                    evalString = evalElement;
                } else {
                    evalString = "and(" + evalString + "," + evalElement + ")";
                }
            }
        } else {
            for (let i = 0; i < leftOrderColStructs.length; i++) {
                const isAsc = leftOrderColStructs[i].ordering
                                    === XcalarOrderingT.XcalarOrderingAscending;
                if (opStruct.frameInfo.lower != null) {
                    const evalElement = (isAsc ? "ge(" : "le(") +
                     SQLCompiler.getCurrentName(rightOrderColStructs[i].colStruct) + "," +
                     SQLCompiler.getCurrentName(leftOrderColStructs[i].colStruct) + ")";
                    if (evalString === "") {
                        evalString = evalElement;
                    } else {
                        evalString = "and(" + evalString + "," + evalElement + ")";
                    }
                }
                if (opStruct.frameInfo.upper != null) {
                    const evalElement = (isAsc ? "le(" : "ge(") +
                     SQLCompiler.getCurrentName(rightOrderColStructs[i].colStruct) + "," +
                     SQLCompiler.getCurrentName(leftOrderColStructs[i].colStruct) + ")";
                    if (evalString === "") {
                        evalString = evalElement;
                    } else {
                        evalString = "and(" + evalString + "," + evalElement + ")";
                    }
                }
            }
        }
        return evalString;
    }

    static windowMapHelper(
        node: TreeNode,
        mapStrs: string[],
        tableName: string,
        newColNames: string[],
        newTableName: string,
        colNames: Set<string>,
        outerLoopStruct?: SQLLoopStruct
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let cli = "";
        let hasWindow = false;
        let hasMainMap = false;
        let nestMapStrs = [];
        let nestMapNames = [];
        let nestMapTypes = [];
        let tempColsToKeep: SQLColumn[] = [];
        let windowColStructs = [];
        // Check & form next level mapStrs
        const windowStruct: SQLWindowStruct = {lead: {},
                            nTile: {newCols: [], groupNums: []},
                            rowNumber: {newCols: []},
                            rank: {newCols: []},
                            percentRank: {newCols: []},
                            cumeDist: {newCols: []},
                            denseRank: {newCols: []}};
        for (let i = 0; i < mapStrs.length; i++) {
            const ret = SQLWindow.__analyzeMapStr(node, mapStrs[i], windowStruct, newColNames[i], colNames);
            if (!ret.noMap) {
                hasMainMap = true;
            }
            if (!ret.noWindow) {
                hasWindow = true;
                mapStrs[i] = ret.mainMapStr;
                nestMapStrs = nestMapStrs.concat(ret.nestMapStrs);
                nestMapNames = nestMapNames.concat(ret.nestMapNames);
                nestMapTypes = nestMapTypes.concat(ret.nestMapTypes);
                tempColsToKeep = tempColsToKeep.concat(ret.tempColsToKeep);
                windowColStructs = windowColStructs.concat(ret.windowColStructs);
            }
        }
        if (!hasWindow) {
            return SQLSimulator.map(mapStrs, tableName, newColNames, newTableName);
        } else {
            let curPromise;
            const loopStruct: SQLLoopStruct = {cli: "", node: node};
            loopStruct.groupByCols = [];
            if (outerLoopStruct) {
                loopStruct.indexColStruct = outerLoopStruct.indexColStruct;
                loopStruct.sortColsAndOrder = outerLoopStruct.sortColsAndOrder;
                curPromise = PromiseHelper.resolve({cli: "", newTableName: tableName});
            } else {
                let tableId = xcHelper.getTableId(tableName);
                if (typeof tableId === "string") {
                    tableId = tableId.toUpperCase();
                }
                loopStruct.indexColStruct = {colName: "XC_ROW_COL_" +
                                        Authentication.getHashId().substring(3)
                                        + "_" + tableId,
                                             colType: SQLColumnType.Integer};
                loopStruct.sortColsAndOrder = [{name: SQLCompiler.getCurrentName(loopStruct.indexColStruct),
                                                type: xcHelper.convertSQLTypeToColType(SQLColumnType.Integer),
                            ordering: XcalarOrderingT.XcalarOrderingAscending}];
                node.xcCols.push(loopStruct.indexColStruct);
                curPromise = SQLSimulator.genRowNum(tableName,
                                SQLCompiler.getCurrentName(loopStruct.indexColStruct));
            }
            // First do lower level map & windows
            if (nestMapNames.length != 0) {
                const nestTableName = xcHelper.getTableName(newTableName) +
                                                Authentication.getHashId();
                curPromise = curPromise.then(function(ret) {
                    cli += ret.cli;
                    const nestMapNamesCopy = jQuery.extend(true, [], nestMapNames);
                    return SQLWindow.windowMapHelper(node, nestMapStrs, ret.newTableName,
                                nestMapNamesCopy, nestTableName, colNames, loopStruct);
                });
            }
            // Execute window
            curPromise = curPromise.then(function (ret) {
                for (let i = 0; i < nestMapNames.length; i++) {
                    node.xcCols.push({colName: nestMapNames[i], colType: nestMapTypes[i]});
                }
                return ret;
            })
            .then(function(ret) {
                let innerPromise: XDPromise<CliStruct> = PromiseHelper.resolve(ret);
                if (windowStruct.rowNumber.newCols.length > 0) {
                    const rNCols = windowStruct.rowNumber.newCols;
                    windowStruct.rowNumber.newCols = [];
                    innerPromise = innerPromise.then(function(ret) {
                        const newRenames = SQLCompiler.resolveCollision(loopStruct.node
                                    .usrCols.concat(loopStruct.node.xcCols)
                                    .concat(loopStruct.node.sparkCols), rNCols,
                                    [], [], "", ret.newTableName);
                        loopStruct.node.renamedCols = SQLCompiler.combineRenameMaps(
                                    [loopStruct.node.renamedCols, newRenames]);
                        loopStruct.node.usrCols = loopStruct.node.usrCols.concat(rNCols);
                        loopStruct.cli += ret.cli;
                        return SQLSimulator.map(Array(rNCols.length).fill("int("
                            + SQLCompiler.getCurrentName(loopStruct.indexColStruct) +")"),
                            ret.newTableName, rNCols.map(SQLCompiler.getCurrentName));
                    })
                }
                for (const item in windowStruct) {
                    if (item === "lead") {
                        if (!jQuery.isEmptyObject(windowStruct[item])) {
                            for (const offset in windowStruct[item]) {
                                windowStruct[item][offset].tempColsToKeep = tempColsToKeep;
                                innerPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                    innerPromise, item, windowStruct[item][offset]);
                            }
                        }
                    } else if (item === "first" || item === "last") {
                        windowStruct[item].forEach(function (obj) {
                            obj.tempColsToKeep = tempColsToKeep;
                            innerPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                            innerPromise, item, obj);
                        })
                    } else if (windowStruct[item].newCols.length != 0) {
                        windowStruct[item].tempColsToKeep = tempColsToKeep;
                        innerPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                        innerPromise, item, windowStruct[item]);
                    }
                }
                return innerPromise.promise();
            })
            // Execute map
            if (hasMainMap) {
                curPromise = curPromise.then(function(ret) {
                    cli += loopStruct.cli;
                    cli += ret.cli;
                    windowColStructs.forEach(function(col) {
                        if (node.usrCols.indexOf(col) != -1) {
                            node.usrCols.splice(node.usrCols.indexOf(col), 1);
                        }
                    })
                    for (let i = 0; i < node.usrCols.length;) {
                        if (newColNames.indexOf(SQLCompiler.getCurrentName(node.usrCols[i])) != -1) {
                            node.usrCols.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    node.xcCols = node.xcCols.concat(windowColStructs);
                    while (mapStrs.indexOf("") != -1) {
                        newColNames.splice(mapStrs.indexOf(""), 1);
                        mapStrs.splice(mapStrs.indexOf(""), 1);
                    }
                    return SQLSimulator.map(mapStrs, ret.newTableName, newColNames, newTableName);
                })
                .then(function(ret) {
                    cli += ret.cli;
                    deferred.resolve({cli: cli, newTableName: ret.newTableName});
                })
                .fail(deferred.reject);
            } else {
                curPromise = curPromise.then(function(ret) {
                    cli += loopStruct.cli;
                    cli += ret.cli;
                    windowColStructs.forEach(function(col) {
                        if (node.usrCols.indexOf(col) != -1) {
                            node.usrCols.splice(node.usrCols.indexOf(col), 1);
                        }
                    })
                    for (let i = 0; i < node.usrCols.length;) {
                        if (newColNames.indexOf(SQLCompiler.getCurrentName(node.usrCols[i])) != -1) {
                            node.usrCols.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    deferred.resolve({cli: cli, newTableName: ret.newTableName});
                })
                .fail(deferred.reject);
            }
        }
        return deferred.promise();
    }

    static __analyzeMapStr(
        node: TreeNode,
        str: string,
        windowStruct,
        finalColName,
        colNames
    ): SQLWindowMapStruct {
        const retStruct: SQLWindowMapStruct = {};
        function findStar(str: string): number {
            let find = false;
            let inPar = false;
            let i = 0;
            for (; i < str.length; i++) {
                if (str[i] === "*" && !inPar) {
                    find = true;
                    break;
                } else if (str[i] === '"') {
                    inPar = !inPar;
                }
            }
            if (!find) {
                return -1;
            } else {
                return i;
            }
        }
        if (findStar(str) === -1) {
            retStruct.mainMapStr = str;
            retStruct.noWindow = true;
        } else {
            retStruct.nestMapStrs = [];
            retStruct.nestMapNames = [];
            retStruct.nestMapTypes = [];
            retStruct.windowColStructs = [];
            retStruct.tempColsToKeep = [];
            while (findStar(str) != -1) {
                const leftIndex = findStar(str);
                let rightIndex = str.substring(leftIndex).indexOf("(") + leftIndex;
                const opName = str.substring(leftIndex + 1, rightIndex);
                let tempColName;
                let tempColStruct;
                if (findStar(str) === 0) {
                    tempColName = finalColName;
                    retStruct.noMap = true;
                    tempColStruct = {colName: tempColName,
                        colType: SQLCompiler.getColTypeFromString(str, node)};
                } else {
                    tempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                    while (colNames.has(tempColName)) {
                        tempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                    }
                    colNames.add(tempColName);
                    tempColStruct = {colName: tempColName};
                    retStruct.windowColStructs.push(tempColStruct);
                }
                if (opName === "nTile") {
                    let innerLeft = rightIndex + 1;
                    rightIndex = str.substring(innerLeft).indexOf(")") + innerLeft;
                    tempColStruct.colType = SQLColumnType.Integer;
                    windowStruct[opName].newCols.push(tempColStruct);
                    windowStruct[opName].groupNums
                                .push(str.substring(innerLeft, rightIndex));
                } else if (opName === "lead" || opName === "lag") {
                    rightIndex++;
                    let innerLeft = rightIndex;
                    let keyColType;
                    const args = [];
                    let defaultType;
                    let literalKey = false;
                    let literalDefault = false;
                    let inQuote = false;
                    let hasQuote = false;
                    let isFunc = false;
                    let hasDot = false;
                    let parCount = 1;
                    while (parCount != 0) {
                        const curChar = str[rightIndex];
                        rightIndex++;
                        if (curChar === '"') {
                            inQuote = !inQuote;
                            hasQuote = true;
                        } else if (inQuote) {
                            continue;
                        } else if (curChar === "(") {
                            parCount++;
                            isFunc = true;
                        } else if (curChar === ")") {
                            parCount--;
                        } else if (curChar === ".") {
                            hasDot = true;
                        }
                        if (curChar === "," && parCount === 1 || parCount === 0) {
                            const curArg = str.substring(innerLeft, rightIndex - 1);
                            let argType;
                            if (isFunc) {
                                let innerTempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                                while (colNames.has(innerTempColName)) {
                                    innerTempColName = "XC_WINDOWMAP_" +
                                        Authentication.getHashId().substring(3);
                                }
                                colNames.add(innerTempColName);
                                args.push(innerTempColName);
                                argType = SQLCompiler.getColTypeFromString(curArg, node);
                                retStruct.tempColsToKeep.push({colName: innerTempColName,
                                                               colType: argType});
                                retStruct.nestMapStrs.push(curArg);
                                retStruct.nestMapNames.push(innerTempColName);
                                retStruct.nestMapTypes.push(argType);
                            } else {
                                if (args.length === 0) {
                                    literalKey = true;
                                } else if (args.length === 2) {
                                    literalDefault = true;
                                }
                                if (hasQuote) {
                                    argType = "string";
                                } else if (hasDot) {
                                    argType = "float";
                                } else if (!isNaN(Number(curArg))) {
                                    argType = "int";
                                } else if (curArg === "None") {
                                    // Reserved null value
                                    argType = null;
                                } else {
                                    if (args.length === 0) {
                                        literalKey = false;
                                    } else if (args.length === 2) {
                                        literalDefault = false;
                                    }
                                    argType = SQLCompiler.getColTypeFromString(curArg, node);
                                }
                                args.push(curArg);
                            }
                            if (args.length === 1) {
                                keyColType = argType;
                                defaultType = argType;
                            } else if (args.length === 3 && !defaultType) {
                                // Spark doesn't allow default to be different type as key value
                                defaultType = argType;
                            }
                            innerLeft = rightIndex;
                            isFunc = false;
                            hasQuote = false;
                            hasDot = false;
                        }
                    }
                    SQLUtil.assert(args.length === 3,
                                   "Lead/lag should have three arguments");
                    if (opName === "lag") {
                        args[1] = args[1] * -1;
                    }
                    if (windowStruct.lead[args[1]]) {
                        windowStruct.lead[args[1]].newCols.push(tempColStruct);
                        if (literalKey) {
                            windowStruct.lead[args[1]].keyCols.push(
                                {literalEval: args[0], argType: keyColType || defaultType || "int"});
                        } else {
                            const tempKeyColStruct = {colName: args[0], colType: keyColType};
                            windowStruct.lead[args[1]].keyCols.push(
                                {colStruct: tempKeyColStruct, argType: null});
                        }
                        if (literalDefault) {
                            windowStruct.lead[args[1]].defaults.push(
                                {literalEval: args[2], argType: defaultType || keyColType || "int"});
                        } else {
                            const tempDefaultColStruct = {colName: args[2], colType: defaultType};
                            windowStruct.lead[args[1]].defaults.push(
                                {colStruct: tempDefaultColStruct, argType: null});
                        }
                    } else {
                        const tempKeyColStruct = {colName: args[0], colType: keyColType};
                        const tempDefaultColStruct = {colName: args[2], colType: defaultType};
                        windowStruct.lead[args[1]] =
                                {newCols: [tempColStruct],
                                 keyCols: [{colStruct: tempKeyColStruct,
                                            argType: null}],
                                 defaults: [{colStruct: tempDefaultColStruct,
                                             argType: null}],
                                 offset: args[1]};
                        if (literalKey) {
                            windowStruct.lead[args[1]].keyCols = [{literalEval: args[0],
                                            argType: keyColType || defaultType || "int"}];
                        }
                        if (literalDefault) {
                            windowStruct.lead[args[1]].defaults =
                                [{literalEval: args[2], argType: defaultType || keyColType || "int"}];
                        }
                    }
                    rightIndex--;
                } else {
                    // Other functions should take no argument: 'opName()'
                    rightIndex++;
                    SQLUtil.assert(str[rightIndex] === ")", "Last char should be )");
                    if (opName === "cumeDist" || opName === "denseRank") {
                        tempColStruct.colType = "float";
                    } else {
                        tempColStruct.colType = "int";
                    }
                    windowStruct[opName].newCols.push(tempColStruct);
                }
                if (retStruct.noMap) {
                    str = "";
                } else {
                    str = str.substring(0, leftIndex) + tempColName
                                        + str.substring(rightIndex + 1);
                }
            }
            retStruct.mainMapStr = str;
        }
        return retStruct;
    }

    static __concatColInfoForSort(
        gbCols: SQLColumn[],
        sortCols: SQLSortStruct[]
    ): SQLSortStruct[] {
        const retStruct = [];
        const colNameSet = new Set();
        for (let i = 0; i < gbCols.length; i++) {
            if (!colNameSet.has(SQLCompiler.getCurrentName(gbCols[i]))) {
                colNameSet.add(SQLCompiler.getCurrentName(gbCols[i]));
                retStruct.push({name: SQLCompiler.getCurrentName(gbCols[i]),
                                type: xcHelper.convertSQLTypeToColType(gbCols[i].colType),
                                ordering: XcalarOrderingT.XcalarOrderingAscending});
            }
        }
        for (let i = 0; i < sortCols.length; i++) {
            if (!colNameSet.has(sortCols[i].name)) {
                colNameSet.add(sortCols[i].name);
                retStruct.push(sortCols[i]);
            }
        }
        return retStruct;
    }
}

if (typeof exports !== "undefined") {
    exports.SQLWindow = SQLWindow;
}