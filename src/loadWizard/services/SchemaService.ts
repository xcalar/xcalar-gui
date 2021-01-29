import { FilePathInfo } from './S3Service'

enum FileType {
    CSV = 'csv',
    JSON = 'json',
    JSONL = 'jsonl',
    PARQUET = 'parquet'
};

type FileTypeFilterFunction = (fileInfo: FilePathInfo) => boolean;
const FileTypeFilter = new Map<FileType, FileTypeFilterFunction>([
    [FileType.CSV, (fileInfo) => {
        const validTypes = new Set(['csv']);
        return validTypes.has(`${fileInfo.type}`.toLowerCase());
    }],
    [FileType.JSON, (fileInfo) => {
        const validTypes = new Set(['json']);
        return validTypes.has(`${fileInfo.type}`.toLowerCase());
    }],
    [FileType.JSONL, (fileInfo) => {
        const validTypes = new Set(['json', 'jsonl']);
        return validTypes.has(`${fileInfo.type}`.toLowerCase());
    }],
    [FileType.PARQUET, (fileInfo) => {
        const validTypes = new Set(['parquet']);
        return validTypes.has(`${fileInfo.type}`.toLowerCase());
    }]
]);

enum CSVHeaderOption {
    USE = 'USE',
    IGNORE = 'IGNORE',
    NONE = 'NONE'
};

enum JsonTypeOption {
    DOCUMENT = 'DOCUMENT',
    LINES = 'LINES'
};

function suggestParserType(file: FilePathInfo) {
    const checkList = [FileType.CSV, FileType.JSONL, FileType.PARQUET];
    const defaultType = FileType.CSV;

    for (const parserType of checkList) {
        const filter = FileTypeFilter.get(parserType) || (() => false);
        if (filter(file)) {
            return parserType;
        }
    }
    return defaultType;
}

type InputSerialization = {
    CSV?: {
        FileHeaderInfo: CSVHeaderOption,
        QuoteEscapeCharacter: string,
        RecordDelimiter: string,
        FieldDelimiter: string,
        QuoteCharacter: string,
        AllowQuotedRecordDelimiter: boolean
    },
    JSON?: {
        Type: JsonTypeOption
    },
    Parquet?: {}
};

type ColumnDef = {
    name: string,
    type: string,
    mapping: string
};

type Schema = {
    rowpath: string,
    columns: Array<ColumnDef>
};

class InputSerializationFactory {
    static suggestCSV(params: {
        sampleData: string,
        quoteChar?: string,
    }): InputSerialization {
        const { sampleData, quoteChar = '"' } = params;

        try {
            const recordDelimiter = xcSuggest.detectLineDelimiter(sampleData, quoteChar);
            if (recordDelimiter.length == 0) {
                throw 'Fail detecting record delimiter';
            }
            const fieldDelimiter = xcSuggest.detectFieldDelimiter(sampleData, recordDelimiter, quoteChar);
            return this.createCSV({
                recordDelimiter: recordDelimiter,
                fieldDelimiter: fieldDelimiter
            });
        } catch(_) {
            return this.createCSV({});
        }
    }

    static createCSV({
        headerOption = CSVHeaderOption.USE,
        quoteEscapeChar = '"',
        recordDelimiter = '\n',
        fieldDelimiter = ',',
        quoteChar = '"',
        allowQuotedRecordDelimiter = false
    }): InputSerialization {
        return { CSV: {
            FileHeaderInfo: headerOption,
            QuoteEscapeCharacter: quoteEscapeChar,
            RecordDelimiter: recordDelimiter,
            FieldDelimiter: fieldDelimiter,
            QuoteCharacter: quoteChar,
            AllowQuotedRecordDelimiter: allowQuotedRecordDelimiter
        }};
    }

    static createJSON(): InputSerialization {
        return { JSON: {
            Type: JsonTypeOption.DOCUMENT
        }};
    }

    static createJSONL(): InputSerialization {
        return { JSON: {
            Type: JsonTypeOption.LINES
        }};
    }

    static createParquet(): InputSerialization {
        return {
            Parquet: {}
        };
    }

    static getFileType(inputSerialization: InputSerialization) {
        const { CSV, JSON, Parquet } = inputSerialization || {};
        const types = new Set();
        if (CSV != null) {
            types.add(FileType.CSV);
        }
        if (JSON != null) {
            if (JSON.Type == JsonTypeOption.DOCUMENT) {
                types.add(FileType.JSON);
            } else if (JSON.Type == JsonTypeOption.LINES) {
                types.add(FileType.JSONL);
            }
        }
        if (Parquet != null) {
            types.add(FileType.PARQUET);
        }
        return types;
    }
}

const defaultInputSerialization = new Map<FileType, InputSerialization>([
    [FileType.CSV, InputSerializationFactory.createCSV({})],
    [FileType.JSON, InputSerializationFactory.createJSON()],
    [FileType.JSONL, InputSerializationFactory.createJSONL()],
    [FileType.PARQUET, InputSerializationFactory.createParquet()]
]);

const headerlessCSVOptions = new Set([
    CSVHeaderOption.IGNORE,
    CSVHeaderOption.NONE
]);
function isHeaderlessCSV(inputSerialization: InputSerialization): boolean {
    if (inputSerialization.CSV != null) {
        const { FileHeaderInfo } = inputSerialization.CSV;
        if (FileHeaderInfo != null) {
            return headerlessCSVOptions.has(FileHeaderInfo);
        }
    }
    return false;
}

