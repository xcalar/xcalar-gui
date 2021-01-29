const SQLPushDownDriver = {
    "Project": SQLProject,
    "Filter": SQLFilter,
    "Join": SQLJoin,
    "Sort": SQLSort,
    "Expand": SQLExpand,
    "Aggregate": SQLGroupBy,
    "XcAggregate": SQLAggregate,
    "GlobalLimit": SQLGlobalLimit,
    "Union": SQLUnion,
    "Intersect": SQLUnion,
    "Except": SQLUnion,
    "Window": SQLWindow,
    "LocalRelation": SQLLocalRelation,
    "SnowflakePredicate": SnowflakePredicate
}
class SQLCompiler {
    static compile(sqlQueryObj: SQLQuery): XDPromise<any> {
        // XXX PLEASE DO NOT DO THIS. THIS IS CRAP
        let oldKVcommit;
        if (typeof KVStore !== "undefined") {
            oldKVcommit = KVStore.commit;
            KVStore.commit = function() {
                return PromiseHelper.resolve();
            };
        }
        const deferred = PromiseHelper.deferred();
        try {
            // Catch any exception including assertion failures
            // XXX Workaround when we only support one target
            let targetName: string;
            for (let alias in sqlQueryObj.predicateTargets) {
                targetName = sqlQueryObj.predicateTargets[alias].name;
                break;
            }
            let tree = SQLCompiler.genTree(undefined, sqlQueryObj.logicalPlan,
                                           sqlQueryObj.tablePrefix, targetName);
            if (tree.value.class ===
                "org.apache.spark.sql.execution.LogicalRDD") {
                // If the logicalRDD is root, we should add an extra Project
                const newNode = TreeNodeFactory.getProjectNode(tree.value.output);
                newNode.children = [tree];
                tree.parent = newNode;
                SQLCompiler.pushUpCols(tree);
                tree = newNode;
            }

            // var numNodes = countNumNodes(tree);

            SQLCompiler.prepareUsedColIds(tree);
            const promiseArray = SQLCompiler.traverseAndPushDown(tree);
            xcConsole.log(JSON.stringify(promiseArray));
            promiseArray.push(SQLCompiler.handleDupCols.bind(this, tree));
            PromiseHelper.chain(promiseArray)
            .then(function() {
                // Tree has been augmented with xcCli
                let cliArray = [];
                SQLCompiler.getCli(tree, cliArray);
                cliArray = cliArray.map(function(cli) {
                    if (cli.endsWith(",")) {
                        cli = cli.substring(0, cli.length - 1);
                    }
                    return cli;
                });
                const xcQueryString = "[" + cliArray.join(",") + "]";
                // rename & drop columns as specified by user
                const needToDropCols = tree.xcCols.length > 0 ||
                                       tree.sparkCols.length > 0;
                return SQLSimulator.addSynthesize(xcQueryString,
                                                  tree.newTableName,
                                                  tree.usrCols, tree.orderCols,
                                                  needToDropCols);
            })
            .then(function(ret) {
                const {xcQueryString, newTableName, allColumns, orderColumns} = ret;
                sqlQueryObj.xcQueryString = xcQueryString;
                sqlQueryObj.newTableName = newTableName;
                sqlQueryObj.allColumns = allColumns;
                sqlQueryObj.orderColumns = orderColumns;
                deferred.resolve(sqlQueryObj);
            })
            .fail(function(err) {
                const errorMsg = SQLCompiler.parseError(err)
                sqlQueryObj.errorMsg = errorMsg;
                deferred.reject(errorMsg);
            })
            .always(function () {
                if (typeof KVStore !== "undefined" && oldKVcommit) {
                    // Restore the old KVcommit code
                    KVStore.commit = oldKVcommit;
                }
                XIApi.clearIndexTable();
            });
        } catch(err) {
            const errorMsg = SQLCompiler.parseError(err)
            sqlQueryObj.errorMsg = errorMsg;
            deferred.reject(errorMsg);
        }
        return deferred.promise();
    }

    static _getSparkExpression(expr: string) {
        return SparkExpressions[expr] || expr;
    }

