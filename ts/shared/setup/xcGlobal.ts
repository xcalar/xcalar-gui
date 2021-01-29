// This file is where all the global variables
namespace xcGlobal {
    declare var nw: any;
    const has_require: boolean = (typeof require !== 'undefined' && typeof nw === 'undefined');
    // nw obj exists when nwjs running browser

    /**
     * xcGlobal.setup
     */
    export function setup(): void {
        // =========================== Globals ============================== //
        KB = 1024;
        MB = 1024 * KB;
        GB = 1024 * MB;
        TB = 1024 * GB;
        PB = 1024 * TB;
        // ================================================================== //
        gPrefixLimit = 31;
        if (!has_require) {
            if (typeof MouseEvents !== 'undefined') {
                gMouseEvents = new MouseEvents();
            }
        }

        gRescol = {
            "minCellHeight": 21,
            "cellMinWidth": 15,
            "clicks": 0,
            "delay": 500,
            "timer": null
        };

        /**
         * "GLOB": global scope
         * keys inculding: gUserListKey,
         * gSettingsKey, GlobalKVKeys Enum
         *
         * "USER": (XXX this should be XcalarApiWorkbookScopeUser, no support yet!),
         * keys including: gUserKey, wokrbook set infos key,
         * and kvVersion info
         *
         * "WKBK": workbook scope
         * keys including: gStorageKey,
         */
        gKVScope = {
            "GLOB": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal,
            "USER": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeGlobal,
            "WKBK": XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeSession,
        };

        gTables = {}; // This is the main global structure that stores TableMeta
        gOrphanTables = [];
        gDroppedTables = {};
        gActiveTableId = '';
        gIsTableScrolling = false;
        gMinModeOn = false;
        gMutePromises = true; // mutes .when() console logs
        gAggVarPrefix = '^';
        gColPrefix = '$';
        gPrefixSign = '::';
        gRetSign = ':';
        gDSPrefix = '.XcalarDS.';
        gParamStart = "<";
        gHiddenColumnWidth = 15;
        gDefaultSharedRoot = 'Default Shared Root';


        // ======================== Support Parameters ====================== //
        gAlwaysDelete = false;
        gLongTestSuite = 1;
        gMaxDSColsSpec = 1023; // Max num of columns that can be ordered, renamed, or
        // casted from a dataset
        gMaxSampleSize = 0; // Max Sample Size for datasets. If this is set, all
        // datasets will abide by this limit. If you don't want
        // to use it anymore, just set it back to 0
        gUdfDefaultNoCheck = false; // when set true, allow update default udf
        gXcalarRecordNum = "xcalarRecordNum";
        gDFSuffixFirst = ".xlrdf";
        gDFSuffix = gDFSuffixFirst + ".tar.gz";
        gAppSuffix = ".xlrapp.tar.gz";
        gShowSQLDF = false;
        // Shut up the console logs
        verbose = false;
        superVerbose = false;
    };

    export let darkMode = true;
    export let react: any = {};
    export let isLegacyLoad = false;
}

if (typeof exports !== 'undefined') {
    exports.xcGlobal = xcGlobal;
}
