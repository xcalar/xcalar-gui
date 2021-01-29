// Generated from XEvalBase.g4 by ANTLR 4.7.2
// jshint ignore: start
var antlr4 = require('antlr4/index');
var XEvalBaseVisitor = require('./XEvalBaseVisitor').XEvalBaseVisitor;

var grammarFileName = "XEvalBase.g4";


var serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786\u5964",
    "\u0003\u001b}\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004\t",
    "\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t\u0007\u0004",
    "\b\t\b\u0004\t\t\t\u0004\n\t\n\u0004\u000b\t\u000b\u0004\f\t\f\u0004",
    "\r\t\r\u0004\u000e\t\u000e\u0004\u000f\t\u000f\u0004\u0010\t\u0010\u0004",
    "\u0011\t\u0011\u0004\u0012\t\u0012\u0003\u0002\u0003\u0002\u0003\u0002",
    "\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0003\u0003\u0003\u0005\u00031\n\u0003\u0003\u0004",
    "\u0003\u0004\u0003\u0004\u0007\u00046\n\u0004\f\u0004\u000e\u00049\u000b",
    "\u0004\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005\u0003\u0005\u0003",
    "\u0005\u0003\u0005\u0005\u0005B\n\u0005\u0003\u0006\u0003\u0006\u0003",
    "\u0006\u0003\u0006\u0003\u0006\u0005\u0006I\n\u0006\u0003\u0007\u0003",
    "\u0007\u0003\u0007\u0003\b\u0003\b\u0003\b\u0003\t\u0003\t\u0003\t\u0003",
    "\t\u0003\t\u0005\tV\n\t\u0003\n\u0003\n\u0003\n\u0003\u000b\u0003\u000b",
    "\u0003\u000b\u0003\u000b\u0003\u000b\u0003\u000b\u0003\u000b\u0003\u000b",
    "\u0003\u000b\u0003\u000b\u0003\u000b\u0007\u000bf\n\u000b\f\u000b\u000e",
    "\u000bi\u000b\u000b\u0003\f\u0003\f\u0003\f\u0003\r\u0003\r\u0003\r",
    "\u0003\u000e\u0003\u000e\u0003\u000e\u0003\u000e\u0003\u000f\u0003\u000f",
    "\u0003\u0010\u0003\u0010\u0003\u0011\u0003\u0011\u0003\u0012\u0003\u0012",
    "\u0003\u0012\u0002\u0003\u0014\u0013\u0002\u0004\u0006\b\n\f\u000e\u0010",
    "\u0012\u0014\u0016\u0018\u001a\u001c\u001e \"\u0002\u0004\u0003\u0002",
    "\u0013\u0014\u0003\u0002\u0003\u0004\u0002w\u0002$\u0003\u0002\u0002",
    "\u0002\u00040\u0003\u0002\u0002\u0002\u00062\u0003\u0002\u0002\u0002",
    "\bA\u0003\u0002\u0002\u0002\nH\u0003\u0002\u0002\u0002\fJ\u0003\u0002",
    "\u0002\u0002\u000eM\u0003\u0002\u0002\u0002\u0010U\u0003\u0002\u0002",
    "\u0002\u0012W\u0003\u0002\u0002\u0002\u0014Z\u0003\u0002\u0002\u0002",
    "\u0016j\u0003\u0002\u0002\u0002\u0018m\u0003\u0002\u0002\u0002\u001a",
    "p\u0003\u0002\u0002\u0002\u001ct\u0003\u0002\u0002\u0002\u001ev\u0003",
    "\u0002\u0002\u0002 x\u0003\u0002\u0002\u0002\"z\u0003\u0002\u0002\u0002",
    "$%\u0005\u0004\u0003\u0002%&\u0007\u0002\u0002\u0003&\u0003\u0003\u0002",
    "\u0002\u0002\'(\u0005\n\u0006\u0002()\u0007\t\u0002\u0002)*\u0005\u0006",
    "\u0004\u0002*+\u0007\n\u0002\u0002+1\u0003\u0002\u0002\u0002,-\u0005",
    "\n\u0006\u0002-.\u0007\t\u0002\u0002./\u0007\n\u0002\u0002/1\u0003\u0002",
    "\u0002\u00020\'\u0003\u0002\u0002\u00020,\u0003\u0002\u0002\u00021\u0005",
    "\u0003\u0002\u0002\u000227\u0005\b\u0005\u000234\u0007\b\u0002\u0002",
    "46\u0005\b\u0005\u000253\u0003\u0002\u0002\u000269\u0003\u0002\u0002",
    "\u000275\u0003\u0002\u0002\u000278\u0003\u0002\u0002\u00028\u0007\u0003",
    "\u0002\u0002\u000297\u0003\u0002\u0002\u0002:B\u0005\u0004\u0003\u0002",
    ";B\u0005\u001c\u000f\u0002<B\u0005\u001e\u0010\u0002=B\u0005\"\u0012",
    "\u0002>B\u0005 \u0011\u0002?B\u0005\u0010\t\u0002@B\u0005\u001a\u000e",
    "\u0002A:\u0003\u0002\u0002\u0002A;\u0003\u0002\u0002\u0002A<\u0003\u0002",
    "\u0002\u0002A=\u0003\u0002\u0002\u0002A>\u0003\u0002\u0002\u0002A?\u0003",
    "\u0002\u0002\u0002A@\u0003\u0002\u0002\u0002B\t\u0003\u0002\u0002\u0002",
    "CD\u0005\f\u0007\u0002DE\u0007\u0005\u0002\u0002EF\u0005\u000e\b\u0002",
    "FI\u0003\u0002\u0002\u0002GI\u0005\u000e\b\u0002HC\u0003\u0002\u0002",
    "\u0002HG\u0003\u0002\u0002\u0002I\u000b\u0003\u0002\u0002\u0002JK\u0007",
    "\u0019\u0002\u0002KL\b\u0007\u0001\u0002L\r\u0003\u0002\u0002\u0002",
    "MN\u0007\u0019\u0002\u0002NO\b\b\u0001\u0002O\u000f\u0003\u0002\u0002",
    "\u0002PQ\u0005\u0012\n\u0002QR\u0007\u0006\u0002\u0002RS\u0005\u0014",
    "\u000b\u0002SV\u0003\u0002\u0002\u0002TV\u0005\u0014\u000b\u0002UP\u0003",
    "\u0002\u0002\u0002UT\u0003\u0002\u0002\u0002V\u0011\u0003\u0002\u0002",
    "\u0002WX\u0007\u0019\u0002\u0002XY\b\n\u0001\u0002Y\u0013\u0003\u0002",
    "\u0002\u0002Z[\b\u000b\u0001\u0002[\\\u0005\u0016\f\u0002\\g\u0003\u0002",
    "\u0002\u0002]^\f\u0004\u0002\u0002^_\u0007\u0007\u0002\u0002_f\u0005",
    "\u0018\r\u0002`a\f\u0003\u0002\u0002ab\u0007\u000b\u0002\u0002bc\u0005",
    "\u001c\u000f\u0002cd\u0007\f\u0002\u0002df\u0003\u0002\u0002\u0002e",
    "]\u0003\u0002\u0002\u0002e`\u0003\u0002\u0002\u0002fi\u0003\u0002\u0002",
    "\u0002ge\u0003\u0002\u0002\u0002gh\u0003\u0002\u0002\u0002h\u0015\u0003",
    "\u0002\u0002\u0002ig\u0003\u0002\u0002\u0002jk\u0007\u0019\u0002\u0002",
    "kl\b\f\u0001\u0002l\u0017\u0003\u0002\u0002\u0002mn\u0007\u0019\u0002",
    "\u0002no\b\r\u0001\u0002o\u0019\u0003\u0002\u0002\u0002pq\u0007\u0012",
    "\u0002\u0002qr\u0007\u0019\u0002\u0002rs\b\u000e\u0001\u0002s\u001b",
    "\u0003\u0002\u0002\u0002tu\u0007\u0015\u0002\u0002u\u001d\u0003\u0002",
    "\u0002\u0002vw\t\u0002\u0002\u0002w\u001f\u0003\u0002\u0002\u0002xy",
    "\u0007\u0016\u0002\u0002y!\u0003\u0002\u0002\u0002z{\t\u0003\u0002\u0002",
    "{#\u0003\u0002\u0002\u0002\t07AHUeg"].join("");


var atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

var decisionsToDFA = atn.decisionToState.map( function(ds, index) { return new antlr4.dfa.DFA(ds, index); });

var sharedContextCache = new antlr4.PredictionContextCache();

var literalNames = [ null, null, null, "':'", "'::'", "'.'", "','", "'('", 
                     "')'", "'['", "']'", "'{'", "'}'", "'\\'", "'<'", "'>'", 
                     "'^'", null, null, null, null, "'''", "'\"'" ];

var symbolicNames = [ null, "TRUE", "FALSE", "COLON", "DOUBLECOLON", "DOT", 
                      "COMMA", "LPARENS", "RPARENS", "LBRACKET", "RBRACKET", 
                      "LCURLYBRACE", "RCURLYBRACE", "BACKSLASH", "LTSIGN", 
                      "GTSIGN", "CARET", "DECIMAL", "SCIENTIFICDECIMAL", 
                      "INTEGER", "STRING", "APOSTROPHE", "SINGLEQUOTE", 
                      "ALPHANUMERIC", "WS", "UNRECOGNIZED" ];

var ruleNames =  [ "query", "expr", "fnArgs", "arg", "fn", "moduleName", 
                   "fnName", "columnArg", "prefix", "colElement", "colName", 
                   "propertyName", "aggValue", "integerLiteral", "decimalLiteral", 
                   "stringLiteral", "booleanLiteral" ];

