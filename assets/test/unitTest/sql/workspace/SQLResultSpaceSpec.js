describe("SQLResultSpace Test", function() {
    let sqlResultSpace;

    before(function() {
        sqlResultSpace = SQLResultSpace.Instance;
    });

    it("should be the correct instance", function() {
        expect(sqlResultSpace).to.be.an.instanceof(SQLResultSpace);
    });

    it("should refresh", function() {
        let oldTableLister = sqlResultSpace._tableLister;
        let called = false;
        let fakeTableLister = {
            refresh: () => { called = true; }
        };
        sqlResultSpace._tableLister = fakeTableLister;
        sqlResultSpace.refresh();
        expect(called).to.be.true;
        sqlResultSpace._tableLister = oldTableLister;
    });

    describe("Show Different Section Test", function() {
        let oldSQLTable;
        let oldSQLSchema;
        let oldTableLister;

        before(function() {
            oldSQLTable = sqlResultSpace._sqlTable;
            oldSQLSchema = sqlResultSpace._sqlTableSchema;
            oldTableLister = sqlResultSpace._tableLister;
        
            sqlResultSpace._sqlTable = {
                show: () => {},
                close: () => {},
                getTable: () => {return "test1";},
            };

            sqlResultSpace._sqlTableSchema = {
                show: () => {},
                close: () => {}
            };

            sqlResultSpace._tableLister = {
                show: () => {},
                close: () => {}
            };
        });

        it("should viewTable", function() {
            let called = false;
            sqlResultSpace._sqlTable.show = () => { called = true };
            sqlResultSpace.viewTable();
            expect(called).to.be.true;
            sqlResultSpace._sqlTable.show = () => {};
        });

        it("should showTables", function() {
            let called = false;
            sqlResultSpace._tableLister.show = () => { called = true };
            sqlResultSpace.showTables();
            expect(called).to.be.true;
            sqlResultSpace._tableLister.show = () => {};
        });

        it("should showSchema", function() {
            let called = false;
            sqlResultSpace._sqlTableSchema.show = () => { called = true };
            sqlResultSpace.showSchema();
            expect(called).to.be.true;
            sqlResultSpace._sqlTableSchema.show = () => {};
        });

        it("should showSchemaError", function() {
            let called = false;
            sqlResultSpace._sqlTableSchema.showError = () => { called = true };
            sqlResultSpace.showSchemaError();
            expect(called).to.be.true;
            sqlResultSpace._sqlTableSchema.showError = () => {};
        });

        it("should get the correct ID", function() {
            let id = sqlResultSpace.getShownResultID();
            expect(id).to.equal("test1");
        });

        after(function() {
            sqlResultSpace._sqlTable = oldSQLTable;
            sqlResultSpace._sqlTableSchema = oldSQLSchema;
            sqlResultSpace._tableLister = oldTableLister;
        });
    });

    it("should get available tables", function() {
        let res = sqlResultSpace.getAvailableTables();
        expect(res).to.be.an("array");
    });

});