interface SQLJoinStruct {
    newTableName?: string,
    leftTableName?: string,
    rightTableName?: string,
    cli?: string,
    existenceCol?: SQLColumn,
    filterSubtrees?: TreeNode[],
    catchAll?: boolean,
    leftRowNumCol?: SQLColumn,
    rightRowNumCol?: SQLColumn,
    leftMapArray?: string[],
    rightMapArray?: string[],
    leftCols?: string[],
    rightCols?: string[],
    renameMap?: {},
    leftUsrColsCopy?: SQLColumn[],
    rightUsrColsCopy?: SQLColumn[],
    leftSparkColsCopy?: SQLColumn[],
    rightSparkColsCopy?: SQLColumn[],
    leftRowNumColCopy?: SQLColumn,
    rightRowNumColCopy?: SQLColumn,
    leftRowNumTableName?: string,
    rightRowNumTableName?: string,
    colForExistCheck?: SQLColumn
}
class SQLJoin {
    static compile(node: TreeNode): XDPromise<any> {
        SQLUtil.assert(node.children.length === 2,
                       SQLErrTStr.JoinTwoChildren + node.children.length);
        const deferred = PromiseHelper.deferred();
        let hasEmptyProject = false;
        let eqClassName: string = "org.apache.spark.sql.catalyst.expressions.EqualTo";

        // Check if one of children is empty table
        if (node.children[0].emptyProject) {
            hasEmptyProject = true;
            node.children = [node.children[1], node.children[0]];
        } else if (node.children[1].emptyProject) {
            hasEmptyProject = true;
        }
        // Special case for Anti Semi Joins
        // Check if root node is OR
        // If yes, assert OR's one child is &= tree. Other child is isNull,
        // followed by the identical &= tree
        // If root node is not OR, tree must be &=
        // If root node is OR, change root node to be &= subTree and set
        // removeNull to true
        // The above assertion and changes causes left anti semi joins to
        // forever be an &= subtree.
        if (SQLJoin.__isAntiJoin(node)) {
            if (node.value.condition && node.value.condition[0].class ===
                "org.apache.spark.sql.catalyst.expressions.Or") {
                let leftSubtree = [node.value.condition[1]];
                let rightSubtree = [];
                let numNodesInLeftTree = leftSubtree[0]["num-children"];
                let idx = 1;
                while (numNodesInLeftTree > 0) {
                    leftSubtree.push(node.value.condition[++idx]);
                    numNodesInLeftTree += node.value.
                                             condition[idx]["num-children"];
                    numNodesInLeftTree--;
                }
                for (let i = idx + 1; i < node.value.condition.length; i++) {
                    rightSubtree.push(node.value.condition[i]);
                }

                // Find the subtree that has IsNull as the first node and
                // assign that as the right subtree
                if (leftSubtree[0].class ===
                    "org.apache.spark.sql.catalyst.expressions.IsNull") {
                    const tempTree = rightSubtree;
                    rightSubtree = leftSubtree;
                    leftSubtree = tempTree;
                }
                // Remove the IsNull node
                rightSubtree.shift();
                if (JSON.stringify(leftSubtree) ===
                    JSON.stringify(rightSubtree)) {
                    // All good, now set removeNull to true and over write
                    // the condition array with the left subtree
                    node.xcRemoveNull = true;
                    node.value.condition = leftSubtree;
                } else {
                    node.xcRemoveNull = false;
                }
            } else {
                node.xcRemoveNull = false;
            }
        }

        // Check if all equals in condition are equalNullSafe
        if (!SQLJoin.__isExistenceJoin(node) && SQLJoin.__isNullSafeJoin(node)) {
            node.nullSafe = true;
            eqClassName = "org.apache.spark.sql.catalyst.expressions.EqualNullSafe";
        }

        // XXX BUG check whether node.value.condition exists. if it doesn't
        // it's a condition-free cross join. EDGE CASE
        // select * from n1 cross join n2
        let condTree;
        if (node.value.condition) {
            condTree = SQLCompiler.genExpressionTree(undefined,
                    node.value.condition.slice(0), undefined, node.tablePrefix);
        } else {
            // Edge case: select * from n1 cross join n2
        }

        node.xcCols = [];

        // NOTE: The full supportability of Xcalar's Join is represented by
        // a tree where if we traverse from the root, it needs to be AND all
        // the way and when it's not AND, it must be an EQ (stop traversing
        // subtree)
        // For EQ subtrees, the left tree must resolve to one of the tables
        // and the right tree must resolve to the other. Otherwise it's not
        // an expression that we can support.
        // The statements above rely on the behavior that the SparkSQL
        // optimizer will hoist join conditions that are essentially filters
        // out of the join clause. If this presumption is violated, then the
        // statements above no longer hold

        // Check AND conditions and take note of all the EQ subtrees
        const eqSubtrees = [];
        let filterSubtrees = [];
        let optimize = true;
        if (condTree && condTree.value.class ===
            "org.apache.spark.sql.catalyst.expressions.And") {
            this.__processAndTree(condTree, eqSubtrees, filterSubtrees);
        } else if (condTree && condTree.value.class === eqClassName) {
            eqSubtrees.push(condTree);
        } else {
            // No optimization
            optimize = false;
        }

        // This is the MOST important struct in this join algorithm.
        // This is what each of the join clauses will be mutating.
        const retStruct: SQLJoinStruct = {
            newTableName: "",
            leftTableName: node.children[0].newTableName,
            rightTableName: node.children[1].newTableName,
            cli: ""
        };

        // Resolving firstDeferred will start the domino fall
        const firstDeferred = PromiseHelper.deferred();
        let promise: XDPromise<any> = firstDeferred.promise();

        if (SQLJoin.__isExistenceJoin(node)) {
            const existColName = SQLCompiler.cleanseColName(
                                            node.value.joinType.exists[0].name);
            const existCutColName = SQLCompiler.cleanseColName(
                               node.value.joinType.exists[0].name, false, true);
            const existColId = node.value.joinType.exists[0].exprId.id;
            retStruct.existenceCol = {
                colName: existColName,
                colId: existColId,
                rename: existCutColName + "_E" + existColId,
                colType: SQLColumnType.Boolean
            }
        }

        const eqTreesByBranch = [];
        const nonEqFilterTreesByBranch = [];
        const mapStructList = [];
        let orEqJoinOpt = false;
        if (node.value.joinType.object ===
            "org.apache.spark.sql.catalyst.plans.Inner$" && condTree
            && SQLJoin.__isOrEqJoin(condTree, eqTreesByBranch, nonEqFilterTreesByBranch, eqClassName)) {
            retStruct.filterSubtrees = retStruct.filterSubtrees || [];
            orEqJoinOpt = true;
            for (let i = 0; i < eqTreesByBranch.length; i++) {
                const mapStruct = SQLJoin.__getJoinMapArrays(node, eqTreesByBranch[i]);
                if (mapStruct.catchAll) {
                    orEqJoinOpt = false;
                    break;
                }
                mapStructList.push(mapStruct);
            }
        } else if (optimize) {
            const mapStruct = SQLJoin.__getJoinMapArrays(node, eqSubtrees);
            for (const prop in mapStruct) {
                retStruct[prop] = mapStruct[prop];
            }
        }
        if (!optimize || retStruct.catchAll) {
            // not a single eq can be untangled. defaulting back to
            // catchall join
            optimize = false;
        } else {
            if (retStruct.filterSubtrees.length > 0) {
                filterSubtrees = filterSubtrees.concat(retStruct.filterSubtrees);
                delete retStruct.filterSubtrees; // No need for this anymore
            }
        }

        // Start of flow. All branching decisions has been made
        // outerType is only used for outer joins
        const outerType = SQLJoin.__getOuterJoinType(node);
        if (orEqJoinOpt) {
            const unionTableNames = [];
            let leftRNTableName;
            let rightRNTableName;
            promise = promise.then(SQLJoin.__generateRowNumber.bind(this,
                                   retStruct, node, "full"))
                            .then(() => {
                                leftRNTableName = retStruct.leftTableName;
                                rightRNTableName = retStruct.rightTableName;
                            });
            for (let i = 0; i < mapStructList.length; i++) {
                promise = promise.then(() => {
                    const innerDeferred = PromiseHelper.deferred();
                    const mapStruct = mapStructList.shift();
                    const nonEqFilterTrees = nonEqFilterTreesByBranch.shift();
                    let innerPromise = PromiseHelper.resolve();
                    for (const prop in mapStruct) {
                        retStruct[prop] = mapStruct[prop];
                    }
                    retStruct.filterSubtrees = retStruct.filterSubtrees
                                                    .concat(nonEqFilterTrees);
                    retStruct.leftTableName = leftRNTableName;
                    retStruct.rightTableName = rightRNTableName;
                    innerPromise = innerPromise.then(SQLJoin.__handleAndEqJoin
                                                  .bind(this, retStruct, node));
                    innerPromise
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                    return innerDeferred.promise();
                })
                .then(() => {
                    unionTableNames.push(retStruct.newTableName);
                })
                .fail(deferred.reject);
            }
            promise = promise.then(function() {
                node.usrCols = jQuery.extend(true, [], node.children[0].usrCols
                                        .concat(node.children[1].usrCols));
                node.xcCols = [retStruct.leftRowNumCol, retStruct.rightRowNumCol];
                node.sparkCols = [];
                const unionCols = node.usrCols.concat(node.xcCols);
                const tableInfos = [];
                const columns = [];
                for (let j = 0; j < unionCols.length; j++) {
                    columns.push({
                        name: SQLCompiler.getCurrentName(unionCols[j]),
                        rename: SQLCompiler.getCurrentName(unionCols[j]),
                        type: xcHelper.convertSQLTypeToColType(unionCols[j].colType),
                        cast: false // Should already be casted by spark
                    });
                }
                for (let i = 0; i < unionTableNames.length; i++) {
                    tableInfos.push({
                        tableName: unionTableNames[i],
                        columns: columns
                    });
                }
                return SQLSimulator.union(tableInfos, true)
                .then(function(ret) {
                    retStruct.newTableName = ret.newTableName;
                    retStruct.cli += ret.cli;
                })
                .fail(deferred.reject);
            })
        } else if (optimize) {
            // Eq conditions + non-equi conditions (optional)
            let overwriteJoinType;
            retStruct.filterSubtrees = filterSubtrees;
            // For existence join case:
            //  if there is no non-equal filter, do a dedup on right and left outer join then map
            //  if there is, gen row num, do inner join, get row number on result and join back
            if (filterSubtrees.length > 0 && SQLJoin.__isExistenceJoin(node)) {
                overwriteJoinType = JoinOperatorT.InnerJoin;
                promise = promise.then(SQLJoin.__generateRowNumber.bind(this,
                                                                    retStruct,
                                                                    node,
                                                                    outerType));
            }

            promise = promise.then(SQLJoin.__handleAndEqJoin.bind(this,
                                                            retStruct, node,
                                                            overwriteJoinType));
            if (SQLJoin.__isExistenceJoin(node) && filterSubtrees.length > 0) {
                promise = promise.then(SQLJoin.__groupByLeftRowNum.bind(this,
                                                                    retStruct,
                                                                    node,
                                                                    false));
                promise = promise.then(SQLJoin.__joinBackMap.bind(this,
                                                                  retStruct,
                                                                  node));
            } else if (SQLJoin.__isExistenceJoin(node)) {
                // Map with filter tree
                promise = promise.then(SQLJoin.__mapExistenceColumn.bind(this,
                                                                    retStruct,
                                                                    node));
            }
        } else {
            // Non-equi conditions
            if (SQLJoin.__isSemiOrAntiJoin(node) ||
                SQLJoin.__isExistenceJoin(node) ||
                outerType) {
                promise = promise.then(SQLJoin.__generateRowNumber.bind(this,
                                                                    retStruct,
                                                                    node,
                                                                    outerType));
            }
            promise = promise.then(SQLJoin.__catchAllJoin.bind(this, retStruct,
                                                               node, condTree));
            if (SQLJoin.__isSemiJoin(node)) {
                promise = promise.then(SQLJoin.__groupByLeftRowNum.bind(this,
                                                                    retStruct,
                                                                    node, true));
            }
            if (SQLJoin.__isAntiJoin(node)) {
                promise = promise.then(SQLJoin.__groupByLeftRowNum.bind(this,
                                                                    retStruct,
                                                                    node,
                                                                    false));
                promise = promise.then(SQLJoin.__joinBackFilter.bind(this,
                                                             retStruct,
                                                             node));
            }
            if (SQLJoin.__isExistenceJoin(node)) {
                promise = promise.then(SQLJoin.__groupByLeftRowNum.bind(this,
                                                                retStruct,
                                                                node,
                                                                false));
                promise = promise.then(SQLJoin.__joinBackMap.bind(this,
                                                          retStruct,
                                                          node));
            }

            if (outerType) {
                promise = promise.then(SQLJoin.__outerJoinBack.bind(this,
                                                       retStruct,
                                                       node,
                                                       outerType));
            }
            if (hasEmptyProject) {
                promise = promise.then(SQLJoin.__projectAfterCrossJoin.bind(this,
                                                        retStruct, node));
            }
        }

        promise.fail(deferred.reject);

        promise.then(function() {
            node.xcCols = SQLCompiler.deleteIdFromColInfo(node.xcCols);

            SQLCompiler.assertCheckCollision(node.usrCols);
            SQLCompiler.assertCheckCollision(node.xcCols);
            SQLCompiler.assertCheckCollision(node.sparkCols);
            // Handle renames in all those join steps
            node.renamedCols = {};
            for (const col of node.usrCols.concat(node.sparkCols)) {
                if (col.rename && col.colId) {
                    node.renamedCols[col.colId] = col.rename;
                }
            }
            deferred.resolve({newTableName: retStruct.newTableName,
                              cli: retStruct.cli});
        })
        .fail(deferred.reject);

        // start the domino fall
        firstDeferred.resolve();

        return deferred.promise();
    }

