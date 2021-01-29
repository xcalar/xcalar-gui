describe("DagNodeFactory Test", () => {
    it("should re-create a node correctly", () => {
        const node = new DagNode();
        const secondParentNode = new DagNode();
        const childNode = new DagNodeJoin();
        childNode.connectToParent(node);
        childNode.connectToParent(secondParentNode, 1);
        const serializableNode = childNode.getSerializableObj();
        const desNode = DagNodeFactory.create(serializableNode);
        expect(desNode.getId()).to.equal(childNode.getId())
        expect(desNode.getType()).to.equal(childNode.getType());
        expect(desNode.getMaxParents()).to.equal(childNode.getMaxParents());
    });

    it("factory create should handle error case", function() {
        try {
            DagNodeFactory.create(null);
        } catch (e) {
            expect(e).to.be.an("Error");
        }
    });

    it("getNodeClass should work", function() {
        let tests = [{
            "type": DagNodeType.Aggregate,
            "expect": DagNodeAggregate
        }, {
            "type": DagNodeType.Dataset,
            "expect": DagNodeDataset
        }, {
            "type": DagNodeType.Export,
            "expect": DagNodeExport
        }, {
            "type": DagNodeType.Filter,
            "expect": DagNodeFilter
        }, {
            "type": DagNodeType.GroupBy,
            "expect": DagNodeGroupBy
        }, {
            "type": DagNodeType.Join,
            "expect": DagNodeJoin
        }, {
            "type": DagNodeType.Map,
            "expect": DagNodeMap
        }, {
            "type": DagNodeType.Project,
            "expect": DagNodeProject
        }, {
            "type": DagNodeType.Explode,
            "expect": DagNodeExplode
        }, {
            "type": DagNodeType.Set,
            "expect": DagNodeSet
        }, {
            "type": DagNodeType.SQL,
            "expect": DagNodeSQL
        }, {
            "type": DagNodeType.SQLSubInput,
            "expect": DagNodeSQLSubInput
        }, {
            "type": DagNodeType.SQLSubOutput,
            "expect": DagNodeSQLSubOutput
        }, {
            "type": DagNodeType.RowNum,
            "expect": DagNodeRowNum
        }, {
            "type": DagNodeType.Custom,
            "expect": DagNodeCustom
        }, {
            "type": DagNodeType.CustomInput,
            "expect": DagNodeCustomInput
        }, {
            "type": DagNodeType.CustomOutput,
            "expect": DagNodeCustomOutput
        }, {
            "type": DagNodeType.IMDTable,
            "expect": DagNodeIMDTable
        }, {
            "type": DagNodeType.PublishIMD,
            "expect": DagNodePublishIMD
        }, {
            "type": DagNodeType.DFIn,
            "expect": DagNodeDFIn
        }, {
            "type": DagNodeType.DFOut,
            "expect": DagNodeDFOut
        }, {
            "type": DagNodeType.Split,
            "expect": DagNodeSplit
        }, {
            "type": DagNodeType.Round,
            "expect": DagNodeRound
        }, {
            "type": DagNodeType.Index,
            "expect": DagNodeIndex
        }, {
            "type": DagNodeType.Sort,
            "expect": DagNodeSort
        }, {
            "type": DagNodeType.Placeholder,
            "expect": DagNodePlaceholder
        }, {
            "type": DagNodeType.Synthesize,
            "expect": DagNodeSynthesize
        }, {
            "type": DagNodeType.SQLFuncIn,
            "expect": DagNodeSQLFuncIn
        }, {
            "type": DagNodeType.SQLFuncOut,
            "expect": DagNodeSQLFuncOut
        }, {
            "type": DagNodeType.Deskew,
            "expect": DagNodeDeskew
        }];

        tests.forEach((test) => {
            let res = DagNodeFactory.getNodeClass({type: test.type})
            expect(res).to.equal(test.expect);
        });
    });

    it("getNodeClass should handle error case", function() {
        try {
            DagNodeFactory.getNodeClass(null);
        } catch (e) {
            expect(e).to.be.an("Error");
        }
    });
});