    // Options: extractAggregates -- change aggregate nodes to a different tree
    static secondTraverse(
        node: TreeNode,
        options: SQLOption,
        isRoot: boolean,
        tablePrefix: string
    ): TreeNode {
        // This function traverses the tree for a second time.
        // To process expressions such as Substring, Case When, etc.

        // If the current node is already visited, return it
        if (node.visited) {
            return node;
        }
        let opName = node.value.class.substring(
            node.value.class.indexOf("expressions.") + "expressions.".length);
        switch (opName) {
            case (SQLCompiler._getSparkExpression("UnaryMinus")): {
                const subNode = TreeNodeFactory.getSubtractNode();
                const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                subNode.children = [zeroNode, node.children[0]];
                node = subNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("Remainder")): {
                const intNodeL = TreeNodeFactory.getCastNode("int");
                const intNodeR = TreeNodeFactory.getCastNode("int");
                intNodeL.children = [node.children[0]];
                intNodeR.children = [node.children[1]];
                break;
            }
            case (SQLCompiler._getSparkExpression("Rand")): {
                const intMax = 2147483647;
                const intMaxNode = TreeNodeFactory.getLiteralNumberNode(intMax);
                const endNode = TreeNodeFactory.getLiteralNumberNode(intMax-1);
                const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                const divNode = TreeNodeFactory.getDivideNode();
                const dupNode = TreeNodeFactory.getDupNodeWithNewName(node,
                        "org.apache.spark.sql.catalyst.expressions.GenRandom");
                divNode.children = [dupNode, intMaxNode];
                dupNode.children = [zeroNode, endNode];
                dupNode.value["num-children"] = 2;
                node = divNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("FindInSet")): {
                node.children = [node.children[1], node.children[0]];
                break;
            }
            case (SQLCompiler._getSparkExpression("Substring")): {

                // XXX since this traverse is top down, we will end up
                // traversing the subtrees twice. Might need to add a flag
                // to the node and stop traversal if the flag is already set
                const startIndex = node.children[1].value;
                const length = node.children[2].value;
                if (startIndex.class.endsWith("Literal") &&
                    startIndex.dataType === "integer") {
                    if (length.class.endsWith("Literal") &&
                        length.dataType === "integer") {
                        if (length.value * 1 <= 0) {
                            const strNode = TreeNodeFactory.getCastNode(
                                                                      "string");
                            strNode.children = [TreeNodeFactory.
                                                      getLiteralStringNode("")];
                            node = strNode;
                        } else {
                            if (startIndex.value * 1 > 0) {
                                startIndex.value = "" +
                                                     (startIndex.value * 1 - 1);
                            }
                            if (startIndex.value * 1 < 0 && startIndex.value
                                            * 1 + length.value * 1 >= 0) {
                                length.value = "0";
                            } else {
                                length.value = "" + (startIndex.value * 1 +
                                               length.value * 1);
                            }
                        }
                    } else {
                        node.value.class =
                        "org.apache.spark.sql.catalyst.expressions.XcSubstring";
                        const retNode = TreeNodeFactory.getIfNode();
                        const falseNode = TreeNodeFactory
                                            .getLiteralBooleanNode(false);
                        const gtNode = TreeNodeFactory.getGreaterThanNode();
                        const emptyStrNode = TreeNodeFactory.getCastNode(
                                                                      "string");
                        emptyStrNode.children = [TreeNodeFactory.
                                                      getLiteralStringNode("")];
                        const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                        retNode.children = [gtNode, node,
                                            emptyStrNode, falseNode];
                        gtNode.children = [node.children[2], zeroNode];
                        if (startIndex.value * 1 > 0) {
                            startIndex.value = "" + (startIndex.value * 1 - 1);
                        }
                        const addN = TreeNodeFactory.getAddNode();
                        const intN = TreeNodeFactory.getCastNode("int");
                        addN.children.push(node.children[1], node.children[2]);
                        intN.children = [addN];
                        if (startIndex.value * 1 < 0) {
                            const innerIfNode = TreeNodeFactory.getIfNode();
                            const innerFalseNode = TreeNodeFactory
                                                .getLiteralBooleanNode(false);
                            const geNode = TreeNodeFactory.
                                                      getGreaterThanEqualNode();
                            geNode.children = [intN, zeroNode];
                            innerIfNode.children = [geNode, zeroNode,
                                                    intN, innerFalseNode];
                            node.children[2] = innerIfNode;
                        } else {
                            node.children[2] = intN;
                        }
                        node = retNode;
                    }
                } else {
                    node.value.class =
                        "org.apache.spark.sql.catalyst.expressions.XcSubstring";
                    const retNode = TreeNodeFactory.getIfNode();
                    const falseNode = TreeNodeFactory
                                            .getLiteralBooleanNode(false);
                    const gtNode = TreeNodeFactory.getGreaterThanNode();
                    const emptyStrNode = TreeNodeFactory.getLiteralStringNode(
                                                                            "");
                    const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                    retNode.children = [gtNode, node, emptyStrNode, falseNode];
                    gtNode.children = [node.children[2], zeroNode];
                    const ifNodeI = TreeNodeFactory.getIfNode();
                    const falseNodeI = TreeNodeFactory
                                            .getLiteralBooleanNode(false);
                    const gtNodeI = TreeNodeFactory.getGreaterThanNode();
                    const subNode = TreeNodeFactory.getSubtractNode();

                    const intNodeS = TreeNodeFactory.getCastNode("int");
                    intNodeS.children = [node.children[1]];
                    node.children[1] = intNodeS;

                    subNode.children.push(node.children[1],
                                       TreeNodeFactory.getLiteralNumberNode(1));
                    const addN = TreeNodeFactory.getAddNode();
                    const intNLeft = TreeNodeFactory.getCastNode("int");
                    const intNRight = TreeNodeFactory.getCastNode("int");
                    const ifNodeL = TreeNodeFactory.getIfNode();
                    const falseNodeL = TreeNodeFactory
                                            .getLiteralBooleanNode(false);
                    const andN = TreeNodeFactory.getAndNode();
                    const gtNodeL = TreeNodeFactory.getGreaterThanNode();
                    const geNode = TreeNodeFactory.getGreaterThanEqualNode();
                    gtNodeL.children = [zeroNode, node.children[1]];
                    addN.children.push(ifNodeI, node.children[2]);
                    intNLeft.children = [subNode];
                    intNRight.children = [addN];
                    geNode.children = [intNRight, zeroNode];
                    andN.children = [gtNodeL, geNode];
                    ifNodeL.children = [andN, zeroNode, intNRight, falseNodeL];
                    gtNodeI.children = [node.children[1], zeroNode];
                    ifNodeI.children = [gtNodeI, intNLeft,
                                        node.children[1], falseNodeI];
                    node.children[1] = ifNodeI;
                    node.children[2] = ifNodeL;
                    node = retNode;
                }
                break;
            }
            // Left & Right are now handled by UDFs
            // case ("expressions.Left"):
            // case ("expressions.Right"):
            case (SQLCompiler._getSparkExpression("Like")): {
                SQLUtil.assert(node.children.length === 2,
                            SQLErrTStr.LikeTwoChildren + node.children.length);
                const strNode = node.children[1];
                const stringRepNode = TreeNodeFactory.getStringReplaceNode();

                const pctNode = TreeNodeFactory.getLiteralStringNode("%");
                const starNode = TreeNodeFactory.getLiteralStringNode("*");

                stringRepNode.children.push(strNode);
                stringRepNode.children.push(pctNode);
                stringRepNode.children.push(starNode);

                node.children[1] = stringRepNode;

                break;
            }
            case (SQLCompiler._getSparkExpression("CaseWhenCodegen")):
            case (SQLCompiler._getSparkExpression("CaseWhen")): {
                if (node.value.elseValue && node.children.length % 2 !== 1) {
                    // If there's an elseValue, then num children must be odd
                    SQLUtil.assert(false, SQLErrTStr.CaseWhenOdd +
                                                        node.children.length);
                }
                // Check whether to use if or ifstr
                // XXX backend to fix if and ifStr such that `if` is generic
                // For now we are hacking this
                const newNode = TreeNodeFactory.getIfNode();
                let curNode = newNode;
                let lastNode;
                // Time to reassign the children
                for (let i = 0; i < Math.floor(node.children.length/2); i++) {
                    curNode.children.push(node.children[i*2]);
                    curNode.children.push(node.children[i*2+1]);
                    const nextNode = TreeNodeFactory.getIfNode();
                    const trueNode = TreeNodeFactory
                                            .getLiteralBooleanNode(true);
                    curNode.children.push(nextNode, trueNode);
                    lastNode = curNode;
                    curNode = nextNode;
                }

                SQLUtil.assert(lastNode.children.length === 4,
                        SQLErrTStr.CaseWhenLastNode + lastNode.children.length);

                // has else clause
                if (node.children.length % 2 === 1) {
                   lastNode.children[2] = node.children[node.children.length-1];
                } else {
                    // no else clause
                    // We need to create our own terminal condition
                    // XXX There's a backend bug here with if
                    // if (type === "string") {
                    //     litNode = literalStringNode("");
                    // } else {
                    //     litNode = literalNumberNode(0.1337);
                    // }
                    const litNode = TreeNodeFactory.getLiteralNullNode();
                    lastNode.children[2] = litNode;
                }

                node = newNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("In")): {
                // Note: The first OR node or the ONLY In node will be the root
                // of the tree
                SQLUtil.assert(node.children.length >= 2,
                            SQLErrTStr.InChildrenLength + node.children.length);
                if (node.children.length < 1025) {
                    break;
                }
                let newInNode;
                const newNode = TreeNodeFactory.getOrNode();
                let prevOrNode = newNode;
                let index = 1;
                for (let i = 0; i < (node.children.length - 1) / 1023; i++) {
                    if (newInNode) {
                        prevOrNode.children.push(newInNode);
                        newInNode = TreeNodeFactory.getInNode(Math.min(1024,
                                                node.children.length - index));
                    }
                    newInNode.children = [node.children[0]];
                    while (index < node.children.length &&
                                        newInNode.children.length < 1024) {
                        newInNode.children.push(node.children[index]);
                        index++;
                    }
                    if (index === node.children.length) {
                        prevOrNode.children.push(newInNode);
                    } else {
                        const newOrNode = TreeNodeFactory.getOrNode();
                        prevOrNode.children.push(newOrNode);
                        prevOrNode = newOrNode;
                    }
                }
                node = newNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("Cast")): {
                const type = node.value.dataType;
                const convertedType = SQLCompiler.convertSparkTypeToXcalarType(
                                                                          type);
                node.value.class = node.value.class.replace("expressions.Cast",
                                        "expressions.XcType." + convertedType);
                break;
            }
            case (SQLCompiler._getSparkExpression("aggregate.AggregateExpression")): {
                // If extractAggregates is true, then we need to cut the tree
                // here and construct a different tree
                if (!isRoot && options && options.extractAggregates) {
                    SQLUtil.assert(node.children.length === 1,
                      SQLErrTStr.AggregateExpressionOne + node.children.length);
                    SQLUtil.assert(node.children[0].value.class
                                       .indexOf("expressions.aggregate.") > 0,
                           SQLErrTStr.AggregateFirstChildClass +
                           node.children[0].value.class);
                    // We need to cut the tree at this node, and instead of
                    // having a child, remove the child and assign it as an
                    // aggregateTree
                    const aggNode = node.children[0];
                    node.children = [];
                    node.value["num-children"] = 0;
                    node.aggTree = aggNode;
                    node.aggVariable = ""; // To be filled in by genEval
                }
                break;
            }
            case (SQLCompiler._getSparkExpression("ScalarSubquery")): {
                // The result of the subquery should be a single value
                // XXX Currently, Aggregate node should be the first in the plan
                // This assertion is NO longer valid when we move to TPCDS
                // Will be fixed soon.
                if (node.value.plan[0].class ===
                    "org.apache.spark.sql.catalyst.plans.logical.Aggregate") {
                    node.value.plan[0].class =
                      "org.apache.spark.sql.catalyst.plans.logical.XcAggregate";
                    const subqueryTree = SQLCompiler.genTree(undefined,
                                                      node.value.plan.slice(0),
                                                      tablePrefix);
                    SQLCompiler.prepareUsedColIds(subqueryTree);
                    node.subqueryTree = subqueryTree;
                } else {
                    const xcAggNode = TreeNodeFactory.getXcAggregateNode();
                    const subqueryTree = SQLCompiler.genTree(xcAggNode,
                                                      node.value.plan.slice(0),
                                                      tablePrefix);
                    SQLCompiler.prepareUsedColIds(subqueryTree);
                    xcAggNode.children = [subqueryTree];
                    node.subqueryTree = xcAggNode;
                }
                // Need to process immediately to get type
                node.subqueryTree.aggType = SQLCompiler.getXcAggType(
                                                             node.subqueryTree);
                break;
            }
            case (SQLCompiler._getSparkExpression("Year")):
            case (SQLCompiler._getSparkExpression("Quarter")):
            case (SQLCompiler._getSparkExpression("Month")):
            case (SQLCompiler._getSparkExpression("DayOfWeek")):
            case (SQLCompiler._getSparkExpression("DayOfMonth")):
            case (SQLCompiler._getSparkExpression("Hour")):
            case (SQLCompiler._getSparkExpression("Minute")):
            case (SQLCompiler._getSparkExpression("Second")): {
                SQLUtil.assert(node.children.length === 1,
                            SQLErrTStr.DateTimeOneChild + node.children.length);
                const lookUpDict = {
                    "Year": "Y",
                    "Quarter": "Q",
                    "Month": "M",
                    "DayOfWeek": "W",
                    "DayOfMonth": "D",
                    "Hour": "H",
                    "Minute": "M",
                    "Second": "S"
                };
                const argNode = TreeNodeFactory.
                                       getLiteralStringNode(lookUpDict[opName]);
                node.children.push(argNode);
                node.value["num-children"]++;
                break;
            }
            case (SQLCompiler._getSparkExpression("FromUnixTime")): {
                SQLUtil.assert(node.children.length === 2,
                         SQLErrTStr.UnixTimeTwoChildren + node.children.length);
                const multNode = TreeNodeFactory.getMultiplyNode();
                const thousandNode = TreeNodeFactory.getLiteralNumberNode(1000);
                multNode.children = [node.children[node.value["sec"]],
                                                                  thousandNode];
                node.children = [multNode];
                node.value["num-children"] = 1;
                break;
            }
            case (SQLCompiler._getSparkExpression("ToUnixTimestamp")):
            case (SQLCompiler._getSparkExpression("UnixTimestamp")): {
                // Takes in string/date/timestamp.
                // We cast all to timestamp first.
                SQLUtil.assert(node.children.length === 2,
                         SQLErrTStr.UnixTimeTwoChildren + node.children.length);
                // remove format node
                const cNode = TreeNodeFactory.getCastNode("timestamp");
                cNode.children = [node.children[node.value["timeExp"]]];
                const intNode = TreeNodeFactory.getCastNode("int");
                const divNode = TreeNodeFactory.getDivideNode();
                const parentIntNode = TreeNodeFactory.getCastNode("int");
                intNode.children = [cNode];
                divNode.children = [intNode,
                                    TreeNodeFactory.getLiteralNumberNode(1000)];
                parentIntNode.children = [divNode];
                node = parentIntNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("TimeAdd")):
            case (SQLCompiler._getSparkExpression("TimeSub")): {
                SQLUtil.assert(node.children.length === 2,
                     SQLErrTStr.TimeIntervalTwoChildren + node.children.length);
                const intervalNode = node.children[node.value["interval"]];
                SQLUtil.assert(intervalNode.value.class ===
                        "org.apache.spark.sql.catalyst.expressions.Literal",
                        SQLErrTStr.TimeIntervalType + intervalNode.value.class);
                const intervalTypes = ["years",  "months", "days", "hours",
                                       "minutes", "seconds"];
                const intervalArray = [0, 0, 0, 0, 0, 0];
                const typeStr = intervalNode.value.value;
                const intervalParts = typeStr.split(" ");
                for (let i = 1; i < intervalParts.length; i += 2) {
                    const num = parseInt(intervalParts[i]);
                    const type = intervalParts[i + 1];
                    if (intervalTypes.indexOf(type) > -1) {
                        intervalArray[intervalTypes.indexOf(type)] += num;
                    } else if (type === "week") {
                        intervalArray[intervalTypes.indexOf("days")] += 7 * num;
                    } else if (type === "milliseconds") {
                        intervalArray[intervalTypes.indexOf("seconds")] +=
                                                                     num / 1000;
                    } else {
                        SQLUtil.assert(false,
                                     SQLErrTStr.UnsupportedIntervalType + type);
                    }
                }
                let intervalStr = "";
                for (let i = 0; i < intervalArray.length; i++) {
                    if (opName === "TimeSub") {
                        intervalStr += "-" + intervalArray[i] + ",";
                    } else {
                        intervalStr += intervalArray[i] + ",";
                    }
                }
                if (intervalStr.endsWith(",")) {
                    intervalStr = intervalStr.substring(0,
                                                        intervalStr.length - 1);
                }
                const newIntervalNode = TreeNodeFactory.
                                              getLiteralStringNode(intervalStr);
                node.children[node.value["interval"]] = newIntervalNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("DateFormatClass")): {
                SQLUtil.assert(node.children.length === 2,
                       SQLErrTStr.DateFormatTwoChildren + node.children.length);
                const formatNode = node.children[1];
                if (formatNode.value.class ===
                        "org.apache.spark.sql.catalyst.expressions.Literal") {
                    let formatStr = formatNode.value.value;
                    const segments = formatStr.split("%");
                    for (let i in segments) {
                        segments[i] = segments[i]
                                .replace(/(^|[^%])(YYYY|yyyy|YYY|yyy)/g, "$1%Y")
                                .replace(/(^|[^%])(YY|yy)/g, "$1%y")
                                .replace(/(^|[^%])(Y|y)/g, "$1%Y")
                                .replace(/(^|[^%])(MM|M)/g, "$1%m")
                                .replace(/(^|[^%])(dd|d)/g, "$1%d")
                                .replace(/(^|[^%])(HH|H)/g, "$1%H")
                                .replace(/(^|[^%])(hh|h)/g, "$1%I")
                                .replace(/(^|[^%])(mm|m)/g, "$1%M")
                                .replace(/(^|[^%])(ss|s)/g, "$1%S");
                    }
                    formatStr = segments.join("%%");
                    formatNode.value.value = formatStr;
                } else {
                    SQLUtil.assert(false, SQLErrTStr.DateFormatNotColumn);
                }
                // var intNode = castNode("int");
                // intNode.children = [node];
                // node = intNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("Coalesce")): {
                // XXX It's a hack. It should be compiled into CASE WHEN as it
                // may have more than 2 children
                SQLUtil.assert(node.children.length === 2,
                       SQLErrTStr.CoalesceTwoChildren + node.children.length);

                const newNode = TreeNodeFactory.getIfNode();
                const falseNode = TreeNodeFactory
                                        .getLiteralBooleanNode(false);
                // XXX Revisit for strings
                const childNode = TreeNodeFactory.getExistNode();
                childNode.children.push(node.children[0]);
                newNode.children.push(childNode, node.children[0],
                                      node.children[1], falseNode);
                node = newNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("IsNull")): {
                const nNode = TreeNodeFactory.getNotNode();
                const notNNode = TreeNodeFactory.getExistNode();
                nNode.children = [notNNode];
                notNNode.children = [node.children[0]];
                node = nNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("CheckOverflow")):
            case (SQLCompiler._getSparkExpression("PromotePrecision")): {
                SQLUtil.assert(node.children.length === 1,
                        SQLErrTStr.DecimalNodeChildren + node.children.length);
                node = SQLCompiler.secondTraverse(node.children[0], options,
                                                  false, tablePrefix);
                break;
            }
            case (SQLCompiler._getSparkExpression("StringInstr")): {
                const retNode = TreeNodeFactory.getAddNode();
                const fNode = TreeNodeFactory.getFindNode();
                const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                const oneNode = TreeNodeFactory.getLiteralNumberNode(1);
                retNode.children = [fNode, oneNode];
                fNode.children = [node.children[node.value["str"]],
                    node.children[node.value["substr"]], zeroNode, zeroNode];
                node = retNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("StringLocate")): {
                const retNode = TreeNodeFactory.getAddNode();
                const subNode = TreeNodeFactory.getSubtractNode();
                const fNode = TreeNodeFactory.getFindNode();
                const intNode = TreeNodeFactory.getCastNode("int");
                const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                const oneNode = TreeNodeFactory.getLiteralNumberNode(1);
                retNode.children = [fNode, oneNode];
                intNode.children = [subNode];
                subNode.children = [node.children[node.value["start"]], oneNode];
                fNode.children = [node.children[node.value["str"]],
                    node.children[node.value["substr"]], intNode, zeroNode];
                node = retNode;
                break;
            }
            case (SQLCompiler._getSparkExpression("Rank")):
            case (SQLCompiler._getSparkExpression("PercentRank")):
            case (SQLCompiler._getSparkExpression("DenseRank")): {
                node.children = [];
                node.value["num-children"] = 0;
                break;
            }
            case (SQLCompiler._getSparkExpression("TruncTimestamp")):
            case (SQLCompiler._getSparkExpression("DateDiff")): {
                node.children = [node.children[1], node.children[0]];
                break;
            }
            case (SQLCompiler._getSparkExpression("AddMonths")): {
                node.value["num-children"] = 4;
                const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                node.children = [node.children[0], zeroNode, node.children[1], zeroNode];
                break;
            }
            case (SQLCompiler._getSparkExpression("DateAdd")): {
                SQLUtil.assert(node.children.length === 2,
                        SQLErrTStr.DateSubTwoChildren + node.children.length);
                node.value["num-children"] = 4;
                const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                node.children = [node.children[0], zeroNode, zeroNode, node.children[1]];
                break;
            }
            case (SQLCompiler._getSparkExpression("DateSub")): {
                SQLUtil.assert(node.children.length === 2,
                        SQLErrTStr.DateSubTwoChildren + node.children.length);
                node.value["num-children"] = 4;
                const zeroNode = TreeNodeFactory.getLiteralNumberNode(0);
                const intNode = TreeNodeFactory.getCastNode("int");
                const mulNode = TreeNodeFactory.getMultiplyNode();
                const mOneNode = TreeNodeFactory.getLiteralNumberNode(-1);
                intNode.children = [mulNode];
                mulNode.children = [mOneNode, node.children[1]];
                node.children = [node.children[0], zeroNode, zeroNode, intNode];
                break;
            }
            case (SQLCompiler._getSparkExpression("aggregate.CollectList")): {
                // XXX this is a workaround because we don't have list type
                node.value.class =
                    "org.apache.spark.sql.catalyst.expressions.aggregate.ListAgg";
                break;
            }
            // case ("expressions.FromUTCTimestamp"):
            //     assert(node.children.length === 2,
            //             SQLErrTStr.UTCTZTwoChildren + node.children.length);
            //     var formatNode = node.children[1];
            //     if (formatNode.value.class ===
            //             "org.apache.spark.sql.catalyst.expressions.Literal") {
            //         // TODO
            //         // var formatStr = formatNode.value.value;
            //         // formatStr = formatStr.replace(/YYYY|yyyy|YYY|yyy/g, "%Y")
            //         //                     .replace(/YY|yy/g, "%y")
            //         //                     .replace(/Y|y/g, "%Y")
            //         //                     .replace(/MM|M/g, "%M")
            //         //                     .replace(/dd|d/g, "%d")
            //         //                     .replace(/HH|H/g, "%H")
            //         //                     .replace(/hh|h/g, "%I")
            //         //                     .replace(/mm|m/g, "%M")
            //         //                     .replace(/ss|s/g, "%S");
            //         // if (formatStr.indexOf("%%") > -1) {
            //         //     // XXX FIXME Limiting the valid formats now as I can't
            //         //     // find a perfect regex solution. Feel free to extend it
            //         //     assert(0, SQLErrTStr.InvliadDateFormat);
            //         // }
            //         // formatNode.value.value = formatStr;
            //     } else {
            //         assert(0, SQLErrTStr.UTCTZNotColumn);
            //     }
            //     break;
            default:
                break;
        }

        // This must be a top down resolution. This is because of the Aggregate
        // Expression case, where we want to cut the tree at the top most
        // Aggregate Expression
        for (let i = 0; i < node.children.length; i++) {
            node.children[i] = SQLCompiler.secondTraverse(node.children[i],
                                                  options, false, tablePrefix);
        }

        const curOpName = node.value.class.substring(node.value.class
                            .indexOf("expressions.") + "expressions.".length);

        // XXX This should also be removed after we have list type
        if (curOpName === "aggregate.ListAgg" &&
            node.children[0].colType != "string") {
            SQLUtil.assert(false,
                            "Collect_list is only supported with string input");
        }

        if (node.aggTree) {
            // aggTree's root node is expressions.aggregate.*
            // so it won't hit any of the cases in second traverse
            // however, its grandchildren might be substring, etc.
            node.aggTree = SQLCompiler.secondTraverse(node.aggTree, options,
                                                      true, tablePrefix);
            node.colType = SQLCompiler.getColType(node.aggTree);
        } else if (node.subqueryTree) {
            node.colType = node.subqueryTree.aggType;
        } else if (curOpName ===
                   SQLCompiler._getSparkExpression("AttributeReference") ||
                   curOpName === SQLCompiler._getSparkExpression("Literal")) {
            node.colType = SQLCompiler.convertSparkTypeToXcalarType(node.value.dataType);
        } else if (curOpName === "XCEPassThrough") {
            // XXX Remove second block when type map added to sqldf
           SQLUtil.assert(node.value.name.indexOf("xdf_") !== 0,
                                                      SQLErrTStr.XDFNotSupport);
            if (node.value.name.indexOf("xdf_") === 1) {
                const xdfType = node.value.name[0];
                switch (xdfType) {
                    case "i":
                        node.colType = SQLColumnType.Integer;
                        break;
                    case "f":
                        node.colType = SQLColumnType.Float;
                        break;
                    case "s":
                        node.colType = SQLColumnType.String;
                        break;
                    case "b":
                        node.colType = SQLColumnType.Boolean;
                        break;
                    case "m":
                    case "n":
                        node.colType = SQLColumnType.Money;
                        break;
                    case "t":
                        node.colType = SQLColumnType.Timestamp;
                        break;
                    default:
                        SQLUtil.assert(false, "Unsupported xdf type: " + xdfType);
                }
                node.value.name = node.value.name.substring(1);
            } else {
                node.colType = SQLColumnType.String;
            }
        } else if (curOpName === "XCEParameter") {
            node.colType = SQLColumnType.String;
        } else if (curOpName === SQLCompiler._getSparkExpression("If")) {
            if (SQLCompiler.getColType(node.children[1]) == null) {
                node.colType = SQLCompiler.getColType(node.children[2]);
            } else {
                node.colType = SQLCompiler.getColType(node.children[1]);
            }
        } else if (SparkExprToXdf[curOpName] &&
                   SparkExprToXdf[curOpName].indexOf("*") != -1) {
            if (curOpName === "Lead" || curOpName === "Lag") {
                node.colType = SQLCompiler.getColType(node.children[0]);
            } else if (curOpName ===
                       SQLCompiler._getSparkExpression("PercentRank") ||
                       curOpName ===
                       SQLCompiler._getSparkExpression("CumeDist")) {
                node.colType = SQLColumnType.Float;
            } else {
                node.colType = SQLColumnType.Integer;
            }
        } else {
            node.colType = OperatorTypes[SparkExprToXdf[curOpName]] ||
                           SQLCompiler.getColType(node.children[0]);
        }
        opName = node.value.class.substring(node.value.class
                            .indexOf("expressions.") + "expressions.".length);
        if (opName === SQLCompiler._getSparkExpression("Round") &&
            SQLCompiler.getColType(node.children[0]) === "money") {
            node.value.class = node.value.class + "Numeric";
            node.colType = SQLColumnType.Money;
        } else if (opName === SQLCompiler._getSparkExpression("Add") ||
                   opName === SQLCompiler._getSparkExpression("Subtract") ||
                   opName === SQLCompiler._getSparkExpression("Multiply") ||
                   opName === SQLCompiler._getSparkExpression("Abs") ||
                   opName === SQLCompiler._getSparkExpression("Divide") ||
                   opName === SQLCompiler._getSparkExpression("aggregate.Sum") ||
                   opName === SQLCompiler._getSparkExpression("aggregate.Max") ||
                   opName === SQLCompiler._getSparkExpression("aggregate.Min") ||
                   opName === SQLCompiler._getSparkExpression("aggregate.Average")) {
            let allInteger = true;
            let allMoney = true;
            for (let i = 0; i < node.children.length; i++) {
                if (SQLCompiler.getColType(node.children[i]) != "int") {
                    allInteger = false;
                }
                if (SQLCompiler.getColType(node.children[i]) != "money") {
                    allMoney = false;
                }
            }
            if (allInteger &&
                opName != SQLCompiler._getSparkExpression("aggregate.Average") &&
                opName != SQLCompiler._getSparkExpression("Divide")) {
                node.value.class = node.value.class + "Integer";
                node.colType = SQLColumnType.Integer;
            } else if (allMoney) {
                // Money and integer ops are slightly different
                node.value.class = node.value.class + "Numeric";
                node.colType = SQLColumnType.Money;
            }
        } else if (opName === SQLCompiler._getSparkExpression("If") &&
                   SQLCompiler.getColType(node.children[1]) === "money" &&
                   SQLCompiler.getColType(node.children[2]) === "money") {
            node.value.class = node.value.class + "Numeric";
            node.colType = SQLColumnType.Money;
        }
        node.visited = true;
        if (opName === SQLCompiler._getSparkExpression("UnaryMinus") &&
            node.children[1].colType === "int") {
            const intNode = TreeNodeFactory.getCastNode("int");
            intNode.children = [node];
            node = intNode;
            node.visited = true;
        }
        return node;
    }
    static getColType(node: TreeNode): SQLColumnType {
        if (!node.colType) {
            console.error("Invalid compiler type");
            return;
        } else {
            return node.colType;
        }
    }
    static getColTypeFromString(item: string, node: TreeNode): SQLColumnType {
        if (typeof item !== "string") {
            return null;
        } else if (item.indexOf(":") !== -1 && item.indexOf(":") < item.indexOf("(")) {
            // UDF case, always return string
            return SQLColumnType.String;
        } else if (item.indexOf("*") === 0) {
            let opName = item.substring(1, item.indexOf("("));
            switch (opName) {
                case "lead":
                case "lag":
                    let firstArg = "";
                    let parCount = 0;
                    for (let i = item.indexOf("(") + 1; i < item.length; i++) {
                        if (item[i] === "," && parCount === 0) {
                            return SQLCompiler.getColTypeFromString(firstArg, node);
                        } else {
                            firstArg = firstArg + item[i];
                            if (item[i] === "(") {
                                parCount++;
                            } else if (item[i] === ")") {
                                parCount--;
                            }
                        }
                    }
                    return null;
                case "first":
                case "last":
                    return SQLCompiler.getColTypeFromString(
                        item.substring(item.indexOf("(") + 1, item.length), node);
                case "percentRank":
                case "cumeDist":
                    return SQLColumnType.Float;
                default:
                    return SQLColumnType.Integer;
            }
        } else if (item.indexOf("(") !== -1) {
            return OperatorTypes[item.substring(0, item.indexOf("("))] || null;
        } else {
            // Column name case
            let returnType;
            node.usrCols.concat(node.xcCols).concat(node.sparkCols).forEach(function(col) {
                if (SQLCompiler.getCurrentName(col) === item) {
                    returnType = col.colType || null;
                }
            });
            return returnType || null;
        }
    }
    static pushUpCols(node: TreeNode): void {
        // In pushUpCols, we have four types of column arrays which are used to
        // track columns/IDs at each node. Columns are stored as objects
        // e.g. {colName: "col1", colId: 123, rename: "col1_E123"}

        // A general rule applies to all those four arrays in pushUpCols:
        // Every node may add or remove columns/IDs in those arrays if needed.
        // Otherwise, arrays will be pushed up to its parent without modification.

        // The four column arrays are:
        // 1. usrCols: visible to the user at a given node.
        // They get updated in Project, Aggregate and Join.

        // 2. xcCols: temp columns generated by xcalar.
        // They get updated in Aggregate and Join.

        // 3. sparkCols: temp columns generated by spark.
        // XXX sparkCols need to be implemented later. We've seen three possible
        // cases: 1) colName#exprId. Spark will create an Alias expression for
        // it. Then it goes to usrCols. We just need to record it in sparkCols.
        // 2) "exist" in Existence Join. We will handle it when implementing
        // Existence Join.
        // 3) "Expand" logical plan

        // 4. renamedCols: an object that contains all renamed columns where key
        // is colId and value is renamedColName e.g.{"1": "col_1", "2": "col_2"}
        // They get updated in Project, Aggregate and Join.

        // Push cols names to its direct parent, except from Join
        if (node.parent && node.parent.value.class !== SparkOperators.Join &&
            node.parent && node.parent.value.class !== SparkOperators.Union &&
            node.parent && node.parent.value.class !== SparkOperators.Except &&
            node.parent && node.parent.value.class !== SparkOperators.Intersect
            ) {
            // Must create a deep copy of the array.
            // Otherwise we are just assigning the pointer. So when the
            // parent changes, the children change as well.
            node.parent.usrCols = jQuery.extend(true, [], node.usrCols);
            node.parent.xcCols = jQuery.extend(true, [], node.xcCols);
            node.parent.sparkCols = jQuery.extend(true, [], node.sparkCols);
            // This is a map of renamed column ids and new names
            node.parent.renamedCols = jQuery.extend(true, {},
                                                        node.renamedCols);
            // A list of columns used to sort in case later operators reorder table
            node.parent.orderCols = jQuery.extend(true, [], node.orderCols);
        }
        // Duplicate columns pulled out in sql. Map {id -> duplicate times}
        if (node.parent && node.parent.dupCols) {
            jQuery.extend(true, node.parent.dupCols, node.dupCols);
        } else if (node.parent) {
            node.parent.dupCols = jQuery.extend(true, {}, node.dupCols);
        }
    }
    static genTree(
        parent: TreeNode,
        logicalPlan: any,
        tablePrefix: string,
        predicateTargetName?: string
    ): TreeNode {
        const newNode = TreeNodeFactory.getGeneralNode(logicalPlan.shift(),
                                                       tablePrefix);
        if (newNode.value.class === SQLPrefix.snowflakePredicatePrefix) {
            // We need to set the data target
            newNode.targetName = predicateTargetName;
        }
        if (parent) {
            newNode.parent = parent;
            if (newNode.value.class ===
                                  "org.apache.spark.sql.execution.LogicalRDD") {
                // Push up here as we won't access it during traverseAndPushDown
                SQLCompiler.pushUpCols(newNode);
            }
        }
        for (let i = 0; i < newNode.value["num-children"]; i++) {
            newNode.children.push(SQLCompiler.genTree(newNode, logicalPlan,
                                                                  tablePrefix,
                                                                  predicateTargetName));
        }
        return newNode;
    }
    static genExpressionTree(
        parent: TreeNode,
        logicalPlan: any,
        options: SQLOption = {},
        tablePrefix: string
    ) {
        return SQLCompiler.secondTraverse(SQLCompiler.genTree(parent,
                         logicalPlan, tablePrefix), options, true, tablePrefix);
    };