    // *** Join condition tree visitor
    static __processAndTree(n: TreeNode, eqSubtrees: TreeNode[], filterSubtrees: TreeNode[]): void {
        let eqClassName: string = "org.apache.spark.sql.catalyst.expressions.EqualTo";
        SQLUtil.assert(n.children.length === 2,
                SQLErrTStr.JoinAndTreeTwoChildren + n.children.length);
        for (let i = 0; i < n.children.length; i++) {
            if (n.children[i].value.class ===
                "org.apache.spark.sql.catalyst.expressions.And") {
                this.__processAndTree(n.children[i], eqSubtrees, filterSubtrees);
            } else if (n.children[i].value.class === eqClassName) {
                eqSubtrees.push(n.children[i]);
            } else {
                filterSubtrees.push(n.children[i]);
            }
        }
    }
    // *** End of join condition tree visitor

    // *** Join type validators
    static __isSemiOrAntiJoin(n: TreeNode): boolean {
        return ((n.value.joinType.object ===
                "org.apache.spark.sql.catalyst.plans.LeftAnti$") ||
                (n.value.joinType.object ===
                "org.apache.spark.sql.catalyst.plans.LeftSemi$"));
    }
    static __isSemiJoin(n: TreeNode): boolean {
        return (n.value.joinType.object ===
                "org.apache.spark.sql.catalyst.plans.LeftSemi$");
    }
    static __isAntiJoin(n: TreeNode): boolean {
        return (n.value.joinType.object ===
                "org.apache.spark.sql.catalyst.plans.LeftAnti$");
    }
    static __isExistenceJoin(n: TreeNode): boolean {
        // We have different logic of handling ExistenceJoin. Ideally,
        // an ExistenceJoin will be compiled into LeftSemi by Spark.
        // But when the condition is complex it can return type of
        // "ExistenceJoin". In that case, we compile it into a
        // LeftSemi + LeftOuter + Project
        return (n.value.joinType["product-class"] ===
            "org.apache.spark.sql.catalyst.plans.ExistenceJoin");
    }
    static __isNullSafeJoin(n: TreeNode): boolean {
        let hasEqNullSafe: boolean = false;
        if (n.value.condition == null) {
            return false;
        }
        for (const element of n.value.condition) {
            if (element.class === "org.apache.spark.sql.catalyst.expressions.EqualTo") {
                return false;
            } else if (element.class === "org.apache.spark.sql.catalyst.expressions.EqualNullSafe") {
                hasEqNullSafe = true;
            }
        }
        return hasEqNullSafe;
    }
    static __isNonCrossAndJoin(
        treeNode: TreeNode,
        eqTrees: TreeNode[],
        nonEqFilterTrees: TreeNode[],
        eqClassName: string
    ): boolean {
        if (treeNode.value.class === eqClassName) {
            eqTrees.push(treeNode);
            return true;
        } else if (treeNode.value.class !==
                    "org.apache.spark.sql.catalyst.expressions.And") {
            nonEqFilterTrees.push(treeNode);
            return false;
        }
        let nonCross = false;
        for (let i = 0; i < treeNode.value["num-children"]; i++) {
            const childNode = treeNode.children[i];
            if (SQLJoin.__isNonCrossAndJoin(childNode, eqTrees, nonEqFilterTrees, eqClassName)) {
                nonCross = true;
            }
        }
        return nonCross;
    }
    static __isOrEqJoin(
        treeNode: TreeNode,
        eqTreesByBranch: TreeNode[][],
        nonEqFilterTreesByBranch: TreeNode[][],
        eqClassName: string
    ): boolean {
        if (treeNode.value.class !==
                "org.apache.spark.sql.catalyst.expressions.Or") {
            return false;
        }
        for (let i = 0; i < treeNode.value["num-children"]; i++) {
            const childNode = treeNode.children[i];
            if (childNode.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Or") {
                if (!SQLJoin.__isOrEqJoin(childNode, eqTreesByBranch,
                    nonEqFilterTreesByBranch, eqClassName)) {
                    return false;
                }
            } else {
                const eqTrees = [];
                const nonEqFilterTrees = [];
                if (SQLJoin.__isNonCrossAndJoin(childNode, eqTrees,
                    nonEqFilterTrees, eqClassName)) {
                    eqTreesByBranch.push(eqTrees);
                    nonEqFilterTreesByBranch.push(nonEqFilterTrees);
                } else {
                    return false;
                }
            }
        }
        return true;
    }
    static __getOuterJoinType(n: TreeNode): string {
        const joinType = n.value.joinType.object;
        if (joinType && joinType.endsWith("Outer$")) {
            if (joinType.endsWith("LeftOuter$")) {
                return "left";
            } else if (joinType.endsWith("RightOuter$")) {
                return "right";
            } else if (joinType.endsWith("FullOuter$")) {
                return "full";
            } else {
                SQLUtil.assert(false, SQLErrTStr.InvalidOuterType + joinType);
            }
        }
    }
    // *** End of join type validators

