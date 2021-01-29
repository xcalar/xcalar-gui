describe("Datastore-DSTargetManger Test", function() {
    var testTarget;
    var getNumTargets = function() {
        return Number($(".numDSTargets").eq(0).text());
    };

    before(function(done) {
        UnitTest.onMinMode();
        DSTargetManager.refreshTargets()
        .always(() => {
            done();
        });
    });

    describe("Public API Test", function() {
        it("DSTargetManager.refreshTargets", function(done) {
            DSTargetManager.refreshTargets()
            .then(function() {
                var numTargets = getNumTargets();
                // at least has 1 default targets
                expect(numTargets).to.be.at.least(1);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("DSTargetManager.getTarget should work", function() {
            var res = DSTargetManager.getTarget("Default Shared Root");
            expect(res).not.to.be.null;
            expect(res).to.be.an("object");
        });

        it("DSTargetManager.isGeneratedTarget should work", function() {
            var res = DSTargetManager.isGeneratedTarget("Default Shared Root");
            expect(res).to.be.false;
        });

        it("DSTargetManager.isPreSharedTarget should work", function() {
            var res = DSTargetManager.isPreSharedTarget("Default Shared Root");
            expect(res).to.be.false;
        });

        it("DSTargetManager.getConnectors should work", function() {
            let res = DSTargetManager.getConnectors("test");
            expect(res).to.be.an("array");
        });

        it("DSTargetManager.getTargetTypeList should work", function(done) {
            var $targetTypeList = $("#dsTarget-type");
            $targetTypeList.find("ul").empty();

            DSTargetManager.getTargetTypeList()
            .then(function() {
                expect($targetTypeList.find("li").length).be.above(0);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("DSTargetManager.typeId should work", function() {
            let id = DSTargetManager.S3Connector;
            let html = DSTargetManager.renderConnectorConfig(id);
            // has 5 formRow
            expect(html.split("formRow").length).to.equal(6);
        });

        it("DSTargetManager.getAvailableS3Buckets should work", function() {
            expect(DSTargetManager.getAvailableS3Buckets()).to.be.an("array");
        });
    });

    describe("Create S3 Target Test", function() {
        let oldStatus;

        before(function() {
            oldStatus = StatusBox.show;
            StatusBox.show = () => {};
        });

        it("should fail with invalid name", function(done) {
            let $name = $('<input value="">');
            DSTargetManager.createConnector("test", $name, $(), $())
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.undefined;
                done();
            });
        });

        it("should fail with params", function(done) {
            let name = xcHelper.randName("test");
            let $name = $('<input value="' + name + '">');
            let $params = $('<div>' +
                                '<div class="formRow">' +
                                    '<input value="">' +
                                '</div>' +
                            '</div>');
            $("#container").append($params);

            DSTargetManager.createConnector("test", $name, $params, $())
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.undefined;
                done();
            })
            .always(function() {
                $params.remove();
            });
        });

        it("should create target", function(done) {
            let name = xcHelper.randName("test");
            let $name = $('<input value="' + name + '">');
            let $params = $('<div>' +
                                '<div class="formRow">' +
                                    '<input value="arg">' +
                                '</div>' +
                            '</div>');
            $("#container").append($params);
            let oldCreate = XcalarTargetCreate;
            let oldRefresh = DSTargetManager.refreshTargets;
            let called = false;
            XcalarTargetCreate = () => {
                called = true;
                return PromiseHelper.resolve();
            };
            DSTargetManager.refreshTargets = () => PromiseHelper.resolve();

            DSTargetManager.createConnector("test", $name, $params, $())
            .then(function(targetName) {
                expect(called).to.be.true;
                expect(targetName).to.equal(name);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                XcalarTargetCreate = oldCreate;
                DSTargetManager.refreshTargets = oldRefresh;
                $params.remove();
            });
        });

        after(function() {
            StatusBox.show = oldStatus;
        });
    });

    describe("Create Target Form Test", function() {
        before(function() {
            var $targetButton = $("#targetButton");
            if (!$targetButton.hasClass("active")) {
                $targetButton.click();
            }

            testTarget = xcHelper.randName("target");
            $("#datastoreMenu").removeClass("noAdmin");
            $("#datastorePanel").removeClass("noAdmin");
        });

        it("should show create target view", function() {
            var $targetCreateCard = $("#dsTarget-create-card");
            $targetCreateCard.addClass("xc-hidden");
            $("#dsTarget-create").click();
            expect($targetCreateCard.hasClass("xc-hidden"))
            .to.be.false;
        });

        it("should reset the form", function() {
            var $input = $("#dsTarget-name");
            $input.val("test");
            $("#dsTarget-reset").click();
            expect($input.val()).to.be.empty;
        });

        it("should select type list", function() {
            var $targetTypeList = $("#dsTarget-type");
            var $li = $targetTypeList.find('li[data-id="shared"]');
            expect($li.length).to.equal(1);
            $li.trigger(fakeEvent.mouseup);
            expect($targetTypeList.find(".text").val())
            .to.equal("Shared File System");
            // click again has no side-affect
            $li.trigger(fakeEvent.mouseup);
            expect($targetTypeList.find(".text").val())
            .to.equal("Shared File System");
        });

        it("should validte form", function() {
            var $name = $("#dsTarget-name");
            $name.val("");
            $("#dsTarget-submit").click();
            UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
        });

        it("should not use reserved name in form", function() {
            var connector = DSTargetManager.getS3Connector();
            var $name = $("#dsTarget-name");
            $name.val(connector);
            $("#dsTarget-submit").click();
            UnitTest.hasStatusBoxWithError(DSTargetTStr.NoReservedName);
        });

        // it("should submit and create a target", function(done) {
        //     var numTargets = getNumTargets();
        //     $("#dsTarget-name").val(testTarget);
        //     $("#dsTarget-param-0").val("netstore/");
        //     $("#dsTarget-submit").click();

        //     var testFunc = function() {
        //         var currentNumTargets = getNumTargets();
        //         return (currentNumTargets - numTargets) >= 1;
        //     };

        //     UnitTest.testFinish(testFunc)
        //     .then(function() {
        //         var $grid = $('#dsTarget-list .grid-unit[data-name="' +
        //                       testTarget + '"]');
        //         expect($grid.length).to.equal(1);
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     });
        // });

        after(function() {
            if (!Admin.isAdmin()) {
                $("#datastoreMenu").addClass("noAdmin");
                $("#datastorePanel").addClass("noAdmin");
            }
        })
    });

    describe("Target Info Form Test", function() {
        // var $grid;

        // before(function() {
        //     $grid = $('#dsTarget-list .grid-unit[data-name="' +
        //                 testTarget + '"]');
        // });

        // it("should click to refresh targets", function() {
        //     var oldFunc = DSTargetManager.refreshTargets;
        //     var test = false;
        //     DSTargetManager.refreshTargets = function() {
        //         test = true;
        //     };
        //     $("#dsTarget-refresh").click();
        //     expect(test).to.be.true;
        //     DSTargetManager.refreshTargets = oldFunc;
        // });

        // it("should click to focus target", function() {
        //     $grid.click();
        //     expect($grid.hasClass("active")).to.be.true;
        //     expect($("#dsTarget-info-card").is(":visible")).to.be.true;
        // });

        // it("should delete target", function(done) {
        //     $("#dsTarget-delete").click();
        //     var numTargets = getNumTargets();

        //     UnitTest.hasAlertWithTitle(DSTargetTStr.DEL, {
        //         confirm: true
        //     });

        //     var testFunc = function() {
        //         var currentNumTargets = getNumTargets();
        //         return (currentNumTargets - numTargets) < 0;
        //     };

        //     UnitTest.testFinish(testFunc)
        //     .then(function() {
        //         var $grid = $('#dsTarget-list .grid-unit[data-name="' +
        //                       testTarget + '"]');
        //         expect($grid.length).to.equal(0);
        //         done();
        //     })
        //     .fail(function() {
        //         done("fail");
        //     });
        // });

        describe("Target Grid Menu Test", function() {
            var $wrap;
            var $gridMenu;
            var $target;

            before(function() {
                $wrap = $("#dsTarget-list .gridViewWrapper");
                $gridMenu = $("#dsTarget-menu");
                $target = $("#dsTarget-list").find(".grid-unit").eq(0);
            });

            afterEach(function() {
                $gridMenu.hide();
            });

            it("should open menu on background", function() {
                var e = jQuery.Event("contextmenu", {
                    "target": $("#dsTarget-list").get(0)
                });
                $wrap.trigger(e);
                expect($gridMenu.hasClass("bgOpts")).to.be.true;
            });

            it("should go to create target form", function() {
                var $li = $gridMenu.find('li[data-action="create"]');
                var $createCard = $("#dsTarget-create-card").addClass("xc-hidden");
                $li.addClass("unavailable");
                $li.trigger(fakeEvent.mouseup);
                expect($createCard.hasClass("xc-hidden")).to.be.true;

                $li.removeClass("unavailable");
                // simple mouse up not work
                $li.mouseup();
                expect($createCard.hasClass("xc-hidden")).to.be.true;

                $li.trigger(fakeEvent.mouseup);
                expect($createCard.hasClass("xc-hidden")).to.be.false;
            });

            it("should trigger refresh", function() {
                var $li = $gridMenu.find('li[data-action="refresh"]');
                var oldFunc = DSTargetManager.refreshTargets;
                var test = false;
                DSTargetManager.refreshTargets = function() {
                    test = true;
                };
                $li.trigger(fakeEvent.mouseup);
                expect(test).to.be.true;
                DSTargetManager.refreshTargets = oldFunc;
            });

            it("should open menu on target", function() {
                var e = jQuery.Event("contextmenu", {
                    "target": $target.get(0)
                });
                $wrap.trigger(e);
                expect($gridMenu.hasClass("targetOpts")).to.be.true;
            });
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });
});