    // static countNumNodes(tree: TreeNode): number {
    //     let count = tree.value.class ===
    //                 "org.apache.spark.sql.execution.LogicalRDD" ? 0 : 1;
    //     for (let i = 0; i < tree.children.length; i++) {
    //         count += SQLCompiler.countNumNodes(tree.children[i]);
    //     }
    //     return count;
    // }
    static traverseAndPushDown(node: TreeNode): XDPromise<any>[] {
        const promiseArray = [];
        SQLCompiler.traverse(node, promiseArray);
        return promiseArray;
    }
    static traverse(node: TreeNode, promiseArray: XDPromise<any>[]): void {
        for (let i = 0; i < node.children.length; i++) {
            SQLCompiler.traverse(node.children[i], promiseArray);
        }
        if (node.value.class.indexOf(SQLPrefix.logicalOpPrefix) === 0 ||
                    node.value.class.indexOf(SQLPrefix.snowflakePredicatePrefix) === 0) {
            promiseArray.push(SQLCompiler.pushDown.bind(this, node));
        }
    }
    static pushDown(treeNode: TreeNode): XDPromise<any> {
        // XXX Remove after type change completed
        // if (treeNode.usrCols) {
        //     treeNode.usrCols.forEach(function(col) {
        //         assert(col.colType, "Column have no type!");
        //         assert(col.colType != "DfUnknown", "Column with unknown type: " + __getCurrentName(col));
        //     })
        // }
        const deferred = PromiseHelper.deferred();
        let promise;
        if ( treeNode.value.class.indexOf(SQLPrefix.snowflakePredicatePrefix) == 0) {
            promise = SQLPushDownDriver["SnowflakePredicate"].compile(treeNode);
        } else {
            const operator = treeNode.value.class.substring(
                "org.apache.spark.sql.catalyst.plans.logical.".length);
            if (SQLPushDownDriver.hasOwnProperty(operator)) {
                promise = SQLPushDownDriver[operator].compile(treeNode);
            } else {
                console.error("Unexpected operator: ", operator);
                // Ignore the operator during compilation
                promise = SQLIgnore.compile(treeNode);
            }
        }
        promise
        .then(function(ret) {
            if (ret) {
                if (ret.newTableName) {
                    treeNode.newTableName = ret.newTableName;
                }
                if (ret.cli) {
                    treeNode.xcCli = ret.cli;
                }
                for (const prop in ret) {
                    if (prop !== "newTableName" && prop !== "cli") {
                        treeNode[prop] = ret[prop];
                    }
                }
            }
            // Pass cols to its parent
            SQLCompiler.pushUpCols(treeNode);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }
    static getCli(node: TreeNode, cliArray: string[]): void {
        for (let i = 0; i < node.children.length; i++) {
            SQLCompiler.getCli(node.children[i], cliArray);
        }
        if ((node.value.class.indexOf(SQLPrefix.logicalOpPrefix) === 0
            || node.value.class === SQLPrefix.snowflakePredicatePrefix) &&
            node.xcCli) {
            if (node.xcCli.endsWith(";")) {
                node.xcCli = node.xcCli.substring(0, node.xcCli.length - 1);
            }
            cliArray.push(node.xcCli);
        }
    }
    static handleDupCols(node: TreeNode): XDPromise<any> {
        if (Object.keys(node.dupCols).length === 0) {
            return PromiseHelper.resolve();
        }
        const deferred = PromiseHelper.deferred();
        const mapStrs = [];
        const newColNames = [];
        const newColStructs = [];
        const colNameSet = new Set();
        let tableId = xcHelper.getTableId(node.newTableName);
        if (typeof tableId === "string") {
            tableId = tableId.toUpperCase();
        }
        node.usrCols.concat(node.xcCols).concat(node.sparkCols).forEach(function(col) {
            colNameSet.add(SQLCompiler.getCurrentName(col));
        })
        for (let colId in node.dupCols) {
            const dupNum = node.dupCols[colId];
            let colName;
            let origName;
            let colType;
            node.usrCols.forEach(function(col) {
                if (col.colId === Number(colId)) {
                    colName = col.colName;
                    origName = SQLCompiler.getCurrentName(col);
                    colType = col.colType;
                    return false;
                }
            })
            for (let i = 0; i < dupNum; i++) {
                let newName = origName + "_" + (i + 1);
                while (colNameSet.has(newName)) {
                    newName = newName + "_" + tableId;
                }
                colNameSet.add(newName);
                mapStrs.push(colType + "(" + origName + ")");
                newColNames.push(newName);
                newColStructs.push({colName: colName, colId: Number(colId),
                                    colType: colType, rename: newName});
            }
        }
        SQLSimulator.map(mapStrs, node.newTableName, newColNames)
        .then(function(ret) {
            node.newTableName = ret.newTableName;
            node.xcCli += ret.cli;
            node.usrCols = node.usrCols.concat(newColStructs);
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static resolveCollision(
        leftCols: SQLColumn[],
        rightCols: SQLColumn[],
        leftRename: ColRenameInfo[],
        rightRename: ColRenameInfo[],
        leftTableName: string,
        rightTableName: string,
        checkSameCol?: boolean
    ) {
        // There could be three colliding cases:

        // 1. their xx their => keep the left and rename the right using the
        // exprId. according to spark's documentation, it's guaranteed to be
        // globally unique. Also, I confirmed that in the corner case
        // (subquery+join) we made, it is referring to the correct id. How it
        //  works is like: the exprId is firstly generated in the subquery and
        //  then referred by the outside query.

        // 2. our xx our => just append a random ID. In the query, there will
        // be no reference to columns generated by us. Therefore all we need to
        // do is to resolve the collision. No need to worry about other
        // references in genXXX() functions.

        // 3. our xx their => rename our column because it's only temp col and
        // will not be visible to the user.

        // After the keepAllColumns change, will put all columns into rename
        // list even if they're not renamed
        const newRenames = {};
        const colSet = new Set();
        const idSet = new Set();
        leftRename = leftRename || [];
        rightRename = rightRename || [];
        let rightTableId = xcHelper.getTableId(rightTableName);
        if (typeof rightTableId === "string") {
            rightTableId = rightTableId.toUpperCase();
        }
        for (let i = 0; i < leftCols.length; i++) {
            const colName = leftCols[i].rename || leftCols[i].colName;
            colSet.add(colName);
            if (checkSameCol && leftCols[i].colId) {
                idSet.add(leftCols[i].colId);
            }
            leftRename.push(xcHelper.getJoinRenameMap(colName, colName,
                xcHelper.convertColTypeToFieldType(
                    xcHelper.convertSQLTypeToColType(leftCols[i].colType))));
        }
        for (let i = 0; i < rightCols.length; i++) {
            const colName = rightCols[i].rename || rightCols[i].colName;
            if (checkSameCol && rightCols[i].colId && idSet.has(rightCols[i].colId)) {
                continue;
            }
            if (colSet.has(colName)) {
                let newName = colName + "_E" + rightTableId;
                while (colSet.has(newName)) {
                    newName = newName + "_E" + rightTableId;
                }
                rightRename.push(xcHelper.getJoinRenameMap(colName, newName,
                    xcHelper.convertColTypeToFieldType(
                        xcHelper.convertSQLTypeToColType(rightCols[i].colType))));
                rightCols[i].rename = newName;
                colSet.add(newName);
                if (rightCols[i].colId) {
                    newRenames[rightCols[i].colId] = newName;
                }
            } else {
                colSet.add(colName);
                rightRename.push(xcHelper.getJoinRenameMap(colName, colName,
                    xcHelper.convertColTypeToFieldType(
                        xcHelper.convertSQLTypeToColType(rightCols[i].colType))));
            }
        }
        return newRenames;
    }

    static combineRenameMaps(renameMaps: SQLRenameColumns[]): SQLRenameColumns {
        const retMap = renameMaps[0];
        for (let i = 1; i < renameMaps.length; i++) {
            for (const attr in renameMaps[i]) {
                retMap[attr] = renameMaps[i][attr];
            }
        }
        return retMap;
    }

    static assertCheckCollision(cols: SQLColumn[]): void {
        if (cols.length > 0) {
            const set = new Set();
            for (let i = 0; i < cols.length; i++) {
                if (cols[i].rename) {
                    if (set.has(cols[i].rename)) {
                        SQLUtil.assert(false, SQLErrTStr.NameCollision +
                                                                cols[i].rename);
                        // We should never hit this
                    }
                    set.add(cols[i].rename);
                } else {
                    if (set.has(cols[i].colName)) {
                        SQLUtil.assert(false, SQLErrTStr.NameCollision +
                                                               cols[i].colName);
                        // We should never hit this
                    }
                    set.add(cols[i].colName);
                }
            }
        }
    }

    static genSQLColumn(value: any, options): SQLColumn {
        const retStruct: SQLColumn = {};
        // Assert that this is only used on alias and ar nodes
        SQLUtil.assert(value.class && (value.class ===
                "org.apache.spark.sql.catalyst.expressions.Alias" ||
                value.class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference"),
                SQLErrTStr.BadGenColStruct + value.class);
        retStruct.colName = SQLCompiler.cleanseColName(value.name);
        retStruct.colId = value.exprId.id;
        if (options && options.renamedCols && options.renamedCols[retStruct.colId]) {
            retStruct.rename = options.renamedCols[retStruct.colId];
        } else {
            const colNameCut = SQLCompiler.cleanseColName(value.name, false, true);
            if (retStruct.colName !== colNameCut) {
                retStruct.rename = colNameCut;
                if (options && options.renamedCols) {
                    options.renamedCols[value.exprId.id] = colNameCut;
                }
            }
        }
        if (value.dataType) {
            retStruct.colType = SQLCompiler.convertSparkTypeToXcalarType(value.dataType);
        }
        return retStruct;
    }

    static getCurrentName(col: SQLColumn): string {
        return col.rename || col.colName;
    }

    static deleteIdFromColInfo(
        cols: SQLColumn[]
    ): {
        colName: string,
        colType: SQLColumnType
    }[] {
        const retList = [];
        for (let i = 0; i < cols.length; i++) {
            retList.push({colName: SQLCompiler.getCurrentName(cols[i]),
                          colType: cols[i].colType});
        }
        return retList;
    }

    static findColIds(node: TreeNode, colIds): void {
        const opName = node.value.class.substring(
                        node.value.class.lastIndexOf(".") + 1);
        if (opName === "Or" || opName === "Concat" || opName === "IsNotNull"
            || opName === "ScalarSubquery" || opName === "IsNull"
            || opName === "EqualNullSafe") {
            return;
        } else if (opName === "AttributeReference") {
            colIds.push(node.value.exprId.id);
        }
        for (let i = 0; i < node.children.length; i++) {
            SQLCompiler.findColIds(node.children[i], colIds);
        }
    }

    static extractUsedCols(node: TreeNode): void {
        const colIds = [];
        if (node.value.condition) {
            const dupCondition = jQuery.extend(true, [], node.value.condition);
            const tree = SQLCompiler.genTree(undefined, dupCondition,
                                             node.tablePrefix);
            SQLCompiler.findColIds(tree, colIds);
        }
        node.usedColIds = node.usedColIds.concat(colIds);
    }

    static trackRenamedUsedCols(node: TreeNode): void {
        const renameIdsMap = {};
        let mapList;
        if (node.value.class === "org.apache.spark.sql.catalyst.plans.logical.Project") {
            mapList = node.value.projectList;
        } else {
            mapList = node.value.aggregateExpressions;
        }
        for (let i = 0; i < mapList.length; i++) {
            if (mapList[i].length === 2 && mapList[i][0].class ===
                "org.apache.spark.sql.catalyst.expressions.Alias" &&
                mapList[i][1].class ===
                "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                const aliasId = mapList[i][0].exprId.id;
                const origId = mapList[i][1].exprId.id;
                renameIdsMap[origId] = renameIdsMap[origId] || [];
                renameIdsMap[origId].push(aliasId);
            }
        }
        for (const origId in renameIdsMap) {
            let valid = true;
            for (let i = 0; i < renameIdsMap[origId].length; i++) {
                if (node.usedColIds.indexOf(renameIdsMap[origId][i]) === -1) {
                    valid = false;
                    break;
                }
            }
            if (valid) {
                node.usedColIds.push(Number(origId));
            }
        }
    }

    static prepareUsedColIds(node: TreeNode): void {
        if (!node.usedColIds) {
            node.usedColIds = [];
        }
        const treeNodeClass = node.value.class.substring(
            "org.apache.spark.sql.catalyst.plans.logical.".length);
        if (treeNodeClass === "Join" || treeNodeClass === "Filter") {
            SQLCompiler.extractUsedCols(node);
        } else if (treeNodeClass === "Project" || treeNodeClass === "Aggregate") {
            SQLCompiler.trackRenamedUsedCols(node);
        }
        for (let i = 0; i < node.children.length; i++) {
            node.children[i].usedColIds = node.usedColIds;
            this.prepareUsedColIds(node.children[i]);
        }
    }

    static genEvalStringRecur(
        condTree: TreeNode,
        acc?: SQLAccumulator,
        options?: SQLOption
    ): string {
        // Traverse and construct tree
        let outStr = "";
        acc = acc || {};
        const opName = condTree.value.class.substring(condTree.value.class
                            .indexOf("expressions.") + "expressions.".length);
        if (opName in SparkExprToXdf ||
            opName === SQLCompiler._getSparkExpression("aggregate.AggregateExpression") ||
            opName === SQLCompiler._getSparkExpression("ScalarSubquery") ||
            opName === SQLCompiler._getSparkExpression("XCEPassThrough") ||
            opName === SQLCompiler._getSparkExpression("XCEParameter")) {
            let numLeftPar: number = 0;
            if (opName.indexOf("aggregate.") === 0) {
                if (opName === "aggregate.AggregateExpression") {
                    if (acc) {
                        acc.isDistinct = condTree.value.isDistinct;
                    }
                    if (condTree.aggTree) {
                        // We need to resolve the aggTree and then push
                        // the resolved aggTree's xccli into acc
                        SQLUtil.assert(condTree.children.length === 0,
                               SQLErrTStr.AggTreeShouldCut);
                        SQLUtil.assert(acc != null,
                                       SQLErrTStr.AggTreeShouldHaveAcc);
                        SQLUtil.assert(acc.aggEvalStructArray != null,
                                       SQLErrTStr.AccShouldHaveEval);

                        // It's very important to include a flag in acc.
                        // This is what we are relying on to generate the
                        // string. Otherwise it will assign it to
                        // acc.operator
                        const aggAcc = {numOps: 0, noAssignOp: true};
                        const aggEvalStr = SQLCompiler.genEvalStringRecur(
                                             condTree.aggTree, aggAcc, options);
                        const prefix = options.prefix || "";
                        const aggVarName = prefix + "XC_AGG_" +
                                    Authentication.getHashId().substring(3);
                        let countType;
                        if (condTree.aggTree.value.class ===
                        "org.apache.spark.sql.catalyst.expressions.aggregate.Count") {
                            countType = SQLCompiler.getColType(
                                                  condTree.aggTree.children[0]);
                        }
                        const colType = SQLCompiler.getColType(condTree.aggTree);
                        acc.aggEvalStructArray.push({aggEvalStr: aggEvalStr,
                                                     aggVarName: aggVarName,
                                                     numOps: aggAcc.numOps,
                                                     countType: countType,
                                                     colType: colType});
                        outStr += colType + "(";
                        if (options && options.xcAggregate) {
                            outStr += "^";
                        }
                        outStr += aggVarName + ")";
                    } else {
                        SQLUtil.assert(condTree.children.length > 0,
                                       SQLErrTStr.CondTreeChildren);
                    }
                } else {
                    if (acc) {
                        // Conversion of max/min/sum
                        let opString = SparkExprToXdf[opName];
                        if (opString === "max" || opString === "min") {
                            switch (condTree.colType) {
                                case ("int"):
                                case ("bool"):
                                    opString += "Integer";
                                    break;
                                case ("string"):
                                    opString += "String";
                                    break;
                                case ("timestamp"):
                                    opString += "Timestamp";
                                    break;
                                case ("float"):
                                    opString += "Float";
                                    break;
                                default:
                                    break;
                            }
                        } else if (opString === "sum" && condTree.colType === "int") {
                            opString += "Integer";
                        }
                        if (acc.noAssignOp) {
                            acc.numOps += 1;
                            outStr += opString + "(";
                            numLeftPar++;
                        } else {
                            acc.operator = opString;
                            if (opString === "first" || opString === "last") {
                                if (condTree.children[1].value.value == null) {
                                    acc.arguments = ["false"];
                                } else {
                                    acc.arguments = [condTree.children[1].value.value];
                                }
                                condTree.value["num-children"] = 1;
                            }
                            if (options.xcAggregate) {
                                outStr += opString + "(";
                                numLeftPar++;
                            }
                        }
                    } else {
                        // Conversion of max/min/sum
                        let opString = SparkExprToXdf[opName];
                        if (opString === "max" || opString === "min") {
                            switch (condTree.colType) {
                                case ("int"):
                                case ("bool"):
                                    opString += "Integer";
                                    break;
                                case ("string"):
                                    opString += "String";
                                    break;
                                case ("timestamp"):
                                    opString += "Timestamp";
                                    break;
                                case ("float"):
                                    opString += "Float";
                                    break;
                                default:
                                    break;
                            }
                        } else if (opString === "sum" && condTree.colType === "int") {
                            opString += "Integer";
                        }
                        outStr += opString + "(";
                        numLeftPar++;
                    }
                }
            } else if (opName.indexOf("ScalarSubquery") === 0) {
                // Subquery should have subqueryTree and no child
                SQLUtil.assert(condTree.children.length === 0,
                               SQLErrTStr.SubqueryNoChild);
                SQLUtil.assert(condTree.subqueryTree != null,
                               SQLErrTStr.SubqueryTree);
                SQLUtil.assert(acc.subqueryArray != null,
                               SQLErrTStr.AccSubqueryArray);
                const prefix = options.prefix || "";
                const subqVarName = prefix + "XC_SUBQ_" +
                                    Authentication.getHashId().substring(3);
                condTree.subqueryTree.subqVarName = subqVarName;
                acc.subqueryArray.push({subqueryTree: condTree.subqueryTree});
                outStr += condTree.subqueryTree.aggType + "(^" + subqVarName + ")";
            } else if (opName === "XCEParameter") {
                outStr = '"' + condTree.value.name + '"';
                if (acc.hasOwnProperty("params")) {
                    acc.params.push(condTree.value.name.substring(1,
                                    condTree.value.name.length - 1));
                }
            } else {
                if (acc && acc.hasOwnProperty("numOps")) {
                    acc.numOps += 1;
                }
                if (opName === "XCEPassThrough") {
                    SQLUtil.assert(condTree.value.name !== undefined,
                                   SQLErrTStr.UDFNoName);
                    if (condTree.value.name.indexOf("xdf_") === 0) {
                        SQLUtil.assert(condTree.value.name != "xdf_explodeString",
                                       SQLErrTStr.XdfExplodeString);
                        outStr += condTree.value.name.substring(4) + "(";
                    } else if (condTree.value.name.indexOf(":") === -1) {
                        outStr += "sql:" + condTree.value.name + "(";
                    } else {
                        outStr += condTree.value.name + "(";
                    }
                    numLeftPar++;
                    if (acc.hasOwnProperty("udfs")) {
                        acc.udfs.push(condTree.value.name.toUpperCase());
                    }
                } else {
                    // Conversion of if, money conversion is in secondTraverse
                    let opString = SparkExprToXdf[opName];
                    if (opString === "if") {
                        switch (condTree.colType) {
                            case ("int"):
                                opString = "ifInt";
                                break;
                            case ("bool"):
                                opString = "bool(ifInt";
                                numLeftPar++;
                                break;
                            case ("string"):
                                opString = "ifStr";
                                break;
                            case ("timestamp"):
                                opString = "ifTimestamp";
                                break;
                            default:
                                break;
                        }
                    }
                    outStr += opString + "(";
                    numLeftPar++;
                }
            }
            for (let i = 0; i < condTree.value["num-children"]; i++) {
                outStr += SQLCompiler.genEvalStringRecur(condTree.children[i],
                                                         acc, options);
                if (i < condTree.value["num-children"] -1) {
                    outStr += ",";
                }
            }
            while (numLeftPar > 0) {
                outStr += ")";
                numLeftPar--;
            }
        } else {
            // When it's not op
            if (condTree.value.class ===
               "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                // Column Name
                let colName = SQLCompiler.cleanseColName(condTree.value.name);
                const id = condTree.value.exprId.id;
                if (options && options.renamedCols &&
                    options.renamedCols[id]) {
                    // XXX spark column not included here
                    // not sure whether this AR could be spark column
                    colName = options.renamedCols[id];
                }
                outStr += colName;
            } else if (condTree.value.class ===
                "org.apache.spark.sql.catalyst.expressions.Literal") {
                if (condTree.value.value == null) {
                    outStr += "None";
                } else if (condTree.value.dataType === "string" ||
                    condTree.value.dataType === "calendarinterval") {
                    outStr += JSON.stringify(condTree.value.value);
                } else if (condTree.value.dataType === "timestamp" ||
                           condTree.value.dataType === "date") {
                    outStr += 'timestamp(' + JSON.stringify(condTree.value.value) + ')';
                } else if (condTree.value.dataType.indexOf("decimal(") === 0) {
                    outStr += 'money(\'' + condTree.value.value + '\')';
                } else {
                    // XXX Check how they rep booleans
                    outStr += condTree.value.value;
                }
            } else {
                SQLUtil.assert(false, SQLErrTStr.UnsupportedOperator + condTree.value.class);
            }
            SQLUtil.assert(condTree.value["num-children"] === 0,
                           SQLErrTStr.NonOpShouldHaveNoChildren);
        }
        return outStr;
    }

    static genMapArray(
        evalList: any,
        columns: SQLColumn[],
        evalStructArray: SQLEvalStruct[],
        aggEvalStructArray: SQLAggEvalStruct[],
        options: SQLOption,
        subqueryArray?: SQLSubqueryStruct[],
    ): {
        dupCols: SQLDupColumns
    } {
        // A map to check if there is duplicate column pull out
        const dupCols = {};

        // Note: Only top level agg functions are not extracted
        // (idx !== undefined check). The rest of the
        // agg functions will be extracted and pushed into the aggArray
        // The evalStrArray will be using the ^aggVariables
        for (let i = 0; i < evalList.length; i++) {
            const colStruct: SQLColumn = {};
            if (evalList[i].length > 1) {
                let treeNode;
                const genTreeOpts: SQLOption = {extractAggregates: true};
                if (options && options.groupBy) {
                    treeNode = SQLCompiler.genExpressionTree(undefined,
                                             evalList[i].slice(0), genTreeOpts,
                                             options.prefix);
                } else {
                    SQLUtil.assert(evalList[i][0].class ===
                            "org.apache.spark.sql.catalyst.expressions.Alias",
                            SQLErrTStr.FirstChildAlias);
                    treeNode = SQLCompiler.genExpressionTree(undefined,
                        evalList[i].slice(1), genTreeOpts, options.prefix);
                }
                let countType = undefined;
                if (treeNode.value.class === "org.apache.spark.sql.catalyst." +
                    "expressions.aggregate.AggregateExpression" &&
                    treeNode.children[0].value.class ===
                    "org.apache.spark.sql.catalyst.expressions.aggregate.Count") {
                    countType = SQLCompiler.getColType(
                                              treeNode.children[0].children[0]);
                }
                const acc: SQLAccumulator = {
                                        aggEvalStructArray: aggEvalStructArray,
                                        numOps: 0,
                                        udfs: [],
                                        params: [],
                                        subqueryArray: subqueryArray};
                const evalStr = SQLCompiler.genEvalStringRecur(treeNode, acc, options);

                let newColName;
                if (options && options.groupBy) {
                    newColName = SQLCompiler.cleanseColName(evalStr, true);
                } else {
                    newColName = SQLCompiler.cleanseColName(
                                                     evalList[i][0].name, true);
                    colStruct.colId = evalList[i][0].exprId.id;
                }
                // XCEPASSTHROUGH -> UDF_NAME, XCEPARAMETER -> PARAM_NAME
                colStruct.colName = newColName;
                newColName = SQLCompiler.cleanseColName(
                             SQLCompiler.replaceParamName(
                             SQLCompiler.replaceUDFName(newColName, acc.udfs),
                             acc.params),
                             false, true);
                colStruct.colType = SQLCompiler.getColType(treeNode);
                if (newColName !== colStruct.colName) {
                    colStruct.rename = newColName;
                    colStruct.udfColName = newColName;
                    if (options && options.renamedCols && colStruct.colId) {
                        options.renamedCols[colStruct.colId] = newColName;
                    }
                }
                const evalStruct: SQLEvalStruct = {
                                    newColName: newColName,
                                    evalStr: evalStr,
                                    numOps: acc.numOps,
                                    colId: colStruct.colId,
                                    countType: countType,
                                    colType: SQLCompiler.getColType(treeNode)
                                };

                if (acc.isDistinct) {
                    evalStruct.isDistinct = true;
                }

                if (options && options.operator) {
                    evalStruct.operator = acc.operator;
                    evalStruct.arguments = acc.arguments;
                }
                if (evalList[i].length === 2 && (!options || !options.groupBy)) {
                    if (evalList[i][1].class ===
                    "org.apache.spark.sql.catalyst.expressions.AttributeReference"
                    || evalList[i][1].class ===
                    "org.apache.spark.sql.catalyst.expressions.Literal") {
                        // This is a special alias case
                        SQLUtil.assert(evalList[i][1].dataType, SQLErrTStr.NoDataType);
                        const dataType = SQLCompiler.convertSparkTypeToXcalarType(
                                                    evalList[i][1].dataType);
                        evalStruct.evalStr = dataType + "(" +
                                             evalStruct.evalStr + ")";
                        evalStruct.numOps += 1;
                    } else if (evalList[i][1].class ===
                        "org.apache.spark.sql.catalyst.expressions.XCEParameter") {
                        const dataType = SQLCompiler.convertSparkTypeToXcalarType(
                                                evalList[i][1].paramType);
                        evalStruct.evalStr = dataType + "(" +
                                            evalStruct.evalStr + ")";
                        evalStruct.numOps += 1;
                    }
                }
                evalStructArray.push(evalStruct);
            } else {
                const curColStruct = evalList[i][0];
                SQLUtil.assert(curColStruct.class !==
                    "org.apache.spark.sql.catalyst.expressions.XCEParameter",
                    SQLErrTStr.UnexpectedParam);
                if (curColStruct.class !==
                    "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
                    SQLUtil.assert(options && options.groupBy && curColStruct.class ===
                        "org.apache.spark.sql.catalyst.expressions.Literal",
                        SQLErrTStr.EvalOnlyChildAttr);
                    const treeNode = SQLCompiler.genExpressionTree(undefined,
                                        evalList[i].slice(0), {}, options.prefix);
                    const acc = {aggEvalStructArray: aggEvalStructArray,
                                 numOps: 0,
                                 udfs: [],
                                 subqueryArray: subqueryArray};
                    let evalStr = SQLCompiler.genEvalStringRecur(treeNode, acc, options);
                    evalStr = SQLCompiler.getColType(treeNode) + "(" + evalStr + ")";
                    const newColName = SQLCompiler.cleanseColName(evalStr, true) + "_"
                                        + Authentication.getHashId().substring(3);
                    colStruct.colName = newColName;
                    colStruct.colType = SQLCompiler.getColType(treeNode);
                    const retStruct = {newColName: newColName,
                                       evalStr: evalStr,
                                       numOps: 1,
                                       colId: undefined,
                                       countType: undefined,
                                       colType: SQLCompiler.getColType(treeNode)};
                    evalStructArray.push(retStruct);
                } else {
                    colStruct.colName = SQLCompiler.cleanseColName(curColStruct.name);
                    colStruct.colId = curColStruct.exprId.id;
                    colStruct.colType = SQLCompiler.convertSparkTypeToXcalarType(curColStruct.dataType);
                    if (options && options.renamedCols &&
                        options.renamedCols[colStruct.colId]) {
                        colStruct.rename = options.renamedCols[colStruct.colId];
                    }
                }
            }
            if (colStruct.colId && dupCols[colStruct.colId] > 0) {
                dupCols[colStruct.colId]++;
            } else {
                dupCols[colStruct.colId] = 1;
                columns.push(colStruct);
            }
        }
        for (let colId in dupCols) {
            if (dupCols[colId] === 1) {
                delete dupCols[colId];
            } else {
                dupCols[colId]--;
            }
        }
        const retStruct = {
            dupCols: dupCols
        }
        return retStruct;
    }

    static produceSubqueryCli(subqueryArray: SQLSubqueryStruct[]): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        if (subqueryArray.length === 0) {
            return PromiseHelper.resolve("");
        }
        let promiseArray = [];
        for (let i = 0; i < subqueryArray.length; i++) {
            // traverseAndPushDown returns promiseArray with length >= 1
            promiseArray = promiseArray.concat(SQLCompiler.traverseAndPushDown(
                                               subqueryArray[i].subqueryTree));
        }
        PromiseHelper.chain(promiseArray)
        .then(function() {
            let cliStatements = "";
            // Replace subqueryName in filterString
            // Subquery result must have only one value
            for (let i = 0; i < subqueryArray.length; i++) {
                const cliArray = [];
                SQLCompiler.getCli(subqueryArray[i].subqueryTree, cliArray);
                for (let j = 0; j < cliArray.length; j++) {
                    cliStatements += cliArray[j];
                }
            }
            deferred.resolve(cliStatements);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static produceAggregateCli(
        aggEvalStructArray: SQLAggEvalStruct[],
        tableName: string
    ): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        let cliStatements = "";
        const promiseArray = [];

        if (aggEvalStructArray.length === 0) {
            return PromiseHelper.resolve("");
        }
        function handleAggStatements(
            aggEvalStr: string,
            aggSrcTableName: string,
            aggVarName: string
        ): XDPromise<any> {
            const innerDeferred = PromiseHelper.deferred();
            SQLSimulator.aggregateWithEvalStr(aggEvalStr, aggSrcTableName,
                                              aggVarName)
            .then(function(retStruct) {
                cliStatements += retStruct.cli;
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
            return innerDeferred.promise();
        }

        if (aggEvalStructArray.length > 0) {
            // Do aggregates first then do filter
            for (let i = 0; i < aggEvalStructArray.length; i++) {
                promiseArray.push(handleAggStatements.bind(this,
                                  aggEvalStructArray[i].aggEvalStr,
                                  tableName,
                                  aggEvalStructArray[i].aggVarName));
            }
        }
        PromiseHelper.chain(promiseArray)
        .then(function() {
            deferred.resolve(cliStatements);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    static getXcAggType(node: TreeNode): SQLColumnType {
        if (node.children.length !== 1) {
            // Edge case:
            // Cross join, Intersect & Except.
            // (but not Union bc it's prepended with an Aggregate)
            // Need to make sure closest descendant projects have one column in total.
            if (node.value.class !==
                "org.apache.spark.sql.catalyst.plans.logical.Join" &&
                node.value.class !==
                "org.apache.spark.sql.catalyst.plans.logical.Intersect" &&
                node.value.class !==
                "org.apache.spark.sql.catalyst.plans.logical.Except"
                ) {
                SQLUtil.assert(false, SQLErrTStr.XcAggOneChild + node.value.class);
            }  else {
                const leftColsLen = SQLCompiler.getProjectListLen(node.children[0]);
                const rightColsLen = SQLCompiler.getProjectListLen(node.children[1]);
                if (node.value.class ===
                    "org.apache.spark.sql.catalyst.plans.logical.Join") {
                    SQLUtil.assert(leftColsLen + rightColsLen === 1,
                      SQLErrTStr.XcAggOneColumn + (leftColsLen + rightColsLen));
                } else {
                    SQLUtil.assert(leftColsLen === 1 && rightColsLen === 1,
                     SQLErrTStr.XcAggOneColumn + (leftColsLen || rightColsLen));
                }
            }
        }
        if (node.value.aggregateExpressions) {
            SQLUtil.assert(node.value.aggregateExpressions.length === 1,
                           SQLErrTStr.SubqueryOneColumn +
                           node.value.aggregateExpressions.length);
            const index = node.value.aggregateExpressions[0][0].class ===
                        "org.apache.spark.sql.catalyst.expressions.Alias" ? 1 : 0;
            const treeNode = SQLCompiler.genExpressionTree(undefined,
                                node.value.aggregateExpressions[0].slice(index),
                                undefined, node.tablePrefix);
            return SQLCompiler.getColType(treeNode);
        } else if (node.value.class ===
            "org.apache.spark.sql.catalyst.plans.logical.Project") {
            SQLUtil.assert(node.value.projectList.length === 1,
                  SQLErrTStr.SubqueryOneColumn + node.value.projectList.length);
            const columns = [];
            SQLCompiler.genMapArray(node.value.projectList, columns, [], [], {}, []);
            return columns[0].colType;
        } else {
            return this.getXcAggType(node.children[0]);
        }
    }
    static getProjectListLen(node: TreeNode): number {
        let len = 0;
        if (node.value.class ===
            "org.apache.spark.sql.catalyst.plans.logical.Project") {
            len = node.value.projectList.length;
        } else {
            for (let i = 0; i < node.children.length; i++) {
                len += this.getProjectListLen(node.children[i]);
            }
        }
        return len;
    }

    static getAttributeReferences(
        treeNode: TreeNode,
        arr: string[],
        options
    ): void {
        if (treeNode.value.class ===
            "org.apache.spark.sql.catalyst.expressions.AttributeReference") {
            let attrName = treeNode.value.name;
            const id = treeNode.value.exprId.id;
            if (options && options.renamedCols &&
                options.renamedCols[id]) {
                attrName = options.renamedCols[id];
            }
            if (arr.indexOf(attrName) === -1) {
                arr.push(SQLCompiler.cleanseColName(attrName));
            }
        }

        for (let i = 0; i < treeNode.children.length; i++) {
            this.getAttributeReferences(treeNode.children[i], arr, options);
        }
    }

    static convertSparkTypeToXcalarType(dataType: any): SQLColumnType {
        if (typeof dataType !== "string") {
            console.error(SQLErrTStr.UnsupportedColType + JSON.stringify(dataType));
            return SQLColumnType.String;
        }
        let typeStr = dataType.split("(")[0]
        if (typeStr == "decimal" || typeStr == "number") {
            // example format -> decimal(38, 0) or number(12, 2)
            let tmpArr = dataType.substring(dataType.indexOf("(") + 1, dataType.indexOf(")")).split(",")
            if (tmpArr.length > 1) {
                let scale = tmpArr.pop()
                if (parseInt(scale) > 0) {
                    return SQLColumnType.Money;
                }
            }
            return SQLColumnType.Integer;
        }
        switch (typeStr) {
            case ("double"):
            case ("float"):
                return SQLColumnType.Float;
            case ("integer"):
            case ("int"):
            case ("long"):
            case ("short"):
            case ("bigint"):
            case ("smallint"):
            case ("byte"):
            case ("null"):
                return SQLColumnType.Integer;
            case ("boolean"):
                return SQLColumnType.Boolean;
            case ("string"):
            case ("varchar"):
            case ("char"):
            case ("text"):
            case ("binary"):
            case ("varbinary"):
                return SQLColumnType.String;
            case ("date"):
            case ("timestamp"):
                return SQLColumnType.Timestamp;
            default:
                SQLUtil.assert(false, SQLErrTStr.UnsupportedColType + dataType);
                return SQLColumnType.String;
        }
    }

    static cleanseColName(
        name: string,
        isNewCol?: boolean,
        cutName?: boolean
    ): string {
        if (isNewCol) {
            name = xcHelper.stripPrefixInColName(name);
        }
        let ret = xcHelper.cleanseSQLColName(name).toUpperCase();
        if (cutName && ret.length > XcalarApisConstantsT.XcalarApiMaxFieldNameLen / 2) {
            ret = ret.substring(ret.length - XcalarApisConstantsT.XcalarApiMaxFieldNameLen / 2);
        }
        return ret;
    }

    static replaceUDFName(name: string, udfs: string[]): string {
        let i = 0;
        const re = new RegExp(SQLPrefix.udfPrefix, "g");
        return name.toUpperCase().replace(re, function(match) {
            if (i === udfs.length) {
                // Should always match, otherwise throw an error
                SQLUtil.assert(false, SQLErrTStr.UDFColumnMismatch);
                return match;
            }
            return udfs[i++];
        });
    }

    static replaceParamName(name: string, params: string[]): string {
        let i = 0;
        const re = new RegExp(SQLPrefix.paramPrefix, "g");
        return name.toUpperCase().replace(re, function(match) {
            if (i === params.length) {
                // Should always match, otherwise throw an error
                SQLUtil.assert(false, SQLErrTStr.ParameterMismatch);
                return match;
            }
            return params[i++];
        });
    }

    // Not used currently
    // function isMathOperator(expression) {
    //     var mathOps = {
    //         // arithmetic.scala
    //         "expressions.UnaryMinus": null,
    //         "expressions.UnaryPositive": null,
    //         "expressions.Abs": "abs",
    //         "expressions.Add": "add",
    //         "expressions.Subtract": "sub",
    //         "expressions.Multiply": "mult",
    //         "expressions.Divide": "div",
    //         "expressions.Remainder": "mod",
    //         "expressions.Pmod": null,
    //         "expressions.Least": null,
    //         "expressions.Greatest": null,
    //         // mathExpressions.scala
    //         "expressions.EulerNumber": null,
    //         "expressions.Pi": "pi",
    //         "expressions.Acos": "acos",
    //         "expressions.Asin": "asin",
    //         "expressions.Atan": "atan",
    //         "expressions.Cbrt": null,
    //         "expressions.Ceil": "ceil",
    //         "expressions.Cos": "cos",
    //         "expressions.Cosh": "cosh",
    //         "expressions.Conv": null,
    //         "expressions.Exp": "exp",
    //         "expressions.Expm1": null,
    //         "expressions.Floor": "floor",
    //         "expressions.Factorial": null,
    //         "expressions.Log": "log",
    //         "expressions.Log2": "log2",
    //         "expressions.Log10": "log10",
    //         "expressions.Log1p": null,
    //         "expressions:Rint": null,
    //         "expressions.Signum": null,
    //         "expressions.Sin": "sin",
    //         "expressions.Sinh": "sinh",
    //         "expressions.Sqrt": "sqrt",
    //         "expressions.Tan": "tan",
    //         "expressions.Cot": null,
    //         "expressions.Tanh": "tanh",
    //         "expressions.ToDegrees": "degrees",
    //         "expressions.ToRadians": "radians",
    //         "expressions.Bin": null,
    //         "expressions.Hex": null,
    //         "expressions.Unhex": null,
    //         "expressions.Atan2": "atan2",
    //         "expressions.Pow": "pow",
    //         "expressions.ShiftLeft": "bitlshift",
    //         "expressions.ShiftRight": "bitrshift",
    //         "expressions.ShiftRightUnsigned": null,
    //         "expressions.Hypot": null,
    //         "expressions.Logarithm": null,
    //         "expressions.Round": "round",
    //         "expressions.BRound": null,
    //     };
    //     if (expression.substring("org.apache.spark.sql.catalyst.".length) in
    //         mathOps) {
    //         return true;
    //     } else {
    //         return false;
    //     }
    // }
    static parseError(err): string {
        if (typeof err === "object") {
            if (err instanceof Error) {
                err = err.stack;
            } else {
                err = JSON.stringify(err);
            }
        }
        return err;
    }
}

if (typeof exports !== "undefined") {
    exports.SQLCompiler = SQLCompiler;
}