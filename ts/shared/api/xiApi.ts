namespace XIApi {
    let aggOps: Set<string>;
    let indexTableCache: {} = {};
    let reverseIndexMap: {} = {};

    interface DSArgs {
        url: string;
        isRecur: boolean;
        format: string;
        maxSampleSize: number;
        skipRows: number;
        pattern: string;
        targetName: string;
    }

    interface FormatArgs {
        format: string;
        fieldDelim: string;
        recordDelim: string;
        schemaMode: number;
        quoteChar: string;
        typedColumns: object[];
        moduleName: string;
        funcName: string;
        udfQuery: string;
    }

    interface JoinCastInfo {
        tableName: string,
        columns: string[],
        casts: ColumnType[]
    }

    interface JoinIndexInfo {
        lTableName: string,
        lColNames: string[]
        rTableName: string,
        rColNames: string[],
        tempTables: string[]
    }

    interface JoinIndexResult {
        tableName: string;
        oldKeys: string[];
        newKeys: string[];
    }

    interface CastInfoOptions {
        overWrite: boolean; // overWrite old column name or not
        handleNull: boolean; // handle null case or not
        castPrefix: boolean; // cast prefix field or not
    }

    interface CastResult {
        tableName: string;
        colNames: string[];
        types: ColumnType[];
        newTable?: boolean;
    }

    interface UnionRenameInfo {
        tableName: string;
        renames: ColRenameInfo[]
    }

    function getKeySet<T>(keys: T[]): Set<T> {
        const set: Set<T> = new Set();
        keys.forEach((key) => {
            set.add(key);
        });
        return set;
    }

    function isCorrectTableNameFormat(tableName: string): boolean {
        if (tableName == null || tableName === '') {
            return false;
        }
        const regexp: RegExp = new RegExp('^.*#[a-zA-Z0-9_]+$');
        return regexp.test(tableName);
    }

    export function isValidTableName(tableName: string, allowDollarSign?: boolean): boolean {
        let isValid: boolean = isCorrectTableNameFormat(tableName);
        if (!isValid) {
            if (tableName != null) {
                console.error("incorrect table name format", tableName);
            }
            return false;
        }

        let namePart: string = xcHelper.getTableName(tableName);
        // allow table name to start with dot
        isValid = xcHelper.isValidTableName(namePart, allowDollarSign);
        if (!isValid) {
            // we allow name that has dot internally
            namePart = namePart.replace(/\./g, "");
            isValid = xcHelper.isValidTableName(namePart, allowDollarSign);
        }
        if (!isValid) {
            if (tableName != null) {
                console.error("incorrect table name format", tableName);
            }
        }
        return isValid;
    }

    function isValidAggName(aggName: string, looseNameCheck?: boolean): boolean {
        let allowDollarSign = false;
        if (looseNameCheck) {
            allowDollarSign = true;
        }
        if (isCorrectTableNameFormat(aggName)) {
            // allow aggName to have the table name format
            return isValidTableName(aggName, allowDollarSign);
        } else {
            // no blanks, must start with alpha, cannot have any special chars
            // other than _ and - and #
            return xcHelper.isValidTableName(aggName, allowDollarSign);
        }
    }

    function isValidPrefix(prefix: string): boolean {
        if (!prefix || prefix === "") {
            console.error("invalid prefix");
            return false;
        }
        return <boolean>xcHelper.checkNamePattern(PatternCategory.Prefix,
                                                  PatternAction.Check, prefix);
    }

    export function getNewTableName(
        tableName: string,
        affix?: string,
        rand: boolean = false
    ): string {
        let nameRoot: string = xcHelper.getTableName(tableName);
        if (!xcHelper.isValidTableName(nameRoot)) {
            nameRoot = nameRoot.replace(/[^a-zA-Z\d\_\-]/g, "_").replace(/^_+/, "");
        }

        if (affix != null) {
            nameRoot += affix;
        }

        if (rand) {
            nameRoot = xcHelper.randName(nameRoot);
        }

        return (nameRoot + Authentication.getHashId());
    }

    function getNewJoinTableName(
        lTableName: string,
        rTableName: string,
        newTableName: string
    ): string {
        let res: string = newTableName;
        if (!isValidTableName(newTableName)) {
            const lPart: string = lTableName.split("#")[0];
            const rPart: string = rTableName.split("#")[0];
            res = getNewTableName(lPart.substring(0, 5) + "-" + rPart.substring(0, 5));
        }
        return res;
    }

    function convertOp(op: string): string {
        if (op && op.length) {
            op = op.slice(0, 1).toLowerCase() + op.slice(1);
        }
        return op;
    }

    function getLocalAggOps(): Set<string> {
        const set: Set<string> = new Set<string>();
        for (let key in AggrOp) {
            const op: string = convertOp(AggrOp[key]);
            set.add(op);
        }
        return set;
    }

    function parseAggOps(aggXdfs: any): Set<string> {
        try {
            const set: Set<string> = new Set<string>();
            aggXdfs.fnDescs.forEach((func) => { set.add(func.fnName); });
            return set;
        } catch (e) {
            console.error("get category error", e);
            return getLocalAggOps();
        }
    }

    function getAggOps(): XDPromise<Set<string>> {
        if (aggOps != null) {
            return PromiseHelper.resolve(aggOps);
        }

        const deferred: XDDeferred<Set<string>> = PromiseHelper.deferred();
        const index: number = FunctionCategoryT.FunctionCategoryAggregate;
        const category: string = FunctionCategoryTStr[index];
        XcalarListXdfs("*", category)
        .then((res) => {
            aggOps = parseAggOps(res);
            deferred.resolve(aggOps);
        })
        .fail((error) => {
            console.error("get category error", error);
            aggOps = getLocalAggOps();
            deferred.resolve(aggOps); // still resolve
        });

        return deferred.promise();
    }

    export async function getAggValue(txId: number, aggName: string): Promise<any> {
        if (txId != null && Transaction.isSimulate(txId)) {
            return null;
        }

        try {
            let data = await XIApi.fetchData(aggName, 1, 1);
            try {
                const constant: string | number = JSON.parse(data[0]).constant;
                return constant;
            } catch (e) {
                console.error(e);
                return {error: e};
            }
        } catch (e) {
            return {error: "Invalid aggregate"};
        }
    }

    /* =========== Index Helper ================ */
    function indexHelper(
        txId: number,
        keyInfos: {
            name: string,
            ordering: XcalarOrderingT,
            type?: ColumnType,
            keyFieldName?: string,
        }[],
        tableName: string,
        newTableName: string,
        dhtName: string
    ): XDPromise<{newTableName: string, newKeys: string[]}> {
        const deferred: XDDeferred<{newTableName: string, newKeys: string[]}> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        let newKeys: string[];
        XcalarIndexFromTable(tableName, keyInfos, newTableName, dhtName, simuldateTxId)
        .then((res) => {
            newKeys = res.newKeys;
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve({newTableName, newKeys});
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    function isSameKey(key1: string[], key2: string[]): boolean {
        if (key1.length !== key2.length) {
            return false;
        }

        for (let i = 0, len = key1.length; i < len; i++) {
            if (key1[i] !== key2[i]) {
                return false;
            }
        }

        return true;
    }
    /* ========== End of Index Helper =========== */

    /* ========== Cast Helper =================== */
    function getCastInfo(
        colNames: string[],
        casts: ColumnType[],
        options: CastInfoOptions = <CastInfoOptions>{}
    ): {
        mapStrs: string[],
        newFields: string[],
        newColNames: string[],
        newTypes: ColumnType[]
    } {
        const overWrite: boolean = options.overWrite || false;
        const handleNull: boolean = options.handleNull || false;
        const castPrefix: boolean = options.castPrefix || false;

        const mapStrs: string[] = [];
        const newTypes: ColumnType[] = [];
        const newFields: string[] = []; // this is for map
        const newColNames: string[] = []; // this is for index

        casts.forEach((typeToCast, index) => {
            const colName: string = colNames[index];
            const parsedCol: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            const name: string = xcHelper.stripColName(parsedCol.name, false);
            let newType: ColumnType = null;
            let newField: string = null;

            if (typeToCast == null && castPrefix && parsedCol.prefix) {
                throw new Error("prefix field must have a cast type");
            } else if (typeToCast != null) {
                newType = typeToCast;
                newField = name;
            }

            if (newType != null) {
                newField = overWrite ? newField : xcHelper.randName(newField + "_");
                mapStrs.push(xcHelper.castStrHelper(colName, newType, handleNull));
                newFields.push(newField);
            }
            const newColName = newField || colName;
            newColNames.push(newColName);
            newTypes.push(newType);
        });

        return {
            mapStrs: mapStrs,
            newFields: newFields,
            newColNames: newColNames,
            newTypes: newTypes
        };
    }

    // currently only used for join
    function castColumns(
        txId: number,
        tableName: string,
        colNames: string[],
        casts: ColumnType[],
        options: CastInfoOptions = <CastInfoOptions>{}
    ): XDPromise<CastResult> {
        const castInfo = getCastInfo(colNames, casts, options);
        if (castInfo.mapStrs.length === 0) {
            return PromiseHelper.resolve({
                tableName: tableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: false
            });
        }

        let deferred: XDDeferred<CastResult> = PromiseHelper.deferred();
        const newTableName: string = getNewTableName(tableName);
        XIApi.map(txId, castInfo.mapStrs, tableName, castInfo.newFields, newTableName)
        .then(() => {
            deferred.resolve({
                tableName: newTableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: true
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // currently only used by unionCast
    function synthesizeColumns(
        txId: number,
        tableName: string,
        colNames: string[],
        casts: ColumnType[]
    ): XDPromise<CastResult> {
        const options: CastInfoOptions = {
            castPrefix: true,
            handleNull: true,
            overWrite: false
        };
        const castInfo = getCastInfo(colNames, casts, options);
        if (castInfo.mapStrs.length === 0) {
            return PromiseHelper.resolve({
                tableName: tableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: false
            });
        }

        const colInfos: ColRenameInfo[] = colNames.map((colName, i) => {
            const newName: string = castInfo.newColNames[i];
            const type: ColumnType = castInfo.newTypes[i];
            const fieldType: DfFieldTypeT = xcHelper.convertColTypeToFieldType(type);
            return xcHelper.getJoinRenameMap(colName, newName, fieldType);
        });

        const newTableName: string = getNewTableName(tableName);
        const deferred: XDDeferred<CastResult> = PromiseHelper.deferred();

        XIApi.synthesize(txId, colInfos, tableName, newTableName)
        .then((newTableName) => {
            deferred.resolve({
                tableName: newTableName,
                colNames: castInfo.newColNames,
                types: castInfo.newTypes,
                newTable: true
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
    /* ============= End of Cast Helper ============== */

    /* ============= Join Helper ===================== */
    function joinHelper(
        txId: number,
        lIndexedTable: string,
        rIndexedTable: string,
        newTableName: string,
        joinType: number,
        lRename: ColRenameInfo[],
        rRename: ColRenameInfo[],
        options: {evalString: string, keepAllColumns: boolean, nullSafe: boolean, key: string[][]}
                 = {evalString: "", keepAllColumns: true, nullSafe: false, key: undefined}
    ): XDPromise<string[]> {
        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarJoin(lIndexedTable, rIndexedTable, newTableName,
            <number>joinType, lRename, rRename, options, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            // the temp cols for normal join is empty
            deferred.resolve([]);
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    function joinCast(
        txId: number,
        lInfo: JoinCastInfo,
        rInfo: JoinCastInfo
    ): XDPromise<JoinIndexInfo> {
        const lColNames: string[] = lInfo.columns;
        const lTableName: string = lInfo.tableName;

        const rColNames: string[] = rInfo.columns;
        const rTableName: string = rInfo.tableName;

        let def1: XDPromise<CastResult>;
        let def2: XDPromise<CastResult>;
        if (lColNames.length === 0 && rColNames.length === 0) {
            // cross join, no need to cast
            def1 = PromiseHelper.resolve({
                tableName: lTableName,
                colNames: lColNames
            });

            def2 = PromiseHelper.resolve({
                tableName: rTableName,
                colNames: rColNames
            });
        } else {
            def1 = castColumns(txId, lTableName, lColNames, lInfo.casts);
            def2 = castColumns(txId, rTableName, rColNames, rInfo.casts);
        }

        const deferred: XDDeferred<JoinIndexInfo> = PromiseHelper.deferred();
        PromiseHelper.when(def1, def2)
        .then((res) => {
            const lRes: CastResult = res[0];
            const rRes: CastResult = res[1];
            const tempTables: string[] = [];
            if (lRes.newTable) {
                tempTables.push(lRes.tableName);
            }

            if (rRes.newTable) {
                tempTables.push(rRes.tableName);
            }

            deferred.resolve({
                "lTableName": lRes.tableName,
                "lColNames": lRes.colNames,
                "rTableName": rRes.tableName,
                "rColNames": rRes.colNames,
                "tempTables": tempTables
            });
        })
        .fail((error) => {
            deferred.reject(xcHelper.getPromiseWhenError(<any>error));
        });

        return deferred.promise();
    }

    function selfJoinIndex(
        txId: number,
        colNames: string[],
        tableName: string
    ): XDPromise<{newTableName: string, isCache: boolean, newKeys: string[], tempCols: string[]}> {
        return  XIApi.index(txId, colNames, tableName);
    }

    /**
     *
     * @param txId
     * @param joinInfo
     * @param removeNulls
     * @returns Promise<lInfo, rInfo, tempTables>
     */
    function joinIndex(
        txId: number,
        joinInfo: JoinIndexInfo,
        removeNulls: boolean,
        noCache: boolean
    ): XDPromise<{
        lRes: JoinIndexResult,
        rRes: JoinIndexResult,
        tempTablesInIndex: string[],
        tempCols: string[]
    }> {
        const lColNames: string[] = joinInfo.lColNames;
        const rColNames: string[] = joinInfo.rColNames;
        const lTableName: string = joinInfo.lTableName;
        const rTableName: string = joinInfo.rTableName;

        if (lColNames.length !== rColNames.length) {
            return PromiseHelper.reject('invalid case');
        }

        // for cross joins where no col names should be provided
        if (lColNames.length === 0 ) {
            const lInfo: JoinIndexResult = {
                tableName: lTableName,
                oldKeys: [],
                newKeys: []
            };
            const rInfo: JoinIndexResult = {
                tableName: rTableName,
                oldKeys: [],
                newKeys: []
            };
            return PromiseHelper.resolve({lRes: lInfo, rRes: rInfo, tempTablesInIndex: [], tempCols: []});
        }

        let def1: XDPromise<{newTableName: string, isCache: boolean, newKeys: string[], tempCols: string[]}>;
        let def2: XDPromise<{newTableName: string, isCache: boolean, newKeys: string[], tempCols: string[]}>;
        if (lTableName === rTableName && isSameKey(lColNames, rColNames)) {
            // when it's self join
            def1 = selfJoinIndex(txId, lColNames, lTableName);
            def2 = def1;
        } else {
            def1 = XIApi.index(txId, lColNames, lTableName);
            def2 = XIApi.index(txId, rColNames, rTableName);
        }

        let lIndexedTable: string;
        let rIndexedTable: string;
        let lNewKeys: string[];
        let rNewKeys: string[];
        let tempCols: string[];

        let tempTables: string[] = [];
        const deferred: XDDeferred<{
            lRes: JoinIndexResult,
            rRes: JoinIndexResult,
            tempTablesInIndex: string[],
            tempCols: string[]
        }> = PromiseHelper.deferred();

        PromiseHelper.when(def1, def2)
        .then((res) => {
            const res1 = res[0];
            const res2 = res[1];
            lIndexedTable = res1.newTableName;
            rIndexedTable = res2.newTableName;
            lNewKeys = res1.newKeys;
            rNewKeys = res2.newKeys;

            let currentTempCols = res1.tempCols|| [];
            if (lTableName === rTableName && isSameKey(lColNames, rColNames)) {
                tempCols = currentTempCols;
            } else {
                tempCols = currentTempCols.concat(res2.tempCols || []);
            }

            if (noCache) {
                tempTables.push(lIndexedTable);
                if (lIndexedTable !== rIndexedTable) {
                    tempTables.push(rIndexedTable);
                }
            }

            if (removeNulls) {
                const newTableName: string = getNewTableName(lTableName, ".noNulls");
                const fltStr: string = "exists(" + lColNames[0] + ")";
                tempTables.push(newTableName);
                return XIApi.filter(txId, fltStr, lIndexedTable, newTableName);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(() => {
            const lInfo: JoinIndexResult = {
                tableName: lIndexedTable,
                oldKeys: lColNames,
                newKeys: lNewKeys
            };
            const rInfo: JoinIndexResult = {
                tableName: rIndexedTable,
                oldKeys: rColNames,
                newKeys: rNewKeys
            };

            deferred.resolve({
                lRes: lInfo,
                rRes: rInfo,
                tempTablesInIndex: tempTables,
                tempCols: tempCols
            });
        })
        .fail((error) => {
            deferred.reject(xcHelper.getPromiseWhenError(<any>error));
        });

        return deferred.promise();
    }

    function getUnusedImmNames(
        allImm: string[],
        newKeys: string[],
        renameInfos: ColRenameInfo[]
    ): string[] {
        if (!allImm || allImm.length === 0) {
            return [];
        }
        const immSet: Set<string> = getKeySet<string>(allImm);
        newKeys.forEach((name) => {
            immSet.delete(name);
        });

        renameInfos.forEach((renameInfo) => {
            immSet.delete(renameInfo.new);
        });

        const unusedImm: string[] = allImm.filter((imm) => immSet.has(imm));
        return unusedImm;
    }

    // currently only used by join
    function resolveDupName(
        renameInfos: ColRenameInfo[],
        indexRes: JoinIndexResult,
        otherKeys: string[],
        suffix: string
    ): void {
        const otherKeySet: Set<string> = getKeySet<string>(otherKeys);
        const newKeys: string[] = indexRes.newKeys;
        indexRes.oldKeys.forEach((oldKey, index) => {
            const newKey: string = newKeys[index];
            if (newKey !== oldKey && otherKeySet.has(newKey)) {
                // when it's fatptr convert to immediate
                const oldName: string = newKey;
                const newName: string = newKey + suffix;
                renameInfos.push(xcHelper.getJoinRenameMap(oldName, newName));
            }
        });
    }

    function resolveJoinColRename(
        lRename: ColRenameInfo[],
        rRename: ColRenameInfo[],
        lIndexRes: JoinIndexResult,
        rIndexRes: JoinIndexResult,
        lImm: string[],
        rImm: string[]
    ): void {
        const lOthers: string[] = getUnusedImmNames(lImm, lIndexRes.newKeys, lRename);
        const rOthers: string[] = getUnusedImmNames(rImm, rIndexRes.newKeys, rRename);
        const lAllKeys: string[] = xcHelper.arrayUnion(lIndexRes.newKeys, lOthers);
        const rAllKeys: string[] = xcHelper.arrayUnion(rIndexRes.newKeys, rOthers);
        const lSuffix: string = xcHelper.randName("_l_index");
        const rSuffix: string = xcHelper.randName("_r_index");

        resolveDupName(lRename, lIndexRes, rAllKeys, lSuffix);
        resolveDupName(rRename, rIndexRes, lAllKeys, rSuffix);
    }
    /* ============= End of Join Helper ================ */

    /* ============= GroupBy Helper ==================== */
    function groupByHelper(
        txId: number,
        newColNames: string[],
        evalStrs: string[],
        tableName: string,
        newTableName: string,
        incSample: boolean = false,
        icvMode: boolean = false,
        newKeyFieldName: string = "",
        groupAll: boolean = false
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarGroupByWithEvalStrings(newColNames, evalStrs, tableName,
        newTableName, incSample, icvMode, newKeyFieldName, groupAll, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    function getGroupByAggEvalStr(aggArg: AggColInfo): string {
        let evalStr = null;
        const op: string = convertOp(aggArg.operator);
        const colName = aggArg.aggColName;
        // XXX currently don't support Multi-operation in multi-evalgroupBy
        if (op === "stdevp") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName})))`;
        } else if (op === "stdev") {
            evalStr = `sqrt(div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1)))`;
        } else if (op === "varp") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), count(${colName}))`;
        } else if (op === "var") {
            evalStr = `div(sum(pow(sub(${colName}, avg(${colName})), 2)), sub(count(${colName}), 1))`;
        } else {
            let delim = "";
            if (aggArg.delim) {
                delim = `,"${aggArg.delim}"`;
            }
            evalStr = `${op}(${colName}${delim})`;
        }
        return evalStr;
    }

    function distinctGroupby(
        txId: number,
        tableName: string,
        groupOnCols: string[],
        aggCols: object,
        normalAggArgs: AggColInfo[],
        gbTableName: string,
        onlyDistinct: boolean,
        isIncSample: boolean,
        allCols?: {name: string, type: DfFieldTypeT}[]
    ): XDPromise<{resTable: string, resTempTables: string[], resTempCols: string[]}> {
        const promises: XDPromise<void>[] = [];
        const distinctGbTables: string[] = [];
        const tempTables: string[] = [];
        const tempCols: string[] = [];
        const origGroupOnCols: string[] = groupOnCols;
        const gbOutputCols: string[][] = [];
        // Create output column list for normal gbs
        gbOutputCols.push(normalAggArgs.map((args) => {return args.newColName}));

        // we're going to manipulate groupOnCols
        // and don't want to modify the original copy
        for (let distinctCol in aggCols) {
            groupOnCols = xcHelper.deepCopy(origGroupOnCols);
            gbOutputCols.push(aggCols[distinctCol].map((args) => {return args.newColName}));
            promises.push(computeDistinctGroupby(txId, tableName,
                            groupOnCols, distinctCol, aggCols[distinctCol],
                            distinctGbTables, tempTables, tempCols, isIncSample));
        }

        const deferred: XDDeferred<{resTable: string, resTempTables: string[], resTempCols: string[]}> = PromiseHelper.deferred();
        let whenPassed = false;
        PromiseHelper.when.apply(this, promises)
        .then(() => {
            whenPassed = true;
            // Now we want to do cascading joins on the newTableNames
            if (onlyDistinct) {
                gbTableName = distinctGbTables[0];
                distinctGbTables.splice(0, 1);
                gbOutputCols.splice(0, 1);
            }
            return cascadingJoins(txId, distinctGbTables, gbTableName, groupOnCols,
                                  tempTables, tempCols, gbOutputCols, allCols);
        })
        .then((finalJoinedTable) => {
            deferred.resolve({resTable: finalJoinedTable, resTempTables: tempTables, resTempCols: tempCols});
        })
        .fail((args) => {
            if (!whenPassed) {
                deferred.reject(xcHelper.getPromiseWhenError(args));
            } else {
                deferred.reject.apply(this, arguments);
            }
        });

        return deferred.promise();
    }

    // XXX FIXME: currently it can only triggered by sql which assumes all columns
    // are derived fields. When this assumption breaks, must hand the case when
    // newKeyFieldName in groupByHelper is a prefix
    function computeDistinctGroupby(
        txId: number,
        origTableName: string,
        groupOnCols: string[],
        distinctCol: string,
        aggArgs: AggColInfo[],
        distinctGbTables: string[],
        tempTables: string[],
        tempCols: string[],
        isIncSample: boolean
    ): XDPromise<void> {
        let reuseIndex: boolean = false;
        let newGroupOnCols: string[];
        let groupAll: boolean = groupOnCols.length === 0;
        if (groupOnCols.indexOf(distinctCol) === -1) {
            newGroupOnCols = groupOnCols.concat([distinctCol]);
        } else {
            reuseIndex = true;
            newGroupOnCols = groupOnCols;
        }
        const gbDistinctTableName: string = getNewTableName(origTableName, "gbDistinct");
        const gbTableName: string = getNewTableName(origTableName, "gb");
        let newIndexTable: string;

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        // XXX BUG: if eval string has a cast, we need to extract the column name
        // otherwise we're saying column name == "int(myCol)"
        XIApi.index(txId, newGroupOnCols, origTableName)
        .then((ret) => {
            const indexedTableName = ret.newTableName;
            for (let i: number = 0; i < newGroupOnCols.length; i++) {
                newGroupOnCols[i] = stripColName(newGroupOnCols[i]);
            }

            const newAggColName = "XC_COUNT_" + Authentication.getHashId().substring(3)
                                  + "_" + xcHelper.getTableId(gbTableName);
            tempCols.push(newAggColName);
            tempTables.push(gbDistinctTableName);
            // XXX [0] argument needs to be fixed once bohan's fix goes in
            return groupByHelper(txId, [newAggColName], ["count(1)"],
            indexedTableName, gbDistinctTableName, isIncSample, false,
            newGroupOnCols[0], false);
        })
        .then(() => {
            if (reuseIndex || groupAll) {
                newIndexTable = gbDistinctTableName;
                return PromiseHelper.resolve<{
                    newTableName: string;
                    isCache: boolean;
                    newKeys: string[];
                    tempCols: string[];
                }>({newTableName: newIndexTable});
            } else {
                newIndexTable = getNewTableName(origTableName, "index");
                tempTables.push(newIndexTable);
                for (let i: number = 0; i < groupOnCols.length; i++) {
                    groupOnCols[i] = stripColName(groupOnCols[i]);
                }
                return XIApi.index(txId, groupOnCols, gbDistinctTableName, newIndexTable);
            }
        })
        .then((ret) => {
            const evalStrs: string[] = [];
            const newColNames: string[] = [];
            aggArgs.forEach((aggArg) => {
                aggArg.aggColName = stripColName(aggArg.aggColName);
                evalStrs.push(getGroupByAggEvalStr(aggArg));
                newColNames.push(aggArg.newColName);
            });
            return groupByHelper(txId, newColNames, evalStrs, ret.newTableName,
            gbTableName, isIncSample, false, newGroupOnCols[0], groupAll);
        })
        .then(() => {
            tempTables.push(gbTableName);
            distinctGbTables.push(gbTableName);
            deferred.resolve();
        })
        .fail(deferred.reject);

        // convert a::b into b or int(a::b, 10) into int(b, 10)
        // XXX not handling nested eval functions
        function stripColName(colName: string): string {
            let prefix = "";
            // extract the name if wrapped in a cast
            if (colName.startsWith("int(") || colName.startsWith("string(") ||
                colName.startsWith("float(") || colName.startsWith("bool(")) {
                prefix = colName.slice(0, colName.indexOf("("));
                colName = colName.substring(colName.indexOf("(") + 1,
                                            colName.length - 1);
                if (colName.indexOf(",") > -1) {
                    colName = colName.substring(0, colName.indexOf(","));
                }
            }
            colName = colName.substr(colName.lastIndexOf(":") + 1);
            if (prefix) {
                colName = prefix + "(" + colName;
                if (prefix === "int") {
                    colName += ", 10";
                }
                colName += ")";
            }
            return colName;
        }

        return deferred.promise();
    }

    function cascadingJoins(
        txId: number,
        distinctGbTables: string[],
        origGbTable: string,
        joinCols: string[],
        tempTables: string[],
        tempCols: string[],
        gbOutputCols: string[][],
        allCols?: {name: string, type: DfFieldTypeT}[]
    ): XDPromise<string> {
        if (distinctGbTables.length === 0) {
            return PromiseHelper.resolve(origGbTable);
        }

        tempTables.push(origGbTable);

        let curTableName: string = origGbTable;
        let promises: XDPromise<void>[] = [];
        for (let i = 0; i < distinctGbTables.length; i++) {
            // The index cols will collide for sure. So we must rename these
            // The newly generated columns cannot collide because they will
            // be renamed earlier on XXX add asserts / fixme
            const rTableName: string = distinctGbTables[i];
            // Use keepAllColumns=false so need to specify columns to keep in lRename
            let lRename: ColRenameInfo[] = [];
            const leftColNamesSet: Set<string> = new Set(); // to prevent duplicates
            const rRename: ColRenameInfo[] = [];
            let rTableId: TableId = xcHelper.getTableId(rTableName);
            if (typeof rTableId === "string") {
                rTableId = rTableId.toUpperCase();
            }
            let joinType: JoinType = JoinOperatorT.InnerJoin;
            let evalString: string = "";
            let key: string[][] = [[],[]];
            if (joinCols.length === 0) {
                joinType = JoinOperatorT.CrossJoin;
            } else {
                joinCols.forEach((colName) => {
                    const newColName = colName + "_" + Authentication.getHashId()
                                       .substring(3) + "_" + rTableId;
                    lRename.push({
                        orig: colName,
                        new: colName,
                        type: DfFieldTypeT.DfUnknown
                    });
                    rRename.push({
                        orig: colName,
                        new: newColName,
                        type: DfFieldTypeT.DfUnknown
                    });
                    leftColNamesSet.add(colName);
                    // Now with keepAllColumns=false, all duplicate join columns
                    // in intermediate tables will get dropped. Only those from
                    // the last distinct gb table survive
                    if (i === distinctGbTables.length - 1) {
                        tempCols.push(newColName);
                    }
                });

                key = [joinCols, joinCols];
            }
            gbOutputCols[0].forEach((colName) => {
                lRename.push({
                    orig: colName,
                    new: colName,
                    type: DfFieldTypeT.DfUnknown
                });
                leftColNamesSet.add(colName);
            });

            if (allCols) {
                let sampleCols: ColRenameInfo[] = [];
                let prefixes: Set<string> = new Set();
                allCols.forEach((col) => {
                    if (leftColNamesSet.has(col.name)) {
                        return; // skip dupes
                    }
                    const prefix = xcHelper.parsePrefixColName(col.name).prefix;
                    if (prefix) {
                        prefixes.add(prefix);
                    } else {
                        sampleCols.push({
                            orig: col.name,
                            new: col.name,
                            type: col.type
                        });
                    }
                });
                prefixes.forEach((prefix) => {
                    sampleCols.push({
                        orig: prefix,
                        new: prefix,
                        type: DfFieldTypeT.DfFatptr
                    });
                });

                lRename = lRename.concat(sampleCols);
            }

            gbOutputCols[i + 1].forEach((colName) => {
                // After join, gb results of right table become columns need to keep in next loop
                // So update gbOutputCols[0], which indicates columns in left table
                gbOutputCols[0].push(colName);
                rRename.push({
                    orig: colName,
                    new: colName,
                    type: DfFieldTypeT.DfUnknown
                });
            });

            let newTableName: string;
            if (i === distinctGbTables.length - 1) {
                newTableName = getNewTableName(origGbTable);
            } else {
                newTableName = getNewTableName(origGbTable, "join");
            }
            if (i < distinctGbTables.length - 1) {
                // Don't push final table
                tempTables.push(newTableName);
            }

            let joinOptions = {
                evalString: evalString,
                keepAllColumns: false,
                nullSafe: true,
                key: key
            };

            promises.push(joinHelper.bind(this, txId, curTableName, rTableName,
                        newTableName, joinType, lRename, rRename, joinOptions));
            curTableName = newTableName;
        }

        const finalJoinedTable: string = curTableName;
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        PromiseHelper.chain(promises)
        .then(() => {
            deferred.resolve(finalJoinedTable);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* ============= End of GroupBy Helper ============= */

    /* ============= Union Helper ====================== */
    function unionHelper(
        txId: number,
        tableNames: string[],
        newTableName: string,
        colInfos: ColRenameInfo[][],
        dedup: boolean,
        unionType: UnionOperatorT,
        indexKeys: string[]
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarUnion(tableNames, newTableName, colInfos, dedup, unionType, indexKeys, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    function checkUnionTableInfos(tableInfos: UnionTableInfo[]): UnionTableInfo[] {
        if (tableInfos == null ||
            !(tableInfos instanceof Array) ||
            tableInfos.length < 1
        ) {
            return null;
        }

        const colLen: number = tableInfos[0].columns.length;
        for (let i = 0; i < colLen; i++) {
            for (let j = 0; j < tableInfos.length; j++) {
                if (tableInfos[j].columns[i].name == null) {
                    // this is for no match case
                    tableInfos[j].columns[i].name = xcHelper.randName("XCALAR_FNF");
                    tableInfos[j].columns[i].cast = true;
                }

                if (j > 0) {
                    // type and rename need to match
                    if (tableInfos[j].columns[i].rename == null ||
                        tableInfos[j].columns[i].rename !== tableInfos[0].columns[i].rename ||
                        tableInfos[j].columns[i].type == null ||
                        tableInfos[j].columns[i].type !== tableInfos[0].columns[i].type) {
                        return null;
                    }
                }
            }
        }
        return tableInfos;
    }

    function unionCast(
        txId: number,
        tableInfos: UnionTableInfo[]
    ): XDPromise<{unionRenameInfos: UnionRenameInfo[], resTempTables: string[]}> {
        const unionRenameInfos: UnionRenameInfo[] = [];
        const tempTables: string[] = [];
        const caseHelper = function(
            tableInfo: UnionTableInfo,
            index: number
        ): XDPromise<void> {
            const columns: UnionColInfo[] = tableInfo.columns;

            const colNames: string[] = [];
            const casts: ColumnType[] = [];
            columns.forEach((colInfo) => {
                colNames.push(colInfo.name);
                const parsedCol: PrefixColInfo = xcHelper.parsePrefixColName(colInfo.name);
                let cast = colInfo.cast ? colInfo.type : null;
                if (parsedCol.prefix) {
                    // prefix col must cast
                    cast = colInfo.type;
                }
                casts.push(cast);
            });

            const tableName: string = tableInfo.tableName;
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            synthesizeColumns(txId, tableName, colNames, casts)
            .then((res) => {
                if (res.newTable) {
                    tempTables.push(res.tableName);
                }

                const renames: ColRenameInfo[] = res.colNames.map((colName, i) => {
                    const newName: string = columns[i].rename;
                    const type: ColumnType = res.types[i] ? res.types[i] : columns[i].type;
                    const fieldType: DfFieldTypeT = xcHelper.convertColTypeToFieldType(type);
                    return xcHelper.getJoinRenameMap(colName, newName, fieldType);
                });

                unionRenameInfos[index] = {
                    tableName: res.tableName,
                    renames: renames
                };
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        };

        const promises: XDPromise<void>[] = tableInfos.map(caseHelper);
        const deferred: XDDeferred<{unionRenameInfos: UnionRenameInfo[], resTempTables: string[]}> = PromiseHelper.deferred();
        PromiseHelper.when.apply(this, promises)
        .then(() => {
            deferred.resolve({unionRenameInfos: unionRenameInfos, resTempTables: tempTables});
        })
        .fail((args) => {
            deferred.reject(xcHelper.getPromiseWhenError(args));
        });

        return deferred.promise();
    }

    function getUnionConcatMapStr(
        colNames: string[],
        colTypes: DfFieldTypeT[]
    ): string {
        let mapStr: string = "";
        const len: number = colNames.length;
        const vals = colNames.map((colName, index) => {
            if (colTypes[index] === DfFieldTypeT.DfString) {
                return `ifStr(exists(${colName}), ${colName}, "XC_FNF")`;
            } else {
                return `ifStr(exists(string(${colName})), string(${colName}), "XC_FNF")`;
            }
        });

        for (let i = 0; i < len - 1; i++) {
            mapStr += `concat(${vals[i]}, concat(".Xc.", `;
        }

        mapStr += vals[len - 1];
        mapStr += '))'.repeat(len - 1);
        return mapStr;
    }

    function unionAllIndexHelper(
        txId: number,
        unionRenameInfo: UnionRenameInfo,
        indexColName: string,
        tempTables: string[],
        index: number,
        indexKeys: string[][]
    ): XDPromise<void> {
        // step 1: concat all columns
        // step 2: index on the concat column
        const colNames: string[] = [];
        const colTypes: DfFieldTypeT[] = [];
        unionRenameInfo.renames.forEach((renameInfo) => {
            const colName: string = renameInfo.orig;
            colNames.push(colName);
            colTypes.push(renameInfo.type);
        });

        const mapStr: string = getUnionConcatMapStr(colNames, colTypes);
        const concatColName: string =  xcHelper.randName("XC_CONCAT");
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let curTableName: string = unionRenameInfo.tableName;
        indexKeys[index] = [concatColName];
        // step 1, concat all cols into one col
        XIApi.map(txId, [mapStr], curTableName, [concatColName])
        .then((tableAfterMap) => {
            curTableName = tableAfterMap;
            // step 2: index on the concat column
            return XIApi.index(txId, [concatColName], curTableName);
        })
        .then((ret) => {
            const finalTableName = ret.newTableName;
            tempTables.push(curTableName);
            unionRenameInfo.tableName = finalTableName;
            const type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(
                ColumnType.string);
            const rename: ColRenameInfo = xcHelper.getJoinRenameMap(
                concatColName, indexColName, type);
            unionRenameInfo.renames.push(rename);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function unionAllIndex(
        txId: number,
        unionRenameInfos: UnionRenameInfo[]
    ): XDPromise<{unionRenameInfos: UnionRenameInfo[], resTempTables: string[], indexKeys: string[][]}> {
        const tempTables: string[] = [];
        const indexKeys: string[][] = [];
        const indexColName: string = xcHelper.randName("XC_UNION_INDEX");
        const promises: XDPromise<void>[] = unionRenameInfos.map((renameInfo, i) => {
            return unionAllIndexHelper(txId, renameInfo, indexColName, tempTables, i, indexKeys);
        });

        const deferred: XDDeferred<{unionRenameInfos: UnionRenameInfo[], resTempTables: string[], indexKeys: string[][]}> = PromiseHelper.deferred();
        PromiseHelper.when.apply(this, promises)
        .then(() => {
            deferred.resolve({unionRenameInfos: unionRenameInfos, resTempTables: tempTables, indexKeys: indexKeys});
        })
        .fail((args) => {
            deferred.reject(xcHelper.getPromiseWhenError(args));
        });

        return deferred.promise();
    }
    /* ============= End of Union Helper ================ */
    /**
     * XIApi.filter
     * @param txId
     * @param fltStr
     * @param tableName
     * @param newTableName
     */
    export function filter(
        txId: number,
        fltStr: string,
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        if (txId == null || fltStr == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in filter");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const simuldateTxId: number = startSimulate();
        XcalarFilter(fltStr, tableName, newTableName, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * XIApi.genAggStr
     * @param fieldName
     * @param op
     */
    export function genAggStr(fieldName: string, op: string): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        op = convertOp(op);

        getAggOps()
        .then((aggs) => {
            if (!aggs.has(op)) {
                deferred.resolve('');
            } else {
                let evalStr = op + '(' + fieldName + ')';
                deferred.resolve(evalStr);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.aggregateWithEvalStr
     * @param txId
     * @param evalStr
     * @param tableName
     * @param dstAggName, dstAggName is optional and
     * can be left blank (will autogenerate) and new agg table will be deleted
     */
    export function aggregateWithEvalStr(
        txId: number,
        evalStr: string,
        tableName: string,
        dstAggName?: string
    ): XDPromise<{value: string | number, aggName: string, toDelete: boolean}> {
        if (evalStr == null || tableName == null || txId == null) {
            return PromiseHelper.reject("Invalid args in aggregate");
        }

        const deferred: XDDeferred<{value: string | number, aggName: string, toDelete: boolean}> = PromiseHelper.deferred();
        let toDelete = false;
        let err: string;

        if (!isValidAggName(dstAggName, true)) {
            if (dstAggName != null) {
                console.error("invalid agg name");
            }
            const nameRoot: string = xcHelper.getTableName(tableName);
            dstAggName = xcHelper.randName(nameRoot + "-agg");
            toDelete = true;
        }

        let aggVal: string | number;
        const simuldateTxId: number = startSimulate();
        XcalarAggregate(evalStr, dstAggName, tableName, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = getNewTableName(dstAggName);
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            return PromiseHelper.when(getAggValue(txId, dstAggName));
        })
        .then((res) => {
            const val = res[0];
            if (val != null && val.error) {
                err = val.error;
                aggVal = null;
            } else {
                aggVal = val;
            }
            if (toDelete) {
                return PromiseHelper.alwaysResolve(XIApi.deleteTable(txId, dstAggName));
            }
        })
        .then(() => {
            if (err != null) {
                deferred.reject({error: err});
            } else {
                deferred.resolve({value: aggVal, aggName: dstAggName, toDelete: toDelete});
            }
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * XIApi.aggregate
     * @param txId
     * @param aggOp
     * @param colName
     * @param tableName
     * @param dstAggName optional, can be left blank (will autogenerate)
     * and new agg table will be deleted
     */
    export function aggregate(
        txId: number,
        aggOp: string,
        colName: string,
        tableName: string,
        dstAggName?: string
    ): XDPromise<{value: string | number, aggName: string, toDelete: boolean}> {
        if (colName == null ||
            tableName == null ||
            aggOp == null ||
            txId == null
        ) {
            return PromiseHelper.reject("Invalid args in aggregate");
        }

        const deferred: XDDeferred<{value: string | number, aggName: string, toDelete: boolean}> = PromiseHelper.deferred();
        XIApi.genAggStr(colName, aggOp)
        .then((evalStr) => {
            return XIApi.aggregateWithEvalStr(txId, evalStr,
                                             tableName, dstAggName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }
    /**
     * XIApi.checkOrder
     * @param tableName
     * @returns XDPromise<order, keys>
     */
    export function checkOrder(tableName: string): XDPromise<{tableOrder: number, tableKeys: {name: string, ordering: string}[]}> {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in checkOrder");
        }

        const deferred: XDDeferred<{tableOrder: number, tableKeys: {name: string, ordering: string}[]}> = PromiseHelper.deferred();
        XIApi.getTableMeta(tableName)
        .then((tableMeta) => {
            const keys: {name: string, ordering: string}[] = xcHelper.getTableKeyInfoFromMeta(tableMeta);
            deferred.resolve({tableOrder: tableMeta.ordering, tableKeys: keys});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX TODO: remove it and use XIApi.loadDataset
    /**
     * XIApi.load
     * @param dsArgs, dsArgs is as follows: url, isRecur, maxSampleSize,
     * skipRows, pattern,
     * @param formatArgs, formatArgs is as follows: format("CSV", "JSON",
     * "Excel", "raw"), if "CSV", then fieldDelim, recordDelim,
     * schemaMode, quoteChar, moduleName, funcName, udfQuery
     * @param dsName
     * @param txId
     */
    export function load(
        dsArgs: DSArgs,
        formatArgs: FormatArgs,
        dsName: string,
        txId: number
    ): XDPromise<void> {
        if (txId == null ||
            !dsArgs ||
            !formatArgs ||
            !dsArgs.url ||
            !formatArgs.format
        ) {
            return PromiseHelper.reject("Invalid args in load");
        }

        const url: string = dsArgs.url;
        const isRecur: boolean = dsArgs.isRecur || false;
        const format: string = formatArgs.format;
        const maxSampleSize: number = dsArgs.maxSampleSize || 0;
        const skipRows: number = dsArgs.skipRows || 0;
        const pattern: string = dsArgs.pattern;

        let fieldDelim: string;
        let recordDelim: string;
        let schemaMode: number = CsvSchemaModeT.CsvSchemaModeNoneProvided;
        let quoteChar: string;
        let typedColumns: object[] = [];
        let schemaFile: string = ""; // Not implemented yet. Wait for backend
        if (format === "CSV") {
            fieldDelim = formatArgs.fieldDelim || "";
            recordDelim = formatArgs.recordDelim || "\n";
            schemaMode = formatArgs.schemaMode || CsvSchemaModeT.CsvSchemaModeNoneProvided;
            quoteChar = formatArgs.quoteChar || '"';
            typedColumns = formatArgs.typedColumns || [];
        }

        const moduleName: string = formatArgs.moduleName || "";
        const funcName: string = formatArgs.funcName || "";
        const udfQuery: string = formatArgs.udfQuery;

        const options: object = {
            "sources": [{
                "targetName": dsArgs.targetName,
                "path": url,
                "recursive": isRecur,
                "fileNamePattern": pattern
            }],
            "format": format,
            "fieldDelim": fieldDelim,
            "recordDelim": recordDelim,
            "schemaMode": schemaMode,
            "moduleName": moduleName,
            "funcName": funcName,
            "maxSampleSize": maxSampleSize,
            "quoteChar": quoteChar,
            "skipRows": skipRows,
            "udfQuery": udfQuery,
            "typedColumns": typedColumns,
            "schemaFile": schemaFile
        };

        return XIApi.loadDataset(txId, dsName, options);
    }

    /**
     * XIApi.loadDataset
     * @param txId
     * @param dsName
     * @param options
     */
    export function loadDataset (
        txId: number,
        dsName: string,
        options: object
    ): XDPromise<any> {
        if (txId == null || !dsName || !options) {
            return PromiseHelper.reject("Invalid args in load dataset");
        }

        // XXX TODO: make the query version work
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        // const simuldateTxId: number = startSimulate();
        let hasCreate: boolean = false;

        XcalarDatasetCreate(dsName, options)
        .then(() => {
            hasCreate = true;
            // return XcalarDatasetActivate(dsName, simuldateTxId);
            return XcalarDatasetActivate(dsName, txId);
        })
        // .then(() => {
        //     const query: string = endSimulate(simuldateTxId);
        //     const queryName: string = dsName;
        //     return XIApi.query(txId, queryName, query);
        // })
        .then(deferred.resolve)
        .fail((error) => {
            if (hasCreate) {
                XcalarDatasetDelete(dsName);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * XIApi.deleteDataset
     * @param txId
     * @param dsName
     * @param options
     */
    export function deleteDataset (
        txId: number,
        dsName: string,
        allowDeactivateFail: boolean = false
    ): XDPromise<any> {
        if (!dsName) {
            return PromiseHelper.reject("Invalid args in delete dataset");
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const deactivate = () => {
            const innerDeferred: XDDeferred<any> = PromiseHelper.deferred();
            XcalarDatasetDeactivate(dsName)
            .then(innerDeferred.resolve)
            .fail((error) => {
                if (allowDeactivateFail) {
                    innerDeferred.resolve();
                } else {
                    innerDeferred.reject(error);
                }
            });
            return innerDeferred.promise();
        };

        deactivate()
        .then(() => {
            return XcalarDatasetDelete(dsName, txId);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.indexFromDataset
     * @param txId
     * @param dsName
     * @param newTableName
     * @param prefix
     */
    export function indexFromDataset(
        txId: number,
        dsName: string,
        newTableName: string,
        prefix: string
    ): XDPromise<{newTableName: string, prefix: string}> {
        if (txId == null || dsName == null) {
            return PromiseHelper.reject("Invalid args in indexFromDataset");
        }

        const deferred: XDDeferred<{newTableName: string, prefix: string}> = PromiseHelper.deferred();
        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(newTableName);
        }

        if (!isValidPrefix(prefix)) {
            prefix = xcHelper.normalizePrefix(prefix);
        }

        const simuldateTxId: number = startSimulate();
        XcalarIndexFromDataset(dsName, gXcalarRecordNum, newTableName, prefix, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve({newTableName, prefix});
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * XIApi.index
     * @param txId
     * @param colNames
     * @param tableName
     * @param newTableName
     * @param newKeys
     * @param dhtName (Note that only groupBy's index is valid to use dht)
     * @returns Promise<indexTable, indexArgs>, indexTable: (string),
     * indexArgs: (object) see checckTableIndex
     */
    export function index(
        txId: number,
        colNames: string[],
        tableName: string,
        newTableName?: string,
        newKeys?: string[],
        dhtName?: string,
        noCache: boolean = false
    ): XDPromise<{newTableName: string, isCache: boolean, newKeys: string[], tempCols: string[]}> {
        if (txId == null ||
            colNames == null ||
            tableName == null ||
            !(colNames instanceof Array)
        ) {
            return PromiseHelper.reject("Invalid args in index");
        }

        let indexFunc = (): XDPromise<{newTableName: string, isCache: boolean, newKeys: string[], tempCols: string[]}> => {
            if (colNames.length === 0) {
                return PromiseHelper.resolve({newTableName: tableName, isCache: false, newKeys: colNames, tempCols: []});
            }

            newKeys = newKeys || [];
            const deferred: XDDeferred<{newTableName: string, isCache: boolean, newKeys: string[], tempCols: string[]}> = PromiseHelper.deferred();
            let keysList: string[] = [];
            let tempCols: string[] = [];
            const keyInfos: {
                name: string,
                ordering: XcalarOrderingT,
                keyFieldName: string
            }[] = colNames.map((colName, index) => {
                if (newKeys[index] && keysList.indexOf(newKeys[index]) != -1 ||
                    newKeys[index] == undefined && keysList.indexOf(colName) != -1) {
                    newKeys[index] = (newKeys[index] || colName) + "_copy_"
                                     + Authentication.getHashId().substring(1);
                    tempCols.push(newKeys[index]);
                }
                keysList.push(newKeys[index] || colName);
                return {
                    name: colName,
                    ordering: XcalarOrderingT.XcalarOrderingUnordered,
                    keyFieldName: newKeys[index] || null
                };
            });
            if (!isValidTableName(newTableName)) {
                newTableName = getNewTableName(tableName, ".index");
            }
            indexHelper(txId, keyInfos, tableName, newTableName, dhtName)
            .then((ret) => {
                const {newTableName, newKeys} = ret;
                if (!noCache) {
                    XIApi.cacheIndexTable(tableName, colNames,
                        newTableName, newKeys, tempCols);
                }
                deferred.resolve({
                    newTableName: newTableName,
                    isCache: false,
                    newKeys: newKeys,
                    tempCols: tempCols
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        let checkIfTableExists = (tableName: string): XDPromise<boolean> => {
            if (xcHelper.isNodeJs()) {
                // assume in node js env table exists
                return PromiseHelper.resolve(true);
            } else {
                const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
                let exist = false;
                XcalarGetTables(tableName)
                .then((res) => {
                    try {
                        exist = (res.numNodes > 0);
                    } catch (e) {
                        console.error(e);
                    }
                    deferred.resolve(exist);
                })
                .fail(() => {
                    deferred.resolve(exist); // still resolve it
                });

                return deferred.promise();
            }
        };

        let indexCache: TableIndexCache = XIApi.getIndexTable(tableName, colNames);
        if (!noCache && indexCache != null) {
            // log this indexed table as part of the transaction so afterwards
            // we can add a tag to the indexed table to indicate it is
            // part of the transaction
            const deferred: XDDeferred<{newTableName: string, isCache: boolean, newKeys: string[], tempCols: string[]}> = PromiseHelper.deferred();
            checkIfTableExists(indexCache.tableName)
            .then((exist) => {
                if (!exist) {
                    // when not exist, index the source table
                    console.info("cached table not eixst", indexCache.tableName);
                    XIApi.deleteIndexTable(indexCache.tableName);
                    return indexFunc();
                }
                if (typeof QueryManager !== "undefined") {
                    // XXX For JDBC. QueryManager is currently browser side code. So
                    // it shouldn't be mixed up with API layer code.
                    // We can probably better solve the issue when we have clear
                    // code layers/structures.
                    QueryManager.addIndexTable(txId, indexCache.tableName);
                }
                console.info("has cached of index table", indexCache.tableName);
                const retStruct = {newTableName: indexCache.tableName, isCache: true, newKeys: indexCache.keys, tempCols: indexCache.tempCols};
                return PromiseHelper.resolve(retStruct);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            return indexFunc();
        }
    }

    /**
     * XIApi.sort
     * @param txId
     * @param keyInfos
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sort(
        txId: number,
        keyInfos: {
            name: string,
            ordering: XcalarOrderingT,
            type?: ColumnType
        }[],
        tableName: string,
        newTableName?: string,
        dhtName?: string
    ): XDPromise<{newTableName: string, newKeys: string[]}> {
        if (txId == null ||
            keyInfos == null ||
            tableName == null ||
            !(keyInfos instanceof Array)
        ) {
            return PromiseHelper.reject("Invalid args in sort");
        }

        const deferred: XDDeferred<{newTableName: string, newKeys: string[]}> = PromiseHelper.deferred();
        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        indexHelper(txId, keyInfos, tableName, newTableName, dhtName)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.sortAscending
     * @param txId
     * @param colNames
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sortAscending(
        txId: number,
        colNames: string[],
        tableName: string,
        newTableName?: string
    ): XDPromise<{newTableName: string, newKeys: string[]}> {
        // a quick function to sort ascending
        const keyInfos: {
            name: string, ordering: XcalarOrderingT
        }[] = colNames.map((colName) => {
            return {
                name: colName,
                ordering: XcalarOrderingT.XcalarOrderingAscending
            }
        });
        return XIApi.sort(txId, keyInfos, tableName, newTableName);
    }

    /**
     * XIApi.sortDescending
     * @param txId
     * @param colNames
     * @param tableName
     * @param newTableName
     * @returns Promise<newTableName, newKeys>
     */
    export function sortDescending(
        txId: number,
        colNames: string[],
        tableName: string,
        newTableName?: string
    ): XDPromise<{newTableName: string, newKeys: string[]}> {
        // a quick function to sort descending
        const keyInfos: {
            name: string, ordering: XcalarOrderingT
        }[] = colNames.map((colName) => {
            return {
                name: colName,
                ordering: XcalarOrderingT.XcalarOrderingDescending
            }
        });
        return XIApi.sort(txId, keyInfos, tableName, newTableName);
    }

    /**
     * XIApi.map
     * @param txId
     * @param mapStrs
     * @param tableName
     * @param newColNames
     * @param newTableName
     * @param icvMode
     * @returns Promise<newTableName>
     */
    export function map(
        txId: number,
        mapStrs: string[],
        tableName: string,
        newColNames: string[],
        newTableName?: string,
        icvMode: boolean = false
    ): XDPromise<string> {
        if (txId == null ||
            mapStrs == null ||
            tableName == null ||
            newColNames == null
        ) {
            return PromiseHelper.reject("Invalid args in map");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const simuldateTxId: number = startSimulate();
        XcalarMap(newColNames, mapStrs, tableName, newTableName, icvMode, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * XIApi.join
     * @param txId
     * @param joinType
     * @param lTableInfo
     * @param rTableInfo
     * @param options
     * @returns Promise<newTableName, joinedCols, tempCols>
     *
     * for the type in renameMap in lableInfo/rTableInfo
     * if it's fat ptr, pass in DfFieldTypeT.DfFatptr, othewise, pass in null
     * sample:
     * lTableInfo = {
     *  "tableName": "test#ab123",
     *  "columns": ["test::colA", "test::colB"],
     *  "casts": ["string", null],
     *  "rename": [{
     *      "new": "test2",
     *      "orig": "test",
     *      "type": DfFieldTypeT.DfFatptr or DfFieldTypeT.DfUnknown
     *  }],
     *  "allImmediates": ["a", "b", "c"]
     * }
     */
    export function join(
        txId: number,
        joinType: JoinType,
        lTableInfo: JoinTableInfo,
        rTableInfo: JoinTableInfo,
        options: JoinOptions = <JoinOptions>{}
    ): XDPromise<{
        newTableName: string,
        tempCols: string[],
        lRename: ColRenameInfo[],
        rRename: ColRenameInfo[]
    }> {
        if (txId == null ||
            joinType == null ||
            !(joinType in JoinOperatorTStr || joinType in JoinCompoundOperator) ||
            !(lTableInfo instanceof Object) ||
            !(rTableInfo instanceof Object) ||
            lTableInfo.columns == null ||
            rTableInfo.columns == null ||
            lTableInfo.tableName == null ||
            rTableInfo.tableName == null
        ) {
            return PromiseHelper.reject("Invalid args in join.");
        }

        const lTableName: string = lTableInfo.tableName;
        const lColNames: string[] = (lTableInfo.columns instanceof Array) ?
                                    lTableInfo.columns : [lTableInfo.columns];
        const lRename: ColRenameInfo[] = lTableInfo.rename || [];
        let lCasts: ColumnType[] = lTableInfo.casts;

        const rTableName: string = rTableInfo.tableName;
        const rColNames: string[] = (rTableInfo.columns instanceof Array) ?
                                    rTableInfo.columns : [rTableInfo.columns];
        const rRename: ColRenameInfo[] = rTableInfo.rename || [];
        let rCasts: ColumnType[] = rTableInfo.casts;


        if ((joinType !== JoinOperatorT.CrossJoin && lColNames.length < 1) ||
            lColNames.length !== rColNames.length
        ) {
            return PromiseHelper.reject("Invalid args in join.");
        }

        if (lCasts == null || lCasts.length == 0) {
            lCasts = new Array(lColNames.length).fill(null);
        }

        if (rCasts == null || rCasts.length == 0) {
            rCasts = new Array(rColNames.length).fill(null);
        }

        if (!(lCasts instanceof Array)) {
            lCasts = [lCasts];
        }

        if (!(rCasts instanceof Array)) {
            rCasts = [rCasts];
        }

        const clean: boolean = options.clean || false;
        let newTableName: string = options.newTableName;
        let tempTables: string[] = [];
        let rIndexColNames: string[];
        let tempColNames: string[];

        const lCastInfo: JoinCastInfo = {
            tableName: lTableName,
            columns: lColNames,
            casts: lCasts
        };
        const rCastInfo: JoinCastInfo = {
            tableName: rTableName,
            columns: rColNames,
            casts: rCasts
        };

        const deferred: XDDeferred<{
            newTableName: string,
            tempCols: string[],
            lRename: ColRenameInfo[],
            rRename: ColRenameInfo[]
        }> = PromiseHelper.deferred();

        // Step 1: cast columns
        joinCast(txId, lCastInfo, rCastInfo)
        .then((res) => {
            tempTables = tempTables.concat(res.tempTables);
            // Step 2: index the left table and right table
            rIndexColNames = res.rColNames;
            return joinIndex(txId, res, lTableInfo.removeNulls, clean);
        })
        .then((ret) => {
            const {lRes, rRes, tempTablesInIndex, tempCols} = ret;
            tempTables = tempTables.concat(tempTablesInIndex);
            tempColNames = tempCols;
            // Step 3: resolve name collision
            const lIndexedTable: string = lRes.tableName;
            const rIndexedTable: string = rRes.tableName;
            const lImm: string[] = lTableInfo.allImmediates || [];
            const rImm: string[] = rTableInfo.allImmediates || [];
            resolveJoinColRename(lRename, rRename, lRes, rRes, lImm, rImm);
            // If rIndexColNames has been renamed because of
            // resolveJoinIndexColRename, we must make sure the rIndexColNames
            // array is with the POST rename functions because semiJoinHelper
            // will use this column to filter
            for (let i = 0; i < rRename.length; i++) {
                const index: number = rIndexColNames.indexOf(rRename[i].orig);
                if (index > -1) {
                    rIndexColNames[index] = rRename[i].new;
                }
            }

            newTableName = getNewJoinTableName(lTableName, rTableName, newTableName);
            // Step 3: Join
            // cross join or normal join
            const joinOptions = {
                evalString: '',
                keepAllColumns: true,
                nullSafe: false,
                key: [lRes.newKeys, rRes.newKeys]
            };
            if (options && options.evalString) {
                // Join with non equal condition case
                joinOptions.evalString = options.evalString;
            }
            if (options && options.keepAllColumns != null) {
                joinOptions.keepAllColumns = options.keepAllColumns;
            }
            if (options && options.nullSafe != null) {
                joinOptions.nullSafe = options.nullSafe;
            }
            return joinHelper(txId, lIndexedTable, rIndexedTable, newTableName,
                    <number>joinType, lRename, rRename, joinOptions);
        })
        .then((tempCols) => {
            tempCols = tempCols.concat(tempColNames);
            if (clean) {
                XIApi.deleteTableInBulk(txId, tempTables, true)
                .always(() => {
                    deferred.resolve({newTableName, tempCols, lRename, rRename});
                });
            } else {
                deferred.resolve({newTableName, tempCols, lRename, rRename});
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.groupBy
     * @param txId
     * @param aggArgs
     * @param groupByCols
     * @param tableName
     * @param options
     * @returns Promise<finalTable, tempCols, newKeyFieldName, newKeys>
     */
    export function groupBy(
        txId: number,
        aggArgs: AggColInfo[],
        groupByCols: string[],
        tableName: string,
        options: GroupByOptions = <GroupByOptions>{}
    ): XDPromise<{finalTable: string, tempCols: string[], newKeyFieldName: string, newKeys: string[]}> {
        if (txId == null ||
            aggArgs == null ||
            groupByCols == null ||
            tableName == null ||
            aggArgs[0].newColName == null ||
            aggArgs[0].aggColName.length < 1)
        {
            return PromiseHelper.reject("Invalid args in groupby");
        }

        if (!(groupByCols instanceof Array)) {
            groupByCols = [groupByCols];
        }

        // Split aggArgs into 2 arrays, one array with operators and
        // Another array that's just aliasing
        const distinctAggArgs: AggColInfo[] = [];
        let normalAggArgs: AggColInfo[] = [];

        aggArgs.forEach((aggArg) => {
            if (aggArg.isDistinct) {
                distinctAggArgs.push(aggArg);
            } else {
                normalAggArgs.push(aggArg);
            }
        });

        // The below is an optimization. If multiple aggOps are operating on the
        // same column, we only need do that groupby once
        const aggCols: object = {};
        distinctAggArgs.forEach((aggArg) => {
            const aggColName: string = aggArg.aggColName;
            if (aggColName in aggCols) {
                aggCols[aggColName].push(aggArg);
            } else {
                aggCols[aggColName] = [aggArg];
            }
        });

        let tempCols: string[] = [];
        let onlyDistinct: boolean = normalAggArgs.length === 0
                                    && Object.keys(aggCols).length > 0;

        const icvMode: boolean = options.icvMode || false;
        const clean: boolean = options.clean || false;
        const groupAll: boolean = options.groupAll || false;
        const isMultiGroupby: boolean = (groupByCols.length > 1);
        let gbTableName: string = options.newTableName;
        let tempTables: string[] = [];
        let finalTable: string;
        let newKeyFieldName: string;
        let newKeys: string[] = options.newKeys || [];
        let isIncSample: boolean = options.isIncSample || false;
        let allCols: {name: string, type: DfFieldTypeT}[] = options.allCols;
        newKeys.forEach((colName) => {
            if (xcHelper.parsePrefixColName(colName).prefix) {
                isIncSample = true; // if there is prefix field in newKeys, keep sample
                return false;
            }
        });

        const deferred: XDDeferred<{finalTable: string, tempCols: string[], newKeyFieldName: string, newKeys: string[]}> = PromiseHelper.deferred();
        let promise: any;
        // tableName is the original table name that started xiApi.groupby
        if (onlyDistinct) {
            promise = PromiseHelper.resolve();
        } else {
            promise = XIApi.index(txId, groupByCols, tableName, null, newKeys, options.dhtName, clean)
            .then((ret) => {
                const indexedTable = ret.newTableName;
                const indexKeys = ret.newKeys;
                newKeys = indexKeys;
                if (clean && indexedTable !== tableName) {
                    // don't add starting table to tempTables
                    tempTables.push(indexedTable);
                }
                // table name may have changed after sort!
                if (isIncSample || isMultiGroupby || groupAll || indexKeys.length === 0) {
                    // incSample does not take renames, multiGroupby already handle
                    // the name in index stage
                    newKeyFieldName = null;
                } else {
                    newKeyFieldName = xcHelper.stripPrefixInColName(xcHelper.stripColName(indexKeys[0]));
                }

                // get name from src table
                if (!isValidTableName(gbTableName)) {
                    gbTableName = getNewTableName(tableName, "-GB");
                }

                const newColNames: string[] = [];
                const evalStrs: string[] = [];
                normalAggArgs.forEach((aggArg) => {
                    newColNames.push(aggArg.newColName);
                    evalStrs.push(getGroupByAggEvalStr(aggArg));
                });

                return groupByHelper(txId, newColNames, evalStrs,
                indexedTable, gbTableName, isIncSample,
                icvMode, newKeyFieldName, groupAll)
            });
        }
        promise
        .then(() => {
            // XXX Check whether tempTables is well tracked
            return distinctGroupby(txId, tableName, groupByCols, aggCols,
                                   normalAggArgs, gbTableName, onlyDistinct,
                                   isIncSample, allCols);
        })
        .then((ret) => {
            const {resTable, resTempTables, resTempCols} = ret;
            finalTable = resTable;
            tempTables = tempTables.concat(resTempTables);
            tempCols = tempCols.concat(resTempCols);

            if (clean) {
                // remove intermediate table, filter out finalTable from this list
                tempTables = tempTables.filter(table => {
                    return table !== finalTable;
                });
                const promise: XDPromise<void> = XIApi.deleteTableInBulk(txId, tempTables, true)
                return PromiseHelper.alwaysResolve(promise);
            }
        })
        .then(() => {
            deferred.resolve({finalTable, tempCols, newKeyFieldName, newKeys});
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.union
     * sample:
     *  var tableInfos = [{
     *      tableName: "test#ab123",
     *      columns: [{
     *          name: "test2",
     *          rename: "test",
     *          type: "string"
     *          cast: true
     *      }]
     *  }]
     * @param txId
     * @param tableInfos
     * @param dedup
     * @param newTableName
     * @param unionType Enum
     * @returns Promise<newTableName, newTableCols>
     */
    export function union(
        txId: number,
        tableInfos: UnionTableInfo[],
        dedup: boolean = false,
        newTableName?: string,
        unionType?: UnionOperatorT,
        cleanup: boolean = false
    ): XDPromise<{newTableName: string, newTableCols: {rename: string, type: ColumnType}[]}> {
        if (unionType === undefined) {
            unionType = UnionOperatorT.UnionStandard;
        }
        tableInfos = xcHelper.deepCopy(tableInfos);
        tableInfos = checkUnionTableInfos(tableInfos);
        if (txId == null || tableInfos == null) {
            return PromiseHelper.reject("Invalid args in union");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableInfos[0].tableName);
        }

        let tempTables: string[] = [];
        const deferred: XDDeferred<{newTableName: string, newTableCols: {rename: string, type: ColumnType}[]}> = PromiseHelper.deferred();
        unionCast(txId, tableInfos)
        .then((ret) => {
            const {unionRenameInfos, resTempTables} = ret;
            tempTables = tempTables.concat(resTempTables);

            if (dedup || unionType !== UnionOperatorT.UnionStandard) {
                return unionAllIndex(txId, unionRenameInfos);
            } else {
                return PromiseHelper.resolve({unionRenameInfos: unionRenameInfos, resTempTables: [], indexKeys: []});
            }
        })
        .then((ret: {unionRenameInfos: UnionRenameInfo[], resTempTables: string[], indexKeys: string[]}) => {
            const {unionRenameInfos, resTempTables, indexKeys} = ret;
            tempTables = tempTables.concat(resTempTables);

            const tableNames: string[] = [];
            const colInfos: ColRenameInfo[][] = [];
            unionRenameInfos.forEach((tableInfo) => {
                tableNames.push(tableInfo.tableName);
                colInfos.push(tableInfo.renames);
            });
            return unionHelper(txId, tableNames, newTableName, colInfos, dedup, unionType, indexKeys);
        })
        .then(() => {
            if (cleanup) {
                // remove temp table (in step execution only)
                return XIApi.deleteTableInBulk(txId, tempTables, true);
            }
        })
        .then(() => {
            const newTableCols: {rename: string, type: ColumnType}[] = tableInfos[0].columns.map((col) => {
                return {
                    "rename":col.rename,
                    "type": col.type
                };
            });
            deferred.resolve({
                newTableName: newTableName,
                newTableCols: newTableCols
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

   /**
    * XIApi.project
    * @param txId
    * @param columns, an array of column names (back column name)
    * @param tableName, table's name
    * @param newTableName(Optional), new table's name
    */
    export function project(
        txId: number,
        columns: string[],
        tableName: string,
        newTableName?: string
    ): XDPromise<string> {
        if (txId == null || columns == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in project");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarProject(columns, tableName, newTableName, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    export function synthesize(
        txId: number,
        colInfos: ColRenameInfo[],
        tableName: string,
        newTableName?: string,
        sameSession: boolean = true
    ): XDPromise<string> {
        if (txId == null || colInfos == null || tableName == null) {
            return PromiseHelper.reject("Invalid args in synthesize");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }
        if (sameSession == null) {
            sameSession = true;
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarSynthesize(tableName, newTableName, colInfos, sameSession, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * XIApi.query
     * @param txId
     * @param queryName
     * @param queryStr
     * @param options
     */
    export function query(
        txId: number,
        queryName: string,
        queryStr: string,
        options?: {
            checkTime?: number,
            noCleanup?: boolean,
            udfUserName?: string,
            udfSessionName?: string
        },
        scopeInfo?: Xcrpc.Query.ScopeInfo
    ): XDPromise<XcalarApiQueryStateOutputT> {
        if (txId == null || queryName == null || queryStr == null) {
            return PromiseHelper.reject("Invalid args in query");
        }

        if (Transaction.isSimulate(txId)) {
            if (queryStr.startsWith("[") && queryStr.endsWith("]")) {
                queryStr = queryStr.substring(1, queryStr.length - 1);
            }
            Transaction.log(txId, queryStr);
            return PromiseHelper.resolve({});
        } else {
            if (!queryStr.startsWith("[")) {
                // when query is not in the form of JSON array
                if (queryStr.endsWith(",")) {
                    queryStr = queryStr.substring(0, queryStr.length - 1);
                }
                queryStr = "[" + queryStr + "]";
            }
            queryStr = _removeDuplicateDeleteQueries(queryStr);

            const deferred: XDDeferred<any> = PromiseHelper.deferred();
            const txLog = Transaction.get(txId);
            queryStr = _addDagNodeIdToQueryComment(queryStr, txId);

            options = $.extend({
                bailOnError: true,
                udfUserName: txLog.udfUserName,
                udfSessionName: txLog.udfSessionName
            }, options);
            XcalarQueryWithCheck(queryName, queryStr, txId, options, scopeInfo)
            .then((res: XcalarApiQueryStateOutputT) => {
                let error = _handleQueryFail(res);
                if (error == null) {
                    deferred.resolve(res);
                } else {
                    deferred.reject(error);
                }
            })
            .fail((res: {thriftError: ThriftError, queryStateOutput: XcalarApiQueryStateOutputT}) => {
                if (res.thriftError) {
                    deferred.reject(res.thriftError);
                }
                let error;
                if (res === StatusTStr[StatusT.StatusCanceled]) {
                    error = res;
                } else {
                    error = _handleQueryFail(res.queryStateOutput);
                }
                deferred.reject(error);
            });

            return deferred.promise();
        }
    }

    export async function executeQueryOptimized(
        txId: number,
        queryName: string,
        queryStringOpt: string,
        tableName: string,
        options?: {
            udfUserName?: string,
            udfSessionName?: string
    }): Promise<void> {
        const { udfUserName, udfSessionName } = options || {};
        await XcalarImportRetina(
            queryName, true, null, queryStringOpt, udfUserName, udfSessionName, txId
        );
        const retinaParams = [];
        try {
            await XcalarExecuteRetina(queryName, retinaParams, {
                activeSession: true,
                udfUserName: udfUserName,
                udfSessionName: udfSessionName,
                newTableName: tableName
            }, txId);
        } finally {
            try {
                await XcalarDeleteRetina(queryName, txId);
            } catch(e) {
                console.error('XIApi.executeQueryOptimized error: ', e);
                // Don't fail in minor error
            }
        }
    }

    /**
     * XIApi.callApiInSession
     * @param callSession
     * @param func
     */
    export function callApiInSession<T>(callSession: string, func: () => XDPromise<T>): Promise<T> {
        const restoreSession = _switchSession(callSession);
        try {
            const result = PromiseHelper.convertToNative(func());
            return result;
        } finally {
            restoreSession();
        }
    }

    function _switchSession(callSession: string) {
        const currentSession = sessionName;
        setSessionName(callSession);

        // Return a restore function
        return () => {
            setSessionName(currentSession);
        };
    }

    function _handleQueryFail(res) {
        let error: {error: string, log?: string} = null;
        try {
            if (!res || !res.queryGraph) {
                return error;
            }
            for (let i = 0; i < res.queryGraph.node.length; i++) {
                // XXX TODO: wire in status
                const nodeInfo = res.queryGraph.node[i];
                const state = nodeInfo.state;
                if (state === DgDagStateT.DgDagStateError) {
                    error = {
                        error: nodeInfo.thriftError.error || DgDagStateTStr[state],
                        log: nodeInfo.log
                    };
                    break;
                }
            }
        } catch (e) {
            console.error(e);
            // if cannot correctly parse the return structure,
            // still resolve it
        }
        return error;
    }

    // add nodeId and nested nodeIds as query tag to track
    // relationship between query and dagNode
    // 1 dagNode can contain many queries, and 1 query can contain
    // multiple dagNode(id)s from the 1 dag node it belongs to as well as
    // that dagNode's container (ex. node can have a sql node container)
    // the caller is _extension/_publishIMD/_updateIMD in DagNodeExecutor
    function _addDagNodeIdToQueryComment(
        queryStr: string,
        txId: number
    ): string {
        const txLog = Transaction.get(txId);
        if (!txLog.currentNodeInfo) {
            return queryStr;
        }
        let parentNodeInfos = Transaction.getParentNodeInfos(txId);
        try {
            let query = JSON.parse(queryStr);
            query = query.map((q) => {
                return xcHelper.addNodeLineageToQueryComment(q, parentNodeInfos, txLog.currentNodeInfo);
            });
            queryStr = JSON.stringify(query);
        } catch (e) {
            // ok to fail, we just don't tag the nodes
            console.error(e);
        }
        return queryStr;
    }

    // when building a large query, some of the apis add tables to
    // delete from the cache and temp tables and sometimes they get called to
    // delete twice. This would cause a query failure if we don't fix it here --
    // it's difficult fo fix at the source (this happens with some groupby calls)
    function _removeDuplicateDeleteQueries(queryStr: string): string {
        try {
            let query: any[] = JSON.parse(queryStr);
            let tablesToDelete: Set<string> = new Set();
            let newQuery: any[] = [];
            query.forEach((q) => {
                if (q.operation === XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                    if (!tablesToDelete.has(q.args.namePattern)) {
                        tablesToDelete.add(q.args.namePattern);
                        newQuery.push(q);
                    }
                } else {
                    newQuery.push(q);
                }
            });
            let newQueryStr: string = JSON.stringify(newQuery);
            return newQueryStr;
        } catch(e) {
            console.error(e);
            return queryStr;
        }
    }

    /**
     * XIApi.exportTable
     */
    export function exportTable(
        txId: number,
        tableName: string,
        driverName: string,
        driverParams: {},
        columns: XcalarApiExportColumnT[],
        exportName: string
    ): XDPromise<void> {
        if (txId == null || tableName == null || exportName == null || driverName == null ||
            columns.length == 0) {
            return PromiseHelper.reject("Invalid args in export");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const simuldateTxId: number = startSimulate();
        XcalarExport(tableName, driverName, driverParams, columns, exportName, simuldateTxId)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = getNewTableName(exportName);
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * XIApi.genRowNum
     * @param txId
     * @param tableName
     * @param newColName
     * @param newTableName
     */
    export function genRowNum(
        txId: number,
        tableName: string,
        newColName: string,
        newTableName?: string
    ): XDPromise<string> {
        if (txId == null || tableName == null || newColName == null) {
            return PromiseHelper.reject("Invalid args in get row num");
        }

        if (!isValidTableName(newTableName)) {
            newTableName = getNewTableName(tableName);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const simulateTxId: number = startSimulate();

        XcalarGenRowNum(tableName, newTableName, newColName, simulateTxId)
        .then(() => {
            const query: string = endSimulate(simulateTxId);
            const queryName: string = newTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(newTableName);
        })
        .fail((err) => {
            endSimulate(simulateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * XIApi.getNumRows
     * @param tableName
     * @param options
     */
    export function getNumRows(
        tableName: string,
        options: GetNumRowsOptions = <GetNumRowsOptions>{}
    ): XDPromise<number> {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in getNumRows");
        }
        if (options.useConstant) {
            // when use constant
            const dstAggName: string = options.constantName;
            if (dstAggName == null) {
                return PromiseHelper.reject("Invalid args in getNumRows");
            }

            const txId: number = options.txId;
            const colName: string = options.colName;
            const aggOp: string = AggrOp.Count;
            const deferred: XDDeferred<number> = PromiseHelper.deferred();
            XIApi.aggregate(txId, aggOp, colName,tableName, dstAggName)
            .then((ret) => {
                deferred.resolve(<number>ret.value);
            })
            .fail(deferred.reject);
            return deferred.promise();
        }
        return XcalarGetTableCount(tableName);
    }

    /**
     * XIApi.fetchData
     * @param tableName
     * @param startRowNum
     * @param rowsRequested
     */
    export function fetchData(
        tableName: string,
        startRowNum: number,
        rowsRequested: number
    ): XDPromise<string[]> {
        if (tableName == null || startRowNum == null ||
            rowsRequested == null || rowsRequested <= 0)
        {
            return PromiseHelper.reject({error: "Invalid args in fetch data"});
        }

        const deferred: XDDeferred<string[]> = PromiseHelper.deferred();
        let resultSetId: string;

        XcalarMakeResultSetFromTable(tableName)
        .then((res) => {
            resultSetId = res.resultSetId;
            const totalRows: number = res.numEntries;
            if (totalRows == null || totalRows === 0) {
                return PromiseHelper.reject("No Data!");
            }

            // startRowNum starts with 1, rowPosition starts with 0
            const rowPosition: number = startRowNum - 1;
            const rowsToFetch = Math.min(rowsRequested, totalRows);
            return XcalarFetchData(resultSetId, rowPosition, rowsToFetch,
                                   totalRows, [], 0, 0);
        })
        .then((result: string[]) => {
            const finalData: string[] = result.map((data) => data);
            XcalarSetFree(resultSetId)
            .always(() => {
                deferred.resolve(finalData);
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.fetchDataAndParse
     * @param tableName
     * @param startRowNum
     * @param rowsRequested
     */
    export function fetchDataAndParse(
        tableName: string,
        startRowNum: number,
        rowsRequested: number
    ): XDPromise<object[]> {
        // similar with XIApi.fetchData, but will parse the value
        const deferred: XDDeferred<object[]> = PromiseHelper.deferred();
        XIApi.fetchData(tableName, startRowNum, rowsRequested)
        .then((data: string[]) => {
            try {
                const parsedData: any[] = data.map((d) => JSON.parse(d));
                deferred.resolve(parsedData);
            } catch(error) {
                console.error(error);
                deferred.reject(error);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * XIApi.fetchColumnData
     * @param colName
     * @param tableName
     * @param startRowNum
     * @param rowsRequested
     */
    export function fetchColumnData(
        colName: string,
        tableName: string,
        startRowNum: number,
        rowsRequested: number
    ): XDPromise<any[]> {
        if (colName == null) {
            // other args with check in XIApi.fetchData
            return PromiseHelper.reject("Invalid args in fetch data");
        }

        const deferred: XDDeferred<any[]> = PromiseHelper.deferred();
        XIApi.fetchData(tableName, startRowNum, rowsRequested)
        .then((data) => {
            try {
                const result: any[] = data.map((d) => {
                    const row: object = JSON.parse(d);
                    return row[colName];
                });
                deferred.resolve(result);
            } catch (error) {
                deferred.reject(error);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX TODO: wait for 13273 to be fixed, then change it to use query
    /**
     * XIApi.deleteTable
     * @param txId
     * @param tableName
     * @param toIgnoreError boolean, if set true,
     * will always resolve the promise even the call fails.
     */
    export function deleteTable(
        txId: number,
        tableName: string,
        toIgnoreError: boolean = false,
        deleteCompletely?: boolean
    ): XDPromise<void> {
        if (tableName == null) {
            return PromiseHelper.reject("Invalid args in delete table");
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarDeleteTable(tableName, txId, undefined, deleteCompletely)
        .then(function(ret) {
            cleanUpIndexTable(txId, tableName);
            deferred.resolve(ret);
        })
        .fail((error) => {
            if (toIgnoreError) {
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    /**
     * XIApi.deleteTableInBulk
     * @param txId
     * @param tables
     * @param toIgnoreError
     */
    export function deleteTableInBulk(
        txId: number,
        tables: string[],
        toIgnoreError: boolean = false
    ): XDPromise<void> {
        const uniqueTempTables = new Set(tables);
        tables = [...uniqueTempTables]; // remove duplicates
        const promises: XDPromise<void>[] = tables.map((tableName) => {
            return XIApi.deleteTable(txId, tableName, toIgnoreError);
        });
        return PromiseHelper.when.apply(this, promises);
    }

    // if at least 1 table fails, will reject
    /**
     * XIApi.deleteTables
     * @param txId
     * @param arrayOfQueries
     * @param checkTime
     */
    export function deleteTables(
        txId: number,
        arrayOfQueries: any[],
        checkTime: number
    ): XDPromise<any> {
        if (arrayOfQueries == null) {
            // txID not needed if deleting undone tables
            return PromiseHelper.reject('Invalid args in delete table');
        }
        if (arrayOfQueries.length === 0) {
            return PromiseHelper.resolve([]);
        }

        let queryName: string = xcHelper.randName('sql');
        let queryStr: string = JSON.stringify(arrayOfQueries);
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        const checkOptions = {
            bailOnError: false,
            checkTime: checkTime
        };

        XcalarQueryWithCheck(queryName, queryStr, txId, checkOptions)
        .then((res) => {
            // results come back in random order so we create a map of names
            let resMap: Map<string, {
                error: string,
                state: DgDagStateT
            }> = new Map();
            const nodes: any[] = res.queryGraph.node;
            nodes.forEach((node) => {
                let error;
                if (node.thriftError && node.thriftError.error) {
                    error = node.thriftError.error;
                }
                resMap.set(node.input.deleteDagNodeInput.namePattern, {
                    error: error,
                    state: node.state
                });
            });

            let hasError: boolean = false;
            let results: object[] = arrayOfQueries.map((query: any) => {
                const tableName: string = query.args.namePattern;
                const tableInfo = resMap.get(tableName);
                const state: number = tableInfo.state;

                if (state === DgDagStateT.DgDagStateReady ||
                    state === DgDagStateT.DgDagStateDropped
                ) {
                    cleanUpIndexTable(txId, tableName);
                    return null;
                } else {
                    hasError = true;
                    let error;
                    if (tableInfo.error) {
                        error = tableInfo.error;
                    } else {
                        error = DgDagStateTStr[state];
                    }
                    return {
                        error: error,
                        tableName: tableName
                    };
                }
            });

            if (hasError) {
                deferred.reject(results);
            } else {
                deferred.resolve(results);
            }
            if (typeof MonitorPanel !== "undefined") {
                MonitorPanel.tableUsageChange();
            }
        })
        .fail(() => {
            var results = [];
            for (var i = 0; i < arrayOfQueries.length; i++) {
                results.push({
                    error: DgDagStateTStr[DgDagStateT.DgDagStateError],
                    tableName: arrayOfQueries[i].args.namePattern
                });
            }
            deferred.reject(results);
        });

        return deferred.promise();
    };

    export function renameTable(
        txId: number,
        tableName: string,
        newTableName: string
    ): XDPromise<string> {
        if (txId == null ||
            tableName == null ||
            !isValidTableName(newTableName)
        ) {
            return PromiseHelper.reject("Invalid args in rename table");
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        XcalarRenameTable(tableName, newTableName, txId)
        .then(() => {
            XIApi.deleteIndexTable(tableName);
            deferred.resolve(newTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /**
     * XIApi.createDataTarget
     * @param targetType
     * @param targetName
     * @param targetParams
     */
    export function createDataTarget(
        targetType: string,
        targetName: string,
        targetParams: object[]
    ): XDPromise<void> {
        return XcalarTargetCreate(targetType, targetName, targetParams);
    }

    /**
     * XIApi.deleteDataTarget
     * @param targetName
     */
    export function deleteDataTarget(targetName: string): XDPromise<void> {
        return XcalarTargetDelete(targetName);
    }

    /**
     * XIApi.preprocessPubTable
     * @param txId
     * @param primaryKeyList
     * @param srcTableName
     * @param indexTableName
     * @param colInfo
     * @param imdCol
     */
    export function preprocessPubTable(
        txId: number,
        primaryKeys: string[],
        srcTableName: string,
        destTableName: string,
        colInfo: ColRenameInfo[],
        imdCol?: string
    ): XDPromise<string> {
        if (txId == null || primaryKeys == null ||
            srcTableName == null || destTableName == null ||
            colInfo == null) {
            return PromiseHelper.reject("Invalid args in publish");
        }
        let keyNames: string[] = primaryKeys.map((primaryKey) => {
            return (primaryKey[0] == "$") ?
                primaryKey.substr(1) : primaryKey;
        });

        if (keyNames.length != 0) {
            if (!colInfo.find((info: ColRenameInfo) => {
                return (keyNames.includes(info.orig));
            })) {
                return PromiseHelper.reject("Primary Key not in Table");
            }
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        colInfo.forEach((colInfo) => {
            // make sure column is uppercase
            let upperCaseCol: string = colInfo.new.toUpperCase();
            upperCaseCol = xcHelper.cleanseSQLColName(upperCaseCol);
            colInfo.new = upperCaseCol;
        });

        // Remove duplicate Xcalar columns
        colInfo = colInfo.filter((colInfo) => {
            return (colInfo.new !== "XCALARRANKOVER"
                && colInfo.new !== "XCALAROPCODE"
                && colInfo.new !== "XCALARBATCHID");
        });

        const roColName = "XcalarRankOver";
        const primaryKeyList: {name: string, ordering: XcalarOrderingT}[] =
        keyNames.map((primaryKey) => {
            primaryKey = xcHelper.parsePrefixColName(primaryKey).name;
            if (primaryKey === roColName) {
                colInfo.push({
                    orig: roColName,
                    new: roColName,
                    type: DfFieldTypeT.DfInt64
                });
            }
            return {
                name: xcHelper.cleanseSQLColName(primaryKey.toUpperCase()),
                ordering: XcalarOrderingT.XcalarOrderingUnordered
            };
        });

        if (!isValidTableName(destTableName)) {
            destTableName = getNewTableName(destTableName);
        }

        const simuldateTxId: number = startSimulate();
        assemblePubTable(simuldateTxId, primaryKeyList, srcTableName, destTableName, colInfo, imdCol)
        .then(() => {
            const query: string = endSimulate(simuldateTxId);
            const queryName: string = destTableName;
            return XIApi.query(txId, queryName, query);
        })
        .then(() => {
            deferred.resolve(destTableName);
        })
        .fail((err) => {
            endSimulate(simuldateTxId);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    // assemblePubTable generates a rankOverColumn, assembles the opcode column, synthesizes,
    // and indexes.
    function assemblePubTable(
        txId: number,
        primaryKeyList: {name: string, ordering: XcalarOrderingT}[],
        srcTableName: string,
        indexTableName: string,
        colInfo: ColRenameInfo[],
        imdCol?: string
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        const opCode: string = "XcalarOpCode";

        if (imdCol != null && imdCol[0] == "$") {
            imdCol = imdCol.substr(1);
        }

        let tableToDelete: string = null;
        let genRowNumPromise = null;
        // Assemble rankOverColumn
        if (primaryKeyList.length == 0) {
            const roColName: string = "XcalarRankOver";
            // when no primary key, generate row number column
            primaryKeyList = [{name: roColName, ordering: XcalarOrderingT.XcalarOrderingUnordered}]
            let rowNumTableName: string = getNewTableName("pubTemp");
            genRowNumPromise = XIApi.genRowNum(txId, srcTableName, roColName, rowNumTableName);
            // for synthesize use
            colInfo.push({
                orig: roColName,
                new: roColName,
                type: DfFieldTypeT.DfInt64
            });
        } else {
            genRowNumPromise = PromiseHelper.resolve(srcTableName);
        }

        genRowNumPromise
        .then((table: string) => {
            if (table != srcTableName) {
                tableToDelete = table;
            }
            // Assemble opcode column
            let mapStr: string[] = [];
            if (imdCol != null && imdCol != "") {
                mapStr = ["int(" + imdCol + ")"];
            } else {
                mapStr = ["int(1)"];
            }
            const opCodeTableName: string = getNewTableName("pubTemp");
            return XIApi.map(txId, mapStr, table, [opCode], opCodeTableName);
        })
        .then((table: string) => {
            XIApi.deleteTable(txId, tableToDelete);
            tableToDelete = table;
            // synthesize
            colInfo.push({
                orig: opCode,
                new: opCode,
                type: DfFieldTypeT.DfInt64
            });
            return XIApi.synthesize(txId, colInfo, table);
        })
        .then((table) => {
            XIApi.deleteTable(txId, tableToDelete);
            tableToDelete = table;
            // Reorder just in case
            const dhtName: string = "";
            return indexHelper(txId, primaryKeyList, table, indexTableName, dhtName);
        })
        .then((ret) => {
            const { newTableName } = ret;
            XIApi.deleteTable(txId, tableToDelete);
            deferred.resolve(newTableName);
        })
        .fail((err) => {
            if (err.status == StatusT.StatusJsonQueryParseError) {
                err.error = "Failed parsing query, table may not be configured correctly."
            }
            if (tableToDelete != null) {
                XIApi.deleteTable(txId, tableToDelete);
            }
            deferred.reject(err);
        });
        return deferred.promise();
    }

    /**
    * XIApi.publishTable
    * @param txId
    * @param primaryKey, Name of the column that acts as primary key
    * @param tableName, table's name
    * @param pubTableName, new published table's name
    * @param colInfo, Information about the columns within the table
    * @param imdCol,  (optional) name of the column that acts as the operator
    */
    export function publishTable(
        txId: number,
        primaryKeys: string[],
        srcTableName: string,
        pubTableName: string,
        colInfo: ColRenameInfo[],
        imdCol?: string,
        overwrite?: boolean
    ): XDPromise<void> {
        if (txId == null || primaryKeys == null ||
            srcTableName == null || pubTableName == null ||
            colInfo == null) {
            return PromiseHelper.reject("Invalid args in publish");
        }
        if (pubTableName.indexOf("-") > -1) {
            return PromiseHelper.reject("Table name cannot have hyphen");
        }
        let keyNames: string[] = primaryKeys.map((primaryKey) => {
            return (primaryKey[0] == "$") ?
                primaryKey.substr(1) : primaryKey;
        });

        if (keyNames.length != 0) {
            if (!colInfo.find((info: ColRenameInfo) => {
                return (keyNames.includes(info.orig));
            })) {
                return PromiseHelper.reject("Primary Key not in Table");
            }
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();


        colInfo.forEach((colInfo) => {
            // make sure column is uppercase
            let upperCaseCol: string = colInfo.new.toUpperCase();
            upperCaseCol = xcHelper.cleanseSQLColName(upperCaseCol);
            colInfo.new = upperCaseCol;
        });

        // Remove duplicate Xcalar columns
        colInfo = colInfo.filter((colInfo) => {
            return (colInfo.new !== "XCALARRANKOVER"
                && colInfo.new !== "XCALAROPCODE"
                && colInfo.new !== "XCALARBATCHID");
        });

        const roColName = "XcalarRankOver";
        const primaryKeyList: {name: string, ordering: XcalarOrderingT}[] =
        keyNames.map((primaryKey) => {
            primaryKey = xcHelper.parsePrefixColName(primaryKey).name;
            if (primaryKey === roColName) {
                colInfo.push({
                    orig: roColName,
                    new: roColName,
                    type: DfFieldTypeT.DfInt64
                });
            }
            return {
                name: xcHelper.cleanseSQLColName(primaryKey.toUpperCase()),
                ordering: XcalarOrderingT.XcalarOrderingUnordered
            };
        });

        pubTableName = pubTableName.toUpperCase();

        let tableToDelete = null;
        let deleteTablePromise = overwrite ? _deletePublishedTable(pubTableName) : PromiseHelper.resolve();

        deleteTablePromise
        .then(() => {
            let pubTableListPromise;
            if (typeof PTblManager !== "undefined") {
                pubTableListPromise = PromiseHelper.resolve({tables: PTblManager.Instance.getTables()});
            } else {
                pubTableListPromise = XcalarListPublishedTables("*", false, true);
            }
            return pubTableListPromise;
        })
        .then((result) => {
            if (result == null || result.tables == null) {
                result = {tables: []};
            }
            let pubTable: PublishTable | PbTblInfo = null
            try {
                pubTable = result.tables.find((table: PublishTable | PbTblInfo) => {
                    return (table.name.toUpperCase() == pubTableName.toUpperCase()
                        && table["loadMsg"] == null);
                })
            } catch (e) {
                console.error(e);
            }
            if (pubTable != null) {
                return PromiseHelper.reject("Published Table already exists: " + pubTableName);
            }
            const indexTableName: string = xcHelper.randName("publish") + Authentication.getHashId();
            return assemblePubTable(txId, primaryKeyList, srcTableName, indexTableName, colInfo, imdCol);
        })
        .then((indexTable) => {
            tableToDelete = indexTable;
            // Finally publish the table
            return XcalarPublishTable(indexTable, pubTableName, txId);
        })
        .then(() => {
            // persist the final table that used to create published table
            return PromiseHelper.convertToJQuery(_savePublishedTableDataFlow(pubTableName, tableToDelete));
        })
        .then(() => {
            if (tableToDelete != srcTableName) {
                XIApi.deleteTable(txId, tableToDelete);
            }
            deferred.resolve();
        })
        .fail((error) => {
            if (tableToDelete != null && tableToDelete != srcTableName) {
                XIApi.deleteTable(txId, tableToDelete);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function _deletePublishedTable(tableName: string): XDPromise<void> {
        if (typeof PTblManager !== "undefined") {
            return PTblManager.Instance.deleteTablesOnConfirm([tableName], false, true);
        } else {
            return XcalarUnpublishTable(tableName, false);
        }
    }

    async function _savePublishedTableDataFlow(
        pubTableName: string,
        resultSetName: string,
    ): Promise<void> {
        try {
            const pbTblInfo = new PbTblInfo({name: pubTableName});
            await pbTblInfo.saveDataflow(resultSetName);
        } catch (e) {
            console.error("persist published table data flow failed", e);
        }
    }

    /**
    * XIApi.updatePubTable
    * @param txId
    * @param srctableName, table's name
    * @param pubTableName, new published table's name
    * @param colInfo, Information about the columns within the table
    * @param imdCol,  (optional) name of the column that acts as the operator
    */
   export function updatePubTable(
        txId: number,
        srcTableName: string,
        pubTableName: string,
        colInfo: ColRenameInfo[],
        imdCol?: string
    ): XDPromise<string> {
        if (txId == null || srcTableName == null ||
            pubTableName == null) {
            return PromiseHelper.reject("Invalid args in update");
        }
        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            let pubTable: PublishTable = result.tables.find((table: PublishTable) => {
                return (table.name == pubTableName);
            })
            if (pubTable == null) {
                return deferred.reject("Published Table does not exist");
            }

            const primaryKeyList: {name: string, ordering: XcalarOrderingT}[] =
                pubTable.keys.map((primaryKey: XcalarApiColumnInfoT) => {
                    return {name: primaryKey.name,
                        ordering: XcalarOrderingT.XcalarOrderingUnordered};
                });

            const indexTableName: string = xcHelper.randName("publish") + Authentication.getHashId();
            let tableToDelete: string = null;
            assemblePubTable(txId, primaryKeyList, srcTableName, indexTableName, colInfo, imdCol)
            .then((indexTable) => {
                tableToDelete = indexTable;
                // Finally publish the table
                return XcalarUpdateTable(indexTable, pubTableName);
            })
            .then(() => {
                if (tableToDelete !== srcTableName) {
                    XIApi.deleteTable(txId, tableToDelete);
                }
                return deferred.resolve();
            })
            .fail(deferred.reject);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    export function cacheIndexTable(
        tableName: string,
        colNames: string[],
        indexTable: string,
        indexKeys: string[],
        tempCols: string[]
    ): void {
        const colKey = getIndexColKey(colNames);
        indexTableCache[tableName] = indexTableCache[tableName] || {};
        indexTableCache[tableName][colKey] = {
            tableName: indexTable,
            keys: indexKeys,
            tempCols: tempCols
        };
        reverseIndexMap[indexTable] = {
            "tableName": tableName,
            "colName": colKey
        };
    };

    export function getCacheTable() {
        return indexTableCache;
    };

    export function getIndexTable(
        tableName: string,
        colNames: string[]
    ): TableIndexCache {
        if (typeof DagTblManager !== "undefined") {
            DagTblManager.Instance.resetTable(tableName);
        }
        const colKey = getIndexColKey(colNames);
        if (indexTableCache[tableName]) {
            return indexTableCache[tableName][colKey] || null;
        } else {
            return null;
        }
    };

    /**
     * XIAPi.deleteIndexTable
     * @param indexTable
     */
    export function deleteIndexTable(indexTable: string): void {
        if (reverseIndexMap[indexTable]) {
            const tableName = reverseIndexMap[indexTable].tableName;
            const colKey = reverseIndexMap[indexTable].colName;
            delete indexTableCache[tableName][colKey];
            delete reverseIndexMap[indexTable];
        }
    };

    function deleteIndexTableCache(txId: number, tableName: string): XDPromise<void> {
        let cache = indexTableCache[tableName];
        let tables = [];
        if (cache) {
            for (let col in cache) {
                let indexTable = cache[col].tableName;
                console.info("delete", indexTable)
                tables.push(indexTable);
            }
        }
        return XIApi.deleteTableInBulk(txId, tables);
    }

    function cleanUpIndexTable(txId: number, tableName: string): void {
        XIApi.deleteIndexTable(tableName);
        deleteIndexTableCache(txId, tableName);
    }

    export function clearIndexTable(): void {
        indexTableCache = {};
        reverseIndexMap = {};
    }

    /**
     * XIApi.getTableMeta
     * @param tableName
     */
    export function getTableMeta(tableName: string): XDPromise<XcalarApiGetTableMetaOutputT> {
        const deferred: XDDeferred<XcalarApiGetTableMetaOutputT> = PromiseHelper.deferred();
        XcalarGetTableMeta(tableName)
        .then(deferred.resolve)
        .fail((error) => {
            if (error && error.status === StatusT.StatusDsNotFound) {
                error.error = ResultSetTStr.NotFound + ": " + tableName;
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function getIndexColKey(colNames) {
        return colNames.toString();
    }

    function startSimulate(): number {
        const txId: number = Transaction.start({
            operation: "Simulate",
            simulate: true
        });
        return txId;
    }

    function endSimulate(txId: number): string {
        let query: string = Transaction.done(txId, {
            noNotification: true,
            noLog: true,
            noCommit: true
        });
        return query;
    }

    /* Unit Test Only */
    if (typeof window !== "undefined" && window["unitTestMode"]) {
        XIApi["__testOnly__"] = {
            isCorrectTableNameFormat: isCorrectTableNameFormat,
            isValidTableName: isValidTableName,
            isValidAggName: isValidAggName,
            isValidPrefix: isValidPrefix,
            getNewTableName: getNewTableName,
            getNewJoinTableName: getNewJoinTableName,
            convertOp: convertOp,
            parseAggOps: parseAggOps,
            isSameKey: isSameKey,
            getUnusedImmNames: getUnusedImmNames,
            getCastInfo: getCastInfo,
            castColumns: castColumns,
            synthesizeColumns: synthesizeColumns,
            joinCast: joinCast,
            joinIndex: joinIndex,
            resolveJoinColRename: resolveJoinColRename,
            getGroupByAggEvalStr: getGroupByAggEvalStr,
            computeDistinctGroupby: computeDistinctGroupby,
            cascadingJoins: cascadingJoins,
            distinctGroupby: distinctGroupby,
            checkUnionTableInfos: checkUnionTableInfos,
            unionCast: unionCast,
            getUnionConcatMapStr: getUnionConcatMapStr,
            unionAllIndex: unionAllIndex
        }
    }
    /* End Of Unit Test Only */
}

if (typeof exports !== 'undefined') {
    exports.XIApi = XIApi;
}
