describe("XcDatasetViewer Test", function() {
    let createDatasetViewer = function(options) {
        let ds = new DSObj(options);
        return new XcDatasetViewer(ds);
    };

    it("should be the correct instance", function() {
        let viewer = createDatasetViewer();
        expect(viewer).to.be.an.instanceof(XcDatasetViewer);
    });

    it("getTitle should work", function() {
        let viewer = createDatasetViewer({name: "test"});
        expect(viewer.getTitle()).to.equal("test");
    });

    it("getSchemaArray should work", function() {
        let viewer = createDatasetViewer();
        let testSchema = [{"name": "test", "type": ColumnType.string}];
        viewer._schemaArray = testSchema;
        expect(viewer.getSchemaArray()).to.equal(testSchema);
    });

    it("should regiser and trigger event", function() {
        let viewer = createDatasetViewer();
        let test = false;
        viewer.registerEvents("test", function() {
            test = true;
        });

        viewer.events.trigger("test");
        expect(test).to.equal(true);
    });

    it("should render", function(done) {
        let viewer = createDatasetViewer();
        let called = 0;
        viewer._fetchSchema =
        viewer._getSampleTable =
        viewer.dataset.fetch = () => {
            called++;
            return PromiseHelper.resolve({jsons: [],  jsonKeys: []});
        };

        viewer.render($())
        .then(function() {
            expect(called).to.equal(3);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("setDisplaySchema should work", function() {
        let viewer = createDatasetViewer();
        let testSchema = [{"name": "test", "type": ColumnType.string}];
        viewer.setDisplaySchema(testSchema);
        expect(viewer._dispalySchema).to.equal(testSchema);
    });

    it("_fetchSchema should work", function(done) {
        let viewer = createDatasetViewer();
        let oldFunc = PTblManager.Instance.getSchemaArrayFromDataset;
        let schemaArray = [[{"name": "test", "type": ColumnType.string}]];
        PTblManager.Instance.getSchemaArrayFromDataset = () => {
            return PromiseHelper.resolve({schemaArray});
        };

        viewer._fetchSchema()
        .then(function() {
            expect(viewer._schemaArray).to.equal(schemaArray);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance.getSchemaArrayFromDataset = oldFunc;
        });
    });

    it("_fetchSchema should use cahced result", function(done) {
        let viewer = createDatasetViewer();
        let schemaArray = [[{"name": "test", "type": ColumnType.string}]];
        let oldFunc = PTblManager.Instance.getSchemaArrayFromDataset;
        let schemaArray2 = [[{"name": "test2", "type": ColumnType.string}]];
        PTblManager.Instance.getSchemaArrayFromDataset = () => {
            return PromiseHelper.resolve(schemaArray2);
        };

        viewer._schemaArray = schemaArray;
        viewer._fetchSchema()
        .then(function() {
            expect(viewer._schemaArray).to.equal(schemaArray);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance.getSchemaArrayFromDataset = oldFunc;
        });
    });

    it("_getSchemaFromSchemaArray should work", function() {
        let viewer = createDatasetViewer();
        let res;
        // case 1
        viewer._schemaArray = null;
        res = viewer._getSchemaFromSchemaArray();
        expect(res).to.equal(null);

        // case 2
        viewer._schemaArray = [[]];
        res = viewer._getSchemaFromSchemaArray();
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(null);

        // case 3
        let schema = {"name": "test", "type": ColumnType.string};
        viewer._schemaArray = [[schema]];
        res = viewer._getSchemaFromSchemaArray();
        expect(res.length).to.equal(1);
        expect(res[0]).to.equal(schema);

        // case 4
        viewer._schemaArray = [[schema, {"name": "test", "type": ColumnType.integer}]];
        res = viewer._getSchemaFromSchemaArray();
        expect(res.length).to.equal(1);
        expect(res[0]).to.deep.equal({"name": "test", "type": ColumnType.mixed});
    });

    it("_getSampleTable should work", function() {
        let viewer = createDatasetViewer();
        viewer._getSampleTable(["h1"], [{"h1": "test"}]);
        expect(viewer.$view.hasClass("datasetTableWrap")).to.be.true;
    });

    it("_getSampleTableHTML should handle invalid case", function() {
        let viewer = createDatasetViewer();
        let res = viewer._getSampleTableHTML();
        expect(res).to.equal("");
    });

    it("_getSampleTableHTML should handle invalid case", function() {
        let viewer = createDatasetViewer();
        viewer._schemaArray = [[{name: "c1", type: ColumnType.string}]];
        let res = viewer._getSampleTableHTML(["c1"], [{"c1": "test"}]);
        expect(res).not.to.equal("");
        expect(res).to.contains("type-string");
    });

    it("_addExtraRows should work", function() {
        let viewer = createDatasetViewer();
        viewer._dispalySchema = [{"name": "test", "type": ColumnType.string}];
        let res = viewer._addExtraRows(["c1"]);
        expect(res).to.contains("Unavailable in preview");
    });

    it("_scrollSampleAndParse should work", function(done) {
        let viewer = createDatasetViewer();
        let called = false;
        let html =
            '<div class="datasetTableWrap">' +
                '<table>' +
                    '<th class="th">' +
                        '<div class="editableHead">h1</div>' +
                    '</th>' +
                '</table>' +
            '</div>';
        viewer.$view = $(html);
        viewer.dataset.fetch = () => {
            called = true;
            return PromiseHelper.resolve({jsons: [{"h1": "test"}], jsonKeys: []});
        };

        viewer._scrollSampleAndParse(1, 1)
        .then(function() {
            expect(called).to.equal(true);
            expect(viewer.$view.find("tr").length).to.equal(2);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("_dataStoreTableScroll should work", function(done) {
        let viewer = createDatasetViewer();
        let called = false;
        viewer.currentRow = 0;
        viewer.totalRows = 1000;
        viewer._scrollSampleAndParse = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        viewer._dataStoreTableScroll($('<div></div>'))
        .then(function() {
            expect(called).to.be.true;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("_dataStoreTableScroll should resolve if no need to scroll", function(done) {
        let viewer = createDatasetViewer();
        let called = false;
        viewer.currentRow = 0;
        viewer.totalRows = 10;
        viewer._scrollSampleAndParse = function() {
            called = true;
            return PromiseHelper.resolve();
        };

        viewer._dataStoreTableScroll($())
        .then(function() {
            expect(called).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("_dataStoreTableScroll should reject if still fetching", function(done) {
        let viewer = createDatasetViewer();
        let called = false;
        viewer.currentRow = 0;
        viewer.totalRows = 1000;
        viewer.$view = $('<div><table class="fetching"></table</div>');

        viewer._dataStoreTableScroll($())
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).not.to.be.empty;
            done();
        });
    });
});