    // *** The two join functions. Each path will run only one of the 2 functions
    static __handleAndEqJoin(
        globalStruct: SQLJoinStruct,
        joinNode: TreeNode,
        overwriteJoinType: string
    ): XDPromise<any> {
        function handleMaps(
            mapStrArray: string[],
            origTableName: string,
            colNameArray: string[]
        ): XDPromise<any> {
            const deferred = PromiseHelper.deferred();
            if (mapStrArray.length === 0) {
                return deferred.resolve({newTableName: origTableName,
                                         colNames: []});
            }
            const newColNames = [];
            const newColStructs = [];
            let tableId = xcHelper.getTableId(origTableName);
            if (typeof tableId === "string") {
                tableId = tableId.toUpperCase();
            }
            let j = 0;
            for (let i = 0; i < mapStrArray.length; i++) {
                const tempCol = "XC_JOIN_COL_" + Authentication.getHashId().substring(3)
                        + "_" + tableId + "_" + i;
                for (; j < colNameArray.length; j++) {
                    if (colNameArray[j] === mapStrArray[i]) {
                        colNameArray[j] = tempCol;
                        break;
                    }
                }
                newColNames.push(tempCol);
                const newColStruct = {colName: tempCol,
                                    colType: SQLCompiler.getColTypeFromString(
                                                    mapStrArray[i], joinNode)};
                // Record temp cols
                newColStructs.push(newColStruct);
                joinNode.xcCols.push(newColStruct);
            }
            const newTableName = xcHelper.getTableName(origTableName) +
                    Authentication.getHashId();
            SQLSimulator.map(mapStrArray, origTableName, newColNames, newTableName)
            .then(function(ret) {
                ret.newCols = newColStructs;
                deferred.resolve(ret);
            })
            .fail(deferred.reject);
            return deferred.promise();
        }
        let joinType;
        const leftMapArray = globalStruct.leftMapArray;
        const rightMapArray = globalStruct.rightMapArray;
        const leftCols = globalStruct.leftCols;
        const rightCols = globalStruct.rightCols;
        let leftTempCols = [];
        let rightTempCols = [];
        const cliArray = [];
        const deferred = PromiseHelper.deferred();
        const leftTableName = globalStruct.leftTableName;
        const rightTableName = globalStruct.rightTableName;
        PromiseHelper.when<CliStruct>(handleMaps(leftMapArray, leftTableName, leftCols),
                           handleMaps(rightMapArray, rightTableName, rightCols))
        .then(function(res) {
            const retLeft = res[0];
            const retRight = res[1];
            leftTempCols = retLeft.newCols || [];
            rightTempCols = retRight.newCols || [];
            return SQLJoin.__groupbyForExistenceJoin(globalStruct,
                      joinNode, retLeft, retRight, cliArray, overwriteJoinType);
        })
        .then(function(ret) {
            const {retLeft, retRight} = ret;
            const lTableInfo: JoinTableInfo = {
                columns: leftCols,
                tableName: retLeft.newTableName,
                pulledColumns: [],
                rename: []
            };
            if (joinNode.xcRemoveNull) {
                // This flag is set for left anti semi join. It means to
                // removeNulls in the left table
                lTableInfo.removeNulls = true;
            }

            const rTableInfo: JoinTableInfo = {
                columns: rightCols,
                tableName: retRight.newTableName,
                pulledColumns: [],
                rename: []
            };

            // Add row number column to temp column list for rename and keep
            if (globalStruct.leftRowNumCol) {
                leftTempCols.push(globalStruct.leftRowNumCol);
            }
            if (globalStruct.rightRowNumCol) {
                rightTempCols.push(globalStruct.rightRowNumCol);
            }

            let rightColsForRename = joinNode.children[1].usrCols
                                        .concat(joinNode.children[1].sparkCols)
                                        .concat(rightTempCols);
            if (globalStruct.existenceCol && overwriteJoinType == undefined) {
                rightColsForRename = joinNode.xcCols;
            }
            const newRenames = SQLCompiler.resolveCollision(
                                        joinNode.children[0].usrCols
                                        .concat(joinNode.children[0].sparkCols)
                                        .concat(leftTempCols),
                                        rightColsForRename,
                                        lTableInfo.rename,
                                        rTableInfo.rename,
                                        lTableInfo.tableName,
                                        rTableInfo.tableName);
            joinNode.renamedCols = joinNode.children[0].renamedCols;
            globalStruct.renameMap = SQLCompiler.combineRenameMaps(
                                            [joinNode.children[0].renamedCols,
                                             joinNode.children[1].renamedCols,
                                             newRenames]);
            if (joinNode.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftSemi$" &&
                joinNode.value.joinType.object !==
                "org.apache.spark.sql.catalyst.plans.LeftAnti$") {
                joinNode.renamedCols = SQLCompiler.combineRenameMaps(
                      [joinNode.renamedCols, joinNode.children[1].renamedCols]);
            }
            joinNode.renamedCols = SQLCompiler.combineRenameMaps(
                                            [joinNode.renamedCols, newRenames]);

            if (retLeft.cli) {
                cliArray.push(retLeft.cli);
            }
            if (retRight.cli) {
                cliArray.push(retRight.cli);
            }

            const options: JoinOptions = {keepAllColumns: false};
            if (joinNode.nullSafe) {
                options.nullSafe = true;
            }
            if (overwriteJoinType !== undefined) {
                joinType = overwriteJoinType;
            } else if (globalStruct.existenceCol) {
                // ExistenceJoin is not in joinNode.value.joinType.object
                joinType = JoinOperatorT.LeftOuterJoin;
                options.existenceCol = globalStruct.existenceCol.rename;
            } else {
                switch (joinNode.value.joinType.object) {
                    case ("org.apache.spark.sql.catalyst.plans.Cross$"):
                    case ("org.apache.spark.sql.catalyst.plans.Inner$"):
                        joinType = JoinOperatorT.InnerJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.LeftOuter$"):
                        joinType = JoinOperatorT.LeftOuterJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.RightOuter$"):
                        joinType = JoinOperatorT.RightOuterJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.FullOuter$"):
                        joinType = JoinOperatorT.FullOuterJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.LeftSemi$"):
                        joinType = JoinOperatorT.LeftSemiJoin;
                        break;
                    case ("org.apache.spark.sql.catalyst.plans.LeftAnti$"):
                        joinType = JoinOperatorT.LeftAntiJoin;
                        break;
                    default:
                        SQLUtil.assert(false, SQLErrTStr.UnsupportedJoin +
                                JSON.stringify(joinNode.value.joinType.object));
                        break;
                }
            }
            if (globalStruct.filterSubtrees &&
                globalStruct.filterSubtrees.length > 0) {
                options.evalString = SQLJoin.__createFilterString(globalStruct);
            }
            return SQLSimulator.join(joinType, lTableInfo, rTableInfo, options);
        })
        .then(function(retJoin) {
            // Since we have the joined table now, we don't need the original
            // left and right tables anymore
            delete globalStruct.leftTableName;
            delete globalStruct.rightTableName;
            delete globalStruct.leftMapArray;
            delete globalStruct.rightMapArray;
            globalStruct.newTableName = retJoin.newTableName;
            if ((globalStruct.existenceCol && overwriteJoinType == undefined)
                || joinType === JoinOperatorT.LeftAntiJoin
                || joinType === JoinOperatorT.LeftSemiJoin) {
                joinNode.usrCols = joinNode.children[0].usrCols;
                joinNode.sparkCols = joinNode.children[0].sparkCols;
            } else {
                joinNode.usrCols = joinNode.children[0].usrCols
                                        .concat(joinNode.children[1].usrCols);
                joinNode.sparkCols = joinNode.children[0].sparkCols
                                        .concat(joinNode.children[1].sparkCols);
            }
            if (retJoin.tempCols) {
                for (let i = 0; i < retJoin.tempCols.length; i++) {
                joinNode.xcCols.push({colName: retJoin.tempCols[i],
                                      colType: null});
                }
            }

            cliArray.push(retJoin.cli);
            globalStruct.cli += cliArray.join("");

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    static __catchAllJoin(globalStruct, joinNode, condTree) {
        const deferred = PromiseHelper.deferred();
        // Since this is before the join, both tables must exist
        SQLUtil.assert(globalStruct.leftTableName, SQLErrTStr.NoLeftTblForJoin);
        SQLUtil.assert(globalStruct.rightTableName, SQLErrTStr.NoRightTblForJoin);

        const leftTableName = globalStruct.leftTableName;
        const rightTableName = globalStruct.rightTableName;
        const leftTempCols = [];
        const rightTempCols = [];
        if (globalStruct.leftRowNumCol) {
            leftTempCols.push(globalStruct.leftRowNumCol);
        }
        if (globalStruct.rightRowNumCol) {
            rightTempCols.push(globalStruct.rightRowNumCol);
        }

        const lTableInfo: JoinTableInfo = {
            columns: [], // CrossJoin does not need columns
            tableName: leftTableName,
            pulledColumns: [],
            rename: []
        };

        const rTableInfo: JoinTableInfo = {
            columns: [], // CrossJoin does not need columns
            tableName: rightTableName,
            pulledColumns: [],
            rename: []
        };

        const newRenames = SQLCompiler.resolveCollision(
                            joinNode.children[0].usrCols
                            .concat(joinNode.children[0].sparkCols)
                            .concat(leftTempCols),
                            joinNode.children[1].usrCols
                            .concat(joinNode.children[1].sparkCols)
                            .concat(rightTempCols),
                            lTableInfo.rename,
                            rTableInfo.rename,
                            lTableInfo.tableName,
                            rTableInfo.tableName
                            );
        joinNode.renamedCols = SQLCompiler.combineRenameMaps(
                                [joinNode.children[0].renamedCols,
                                joinNode.children[1].renamedCols, newRenames]);
        const options = {renamedCols: joinNode.renamedCols};
        const acc = {}; // for ScalarSubquery use case
        let filterEval = "";
        if (condTree) {
            filterEval = SQLCompiler.genEvalStringRecur(condTree, acc, options);
            if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Literal" &&
                condTree.value.value === "false") {
                filterEval = "neq(" +
                          SQLCompiler.getCurrentName(joinNode.xcCols[0]) + "," +
                          SQLCompiler.getCurrentName(joinNode.xcCols[0]) + ")";
            }
        }

        SQLSimulator.join(JoinOperatorT.CrossJoin, lTableInfo, rTableInfo,
                        {evalString: filterEval, keepAllColumns: false})
        .then(function(ret) {
            // Since the join is done now, we don't need leftTableName and
            // rightTableName anymore
            delete globalStruct.leftTableName;
            delete globalStruct.rightTableName;
            joinNode.usrCols = joinNode.children[0].usrCols
                                .concat(joinNode.children[1].usrCols);
            joinNode.sparkCols = joinNode.children[0].sparkCols
                                    .concat(joinNode.children[1].sparkCols);
            globalStruct.newTableName = ret.newTableName;
            globalStruct.cli += ret.cli;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }
    // *** End of join functions

    // *** Join helper functions
    static __groupbyForExistenceJoin(
        globalStruct,
        joinNode,
        retLeft,
        retRight,
        cliArray,
        overwriteJoinType
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        if (globalStruct.existenceCol && overwriteJoinType == undefined) {
            if (retRight.cli) {
                cliArray.push(retRight.cli);
            }
            const tempGBColName = "XC_GB_COL" +
                                  Authentication.getHashId().substring(3);
            const gbArgs = [{operator: "count", aggColName: "1",
                             newColName: tempGBColName}];
            for (let i = 0; i < joinNode.children[1].usrCols.length; i++) {
                if (SQLCompiler.getCurrentName(joinNode.children[1].usrCols[i])
                    === globalStruct.rightCols[0]) {
                    globalStruct.colForExistCheck = joinNode.children[1].usrCols[i];
                }
            }
            joinNode.children[1].usrCols.concat(joinNode.children[1].xcCols)
            .concat(joinNode.children[1].sparkCols).forEach(function(col) {
                const colName = col.rename || col.colName;
                if (globalStruct.rightCols.indexOf(colName) !== -1) {
                    joinNode.xcCols.push(col);
                }
            });
            SQLSimulator.groupBy(globalStruct.rightCols, gbArgs, retRight.newTableName, {})
            .then(function(ret) {
                if (ret.tempCols) {
                    for (let i = 0; i < ret.tempCols.length; i++) {
                        joinNode.xcCols.push({colName: ret.tempCols[i],
                                            colType: "DfUnknown"});
                    }
                }
                deferred.resolve({retLeft: retLeft, retRight: ret});
            })
            .fail(deferred.reject);
        } else {
            deferred.resolve({retLeft, retRight});
        }
        return deferred.promise();
    }
    static __groupByLeftRowNum(globalStruct, joinNode, incSample) {
        const deferred = PromiseHelper.deferred();
        // This is called after the join, so newTableName must exist, and join
        // would've removed leftTableName and rightTableName
        SQLUtil.assert(!globalStruct.leftTableName,
                   SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        SQLUtil.assert(!globalStruct.rightTableName,
                  SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);
        SQLUtil.assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
        SQLUtil.assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);

        let tableId = xcHelper.getTableId(globalStruct.newTableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        const tempCountCol = "XC_COUNT_" + Authentication.getHashId().substring(3)
            + "_" + tableId;
        // Record groupBy column
        joinNode.xcCols.push({colName: tempCountCol, colType: SQLColumnType.Integer});
        if (incSample) {
            joinNode.usrCols = joinNode.children[0].usrCols;
        } else {
            joinNode.usrCols = [globalStruct.leftRowNumCol];
        }

        SQLSimulator.groupBy([SQLCompiler.getCurrentName(globalStruct.leftRowNumCol)],
                            [{operator: "count", aggColName: "1",
                              newColName: tempCountCol}],
                            globalStruct.newTableName, {isIncSample: incSample})
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            // Record tempCols created from groupBy
            if (ret.tempCols) {
                for (let i = 0; i < ret.tempCols.length; i++) {
                joinNode.xcCols.push({colName: ret.tempCols[i],
                                      colType: "DfUnknown"}); // XXX xiApi temp column
                }
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    static __joinBackMap(globalStruct, joinNode) {
        const deferred = PromiseHelper.deferred();
        // This is post join, so assert that left and right tables no longer
        // exist
        SQLUtil.assert(!globalStruct.leftTableName,
                   SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        SQLUtil.assert(!globalStruct.rightTableName,
                  SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);
        SQLUtil.assert(globalStruct.leftRowNumTableName,
                       SQLErrTStr.NoLeftRowNumTableName);
        SQLUtil.assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
        SQLUtil.assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);
        SQLUtil.assert(globalStruct.existenceCol, SQLErrTStr.NoExistCol);
        // For this func to be called, the current table must only have 2 cols
        // The rowNumCol and the countCol. Both are autogenerated
        const lTableInfo: JoinTableInfo = {
            tableName: globalStruct.leftRowNumTableName,
            columns: [SQLCompiler.getCurrentName(globalStruct.leftRowNumColCopy)],
            pulledColumns: [],
            rename: []
        };
        const rTableInfo: JoinTableInfo = {
            tableName: globalStruct.newTableName,
            columns: [SQLCompiler.getCurrentName(globalStruct.leftRowNumCol)],
            pulledColumns: [],
            rename: []
        };
        const rightColsForJoin = joinNode.usrCols;
        SQLCompiler.resolveCollision(globalStruct.leftUsrColsCopy
                                    .concat(globalStruct.leftSparkColsCopy)
                                    .concat([globalStruct.leftRowNumColCopy]),
                                    rightColsForJoin,
                                    lTableInfo.rename,
                                    rTableInfo.rename,
                                    globalStruct.leftRowNumTableName,
                                    globalStruct.newTableName);
        // Record the renamed column
        joinNode.usrCols = globalStruct.leftUsrColsCopy;
        joinNode.sparkCols = globalStruct.leftSparkColsCopy;
        joinNode.xcCols = [globalStruct.leftRowNumColCopy, rightColsForJoin[0]];

        // // ExistenceCol has to be already renamed
        SQLSimulator.join(JoinOperatorT.LeftOuterJoin, lTableInfo,
                          rTableInfo, {keepAllColumns: false})
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            // Now create existence column based on left and right row num columns
            return SQLSimulator.map(["and(" + "exists(" +
                    SQLCompiler.getCurrentName(globalStruct.leftRowNumCol)
                    + ")," + "exists(" +
                    SQLCompiler.getCurrentName(rightColsForJoin[0]) + "))"],
                    ret.newTableName, globalStruct.existenceCol.rename);
        })
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            joinNode.sparkCols.push(globalStruct.existenceCol);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __outerJoinBack(globalStruct, joinNode, outerType) {
        const deferred = PromiseHelper.deferred();
        // This is post join, so assert that left and right tables no longer
        // exist
        SQLUtil.assert(!globalStruct.leftTableName,
                   SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        SQLUtil.assert(!globalStruct.rightTableName,
                  SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);

        let lTableInfo: JoinTableInfo;
        let leftColInfo;
        let rightColInfo;
        // allLeft/RightColumns: left/right part of cross join result table
        const allLeftColumns = joinNode.children[0].usrCols
                                    .concat(joinNode.children[0].sparkCols);
        const allRightColumns = joinNode.children[1].usrCols
                                    .concat(joinNode.children[1].sparkCols);
        if (globalStruct.leftRowNumCol) {
            allLeftColumns.push(globalStruct.leftRowNumCol);
        }
        if (globalStruct.rightRowNumCol) {
            allRightColumns.push(globalStruct.rightRowNumCol);
        }
        if (outerType === "right") {
            SQLUtil.assert(globalStruct.rightRowNumTableName,
                           SQLErrTStr.NoRightRowNumTableName);
            SQLUtil.assert(globalStruct.newTableName,
                           SQLErrTStr.NoNewTableName);
            SQLUtil.assert(globalStruct.rightRowNumCol,
                           SQLErrTStr.NoRightRowNumCol);
            lTableInfo = {
                tableName: globalStruct.rightRowNumTableName,
                columns: [SQLCompiler.getCurrentName(globalStruct.rightRowNumColCopy)],
                pulledColumns: [],
                rename: []
            }
            leftColInfo = globalStruct.rightUsrColsCopy
                            .concat(globalStruct.rightSparkColsCopy)
                            .concat([globalStruct.rightRowNumColCopy]);
            rightColInfo = allLeftColumns.concat(globalStruct.rightRowNumCol);
            // Handle result table column info
            // usrCols is right columns before join + left part of crossjoin result
            // xcCols is xcCols of cross join result + right row number column before join
            joinNode.usrCols = joinNode.children[0].usrCols
                                    .concat(globalStruct.rightUsrColsCopy)
                                    .concat(globalStruct.rightSparkColsCopy);
            joinNode.sparkCols = joinNode.children[0].sparkCols.concat(globalStruct.rightSparkColsCopy);
            joinNode.xcCols.push(globalStruct.rightRowNumColCopy);
        } else {
            SQLUtil.assert(globalStruct.leftRowNumTableName, SQLErrTStr.NoLeftRowNumTableName);
            SQLUtil.assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
            SQLUtil.assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);
            lTableInfo = {
                tableName: globalStruct.leftRowNumTableName,
                columns: [SQLCompiler.getCurrentName(globalStruct.leftRowNumColCopy)],
                pulledColumns: [],
                rename: []
            };
            leftColInfo = globalStruct.leftUsrColsCopy
                            .concat(globalStruct.leftSparkColsCopy)
                            .concat(globalStruct.leftRowNumColCopy);
            if (outerType === "full") {
                rightColInfo = [globalStruct.leftRowNumCol, globalStruct.rightRowNumCol];
                // For full outer joins, usrCols should be usrCols from left&right
                // and xcCols is right row number columns from both sides
                joinNode.usrCols = globalStruct.leftUsrColsCopy
                                    .concat(globalStruct.leftSparkColsCopy)
                                    .concat(globalStruct.rightUsrColsCopy)
                                    .concat(globalStruct.rightSparkColsCopy);
                joinNode.xcCols = [globalStruct.rightRowNumCol, globalStruct.rightRowNumColCopy];
                joinNode.sparkCols = globalStruct.leftSparkColsCopy.concat(globalStruct.rightSparkColsCopy);
            } else {
                rightColInfo = allRightColumns.concat(globalStruct.leftRowNumCol);
                joinNode.usrCols = globalStruct.leftUsrColsCopy
                                    .concat(globalStruct.leftSparkColsCopy)
                                    .concat(joinNode.children[1].usrCols);
                joinNode.xcCols.push(globalStruct.leftRowNumColCopy);
                joinNode.sparkCols = joinNode.children[1].sparkCols.concat(globalStruct.leftSparkColsCopy);
            }
        }
        let rTableInfo: JoinTableInfo = {
            tableName: globalStruct.newTableName,
            columns: jQuery.extend(true, [], lTableInfo.columns),
            pulledColumns: [],
            rename: []
        };
        SQLCompiler.resolveCollision(leftColInfo, rightColInfo,
            lTableInfo.rename, rTableInfo.rename,
            lTableInfo.tableName, rTableInfo.tableName);

        let promise;
        if (outerType === "right") {
            promise = SQLSimulator.join(JoinOperatorT.RightOuterJoin, rTableInfo,
                                        lTableInfo, {keepAllColumns: false});
        } else {
            promise = SQLSimulator.join(JoinOperatorT.LeftOuterJoin, lTableInfo,
                                        rTableInfo, {keepAllColumns: false});
        }
        promise
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            if (outerType === "full") {
                lTableInfo = {
                    tableName: globalStruct.rightRowNumTableName,
                    columns: [SQLCompiler.getCurrentName(globalStruct.rightRowNumColCopy)],
                    pulledColumns: [],
                    rename: []
                };
                leftColInfo = globalStruct.rightUsrColsCopy
                                    .concat(globalStruct.rightSparkColsCopy)
                                    .concat([globalStruct.rightRowNumColCopy]);
                rTableInfo = {
                    tableName: ret.newTableName,
                    columns: jQuery.extend(true, [], lTableInfo.columns),
                    pulledColumns: [],
                    rename: []
                };
                rightColInfo = [globalStruct.rightRowNumCol]
                                    .concat(globalStruct.leftUsrColsCopy)
                                    .concat(globalStruct.leftSparkColsCopy);
                // Re-use rightColInfo
                SQLCompiler.resolveCollision(leftColInfo, rightColInfo,
                                    lTableInfo.rename, rTableInfo.rename,
                                    lTableInfo.tableName, rTableInfo.tableName);

                return SQLSimulator.join(JoinOperatorT.FullOuterJoin, lTableInfo,
                                         rTableInfo, {keepAllColumns: false});
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(function(ret) {
            if (outerType === "full") {
                globalStruct.cli += ret.cli;
                globalStruct.newTableName = ret.newTableName;
            }
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __joinBackFilter(globalStruct, joinNode) {
        const deferred = PromiseHelper.deferred();
        // This is post join, so assert that left and right tables no longer
        // exist
        SQLUtil.assert(!globalStruct.leftTableName,
                   SQLErrTStr.UnexpectedTableName + globalStruct.leftTableName);
        SQLUtil.assert(!globalStruct.rightTableName,
                  SQLErrTStr.UnexpectedTableName + globalStruct.rightTableName);
        SQLUtil.assert(globalStruct.leftRowNumTableName,
                       SQLErrTStr.NoLeftRowNumTableName);
        SQLUtil.assert(globalStruct.newTableName, SQLErrTStr.NoNewTableName);
        SQLUtil.assert(globalStruct.leftRowNumCol, SQLErrTStr.NoLeftRowNumCol);

        // For this func to be called, the current table must only have 2 cols
        // The rowNumCol and the countCol. Both are autogenerated
        const lTableInfo: JoinTableInfo = {
            tableName: globalStruct.leftRowNumTableName,
            columns: [SQLCompiler.getCurrentName(globalStruct.leftRowNumColCopy)],
            pulledColumns: [],
            rename: []
        };
        const rTableInfo: JoinTableInfo = {
            tableName: globalStruct.newTableName,
            columns: [SQLCompiler.getCurrentName(globalStruct.leftRowNumCol)],
            pulledColumns: [],
            rename: []
        };
        const rightColsForJoin = joinNode.usrCols;
        SQLCompiler.resolveCollision(globalStruct.leftUsrColsCopy
                                    .concat(globalStruct.leftSparkColsCopy)
                                    .concat([globalStruct.leftRowNumColCopy]),
                                    rightColsForJoin,
                                    lTableInfo.rename,
                                    rTableInfo.rename,
                                    globalStruct.leftRowNumTableName,
                                    globalStruct.newTableName);
        // Record the renamed column
        joinNode.usrCols = globalStruct.leftUsrColsCopy;
        joinNode.sparkCols = globalStruct.leftSparkColsCopy;
        joinNode.xcCols = [globalStruct.leftRowNumColCopy, rightColsForJoin[0]];

        SQLSimulator.join(JoinOperatorT.LeftOuterJoin, lTableInfo,
                          rTableInfo, {keepAllColumns: false})
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            // Now keep only the rows where the newRowNumColName does not exist
            return SQLSimulator.filter("not(exists(" +
                        SQLCompiler.getCurrentName(globalStruct.leftRowNumCol)
                        + "))", globalStruct.newTableName);
        })
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    // This function is for joins have one of children empty (Project with empty output list)
    static __projectAfterCrossJoin(globalStruct, joinNode) {
        const deferred = PromiseHelper.deferred();
        joinNode.usrCols = joinNode.children[0].usrCols;
        joinNode.xcCols = [];
        joinNode.sparkCols = joinNode.children[0].sparkCols;

        SQLSimulator.project(joinNode.children[0].usrCols
            .concat(joinNode.children[0].sparkCols), globalStruct.newTableName)
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            globalStruct.newTableName = ret.newTableName;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __createFilterString(globalStruct) {
        const filterSubtrees = globalStruct.filterSubtrees;
        const filterEvalStrArray = [];
        let finalEvalStr = "";

        for (let i = 0; i < filterSubtrees.length; i++) {
            const subtree = filterSubtrees[i];
            const options = {renamedCols: globalStruct.renameMap};
            filterEvalStrArray.push(SQLCompiler.genEvalStringRecur(subtree,
                                                           undefined, options));
        }
        for (let i = 0; i < filterEvalStrArray.length - 1; i++) {
            finalEvalStr += "and(" + filterEvalStrArray[i] + ",";
        }
        finalEvalStr += filterEvalStrArray[filterEvalStrArray.length - 1];
        for (let i = 0; i < filterEvalStrArray.length - 1; i++) {
            finalEvalStr += ")";
        }
        return finalEvalStr;
    }

    static __getJoinMapArrays(
        node: TreeNode,
        eqSubtrees: TreeNode[]
    ): SQLJoinStruct {
        // children[0] === leftTable
        // children[1] === rightTable
        // Get all columns in leftTable and rightTable because in the eval
        // string, it can be in either order. For example:
        // WHERE t1.col1 = t2.col2 and t2.col3 = t1.col4
        const leftRDDCols = SQLJoin.getAllCols(node.children[0]);
        const rightRDDCols = SQLJoin.getAllCols(node.children[1]);
        // Check all EQ subtrees and resolve the maps

        const leftCols = [];
        const rightCols = [];

        const leftMapArray = [];
        const rightMapArray = [];

        const filterSubtrees = [];
        let leftEvalStr;
        let rightEvalStr;

        while (eqSubtrees.length > 0) {
            const eqTree = eqSubtrees.shift();
            SQLUtil.assert(eqTree.children.length === 2,
            SQLErrTStr.JoinEqTreeTwoChildren + eqTree.children.length);

            const attributeReferencesOne = [];
            const attributeReferencesTwo = [];
            const options = {renamedCols: SQLCompiler.combineRenameMaps(
                 [node.children[0].renamedCols, node.children[1].renamedCols])};
            let dontPush = false;
            SQLCompiler.getAttributeReferences(eqTree.children[0],
                                               attributeReferencesOne, options);
            SQLCompiler.getAttributeReferences(eqTree.children[1],
                                               attributeReferencesTwo, options);
            const leftAcc = {numOps: 0};
            const rightAcc = {numOps: 0};
            const leftOptions = {renamedCols: node.children[0].renamedCols};
            const rightOptions = {renamedCols: node.children[1].renamedCols};
            if (attributeReferencesOne.length === 0 ||
                attributeReferencesTwo.length === 0) {
                filterSubtrees.push(eqTree);
                dontPush = true;
            } else if (xcHelper.arraySubset(attributeReferencesOne, leftRDDCols)
                && xcHelper.arraySubset(attributeReferencesTwo, rightRDDCols)) {
                leftEvalStr = SQLCompiler.genEvalStringRecur(eqTree.children[0],
                                                          leftAcc, leftOptions);
                rightEvalStr = SQLCompiler.genEvalStringRecur(eqTree.children[1],
                                                        rightAcc, rightOptions);
            } else if (xcHelper.arraySubset(attributeReferencesOne, rightRDDCols)
                && xcHelper.arraySubset(attributeReferencesTwo, leftRDDCols)) {
                leftEvalStr = SQLCompiler.genEvalStringRecur(eqTree.children[1],
                                                          leftAcc, leftOptions);
                rightEvalStr = SQLCompiler.genEvalStringRecur(eqTree.children[0],
                                                        rightAcc, rightOptions);
            } else {
                // E.g. table1.col1.substring(2) + table2.col2.substring(2)
                // == table1.col3.substring(2) + table2.col4.substring(2)
                // There is no way to reduce this to left and right tables
                filterSubtrees.push(eqTree);
                dontPush = true;
            }

            if (!dontPush) {
                if (leftAcc.numOps > 0) {
                    leftMapArray.push(leftEvalStr);
                }
                leftCols.push(leftEvalStr);
                if (rightAcc.numOps > 0) {
                    rightMapArray.push(rightEvalStr);
                }
                rightCols.push(rightEvalStr);
            }
        }

        let retStruct: SQLJoinStruct = {};

        if (leftMapArray.length + leftCols.length === 0) {
            SQLUtil.assert(rightMapArray.length + rightCols.length === 0,
            SQLErrTStr.JoinConditionMismatch);
            retStruct.catchAll = true;
            retStruct.filterSubtrees = filterSubtrees;
        } else {
            retStruct = {
                leftMapArray: leftMapArray,
                leftCols: leftCols,
                rightMapArray: rightMapArray,
                rightCols: rightCols,
                filterSubtrees: filterSubtrees
            };
        }
        return retStruct;
    }

    static __mapExistenceColumn(
        globalStruct: SQLJoinStruct,
        joinNode: TreeNode
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();

        const joinTablename = globalStruct.newTableName;
        const checkCol = globalStruct.colForExistCheck;
        const finalEvalStr = "exists(" + SQLCompiler.getCurrentName(checkCol) + ")";

        SQLSimulator.map([finalEvalStr], joinTablename,
                         [SQLCompiler.getCurrentName(globalStruct.existenceCol)])
        .then(function(ret) {
            globalStruct.newTableName = ret.newTableName;
            globalStruct.cli += ret.cli;
            joinNode.sparkCols.push(globalStruct.existenceCol);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static __generateRowNumber(
        globalStruct: SQLJoinStruct,
        joinNode: TreeNode,
        outerType: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();

        // Since the grn call is done prior to the join, both tables must exist
        SQLUtil.assert(globalStruct.leftTableName != null,
                       SQLErrTStr.NoLeftTblForJoin);
        SQLUtil.assert(globalStruct.rightTableName != null,
                       SQLErrTStr.NoRightTblForJoin);

        let rnColName;
        let rnTableName;
        let leftTableId = xcHelper.getTableId(joinNode.children[0].newTableName);
        if (typeof leftTableId === "string") {
            leftTableId = leftTableId.toUpperCase();
        }
        let rightTableId = xcHelper.getTableId(joinNode.children[1].newTableName);
        if (typeof rightTableId === "string") {
            rightTableId = rightTableId.toUpperCase();
        }
        if (outerType === "right") {
            rnColName = "XC_RROWNUM_COL_" + Authentication.getHashId().substring(3)
                        + "_" + rightTableId;
            rnTableName = globalStruct.rightTableName;
        } else {
            rnColName = "XC_LROWNUM_COL_" + Authentication.getHashId().substring(3)
                        + "_" + leftTableId;
            rnTableName = globalStruct.leftTableName;
        }
        let rnColStruct: SQLColumn = {colName: rnColName, colType: SQLColumnType.Integer};
        joinNode.xcCols.push(rnColStruct);
        SQLSimulator.genRowNum(rnTableName, rnColName)
        .then(function(ret) {
            globalStruct.cli += ret.cli;
            if (outerType === "right") {
                globalStruct.rightTableName = ret.newTableName;
                globalStruct.rightRowNumCol = rnColStruct;
                // Need a column copy here so that it will not be renamed in first join
                globalStruct.rightUsrColsCopy = jQuery.extend(true, [],
                    joinNode.children[1].usrCols);
                globalStruct.rightSparkColsCopy = jQuery.extend(true, [],
                                    joinNode.children[1].sparkCols);
                globalStruct.rightRowNumColCopy = jQuery.extend(true, {}, rnColStruct);
                // This will be kept and not deleted
                globalStruct.rightRowNumTableName = ret.newTableName;
            } else {
                globalStruct.leftTableName = ret.newTableName;
                globalStruct.leftRowNumCol = rnColStruct;
                globalStruct.leftUsrColsCopy = jQuery.extend(true, [],
                                               joinNode.children[0].usrCols);
                globalStruct.leftSparkColsCopy = jQuery.extend(true, [],
                                                joinNode.children[0].sparkCols);
                globalStruct.leftRowNumColCopy = jQuery.extend(true, {}, rnColStruct);
                // This will be kept and not deleted
                globalStruct.leftRowNumTableName = ret.newTableName;
            }
            if (outerType === "full") {
                rnColName = "XC_RROWNUM_COL_" +
                    Authentication.getHashId().substring(3) + "_" + rightTableId;
                rnTableName = globalStruct.rightTableName;
                rnColStruct = {colName: rnColName, colType: SQLColumnType.Integer};
                joinNode.xcCols.push(rnColStruct);
                return SQLSimulator.genRowNum(globalStruct.rightTableName, rnColName)
            }
            return PromiseHelper.resolve();
        })
        .then(function(ret) {
            if (outerType === "full" && ret) {
                globalStruct.cli += ret.cli;
                globalStruct.rightTableName = ret.newTableName;
                globalStruct.rightRowNumCol = rnColStruct;
                globalStruct.rightUsrColsCopy = jQuery.extend(true, [],
                                                joinNode.children[1].usrCols);
                globalStruct.rightSparkColsCopy = jQuery.extend(true, [],
                                                joinNode.children[1].sparkCols);
                globalStruct.rightRowNumColCopy = jQuery.extend(true, {}, rnColStruct);
                // This will be kept and not deleted
                globalStruct.rightRowNumTableName = ret.newTableName;
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    static getAllCols(node: TreeNode): string[] {
        const rddCols = [];
        for (let i = 0; i < node.usrCols.length; i++) {
            if (node.usrCols[i].rename) {
                rddCols.push(node.usrCols[i].rename);
            } else {
                rddCols.push(node.usrCols[i].colName);
            }
        }
        return rddCols;
    }
    // *** End of join helper functions
}

if (typeof exports !== "undefined") {
    exports.SQLJoin = SQLJoin;
}