const SchemaError = {
    INVALID_JSON: () => 'Invalid JSON format',
    NOT_ARRAY: () => 'Columns should be an array',
    EMPTY_ARRAY: () => 'Please define at least 1 column',
    NULL_COLUMN: () => 'Invalid column, column definition cannot be null',
    NO_ATTRIBUTE: (attrName) => `Missing attribute: "${attrName}"`,
    INVALID_VALUE: (attrName, value) => `Invalid value "${value}" for attribute "${attrName}"`,
    TOO_MANY_COLUMN: (numCol, limit) => `
        Current column count: (${numCol}). Please modify the schema to ensure column count is within the limit of ${limit}
    `,
    DUPE_COLUMN: (colName) => `Duplicated column name: ${colName}`
}

function assert(boolVal: boolean, genEx: () => string) {
    if (!boolVal) {
        throw genEx();
    }
}

type JsonSchema = {
    rowpath?: string,
    columns?: Array<{
        name?: string,
        type?: string,
        mapping?: string
    }>
};

// Find out all the duplicated mappings with different type
// Ex. {mapping: "a", type: "string"} & {mapping: "b", type: "number"}
function getDupeColumnsInSchema(jsonSchema: JsonSchema): Set<string> {
    const dupeMappings = new Set<string>();
    const seen = new Map<string, string>();
    try {
        for (const { mapping, type } of jsonSchema.columns) {
            if (dupeMappings.has(mapping)) {
                continue;
            }

            const oneType = seen.get(mapping);
            if (oneType == null) {
                seen.set(mapping, type);
            } else {
                if (oneType != type) {
                    dupeMappings.add(mapping);
                }
            }
        }
    } catch(e) {
        // Ignore error: this could happend if it's not a valid schema structure
    }
    return dupeMappings;
}

function getDupeColumnsInSchemaString(strSchema: string) {
    try {
        return getDupeColumnsInSchema(JSON.parse(strSchema));
    } catch(_) {
        return new Set<string>();
    }
}

function validateSchema(jsonSchema: JsonSchema): void {
    const { rowpath, columns } = jsonSchema || {};

    // Need rowpath
    assert(rowpath != null, () => SchemaError.NO_ATTRIBUTE('rowpath'));
    // Should be an array
    assert(Array.isArray(columns), SchemaError.NOT_ARRAY);
    // Array cannot be empty
    assert(columns.length > 0, SchemaError.EMPTY_ARRAY);
    // Number of columns limit
    const maxNumCols = 1000;
    assert(columns.length <= maxNumCols, () => SchemaError.TOO_MANY_COLUMN(columns.length, maxNumCols));

    const nameSet = new Set();
    for (const column of columns) {
        // Null check
        assert(column != null, SchemaError.NULL_COLUMN);

        const { name, type, mapping } = column;
        // Attribute check
        assert(name != null, () => SchemaError.NO_ATTRIBUTE('name'));
        assert(type != null, () => SchemaError.NO_ATTRIBUTE('type'));
        assert(mapping != null, () => SchemaError.NO_ATTRIBUTE('mapping'));
        // Value check
        assert(typeof name === 'string', () => SchemaError.INVALID_VALUE('name', name));
        assert(!nameSet.has(name), () => SchemaError.DUPE_COLUMN(name));
        assert(typeof type === 'string', () => SchemaError.INVALID_VALUE('type', type));
        assert(typeof mapping === 'string', () => SchemaError.INVALID_VALUE('mapping', mapping));

        nameSet.add(name);
    }
}

function validateSchemaString(
    strSchema: string
): Schema {
    let schema = null;

    // Check valid JSON
    try {
        schema = JSON.parse(strSchema);
    } catch(_) {
        throw SchemaError.INVALID_JSON();
    }

    validateSchema(schema);

    return schema;
}

function cleanSchema(schema) {
    try {
        let columns = [];
        schema.columns.forEach(col => {
            if (col.name === "" &&
                col.type === "" &&
                (col.mapping === "$." || col.mapping === ""))
            {
                return;
            }
            columns.push(col);
        });
        schema.columns = columns;
    } catch (_) {}
}

function unionSchemas(columns: Array<ColumnDef>) {
    const columnMap = new Map(columns.map((column) => [
        `${column.name}_${column.type}_${column.mapping}`,
        column
    ]));
    return columnMap.values();
}

enum ColumnType {
    Integer = 'DfInt64',
    Float = 'DfFloat64',
    String = 'DfString',
    Boolean = 'DfBoolean'
}

enum ColumnTypeString {
    Integer = 'Int64',
    Float = 'Float64',
    String = 'String',
    Boolean = 'Boolean'
}

const columnTypeToString = new Map([
    [ColumnType.Integer, ColumnTypeString.Integer],
    [ColumnType.Float, ColumnTypeString.Float],
    [ColumnType.Boolean, ColumnTypeString.Boolean],
    [ColumnType.String, ColumnTypeString.String]
]);

const columnStringToType = new Map([
    [ColumnTypeString.Integer, ColumnType.Integer],
    [ColumnTypeString.Float, ColumnType.Float],
    [ColumnTypeString.Boolean, ColumnType.Boolean],
    [ColumnTypeString.String, ColumnType.String]
]);

function getColumnStringFromType(type: string) {
    const str = columnTypeToString.get(type as ColumnType);
    return str || type;
}

function getColumnTypeFromString(typeString: string) {
    const type = columnStringToType.get(typeString as ColumnTypeString);
    return type || typeString
}

export {
    FileType, FileTypeFilter,
    FileTypeFilterFunction,
    Schema, ColumnDef,
    InputSerialization,
    InputSerializationFactory, defaultInputSerialization,
    isHeaderlessCSV,
    CSVHeaderOption,
    suggestParserType,
    validateSchemaString, validateSchema, cleanSchema,
    getDupeColumnsInSchemaString, getDupeColumnsInSchema,
    unionSchemas,
    ColumnType, getColumnStringFromType, getColumnTypeFromString
};
