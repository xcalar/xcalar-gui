class SQLGroupBy {
    static compile(node: TreeNode): XDPromise<any> {
        // There are 4 possible cases in aggregates (groupbys)
        // 1 - f(g) => Handled
        // 2 - g(f) => Handled
        // 3 - g(g) => Catalyst cannot handle this
        // 4 - f(f) => Not valid syntax. For gb you need to have g somewhere
        let cli = "";
        const deferred = PromiseHelper.deferred();
        node.orderCols = [];
        SQLUtil.assert(node.children.length === 1,
                       SQLErrTStr.AggregateOneChild + node.children.length);
        const tableName = node.children[0].newTableName;

        const options = {renamedCols: node.renamedCols};
        // Resolve group on clause
        const gbCols = [];
        const gbEvalStructArray: SQLEvalStruct[] = [];
        const gbAggEvalStructArray: SQLAggEvalStruct[] = [];
        if (node.value.groupingExpressions.length > 0) {
            for (let i = 0; i < node.value.groupingExpressions.length; i++) {
                // subquery is not allowed in GROUP BY
                SQLUtil.assert(node.value.groupingExpressions[i][0].class !==
                "org.apache.spark.sql.catalyst.expressions.ScalarSubquery",
                SQLErrTStr.SubqueryNotAllowedInGroupBy);
            }
            options["groupBy"] = true;
            SQLCompiler.genMapArray(node.value.groupingExpressions, gbCols,
                              gbEvalStructArray, gbAggEvalStructArray, options);
            SQLUtil.assert(gbAggEvalStructArray.length === 0,
                    SQLErrTStr.AggNotAllowedInGroupBy);
            // aggregate functions are not allowed in GROUP BY
        }
        // Extract colNames from column structs
        const gbColNames: string[] = [];
        const gbColTypes: SQLColumnType[] = [];
        for (let i = 0; i < gbCols.length; i++) {
            gbColNames.push(SQLCompiler.getCurrentName(gbCols[i]));
            gbColTypes.push(SQLCompiler.getColType(gbCols[i]));
        }

        // Resolve each group's map clause
        const columns = [];
        const evalStructArray: SQLEvalStruct[] = [];
        const aggEvalStructArray: SQLAggEvalStruct[] = [];
        options["operator"] = true;
        options["groupBy"] = false;
        const retStruct = SQLCompiler.genMapArray(
                                node.value.aggregateExpressions, columns,
                                evalStructArray, aggEvalStructArray, options);
        node.dupCols = retStruct.dupCols;
        SQLCompiler.resolveCollision(node.usrCols, columns, [], [],
                                     "", node.children[0].newTableName, true);
        node.renamedCols = {};
        // Extract colNames from column structs
        const aggColNames = [];
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].rename) {
                aggColNames.push(columns[i].rename);
                node.renamedCols[columns[i].colId] = columns[i].rename;
                for (let j = 0; j < evalStructArray.length; j++) {
                    if (evalStructArray[j].colId === columns[i].colId) {
                        evalStructArray[j].newColName = columns[i].rename;
                        break;
                    }
                }
            } else {
                aggColNames.push(columns[i].colName);
            }
        }

        // Here are the steps on how we compile groupbys
        // 1. For all in evalStructArray, split into gArray and fArray based
        // on whether they have operator
        // 2. For all in gArray, if hasOp in evalStr,
        //    - Push into firstMapArray
        //    - Replace value inside with aggVarName
        // 3. For all in aggArray, if hasOp in aggEval after strip, fgf case
        //    - Push into firstMapArray
        //    - Replace value inside with aggVarName
        // 4. Special case: for cases where there's no group by clause,
        // we will create a column of 1s and group on it. for case where
        // there is no map operation, we will just do a count(1)
        // 5. For all in fArray, if hasOp in EvalStr, push op into
        // secondMapArray. Be sure to use the column name that's in the
        // original alias call
        // 6. Trigger the lazy call
        // firstMapArray
        // .then(groupby)
        // .then(secondMapArray)

        let gArray: SQLEvalStruct[] = [];
        const fArray: SQLEvalStruct[] = [];

        // Step 1
        for (let i = 0; i < evalStructArray.length; i++) {
            if (evalStructArray[i].operator) {
                gArray.push(evalStructArray[i]);
            } else {
                fArray.push(evalStructArray[i]);
            }
        }

        // Step 2
        const firstMapArray = [];
        const firstMapColNames = [];
        const firstMapColTypes = [];

        // Push the group by eval string into firstMapArray
        for (let i = 0; i < gbEvalStructArray.length; i++) {
            let inAgg = false;
            // Check if the gbExpression is also in aggExpression
            for (let j = 0; j < fArray.length; j++) {
                const origGbColName = gbEvalStructArray[i].newColName;
                // This is importatnt as there will be an alias in aggExp
                // but no agg in gbExp. So we need to compare the evalStr
                if (gbEvalStructArray[i].evalStr === fArray[j].evalStr) {
                    const newGbColName = fArray[j].newColName;
                    firstMapColNames.push(newGbColName);
                    firstMapColTypes.push(fArray[j].colType);
                    if (inAgg) {
                        gbColNames.push(newGbColName);
                        firstMapArray.push(fArray[j].evalStr);
                    } else {
                        gbColNames[gbColNames.indexOf(origGbColName)] = newGbColName;
                        inAgg = true;
                    }
                    // Mark fArray[i] as "used in group by"
                    fArray[j].groupBy = true;
                }
            }
            if (!inAgg) {
                firstMapColNames.push(gbEvalStructArray[i].newColName);
                firstMapColTypes.push(gbEvalStructArray[i].colType);
            }
            firstMapArray.push(gbEvalStructArray[i].evalStr);
        }

        for (let i = 0; i < gArray.length; i++) {
            gArray[i].aggColName = gArray[i].evalStr;
            delete gArray[i].evalStr;
            if (gArray[i].numOps > 0) {
                firstMapArray.push(gArray[i].aggColName);
                const newColName = "XC_GB_COL_" +
                                    Authentication.getHashId().substring(3);
                firstMapColNames.push(newColName);
                if (gArray[i].operator === "count") {
                    firstMapColTypes.push(gArray[i].countType);
                } else {
                    firstMapColTypes.push(gArray[i].colType);
                }
                gArray[i].aggColName = newColName;
            }
        }

        // Step 3
        const aggVarNames = [];
        const aggVarTypes = [];
        // aggVarNames will be pushed into node.xcCols
        for (let i = 0; i < aggEvalStructArray.length; i++) {
            const gbMapCol: SQLEvalStruct = {};
            const rs = SQLGroupBy.extractAndReplace(aggEvalStructArray[i]);
            SQLUtil.assert(rs != null, SQLErrTStr.GroupByNoReplacement);
            gbMapCol.operator = rs.firstOp;
            gbMapCol.arguments = rs.arguments;
            gbMapCol.colType = OperatorTypes[gbMapCol.operator];
            if (aggEvalStructArray[i].numOps > 1) {
                const newColName = "XC_GB_COL_" +
                                    Authentication.getHashId().substring(3);
                firstMapColNames.push(newColName);
                if (rs.firstOp === "count") {
                    firstMapColTypes.push(aggEvalStructArray[i].countType);
                } else {
                    firstMapColTypes.push(aggEvalStructArray[i].colType);
                }
                firstMapArray.push(rs.inside);
                gbMapCol.aggColName = newColName;
            } else {
                gbMapCol.aggColName = rs.inside;
            }
            gbMapCol.newColName = aggEvalStructArray[i].aggVarName;
            gArray.push(gbMapCol);
            aggVarNames.push(aggEvalStructArray[i].aggVarName);
            aggVarTypes.push(aggEvalStructArray[i].colType);
        }

        // Step 3.5
        // Extract first/last in gArray and replace with max
        // Moved into promise
        const windowTempCols = [];
        const frameInfo = {typeRow: true, lower: undefined, upper: undefined};
        const tempColsToKeep: SQLColumn[] = [];
        const windowStruct: SQLWindowStruct =
                            {first: [{newCols: [], aggCols: [],
                                      frameInfo: frameInfo, ignoreNulls: []}],
                             last: [{newCols: [], aggCols: [],
                                     frameInfo: frameInfo, ignoreNulls: []}]};

        // Step 4
        // Special cases
        // Select avg(col1)
        // from table
        // This results in a table where it's just 1 value

        // Another special case
        // Select col1 [as col2]
        // from table
        // grouby col1
        // Now we use groupAll flag to handle this

        let tempCol;
        if (gArray.length === 0) {
            const newColName = "XC_GB_COL_" +
                                Authentication.getHashId().substring(3);
            gArray = [{operator: "count",
                       aggColName: "1",
                       colType: SQLColumnType.Integer,
                       newColName: newColName}];
            tempCol = newColName;
        }

        // Step 5
        const secondMapArray = [];
        const secondMapColNames = [];
        const secondMapColTypes = [];
        for (let i = 0; i < fArray.length; i++) {
            if (fArray[i].numOps > 0 && !fArray[i].groupBy) {
                secondMapArray.push(fArray[i].evalStr);
                secondMapColNames.push(fArray[i].newColName);
                secondMapColTypes.push(fArray[i].colType);
            }
            // This if is necessary because of the case where
            // select col1
            // from table
            // group by col1
        }

        // Step 6
        let newTableName = tableName;
        const firstMapPromise = function() {
            if (firstMapArray.length > 0) {
                const srcTableName = newTableName;
                newTableName = xcHelper.getTableName(newTableName) +
                                Authentication.getHashId();
                const colNameSet: Set<string> = new Set();
                node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                .map(function (col) {
                    colNameSet.add(SQLCompiler.getCurrentName(col));
                });
                return SQLWindow.windowMapHelper(node, firstMapArray,
                      srcTableName, firstMapColNames, newTableName, colNameSet);
            } else {
                return PromiseHelper.resolve();
            }
        };

        const secondMapPromise = function() {
            if (secondMapArray.length > 0) {
                const srcTableName = newTableName;
                newTableName = xcHelper.getTableName(newTableName) +
                                Authentication.getHashId();
                const colNameSet: Set<string> = new Set();
                node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                .map(function (col) {
                    colNameSet.add(SQLCompiler.getCurrentName(col));
                });
                return SQLWindow.windowMapHelper(node, secondMapArray,
                     srcTableName, secondMapColNames, newTableName, colNameSet);
            } else {
                return PromiseHelper.resolve();
            }
        };

        firstMapPromise()
        .then(function(ret): XDPromise<CliStruct> {
            if (ret) {
                cli += ret.cli;
                newTableName = ret.newTableName;
            }
            for (let i = 0; i < firstMapColNames.length; i++) {
                // Avoid adding the "col + 1" in
                // select col+1 from t1 group by col + 1
                // It belongs to usrCols
                if (aggColNames.indexOf(firstMapColNames[i]) === -1) {
                    const colStruct: SQLColumn = {colName: firstMapColNames[i],
                                                  colType: firstMapColTypes[i]}
                    tempColsToKeep.push(colStruct);
                    node.xcCols.push(colStruct);
                }
            }
            const colNames = new Set();
            node.usrCols.concat(node.xcCols).concat(node.sparkCols).map(function (col) {
                colNames.add(SQLCompiler.getCurrentName(col));
            });
            for (let i = 0; i < gArray.length; i++) {
                if (gArray[i].operator === "first" || gArray[i].operator === "last") {
                    node.usrCols.concat(node.xcCols).forEach(function(col) {
                        if (SQLCompiler.getCurrentName(col) === gArray[i].aggColName) {
                            let index = -1;
                            for (const j in windowStruct[gArray[i].operator][0].aggCols) {
                                if (windowStruct[gArray[i].operator][0]
                                    .aggCols[j].colStruct
                                    && windowStruct[gArray[i].operator][0]
                                    .aggCols[j].colStruct=== col) {
                                    index = Number(j);
                                }
                            }
                            if (index != -1) {
                                gArray[i].aggColName = windowStruct[gArray[i]
                                        .operator][0].newCols[index].colName;
                            } else {
                                let tempColName = "XC_WINDOWAGG_" +
                                                Authentication.getHashId().substring(3);
                                while (colNames.has(tempColName)) {
                                    tempColName = "XC_WINDOWAGG_" +
                                                Authentication.getHashId().substring(3);
                                }
                                colNames.add(tempColName);
                                windowStruct[gArray[i].operator][0].newCols.push(
                                                {colName: tempColName,
                                                 colType: gArray[i].colType});
                                windowStruct[gArray[i].operator][0].aggCols.push(
                                                {colStruct: col, argType: null});
                                windowStruct[gArray[i].operator][0].ignoreNulls
                                                .push(gArray[i].arguments[0]);
                                gArray[i].aggColName = tempColName;
                                windowTempCols.push(tempColName);
                            }
                        }
                    })
                    gArray[i].operator = "max";
                }
            }
            if (windowTempCols.length > 0) {
                const innerDeferred = PromiseHelper.deferred();
                let tableId = xcHelper.getTableId(newTableName);
                if (typeof tableId === "string") {
                    tableId = tableId.toUpperCase();
                }
                const loopStruct: SQLLoopStruct = {
                    cli: "",
                    node: node,
                    groupByCols: gbCols,
                    sortColsAndOrder: [],
                    indexColStruct: {
                        colName: "XC_ROW_COL_" +
                         Authentication.getHashId().substring(3) + "_" + tableId
                    }
                };
                node.xcCols.push(loopStruct.indexColStruct);
                const sortList = [];
                let windowCli = "";
                let curPromise;
                for (let i in gbColNames) {
                    sortList.push({name: gbColNames[i], type: gbColTypes[i],
                        ordering: XcalarOrderingT.XcalarOrderingAscending});
                }
                if (sortList.length > 0) {
                    curPromise = SQLSimulator.sort(sortList, newTableName);
                } else {
                    curPromise = PromiseHelper.resolve({cli: "",
                                                   newTableName: newTableName});
                }
                curPromise = curPromise.then(function(ret) {
                    windowCli += ret.cli;
                    return SQLSimulator.genRowNum(ret.newTableName,
                         SQLCompiler.getCurrentName(loopStruct.indexColStruct));
                });
                if (windowStruct["first"][0].newCols.length != 0) {
                    windowStruct["first"][0].tempColsToKeep = tempColsToKeep;
                    curPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                    curPromise, "first", windowStruct["first"][0]);
                }
                if (windowStruct["last"][0].newCols.length != 0) {
                    windowStruct["last"][0].tempColsToKeep = tempColsToKeep;
                    curPromise = SQLWindow.windowExpressionHelper(loopStruct,
                                      curPromise, "last", windowStruct["last"][0]);
                }
                curPromise = curPromise.then(function(ret) {
                    windowCli += loopStruct.cli;
                    cli += windowCli;
                    // move columns to xcCols
                    windowTempCols.forEach(function(name) {
                        for (let i = 0; i < node.usrCols.length; i++) {
                            if (node.usrCols[i].colName === name) {
                                node.usrCols.splice(i,1);
                                node.xcCols.push({colName: name});
                                break;
                            }
                        }
                    })
                    innerDeferred.resolve(ret);
                })
                .fail(innerDeferred.reject);
                return innerDeferred.promise();
            } else {
                return PromiseHelper.resolve({newTableName: newTableName, cli: ""});
            }
        })
        .then(function(ret) {
            if (ret) {
                cli += ret.cli;
                newTableName = ret.newTableName;
            }
            const gArrayList: SQLEvalStruct[][] = [];
            const gArraySingleOp: SQLEvalStruct[] = [];
            for (let i = 0; i < gArray.length; i++) {
                if (gArray[i].operator === "stdev"
                    || gArray[i].operator === "stdevp"
                    || gArray[i].operator === "var"
                    || gArray[i].operator === "varp") {
                    gArrayList.push([gArray[i]]);
                } else {
                    gArraySingleOp.push(gArray[i]);
                }
            }
            if (gArraySingleOp.length > 0) {
                gArrayList.push(gArraySingleOp);
            }
            if (gArrayList.length > 1) {
                return SQLGroupBy.__multGBHelper(gbColNames, gbColTypes,
                                    gArrayList, newTableName, node);
            } else if (node.expand) {
                return SQLGroupBy.__handleMultiDimAgg(gbColNames, gbColTypes,
                                        gArray, newTableName, node.expand);
            } else {
                return SQLSimulator.groupBy(gbColNames, gArray as AggColInfo[],
                                                                  newTableName);
            }
        })
        .then(function(ret) {
            SQLUtil.assert(ret != null, SQLErrTStr.GroupByFailure);
            newTableName = ret.newTableName;
            cli += ret.cli;
            for (let i = 0; i < aggVarNames.length; i++) {
                node.xcCols.push({colName: aggVarNames[i],
                                    colType: aggVarTypes[i]});
            }
            if (ret.tempCols) {
                for (let i = 0; i < ret.tempCols.length; i++) {
                    node.xcCols.push({colName: ret.tempCols[i],
                                      colType: null});
                                      // XXX tempCols from xiApi don't have type
                }
            }
            if (tempCol) {
                node.xcCols.push({colName: tempCol, colType: SQLColumnType.Integer});
            }
            return secondMapPromise();
        })
        .then(function(ret) {
            if (ret) {
                cli += ret.cli;
                newTableName = ret.newTableName;
            }
            // XXX This is a workaround for the prefix issue. Need to revist
            // when taking good care of index & prefix related issues.
            for (let i = 0; i < columns.length; i++) {
                if (columns[i].rename) {
                    columns[i].rename = SQLCompiler.cleanseColName(
                                                       columns[i].rename, true);
                } else {
                    columns[i].colName = SQLCompiler.cleanseColName(
                                                      columns[i].colName, true);
                }
            }
            // Also track xcCols
            for (let i = 0; i < secondMapColNames.length; i++) {
                if (aggColNames.indexOf(secondMapColNames[i]) === -1) {
                    node.xcCols.push({colName: secondMapColNames[i],
                                        colType: secondMapColTypes[i]});
                }
            }
            node.usrCols = columns;
            for (let i = 0; i < gbColNames.length; i++) {
                // If gbCol is a map str, it should exist in firstMapColNames
                // Avoid adding it twice.
                if (firstMapColNames.indexOf(gbColNames[i]) === -1 &&
                    aggColNames.indexOf(gbColNames[i]) === -1) {
                    node.xcCols.push({colName: gbColNames[i],
                                      colType: gbColTypes[i]});
                }
            }
            SQLCompiler.assertCheckCollision(node.xcCols);
            deferred.resolve({newTableName: newTableName,
                                cli: cli});
        })
        .fail(deferred.reject);
        // End of Step 6

        return deferred.promise();
    }

    static extractAndReplace(
        aggEvalObj: SQLAggEvalStruct
    ): {
        arguments?: string[],
        firstOp?: string,
        inside?: string
    } {
        if (aggEvalObj.numOps === 0) {
            return;
        }
        const evalStr = aggEvalObj.aggEvalStr;
        const leftBracketIndex = evalStr.indexOf("(");
        const rightBracketIndex = evalStr.lastIndexOf(")");
        const firstOp = evalStr.substring(0, leftBracketIndex);
        let inside;
        const retStruct: {
            arguments?: string[],
            firstOp?: string,
            inside?: string
        } = {};
        if (firstOp === "first" || firstOp === "last") {
            inside = evalStr.substring(leftBracketIndex + 1,
                                            evalStr.lastIndexOf(","));
            retStruct.arguments = [evalStr.substring(evalStr.lastIndexOf(",")
                                        + 1, rightBracketIndex)];
        } else {
            inside = evalStr.substring(leftBracketIndex + 1,
                                            rightBracketIndex);
        }
        retStruct.firstOp = firstOp;
        retStruct.inside = inside;
        return retStruct;
    }

    static __multGBHelper(
        gbColNames: string[],
        gbColTypes: SQLColumnType[],
        gArrayList: SQLEvalStruct[][],
        tableName: string,
        node: TreeNode
    ): XDPromise<any> {
        // Do group by separately for multi-operation and corss join
        const deferred = PromiseHelper.deferred();
        const gbTableNames = [];
        const gbTableColInfos = [];
        let cli = "";
        let curPromise: XDPromise<any> = PromiseHelper.resolve();
        let index = 0;
        for (let i = 0; i < gArrayList.length; i++) {
            if (node.expand) {
                curPromise = curPromise.then(() => {
                    return SQLGroupBy.__handleMultiDimAgg(gbColNames, gbColTypes,
                                     gArrayList[index], tableName, node.expand);
                });
            } else {
                curPromise = curPromise.then(() => {
                    return SQLSimulator.groupBy(gbColNames,
                                  gArrayList[index] as AggColInfo[], tableName);
                });
            }
            curPromise = curPromise.then(function(ret) {
                cli += ret.cli;
                gbTableNames.push(ret.newTableName);
                const columnInfo = {tableName: ret.newTableName,
                                    columns: jQuery.extend(true, [], gbColNames),
                                    rename: []};
                for (let j = 0; j < gArrayList[index].length; j++) {
                    columnInfo.columns.push(gArrayList[index][j].newColName);
                }
                gbTableColInfos.push(columnInfo);
                index += 1;
                return ret;
            });
        }
        curPromise = curPromise.then(function() {
            let innerPromise: XDPromise<any> =
                        PromiseHelper.resolve({newTableName: gbTableNames[0]});
            const joinType = gbColNames.length > 0 ?
                            JoinOperatorT.InnerJoin : JoinOperatorT.CrossJoin;
            index = 1;
            for (let i = 0; i < gbColNames.length; i++) {
                gbTableColInfos[0].rename.push(
                    {orig: gbColNames[i],
                     new: gbColNames[i],
                     type: xcHelper.convertColTypeToFieldType(
                            xcHelper.convertSQLTypeToColType(
                            gbColTypes[i]))});
            }
            for (let i = 0; i < gArrayList[0].length; i++) {
                gbTableColInfos[0].rename.push(
                    {orig: gArrayList[0][i].newColName,
                     new: gArrayList[0][i].newColName,
                     type: xcHelper.convertColTypeToFieldType(
                            xcHelper.convertSQLTypeToColType(
                            gArrayList[0][i].colType))});
            }
            for (let i = 1; i < gbTableNames.length; i++) {
                let rightCols;
                innerPromise = innerPromise.then(function(ret) {
                    gbTableColInfos[index].rename = [];
                    let evalString = "";
                    rightCols = [];
                    gbTableColInfos[0].tableName = ret.newTableName;
                    for (let j = 0; j < gbColNames.length; j++) {
                        const newColName = gbColNames[j] + "_" + index +
                                        Authentication.getHashId().substring(3);
                        rightCols.push(newColName);
                        gbTableColInfos[index].rename.push(
                            {orig: gbColNames[j],
                             new: newColName,
                             type: xcHelper.convertColTypeToFieldType(
                                    xcHelper.convertSQLTypeToColType(
                                    gbColTypes[i]))});
                    }
                    for (let j = 0; j < gArrayList[index].length; j++) {
                        gbTableColInfos[index].rename.push(
                            {orig: gArrayList[index][j].newColName,
                             new: gArrayList[index][j].newColName,
                             type: xcHelper.convertColTypeToFieldType(
                                    xcHelper.convertSQLTypeToColType(
                                    gArrayList[index][j].colType))});
                    }
                    for (let j = 0; j < gbTableColInfos[index].columns.length; j++) {
                        if (gbColNames.indexOf(gbTableColInfos[index].columns[j]) === -1) {
                            rightCols.push(gbTableColInfos[index].columns[j]);
                        }
                    }
                    const leftColInfo = {tableName: gbTableColInfos[0].tableName,
                                        columns: gbColNames,
                                        rename: gbTableColInfos[0].rename};
                    const rightColInfo = {tableName: gbTableColInfos[index].tableName,
                                        columns: gbColNames,
                                        rename: gbTableColInfos[index].rename};
                    return SQLSimulator.join(joinType, leftColInfo, rightColInfo,
                                        {evalString: evalString, nullSafe: true,
                                        keepAllColumns: false});
                })
                .then(function(ret) {
                    cli += ret.cli;
                    gbTableColInfos[0].columns = gbTableColInfos[0].columns
                                                                .concat(rightCols);
                    for (let j = 0; j < gArrayList[index].length; j++) {
                        gbTableColInfos[0].rename.push(
                            {orig: gArrayList[index][j].newColName,
                             new: gArrayList[index][j].newColName,
                             type: xcHelper.convertColTypeToFieldType(
                                    xcHelper.convertSQLTypeToColType(
                                    gArrayList[index][j].colType))});
                    }
                    if (ret.tempCols && index === gbTableNames.length - 1) {
                        for (let j = 0; j < ret.tempCols.length; j++) {
                            if (typeof ret.tempCols[j] === "string") {
                                gbTableColInfos[0].columns.push(ret.tempCols[j]);
                                node.xcCols.push({colName: ret.tempCols[j],
                                                colType: null});
                            } else {
                                gbTableColInfos[0].columns.push(
                                    SQLCompiler.getCurrentName(ret.tempCols[j]));
                                node.xcCols.push(ret.tempCols[j]);
                            }
                        }
                    }
                    index += 1;
                    return ret;
                })
            }
            innerPromise.then(function(ret) {
                deferred.resolve({newTableName: ret.newTableName, cli: cli});
            })
            .fail(deferred.reject);
        });
        return deferred.promise();
    }

    static __handleMultiDimAgg(
        gbColNames: string[],
        gbColTypes: SQLColumnType[],
        gArray: SQLEvalStruct[],
        tableName: string,
        expand
    ): XDPromise<any> {
        let cli = "";
        const deferred = PromiseHelper.deferred();
        SQLUtil.assert(gbColNames[gbColNames.length - 1] === "SPARK_GROUPING_ID",
                       SQLErrTStr.BadGBCol + gbColNames[gbColNames.length - 1]);
        const gIdColName = SQLCompiler.getCurrentName(expand.groupingColStruct);
        let curIndex = expand.groupingIds[0];
        let curI = 0;
        const tableInfos = [];
        let curPromise: XDPromise<any> = PromiseHelper.resolve({cli: "", newTableName: tableName});
        for (let i = 0; i < expand.groupingIds.length; i++) {
            curPromise = curPromise.then(function(ret) {
                cli += ret.cli;
                const options = {};
                curIndex = expand.groupingIds[curI];
                const tempGBColNames = [];
                const tempGArray = jQuery.extend(true, [], gArray);
                const mapStrs = [];
                const newColNames = [];
                for (let j = 0; j < gbColNames.length - 1; j++) {
                    if ((1 << (gbColNames.length - j - 2) & curIndex) === 0) {
                        tempGBColNames.push(gbColNames[j]);
                    } else {
                        mapStrs.push(gbColTypes[j] + "(div(1,0))");
                        newColNames.push(gbColNames[j]);
                    }
                }
                mapStrs.push("int(" + curIndex + ")");
                newColNames.push(gIdColName);

                // Column info for union
                const columns = [{name: gIdColName, rename: gIdColName,
                                  type: ColumnType.integer, cast: false}];
                for (let j = 0; j < gbColNames.length - 1; j++) {
                    columns.push({
                        name: gbColNames[j],
                        rename: gbColNames[j],
                        type: xcHelper.convertSQLTypeToColType(gbColTypes[j]),
                        cast: false
                    });
                }
                for (let j = 0; j < gArray.length; j++) {
                    columns.push({
                        name: gArray[j].newColName,
                        rename: gArray[j].newColName,
                        type: xcHelper.convertSQLTypeToColType(gArray[j].colType),
                        cast: false
                    })
                }

                curI++;

                return SQLSimulator.groupBy(tempGBColNames, tempGArray,
                                            tableName, options)
                .then(function(ret) {
                    cli += ret.cli;
                    return SQLSimulator.map(mapStrs, ret.newTableName,
                                            newColNames);
                })
                .then(function(ret) {
                    tableInfos.push({
                        tableName: ret.newTableName,
                        columns: columns
                    });
                    return ret;
                });
            });
        }

        curPromise = curPromise.then(function(ret) {
            cli += ret.cli;
            return SQLSimulator.union(tableInfos, false);
        })
        .then(function(ret) {
            cli += ret.cli;
            deferred.resolve({newTableName: ret.newTableName, cli: cli});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}

if (typeof exports !== "undefined") {
    exports.SQLGroupBy = SQLGroupBy;
}