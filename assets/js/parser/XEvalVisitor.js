var XEvalBaseVisitor = require('./base/XEvalBaseVisitor.js').XEvalBaseVisitor;
var XEvalBaseParser = require('./base/XEvalBaseParser.js').XEvalBaseParser;

class XEvalVisitor extends XEvalBaseVisitor{
    constructor() {
        super();
        this.expressions = [];
        this.fns = [];
        this.func = {fnName: "", args: [], type: "fn"};
        this.aggNames = [];
    }

    parseEvalStr(ctx) {
        if (ctx instanceof XEvalBaseParser.ExprContext) {
            parseEvalStrHelper(ctx, this.func);
            return this.func.args[0];
        } else {
            return this.func;
        }

        function parseEvalStrHelper(ctx, func) {
            if (ctx instanceof XEvalBaseParser.ExprContext) {
                const newFunc = {
                    fnName: "",
                    args: [],
                    type: "fn"
                };
                func.args.push(newFunc);
                func = newFunc;

                for (i = 0; i < ctx.children.length; i++) {
                    const child = ctx.children[i];
                    if (child instanceof XEvalBaseParser.FnContext) {
                        func.fnName = child.getText();
                        break;
                    }
                }
            } else if (ctx instanceof XEvalBaseParser.ArgContext &&
                !(ctx.children[0] instanceof XEvalBaseParser.ExprContext)) {

                const child = ctx.children[0];
                let value = child.getText();
                let type = child.parser.ruleNames[child.ruleIndex];
                if (type === "columnArg") {
                    if (value.toUpperCase() === "NONE") {
                        type = "None";
                    } else if (DagNodeInput.checkValidParamBrackets(value, true)) {
                        type = "paramArg";
                    }
                }

                func.args.push({
                    value: value,
                    type: type
                });
                return;
            }

            if (ctx.children) {
                for (var i = 0; i < ctx.children.length; i++) {
                    parseEvalStrHelper(ctx.children[i], func);
                }
            }

            return func;
        }
    };

    visitExpr(ctx) {
        if (ctx instanceof XEvalBaseParser.ExprContext) {
            if (ctx.getText()) {
                this.expressions.push(this.__getTextWithSpace(ctx).trim());
            }
        }
        if (ctx.children) {
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitExpr(ctx.children[i]);
            }
        }
    };

    visitFn(ctx) {
        if (ctx instanceof XEvalBaseParser.FnContext) {
            if (ctx.getText()) {
                this.fns.push(this.__getTextWithSpace(ctx).trim());
            }
        }
        if (ctx.children) {
            for (let i = 0; i < ctx.children.length; i++) {
                this.visitFn(ctx.children[i]);
            }
        }
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

    getAllColumnNames(ctx) {
        var columnNames = [];

        function getAllColumnNamesHelper(ctx) {
            if (ctx instanceof XEvalBaseParser.ColumnArgContext) {
                if (columnNames.indexOf(ctx.getText()) === -1) {
                    columnNames.push(ctx.getText());
                }
            } else if (ctx.children) {
                for (var i = 0; i < ctx.children.length; i++) {
                    getAllColumnNamesHelper(ctx.children[i]);
                }
            }
        }

        getAllColumnNamesHelper(ctx);
        return columnNames;
    }

    replaceColName(ctx, colNameMap, aggregateNameMap) {
        var self = this;
        if (ctx instanceof XEvalBaseParser.AggValueContext) {
            return aggregateNameMap[ctx.getText()] || ctx.getText();
        } else if (ctx instanceof XEvalBaseParser.ColumnArgContext) {
            return colNameMap[ctx.getText()] || ctx.getText();
        } else if (ctx.getChildCount() === 0) {
            return ctx.getText();
        } else {
            return ctx.children.map(function(child) {
                return self.replaceColName(child, colNameMap, aggregateNameMap);
            }).join("");
        }
    }

    getAggNames(ctx) {
        var self = this;
        if (ctx instanceof XEvalBaseParser.AggValueContext) {
            var aggName = ctx.getText().substring(1);
            if (self.aggNames.indexOf(aggName) === -1) {
                self.aggNames.push(aggName);
            }
        } else if (ctx.getChildCount() !== 0) {
            for (let i = 0; i < ctx.children.length; i++) {
                self.getAggNames(ctx.children[i]);
            }
        }
    }
}
if (typeof exports !== "undefined") {
    exports.XEvalVisitor = XEvalVisitor;
}