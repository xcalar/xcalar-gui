enum SQLColumnType {
    "String" = "string",
    "Money" = "money",
    "Float" = "float",
    "Integer" = "int",
    "Boolean" = "bool",
    "Timestamp" = "timestamp"
}

enum SparkExpressions {
    // Expression mapping when there is mismatch between SQLCompiler and spark
}

enum SparkExprToXdf {
    // arithmetic.scala
    // "UnaryMinus" = null,
    // "UnaryPositive" = null, // Seems it's removed by spark
    "Abs" = "abs",
    "AbsNumeric" = "absNumeric",
    "AbsInteger" = "absInt",
    "Add" = "add",
    "Subtract" = "sub",
    "Multiply" = "mult",
    "AddInteger" = "addInteger",
    "SubtractInteger" = "subInteger",
    "MultiplyInteger" = "multInteger",
    "AddNumeric" = "addNumeric",
    "SubtractNumeric" = "subNumeric",
    "MultiplyNumeric" = "multNumeric",
    "Divide" = "div",
    "DivideNumeric" = "divNumeric",
    "Remainder" = "mod",
    // "Pmod" = null,
    // "Least" = null,
    // "Greatest" = null,
    // bitwisescala
    "BitwiseAnd" = "bitand",
    "BitwiseOr" = "bitor",
    "BitwiseXor" = "bitxor",
    // "BitwiseNot" = null,

    // Cast.scala
    // "Cast" = null, // NOTE~ This will be replaced
    "XcType.float" = "float", // Xcalar generated
    "XcType.int" = "int", // Xcalar generated
    "XcType.bool" = "bool", // Xcalar generated
    "XcType.money" = "money", // Xcalar generated
    "XcType.string" = "string", // Xcalar generated
    "XcType.timestamp" = "timestamp", // Xcalar generated

    // conditionalscala
    "If" = "if",
    "IfStr" = "ifStr", // Xcalar generated
    "IfNumeric" = "ifNumeric", // Xcalar generated
    // "CaseWhen" = null, // XXX we compile these to if and ifstr
    // "CaseWhenCodegen" = null, // XXX we compile these to if and ifstr

    // mathscala
    // "EulerNumber" = null,
    "Pi" = "pi",
    "Acos" = "acos",
    "Asin" = "asin",
    "Atan" = "atan",
    // "Cbrt" = null,
    "Ceil" = "ceil",
    "Cos" = "cos",
    "Cosh" = "cosh",
    // "Conv" = null,
    "Exp" = "exp",
    // "Expm1" = null,
    "Floor" = "floor",
    // "Factorial" = null,
    "Log" = "log",
    "Log2" = "log2",
    "Log10" = "log10",
    // "Log1p" = null,
    // "Rint" = null,
    // "Signum" = null,
    "Sin" = "sin",
    "Sinh" = "sinh",
    "Sqrt" = "sqrt",
    "Tan" = "tan",
    // "Cot" = null,
    "Tanh" = "tanh",
    "ToDegrees" = "degrees",
    "ToRadians" = "radians",
    // "Bin" = null,
    // "Hex" = null,
    // "Unhex" = null,
    "Atan2" = "atan2",
    "Pow" = "pow",
    "ShiftLeft" = "bitlshift",
    "ShiftRight" = "bitrshift",
    // "ShiftRightUnsigned" = null,
    // "Hypot" = null,
    // "Logarithm" = null,
    "Round" = "round",
    "RoundNumeric" = "roundNumeric",
    // "BRound" = null,

    // predicates.scala
    "Not" = "not",
    "In" = "in", // This is compiled to eq & or <= not true, we support in now
    "And" = "and",
    "Or" = "or",
    "EqualTo" = "eqNonNull",
    "EqualNullSafe" = "eq",
    "LessThan" = "lt",
    "LessThanOrEqual" = "le",
    "GreaterThan" = "gt",
    "GreaterThanOrEqual" = "ge",

    // randomscala,
    // "Rand" = null, // XXX a little different
    "GenRandom" = "genRandom", // Xcalar generated
    // "Randn" = null,

