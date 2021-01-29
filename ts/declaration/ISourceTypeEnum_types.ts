declare enum SourceTypeT {
    SrcUnknown,
    SrcDataset,
    SrcTable,
    SrcConstant,
    SrcExport
}

declare const SourceTypeTStr: { [key: string]: string };
declare const SourceTypeTFromStr: { [key: string]: number };