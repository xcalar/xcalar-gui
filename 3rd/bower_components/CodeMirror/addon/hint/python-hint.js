(function () {
  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, _keywords, getToken) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.

    if (!/^[\w$_]*$/.test(token.string)) {
        token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                         className: token.string == ":" ? "python-type" : null};
    }
    if (!context) var context = [];
    context.push(tprop);
    var completionList = getCompletions(token, context, editor);
    // completionList = completionList.sort();
    //prevent autocomplete for last word, instead show dropdown with one word
    if(completionList.length == 1) {
      completionList.push({displayText: " ", 
        text: " ",
        className  : "python empty"});
    }

    return {list: completionList,
            from: CodeMirror.Pos(cur.line, token.start),
            to: CodeMirror.Pos(cur.line, token.end)};
  }

  CodeMirror.pythonHint = function(editor) {
    return scriptHint(editor, pythonKeywordsU, function (e, cur) {return e.getTokenAt(cur);});
  };

  var pythonKeywords = "False class finally is return None continue for lambda try True def from nonlocal while and del global not with as elif if or yield assert else import pass break except in raise";
  var pythonKeywordsL = pythonKeywords.split(" ");
  var pythonKeywordsU = pythonKeywords.toUpperCase().split(" ");

  var pythonBuiltins = "abs dict help min setattr all dir hex next slice any divmod id object sorted ascii enumerate input oct staticmethod bin eval int open str bool exec isinstance ord sum bytearray filter issubclass pow super bytes float iter print tuple callable format len property type chr frozenset list range vars classmethod getattr locals repr zip compile globals map reversed __import__ complex hasattr max round delattr hash memoryview set";
  var pythonBuiltinsL = pythonBuiltins.split(" ").join("() ").split(" ");
  var pythonBuiltinsU = pythonBuiltins.toUpperCase().split(" ").join("() ").split(" ");

  function getCompletions(token, context, editor) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str.indexOf(start) == 0 && !arrayContains(found, str)) {
        found.push({
        displayText: str, 
        text: str,
        className  : "python",
        hint: autocompleteSelect});
      }
    }

    function gatherCompletions(_obj) {
        if (_obj.trim().length === 0) {
          return;
        }
        forEach(pythonBuiltinsL, maybeAdd);
        forEach(pythonBuiltinsU, maybeAdd);
        forEach(pythonKeywordsL, maybeAdd);
        forEach(pythonKeywordsU, maybeAdd);
        found.sort(function(a, b) {
          if (a.displayText === "def" || a.displayText === "return") {
            return  -1;
          } else if (b.displayText === "def" || b.displayText === "return") {
            return 1;
          }
          return a.displayText.length - b.displayText.length;
        });

        var seen = {};
        for (var i = 0; i < found.length; i++) {
          seen[found[i].displayText] = true;
        }   
        var word = /[\w$]+/;
        var range = 500;
        var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
        var curWord = _obj;

        var list = [];
       
        var re = new RegExp(word.source, "g");
        for (var dir = -1; dir <= 1; dir += 2) {
          var line = cur.line, endLine = Math.min(Math.max(line + dir * range, editor.firstLine()), editor.lastLine()) + dir;
          for (; line != endLine; line += dir) {
            var text = editor.getLine(line), m;
            if (text.trim()[0] === "#") {// skip comments
              continue;
            }
            while (m = re.exec(text)) {
              if (line == cur.line && m[0] === curWord) continue;
              if ((!curWord || m[0].lastIndexOf(curWord, 0) == 0) && !Object.prototype.hasOwnProperty.call(seen, m[0])) {
                if (editor.getTokenTypeAt({line: line, ch: text.indexOf(m[0])}) !==
                  "comment") {
                  seen[m[0]] = true;
                  list.push({
                      displayText: m[0], 
                      text: m[0],
                      className  : "python inCode",
                  });
                }
                
              }
            }
          }
        }
        list.sort(function(a, b) {
          return a.displayText.length - b.displayText.length;
        });
        found = list.concat(found);
        // do not show hint if only hint is an exact match
        if (found.length === 1 && curWord === found[0].text) {
            found = [];
        }
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;

      // if (obj.type == "variable")
      //     base = obj.string;
      if(obj.type == "variable-3")
          base = ":" + obj.string;
      else {
        base = obj.string;
      }

      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    return found;
  }

   function autocompleteSelect(cm, data, completion) {
      var text = completion.templateTwo || completion.text;
      cm.replaceRange(text, data.from, data.to, "complete");
      if (text.charAt(text.length - 1) === ")") {
        cm.setCursor(data.from.line, data.from.ch + text.length - 1);
      }
  }
})();
