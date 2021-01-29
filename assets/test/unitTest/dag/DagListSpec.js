describe('DagList Test', function() {
    var oldPut;

    before(function(done) {
        oldPut = XcalarKeyPut;
        XcalarKeyPut = function() {
            return PromiseHelper.resolve();
        };
        UnitTest.onMinMode();
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    describe('Dag List Test', function() {
        var dagName;
        var dagTab;
        var getSelector = function(name) {
            return "#dagListSection .dagListDetail .name:contains(" + name + ")";
        };

        before(function() {
            dagName = xcHelper.randName("newAgg");
            dagTab = new DagTabUser({
                name: name
            });
        });

        it("should add a new Dag correctly", function() {
            var prevLen = DagList.Instance._dags.size;
            DagList.Instance.addDag(dagTab);
            expect(DagList.Instance._dags.size).to.equal(prevLen + 1);
        });


        it("should be able to rename a dag", function() {
            dagName = xcHelper.randName("ranamed");
            DagList.Instance.changeName(dagName, dagTab.getId());
            var selector = getSelector(dagName);
            expect($(selector).length).to.equal(1);
        });

        it("should tell us if we have a unique name", function() {
            var newName = xcHelper.randName("newDag2");
            expect(DagList.Instance.isUniqueName(newName)).to.be.true;
            dagName = newName;
            DagList.Instance.changeName(dagName, dagTab.getId());
            expect(DagList.Instance.isUniqueName(newName)).to.be.false;
        });

        it("should handle dag deletion", function(done) {
            var prevLen = DagList.Instance._dags.size;
            var selector = getSelector(dagName);
            var dataflowId = $(selector).closest(".dagListDetail").data("id");
            DagList.Instance.deleteDataflow(dataflowId)
            .then(() => {
                expect(DagList.Instance._dags.size).to.equal(prevLen - 1);
                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it("should serialize", function() {
            let dags = ["test"];
            let res = DagList.Instance.serialize(dags);
            let parsed = JSON.parse(res);
            expect(parsed.version).to.equal(Durable.Version);
            expect(parsed.dags[0]).to.equal("test");
        });

        it("should toggle disable", function() {
            DagList.Instance.toggleDisable(true);
            expect($("#dagList").hasClass("xc-disabled")).to.be.true;
            DagList.Instance.toggleDisable(false);
            expect($("#dagList").hasClass("xc-disabled")).to.be.false;
        });

        it("should get all dags", function() {
            DagList.Instance.addDag(dagTab);
            var map = DagList.Instance.getAllDags();
            expect(map.get(dagTab.getId())).to.be.not.null;
        });

        it("should get a dag by ID", function() {
            dagName = xcHelper.randName("newAgg");
            dagTab = new DagTabUser({name: name});
            DagList.Instance.addDag(dagTab);
            var dag = DagList.Instance.getDagTabById(dagTab.getId());
            expect(dag).to.deep.equal(dagTab);
        });

        it("should update state correctly", function() {
            dagName = xcHelper.randName("newAgg");
            dagTab = new DagTabUser({name: name});
            dagTab.setOpen();
            DagList.Instance.addDag(dagTab);
            var id = dagTab.getId();
            $("#dagListSection").append("<div class='dagListDetail testClass' data-id='" +
                id + "'><div>");
            DagList.Instance.updateDagState(id)
            var $li = $("#dagListSection").find('.dagListDetail[data-id="' + id + '"]');
            expect($li.hasClass("open")).to.be.true;
            dagTab.setClosed();
            DagList.Instance.updateDagState(id)
            $li = $("#dagListSection").find('.dagListDetail[data-id="' + id + '"]');
            expect($li.hasClass("open")).to.be.false;
            $li.remove();
        });

        it("should get a valid name", function() {
            var name = DagList.Instance.getValidName();
            // duplicate standard dataflow name
            expect(name.split(" ")[0]).to.equal("Untitled");
            // with prefix
            expect(DagList.Instance.getValidName("uniquePref")).to.equal("uniquePref");
            // has bracket
            expect(DagList.Instance.getValidName(null, true)).to.equal("Untitled 0");
            // is sql func
            expect(DagList.Instance.getValidName(null, true, true)).to.equal("fn0");
        });

        it("should add a dataflow", function() {
            var prevLen = DagList.Instance._dags.size;
            dagName = xcHelper.randName("newAgg");
            dagTab = new DagTabUser({name: name});
            DagList.Instance.addDataflow(dagTab);
            expect(DagList.Instance._dags.size).to.equal(prevLen + 1);
        });

        it("should remove a dataflow", function() {
            var prevLen = DagList.Instance._dags.size;
            DagList.Instance.removeDataflow(dagTab.getId());
            expect(DagList.Instance._dags.size).to.equal(prevLen - 1);
        });

        // XXX should refactor to aviod relying on DOM and UI
        // it("Should delete a dataflow through UI clicks", function(done) {
        //     dagName = xcHelper.randName("newAgg");
        //     dagTab = new DagTabUser({name: name});
        //     dagTab.setOpen();
        //     DagList.Instance.addDag(dagTab);
        //     var prevLen = DagList.Instance._dags.size;
        //     var id = dagTab.getId();
        //     $("#dagListSection").append("<div class='dagListDetail testClass' data-id='" +
        //         id + "'><div class='deleteDataflow'></div></div>");
        //     $("#dagListSection").find(".testClass .deleteDataflow").click();
        //     setTimeout(function() {
        //         $("#alertModal .confirm").click();
        //         setTimeout(function() {
        //             expect(DagList.Instance._dags.size).to.equal(prevLen - 1);
        //             done();
        //         }, 100);
        //     }, 10);
        // })
    });

    describe('Dag List Refresh related test', function() {
        var oldOptimzedRes;
        var oldListOptimized;
        var oldListQuer;

        before(function() {
            oldOptimzedRes = DagTabOptimized.restore;
            oldListQuer = XcalarQueryList;
            oldListOptimized = DagList.Instance.listOptimizedDagAsync;
            DagTabOptimized.restore = function() {
                dagName = xcHelper.randName("newOptimized");
                dagTab = new DagTabOptimized({name: name});
                return PromiseHelper.resolve({dagTabs: [dagTab]}, false);
            }
            DagList.Instance.listOptimizedDagAsync = () => PromiseHelper.resolve([]);
            XcalarQueryList = function() {
                return PromiseHelper.resolve([{name: "table_published_test"}]);
            }
        });

        // it("should refresh correctly", function(done) {
        //     var numOptimizedTabs = 0;
        //     DagList.Instance._dags.forEach((dagTab) => {
        //         if (dagTab instanceof DagTabOptimized) {
        //             numOptimizedTabs++;
        //         }
        //     });
        //     var prevLen = DagList.Instance._dags.size;
        //     DagList.Instance.refresh()
        //     .then(() => {
        //         let num = prevLen - numOptimizedTabs + 3;
        //         expect(DagList.Instance._dags.size).to.equal(num);
        //         done();
        //     })
        //     .fail(() => {
        //         done("fail");
        //     });
        // });

        after(function() {
            DagTabOptimized.restore = oldOptimzedRes;
            XcalarQueryList = oldListQuer;
            DagList.Instance.listOptimizedDagAsync = oldListOptimized;
        });
    })

    it("_loadErrorHandler should work", function() {
        let oldGetList = DagList.Instance._getListElById;
        let oldShow = StatusBox.show;
        let $list = $('<div>' +
                        '<div class="gridIcon"></div>' +
                        '<div class="xc-action"></div>' +
                    '</div>');
        DagList.Instance._getListElById = () => $list;

        let called = false;
        StatusBox.show = () => { called = true; };

        let dagTab = new DagTabUser();
        DagList.Instance._loadErrorHandler(dagTab, false);
        expect($list.find(".xc-action").hasClass("xc-disabled")).to.be.true;
        expect($list.find(".gridIcon").hasClass("error")).to.be.true;
        expect(called).to.be.true;

        DagList.Instance._getListElById = oldGetList;
        StatusBox.show = oldShow;
    });

    it("_togglLoadState should work", function() {
        let oldGetList = DagList.Instance._getListElById;
        let $list = $('<div>' +
                        '<div class="name"></div>' +
                    '</div>');
        DagList.Instance._getListElById = () => $list;

        let dagTab = new DagTabUser();
        DagList.Instance._togglLoadState(dagTab, true);
        expect($list.find(".loadingSection").length).to.equal(1);

        DagList.Instance._togglLoadState(dagTab, false);
        expect($list.find(".loadingSection").length).to.equal(0);

        DagList.Instance._getListElById = oldGetList;
    });

    after(function() {
        XcalarKeyPut = oldPut;
        UnitTest.offMinMode();
    });
});