function XEvalBaseParser (input) {
	antlr4.Parser.call(this, input);
    this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
    this.ruleNames = ruleNames;
    this.literalNames = literalNames;
    this.symbolicNames = symbolicNames;
    return this;
}

XEvalBaseParser.prototype = Object.create(antlr4.Parser.prototype);
XEvalBaseParser.prototype.constructor = XEvalBaseParser;

Object.defineProperty(XEvalBaseParser.prototype, "atn", {
	get : function() {
		return atn;
	}
});

XEvalBaseParser.EOF = antlr4.Token.EOF;
XEvalBaseParser.TRUE = 1;
XEvalBaseParser.FALSE = 2;
XEvalBaseParser.COLON = 3;
XEvalBaseParser.DOUBLECOLON = 4;
XEvalBaseParser.DOT = 5;
XEvalBaseParser.COMMA = 6;
XEvalBaseParser.LPARENS = 7;
XEvalBaseParser.RPARENS = 8;
XEvalBaseParser.LBRACKET = 9;
XEvalBaseParser.RBRACKET = 10;
XEvalBaseParser.LCURLYBRACE = 11;
XEvalBaseParser.RCURLYBRACE = 12;
XEvalBaseParser.BACKSLASH = 13;
XEvalBaseParser.LTSIGN = 14;
XEvalBaseParser.GTSIGN = 15;
XEvalBaseParser.CARET = 16;
XEvalBaseParser.DECIMAL = 17;
XEvalBaseParser.SCIENTIFICDECIMAL = 18;
XEvalBaseParser.INTEGER = 19;
XEvalBaseParser.STRING = 20;
XEvalBaseParser.APOSTROPHE = 21;
XEvalBaseParser.SINGLEQUOTE = 22;
XEvalBaseParser.ALPHANUMERIC = 23;
XEvalBaseParser.WS = 24;
XEvalBaseParser.UNRECOGNIZED = 25;

XEvalBaseParser.RULE_query = 0;
XEvalBaseParser.RULE_expr = 1;
XEvalBaseParser.RULE_fnArgs = 2;
XEvalBaseParser.RULE_arg = 3;
XEvalBaseParser.RULE_fn = 4;
XEvalBaseParser.RULE_moduleName = 5;
XEvalBaseParser.RULE_fnName = 6;
XEvalBaseParser.RULE_columnArg = 7;
XEvalBaseParser.RULE_prefix = 8;
XEvalBaseParser.RULE_colElement = 9;
XEvalBaseParser.RULE_colName = 10;
XEvalBaseParser.RULE_propertyName = 11;
XEvalBaseParser.RULE_aggValue = 12;
XEvalBaseParser.RULE_integerLiteral = 13;
XEvalBaseParser.RULE_decimalLiteral = 14;
XEvalBaseParser.RULE_stringLiteral = 15;
XEvalBaseParser.RULE_booleanLiteral = 16;


function QueryContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_query;
    return this;
}

QueryContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
QueryContext.prototype.constructor = QueryContext;

QueryContext.prototype.expr = function() {
    return this.getTypedRuleContext(ExprContext,0);
};

QueryContext.prototype.EOF = function() {
    return this.getToken(XEvalBaseParser.EOF, 0);
};

QueryContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitQuery(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.QueryContext = QueryContext;

XEvalBaseParser.prototype.query = function() {

    var localctx = new QueryContext(this, this._ctx, this.state);
    this.enterRule(localctx, 0, XEvalBaseParser.RULE_query);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 34;
        this.expr();
        this.state = 35;
        this.match(XEvalBaseParser.EOF);
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function ExprContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_expr;
    return this;
}

ExprContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ExprContext.prototype.constructor = ExprContext;

ExprContext.prototype.fn = function() {
    return this.getTypedRuleContext(FnContext,0);
};

ExprContext.prototype.LPARENS = function() {
    return this.getToken(XEvalBaseParser.LPARENS, 0);
};

ExprContext.prototype.fnArgs = function() {
    return this.getTypedRuleContext(FnArgsContext,0);
};

ExprContext.prototype.RPARENS = function() {
    return this.getToken(XEvalBaseParser.RPARENS, 0);
};

ExprContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitExpr(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ExprContext = ExprContext;

XEvalBaseParser.prototype.expr = function() {

    var localctx = new ExprContext(this, this._ctx, this.state);
    this.enterRule(localctx, 2, XEvalBaseParser.RULE_expr);
    try {
        this.state = 46;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,0,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 37;
            this.fn();
            this.state = 38;
            this.match(XEvalBaseParser.LPARENS);
            this.state = 39;
            this.fnArgs();
            this.state = 40;
            this.match(XEvalBaseParser.RPARENS);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 42;
            this.fn();
            this.state = 43;
            this.match(XEvalBaseParser.LPARENS);
            this.state = 44;
            this.match(XEvalBaseParser.RPARENS);
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function FnArgsContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_fnArgs;
    return this;
}

FnArgsContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnArgsContext.prototype.constructor = FnArgsContext;

FnArgsContext.prototype.arg = function(i) {
    if(i===undefined) {
        i = null;
    }
    if(i===null) {
        return this.getTypedRuleContexts(ArgContext);
    } else {
        return this.getTypedRuleContext(ArgContext,i);
    }
};

FnArgsContext.prototype.COMMA = function(i) {
	if(i===undefined) {
		i = null;
	}
    if(i===null) {
        return this.getTokens(XEvalBaseParser.COMMA);
    } else {
        return this.getToken(XEvalBaseParser.COMMA, i);
    }
};


FnArgsContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitFnArgs(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.FnArgsContext = FnArgsContext;

XEvalBaseParser.prototype.fnArgs = function() {

    var localctx = new FnArgsContext(this, this._ctx, this.state);
    this.enterRule(localctx, 4, XEvalBaseParser.RULE_fnArgs);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 48;
        this.arg();
        this.state = 53;
        this._errHandler.sync(this);
        _la = this._input.LA(1);
        while(_la===XEvalBaseParser.COMMA) {
            this.state = 49;
            this.match(XEvalBaseParser.COMMA);
            this.state = 50;
            this.arg();
            this.state = 55;
            this._errHandler.sync(this);
            _la = this._input.LA(1);
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function ArgContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_arg;
    return this;
}

ArgContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ArgContext.prototype.constructor = ArgContext;

ArgContext.prototype.expr = function() {
    return this.getTypedRuleContext(ExprContext,0);
};

ArgContext.prototype.integerLiteral = function() {
    return this.getTypedRuleContext(IntegerLiteralContext,0);
};

ArgContext.prototype.decimalLiteral = function() {
    return this.getTypedRuleContext(DecimalLiteralContext,0);
};

ArgContext.prototype.booleanLiteral = function() {
    return this.getTypedRuleContext(BooleanLiteralContext,0);
};

ArgContext.prototype.stringLiteral = function() {
    return this.getTypedRuleContext(StringLiteralContext,0);
};

ArgContext.prototype.columnArg = function() {
    return this.getTypedRuleContext(ColumnArgContext,0);
};

ArgContext.prototype.aggValue = function() {
    return this.getTypedRuleContext(AggValueContext,0);
};

ArgContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitArg(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ArgContext = ArgContext;

XEvalBaseParser.prototype.arg = function() {

    var localctx = new ArgContext(this, this._ctx, this.state);
    this.enterRule(localctx, 6, XEvalBaseParser.RULE_arg);
    try {
        this.state = 63;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,2,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 56;
            this.expr();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 57;
            this.integerLiteral();
            break;

        case 3:
            this.enterOuterAlt(localctx, 3);
            this.state = 58;
            this.decimalLiteral();
            break;

        case 4:
            this.enterOuterAlt(localctx, 4);
            this.state = 59;
            this.booleanLiteral();
            break;

        case 5:
            this.enterOuterAlt(localctx, 5);
            this.state = 60;
            this.stringLiteral();
            break;

        case 6:
            this.enterOuterAlt(localctx, 6);
            this.state = 61;
            this.columnArg();
            break;

        case 7:
            this.enterOuterAlt(localctx, 7);
            this.state = 62;
            this.aggValue();
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function FnContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_fn;
    return this;
}

FnContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnContext.prototype.constructor = FnContext;

FnContext.prototype.moduleName = function() {
    return this.getTypedRuleContext(ModuleNameContext,0);
};

FnContext.prototype.COLON = function() {
    return this.getToken(XEvalBaseParser.COLON, 0);
};

FnContext.prototype.fnName = function() {
    return this.getTypedRuleContext(FnNameContext,0);
};

FnContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitFn(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.FnContext = FnContext;

XEvalBaseParser.prototype.fn = function() {

    var localctx = new FnContext(this, this._ctx, this.state);
    this.enterRule(localctx, 8, XEvalBaseParser.RULE_fn);
    try {
        this.state = 70;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,3,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 65;
            this.moduleName();
            this.state = 66;
            this.match(XEvalBaseParser.COLON);
            this.state = 67;
            this.fnName();
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 69;
            this.fnName();
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function ModuleNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_moduleName;
    this._ALPHANUMERIC = null; // Token
    return this;
}

ModuleNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ModuleNameContext.prototype.constructor = ModuleNameContext;

ModuleNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

ModuleNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitModuleName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ModuleNameContext = ModuleNameContext;

XEvalBaseParser.prototype.moduleName = function() {

    var localctx = new ModuleNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 10, XEvalBaseParser.RULE_moduleName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 72;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (xcHelper.checkParserNamePattern(ParserPatternCategory.UDFModule, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError('Invalid module name: ' + (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text));}
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function FnNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_fnName;
    this._ALPHANUMERIC = null; // Token
    return this;
}

FnNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
FnNameContext.prototype.constructor = FnNameContext;

FnNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

FnNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitFnName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.FnNameContext = FnNameContext;

XEvalBaseParser.prototype.fnName = function() {

    var localctx = new FnNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 12, XEvalBaseParser.RULE_fnName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 75;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (xcHelper.checkParserNamePattern(ParserPatternCategory.UDFFn, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError('Invalid udf name: ' + (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text));}
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function ColumnArgContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_columnArg;
    return this;
}

ColumnArgContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColumnArgContext.prototype.constructor = ColumnArgContext;

ColumnArgContext.prototype.prefix = function() {
    return this.getTypedRuleContext(PrefixContext,0);
};

ColumnArgContext.prototype.DOUBLECOLON = function() {
    return this.getToken(XEvalBaseParser.DOUBLECOLON, 0);
};

ColumnArgContext.prototype.colElement = function() {
    return this.getTypedRuleContext(ColElementContext,0);
};

ColumnArgContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitColumnArg(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ColumnArgContext = ColumnArgContext;

XEvalBaseParser.prototype.columnArg = function() {

    var localctx = new ColumnArgContext(this, this._ctx, this.state);
    this.enterRule(localctx, 14, XEvalBaseParser.RULE_columnArg);
    try {
        this.state = 83;
        this._errHandler.sync(this);
        var la_ = this._interp.adaptivePredict(this._input,4,this._ctx);
        switch(la_) {
        case 1:
            this.enterOuterAlt(localctx, 1);
            this.state = 78;
            this.prefix();
            this.state = 79;
            this.match(XEvalBaseParser.DOUBLECOLON);
            this.state = 80;
            this.colElement(0);
            break;

        case 2:
            this.enterOuterAlt(localctx, 2);
            this.state = 82;
            this.colElement(0);
            break;

        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function PrefixContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_prefix;
    this._ALPHANUMERIC = null; // Token
    return this;
}

PrefixContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PrefixContext.prototype.constructor = PrefixContext;

PrefixContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

PrefixContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitPrefix(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.PrefixContext = PrefixContext;

XEvalBaseParser.prototype.prefix = function() {

    var localctx = new PrefixContext(this, this._ctx, this.state);
    this.enterRule(localctx, 16, XEvalBaseParser.RULE_prefix);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 85;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (xcHelper.checkParserNamePattern(ParserPatternCategory.TablePrefix, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError(xcHelper.checkParserNamePattern(ParserPatternCategory.TablePrefix, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text)));
            }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function ColElementContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_colElement;
    return this;
}

ColElementContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColElementContext.prototype.constructor = ColElementContext;

ColElementContext.prototype.colName = function() {
    return this.getTypedRuleContext(ColNameContext,0);
};

ColElementContext.prototype.colElement = function() {
    return this.getTypedRuleContext(ColElementContext,0);
};

ColElementContext.prototype.DOT = function() {
    return this.getToken(XEvalBaseParser.DOT, 0);
};

ColElementContext.prototype.propertyName = function() {
    return this.getTypedRuleContext(PropertyNameContext,0);
};

ColElementContext.prototype.LBRACKET = function() {
    return this.getToken(XEvalBaseParser.LBRACKET, 0);
};

ColElementContext.prototype.integerLiteral = function() {
    return this.getTypedRuleContext(IntegerLiteralContext,0);
};

ColElementContext.prototype.RBRACKET = function() {
    return this.getToken(XEvalBaseParser.RBRACKET, 0);
};

ColElementContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitColElement(this);
    } else {
        return visitor.visitChildren(this);
    }
};



XEvalBaseParser.prototype.colElement = function(_p) {
	if(_p===undefined) {
	    _p = 0;
	}
    var _parentctx = this._ctx;
    var _parentState = this.state;
    var localctx = new ColElementContext(this, this._ctx, _parentState);
    var _prevctx = localctx;
    var _startState = 18;
    this.enterRecursionRule(localctx, 18, XEvalBaseParser.RULE_colElement, _p);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 89;
        this.colName();
        this._ctx.stop = this._input.LT(-1);
        this.state = 101;
        this._errHandler.sync(this);
        var _alt = this._interp.adaptivePredict(this._input,6,this._ctx)
        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
            if(_alt===1) {
                if(this._parseListeners!==null) {
                    this.triggerExitRuleEvent();
                }
                _prevctx = localctx;
                this.state = 99;
                this._errHandler.sync(this);
                var la_ = this._interp.adaptivePredict(this._input,5,this._ctx);
                switch(la_) {
                case 1:
                    localctx = new ColElementContext(this, _parentctx, _parentState);
                    this.pushNewRecursionContext(localctx, _startState, XEvalBaseParser.RULE_colElement);
                    this.state = 91;
                    if (!( this.precpred(this._ctx, 2))) {
                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 2)");
                    }
                    this.state = 92;
                    this.match(XEvalBaseParser.DOT);
                    this.state = 93;
                    this.propertyName();
                    break;

                case 2:
                    localctx = new ColElementContext(this, _parentctx, _parentState);
                    this.pushNewRecursionContext(localctx, _startState, XEvalBaseParser.RULE_colElement);
                    this.state = 94;
                    if (!( this.precpred(this._ctx, 1))) {
                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 1)");
                    }
                    this.state = 95;
                    this.match(XEvalBaseParser.LBRACKET);
                    this.state = 96;
                    this.integerLiteral();
                    this.state = 97;
                    this.match(XEvalBaseParser.RBRACKET);
                    break;

                } 
            }
            this.state = 103;
            this._errHandler.sync(this);
            _alt = this._interp.adaptivePredict(this._input,6,this._ctx);
        }

    } catch( error) {
        if(error instanceof antlr4.error.RecognitionException) {
	        localctx.exception = error;
	        this._errHandler.reportError(this, error);
	        this._errHandler.recover(this, error);
	    } else {
	    	throw error;
	    }
    } finally {
        this.unrollRecursionContexts(_parentctx)
    }
    return localctx;
};


function ColNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_colName;
    this._ALPHANUMERIC = null; // Token
    return this;
}

ColNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
ColNameContext.prototype.constructor = ColNameContext;

ColNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

ColNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitColName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.ColNameContext = ColNameContext;

XEvalBaseParser.prototype.colName = function() {

    var localctx = new ColNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 20, XEvalBaseParser.RULE_colName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 104;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if ((localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text).toUpperCase() != "NONE" && xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnName, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError(xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnName, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text)));
            }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function PropertyNameContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_propertyName;
    this._ALPHANUMERIC = null; // Token
    return this;
}

PropertyNameContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
PropertyNameContext.prototype.constructor = PropertyNameContext;

PropertyNameContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

PropertyNameContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitPropertyName(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.PropertyNameContext = PropertyNameContext;

XEvalBaseParser.prototype.propertyName = function() {

    var localctx = new PropertyNameContext(this, this._ctx, this.state);
    this.enterRule(localctx, 22, XEvalBaseParser.RULE_propertyName);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 107;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnProperty, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError(xcHelper.checkParserNamePattern(ParserPatternCategory.ColumnProperty, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text)));
            }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function AggValueContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_aggValue;
    this._ALPHANUMERIC = null; // Token
    return this;
}

AggValueContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
AggValueContext.prototype.constructor = AggValueContext;

AggValueContext.prototype.CARET = function() {
    return this.getToken(XEvalBaseParser.CARET, 0);
};

AggValueContext.prototype.ALPHANUMERIC = function() {
    return this.getToken(XEvalBaseParser.ALPHANUMERIC, 0);
};

AggValueContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitAggValue(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.AggValueContext = AggValueContext;

XEvalBaseParser.prototype.aggValue = function() {

    var localctx = new AggValueContext(this, this._ctx, this.state);
    this.enterRule(localctx, 24, XEvalBaseParser.RULE_aggValue);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 110;
        this.match(XEvalBaseParser.CARET);
        this.state = 111;
        localctx._ALPHANUMERIC = this.match(XEvalBaseParser.ALPHANUMERIC);
        if (xcHelper.checkParserNamePattern(ParserPatternCategory.AggValue, (localctx._ALPHANUMERIC===null ? null : localctx._ALPHANUMERIC.text))) {
            throw SyntaxError(ErrTStr.InvalidAggName);
            }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function IntegerLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_integerLiteral;
    return this;
}

IntegerLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
IntegerLiteralContext.prototype.constructor = IntegerLiteralContext;

IntegerLiteralContext.prototype.INTEGER = function() {
    return this.getToken(XEvalBaseParser.INTEGER, 0);
};

IntegerLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitIntegerLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.IntegerLiteralContext = IntegerLiteralContext;

XEvalBaseParser.prototype.integerLiteral = function() {

    var localctx = new IntegerLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 26, XEvalBaseParser.RULE_integerLiteral);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 114;
        this.match(XEvalBaseParser.INTEGER);
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function DecimalLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_decimalLiteral;
    return this;
}

DecimalLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
DecimalLiteralContext.prototype.constructor = DecimalLiteralContext;

DecimalLiteralContext.prototype.DECIMAL = function() {
    return this.getToken(XEvalBaseParser.DECIMAL, 0);
};

DecimalLiteralContext.prototype.SCIENTIFICDECIMAL = function() {
    return this.getToken(XEvalBaseParser.SCIENTIFICDECIMAL, 0);
};

DecimalLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitDecimalLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.DecimalLiteralContext = DecimalLiteralContext;

XEvalBaseParser.prototype.decimalLiteral = function() {

    var localctx = new DecimalLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 28, XEvalBaseParser.RULE_decimalLiteral);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 116;
        _la = this._input.LA(1);
        if(!(_la===XEvalBaseParser.DECIMAL || _la===XEvalBaseParser.SCIENTIFICDECIMAL)) {
        this._errHandler.recoverInline(this);
        }
        else {
        	this._errHandler.reportMatch(this);
            this.consume();
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function StringLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_stringLiteral;
    return this;
}

StringLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
StringLiteralContext.prototype.constructor = StringLiteralContext;

StringLiteralContext.prototype.STRING = function() {
    return this.getToken(XEvalBaseParser.STRING, 0);
};

StringLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitStringLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.StringLiteralContext = StringLiteralContext;

XEvalBaseParser.prototype.stringLiteral = function() {

    var localctx = new StringLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 30, XEvalBaseParser.RULE_stringLiteral);
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 118;
        this.match(XEvalBaseParser.STRING);
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


function BooleanLiteralContext(parser, parent, invokingState) {
	if(parent===undefined) {
	    parent = null;
	}
	if(invokingState===undefined || invokingState===null) {
		invokingState = -1;
	}
	antlr4.ParserRuleContext.call(this, parent, invokingState);
    this.parser = parser;
    this.ruleIndex = XEvalBaseParser.RULE_booleanLiteral;
    return this;
}

BooleanLiteralContext.prototype = Object.create(antlr4.ParserRuleContext.prototype);
BooleanLiteralContext.prototype.constructor = BooleanLiteralContext;

BooleanLiteralContext.prototype.TRUE = function() {
    return this.getToken(XEvalBaseParser.TRUE, 0);
};

BooleanLiteralContext.prototype.FALSE = function() {
    return this.getToken(XEvalBaseParser.FALSE, 0);
};

BooleanLiteralContext.prototype.accept = function(visitor) {
    if ( visitor instanceof XEvalBaseVisitor ) {
        return visitor.visitBooleanLiteral(this);
    } else {
        return visitor.visitChildren(this);
    }
};




XEvalBaseParser.BooleanLiteralContext = BooleanLiteralContext;

XEvalBaseParser.prototype.booleanLiteral = function() {

    var localctx = new BooleanLiteralContext(this, this._ctx, this.state);
    this.enterRule(localctx, 32, XEvalBaseParser.RULE_booleanLiteral);
    var _la = 0; // Token type
    try {
        this.enterOuterAlt(localctx, 1);
        this.state = 120;
        _la = this._input.LA(1);
        if(!(_la===XEvalBaseParser.TRUE || _la===XEvalBaseParser.FALSE)) {
        this._errHandler.recoverInline(this);
        }
        else {
        	this._errHandler.reportMatch(this);
            this.consume();
        }
    } catch (re) {
    	if(re instanceof antlr4.error.RecognitionException) {
	        localctx.exception = re;
	        this._errHandler.reportError(this, re);
	        this._errHandler.recover(this, re);
	    } else {
	    	throw re;
	    }
    } finally {
        this.exitRule();
    }
    return localctx;
};


XEvalBaseParser.prototype.sempred = function(localctx, ruleIndex, predIndex) {
	switch(ruleIndex) {
	case 9:
			return this.colElement_sempred(localctx, predIndex);
    default:
        throw "No predicate with index:" + ruleIndex;
   }
};

XEvalBaseParser.prototype.colElement_sempred = function(localctx, predIndex) {
	switch(predIndex) {
		case 0:
			return this.precpred(this._ctx, 2);
		case 1:
			return this.precpred(this._ctx, 1);
		default:
			throw "No predicate with index:" + predIndex;
	}
};


exports.XEvalBaseParser = XEvalBaseParser;