    // regexpscala
    "Like" = "like",
    "RLike" = "regex",
    // "StringSplit" = null,
    // "RegExpReplace" = null,
    // "RegExpExtract" = null,
    // stringscala
    "Concat" = "concat", // Concat an array
    // "ConcatWs" = null,
    // "Elt" = null, // XXX Given an array returns element at idx
    "Upper" = "upper",
    "Lower" = "lower",
    "Contains" = "contains",
    "StartsWith" = "startsWith",
    "EndsWith" = "endsWith",
    "StringReplace" = "replace",
    // "StringTranslate" = null,
    "FindInSet" = "findInSet",
    "StringTrim" = "strip",
    "StringTrimLeft" = "stripLeft",
    "StringTrimRight" = "stripRight",
    // "StringInstr" = null,
    "SubstringIndex" = "substringIndex",
    // "StringLocate" = null,
    "Find" = "find", // Xcalar generated
    "StringLPad" = "stringLPad",
    "StringRPad" = "stringRPad",
    // "ParseUrl" = null, // TODO
    // "FormatString" = null, // TODO
    "InitCap" = "initCap", // Different behavior
    "StringRepeat" = "repeat",
    "StringReverse" = "stringReverse",
    "Reverse" = "stringReverse",
    // "StringSpace" = null, // TODO
    "Substring" = "substring", // XXX 1-based index
    "XcSubstring" = "substring", // Xcalar generated
    "Right" = "right", // XXX right(str, 5) ==
                                  // substring(str, -5, 0)
    "Left" = "left", // XXX left(str, 4) == substring(str, 0, 4)
    "Length" = "len",
    "BitLength" = "bitLength",
    "OctetLength" = "octetLength",
    "Levenshtein" = "levenshtein",
    "SoundEx" = "soundEx",
    "Ascii" = "ascii",
    "Chr" = "chr",
    // "Base64" = null, // TODO
    // "UnBase64" = null, // TODO
    // "Decode" = null, // TODO
    // "Encode" = null, // TODO
    "FormatNumber" = "formatNumber",
    // "Sentences" = null, // XXX Returns an array.
    "IsString" = "isString", // Xcalar generated
    
    // nullExpressions.scala
    "IsNotNull" = "exists",
    // "IsNull" = null, // XXX we have to put not(exists)

    // datetimescala

    // Since we're not supporting DATE type, results of all DATE related
    // functions need to go through secondTraverse to be truncated for
    // displaying purpose
    "AddMonths" = "addDateInterval", // date
    // "CurrentDate" = null, // Spark
    // "CurrentTimestamp" = null, // Spark
    "DateAdd" = "addDateInterval", // date
    "DateDiff" = "dateDiff", // date
    "DateFormatClass" = "convertFromUnixTS",
    "DateSub" = "addDateInterval", // date
    "LastDay" = "lastDayOfMonth", // date
    "NextDay" = "nextDay", // date
    "MonthsBetween" = "monthsBetween",
    "TimeAdd" = "addIntervalString",
    "TimeSub" = "addIntervalString",

    "Year" = "datePart",
    "Quarter" = "datePart",
    "Month" = "datePart",
    "WeekOfYear" = "weekOfYear",
    "DayOfWeek" = "datePart",
    "DayOfMonth" = "datePart",
    "DayOfYear" = "dayOfYear",
    "Hour" = "timePart",
    "Minute" = "timePart",
    "Second" = "timePart",

    "FromUnixTime" = "timestamp",
    // "FromUTCTimestamp" = null, //"convertTimezone",
    "ParseToDate" = "timestamp",  // date
    "ParseToTimestamp" = "timestamp",
    "ToUnixTimestamp" = "timestamp", // Need int result
    // "ToUTCTimestamp" = null, //"toUTCTimestamp",
    "TruncDate" = "dateTrunc",  // date
    "TruncTimestamp" = "dateTrunc",
    "UnixTimestamp" = "timestamp",


