class SQLProject {
    static compile(node: TreeNode): XDPromise<any>  {
        // Pre: Project must only have 1 child and its child should've been
        // resolved already
        const deferred = PromiseHelper.deferred();
        SQLUtil.assert(node.children.length === 1,
                       SQLErrTStr.ProjectOneChild + node.children.length);
        if (node.value.projectList.length === 0) {
            node.emptyProject = true;
            node.newTableName = node.children[0].newTableName;
            node.xcCli = "";
            return deferred.resolve().promise();
        }
        const tableName = node.children[0].newTableName;
        // Find columns to project
        const columns = [];
        const evalStrArray = [];
        const aggEvalStrArray = [];
        const subqueryArray = [];
        const options: SQLOption = {renamedCols: node.renamedCols};
        const retStruct = SQLCompiler.genMapArray(node.value.projectList,
                                                  columns, evalStrArray,
                                                  aggEvalStrArray, options,
                                                  subqueryArray);
        node.dupCols = retStruct.dupCols;
        SQLUtil.assert(aggEvalStrArray.length === 0, SQLErrTStr.ProjectAggAgg +
                       JSON.stringify(aggEvalStrArray));

        const newXcCols = [];
        for (let i = 0; i < node.orderCols.length; i++) {
            let find = false;
            if (node.orderCols[i].colId) {
                const id = node.orderCols[i].colId;
                for (let j = 0; j < columns.length; j++) {
                    if (columns[j].colId === id) {
                        node.orderCols[i] = columns[j];
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    for (let j = 0; j < node.usrCols.length; j++) {
                        if (node.usrCols[j].colId === id) {
                            const colStructWithoutId =
                                SQLCompiler.deleteIdFromColInfo([node.usrCols[j]])[0];
                            node.orderCols[i] = colStructWithoutId;
                            newXcCols.push(colStructWithoutId);
                            find = true;
                            break;
                        }
                    }
                }
            } else {
                const name = SQLCompiler.getCurrentName(node.orderCols[i]);
                for (let j = 0; j < node.xcCols.length; j++) {
                    if (SQLCompiler.getCurrentName(node.xcCols[j]) === name) {
                        node.orderCols[i] = node.xcCols[j];
                        newXcCols.push(node.xcCols[j]);
                        find = true;
                        break;
                    }
                }
            }
            SQLUtil.assert(find, SQLErrTStr.ProjectMismatch +
                           JSON.stringify(node.orderCols[i]));
        }

        // Change node.usrCols & node.renamedCols
        let newRenamedCols = {};
        // Extract colNames from column structs
        // and check if it has renamed columns
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].rename) {
                newRenamedCols[columns[i].colId] = columns[i].rename;
            }
        }

        const newRenames = SQLCompiler.resolveCollision(newXcCols, columns, [],
                                                            [], "", tableName);
        newRenamedCols = SQLCompiler.combineRenameMaps([newRenamedCols,
                                                        newRenames]);
        for (const id in newRenames) {
            let find = false;
            for (let i = 0; i < evalStrArray.length; i++) {
                if (evalStrArray[i].colId === Number(id)) {
                    evalStrArray[i].newColName = newRenames[id];
                    find = true;
                    break;
                }
            }
            if (!find) {
                for (let i = 0; i < columns.length; i++) {
                    if (columns[i].colId === Number(id)) {
                        evalStrArray.push({newColName: newRenames[id],
                            evalStr: columns[i].colType + "("
                            + columns[i].colName + ")"});
                        find = true;
                        break;
                    }
                }
            }
            SQLUtil.assert(find, SQLErrTStr.ProjectRenameMistmatch +
                           JSON.stringify(newRenames));
        }
        // XXX Currently we rename new columns, but if we have
        // column type in the future, can switch to renaming old columns
        // for (var i = 0; i < node.xcCols.length; i++) {
        //     if (node.xcCols[i].rename) {
        //         // Need to get column type and map
        //     }
        // }
        let cliStatements = "";
        if (evalStrArray.length > 0) {
            const mapStrs = evalStrArray.map(function(o) {
                return o.evalStr;
            });
            const newColNames = evalStrArray.map(function(o) {
                return o.newColName;
            });
            const newTableName = xcHelper.getTableName(tableName) +
                                Authentication.getHashId();

            SQLCompiler.produceSubqueryCli(subqueryArray)
            .then(function(cli) {
                cliStatements += cli;
                const colNameSet = new Set<string>();
                node.usrCols.concat(node.xcCols).concat(node.sparkCols)
                .map(function (col) {
                    colNameSet.add(SQLCompiler.getCurrentName(col));
                });
                return SQLWindow.windowMapHelper(node, mapStrs, tableName,
                                    newColNames, newTableName, colNameSet);
            })
            .then(function(ret) {
                cliStatements += ret.cli;
                return SQLSimulator.project(columns.concat(newXcCols), ret.newTableName);
            })
            .then(function(ret) {
                node.usrCols = columns;
                node.xcCols = newXcCols;
                node.sparkCols = [];
                node.renamedCols = newRenamedCols;
                deferred.resolve({newTableName: ret.newTableName,
                                    cli: cliStatements + ret.cli});
            })
            .fail(deferred.reject);
        } else {
            SQLCompiler.produceSubqueryCli(subqueryArray)
            .then(function(cli) {
                cliStatements += cli;
                return SQLSimulator.project(columns.concat(newXcCols), tableName);
            })
            .then(function(ret) {
                node.usrCols = columns;
                node.xcCols = newXcCols;
                node.sparkCols = [];
                node.renamedCols = newRenamedCols;
                deferred.resolve({newTableName: ret.newTableName,
                                    cli: cliStatements + ret.cli});
            })
            .fail(deferred.reject);
        }
        return deferred.promise();
    }

}

if (typeof exports !== "undefined") {
    exports.SQLProject = SQLProject;
}