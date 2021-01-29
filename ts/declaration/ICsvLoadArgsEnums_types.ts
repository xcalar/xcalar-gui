declare enum CsvSchemaModeT {
    CsvSchemaModeNoneProvided,
    CsvSchemaModeUseHeader,
    CsvSchemaModeUseSchemaFile,
    CsvSchemaModeUseLoadInput
}
declare const CsvSchemaModeTStr: { [key: string]: string };
declare const CsvSchemaModeTFromStr: { [key: string]: number };
