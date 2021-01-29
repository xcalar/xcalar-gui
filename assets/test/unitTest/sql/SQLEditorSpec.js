describe("SQL Editor Test", function() {
    it("should create an instance", function() {
        let editor = new SQLEditor();
        expect(editor).to.be.an.instanceof(SQLEditor);
    });

    it("should get editor", function() {
        let editor = new SQLEditor();
        let fakeEditor = {};
        editor._editor = fakeEditor;
        expect(editor.getEditor()).to.equal(fakeEditor);
    });

    it("should get selection", function() {
        let editor = new SQLEditor();
        let called = false;
        let fakeEditor = {
            getSelection: function() {
                called = true;
            }
        };
        editor._editor = fakeEditor;
        editor.getSelection();
        expect(called).to.be.true;
    });

    it("should get value", function() {
        let editor = new SQLEditor();
        let fakeEditor = {
            getValue: function() {
                return "test"
            }
        };
        editor._editor = fakeEditor;
        let res = editor.getValue();
        expect(res).to.equal("test");
    });

    it("should set value", function() {
        let editor = new SQLEditor();
        let res = null;
        let fakeEditor = {
            setValue: function(str) {
                res = str;
            }
        };
        editor._editor = fakeEditor;
        editor.setValue("test");
        expect(res).to.equal("test");
    });

    it("should refresh", function() {
        let editor = new SQLEditor();
        let called = false;
        let fakeEditor = {
            refresh: function() {
                called = true;
            }
        };
        editor._editor = fakeEditor;
        editor.refresh();
        expect(called).to.be.true;
    });

    it("should set up code mirror correctly", function() {
        let id = xcHelper.randName("test");
        let $textArea = $('<textarea id="' + id + '"></textarea>');
        $("#container").append($textArea);

        let editor = new SQLEditor(id);
        expect(editor.getEditor()).not.to.be.null;

        $textArea.remove();
    });

    it("_convertTextCase should conver to upper case", function() {
        let editor = new SQLEditor();
        let res = null;
        let fakeEditor = {
            getSelection: function() {
                return "test";
            },
            replaceSelection: function(text, option) {
                res = text
                expect(option).to.equal("around");
            }
        };
        editor._editor = fakeEditor;
        editor._convertTextCase(true);
        expect(res).to.equal("TEST");
    });

    it("_convertTextCase should conver to lower case", function() {
        let editor = new SQLEditor();
        let res = null;
        let fakeEditor = {
            getSelection: function() {
                return "TEST";
            },
            replaceSelection: function(text, option) {
                res = text
                expect(option).to.equal("around");
            }
        };
        editor._editor = fakeEditor;
        editor._convertTextCase(false);
        expect(res).to.equal("test");
    });

    it("_scrollLine should work", function() {
        let editor = new SQLEditor();
        let res = null;
        let fakeEditor = {
            getScrollInfo: function() {
                return {"top": 10};
            },
            defaultTextHeight: function() {
                return 1
            },
            scrollTo: function(option, height) {
                expect(option).to.be.null;
                res = height;
            }
        };
        editor._editor = fakeEditor;
        editor._scrollLine(true);
        expect(res).to.equal(9);
    });

    it("_scrollLine should work case 2", function() {
        let editor = new SQLEditor();
        let res = null;
        let fakeEditor = {
            getScrollInfo: function() {
                return {"top": 10};
            },
            defaultTextHeight: function() {
                return 1
            },
            scrollTo: function(option, height) {
                expect(option).to.be.null;
                res = height;
            }
        };
        editor._editor = fakeEditor;
        editor._scrollLine(false);
        expect(res).to.equal(11);
    });

    it("_insertLine should work", function() {
        let editor = new SQLEditor();
        let called = 0;
        let fakeEditor = {
            getCursor: function() {
                return {"line": 1};
            },
            replaceRange: function() {
                called++;
            },
            setCursor: function() {
                called++;
            },
            getLine: function() {
                called++;
            }
        };
        editor._editor = fakeEditor;
        editor._insertLine(true);
        expect(called).to.equal(2);
    });

    it("_insertLine should work case 2", function() {
        let editor = new SQLEditor();
        let called = 0;
        let fakeEditor = {
            getCursor: function() {
                return {"line": 1};
            },
            replaceRange: function() {
                called++;
            },
            setCursor: function() {
                called++;
            },
            getLine: function() {
                called++;
                return [];
            }
        };
        editor._editor = fakeEditor;
        editor._insertLine(false);
        expect(called).to.equal(3);
    });
});