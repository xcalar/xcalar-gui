// Generated from XEvalBase.g4 by ANTLR 4.7.2
// jshint ignore: start
var antlr4 = require('antlr4/index');

// This class defines a complete generic visitor for a parse tree produced by XEvalBaseParser.

function XEvalBaseVisitor() {
	antlr4.tree.ParseTreeVisitor.call(this);
	return this;
}

XEvalBaseVisitor.prototype = Object.create(antlr4.tree.ParseTreeVisitor.prototype);
XEvalBaseVisitor.prototype.constructor = XEvalBaseVisitor;

// Visit a parse tree produced by XEvalBaseParser#query.
XEvalBaseVisitor.prototype.visitQuery = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#expr.
XEvalBaseVisitor.prototype.visitExpr = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#fnArgs.
XEvalBaseVisitor.prototype.visitFnArgs = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#arg.
XEvalBaseVisitor.prototype.visitArg = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#fn.
XEvalBaseVisitor.prototype.visitFn = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#moduleName.
XEvalBaseVisitor.prototype.visitModuleName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#fnName.
XEvalBaseVisitor.prototype.visitFnName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#columnArg.
XEvalBaseVisitor.prototype.visitColumnArg = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#prefix.
XEvalBaseVisitor.prototype.visitPrefix = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#colElement.
XEvalBaseVisitor.prototype.visitColElement = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#colName.
XEvalBaseVisitor.prototype.visitColName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#propertyName.
XEvalBaseVisitor.prototype.visitPropertyName = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#aggValue.
XEvalBaseVisitor.prototype.visitAggValue = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#integerLiteral.
XEvalBaseVisitor.prototype.visitIntegerLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#decimalLiteral.
XEvalBaseVisitor.prototype.visitDecimalLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#stringLiteral.
XEvalBaseVisitor.prototype.visitStringLiteral = function(ctx) {
  return this.visitChildren(ctx);
};


// Visit a parse tree produced by XEvalBaseParser#booleanLiteral.
XEvalBaseVisitor.prototype.visitBooleanLiteral = function(ctx) {
  return this.visitChildren(ctx);
};



exports.XEvalBaseVisitor = XEvalBaseVisitor;