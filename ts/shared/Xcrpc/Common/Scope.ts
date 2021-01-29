import ProtoTypes = proto.xcalar.compute.localtypes;

type ScopeInfo = {
    userName: string,
    workbookName: string
};

enum SCOPE {
    GLOBAL = ProtoTypes.Workbook.ScopeType.GLOBALSCOPETYPE,
    WORKBOOK = ProtoTypes.Workbook.ScopeType.WORKBOOKSCOPETYPE
};

/**
 * Create xcrpc WorkbookScope message
 * @param param
 */
function createScopeMessage(param: {
    scope: SCOPE, scopeInfo: ScopeInfo
}): ProtoTypes.Workbook.WorkbookScope {

    const { scope, scopeInfo } = param;
    const { userName = null, workbookName = null } = scopeInfo || {};

    const scopeObj = new ProtoTypes.Workbook.WorkbookScope();
    if (scope === SCOPE.GLOBAL) {
        scopeObj.setGlobl(new ProtoTypes.Workbook.GlobalSpecifier());
    } else if (scope === SCOPE.WORKBOOK) {
        const nameInfo = new ProtoTypes.Workbook.WorkbookSpecifier.NameSpecifier();
        nameInfo.setUsername(userName);
        nameInfo.setWorkbookname(workbookName);
        const workbookInfo = new ProtoTypes.Workbook.WorkbookSpecifier();
        workbookInfo.setName(nameInfo);
        scopeObj.setWorkbook(workbookInfo);
    } else {
        throw new Error(`Invalid Scope: ${scope}`);
    }

    return scopeObj;
}

export { ScopeInfo, SCOPE, createScopeMessage };