    "aggregate.Sum" = "sum",
    "aggregate.SumInteger" = "sumInteger",
    "aggregate.SumNumeric" = "sumNumeric",
    "aggregate.Count" = "count",
    // "aggregate.CollectList" = null,
    "aggregate.ListAgg" = "listAgg", // Xcalar generated
    "aggregate.Max" = "max",
    "aggregate.MaxInteger" = "maxInteger",
    "aggregate.MaxNumeric" = "maxNumeric",
    "aggregate.Min" = "min",
    "aggregate.MinInteger" = "minInteger",
    "aggregate.MinNumeric" = "minNumeric",
    "aggregate.Average" = "avg",
    "aggregate.AverageNumeric" = "avgNumeric",
    "aggregate.StddevPop" = "stdevp",
    "aggregate.StddevSamp" = "stdev",
    "aggregate.VariancePop" = "varp",
    "aggregate.VarianceSamp" = "var",
    // "aggregate.CentralMomentAgg" = null,
    // "aggregate.Corr" = null,
    // "aggregate.CountMinSketchAgg" = null,
    // "aggregate.Covariance" = null,
    "aggregate.First" = "first", // Only used in aggregate
    // "aggregate.HyperLogLogPlusPlus" = null,
    "aggregate.Last" = "last", // Only used in aggregate
    "Rank" = "*rank", // These eight are for window functions in map
    "PercentRank" = "*percentRank",
    "DenseRank" = "*denseRank",
    "NTile" = "*nTile",
    "CumeDist" = "*cumeDist",
    "RowNumber" = "*rowNumber",
    "Lead" = "*lead",
    "Lag" = "*lag",
    // "aggregate.Percentile" = null,
    // "aggregate.PivotFirst" = null,
    // "aggregate.AggregateExpression" = null,
    // "ScalarSubquery" = null,
    // "XCEPassThrough" = null
};

enum SQLPrefix {
    udfPrefix = "XCEPASSTHROUGH",
    paramPrefix = "XCEPARAMETER", // "xceparameter(), cleanse will remove ()"
    logicalOpPrefix = "org.apache.spark.sql.catalyst.plans.logical",
    snowflakePredicatePrefix = "org.apache.spark.sql.execution.PushDownPlanWrapper",
}

enum SparkOperators {
    "Join" = "org.apache.spark.sql.catalyst.plans.logical.Join",
    "Union" = "org.apache.spark.sql.catalyst.plans.logical.Union",
    "Intersect" = "org.apache.spark.sql.catalyst.plans.logical.Intersect",
    "Except" = "org.apache.spark.sql.catalyst.plans.logical.Except"
}

