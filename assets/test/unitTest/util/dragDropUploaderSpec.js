describe("DragDropUploader Test", function() {
    var $container;
    var testObj;
    var ddUploader;
    before(function() {
        $container = $('<div id="xcTest"></div>');
        testObj = {
            onDrop: function() {

            },
            onError: function() {

            }
        }
    });
    describe("new uploader", function() {
        it("new uploader should attach droparea", function() {
            ddUploader = new DragDropUploader({
                $container: $container,
                text: "Drop here",
                onDrop: function() {
                    testObj.onDrop.apply(this, arguments);
                },
                onError: function() {
                    testObj.onError.apply(this, arguments);
                }
            });
            expect($container.find(".xc-dragDropArea").length).to.equal(1);
        });
        it("drag enter should increment drag count", function() {
            expect(ddUploader.dragCount).to.equal(0);
            expect($container.find(".xc-dragDropArea").hasClass('entering')).to.be.false;
            var e = jQuery.Event("dragenter", {originalEvent: {
                dataTransfer: {
                    types: ["Files"]
                }
            }});
            $container.trigger(e);
            expect(ddUploader.dragCount).to.equal(1);
            expect($container.find(".xc-dragDropArea").hasClass('entering')).to.be.true;
        });
        it("drag over should change dropeffect", function() {
            var dataTransfer = {
                    effectAllowed: "something"
                };
            var e = jQuery.Event("dragover", {originalEvent: {
                dataTransfer: dataTransfer
            }});
            $container.trigger(e);
            expect(dataTransfer.effectAllowed).to.equal("copy");
        });
        it("dragleave should decrement drag count", function() {
            expect(ddUploader.dragCount).to.equal(1);
            var e = jQuery.Event("dragleave", {originalEvent: {
                dataTransfer: {
                    types: ["Files"]
                }
            }});
            $container.trigger(e);
            expect(ddUploader.dragCount).to.equal(0);
            expect($container.find(".xc-dragDropArea").hasClass('entering')).to.be.false;
        });

        it("drop should trigger callback", function() {
            var called = false;
            testObj.onDrop = function() {
                called = true;
            };
            var e = jQuery.Event("drop", {originalEvent: {
                dataTransfer: {
                    types: ["Files"],
                    files: ["test"],
                    items: [{
                        webkitGetAsEntry: function() {
                            return null;
                        }
                    }]
                }
            }});
            $container.trigger(e);
            expect(called).to.be.true;
        });

        it("drop should trigger error callback", function() {
            var called = false;
            testObj.onError = function() {
                called = true;
            };
            var e = jQuery.Event("drop", {originalEvent: {
                dataTransfer: {
                    types: ["Files"],
                    files: ["test"],
                    items: [{
                        webkitGetAsEntry: function() {
                            return {isDirectory: true};
                        }
                    }]
                }
            }});
            $container.trigger(e);
            expect(called).to.be.true;
        });
        it("drop without file should not trigger callbacks", function() {
            var called = false;
            testObj.onError = function() {
                called = true;
            };
            var called2 = false;
            testObj.onDrop = function() {
                called2 = true;
            };
            var e = jQuery.Event("drop", {originalEvent: {
                dataTransfer: {
                    types: ["Files"],
                    files: []
                }
            }});
            $container.trigger(e);
            expect(called).to.be.false;
            expect(called2).to.be.false;
        });
        it("drop with multiple files should trigger error callback", function() {
            var called = false;
            testObj.onError = function() {
                called = true;
            };
            var e = jQuery.Event("drop", {originalEvent: {
                dataTransfer: {
                    types: ["Files"],
                    files: ["test", "test2"],
                    items: [{
                        webkitGetAsEntry: function() {
                            return null;
                        }
                    }]
                }
            }});
            $container.trigger(e);
            expect(called).to.be.true;
        });
        it("toggling should remove droppable class", function() {
            expect($container.hasClass("xc-fileDroppable")).to.be.true;
            ddUploader.toggle();
            expect($container.hasClass("xc-fileDroppable")).to.be.false;
        });
    });
});