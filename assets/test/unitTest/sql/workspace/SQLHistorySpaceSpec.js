describe.skip("SQLHistorySpace Test", () => {
    before(function(done) {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            done();
        });
    });

    it("should be a singleton instance", () => {
        expect(SQLHistorySpace.Instance).to.be.instanceof(SQLHistorySpace);
    });

    it("should update", () => {
        let oldFunc = SQLHistorySpace.Instance._historyComponent.update;
        SQLHistorySpace.Instance._historyComponent.update = (updateInfo) => {
            expect(updateInfo).to.equal("test");
        };
        SQLHistorySpace.Instance.update("test");
        SQLHistorySpace.Instance._historyComponent.update = oldFunc;
    });

    it("should refresh", () => {
        let oldFunc = SQLHistorySpace.Instance._historyComponent.show;
        SQLHistorySpace.Instance._historyComponent.show = (refresh) => {
            expect(refresh).to.false;
        };
        SQLHistorySpace.Instance.refresh();
        SQLHistorySpace.Instance._historyComponent.show = oldFunc;
    });

    it("should preview", (done) => {
        let oldCheck = SQLHistorySpace.Instance._checkDataflowValidation;
        let oldPreview = SQLHistorySpace.Instance._previewDataflow;
        let called = 0;
        SQLHistorySpace.Instance._checkDataflowValidation = () => {
            called++;
            return PromiseHelper.resolve();
        };
        SQLHistorySpace.Instance._previewDataflow = () => {
            called++;
            return PromiseHelper.resolve();
        };

        SQLHistorySpace.Instance.previewDataflow({})
        .then(() => {
            expect(called).to.equal(2);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            SQLHistorySpace.Instance._checkDataflowValidation = oldCheck;
            SQLHistorySpace.Instance._previewDataflow = oldPreview;
        });
    });

    it("should alert error in preview error", (done) => {
        let oldCheck = SQLHistorySpace.Instance._checkDataflowValidation;
        let oldAlert = Alert.show;
        let called = 0;
        SQLHistorySpace.Instance._checkDataflowValidation = () => {
            called++;
            throw "error";
        };
        Alert.show = () => {
            called++;
        };

        SQLHistorySpace.Instance.previewDataflow()
        .then(() => {
            done("fail");
        })
        .fail(() => {
            expect(called).to.equal(2);
            done();
        })
        .always(() => {
            SQLHistorySpace.Instance._checkDataflowValidation = oldCheck;
            Alert.show = oldAlert;
        });
    });

    it("should view progress", (done) => {
        let sqlNode = DagNodeFactory.create({
            type: DagNodeType.SQL
        });
        let graph = new DagGraph();
        graph.addNode(sqlNode);
        let tab = new DagTabUser({
            name: "test",
            dagGraph: graph
        });

        let oldGetTab = DagTabManager.Instance.getTabById;
        let oldInspect = DagViewManager.Instance.inspectSQLNode;
        let called = 0;

        DagTabManager.Instance.getTabById = () => {
            called++;
            return tab;
        };

        DagViewManager.Instance.inspectSQLNode = () => {
            called++;
            return PromiseHelper.resolve();
        };

        SQLHistorySpace.Instance.viewProgress(tab.getId())
        .then(() => {
            expect(called).to.equal(3);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            DagTabManager.Instance.getTabById = oldGetTab;
            DagViewManager.Instance.inspectSQLNode = oldInspect;
        });
    });

    it("should alert when cannot view progress", (done) => {
        let oldAlert = Alert.error;

        Alert.error = (title, msg) => {
            expect(title).to.equal(AlertTStr.Error);
            expect(msg).to.equal("The corresponding plan for sql could not be generated");
        };

        SQLHistorySpace.Instance.viewProgress(xcHelper.randName("test"))
        .then(() => {
            done("fail");
        })
        .fail(() => {
            done();
        })
        .always(() => {
            Alert.error = oldAlert;
        });
    });

    it("should check dataflow validation", (done) => {
        let oldHasDataflow = DagTabUser.hasDataflowAsync;
        let called = 0;

        DagTabUser.hasDataflowAsync = () => {
            called++;
            return PromiseHelper.resolve(true);
        };

        SQLHistorySpace.Instance._checkDataflowValidation({dataflowId: "test"})
        .then((dataflowId) => {
            expect(dataflowId).to.equal("test");
            expect(called).to.equal(1);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            DagTabUser.hasDataflowAsync = oldHasDataflow;
        });
    });

    it("should check dataflow validation and restore", (done) => {
        let oldHasDataflow = DagTabUser.hasDataflowAsync;
        let oldAlert = Alert.show;
        let oldRestore = SQLHistorySpace.Instance._restoreDataflow;
        let called = 0;

        DagTabUser.hasDataflowAsync = () => {
            called++;
            return PromiseHelper.resolve(false);
        };

        SQLHistorySpace.Instance._restoreDataflow = () => {
            called++;
            return PromiseHelper.resolve("test2");
        };

        SQLHistorySpace.Instance._checkDataflowValidation({dataflowId: "test"})
        .then((dataflowId) => {
            expect(dataflowId).to.equal("test2");
            expect(called).to.equal(2);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            DagTabUser.hasDataflowAsync = oldHasDataflow;
            Alert.show = oldAlert;
            SQLHistorySpace.Instance._restoreDataflow = oldRestore;
        });
    });

    it("should check dataflow validation and cancel", (done) => {
        let oldHasDataflow = DagTabUser.hasDataflowAsync;
        let oldAlert = Alert.show;
        let called = 0;

        DagTabUser.hasDataflowAsync = () => {
            called++;
            return PromiseHelper.resolve(false);
        };

        SQLHistorySpace.Instance._checkDataflowValidation({dataflowId: "test"})
        .then(() => {
            done("fail");
        })
        .fail(() => {
            expect(called).to.equal(1);
            done();
        })
        .always(() => {
            DagTabUser.hasDataflowAsync = oldHasDataflow;
            Alert.show = oldAlert;
        });
    });

    it("should restore datraflow", (done) => {
        let oldGetSQLStruct = SQLUtil.getSQLStruct;
        let oldSQLDagExecutor = SQLDagExecutor;
        let oldUpdate = SQLHistorySpace.Instance.update;
        let called = 0;

        SQLUtil.getSQLStruct = function() {
            called++;
            return PromiseHelper.resolve({});
        };

        SQLDagExecutor = function() {
            called++;
            this.restoreDataflow = () => PromiseHelper.resolve("test");
            return this;
        };

        SQLHistorySpace.Instance.update = () => {
            called++;
        };

        SQLHistorySpace.Instance._restoreDataflow({})
        .then((dataflowId) => {
            expect(dataflowId).to.equal("test");
            expect(called).to.equal(3);
            done();
        })
        .fail(() => {
            done("fail");
        })
        .always(() => {
            SQLDagExecutor = oldSQLDagExecutor;
            SQLHistorySpace.Instance.update = oldUpdate;
            SQLUtil.getSQLStruct = oldGetSQLStruct;
        });
    });
});