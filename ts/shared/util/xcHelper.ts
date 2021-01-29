namespace xcHelper {
    const PREFIX_CONCAT_CHAR = "-";

    export interface FilterOption {
        operator: FltOp;
        filterString: string;
    }

    export interface DSNameInfo {
        user: string;
        randId: string | void;
        dsName: string;
    }

    export interface MapColOption {
        replaceColumn: boolean; // if true, will replace existing col with new one
        resize: boolean; // if true, will adjust column size to colname
        type?: string // if provided, will set column type
    }

    export interface SizeTranslatorOption {
        base2?: boolean;
        base3?: boolean;
        space?: boolean;
    }

    export interface ValidateObj {
        $ele: JQuery;
        check?: Function;
        error?: string;
        quite?: boolean;
        onErr?: Function;
        callback?: Function;
        isAlert?: boolean;
        formMode?: boolean;
        side?: string;
        delay?: number;
        text?: string;
    }

    export interface TableNameInputCheckOptions {
        preventImmediateHide: boolean;
        formMode: boolean;
        onErr: Function;
    }

    /**
     * xcHelper.parseError
     * @param error
     */
    export function parseError(error: object | string): string {
        let errorStr: string;
        try {
            if (!error) {
                errorStr = ErrTStr.Unknown;
            } else if (error instanceof Error) {
                errorStr = error.message;
            } else if (typeof error === 'object') {
                errorStr = JSON.stringify(error);
            } else {
                errorStr = error;
            }
        } catch (e) {
            console.error("parse error message failed", e);
            errorStr = JSON.stringify(error);
        }
        return errorStr;
    }

    /**
     * xcHelper.parseListDSOutput
     * @param datasets
     */
    export function parseListDSOutput(datasets: any[]) {
        let validDatasets: any[] = [];

        datasets.forEach((dataset) => {
            if (!dataset.name.startsWith(".XcalarLRQ.")) {
                dataset.name = xcHelper.stripPrefixFromDSName(dataset.name);
                validDatasets.push(dataset);
            }
        });
        return validDatasets;
    }

    /**
     * xcHelper.stripPrefixFromDSName
     * @param dsName
     */
    export function stripPrefixFromDSName(dsName: string): string {
        const index: number = dsName.indexOf(gDSPrefix);
        if (index >= 0) {
            dsName = dsName.substring(index + gDSPrefix.length);
        }
        return dsName;
    }

    /**
     * xcHelper.parseJsonValue
     * @param value
     * @param fnf
     */
    export function parseJsonValue(
        value: any,
        fnf?: boolean,
        escapeTab?: boolean
    ): string {
        if (fnf) {
            value = '<span class="undefined" data-toggle="tooltip" ' +
                    'data-placement="bottom" ' +
                    'data-container="body" ' +
                    'data-original-title="Field Not Found">FNF' +
                    '</span>';
        } else if (value === null) {
            value = '<span class="null">' + value + '</span>';
        } else if (value === undefined) {
            value = '<span class="blank">' + value + '</span>';
        } else {
            switch (value.constructor) {
                case (Object):
                    if ($.isEmptyObject(value)) {
                        value = "";
                    } else {
                        value = JSON.stringify(value);
                    }
                    break;
                case (Array):
                    value = JSON.stringify(value);
                    break;
                default: // leave value as is;
            }
            // escape < & > so external html doesn't get injected
            if (typeof value === 'string') {
                value = xcStringHelper.escapeHTMLSpecialChar(value, escapeTab);
            }
        }
        return value;
    }

    export function isNodeJs(): boolean {
        return ((typeof process !== 'undefined') &&
                (typeof process.versions !== 'undefined') &&
                (typeof process.versions.node !== 'undefined') &&
                (typeof nw === "undefined"));
    }

    /**
     * xcHelper.parseColType, define type of the column
     * @param val
     * @param oldType
     */
    export function parseColType(
        val: any,
        oldType: ColumnType = ColumnType.undefined
    ): ColumnType {
        let type: ColumnType = oldType;
        if (val != null && oldType !== ColumnType.mixed) {
            // note: "" is empty string
            const valType: string = typeof val;
            type = <ColumnType>valType;
            // get specific type
            if (type === ColumnType.number) {
                // the case when type is float
                if (oldType === ColumnType.float || isFloat(val)) {
                    type = ColumnType.float;
                } else {
                    type = ColumnType.integer;
                }
            } else if (type === ColumnType.object) {
                if (val instanceof Array) {
                    type = ColumnType.array;
                }
            }

            var isAllNum = (valType === ColumnType.number) &&
                           ((oldType === ColumnType.float) ||
                            (oldType === ColumnType.integer));
            if (oldType != null &&
                oldType !== ColumnType.undefined &&
                oldType !== type && !isAllNum)
            {
                type = ColumnType.mixed;
            }
        } else if (val === null &&
                    oldType !== null &&
                    oldType !== ColumnType.undefined) {
            // XXX Bug 11348, if column has null, we treat it as mixed type
            // wait for better typeing system
            type = ColumnType.mixed;
        }

        function isFloat(num) {
            return (num % 1 !== 0);
        }

        return type;
    }

    /**
     * xcHelper.getColRenameInfosFromSchema
     * @param schema
     */
    export function getColRenameInfosFromSchema(schema: ColSchema[]): ColRenameInfo[] {
        const colInfos: ColRenameInfo[] = schema.map((colInfo) => {
            const type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(colInfo.type);
            const name: string = colInfo.name;
            return xcHelper.getJoinRenameMap(name, name, type);
        });
        return colInfos;
    }

    /**
     * xcHelper.getJoinRenameMap
     * @param oldName
     * @param newName
     * @param type
     */
    export function getJoinRenameMap(
        oldName: string,
        newName: string,
        type: DfFieldTypeT = DfFieldTypeT.DfUnknown
    ): ColRenameInfo {
        return {
            "orig": oldName,
            "new": newName,
            "type": type
        };
    }

    /**
     * xcHelper.getFilterOptions
     * @param operator
     * @param colName
     * @param uniqueVals
     * @param isExist
     * @param isNull
     */
    export function getFilterOptions(
        operator: FltOp | null,
        colName: string,
        uniqueVals: object,
        isExist: boolean,
        isNull: boolean
    ): FilterOption | null {
        if (operator == null) {
            return null;
        }

        const colVals: any[] = Object.keys(uniqueVals || {});
        let str: string = "";
        const len: number = colVals.length;

        if (operator === FltOp.Filter) {
            if (len > 0) {
                for (let i = 0; i < len - 1; i++) {
                    str += "or(eq(" + colName + ", " + colVals[i] + "), ";
                }

                str += "eq(" + colName + ", " + colVals[len - 1];
                str += ")".repeat(len);
            }

            if (isExist) {
                if (len > 0) {
                    str = "or(" + str + ", not(exists(" + colName + ")))";
                } else {
                    str = "not(exists(" + colName + "))";
                }
            }
            if (isNull) {
                if (len > 0 || isExist) {
                    str = "or(" + str + ", isNull(" + colName + "))";
                } else {
                    str = "isNull(" + colName + ")";
                }
            }
        } else if (operator === FltOp.Exclude){
            if (len > 0) {
                for (let i = 0; i < len - 1; i++) {
                    str += "and(neq(" + colName + ", " + colVals[i] + "), ";
                }

                str += "neq(" + colName + ", " + colVals[len - 1];
                str += ")".repeat(len);
            }

            if (isExist) {
                if (len > 0) {
                    str = "and(" + str + ", exists(" + colName + "))";
                } else {
                    str = "exists(" + colName + ")";
                }
            }
            if (isNull) {
                if (len > 0 || isExist) {
                    str = "and(" + str + ", not(isNull(" + colName + "))";
                } else {
                    str = "not(isNull(" + colName + "))";
                }
            }
        } else {
            console.error("error case");
            return null;
        }

        return {
            operator: operator,
            filterString: str
        };
    }

    /**
     * xcHelper.getUserPrefix
     */
    export function getUserPrefix(): string {
        return XcUser.getCurrentUserName();
    }

    /**
     * xcHelper.wrapDSName
     * @param dsName
     */
    export function wrapDSName(dsName: string = "",  randId?: string): string {
        let fulldsName: string = xcHelper.getUserPrefix() + ".";
        if (randId) {
            fulldsName += randId;
        } else {
            fulldsName = xcHelper.randName(fulldsName, 5);
        }
        fulldsName += "." + dsName;
        return fulldsName;
    }

    /**
     * xcHelper.parseDSName
     * @param fulldsName
     * given ".XcalarDS.admin.69410.flights" or "admin.69410.flights"
     * splits into user, randId, and dsName
     */
    export function parseDSName(fulldsName: string): DSNameInfo {
        fulldsName = xcHelper.stripPrefixFromDSName(fulldsName);
        const nameSplits: string[] = fulldsName.split(".");
        let user: string;
        let randId: string | void;
        let dsName: string;

        if (nameSplits.length === 1) {
            user = DSTStr.UnknownUser;
            dsName = nameSplits[0];
        } else if (nameSplits.length === 2) {
            user = nameSplits[0];
            randId = DSTStr.UnknownId;
            dsName = nameSplits[1];
        } else {
            randId = nameSplits[nameSplits.length - 2];
            dsName = nameSplits[nameSplits.length - 1];
            user = nameSplits.splice(0, nameSplits.length - 2).join(".");
        }

        return {
            user: user,
            randId: randId,
            dsName: dsName
        };
    }

    /**
     * xcHelper.getPrefixColName
     * @param prefix
     * @param colName
     */
    export function getPrefixColName(
        prefix: string | null,
        colName: string
    ): string {
        if (prefix == null || prefix === "") {
            return colName;
        } else {
            return prefix + gPrefixSign + colName;
        }
    }

    /**
     * xcHelper.parsePrefixColName
     * @param colName
     */
    export function parsePrefixColName(colName: string): PrefixColInfo {
        colName = colName || "";
        const index: number = colName.indexOf(gPrefixSign);
        let prefix: string = "";
        let name: string = colName;
        if (index >= 0) {
            prefix = colName.substring(0, index);
            name = colName.substring(index + gPrefixSign.length);
        }

        return {
            prefix: prefix,
            name: name,
        };
    }

    /**
     * xcHelper.stripPrefixInColName
     * @param colName
     */
    export function stripPrefixInColName(colName: string): string {
        if (colName != null) {
            return colName.split(gPrefixSign).join(PREFIX_CONCAT_CHAR);
        }
    }

    export function convertPrefixName(
        prefix: string,
        name: string
    ): string {
        return prefix + PREFIX_CONCAT_CHAR + name;
    }

    /**
     * xcHelper.normalizePrefix
     * @param prefix
     */
    export function normalizePrefix(prefix: string) {
        if (prefix.length > gPrefixLimit) {
            // if prefix is auto generated by table name and
            // the table name is too long, slice it
            // XXX Possible TODO: machine learning to decide the prefix
            prefix = prefix.substring(0, gPrefixLimit);
        }

        // Strip all random characters from dsName
        prefix = (<string>xcHelper.checkNamePattern(PatternCategory.Dataset,
            PatternAction.Fix, prefix, "_")).replace(/-/g, "_");
        return prefix;
    }

    /**
     * xcHelper.getTableKeyFromMeta
     * @param tableMeta
     */
    export function getTableKeyFromMeta(tableMeta: any) {
        return tableMeta.keyAttr.map((keyAttr) => {
            if (keyAttr.valueArrayIndex < 0) {
                return null;
            }
            return xcHelper.escapeColName(keyAttr.name);
        });
    }

    /**
     * xcHelper.getTableKeyInfoFromMeta
     * @param tableMeta
     */
    export function getTableKeyInfoFromMeta(
        tableMeta: any
    ): {name: string, ordering: string}[] {
        const keys: {name: string, ordering: string}[] = [];
        tableMeta.keyAttr.forEach((keyAttr) => {
            if (keyAttr.valueArrayIndex >= 0) {
                keys.push({
                    name: xcHelper.escapeColName(keyAttr.name),
                    ordering: keyAttr.ordering
                });
            }
        });
        return keys;
    }

    /**
     * xcHelper.deepCopy, get a deep copy
     * @param obj
     */
    export function deepCopy(obj: any): any {
        if (obj == null) {
            return obj;
        }
        const str: string = JSON.stringify(obj);
        let res = null;

        try {
            res = JSON.parse(str);
        } catch (err) {
            console.error(err, str);
        }

        return res;
    }

    function binarySearchEllipsisLen(
        text: string,
        minLen: number,
        desiredWidth: number,
        ctx: CanvasRenderingContext2D,
        ellipsisFunc: Function
    ): number {
        let maxLen: number = text.length;
        while (minLen < maxLen) {
            let midLen: number = Math.floor((maxLen + minLen) / 2);
            const str: string = ellipsisFunc(text, midLen);
            const width: number = ctx.measureText(str).width;

            if (width > desiredWidth) {
                maxLen = midLen - 1;
            } else if (width < desiredWidth) {
                minLen = midLen + 1;
            } else {
                return midLen;
            }
        }

        return minLen;
    }

    function middlellispsisStr(str: string, ellpsisLen: number): string {
        const strLen: number = str.length;
        // if strLen is 22 and ellpsisLen is 21
        // then the finalText may be longer if no this check
        let res: string = str;
        if (strLen <= 3) {
            return res;
        }

        if (ellpsisLen > strLen - 3) {
            ellpsisLen = strLen - 3;
        }
        res = str.slice(0, ellpsisLen - 3) + "..." + str.slice(str.length - 3);
        return res;
    }

    /**
     * xcHelper.middleEllipsis
     * this function is generally looped over many times
     * we pass in ctx (a reference to canvas) so that we don't create a new
     * canvas within the function many times in the loop
     * canvas is used to measure text width
     * @param text
     * @param $ele
     * @param checkLen
     * @param maxWidth
     * @param isMultiLine
     * @param ctx
     */
    export function middleEllipsis(
        text: string | null,
        $ele: JQuery,
        minLen: number,
        maxWidth: number,
        isMultiLine: boolean,
        ctx: CanvasRenderingContext2D
    ): boolean {
        // keep this because if pass in null, should change to string "null"
        // (since text is come from $el.data(), text might be null)
        const textInStr: string = String(text);
        const textWidth: number = ctx.measureText(textInStr).width;
        let finalText: string;
        let ellipsis: boolean = false;

        if (isMultiLine) {
            maxWidth *= 2;
        }
        if (textWidth < maxWidth) {
            finalText = textInStr;
        } else {
            const len: number = binarySearchEllipsisLen(textInStr,
                minLen, maxWidth, ctx, middlellispsisStr);
            finalText = middlellispsisStr(textInStr, len);
            ellipsis = true;
        }

        if ($ele.is("input")) {
            $ele.val(finalText);
        } else {
            $ele.text(finalText);
        }
        return ellipsis;
    }

    function leftEllipsisStr(str: string, ellpsisLen: number): string {
        const strLen: number = str.length;
        // if strLen is 22 and ellpsisLen is 21
        // then the finalText may be longer if no this check
        if (strLen - 3 > 0 && ellpsisLen > strLen - 3) {
            ellpsisLen = strLen - 3;
        }
        return ("..." + str.slice(strLen - ellpsisLen));
    }

    /**
     * xcHelper.leftEllipsis
     * @param text
     * @param $ele
     * @param maxWidth
     * @param ctx
     */
    export function leftEllipsis(
        text: string | null,
        $ele: JQuery,
        maxWidth: number,
        ctx: CanvasRenderingContext2D
    ): boolean {
        // keep this because if pass in null, should change to string "null"
        // (since text is come from $el.data(), text might be null)
        const textInStr: string = String(text);
        const textWidth: number = ctx.measureText(textInStr).width;
        let finalText: string;
        let ellipsis: boolean = false;

        if (textWidth < maxWidth) {
            finalText = textInStr;
        } else {
            const len: number = binarySearchEllipsisLen(textInStr, 3, maxWidth,
                ctx, leftEllipsisStr);
            finalText = leftEllipsisStr(textInStr, len);
            ellipsis = true;
        }

        if ($ele.is("input")) {
            $ele.val(finalText);
        } else {
            $ele.text(finalText);
        }

        return ellipsis;
    }

    /**
     * xcHelper.getMaxTextLen
     * @param ctx
     * @param text
     * @param desiredWidth
     * @param minLen
     * @param maxLen
     */
    export function getMaxTextLen(
        ctx: CanvasRenderingContext2D,
        text: string,
        desiredWidth: number,
        minLen: number,
        maxLen: number
    ): number {
        if (maxLen - minLen <= 1) {
            return minLen;
        }
        const midPoint: number = Math.floor((maxLen + minLen) / 2);
        const modText: string = text.slice(0, midPoint);
        const width: number = ctx.measureText(modText).width;
        if (width > desiredWidth) {
            return xcHelper.getMaxTextLen(ctx, text, desiredWidth,
                minLen, midPoint);
        } else if (width < desiredWidth) {
            return xcHelper.getMaxTextLen(ctx, text, desiredWidth,
                midPoint, maxLen);
        } else {
            return midPoint;
        }
    }

    /**
     * xcHelper.mapColGenerate
     * @param colNum
     * @param colName
     * @param mapStr
     * @param tableCols
     * @param options
     */
    export function mapColGenerate(
        colNum: number,
        colName: string,
        mapStr: string,
        tableCols: any[],
        options: MapColOption = <MapColOption>{}
    ): ProgCol[] {
        const copiedCols: any[] = xcHelper.deepCopy(tableCols);
        let sizedTo: string;

        if (colNum > 0) {
            let cellWidth: number;
            if (options.replaceColumn) {
                if (options.resize) {
                    cellWidth = xcHelper.getDefaultColWidth(colName);
                } else {
                    cellWidth = copiedCols[colNum - 1].width;
                }
                sizedTo = copiedCols[colNum - 1].sizedTo;
            } else {
                cellWidth = xcHelper.getDefaultColWidth(colName);
                sizedTo = "header";
            }

            const newProgCol: any = ColManager.newCol({
                backName: colName,
                name: colName,
                width: cellWidth,
                userStr: '"' + colName + '" = map(' + mapStr + ')',
                isNewCol: false,
                sizedTo: sizedTo
            });

            if (options.type) {
                newProgCol.type = options.type;
            }

            if (options.replaceColumn) {
                copiedCols.splice(colNum - 1, 1, newProgCol);
            } else {
                copiedCols.splice(colNum - 1, 0, newProgCol);
            }
            newProgCol.parseFunc();
        }

        return copiedCols;
    }

    /**
     * xcHelper.getDefaultColWidth
     * @param colName
     * @param prefix
     */
    export function getDefaultColWidth(
        colName: string,
        prefix?: string
    ): number {
        let prefixText: string = prefix;
        if (prefixText === "" || prefixText == null) {
            prefixText = CommonTxtTstr.Immediates;
        }

        const width: number = xcUIHelper.getTextWidth(null, colName);
        const prefixW: number = xcUIHelper.getTextWidth(null, prefixText);
        return Math.max(width, prefixW);
    }

    function padZero(num: number, numDigits: number): string {
        const numInStr: string = num.toString();
        return (numInStr.length < numDigits) ?
            new Array(numDigits - numInStr.length + 1).join('0') + numInStr :
            numInStr;
    }

    // xcHelper.randName, default digits is 5
    /**
     * xcHelper.randName
     * @param name
     * @param digits
     */
    export function randName(name: string, digits: number = 5): string {
        const max: number = Math.pow(10, digits);
        let rand: number = Math.floor(Math.random() * max);

        if (rand === 0) {
            rand = 1;
        }

        const randAffix = padZero(rand, digits);
        return (name + randAffix);
    }

    /**
     * xcHelper.uniqueName
     * @param name
     * @param validFunc
     * @param nameGenFunc
     * @param maxTry
     */
    export function uniqueName(
        name: string,
        validFunc: Function,
        nameGenFunc: Function | null,
        maxTry: number = 10
    ): string {
        let validName: string = name;
        if (!(validFunc instanceof Function)) {
            return validName;
        }

        if (!(nameGenFunc instanceof Function)) {
            nameGenFunc = function(cnt) {
                // start from 1
                return name + '_' + cnt;
            };
        }

        let tryCnt: number = 0;
        while (!validFunc(validName) && tryCnt < maxTry) {
            // should be low chance that still has name conflict
            tryCnt++;
            validName = nameGenFunc(tryCnt);
        }

        if (tryCnt === maxTry) {
            console.error('Too much try, name Conflict!');
            return xcHelper.randName(name); // a hack result
        } else {
            return validName;
        }
    }

    // xcHelper.autoName
    export function autoName(
        origName: string,
        checkMap: object,
        maxTry?: number,
        delim?: string
    ): string {
        let validName: string = origName;
        let tryCnt = 0;
        if (maxTry == null) {
            maxTry = 20;
        }
        delim = delim || "";

        while (checkMap.hasOwnProperty(validName) && tryCnt <= maxTry) {
            tryCnt++;
            validName = origName + delim + tryCnt;
        }

        if (tryCnt > maxTry) {
            validName = xcHelper.randName(origName);
        }
        return validName;
    }

     /**
     * xcHelper.getUniqColName
     * get unique column name
     * @param tableId
     * @param colName
     * @param onlyCheckPulledCol
     * @param takenNames - an object of unavailable column names that aren't in
     * the current table but will be part of a descendant table
     * @param colNumToIgnore
     */
    export function getUniqColName(
        tableId: TableId,
        colName: string | null,
        onlyCheckPulledCol: boolean = false,
        takenNames: object = {},
        colNumToIgnore?: number[]
    ): string {
        if (colName == null) {
            return xcHelper.randName('NewCol');
        }

        const parseName: PrefixColInfo = xcHelper.parsePrefixColName(colName);
        colName = parseName.name;

        const table = gTables[tableId];
        if (table == null) {
            console.error('table not has meta, cannot check');
            return colName;
        }

        if (!takenNames.hasOwnProperty(colName)) {
            if (!table.hasCol(colName, parseName.prefix, onlyCheckPulledCol)) {
                return colName;
            } else if (colNumToIgnore != null &&
                       table.getColNumByBackName(colName) === colNumToIgnore
            ) {
                return colName;
            }
        }

        const validFunc = function(newColName) {
            return !table.hasCol(newColName, parseName.prefix) &&
                   !takenNames.hasOwnProperty(newColName)
        }

        return xcHelper.uniqueName(colName, validFunc, null, 50);
    }

    /**
     * xcHelper.uniqueRandName, used in testsuite
     * @param name
     * @param validFunc
     * @param maxTry
     */
    export function uniqueRandName(
        name: string,
        validFunc: Function,
        maxTry: number
    ): string {
        const initialName: string = xcHelper.randName(name);
        const nameGenFunc: Function = () => xcHelper.randName(name);
        return xcHelper.uniqueName(initialName, validFunc, nameGenFunc, maxTry);
    }

    /**
     * xcHelper.arraySubset
     * @param subset
     * @param fullset
     */
    export function arraySubset(subset: any[], fullset: any[]): boolean {
        for (let i = 0; i < subset.length; i++) {
            if (fullset.indexOf(subset[i]) === -1) {
                return false;
            }
        }
        return true;
    }

    /**
     * xcHelper.arrayUnion,
     * returns a new array that is the deduped union of the 2 arrays
     * @param array1
     * @param array2
     */
    export function arrayUnion(array1: any[], array2: any[]): any[] {
        const unioned: any[] = [];
        for (let i = 0; i < array1.length; i++) {
            if (unioned.indexOf(array1[i]) === -1) {
                unioned.push(array1[i]);
            }
        }
        for (let i = 0; i < array2.length; i++) {
            if (unioned.indexOf(array2[i]) === -1) {
                unioned.push(array2[i]);
            }
        }
        return unioned;
    }

    /**
     * xcHelper.getAppUrl
     */
    export function getAppUrl() {
        var url;
        if (window['expHost'] !==  undefined) {
            // this is for dev environment if you set it in config.js
            url = window['expHost'];
        } else {
            url = hostname + "/app";
        }
        return url;
    }

    export function getApiUrl() {
        let url = xcHelper.getAppUrl();
        if (!url.endsWith('/app')) {
            url += '/app';
        }
        url += '/service/xce';
        return url;
    }

    /**
     * xcHelper.downloadAsFile
     * @param fileName
     * @param fileContents
     * @param isRaw
     */
    export function downloadAsFile(
        fileName: string,
        fileContents: string,
        type?: string
    ): void {
        let blob: Blob;
        if (type) {
            let len = fileContents.length;
            let buffer = new ArrayBuffer(len);
            let view = new Uint8Array(buffer);
            for (var i = 0; i < len; i++) {
                view[i] = fileContents.charCodeAt(i);
            }
            blob = new Blob([view], { type: type});
        } else {
            blob = new Blob([fileContents], {type: "data:text/plain;charset=utf-8"});
        }
        window["saveAs"](blob, fileName);
    }

    /**
     * xcHelper.sizeTranslator
     * returns size as string -> "0.55KB" or ["0.55", "KB"]
     * @param size
     * @param unitSeparated {boolean}, true if want return an array of
     *                                 [string size, string unit]
     * @param convertTo
     * @param options
     */
    export function sizeTranslator(
        size: number | null,
        unitSeparated: boolean = false,
        convertTo?: string,
        options: SizeTranslatorOption = <SizeTranslatorOption>{}
    ): string | any[] {
        if (size == null) {
            return null;
        }
        let unit: string[];
        if (options.base2) {
            unit = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
        } else if (options.base3) {
            size *= 8;
            unit = ['B', 'Kib', 'Mib', 'Gib', 'Tib', 'Pib'];
        } else {
            unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        }

        let start: number = 0;
        const end: number = unit.length - 1;

        if (convertTo && unit.indexOf(convertTo) > -1) {
            start = unit.indexOf(convertTo);
            size *= (1 / Math.pow(1024, start));
        } else {
            while (size >= 1024 && start < end) {
                size = (size / 1024);
                ++start;
            }
        }

        let sizeString: string = size + "";
        if (start === 0 || size >= 1000) {
            sizeString = parseInt(sizeString) + ""; // to string
        } else {
            sizeString = parseFloat(sizeString).toPrecision(3);
        }

        if (unitSeparated) {
            return ([sizeString, unit[start]]);
        } else {
            const space = options.space ? ' ' : '';
            return (sizeString + space + unit[start]);
        }
    }

    /**
     * xcHelper.textToBytesTranslator
     * accepts parameters in the form of "23GB" or "56.2 mb"
     * and converts them to bytes
     * @param numText
     * @param options
     */
    export function textToBytesTranslator(
        numText: string,
        options: SizeTranslatorOption = <SizeTranslatorOption>{}
    ): number {
        if (!numText) {
            return 0;
        }
        let units: string[];
        let num: number = parseFloat(numText);
        if (options.base2) {
            units = ['B', 'KIB', 'MIB', 'GIB', 'TIB', 'PIB'];
        } else if (options.base3) {
            num /= 8;
            units = ['B', 'Kib', 'Mib', 'Gib', 'Tib', 'Pib'];
        } else {
            units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        }
        let text: string = numText.match(/[a-zA-Z]+/)[0];
        if (!options.base3) {
            text = text.toUpperCase();
        }
        const index: number = units.indexOf(text);
        const bytes: number = Math.round(num * Math.pow(1024, index));
        return bytes;
    }


     /**
     * xcHelper.convertFieldTypeToColType
     * @param type
     */
    export function convertFieldTypeToColType(type: DfFieldTypeT): ColumnType {
        switch (type) {
            case DfFieldTypeT.DfUnknown:
                return ColumnType.unknown;
            case (DfFieldTypeT.DfInt32):
            case (DfFieldTypeT.DfInt64):
            case (DfFieldTypeT.DfUInt32):
            case (DfFieldTypeT.DfUInt64):
                return ColumnType.integer;
            case (DfFieldTypeT.DfFloat32):
            case (DfFieldTypeT.DfFloat64):
                return ColumnType.float;
            case (DfFieldTypeT.DfString):
                return ColumnType.string;
            case (DfFieldTypeT.DfBoolean):
                return ColumnType.boolean;
            case (DfFieldTypeT.DfTimespec):
                return ColumnType.timestamp;
            case (DfFieldTypeT.DfMoney):
                return ColumnType.money;
            case DfFieldTypeT.DfMixed:
            case DfFieldTypeT.DfScalarObj: // also recoganize it as mixed
                return ColumnType.mixed;
            case DfFieldTypeT.DfArray:
                return ColumnType.array;
            case DfFieldTypeT.DfObject:
                return ColumnType.object;
            case DfFieldTypeT.DfFatptr:
                return null;
            case DfFieldTypeT.DfNull:
                return null;
            default:
                // should not go here
                console.error("error type conversion");
                return null;
        }
    }

    /**
     * xcHelper.convertColTypeToFieldType
     * @param colType
     */
    export function convertColTypeToFieldType(
        colType: ColumnType
    ): DfFieldTypeT {
        switch (colType) {
            case ColumnType.string:
                return DfFieldTypeT.DfString;
            case ColumnType.integer:
                return DfFieldTypeT.DfInt64;
            case ColumnType.float:
                return DfFieldTypeT.DfFloat64;
            case ColumnType.boolean:
                return DfFieldTypeT.DfBoolean;
            case ColumnType.timestamp:
                return DfFieldTypeT.DfTimespec;
            case ColumnType.money:
                return DfFieldTypeT.DfMoney;
            default:
                return DfFieldTypeT.DfUnknown;
        }
    }

     /**
     * xcHelper.getDFFieldTypeToString
     * @param type
     */
    export function getDFFieldTypeToString(type: DfFieldTypeT): ColumnType {
        switch (type) {
            case (DfFieldTypeT.DfInt32):
            case (DfFieldTypeT.DfInt64):
            case (DfFieldTypeT.DfUInt32):
            case (DfFieldTypeT.DfUInt64):
                return ColumnType.integer;
            case (DfFieldTypeT.DfFloat32):
            case (DfFieldTypeT.DfFloat64):
                return ColumnType.float;
            case (DfFieldTypeT.DfString):
                return ColumnType.string;
            case (DfFieldTypeT.DfBoolean):
                return ColumnType.boolean;
            case (DfFieldTypeT.DfTimespec):
                return ColumnType.timestamp;
            case (DfFieldTypeTFromStr.DfMoney):
                return ColumnType.money;
            default:
                // DfScalarObj will be mixed
                return ColumnType.mixed;
        }
    }

     /**
     * xcHelper.convertSQLTypeToColType
     * It's very close to xcHelper.getCastTypeToColType
     * Maybe we need to combine them
     * @param type
     */
    export function convertSQLTypeToColType(type: string): ColumnType {
        switch(type) {
            case "int":
                return ColumnType.integer;
            case "bool":
                return ColumnType.boolean;
            case "float":
                return ColumnType.float;
            case "timestamp":
                return ColumnType.timestamp;
            case "string":
                return ColumnType.string;
            case "numeric":
            case "money":
                return ColumnType.money;
            default:
                return ColumnType.unknown;
        }
    }

    /**
    * xcHelper.convertColumnTypeToSQLType
    * It's the reverse of xcHelper.convertSQLTypeToColType
    * @param type
    */
   export function convertColTypeToSQLType(type: ColumnType): SQLColumnType {
       switch(type) {
           case ColumnType.integer:
               return SQLColumnType.Integer;
           case ColumnType.boolean:
               return SQLColumnType.Boolean;
           case ColumnType.float:
               return SQLColumnType.Float;
           case ColumnType.timestamp:
               return SQLColumnType.Timestamp;
           case ColumnType.string:
               return SQLColumnType.String;
           case ColumnType.money:
               return SQLColumnType.Money;
           default:
               xcAssert(false, SQLErrTStr.InvalidColTypeForFinalize + type);
       }
   }

    /**
     * xcHelper.validate
     * @param eles
     */
    export function validate(eles: ValidateObj[] | ValidateObj): boolean {
        /*
            returns false if fails validation
         * eles is an object or an array of object, each object includes:

           $ele: jquery element to check
           check: function to check validation, if empty, will check if the
                  value of selector is empty. Val of the $ele will be
                  passed into the function
           error: error to show if the check is failed
           quite: if set true, will not show any warning box.
           onErr: if not null, will call it before showing the StatusBox
           callback: if not null, will call it after check fails
           isAlert: if set true, will show Alert Modal, default is StatusBox
           formMode: if set true, will use StatusBox's form mode
           side: string, side to show the pop up
           delay: delay to show the status box
           ...: to be extended in the future.

         * Check will run in array's order.
         */

        if (!(eles instanceof Array)) {
            eles = [eles];
        }

        for (let i = 0; i < eles.length; i++) {
            const ele: ValidateObj = eles[i];
            const $e: JQuery = ele.$ele;
            const val: string = $e.is("input") ? $e.val() : $e.text();
            let error: string;
            let notValid: boolean;

            if (typeof ele.check === 'function') {
                notValid = ele.check(val);
                error = ele.error || ErrTStr.InvalidField;
            } else {
                notValid = (val.trim() === "");
                error = ele.error || ErrTStr.NoEmpty;
            }

            if (notValid) {
                if (ele.quite) {
                    return false;
                }
                let options: StatusBox.StatusDisplayerOpions = <StatusBox.StatusDisplayerOpions>{};
                if (ele.side) {
                    options.side = ele.side;
                }

                // before error
                if (typeof ele.onErr === 'function') {
                    ele.onErr();
                }

                // show error
                if (ele.isAlert) {
                    Alert.error(ErrTStr.InvalidField, error);
                } else {
                    if (ele.delay != null) {
                        setTimeout(() => {
                            StatusBox.show(error, $e, ele.formMode, options);
                        }, 300);
                    } else {
                        StatusBox.show(error, $e, ele.formMode, options);
                    }
                }

                // callback
                if (typeof ele.callback === 'function') {
                    ele.callback();
                }

                return false;
            }
        }

        return true;
    }

    /**
     * xcHelper.tableNameInputChecker
     */
    export function tableNameInputChecker(
        $input: JQuery,
        options: TableNameInputCheckOptions = <TableNameInputCheckOptions>{}
    ): boolean {
        options = $.extend({
            preventImmediateHide: true,
            formMode: true
        }, options);

        let error: string;
        const newTableName: string = $input.val().trim();

        if (newTableName === "") {
            error = ErrTStr.NoEmpty;
        } else if (!xcHelper.checkNamePattern(PatternCategory.PTbl, PatternAction.Check, newTableName)) {
            error = ErrTStr.InvalidPublishedTableName;
        } else if (newTableName.length >=
            XcalarApisConstantsT.XcalarApiMaxTableNameLen) {
            error = ErrTStr.TooLong;
        }

        if (error != null) {
            const formMode: boolean = options.formMode || false;
            if (typeof options.onErr === 'function') {
                options.onErr();
            }
            StatusBox.show(error, $input, formMode, options);
            return false;
        } else {
            return true;
        }
    }

    // xcHelper.getTableName, get out tableName from tableName + hashId
    export function getTableName(wholeName: string): string {
        if (!wholeName) return "";
        const hashIndex: number = wholeName.lastIndexOf('#');
        let tableName: string;
        if (hashIndex > -1) {
            tableName = wholeName.substring(0, hashIndex);
        } else {
            tableName = wholeName;
        }
        return tableName;
    }

    export function genTableNameFromNode(node: DagNode): string {
        try {

            let names: string[] = [];
            node.getParents().forEach((parentNode) => {
                let parentTable = parentNode.getTable();
                if (!parentTable) {
                    return;
                } else {
                    parentTable = xcHelper.stripGlobalTableName(parentTable);
                    names.push(xcHelper.getTableName(parentTable));
                }
            });
            let name = names.join("_") || "table";
            let shortenedName = name.slice(- (XcalarApisConstantsT.XcalarApiMaxFileNameLen - 80));
            // max 175 characters to make space for prefixes/suffixes
            if (shortenedName !== name && !shortenedName[0].match(/[a-zA-Z]/)) {
                shortenedName = "t" + shortenedName;
                // prefix with valid char "t" in case starts with invalid char
            }
            return shortenedName;
        } catch (e) {
            console.error("generate table name from node error", e);
            return "table";
        }
    }

    /**
     * xcHelper.getTableId
     * expects 'schedule#AB12' and retuns 'AB12'
     * @param wholeName
     */
    export function getTableId(wholeName: string): number | string | null {
        if (wholeName == null) {
            return null;
        }
        if (isGlobalTable(wholeName)) {
            return 't' + jQuery.md5(wholeName);
        } else {
            // get out hashId from tableName + hashId
            const hashIndex: number = wholeName.lastIndexOf('#');
            if (hashIndex > -1) {
                let id = wholeName.substring(hashIndex + 1);
                if (isNaN(Number(id)) || parseInt(id).toString() !== id) {
                    return id;
                } else {
                    return parseInt(id);
                }
            } else {
                return 't' + jQuery.md5(wholeName);
            }
        }
    }

    /**
     * xcHelper.isGlobalTable
     * @param tableName
     */
    export function isGlobalTable(tableName: string): boolean {
        if (!tableName) {
            return false;
        }
        // Global table with name pattern '/tableName/{sessionId}/{sessionTableName}
        return tableName.match(/^\/[a-zA-Z]+\//) != null;
    }

    export function stripGlobalTableName(tableName: string): string {
        if (tableName.startsWith("/tableName/")) {
            tableName = tableName.slice(11);
            let slashIndex = tableName.indexOf("/");
            if (slashIndex > -1) {
                tableName = tableName.slice(slashIndex + 1);
            }
        }
        return tableName;
    }

    /**
     * xcHelper.createNextName
     * @param str
     * @param delimiter
     */
    export function createNextName(str: string, delimiter: string): string {
        const parts: string[] = str.split(delimiter);
        const lastIndex: number = parts.length - 1;
        const rets: RegExpExecArray = /([0-9])+/.exec(parts[lastIndex]);
        if (rets && rets.index === 0 &&
            rets[0].length === parts[lastIndex].length
        ) {
            parts[lastIndex] = parseInt(parts[lastIndex]) + 1 + "";
            return parts.join(delimiter);
        } else {
            return str + delimiter + "1";
        }
    }

    /**
     * xcHelper.createNextColumnName
     * Create a column name that is not in allNames and is not str
     * @param allNames
     * @param str
     * @param tableId
     */
    export function createNextColumnName(
        allNames: string[],
        str: string,
        tableId: string
    ): string {
        const delimiter: string = '_';
        const parts: string[] = str.split(delimiter);
        let candidate: string;
        allNames.push(str);
        if (parts.length === 1) {
            candidate = parts[0];
        } else {
            // Check out whether the suffix is another tableId
            const lastPart: string = parts[parts.length - 1];
            if (/^[a-zA-Z]{2}[0-9]+$/.test(lastPart)) {
                if (parts.length > 2 &&
                    jQuery.isNumeric(parseFloat(parts[parts.length - 2])))
                {
                    parts.splice(parts.length - 2, 2);
                } else {
                    parts.splice(parts.length - 1, 1);
                }
                candidate = parts.join(delimiter);
            } else {
                candidate = str;
            }
        }
        const newName: string = candidate + delimiter + tableId;
        if (allNames.indexOf(newName) === -1) {
            return newName;
        } else {
            // filter allnames by the ones that end with delimiter + tableId
            // figure out what is the largest number
            // add 1 to it
            // if there is no largest number, then it's set to 1
            const collisions: string[] = allNames.filter((val) => {
                return (val.startsWith(candidate + delimiter) &&
                        val.endsWith(tableId));
            });
            let largestNumber: number = 0;
            for (let i = 0; i < collisions.length; i++) {
                const firstPart: string = collisions[i].substring(0,
                                        collisions[i].lastIndexOf(delimiter));
                const numberIndex: number = firstPart.lastIndexOf(delimiter);
                if (numberIndex === -1) {
                    continue;
                }
                const numberPart: string = firstPart.substring(numberIndex + 1);
                if (jQuery.isNumeric(parseFloat(numberPart))) {
                    if (parseFloat(numberPart) > largestNumber) {
                        largestNumber = parseFloat(numberPart);
                    }
                }
            }
            return candidate + delimiter + (largestNumber + 1) +
                    delimiter + tableId;
        }
    }

    /**
     * xcHelper.checkParserNamePattern
     * @param category
     * @param name
     */
    export function checkParserNamePattern(
        category: ParserPatternCategory,
        name: string
    ): string | boolean {
        if (!name || name.trim().length === 0) {
            return "Empty name found!";
        }
        const preservedNames: string[] = ['none', 'false', 'true'];
        let startCharPattern: RegExp;
        let lengthLimit: Number;
        let namePattern: RegExp;
        let antiNamePattern: RegExp;
        let startError: string;
        let lengthError: string;
        let patternError: string;
        switch (category) {
            case ParserPatternCategory.UDFModule:
                // UDF modules and function names allow <> for parameterization
                startCharPattern = /[a-z_<]/;
                lengthLimit = 1023;
                namePattern = /^[a-zA-Z0-9_<>-]*$/;
                break;
            case ParserPatternCategory.UDFFn:
                startCharPattern = /[a-zA-Z_<]/;
                lengthLimit = 1023;
                namePattern = /^[a-zA-Z0-9_<>]*$/;
                break;
            case ParserPatternCategory.TablePrefix:
                startCharPattern = /[a-zA-Z]/;
                startError = ErrTStr.PrefixStartsWithLetter;
                lengthLimit = gPrefixLimit;
                lengthError = ErrTStr.PrefixTooLong;
                namePattern = /^[a-zA-Z0-9_-]*$/;
                patternError = ColTStr.PrefixInValid;
                if (name.includes("--")) {
                    return ErrTStr.PrefixNoDoubleHyphen;
                }
                break;
            case ParserPatternCategory.ColumnName:
                startCharPattern = /[a-zA-Z_<]/;
                startError = ColTStr.RenameStartInvalid;
                lengthLimit = XcalarApisConstantsT.XcalarApiMaxFieldNameLen;
                lengthError = ColTStr.LongName;
                namePattern = /^((?![()\[\]\.{}^,"':]).|\\.)*((?![()\[\]\.{}^,"': ]).|\\.)$/;
                patternError = 'Invalid name. Ensure name does not contain the following characters: ^\',":()[]{}\\';
                if (name === 'DATA' || preservedNames.indexOf(name.toLowerCase()) > -1) {
                    return ErrTStr.PreservedName;
                }
                break;
            case ParserPatternCategory.ColumnProperty:
                startCharPattern = /[a-zA-Z_<]/;
                startError = ColTStr.RenameStartInvalid;
                lengthLimit = XcalarApisConstantsT.XcalarApiMaxFieldNameLen;
                lengthError = ColTStr.LongName;
                antiNamePattern = /^ | $|[\^,\(\)\[\]{}'"]|::|(?!\\\.)(.\.)/;
                patternError = ColTStr.ColNameInvalidCharSpace;
                if (name === 'DATA' || preservedNames.indexOf(name.toLowerCase()) > -1) {
                    return ErrTStr.PreservedName;
                }
                break;
            case ParserPatternCategory.AggValue:
                startCharPattern = /[a-zA-Z]/;
                lengthLimit = XcalarApisConstantsT.XcalarApiMaxTableNameLen;
                antiNamePattern = /[^a-zA-Z$\d\_\-]/;
                break;
            default:
                throw "Unsupported pattern in parser name check!";
        }
        if (startCharPattern && !startCharPattern.test(name[0])) {
            return startError || true;
        } else if (lengthLimit && name.length > lengthLimit) {
            return lengthError || true;
        } else if (namePattern && !namePattern.test(name)) {
            return patternError || true;
        } else if (antiNamePattern && antiNamePattern.test(name)) {
            return patternError || true;
        }
        return false;
    }

    /**
     * xcHelper.checkNamePattern
     * @param catrgory - which pattern to follow
     * @param action - Enum in PatternAction
     * fix: if you want to return the string that is the legal version
     * check: true/false as to whether pattern is legal
     * get: returns pattern string
     * @param name - value of string OPTIONAL
     * @param replace - if action is fix, then replace is the character to replace with
     */
    export function checkNamePattern(
        category: PatternCategory,
        action: PatternAction,
        name?: string,
        replace: string = ""
    ): string | boolean | RegExp {
        let namePattern: RegExp;
        let antiNamePattern: RegExp;
        switch (category) {
            case PatternCategory.Dataset:
                antiNamePattern = /[^a-zA-Z0-9_-]/;
                break;
            case PatternCategory.Dataflow:
                antiNamePattern = /[^a-zA-Z0-9\(\)\s:_-]/;
                break;
            case PatternCategory.SQLIdentifier:
                antiNamePattern = /[^a-zA-Z0-9_]/;
            case PatternCategory.SQLFunc:
                antiNamePattern = /[^a-zA-Z0-9_-]/;
                break;
            case PatternCategory.Export:
                antiNamePattern = /[^/a-zA-Z0-9_-]/;
                break;
            case PatternCategory.Folder:
                antiNamePattern = /[^a-zA-Z0-9\(\)\s:_-]/;
                break;
            case PatternCategory.Param:
                namePattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
                antiNamePattern = /[^a-zA-Z0-9_]/;
                break;
            case PatternCategory.Prefix:
                namePattern = /^[a-zA-Z0-9_-]{1,31}$/;
                break;
            case PatternCategory.UDF:
                namePattern = /^[a-z_][a-zA-Z0-9_]*$/;
                break;
            case PatternCategory.UDFFn:
                namePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
                break;
            case PatternCategory.UDFFnParam:
                namePattern = /^[a-z_<][a-zA-Z0-9_<>]*$/;
                break;
            case PatternCategory.UDFFileName:
                namePattern = /^.*\.py$/;
                break;
            case PatternCategory.UDFParam:
                namePattern = /^[a-z_<][a-zA-Z0-9_<>-]*$/;
                break;
            case PatternCategory.Workbook:
            case PatternCategory.Target:
                namePattern = /^[a-zA-Z][a-zA-Z0-9\s_-]*$/;
                break;
            case PatternCategory.WorkbookFix:
            case PatternCategory.SQLSnippet:
                antiNamePattern = /[^a-zA-Z\d\_\- ]/;
                break;
            case PatternCategory.PTbl:
                namePattern = /^[A-Z][A-Z0-9_]*$/;
                break;
            case PatternCategory.PTblFix:
                antiNamePattern = /[^A-Z0-9_]/;
                break;
            default:
                namePattern = /^[a-zA-Z0-9_-]+$/;
                antiNamePattern = /[^a-zA-Z0-9_-]/;
                break;
        }

        switch (action) {
            case PatternAction.Fix:
                return name.split(antiNamePattern).join(replace);
            case "check":
                if (antiNamePattern) {
                    return !(antiNamePattern.test(name));
                } else {
                    return namePattern.test(name);
                }
            case "get":
                return namePattern;
            default:
                throw "Unsupported action!";
        }
    }

    /**
     * xcHelper.isValidTableName
     * @param str
     */
    export function isValidTableName(str: string, allowDollar?: boolean): boolean {
        if (str == null || str === "") {
            return false;
        }

        // has to start with alpha character
        if (!xcStringHelper.isStartWithLetter(str)) {
            return false;
        }

        // cannot have any characters other than alphanumeric
        // or _ -
        if (allowDollar) {
            return !/[^a-zA-Z\d\_\-\$]/.test(str);
        } else {
            return !/[^a-zA-Z\d\_\-]/.test(str);
        }
    }

    /**
     * xcHelper.hasInvalidCharInCol
     * @param str
     * @param noSpace
     * @param noDoubleColon true: "::" is invalid, ":" is valid; false: "::" is valid, ":" is invalid
     */
    export function hasInvalidCharInCol(
        str: string,
        noSpace: boolean,
        noDoubleColon: boolean = false
    ): boolean {
        const rules = {
            '00': /^ | $|[\^,\(\)\[\]{}'"\.\\]|:/, // space: valid; single colon: invalid; double colon: valid
            '10': /^ | $|[\^,\(\)\[\]{}'"\.\\ ]|:/, // space: invalid; single colon: invalid; double colon: valid
            '01': /^ | $|[\^,\(\)\[\]{}'"\.\\]|::/, // space: valid; single colon: valid; double colon: invalid
            '11': /^ | $|[\^,\(\)\[\]{}'"\.\\ ]|::/, // space: invalid; single colon: valid; double colon: invalid
        }
        const ruleKey = `${noSpace? '1': '0'}${noDoubleColon? '1': '0'}`;
        return rules[ruleKey].test(str);
    }

    export function cleanseSQLColName(colName) {
        return stripColName(colName, true, true).replace(/:/g, "_");
    }
    /**
     * xcHelper.validateBackendColName
     * @param str
     */
    export function validateBackendColName(
        colName: string,
        acceptParam: boolean = false
    ): string | null {
        if (!colName || colName.trim().length === 0) {
            return ErrTStr.NoEmpty;
        }

        let error: string | null = null;
        if (!xcHelper.isColNameStartValid(colName, acceptParam)) {
            error = ColTStr.RenameStartInvalid;
        } else if (colName.length >
                    XcalarApisConstantsT.XcalarApiMaxFieldNameLen
        ) {
            error = ColTStr.LongName;
        } else if (colName.length > 1 && !/^((?![()\[\]{}^,"'\\:]).)*((?![()\[\]{}^,"'\\: ]).)$/.test(colName.substring(1))) {
            error = 'Invalid name. Ensure name does not contain the following characters: ^\',":()[]{}\\';
        } else {
            const preservedNames: string[] = ['none', 'false', 'true'];
            if (colName === 'DATA' ||
                preservedNames.indexOf(colName.toLowerCase()) > -1) {
                error = ErrTStr.PreservedName;
            }
        }
        return error;
    }

    /**
     * xcHelper.isColNameStartValid
     * @param colName
     */
    export function isColNameStartValid(
        colName: string,
        allowParam: boolean = false
    ): boolean {
        if (!colName || colName.trim().length === 0) {
            return false;
        }
        return (xcStringHelper.isStartWithLetter(colName) ||
            colName.startsWith("_") || (allowParam && colName.startsWith("<")));
    }

    /**
     * Construct the Workbook UDF path prefix string
     * @param userName
     * @param sessionId
     */
    export function constructUDFWBPrefix(userName: string, sessionId: string): string {
        return `/workbook/${userName}/${sessionId}/udf/`;
    }

    /**
     * Construct the Shared UDF path prefix string
     */
    export function constructUDFSharedPrefix(): string {
        return '/sharedUDFs/';
    }

    /**
     * xcHelper.isLoadUDF
     * @param udfName
     */
    export function isLoadUDF(udfName: string): boolean {
        const loadUDFFilter = RegExp('(/LOAD_WIZARD_|/LOAD_PLAN_UDF_)');
        return loadUDFFilter.test(udfName);
    }

    /**
     * Only show default and user workbook's udfs and shared udfs. If same
     * module name exists in workbook space and shared space, it preserves the
     * one in workbook space.
     * xcHelper.filterUDFs
     * @param  {XcalarEvalFnDescT[]} fns
     * @param  {string} wkbkPrefix?
     * @returns XcalarEvalFnDescT
     */
    export function filterUDFs(fns: XcalarEvalFnDescT[], wkbkPrefix?: string): XcalarEvalFnDescT[] {
        return filterUDFsByPath(
            fns,
            wkbkPrefix || UDFFileManager.Instance.getCurrWorkbookPath(),
            xcHelper.constructUDFSharedPrefix()
        );
    }

    /**
     * Filter out the default, shared, and workbook(specified by user and session) UDFs.
     * If same module name exists in both workbook and shared, preserve the workbook one.
     * @param fns
     * @param userName
     * @param sessionId
     */
    export function filterUDFsByUserSession(
        fns: XcalarEvalFnDescT[],
        userName: string,
        sessionId: string
    ): XcalarEvalFnDescT[] {
        return filterUDFsByPath(
            fns,
            xcHelper.constructUDFWBPrefix(userName, sessionId),
            xcHelper.constructUDFSharedPrefix()
        );
    }

    function filterUDFsByPath(
        fns: XcalarEvalFnDescT[],
        wkbkPrefix: string,
        sharedPathPrefix: string
    ): XcalarEvalFnDescT[] {
        let filteredArray: XcalarEvalFnDescT[] = [];
        for (const op of fns) {
            if (op.fnName.indexOf("/") === -1) {
                filteredArray.push(op);
            } else if (
                wkbkPrefix != null && op.fnName.startsWith(wkbkPrefix) ||
                op.fnName.startsWith(sharedPathPrefix)
            ) {
                filteredArray.push(op);
            }
        }
        return filteredArray;
    }

    /**
     * xcHelper.validateColName returns the error message. If null, column
     * is good
     * @param colName
     * @param noSpace
     * @param noDoubleColon true: "::" is invalid, ":" is valid; false: "::" is valid, ":" is invalid
     */
    export function validateColName(
        colName: string,
        noSpace: boolean = false,
        noDoubleColon: boolean = false,
        acceptParam: boolean = false
    ): string | null {
        if (!colName || colName.trim().length === 0) {
            return ErrTStr.NoEmpty;
        }

        let error: string | null = null;
        if (!xcHelper.isColNameStartValid(colName, acceptParam)) {
            error = ColTStr.RenameStartInvalid;
        } else if (colName.length >
                    XcalarApisConstantsT.XcalarApiMaxFieldNameLen
        ) {
            error = ColTStr.LongName;
        } else if (xcHelper.hasInvalidCharInCol(colName, noSpace, noDoubleColon)) {
            if (noSpace) {
                error = ColTStr.ColNameInvalidCharSpace;
            } else {
                error = ColTStr.ColNameInvalidChar;
            }
        } else {
            const preservedNames: string[] = ['none', 'false', 'true'];
            if (colName === 'DATA' ||
                preservedNames.indexOf(colName.toLowerCase()) > -1) {
                error = ErrTStr.PreservedName;
            } else {
                const preservedChars: string[] = ['--'];
                for (const preservedChar of preservedChars) {
                    if (colName.includes(preservedChar)) {
                        error = xcStringHelper.replaceMsg(ErrWRepTStr.PreservedString, {
                            "char": preservedChar
                        });
                        break;
                    }
                }
            }
        }
        return error;
    }

    /**
     * xcHelper.validatePrefixName
     * @param prefix
     */
    export function validatePrefixName(prefix: string | null): string | null {
        let error: string | null = null;
        if (prefix != null && !xcStringHelper.isStartWithLetter(prefix)) {
            error = ErrTStr.PrefixStartsWithLetter;
        } else if (prefix != null && prefix.length > gPrefixLimit) {
            error = ErrTStr.PrefixTooLong;
        } else if (!xcHelper.checkNamePattern(PatternCategory.Prefix,
            PatternAction.Check, prefix)
        ) {
            error = ColTStr.PrefixInValid;
        } else if (prefix != null && prefix.includes("--")) {
            error = ErrTStr.PrefixNoDoubleHyphen;
        }
        return error;
    };

    /**
     * xcHelper.escapeColName
     * @param str
     */
    export function escapeColName(str: string): string {
        // adds a backslash before each of these: [ ] . \
        return str.replace(/[\[\]\.\\]/g, '\\$&');
    }

    /**
     * xcHelper.unescapeColName
     * @param str
     */
    export function unescapeColName(str: string): string {
        str = str.replace(/\\\\/g, '\\');
        str = str.replace(/\\\./g, '\.');
        str = str.replace(/\\\[/g, '\[');
        str = str.replace(/\\\]/g, '\]');
        return str;
    }

    /**
     * xcHelper.stripColName
     * @param colName
     * @param stripSpace
     * @param stripDoubleColon set true to strip "::"
     */
    export function stripColName(
        colName: string,
        stripSpace: boolean = false,
        stripDoubleColon: boolean = false
    ): string {
        colName = xcStringHelper.escapeNonPrintableChar(colName, "");
        const rules = {
            '00': /[\^,{}'"()\[\]\.\\\/]/g, // NOT stripSpace, NOT stripDoubleColon
            '10': /[\^,{}'"()\[\]\.\\\/ ]/g, // stripSpace, NOT stripDoubleColon
            '01': /[\^,{}'"()\[\]\.\\\/]|::/g, // NOT stripSpace, stripDoubleColon
            '11': /[\^,{}'"()\[\]\.\\\/ ]|::/g, // stripSpace, stripDoubleColon
        }
        const ruleKey = `${stripSpace? '1': '0'}${stripDoubleColon? '1': '0'}`;
        const pattern = rules[ruleKey];
        // if column name starts with a valid character but not one that it
        // should start with, then prepend underscore
        if (!pattern.test(colName[0]) &&
            !xcHelper.isColNameStartValid(colName)) {
            colName = "_" + colName;
        }
        return colName.split(pattern).filter((str) => str !== "").join("_");
    }

    /**
     * xcHelper.castStrHelper
     * @param colName
     * @param colType
     * @param handleNull
     */
    export function castStrHelper(
        colName: string,
        colType: string | null | void,
        handleNull?: boolean
    ): string {
        // here for float/int, null will become 0,
        // if we want null become FNF, need to use int(string(XXX))
        let mapStr: string = "";
        switch (colType) {
            case (ColumnType.boolean):
                mapStr += "bool(";
                break;
            case (ColumnType.float):
                if (handleNull) {
                    colName = "string(" + colName + ")";
                }
                mapStr += "float(";
                break;
            case (ColumnType.integer):
                if (handleNull) {
                    colName = "string(" + colName + ")";
                }
                mapStr += "int(";
                break;
            case (ColumnType.string):
                mapStr += "string(";
                break;
            case (ColumnType.timestamp):
                mapStr += "timestamp(";
                break;
            case (ColumnType.money):
                mapStr += "money(";
                break;
            case (null):
            case (undefined):
                return colName;
            default:
                console.warn("XXX no such operator! Will guess");
                mapStr += colType + "(";
                break;
        }

        if (colType === ColumnType.integer) {
            mapStr += colName + ", 10)";
        } else {
            mapStr += colName + ")";
        }

        return mapStr;
    }

    /**
     * xcHelper.getCastTypeToColType
     * @param str
     */
    export function getCastTypeToColType(str: string): ColumnType {
        switch (str) {
            case ("bool"):
                return ColumnType.boolean;
            case ("float"):
                return ColumnType.float;
            case ("int"):
                return ColumnType.integer;
            case ("string"):
                return ColumnType.string;
            case ("timestamp"):
                return ColumnType.timestamp;
            case ("money"):
                return ColumnType.money;
            case ("numeric"):
                return ColumnType.money;
            default:
                return null;
        }
    }

    /**
     * xcHelper.isCharEscaped
     * if string is somet\"thing then str is somet\"thing
     * and startIndex is the index of the quote you're testing -> 7
     * @param str
     * @param startIndex
     */
    export function isCharEscaped(str: string, startIndex: number): boolean {
        let backSlashCount: number = 0;
        for (let i = startIndex - 1; i >= 0; i--) {
            if (str[i] === "\\") {
                backSlashCount++;
            } else {
                break;
            }
        }
        return (backSlashCount % 2 === 1);
    }

    /**
     * xcHelper.deepCompare
     * returns true if comparison is equal
     * returns false if diff found
     */
    export function deepCompare(...args): boolean {
        let leftChain: any[];
        let rightChain: any[];

        function compare2Objects(x, y) {
            // check if both are NaN
            if (isNaN(x) && isNaN(y) && typeof x === 'number' &&
                typeof y === 'number') {
                return true;
            }

            if (x === y) {
                return true;
            }

            if (!(x instanceof Object && y instanceof Object)) {
                return false;
            }

            // Check for infinitive linking loops
            if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
                return false;
            }

            // Quick checking of one object being a subset of another.
            for (let p in y) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false;
                } else if (typeof y[p] !== typeof x[p]) {
                    return false;
                }
            }

            for (let p in x) {
                if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                    return false;
                } else if (typeof y[p] !== typeof x[p]) {
                    return false;
                }

                switch (typeof (x[p])) {
                    case ('object'):
                    case ('function'):
                        leftChain.push(x);
                        rightChain.push(y);

                        if (!compare2Objects(x[p], y[p])) {
                            return false;
                        }

                        leftChain.pop();
                        rightChain.pop();
                        break;
                    default:
                        if (x[p] !== y[p]) {
                            return false;
                        }
                        break;
                }
            }

            return true;
        }

        if (args.length < 1) {
            return true;
        }
        let len: number = args.length;
        for (let i = 1; i < len; i++) {
            leftChain = [];
            rightChain = [];

            if (!compare2Objects(args[0], args[i])) {
                return false;
            }
        }

        return true;
    }

    /**
     * xcHelper.hasValidColPrefix
     * not only looks for gColPrefix but checks to make sure it's not
     * preceded by anything other than a comma
     * @param str
     */
    export function hasValidColPrefix(str: string): boolean {
        if (typeof str !== 'string') {
            return false;
        }

        str = str.trim();
        let colNames: string[] = [];
        let cursor: number = 0;
        let prevCharIsComma: boolean = false;
        let i: number = 0;
        for (i = 0; i < str.length; i++) {
            if (!xcHelper.isCharEscaped(str, i)) {
                if (!prevCharIsComma && str[i] === ',') {
                    colNames.push(str.slice(cursor, i).trim());
                    cursor = i + 1;
                    prevCharIsComma = true;
                } else if (!prevCharIsComma && str[i] === ' ') {
                    // "colname colname" instead of "colname, colname"
                    // we will assume "colname colname" is one column with spaces
                } else if (str[i] !== " ") {
                    prevCharIsComma = false;
                }
            }
        }
        colNames.push(str.slice(cursor, i).trim());

        let hasPrefix: boolean = false;
        for (let i = 0; i < colNames.length; i++) {
            let colName: string = colNames[i];
            if (colName.length < 2) {
                // colName must be at least 2 characters long
                // including the colPrefix
                return false;
            }
            if (colName[0] === gColPrefix) {
                hasPrefix = true;
            } else {
                return false;
            }
        }
        return hasPrefix;
    }

    /**
     * Converts a map into a json struct. If you do a JSON.strintify([...map])
     * Instead of getting a struct, you are going to end up with an array. This
     * function produces a struct.
     * @param origMap Original Map struct
     */
    export function mapToJsonStruct(origMap: Map<string | number, any>) {
        const keyIter: IterableIterator<string | number> = origMap.keys();
        let key: IteratorResult<any> = keyIter.next();
        const out: object = {};
        while (!key.done) {
            const k: string | number = key.value;
            const value: any = origMap.get(k);
            out[k] = value;
            key = keyIter.next();
        }
        return out;
    }

    /**
     * xcHelper.getFormat
     * a.json returns JSON
     * @param name
     */
    export function getFormat(name: string): string | null {
        name = '' + name; // In case name is an integer
        const index: number = name.lastIndexOf('.');
        if (index < 0) {
            return null;
        }

        const ext: string = name.substring(index + 1, name.length)
                                .toUpperCase();
        const formatMap: object = {
            JSON: "JSON",
            CSV: "CSV",
            TSV: "CSV",
            XLSX: "Excel",
            XLS: "Excel",
            TXT: "TEXT",
            XML: "XML",
            HTML: "HTML",
            TAR: "TAR",
            ZIP: "ZIP",
            PDF: "PDF",
            JPG: "JPG",
            PNG: "PNG",
            GIF: "GIF",
            BMP: "BMP",
            PARQUET: "PARQUETFILE",
        };

        if (formatMap.hasOwnProperty(ext)) {
            return formatMap[ext];
        } else {
            return null;
        }
    }

    /**
     * xcHelper.sortVals
     * @param {string} a - first value
     * @param {string} b - sescond value
     * @param {integer} order - -1 for ascending, 1 for descending
     */
    export function sortVals(
        a: string,
        b: string,
        order: number = ColumnSortOrder.ascending
    ): number {
        a = a.toLowerCase();
        b = b.toLowerCase();

        // if a = "as1df12", return ["as1df12", "as1df", "12"]
        // if a = "adfads", return null
        const matchA: RegExpMatchArray = a.match(/(^.*?)([0-9]+$)/);
        const matchB: RegExpMatchArray = b.match(/(^.*?)([0-9]+$)/);
        if (matchA != null && matchB != null && matchA[1] === matchB[1]) {
            // if the rest part that remove suffix number is same,
            // compare the suffix number
            a = <any>parseInt(matchA[2]);
            b = <any>parseInt(matchB[2]);
        }

        if (a < b) {
            return order;
        } else if (a > b) {
            return (-order);
        } else {
            return 0;
        }
    }

    /**
     * xcHelper.getUDFList
     * @param listXdfsObj
     * @returns {moduleLis: htmlStr, fnLis: htmlStr}
     */
    export function getUDFList(listXdfsObj: any): {moduleLis: HTML, fnLis: HTML} {
        let modules: string[] = [];
        let moduleDisplayedNames: string[] = [];
        let moduleObjs: XcalarEvalFnDescT[] = [];
        let privateObjs: XcalarEvalFnDescT[] = [];

        const privateModules: string[] = [];
        const privateModulesDisplayed: string[] = [];
        const sortUDFName = (a: XcalarEvalFnDescT, b: XcalarEvalFnDescT): number => {
            const aName: string = a.displayName;
            const bName: string = b.displayName;
            return (aName < bName ? -1 : (aName > bName ? 1 : 0));
        }

        listXdfsObj.fnDescs.forEach((udf) => {
            const fnName: string = udf.displayName;
            if (fnName.startsWith("_")) {
                privateObjs.push(udf);
            } else {
                moduleObjs.push(udf);
            }
        });
        moduleObjs.sort(sortUDFName);
        privateObjs.sort(sortUDFName);

        for (let i = 0; i < moduleObjs.length; i++) {
            modules.push(moduleObjs[i].fnName);
            moduleDisplayedNames.push(moduleObjs[i].displayName);
        }

        for (let i = 0; i < privateObjs.length; i++) {
            privateModules.push(privateObjs[i].fnName);
            privateModulesDisplayed.push(privateObjs[i].displayName);
        }

        modules = modules.concat(privateModules);
        moduleDisplayedNames = moduleDisplayedNames.concat(privateModulesDisplayed);

        let moduleLi: string = "";
        let fnLi: string = "";
        const moduleMap: object = {};
        const len: number = listXdfsObj.numXdfs;
        let sharePathPrefix: string = UDFFileManager.Instance.getSharedUDFPath();
        let defaultPath: string = UDFFileManager.Instance.getDefaultUDFPath();
        for (let i = 0; i < len; i++) {
            const udf: string[] = modules[i].split(":");
            const udfDisplayedName: string[] = moduleDisplayedNames[i].split(":");
            const moduleName: string = udf[0];
            let moduleDisplayedName: string = udfDisplayedName[0];
            const fnName: string = udf[1];
            if (!moduleMap.hasOwnProperty(moduleName)) {
                moduleMap[moduleName] = true;
                if (moduleName.startsWith(sharePathPrefix) &&
                    moduleName !== defaultPath
                ) {
                    moduleDisplayedName += " (shared)";
                }
                moduleLi += '<li data-module="' + moduleName + '">' +
                                moduleDisplayedName +
                            "</li>";
            }

            fnLi += '<li data-module="' + moduleName + '">' +
                        fnName +
                    '</li>';
        }

        return {
            moduleLis: moduleLi,
            fnLis: fnLi
        };
    }


    /**
     * xcHelper.getPromiseWhenError
     * @param args
     */
    export function getPromiseWhenError(args: any[]): string | null {
        for (let i = 0; i < args.length; i++) {
            if (args[i] && (args[i].error ||
                args[i] === StatusTStr[StatusT.StatusCanceled])) {
                return args[i];
            }
        }
        // when cannot find any error
        console.error("cannot find error in", args);
        return null;
    }

    /**
     * xcHelper.readFile
     * @param file
     */
    export function readFile(file: File): XDPromise<any> {
        if (file == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<any> = PromiseHelper.deferred(); //string or array buffer
        const reader: FileReader = new FileReader();

        reader.onload = function(event: any) {
            deferred.resolve(event.target.result);
        };

        reader.onloadend = function(event: any) {
            const error: DOMException = event.target.error;
            if (error != null) {
                deferred.reject(error);
            }
        };

        reader.readAsBinaryString(file);

        return deferred.promise();
    }

    /* =================== getKeyInfos ========================= */
    function changeColMetaToMap(valueAttrs: any[]): object {
        const res: object = {};
        try {
            valueAttrs.forEach((valueAttr) => {
                res[valueAttr.name] = valueAttr.type;
            });
        } catch (e) {
            console.error(e);
        }
        return res;
    }

    function getColMetaHelper(tableName: string): XDPromise<object> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        const tableId: TableId = xcHelper.getTableId(tableName);
        const table: TableMeta = gTables[tableId];

        if (table && table.backTableMeta) {
            let colMeta: object = changeColMetaToMap(table.backTableMeta.valueAttrs);
            deferred.resolve({colMeta: colMeta, hasTableMeta: true});
        } else {
            XIApi.getTableMeta(tableName)
            .then(function(tableMeta) {
                let colMeta: object = changeColMetaToMap(tableMeta.valueAttrs);
                deferred.resolve({colMeta: colMeta, hasTableMeta: true});
            })
            .fail(function() {
                deferred.resolve({colMeta: {}, hasTableMeta: false}); // still resolve
            });
        }

        return deferred.promise();
    }

    function getNewKeyFieldName(parsedName: PrefixColInfo, takenNames: object): string {
        let name: string = xcHelper.stripColName(parsedName.name, false);
        if (!takenNames.hasOwnProperty(name)) {
            return name;
        }

        name = xcHelper.convertPrefixName(parsedName.prefix, name);
        let newName: string = name;
        if (!takenNames.hasOwnProperty(newName)) {
            return newName;
        }

        return xcHelper.randName(name);
    }

    /**
     * xcHelper.getKeyInfos
     * resolves an array of keyInfos
     * @param keys
     * @param tableName
     */
    export function getKeyInfos(
        keys: {
            name: string,
            type: ColumnType,
            keyFieldName: string,
            ordering: XcalarOrderingT
        }[],
        tableName: string,
        fakeApiCall?: boolean
    ): XDPromise<object[]> {
        const deferred: XDDeferred<object[]> = PromiseHelper.deferred();
        let def: XDPromise<any>;
        if (fakeApiCall) {
            def = PromiseHelper.resolve({colMeta: {}, hasTableMeta: false});
        } else {
            def = getColMetaHelper(tableName);
        }
        def.then(function (ret) {
            const {colMeta, hasTableMeta} = ret;
            const res: object[] = keys.map((key) => {
                const name: string = key.name;
                const parsedName: PrefixColInfo = xcHelper.parsePrefixColName(name);
                let type: number = DfFieldTypeT.DfUnknown;
                let keyFieldName: string = null;

                if (hasTableMeta) {
                    if (parsedName.prefix !== "") {
                        keyFieldName = getNewKeyFieldName(parsedName, colMeta);
                    } else {
                        keyFieldName = name;
                        type = colMeta[name];
                    }
                } else {
                    // if no tableMeta, just overwrite keyFieldName with key.name
                    keyFieldName = parsedName.name;
                }
                if (!colMeta.hasOwnProperty(keyFieldName)) {
                    // add to map so we can check against it when creating
                    // other new key field names
                    colMeta[keyFieldName] = DfFieldTypeT.DfUnknown;
                }
                if (key.type != null) {
                    type = xcHelper.convertColTypeToFieldType(key.type);
                }
                return {
                    name: name,
                    type: type,
                    keyFieldName: key.keyFieldName || keyFieldName || "",
                    ordering: key.ordering
                };
            });

            deferred.resolve(res);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /* =================== end of getKeyInfos ========================= */

    /**
     * xcHelper.formatAsUrl
     * @param struct
     */
    export function formatAsUrl(struct: object): string {
        let retStr: string = "";
        for (let key in struct) {
            if (retStr === "") {
                retStr += "?";
            } else {
                retStr += "&";
            }
            retStr += encodeURIComponent(key) + "=" +
                      encodeURIComponent(struct[key]);
        }
        return retStr;
    }

    // Will round bucket size up or down depending on how many rows can fit on the screen
    /**
     * xcHelper.roundToSignificantFigure
     * @param value
     * @param numRows
     * @param max
     * @param min
     */
    export function roundToSignificantFigure(
        value: number,
        numRows: number,
        max: number,
        min: number
    ): number {
        value = Math.floor(value);
        const numDigits: number = Math.floor(Math.log10(value));
        let firstDigit: number = Math.floor(value / Math.pow(10, numDigits));
        // adds 1 to first digit (round up) if rounding down creates too many buckets
        firstDigit = (max - min) / (firstDigit * Math.pow(10, numDigits)) > numRows ?
                     firstDigit + 1 : firstDigit;
        return firstDigit * Math.pow(10, numDigits);
    }

    /**
     * xcHelper.decodeFromUrl
     * @param href
     */
    export function decodeFromUrl(href: string): object {
        const ret: object = {};

        try {
            const url: URL = new URL(href);
            const queryStr = url.search;
            if (!queryStr.length) {
                return ret;
            }
            const pairs = queryStr.substr(1).split("&");
            pairs.forEach(function(pairStr) {
                let pair = pairStr.split("=");
                ret[decodeURIComponent(pair[0].replace(/\+/g,' '))] = decodeURIComponent(pair[1].replace(/\+/g,' ') || '');
            });
        } catch (e) {

        }

        return ret;
    }

    export function setURLParam(key: string, value: string): string {
        const curHref = window.location.href;
        const url: URL = new URL(curHref);
        const queryStr = url.search;
        try {
            let pairs;
            if (queryStr.length) {
                pairs = queryStr.substr(1).split("&");
            } else {
                pairs = [];
            }
            let found = false;
            for (let i = 0; i < pairs.length; i++) {
                let pair = pairs[i].split("=");
                if (decodeURIComponent(pair[0].replace(/\+/g,' ')) === key) {
                    pairs[i] = pair[0] + "=" + encodeURIComponent(value);
                    found = true;
                    break;
                }
            }
            if (!found) {
                pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            }

            return curHref.split('?')[0] + "?" + pairs.join("&");
        } catch (e) {
            return curHref;
        }
    }

    /**
     *
     * @param key
     */
    export function deleteURLParam(key: string): string {
        const curHref = window.location.href;
        const url: URL = new URL(curHref);
        const queryStr = url.search;
        if (!queryStr.length) {
            return window.location.href;
        }
        try {
            const pairs = queryStr.substr(1).split("&");
            for (let i = 0; i < pairs.length; i++) {
                let pair = pairs[i].split("=");
                if (decodeURIComponent(pair[0].replace(/\+/g,' ')) === key) {
                    pairs.splice(i, 1);
                    break;
                }
            }
            let newLocation = curHref.split('?')[0];
            if (pairs.length) {
                newLocation = newLocation + "?" + pairs.join("&");
            }
            return newLocation;
        } catch (e) {
            return curHref;
        }
    }

    /**
     * returns a string that includes the position and character of the error
     * @param e javascript error
     */
    export function parseJSONError(e): {error: string} {
        try {
            // handling json parse/syntax error
            var searchText= "at position ";
            var message = e.message || e.error;
            var errorPosition = message.indexOf(searchText);
            var position = "";
            if (errorPosition > -1) {
                for (let i = errorPosition + searchText.length + 1; i < message.length; i++) {
                    if (message[i] >= 0 && message[i] <= 9) {
                        position += message[i];
                    } else {
                        break;
                    }
                }
            }
            if (position.length) {
                // XXX split into lines by searching for \n not in quotes or escaped
                // so that we can show the error in the correct line number
            }
            const name = e.name || "Error";
            return {
                error: xcStringHelper.camelCaseToRegular(name) + ": " + message
            };
        } catch (error) {
            console.error(error);
            return {error: e}; // invalid form
        }
    }

    export function createGroupByColumns(
        tableName: string,
        groupByCols: string[],
        aggArgs: AggColInfo[],
        sampleCols: number[]
    ): ProgCol[] {
        let newProgCols: ProgCol[] = [];
        const usedNameSet: Set<string> = new Set();
        aggArgs.forEach((aggArg) => {
            const name: string = aggArg.newColName;
            usedNameSet.add(name);
            newProgCols.push(ColManager.newPullCol(name, name));
        });

        if (sampleCols != null && sampleCols.length > 0) {
            const tableId: TableId = xcHelper.getTableId(tableName);
            newProgCols = getIncSampleGroupByCols(tableId, sampleCols, groupByCols, newProgCols);
        } else {
            groupByCols.forEach((name) => {
                if (!usedNameSet.has[name]) {
                    usedNameSet.add(name);
                    const frontName: string = xcHelper.parsePrefixColName(name).name;
                    newProgCols.push(ColManager.newPullCol(frontName, name));
                }
            });
        }
        newProgCols.push(ColManager.newDATACol());
        return newProgCols;
    }

    function getIncSampleGroupByCols(
        tableId: TableId,
        sampleCols: number[],
        groupByCols: string[],
        aggProgCols: ProgCol[]
    ): ProgCol[] {
        const table: TableMeta = gTables[tableId];
        const tableCols: ProgCol[] = table.tableCols;
        const newCols: ProgCol[] = [];
        const numGroupByCols: number = groupByCols.length;
        let newProgColPosFound: boolean = false;

        // find the first col that is in groupByCols
        // and insert aggCols
        sampleCols.forEach((colIndex) => {
            const curCol = tableCols[colIndex];
            const colName: string = curCol.getBackColName();
            if (!newProgColPosFound) {
                for (let i = 0; i < numGroupByCols; i++) {
                    if (colName === groupByCols[i]) {
                        newProgColPosFound = true;
                        aggProgCols.forEach((progCol) => {
                            newCols.push(progCol);
                        });
                        break;
                    }
                }
            }

            newCols.push(curCol);
        });

        if (!newProgColPosFound) {
            aggProgCols.forEach((progCol) => {
                newCols.unshift(progCol);
            });
        }
        // Note that if include sample,
        // a.b should not be escaped to a\.b
        const finalCols: ProgCol[] = newCols.map((col) => new ProgCol(<any>col));
        return finalCols;
    }

    /**
     * xcHelper.zip
     * @param arrs, any number of arrays.
     * @example zip([1, 2, 3], ["a", "b", "c"]).
     * The output is [[1,"a"],[2, "b"],[3, "c"]].
     */
    export function zip(...arrs: Array<any>) {
        if(arrs.length == 0) {
            return [];
        }
        return arrs[0].map((_, idx) => arrs.map(arr=>arr[idx]));
    }

    export function createColInfo(columns: ProgCol[]): ColRenameInfo[] {
        ///XXX TODO: Remove this and have the user choose casted names
        let colInfo: ColRenameInfo[] = [];
        let names: string[] = [];
        columns.forEach((column: ProgCol) => {
            let backName: string = column.getBackColName();
            let newName: string = backName;
            if (newName.indexOf("::") > 0) {
                newName = newName.split("::")[1];
            }
            if (newName.endsWith("_integer") || newName.endsWith("_float") ||
                newName.endsWith("_boolean") || newName.endsWith("_string") ||
                newName.endsWith("_timestamp")) {
                newName = newName.substring(0, newName.lastIndexOf("_"));
            }
            while (names.indexOf(newName) != -1) {
                newName = newName + "(2)";
            }
            names.push(newName);
            let type: DfFieldTypeT = xcHelper.convertColTypeToFieldType(column.getType());
            colInfo.push({
                orig: backName,
                new: newName,
                type: type
            });
        });
        return colInfo;
    };

    export function unionTypeToXD(type) {
        switch (type) {
            case UnionOperatorTStr[UnionOperatorT.UnionStandard]:
                return "union";
            case UnionOperatorTStr[UnionOperatorT.UnionIntersect]:
                return "intersect";
            case UnionOperatorTStr[UnionOperatorT.UnionExcept]:
                return "except";
            default:
                console.error("error case");
                return "";
        }
    }

    export function getXcalarInputNameFromApiString(apiString: string): string {
        let val: string = apiString.substr('XcalarApi'.length);
        let inputName: string = "";
        switch (val) {
            case ('BulkLoad'):
                inputName = 'load';
                break;
            case ('GetStat'):
                inputName = 'stat';
                break;
            case ('GetStatByGroupId'):
                inputName = 'statByGroupId';
                break;
            case ('DeleteObjects'):
                inputName = 'deleteDagNode';
                break;
            default:
                inputName = val[0].toLowerCase() + val.substr(1);
                break;
        }
        inputName += 'Input';
        return inputName;
    }

    export function getXcalarInputFromNode(node: XcalarApiDagNodeT) {
        let api: number = node.api;
        let apiString: string = XcalarApisTStr[api];
        let inputName: string = getXcalarInputNameFromApiString(apiString);

        return node.input[inputName];
    }

    export function sendRequest(action: string, url: string, content?) {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let data = _preParseSendData(action, content);
        HTTPService.Instance.ajax({
            "type": action,
            "data": data,
            "contentType": "application/json",
            "url": xcHelper.getAppUrl() + url,
            "success": function(data) {
                deferred.resolve(data);
            },
            "error": function(e) {
                deferred.reject(e);
            }
        });

        function _preParseSendData(
            action: string,
            content?): string | object {
            let data = content ? content : {};
            // A flag to indicate whether current window is using http protocol or not
            data["isHTTP"] = _isHTTP();
            // Post and Delete case, send a String
            // Get case, send a JSON object
            if (action !== "GET") {
                data = JSON.stringify(data);
            }
            return data;
        }

        function _isHTTP(): string {
            if (window.location.protocol === "http:") {
                return "true";
            } else {
                return "false";
            }
        }

        return deferred.promise();
    }

    /**
     * xcHelper.calculateSkew
     * @param rows
     */
    export function calculateSkew(rows: number[]): number {
        let skewness: number = null;
        let len: number = rows.length;
        let even: number = 1 / len;
        let total: number = rows.reduce((sum, value) => {
            return sum + value;
        }, 0);
        if (total === 1) {
            // 1 row has no skewness
            skewness = 0;
        } else if (len === 1) {
            // one row has no skew
            skewness = 0;
        } else {
            // change to percantage
            rows = rows.map((row) => row / total);

            // the total skew
            skewness = rows.reduce((sum, value) => {
                return sum + Math.abs(value - even);
            }, 0);
            skewness = skewness * len / (2 * (len - 1));
            skewness = Math.floor(skewness * 100);
        }
        return skewness;
    }

    /**
     * xcHelper.addNodeLineageToQueryComment
     * @param query
     * @param parentNodeInfos
     * @param curNodeId
     */
    export function addNodeLineageToQueryComment(
        query: {operation: string, comment: string},
        parentNodeInfos: DagTagInfo[],
        curentNodeInfo: DagTagInfo
    ): any {
        if (query.operation === XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
            return query;
        }
        let queryComment = {graph_node_locator: []};
        try {
            if (query.comment) {
                queryComment = JSON.parse(query.comment);
            }
        } catch (e) {
            console.error(e);
        }

        try {
            query = {...query}; // deep copy
            let curNodeInfos = queryComment.graph_node_locator || [];
            let finalNodeInfos = [
                ...parentNodeInfos,
                curentNodeInfo,
                ...curNodeInfos
            ];
            queryComment.graph_node_locator = finalNodeInfos;
            query.comment = JSON.stringify(queryComment);
        } catch (e) {
            console.error(e);
        }

        return query;
    }

    /**
     * xcHelper.isCMDKey
     * @param event
     */
    export function isCMDKey(event): boolean {
        return isSystemMac && event.metaKey ||
                !isSystemMac && event.ctrlKey;
    }

    export function isInternalColumn(col: string): boolean {
        const upperName = col.toUpperCase();
        return upperName.startsWith("XCALARRANKOVER") ||
                upperName.startsWith("XCALAROPCODE") ||
                upperName.startsWith("XCALARBATCHID") ||
                upperName.startsWith("XCALARROWNUMPK");
    }

    /**
     * xcHelper.getBasicColTypes
     * @param includeMixed
     */
    export function getBasicColTypes(includeMixed: boolean = false): ColumnType[] {
        const types = [ColumnType.string, ColumnType.integer, ColumnType.float,
        ColumnType.boolean, ColumnType.timestamp, ColumnType.money];
        if (includeMixed) {
            types.push(ColumnType.mixed);
        }
        return types;
    }

    export function asyncTimeout(ms: number = 0) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

if (typeof exports !== "undefined") {
    exports.xcHelper = xcHelper;
}
