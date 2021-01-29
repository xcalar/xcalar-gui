class TreeNodeFactory {
    static getGeneralNode(plan, prefix?): TreeNode {
        return new TreeNode(plan, prefix);
    }

    static getLiteralNullNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Literal",
            "num-children": 0,
            "value": null,
            "dataType": "null"
        })
    }
    static getLiteralNumberNode(num: number): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Literal",
            "num-children": 0,
            "value": "" + num,
            "dataType": "integer"
        });
    }
    static getLiteralStringNode(str: string): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Literal",
            "num-children": 0,
            "value": str,
            "dataType": "string"
        });
    }
    static getLiteralBooleanNode(value: boolean): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Literal",
            "num-children": 0,
            "value": value,
            "dataType": "boolean"
        });
    }
    static getSubtractNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Subtract",
            "num-children": 2,
            "left": 0,
            "right": 1
        });
    }
    static getAddNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Add",
            "num-children": 2,
            "left": 0,
            "right": 1
        });
    }
    static getMultiplyNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Multiply",
            "num-children": 2,
            "left": 0,
            "right": 1
        });
    }
    static getDivideNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Divide",
            "num-children": 2,
            "left": 0,
            "right": 1
        });
    }
    static getStringReplaceNode() {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.StringReplace",
            "num-children": 3,
            "left": 0,
            "right": 1
        });
    }
    static getIfNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.If",
            "num-children": 4,
            "branches": null,
        });
    }
    static getOrNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Or",
            "num-children": 2,
            "left": 0,
            "right": 1
        });
    }
    static getNotNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Not",
            "num-children": 1,
        });
    }
    static getCastNode(xcType: string): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.XcType."
                        + xcType,
            "num-children": 1,
            "colType": xcType
        });
    }
    static getExistNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.IsNotNull",
            "num-children": 1
        });
    }
    static getXcAggregateNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.plans.logical.XcAggregate",
            "num-children": 1
        });
    }
    static getFindNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.Find",
            "num-children": 4
        });
    }
    static getGreaterThanNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.GreaterThan",
            "num-children": 2
        });
    }
    static getGreaterThanEqualNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.GreaterThanOrEqual",
            "num-children": 2
        });
    }
    static getAndNode(): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.And",
            "num-children": 2
        });
    }
    static getInNode(numChildren: number): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.expressions.In",
            "num-children": numChildren
        });
    }
    static getDupNodeWithNewName(node: TreeNode, str: string): TreeNode {
        const dupNode = jQuery.extend(true, {}, node);
        dupNode.value.class = str;
        return dupNode;
    }

    // Logical Operators
    static getProjectNode(columns: any, tablePrefix?: string): TreeNode {
        return new TreeNode({
            "class": "org.apache.spark.sql.catalyst.plans.logical.Project",
            "num-children": 1,
            "projectList": jQuery.extend(true, [], columns)
        }, tablePrefix);
    }
}
if (typeof exports !== "undefined") {
    exports.TreeNodeFactory = TreeNodeFactory;
}