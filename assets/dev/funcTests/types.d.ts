/// <reference path="../../../ts/components/workbook/workbookManager.ts" />
/// <reference path="../../../ts/components/sql/workspace/SqlEditorSpace.ts" />
/// <reference path="../../../ts/components/sql/SQLSnippet.ts" />
/// <reference path="../../../ts/components/sql/SqlQueryHistory.ts" />
/// <reference path="../../../ts/components/publishedTable/PTblManager.ts" />
/// <reference path="../../../ts/components/publishedTable/PbTblInfo.ts" />
/// <reference path="../../../ts/components/system/UserSettings.ts" />
/// <reference path="../../../ts/components/dag/DagList.ts" />
/// <reference path="../../../ts/components/worksheet/ColManager.ts" />
/// <reference path="../../../ts/components/worksheet/xdfManager.ts" />
/// <reference path="../../../ts/components/tab/DagTabManager.ts" />
/// <reference path="../../../ts/components/tab/SQLTabManager.ts" />
/// <reference path="../../../ts/components/dag/DagViewManager.ts" />
/// <reference path="../../../ts/components/dag/dagTab/DagTab.ts" />
/// <reference path="../../../ts/components/dag/DagGraph.ts" />
/// <reference path="../../../ts/components/dag/DagEnums.ts" />
/// <reference path="../../../ts/components/dag/node/DagNode.ts" />
/// <reference path="../../../ts/components/dag/node/DagNodeIn.ts" />
/// <reference path="../../../ts/components/dag/node/DagNodeIMDTable.ts" />
/// <reference path="../../../ts/components/dag/Dag.d.ts" />
/// <reference path="../../../ts/components/datastore/DS.ts" />
/// <reference path="../../../ts/thrift/XcalarApi.js" />
/// <reference path="../../../ts/shared/helperClasses/kvstore.ts" />
/// <reference path="../../../ts/shared/helperClasses/durable/table/ProgCol.ts" />
/// <reference path="../../../ts/shared/util/xcHelper.ts" />
/// <reference path="../../../ts/shared/util/xcAssert.ts" />
/// <reference path="../../../ts/shared/setup/enums.ts" />
/// <reference path="../../../ts/xd_idl/declaration/dag.d.ts" />
/// <reference path="../../../ts/shared/setup/xvm.ts" />
/// <reference path="../../../ts/temp.d.ts" />
/// <reference path="../../../ts/jsTStr.d.ts" />
/// <reference path="../../../ts/xd_idl/declaration/durable.d.ts" />
interface Math {
    seedrandom(seed?: string);
}