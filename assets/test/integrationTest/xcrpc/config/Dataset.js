const nation = {
    sourceArgsList: [{
        targetName: "Default Shared Root",
        path: "/netstore/datasets/tpch_sf1_notrail/nation.tbl",
        fileNamePattern: "",
        recursive: false
    }],
    parseArgs: {
        parserFnName: "default:parseCsv",
        parserArgJson: "{\"recordDelim\":\"\\n\",\"fieldDelim\":\"|\",\"isCRLF\":false,\"linesToSkip\":1,\"quoteDelim\":\"\\\"\",\"hasHeader\":true,\"schemaFile\":\"\",\"schemaMode\":\"loadInput\"}",
        allowRecordErrors: false,
        allowFileErrors: false,
        fileNameFieldName: "",
        recordNumFieldName: "",
        schema:[
            { sourceColumn: "N_NATIONKEY", destColumn: "N_NATIONKEY", columnType: 4 },
            { sourceColumn: "N_NAME", destColumn: "N_NAME", columnType: 1 },
            { sourceColumn: "N_REGIONKEY", destColumn: "N_REGIONKEY", columnType: 4 },
            { sourceColumn: "N_COMMENT", destColumn: "N_COMMENT", columnType: 1 }
        ]
    },
    size: 10737418240
};

module.exports = {
    nation: nation
};