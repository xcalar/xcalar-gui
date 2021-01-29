var antlr4 = require('antlr4/index');

function XcErrorListener() {
    antlr4.error.ErrorListener.call(this);
    return this;
}
XcErrorListener.prototype = Object.create(antlr4.error.ErrorListener.prototype);
XcErrorListener.prototype.constructor = XcErrorListener;

XcErrorListener.prototype.syntaxError = function(_recognizer, _offendingSymbol, line, column, msg, e) {
    const searchString = "at '<EOF>'";
    const position = msg.length - searchString.length;
    const lastIndex = msg.indexOf(searchString, position);
    if (lastIndex !== -1 && lastIndex === position) {
        msg = msg.slice(0, lastIndex);
        msg += "at the end of the eval string";
    }
    throw {error: 'line ' + line + ':' + column + ' ' + msg};
};

exports.XcErrorListener = XcErrorListener;