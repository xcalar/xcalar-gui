var antlr4 = require('antlr4/index');

// For XEval
var XEvalBaseLexer = require('./base/XEvalBaseLexer.js').XEvalBaseLexer;
var XEvalBaseParser = require('./base/XEvalBaseParser.js').XEvalBaseParser;
var XEvalVisitor = require('./XEvalVisitor.js').XEvalVisitor;
var XcErrorListener = require('./XcErrorListener').XcErrorListener;

class XEvalParser {
    static parseEvalStr(evalStr, throwFlag) {
        if (typeof evalStr !== "string" || evalStr.length === 0) {
            return {error: "Eval string not provided"};
        }
        var errorListener = new XcErrorListener();
        var chars = new antlr4.InputStream(evalStr);
        var lexer = new XEvalBaseLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new XEvalBaseParser(tokens);
        parser.addErrorListener(errorListener);
        parser.buildParseTrees = true;
        try {
            var tree = parser.expr();
            var visitor = new XEvalVisitor();
            return visitor.parseEvalStr(tree);
        } catch (e) {
            // thrown syntax errors by xcalar are not being handled in
            // XcErrorListener. XEvalParser.parseEvalStr expects {error: string}
            // if there's an error so we convert the syntax error into it.
            if (e instanceof SyntaxError && e.message) {
                e = {error: e.message};
            }
            if (throwFlag) {
                throw e;
            }
            return e;
        }
    }

    static getAllColumnNames(evalStr, throwFlag) {
        if (typeof evalStr !== "string" || evalStr.length === 0) {
            return {error: "Eval string not provided"};
        }
        var errorListener = new XcErrorListener();
        var chars = new antlr4.InputStream(evalStr);
        var lexer = new XEvalBaseLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new XEvalBaseParser(tokens);
        parser.addErrorListener(errorListener);
        parser.buildParseTrees = true;
        try {
            var tree = parser.expr();
            var visitor = new XEvalVisitor();
            return visitor.getAllColumnNames(tree);
        } catch (e) {
            // thrown syntax errors by xcalar are not being handled in
            // XcErrorListener. XEvalParser.parseEvalStr expects {error: string}
            // if there's an error so we convert the syntax error into it.
            if (e instanceof SyntaxError && e.message) {
                e = {error: e.message};
            }
            if (throwFlag) {
                throw e;
            }
            return e;
        }
    }

    static replaceColName(evalStr, colNameMap, aggregateNameMap, throwFlag) {
        if (evalStr === "") {
            return evalStr;
        } else if (typeof evalStr !== "string") {
            return {error: "Eval string not provided"};
        }
        var errorListener = new XcErrorListener();
        var chars = new antlr4.InputStream(evalStr);
        var lexer = new XEvalBaseLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new XEvalBaseParser(tokens);
        parser.addErrorListener(errorListener);
        parser.buildParseTrees = true;
        try {
            var tree = parser.expr();
            var visitor = new XEvalVisitor();
            return visitor.replaceColName(tree, colNameMap, aggregateNameMap);
        } catch (e) {
            // thrown syntax errors by xcalar are not being handled in
            // XcErrorListener. XEvalParser.parseEvalStr expects {error: string}
            // if there's an error so we convert the syntax error into it.
            if (e instanceof SyntaxError && e.message) {
                e = {error: e.message};
            }
            if (throwFlag) {
                throw e;
            }
            return e;
        }
    }

    static getAggNames(evalStr, throwFlag) {
        if (evalStr === "") {
            return [];
        } else if (typeof evalStr !== "string") {
            return {error: "Eval string not provided"};
        }
        var errorListener = new XcErrorListener();
        var chars = new antlr4.InputStream(evalStr);
        var lexer = new XEvalBaseLexer(chars);
        var tokens  = new antlr4.CommonTokenStream(lexer);
        var parser = new XEvalBaseParser(tokens);
        parser.addErrorListener(errorListener);
        parser.buildParseTrees = true;
        try {
            var tree = parser.expr();
            var visitor = new XEvalVisitor();
            visitor.getAggNames(tree);
            return visitor.aggNames;
        } catch (e) {
            // thrown syntax errors by xcalar are not being handled in
            // XcErrorListener. XEvalParser.parseEvalStr expects {error: string}
            // if there's an error so we convert the syntax error into it.
            if (e instanceof SyntaxError && e.message) {
                e = {error: e.message};
            }
            if (throwFlag) {
                throw e;
            }
            return e;
        }
    }
}
exports.XEvalParser = XEvalParser;
