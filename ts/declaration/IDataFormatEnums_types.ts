declare enum DfFieldTypeT {
    DfUnknown,
    DfString,
    DfInt32,
    DfUInt32,
    DfInt64,
    DfUInt64,
    DfFloat32,
    DfFloat64,
    DfBoolean,
    DfTimespec,
    DfBlob,
    DfNull,
    DfMixed,
    DfFatptr,
    DfScalarPtr,
    DfScalarObj,
    DfOpRowMetaPtr,
    DfArray,
    DfObject,
    DfMoney
}

declare enum DfFormatTypeT {
    DfFormatUnknown,
    DfFormatJson,
    DfFormatCsv,
    DfFormatSql,
    DfFormatInternal
}

declare const DfFieldTypeTStr: { [key: string]: string };
declare const DfFieldTypeTFromStr: { [key: string]: number };
declare const DfFormatTypeTStr: { [key: string]: string };
declare const DfFormatTypeTFromStr: { [key: string]: number };