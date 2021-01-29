class DagNodeFactory {
    public static create(
        options: DagNodeInfo = <DagNodeInfo>{}, runtime?: DagRuntime
    ): DagNode {
        let node;
        switch (options.type) {
            case DagNodeType.Aggregate:
                node = new DagNodeAggregate(<DagNodeAggregateInfo>options, runtime);
                break;
            case DagNodeType.Dataset:
                node = new DagNodeDataset(<DagNodeInInfo>options, runtime);
                break;
            case DagNodeType.Export:
                node = new DagNodeExport(options, runtime);
                break;
            case DagNodeType.Filter:
                node = new DagNodeFilter(options, runtime);
                break;
            case DagNodeType.GroupBy:
                node = new DagNodeGroupBy(options, runtime);
                break;
            case DagNodeType.Join:
                node = new DagNodeJoin(options, runtime);
                break;
            case DagNodeType.Map:
                node = new DagNodeMap(<DagNodeMapInfo>options, runtime);
                break;
            case DagNodeType.Project:
                node = new DagNodeProject(options, runtime);
                break;
            case DagNodeType.Explode:
                node = new DagNodeExplode(<DagNodeMapInfo>options, runtime);
                break;
            case DagNodeType.Set:
                node = new DagNodeSet(options, runtime);
                break;
            case DagNodeType.SQL:
                node = new DagNodeSQL(<DagNodeSQLInfo>options, runtime);
                break;
            case DagNodeType.SQLSubInput:
                node = new DagNodeSQLSubInput(options, runtime);
                break;
            case DagNodeType.SQLSubOutput:
                node = new DagNodeSQLSubOutput(options, runtime);
                break;
            case DagNodeType.RowNum:
                node = new DagNodeRowNum(options, runtime);
                break;
            case DagNodeType.Custom:
                node = new DagNodeCustom(<DagNodeCustomInfo>options, runtime);
                break;
            case DagNodeType.CustomInput:
                node = new DagNodeCustomInput(options, runtime);
                break;
            case DagNodeType.CustomOutput:
                node = new DagNodeCustomOutput(options, runtime);
                break;
            case DagNodeType.IMDTable:
                node = new DagNodeIMDTable(<DagNodeIMDTableInfo>options, runtime);
                break;
            case DagNodeType.PublishIMD:
                node = new DagNodePublishIMD(options, runtime);
                break;
            case DagNodeType.DFIn:
                node = new DagNodeDFIn(<DagNodeInInfo>options, runtime);
                break;
            case DagNodeType.DFOut:
                node = new DagNodeDFOut(options, runtime);
                break;
            case DagNodeType.Split:
                node = new DagNodeSplit(<DagNodeMapInfo>options, runtime);
                break;
            case DagNodeType.Round:
                node = new DagNodeRound(<DagNodeMapInfo>options, runtime);
                break;
            case DagNodeType.Index:
                node = new DagNodeIndex(options, runtime);
                break;
            case DagNodeType.Sort:
                node = new DagNodeSort(options, runtime);
                break;
            case DagNodeType.Placeholder:
                node = new DagNodePlaceholder(<DagNodePlaceholderInfo>options, runtime);
                break;
            case DagNodeType.Instruction:
                node = new DagNodeInstruction(<DagNodePlaceholderInfo>options, runtime);
                break;
            case DagNodeType.Synthesize:
                node = new DagNodeSynthesize(options, runtime);
                break;
            case DagNodeType.SQLFuncIn:
                node = new DagNodeSQLFuncIn(<DagNodeSQLFuncInInfo>options, runtime);
                break;
            case DagNodeType.SQLFuncOut:
                node = new DagNodeSQLFuncOut(options, runtime);
                break;
            case DagNodeType.Deskew:
                node = new DagNodeDeskew(options, runtime);
                break;
            case DagNodeType.Module:
                node = new DagNodeModule(<DagNodeModuleOptions>options, runtime);
                break;
            default:
                throw new Error("node type " + options.type + " not supported");
        }
        return node;
    }

    public static getNodeClass(
        options: DagNodeInfo = <DagNodeInfo>{}
    ): typeof DagNode {
        switch (options.type) {
            case DagNodeType.Aggregate:
                return DagNodeAggregate;
            case DagNodeType.Dataset:
                return DagNodeDataset;
            case DagNodeType.Export:
                return DagNodeExport;
            case DagNodeType.Filter:
                return DagNodeFilter;
            case DagNodeType.GroupBy:
                return DagNodeGroupBy;
            case DagNodeType.Join:
                return DagNodeJoin;
            case DagNodeType.Map:
                return DagNodeMap;
            case DagNodeType.Project:
                return DagNodeProject;
            case DagNodeType.Explode:
                return DagNodeExplode;
            case DagNodeType.Set:
                return DagNodeSet;
            case DagNodeType.SQL:
                return DagNodeSQL;
            case DagNodeType.SQLSubInput:
                return DagNodeSQLSubInput;
            case DagNodeType.SQLSubOutput:
                return DagNodeSQLSubOutput;
            case DagNodeType.RowNum:
                return DagNodeRowNum;
            case DagNodeType.Custom:
                return DagNodeCustom;
            case DagNodeType.CustomInput:
                return DagNodeCustomInput;
            case DagNodeType.CustomOutput:
                return DagNodeCustomOutput;
            case DagNodeType.IMDTable:
                return DagNodeIMDTable;
            case DagNodeType.PublishIMD:
                return DagNodePublishIMD;
            case DagNodeType.DFIn:
                return DagNodeDFIn;
            case DagNodeType.DFOut:
                return DagNodeDFOut;
            case DagNodeType.Split:
                return DagNodeSplit;
            case DagNodeType.Round:
                return DagNodeRound;
            case DagNodeType.Index:
                return DagNodeIndex;
            case DagNodeType.Sort:
                return DagNodeSort;
            case DagNodeType.Placeholder:
                return DagNodePlaceholder;
            case DagNodeType.Instruction:
                return DagNodeInstruction;
            case DagNodeType.Synthesize:
                return DagNodeSynthesize;
            case DagNodeType.SQLFuncIn:
                return DagNodeSQLFuncIn;
            case DagNodeType.SQLFuncOut:
                return DagNodeSQLFuncOut;
            case DagNodeType.Deskew:
                return DagNodeDeskew;
            case DagNodeType.Module:
                return DagNodeModule;
            default:
                throw new Error("node type " + options.type + " not supported");
        }
    }

    // Define this so you can't do new DagNodeFactory
    private constructor() {

    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeFactory = DagNodeFactory;
}
