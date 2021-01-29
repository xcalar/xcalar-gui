var SqlBaseVisitor = require('./base/SqlBaseVisitor.js').SqlBaseVisitor;
var SqlBaseParser = require('./base/SqlBaseParser.js').SqlBaseParser;
class SqlVisitor extends SqlBaseVisitor{
    constructor() {
        super();
        this.tableIdentifiers = new Set();
        this.namedQueries = [];
        this.statements = [];
        this.sqlFunctions = {};
        this.funcStructMap = {};
        this.tempNameList = [];
    }
    visitTables(ctx) {
        if (ctx instanceof SqlBaseParser.TableIdentifierContext) {
            this.tableIdentifiers.add(ctx.getText());
        } else if (ctx instanceof SqlBaseParser.NamedQueryContext) {
            if (ctx.children[0] instanceof SqlBaseParser.IdentifierContext) {
                this.namedQueries.push(ctx.children[0].getText());
            } else {
                throw "failed";
            }
        }
        if (ctx.children) {
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitTables(ctx.children[i]);
            }
        }
    };
    visitStatements(ctx) {
        if (ctx instanceof SqlBaseParser.StatementContext) {
            if (ctx.getText()) {
                this.statements.push(this.__getTextWithSpace(ctx).trim());
            }
        }
        if (ctx.children) {
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitStatements(ctx.children[i]);
            }
        }
    };
    getFunctions(ctx) {
        var self = this;
        if (ctx instanceof SqlBaseParser.TableIdentifierWithFuncContext) {
            if (ctx.getText().indexOf("(") === -1) {
                return ctx.getText().toUpperCase();
            }
            this.sqlFunctions[ctx.getText().toUpperCase()] = this.__getFunctionStruct(ctx);
            return this.sqlFunctions[ctx.getText().toUpperCase()].newTableName;
        } else if (ctx.getChildCount() === 0) {
            return ctx.getText();
        } else if (ctx.children) {
            return ctx.children.map(function(child) {
                return self.getFunctions(child);
            }).join(" ");
        }
    };
    getPreStatements(ctx) {
        var self = this;
        var retStruct = {args: []};
        // Currently only support basic show tables / describe table
        if (ctx.getChildCount() >= 2 && ctx.children[0].getText().toUpperCase()
            === "SHOW" && ctx.children[1].getText().toUpperCase() === "TABLES") {
            retStruct.type = "showTables";
        } else if (ctx.getChildCount() >= 2 &&
            ctx.children[0].getText().toUpperCase() === "DESCRIBE" &&
            ctx.children[1].getText().toUpperCase() != "SQLFUNCTION" &&
            ctx.children[1].getText().toUpperCase() != "DATABASE") {
            for (var i = 1; i < ctx.getChildCount(); i++) {
                if (ctx.children[i] instanceof SqlBaseParser.TableIdentifierContext) {
                    var tableName = ctx.children[i].table.getText().toUpperCase();
                    retStruct.type = "describeTable";
                    retStruct.args.push(tableName);
                }
            }
        } else {
            retStruct.type = "select";
        }
        return retStruct;
    };
    __getTextWithSpace(ctx) {
        var self = this;
        if (ctx.getChildCount() === 0) {
            return ctx.getText();
        } else {
            return ctx.children.map(function(child) {
                return self.__getTextWithSpace(child);
            }).join(" ");
        }
    };
    __getFunctionStruct(ctx) {
        var self = this;
        if (self.funcStructMap[ctx.getText().toUpperCase()]) {
            return self.funcStructMap[ctx.getText().toUpperCase()];
        }
        var retStruct = {funcName: undefined, arguments: [], newTableName: undefined};
        var pattern = /(?![A-Za-z0-9_-])./g;
        var tempTableName = ctx.getText().toUpperCase().split(pattern)
                            .filter((str) => str !== "").join("_")
                            + "_" + Math.floor(Math.random()*100000);
        while (self.tempNameList.indexOf(tempTableName) != -1) {
            tempTableName = tempTableName + "_" + Math.floor(Math.random()*100000);
        }
        self.tempNameList.push(tempTableName);
        retStruct.newTableName = tempTableName;
        for (var i = 0; i < ctx.children.length; i++) {
            if (ctx.children[i] instanceof SqlBaseParser.SqlFuncIdentifierContext) {
                retStruct.funcName = ctx.children[i].getText().toUpperCase();
            } else if (ctx.children[i] instanceof
                            SqlBaseParser.TableIdentifierWithFuncContext) {
                var argumentElement = {};
                if (ctx.children[i].getText().indexOf("(") === -1) {
                    argumentElement[ctx.children[i].getText().toUpperCase()]
                                    = ctx.children[i].getText().toUpperCase();
                } else {
                    argumentElement[ctx.children[i].getText().toUpperCase()]
                                    = self.__getFunctionStruct(ctx.children[i]);
                }
                retStruct.arguments.push(argumentElement);
            }
        }
        self.funcStructMap[ctx.getText().toUpperCase()] = retStruct;
        return retStruct;
    };
}
if (typeof exports !== "undefined") {
    exports.SqlVisitor = SqlVisitor;
}