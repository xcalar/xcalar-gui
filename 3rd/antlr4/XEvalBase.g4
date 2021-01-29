grammar XEvalBase;
// Parser rules
query
    : expr EOF
    ;
expr
    : fn LPARENS fnArgs RPARENS
    | fn LPARENS RPARENS
    ;
fnArgs
    : arg (COMMA arg)*
    ;
arg
    : expr
    | integerLiteral
    | decimalLiteral
    | booleanLiteral
    | stringLiteral
    | columnArg
    | aggValue
    ;
fn
    : moduleName COLON fnName
    | fnName
    ;
moduleName
    : ALPHANUMERIC
    {if (xcHelper.checkParserNamePattern(ParserPatternCategory.UDFModule, $ALPHANUMERIC.text)) {
    throw SyntaxError('Invalid module name: ' + $ALPHANUMERIC.text);}}
    ;
fnName
    : ALPHANUMERIC
    {if (xcHelper.checkParserNamePattern(ParserPatternCategory.UDFFn, $ALPHANUMERIC.text)) {
    throw SyntaxError('Invalid udf name: ' + $ALPHANUMERIC.text);}}
    ;
columnArg
    : prefix DOUBLECOLON colElement
    | colElement
    ;
prefix
    : ALPHANUMERIC
    {if (xcHelper.checkParserNamePattern(ParserPatternCategory.TablePrefix, $ALPHANUMERIC.text)) {
    throw SyntaxError(xcHelper.checkParserNamePattern(ParserPatternCategory.TablePrefix, $ALPHANUMERIC.text));
    }}
    ;
colElement
    : colName
    | colElement DOT propertyName
    | colElement LBRACKET integerLiteral RBRACKET
    ;
colName
    : ALPHANUMERIC
    {if ($ALPHANUMERIC.text.toUpperCase() != "NONE" && xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnName, $ALPHANUMERIC.text)) {
    throw SyntaxError(xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnName, $ALPHANUMERIC.text));
    }}
    ;
propertyName
    : ALPHANUMERIC
    {if (xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnProperty, $ALPHANUMERIC.text)) {
    throw SyntaxError(xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnProperty, $ALPHANUMERIC.text));
    }}
    ;
aggValue
    : CARET ALPHANUMERIC
    {if (xcHelper.checkParserNamePattern(ParserPatternCategory.AggValue, $ALPHANUMERIC.text)) {
    throw SyntaxError(ErrTStr.InvalidAggName);
    }}
    ;
integerLiteral
    : INTEGER
    ;
decimalLiteral
    : DECIMAL
    | SCIENTIFICDECIMAL
    ;
stringLiteral
    : STRING
    ;
booleanLiteral
    : TRUE | FALSE
    ;

// Lexer rules
TRUE: T R U E;
FALSE: F A L S E;
COLON: ':';
DOUBLECOLON: '::';
DOT: '.';
COMMA: ',';
LPARENS: '(';
RPARENS: ')';
LBRACKET: '[';
RBRACKET: ']';
LCURLYBRACE: '{';
RCURLYBRACE: '}';
BACKSLASH: '\\';
LTSIGN: '<';
GTSIGN: '>';
CARET: '^';
DECIMAL: '-'? DIGIT+ '.' DIGIT+;
SCIENTIFICDECIMAL: ('+'|'-')? DIGIT+ ('.' DIGIT+)? E ('+'|'-')? DIGIT+; // Not a strict scientific decimal format
INTEGER: '-'? DIGIT+;
STRING: ('"' ( ~('"'|'\\') | ('\\' .) )* '"') | ('\'' ( ~('\''|'\\') | ('\\' .) )* '\'');
APOSTROPHE: '\'';
SINGLEQUOTE: '"';
ALPHANUMERIC: (ALPHANUMS | [_-] | '<' | '>') ((CHARALLOWED | ' ' | '\\.' | '\\[' | '\\]')* (CHARALLOWED | '\\.' | '\\[' | '\\]'))?;
fragment A : [aA]; // match either an 'a' or 'A'
fragment B : [bB];
fragment C : [cC];
fragment D : [dD];
fragment E : [eE];
fragment F : [fF];
fragment G : [gG];
fragment H : [hH];
fragment I : [iI];
fragment J : [jJ];
fragment K : [kK];
fragment L : [lL];
fragment M : [mM];
fragment N : [nN];
fragment O : [oO];
fragment P : [pP];
fragment Q : [qQ];
fragment R : [rR];
fragment S : [sS];
fragment T : [tT];
fragment U : [uU];
fragment V : [vV];
fragment W : [wW];
fragment X : [xX];
fragment Y : [yY];
fragment Z : [zZ];
fragment DIGIT: [0-9];
fragment ALPHAS: [a-zA-Z];
fragment ALPHANUMS: [a-zA-Z0-9];
fragment CHARALLOWED: ~('(' | ')' | '[' | ']' | '{' | '}' | '^' | '.' | ',' | ':' | '"' | '\\' | '\'' | ' ');
WS
    : [ \r\n\t]+ -> channel(HIDDEN)
    ;
UNRECOGNIZED
    : .
    ;