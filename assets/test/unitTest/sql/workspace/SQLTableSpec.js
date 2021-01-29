describe("SQL Table Test", function() {
    let id;
    let $container;
    let oldXcTableViewer;
    let sqlTable;

    before(function() {
        id = xcHelper.randName("test");
        let html = `<div id="${id}">` +
                    '</div>';
        $container = $(html);
        $("#container").append($container);
    
        oldXcTableViewer = XcTableViewer;
        XcTableViewer = class FakeXcTableViewer {
            getId() {
                return "test"
            }

            getView() {
                return $();
            }

            render() {
                return PromiseHelper.resolve();
            }

            clear() {}

            setContainer() {}
        }

        sqlTable = new SQLTable(id);
    });

    it("show should handle fail case", function(done) {
        let table = new TableMeta({"tableId": "test", "tableName": "test"});
        let oldShow = sqlTable._show;
        let called = false;

        let callback = () => called = true;
        sqlTable._show = () => PromiseHelper.reject({status: StatusT.StatusDsNotFound});

        sqlTable.show(table, null, callback)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).not.to.be.empty;
            expect(called).to.be.true;
            done();
        })
        .always(function() {
            sqlTable._show = oldShow;
        });
    });

    it("should show", function(done) {
        let table = new TableMeta({"tableId": "test", "tableName": "test"});
        sqlTable.show(table, [{name: "col1", backName: "col1", type: ColumnType.string}])
        .then(function() {
            expect(sqlTable.getView()).not.to.be.null;
            expect(table.allImmediates).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("getTable should work", function() {
        expect(sqlTable.getTable()).to.equal("test");
    });

    it("getSerachBar should work", function() {
        expect(sqlTable.getSearchBar()).to.be.an.instanceof(TableSearchBar);
    });

    it("should close", function() {
        sqlTable.close();
        expect(sqlTable.getView()).to.be.null;
    });

    after(function() {
        $container.remove();
        XcTableViewer = oldXcTableViewer;
    });
});