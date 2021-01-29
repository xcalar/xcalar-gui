describe("MonitorConfig Test", function() {
    let $card;
    let id;
    let card;

    before(function() {
        id = xcHelper.randName("test");
        let html =
        '<div id="' + id + '">' +
            '<div class="toggleSize header">' +
                '<button class="headerBtn"></button>' +
            '</div>' +
            '<div class="content configTable">' +
                '<div class="placeholder"></div>' +
            '</div>' +
        '</div>';

        $card = $(html);
        $("#container").append($card);
        card = new MonitorConfig(id);
    });

    it("should create correct instance", function() {
        expect(card).to.be.an.instanceof(MonitorConfig);
    });

    it("should refresh params", function(done) {
        let oldFunc = XcalarGetConfigParams;
        let called = false;
        XcalarGetConfigParams = () => {
            called = true;
            return PromiseHelper.resolve({
                parameter: [{
                    paramName: "test",
                    visible: true,
                    paramValue: "val",
                    changeable: true,
                    restartRequired: true
                }, {
                    paramName: "test2",
                    visible: true,
                    paramValue: "val2"
                }]
            });
        };

        card.refreshParams(true)
        .then(function() {
            expect(called).to.be.true;
            expect($card.find(".formRow").length).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarGetConfigParams = oldFunc;
            $card.find(".formRow").remove();
        });
    });

    it("should refresh params should handle error case", function(done) {
        let oldFunc = XcalarGetConfigParams;
        let called = false;
        XcalarGetConfigParams = () => {
            called = true;
            return PromiseHelper.resolve(null);
        };

        card.refreshParams(false)
        .then(function() {
            done("fail");
        })
        .fail(function() {
            expect(called).to.be.true;
            done();
        })
        .always(function() {
            XcalarGetConfigParams = oldFunc;
        });
    });

    it("_resetAllDefaultParams should work", function() {
        let oldVal = "testVal";
        let $row = $('<div class="formRow nameIsSet">' +
                        '<input class="curVal">' +
                        '<input class="newVal">' +
                    '</div>');
        $card.find(".content").append($row);
        $row.find(".curVal").val(oldVal);
        $row.find(".newVal").val("abc");
        card._resetAllDefaultParams();
        expect($row.find(".newVal").val()).to.equal(oldVal);
        $row.remove();
    });

    it("_resetDefaultParam should work", function() {
        let $row = $('<div class="formRow nameIsSet">' +
                        '<input class="paramName" value="test">' +
                        '<input class="newVal">' +
                    '</div>');
        let oldCache = card._paramsCache;
        card._paramsCache = {
            "test": {
                paramName: "test",
                defaultValue: "(null)"
            }
        };
        $row.find(".newVal").val("abc");
        card._resetDefaultParam($row);
        expect($row.find(".newVal").val()).to.equal("");
        $row.remove();
        card._paramsCache = oldCache;
    });

    it("_resetDefaultParam should not work if param not exist", function() {
        let $row = $('<div class="formRow nameIsSet">' +
                        '<input class="paramName" value="test">' +
                        '<input class="newVal">' +
                    '</div>');
        let oldCache = card._paramsCache;
        card._paramsCache = {
            "test2": {
                paramName: "test2",
                defaultValue: "(null)"
            }
        };
        $row.find(".newVal").val("abc");
        card._resetDefaultParam($row);
        expect($row.find(".newVal").val()).to.equal("abc");
        $row.remove();
        card._paramsCache = oldCache;
    });

    it("remove row should work", function() {
        let $row = $('<div class="formRow nameIsSet">' +
                        '<button class="removeRow"></button>' +
                    '</div>');
        $card.find(".content").append($row);
        $row.find(".removeRow").click();
        expect($card.find(".formRow").length).to.equal(0);
        $row.remove();
    });

    it("toggle headerBtn should trigger resize event", function() {
        let test = null;
        card
        .on("minimize", () => { test = false; })
        .on("maximize", () => { test = true; });

        // maximize
        $btn = $card.find(".headerBtn");
        $btn.addClass("minimize");
        $btn.click();
        expect(test).to.be.false;
        // minimize
        $btn.removeClass("minimize");
        $btn.click();
        expect(test).to.be.true;
    });

    it("_addInputRow should work", function() {
        $card.find(".formRow").remove();
        card._addInputRow();
        expect($card.find(".formRow").length).to.equal(1);
        $card.find(".formRow").remove();
    });

    describe("_submitParamName", function() {
        let oldStatusBox;
        let test;

        before(function() {
            card._paramsCache = {
                "test": {
                    paramName: "test",
                    paramValue: "old",
                    restartRequired: true,
                    changeable: true
                }
            };
            oldStatusBox = StatusBox.show;
            StatusBox.show = () => { test = true; };
        });

        beforeEach(function() {
            test = false;
        });

        it("should show error in invalid param name", function() {
            let $input = $('<input value="invalid">');
            card._submitParamName($input, false);
            expect(test).to.equal(true);
        });

        it("should show error in already exist case", function() {
            let $row = $('<input data-value="test">');
            $card.find(".content").append($row);
            let $input = $('<input value="test">');
            card._submitParamName($input, false);
            expect(test).to.equal(true);
            $row.remove();
        });

        it("should change value", function() {
            let $row = $('<div class="formRow">' +
                            '<input class="paramName" value="test">' +
                            '<input class="newVal">' +
                        '</div>');
            card._submitParamName($row.find(".paramName"), false);
            expect(test).to.equal(false);
            expect($row.find(".newVal").val()).to.equal("old");
        });

        it("should not change value if it's uncahngeable", function() {
            card._paramsCache.test.changeable = false
            let $row = $('<div class="formRow">' +
                            '<input class="paramName" value="test">' +
                            '<input class="newVal">' +
                        '</div>');
            card._submitParamName($row.find(".paramName"), false);
            expect(test).to.equal(false);
            expect($row.hasClass("uneditable")).to.equal(true);
        });

        after(function() {
            StatusBox.show = oldStatusBox;
        });
    });

    describe("_submidForm", function() {
        let oldRefresh;

        before(function() {
            oldRefresh = card.refreshParams
            card.refreshParams = () => PromiseHelper.resolve();
        });

        it("should submit", function(done) {
            card._paramsCache = {
                "test": {
                    paramName: "test",
                    paramValue: "old",
                    restartRequired: true
                }
            };
            let $row = $('<div class="formRow nameIsSet">' +
                            '<input class="paramName" value="test">' +
                            '<input class="newVal" value="new">' +
                        '</div>');
            $card.find(".content").append($row);
            let oldSet = XcalarSetConfigParams;
            let oldAlert = Alert.show;
            let called = 0;
            XcalarSetConfigParams = () => {
                called++;
                return PromiseHelper.resolve();
            };
            Alert.show = () => { called++; };

            card._submitForm()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetConfigParams = oldSet;
                Alert.show = oldAlert;
                $row.remove();
            });
        });

        it("should submit with no start case", function(done) {
            card._paramsCache = {
                "test": {
                    paramName: "test",
                    paramValue: "old",
                    restartRequired: false
                }
            };
            let $row = $('<div class="formRow nameIsSet">' +
                            '<input class="paramName" value="test">' +
                            '<input class="newVal" value="new">' +
                        '</div>');
            $card.find(".content").append($row);
            let oldSet = XcalarSetConfigParams;
            let oldAlert = xcUIHelper.showSuccess;
            let called = 0;
            XcalarSetConfigParams = () => {
                called++;
                return PromiseHelper.resolve();
            };
            xcUIHelper.showSuccess = () => { called++; };

            card._submitForm()
            .then(function() {
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarSetConfigParams = oldSet;
                xcUIHelper.showSuccess = oldAlert;
                $row.remove();
            });
        });

        it("should handle no new change case", function(done) {
            card._paramsCache = {
                "test": {
                    paramName: "test",
                    paramValue: "old",
                    restartRequired: true
                }
            };
            let $row = $('<div class="formRow nameIsSet">' +
                            '<input class="paramName" value="test">' +
                            '<input class="newVal" value="old">' +
                        '</div>');
            $card.find(".content").append($row);
            let oldAlert = xcUIHelper.showSuccess
            let called = 0;
            xcUIHelper.showSuccess = () => { called++; };

            card._submitForm()
            .then(function() {
                expect(called).to.equal(1);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                xcUIHelper.showSuccess = oldAlert;
                $row.remove();
            });
        });

        it("should handle error case", function(done) {
            card._paramsCache = {
                "test": {
                    paramName: "test",
                    paramValue: "old",
                    restartRequired: true
                }
            };
            let $row = $('<div class="formRow nameIsSet">' +
                            '<input class="paramName" value="invalid">' +
                            '<input class="newVal" value="new">' +
                        '</div>');
            $card.find(".content").append($row);
            let oldAlert = StatusBox.show;
            let called = 0;
            StatusBox.show = () => { called++; };

            card._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(called).to.equal(1);
                done();
            })
            .always(function() {
                StatusBox.show = oldAlert;
                $row.remove();
            });
        });

        it("should handle failure", function(done) {
            card._paramsCache = {
                "test": {
                    paramName: "test",
                    paramValue: "old",
                    restartRequired: true
                }
            };
            let $row = $('<div class="formRow nameIsSet">' +
                            '<input class="paramName" value="test">' +
                            '<input class="newVal" value="new">' +
                        '</div>');
            $card.find(".content").append($row);
            let oldSet = XcalarSetConfigParams;
            let oldAlert = Alert.error;
            let called = 0;
            XcalarSetConfigParams = () => {
                called++;
                return PromiseHelper.reject({error: "test"});
            };
            Alert.error = () => { called++; };

            card._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                expect(called).to.equal(2);
                done();
            })
            .always(function() {
                XcalarSetConfigParams = oldSet;
                Alert.error = oldAlert;
                $row.remove();
            });
        });

        after(function() {
            card.refreshParams = oldRefresh; 
        });
    });

    after(function() {
        $card.remove();
        StatusBox.forceHide();
    });
});