enum OperatorTypes {
    "abs"= "float",
    "absNumeric"= "money",
    "absInt"= "int",
    "add"= "float",
    "addInteger"= "int",
    "addNumeric"= "money",
    "ceil"= "float",
    "div"= "float",
    "divNumeric"= "money",
    "exp"= "float",
    "floatCompare"= "int",
    "floor"= "float",
    "log"= "float",
    "log10"= "float",
    "log2"= "float",
    "mod"= "int",
    "mult"= "float",
    "multInteger"= "int",
    "multNumeric"= "money",
    "pow"= "float",
    "round"= "float",
    "sqrt"= "float",
    "sub"= "float",
    "subInteger"= "int",
    "subNumeric"= "money",
    "bitCount"= "int",
    "bitLength"= "int",
    "bitand"= "int",
    "bitlshift"= "int",
    "bitor"= "int",
    "bitrshift"= "int",
    "bitxor"= "int",
    "colsDefinedBitmap"= "int",
    "octetLength"= "int",
    "and"= "bool",
    "between"= "bool",
    "contains"= "bool",
    "endsWith"= "bool",
    "eq"= "bool",
    "eqNonNull"= "bool",
    "exists"= "bool",
    "ge"= "bool",
    "gt"= "bool",
    "in"= "bool",
    "isBoolean"= "bool",
    "isFloat"= "bool",
    "isInf"= "bool",
    "isInteger"= "bool",
    "isNull"= "bool",
    "isNumeric"= "money",
    "isString"= "bool",
    "le"= "bool",
    "like"= "bool",
    "lt"= "bool",
    "neq"= "bool",
    "not"= "bool",
    "or"= "bool",
    "regex"= "bool",
    "startsWith"= "bool",
    // "convertDate"= "string",
    // "convertFromUnixTS"= "String",
    // "convertToUnixTS"= "int",
    // "dateAddDay"= "string",
    // "dateAddInterval"= "string",
    // "dateAddMonth"= "string",
    // "dateAddYear"= "string",
    // "dateDiffday"= "int",
    // "ipAddrToInt"= "int",
    // "macAddrToInt"= "int",
    "dhtHash"= "int",
    "genRandom"= "int",
    "genUnique"= "int",
    "ifInt"= "int",
    "ifStr"= "string",
    "ifTimestamp"= "timestamp",
    "ifNumeric"= "money",
    "xdbHash"= "int",
    "ascii"= "int",
    "chr"= "string",
    "concat"= "string",
    "concatDelim"= "string",
    "countChar"= "int",
    "cut"= "string",
    "explodeString"= "string",
    "find"= "int",
    "findInSet"= "int",
    "formatNumber"= "string",
    "initCap"= "string",
    "len"= "int",
    "levenshtein"= "int",
    "lower"= "string",
    "repeat"= "string",
    "replace"= "string",
    "rfind"= "int",
    "soundEx"= "string",
    "stringLPad"= "string",
    "stringRPad"= "string",
    "stringReverse"= "string",
    "stringsPosCompare"= "bool",
    "strip"= "string",
    "stripLeft"= "string",
    "stripRight"= "string",
    "substring"= "string",
    "substringIndex"= "string",
    "upper"= "string",
    "wordCount"= "int",
    "addDateInterval"= "timestamp",
    "addIntervalString"= "timestamp",
    "addtimeInterval"= "timestamp",
    "convertFromUnixTS"= "string",
    "convertTimezone"= "timestamp",
    "dateDiff"= "int",
    "datePart"= "int",
    "dateTrunc"= "timestamp",
    "dayOfYear"= "int",
    "lastDayOfMonth"= "timestamp",
    "monthsBetween"= "float",
    "nextDay"= "timestamp",
    "timePart"= "int",
    "weekOfYear"= "int",
    "acos"= "float",
    "acosh"= "float",
    "asin"= "float",
    "asinh"= "float",
    "atan"= "float",
    "atan2"= "float",
    "atanh"= "float",
    "cos"= "float",
    "cosh"= "float",
    "degrees"= "float",
    "pi"= "float",
    "radians"= "float",
    "sin"= "float",
    "sinh"= "float",
    "tan"= "float",
    "tanh"= "float",
    "bool"= "bool",
    "float"= "float",
    "int"= "int",
    "money"= "money",
    "numeric"= "money",
    "string"= "string",
    "timestamp"= "timestamp",
    // "default:dayOfWeek"= "string",
    // "default:dayOfYear"= "string",
    // "default:weekOfYear"= "string",
    // "default:timeAdd"= "string",
    // "default:timeSub"= "string",
    // "default:toDate"= "string",
    // "default:convertToUnixTS"= "string",
    // "default:toUTCTimestamp"= "string",
    // "default:convertFormats"= "string",
    // "default:convertFromUnixTS"= "string",
    "avg"= "float",
    "avgNumeric"= "money",
    "count"= "int",
    "listAgg"= "string",
    "maxFloat"= "float",
    "maxInteger"= "int",
    "maxNumeric"= "money",
    "maxString"= "string",
    "maxTimestamp"= "timestamp",
    "minFloat"= "float",
    "minInteger"= "int",
    "minNumeric"= "money",
    "minString"= "string",
    "minTimestamp"= "timestamp",
    "sum"= "float",
    "sumInteger"= "int",
    "sumNumeric"= "money",
    "stdevp"= "float",
    "stdev"= "float",
    "varp"= "float",
    "var"= "float"
}

if (typeof global !== 'undefined') {
    global.SQLColumnType = SQLColumnType;
    global.SparkExpressions = SparkExpressions;
    global.SparkExprToXdf = SparkExprToXdf;
    global.SQLPrefix = SQLPrefix;
    global.SparkOperators = SparkOperators;
    global.OperatorTypes = OperatorTypes;
}