// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  // xcalar custom code
  function wordRegexp(words) {
    return new RegExp("^((" + words.join(")|(") + "))\\b");
  }

  var keywords = wordRegexp(["pull", "map", "filter"]);
  var specialWords = wordRegexp(["true", "false", "True", "False",
    "TRUE", "FALSE", "NULL", "null", "Null"]);
  // end xcalar custom code

  CodeMirror.defineMode("spreadsheetCustom", function () {
    return {
      startState: function () {
        return {
          stringType: null,
          stack: []
        };
      },
      token: function (stream, state) {
        if (!stream) {
          return;
        } 

        //check for state changes
        if (state.stack.length === 0) {
          //strings
          if ((stream.peek() == '"') || (stream.peek() == "'")) {
            state.stringType = stream.peek();
            stream.next(); // Skip quote
            state.stack.unshift("string");
          }
        }

        //return state
        //stack has
        switch (state.stack[0]) {
        case "string":
          while (state.stack[0] === "string" && !stream.eol()) {
            if (stream.peek() === state.stringType) {
              stream.next(); // Skip quote
              state.stack.shift(); // Clear flag
            } else if (stream.peek() === "\\") {
              stream.next();
              stream.next();
            } else {
              stream.match(/^.[^\\\"\']*/);
            }
          }
          return "string";

        case "characterClass":
          while (state.stack[0] === "characterClass" && !stream.eol()) {
            if (!(stream.match(/^[^\]\\]+/) || stream.match(/^\\./))) {
              state.stack.shift();
            }
          }
          return "operator";
        }


        var peek = stream.peek();
        //no stack
        switch (peek) {
        case "[":
          stream.next();
          state.stack.unshift("characterClass");
          return "bracket";
        case ".":
          stream.next();
          return "operator";
        case "@":
          stream.next();
          return "variable-2";
        case "\\":
          stream.next();
          return "backslash";
        case ",":
          stream.next();
          return "comma";
        case ":":
          // stream.next();

          break;
          // return "udfColon";
        case "^":
          // for agg names
          break;
        case ";":
        case "*":
        case "-":
        case "+":
        case "<":
        case "/":
        case "=":
        case "&":
        case "!":
          stream.next();
          return "atom";
        case "$":
          stream.next();
          return "builtin";
        default:
          // find non-alphanumeric characters that arent brackets
          if(peek.match(/[^a-zA-Z\d\s:]/) &&
            ["[", "]", "(", ")", "{", "}"].indexOf(peek) === -1) {
            stream.next();
            return "unknown";
          }
        }

        // tag map, pull, filter, null, true, false
        if (stream.match(keywords, false)) {
            stream.match(/^[a-zA-Z_]\w*/);
            // ok if followed by paren or space
            if (stream.match(/(?=[\(:])/, false)) {
              return "xckeyword";
            } else {
              return "variable-2";
            }
          
        } else if (stream.match(specialWords, false)) {
            stream.match(/^[a-zA-Z_]\w*/);
            if (stream.match(/(?=[\(])/, false)) {
              return "keyword";
            } else {
              return "xcspecial";
            }
        }

        if (stream.match(/\d+/)) {
          if (stream.match(/^\w+/)) {
            return "error"; // 4sdf produces error
          } else {
            return "number";
          }
        } else if (stream.match(/^[a-zA-Z_^]\w*\:*\w*/)) { 
          if (stream.match(/(?=[\(])/, false)) {
            return "keyword";
          } else {
            return "variable-2";
          }    

        } else if (["[", "]", "(", ")", "{", "}"].indexOf(peek) != -1) {
          stream.next();
          return "bracket";
        } else if (!stream.eatSpace()) {
          stream.next();
        }
        return null;
      }
    };
  });

  CodeMirror.defineMIME("text/x-spreadsheet", "spreadsheetCustom");
});
