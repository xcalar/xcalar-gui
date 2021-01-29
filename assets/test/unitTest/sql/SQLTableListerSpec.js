describe("SQLTableLister Test", function() {
    let id;
    let $div;
    let tableLister;
    let oldGetTablesAsync;
    let oldGetTables;

    before(function() {
        oldGetTablesAsync = PTblManager.Instance.getTablesAsync;
        oldGetTables = PTblManager.Instance.getTables;
        PTblManager.Instance.getTablesAsync = function() {
            return PromiseHelper.resolve();
        };
        PTblManager.Instance.getTables = function() {
            let table = PTblManager.Instance.createTableInfo("TEST");
            table.index = 0;
            return [table];
        };

        id = xcHelper.randName("test");
        let div =
        '<div id="' + id + '">' +
            '<div class="topSection">' +
                '<div class="searchbarArea">' +
                    '<input>' +
                '</div>' +
            '</div>' +
            '<div class="mainSection">' +
                '<div class="content">' +
                    '<div class="row">' +
                        '<div class="name">test</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '<div>';
        $div = $(div);
        $("#container").append($div);
        tableLister = new SQLTableLister(id);
    });

    it("should be initialized", function() {
        expect(tableLister).to.be.an.instanceof(SQLTableLister);
        expect($div.find(".header").length).to.equal(1);
    });

    it("should show without reset", function(done) {
        $div.addClass("xc-hidden");
        tableLister.show(false)
        .then(function() {
            expect($div.hasClass("xc-hidden")).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should show hint if no table", function(done) {
        let oldFunc = PTblManager.Instance.getTables;
        PTblManager.Instance.getTables = function() { return []; };

        $div.addClass("xc-hidden");
        tableLister.show(true)
        .then(function() {
            expect($div.hasClass("xc-hidden")).to.be.false;
            expect($div.find(".content .row").length).to.equal(0);
            expect($div.find(".content .hint").length).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance.getTables = oldFunc;
        });
    });

    it("should show with reset", function(done) {
        $div.addClass("xc-hidden");
        tableLister.show(true)
        .then(function() {
            expect($div.hasClass("xc-hidden")).to.be.false;
            expect($div.find(".content .row").length).to.equal(1);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should getAvailableTables", function() {
        let tables = tableLister.getAvailableTables();
        expect(tables.length).to.equal(1);
        expect(tables[0].name).to.equal("TEST");
    });

    it("should close", function() {
        tableLister.close();
        expect($div.hasClass("xc-hidden")).to.be.true;
    });

    it("should select and unselect row", function() {
        let $row = $div.find(".content .row");
        tableLister._selectTableList($row);
        expect($row.hasClass("selected")).to.equal(true);
        
        tableLister._unSelectTableList();
        expect($row.hasClass("selected")).to.equal(false);
    });

    it("should show schema", function() {
        let oldFuc = SQLResultSpace.Instance.showSchema;
        let called = 0;
        SQLResultSpace.Instance.showSchema = function() {
            called++;
        };
        tableLister._showSchema();
        expect(called).to.equal(0);

        // case 2
        let $row = $div.find(".content .row");
        tableLister._selectTableList($row);
        tableLister._showSchema();
        expect(called).to.equal(1);

        SQLResultSpace.Instance.showSchema = oldFuc;
    });

    it("should sort table", function() {
        let tableA = PTblManager.Instance.createTableInfo("A");
        let tableB = PTblManager.Instance.createTableInfo("B");
        // case 1
        tableLister._sortKey = null;
        let res = tableLister._sortTables([tableA, tableB]);
        expect(res[0]).to.equal(tableA);
        expect(res[1]).to.equal(tableB);
        // case 2
        tableLister._sortKey = "rows";
        tableA.rows = 2;
        tableB.rows = 1;
        res = tableLister._sortTables([tableA, tableB]);
        expect(res[0]).to.equal(tableB);
        expect(res[1]).to.equal(tableA);

        // case 3
        tableLister._sortKey = "status";
        tableA.active = true;
        tableB.active = false;
        res = tableLister._sortTables([tableA, tableB]);
        expect(res[0]).to.equal(tableB);
        expect(res[1]).to.equal(tableA);

        // case 4
        tableLister._sortKey = "size";
        tableLister._reverseSort = true;
        tableA.size = 2;
        tableB.size = 1;
        res = tableLister._sortTables([tableA, tableB]);
        expect(res[0]).to.equal(tableA);
        expect(res[1]).to.equal(tableB);
    });

    it("should activate table", function(done) {
        let oldFunc = PTblManager.Instance.activateTables;
        let called = false;
        PTblManager.Instance.activateTables = function() {
            called = true;
            return PromiseHelper.resolve();
        };
        
        let $row = $div.find(".content .row");
        tableLister._activateTable($row)
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance.activateTables = oldFunc;
        });
    });

    it("should activate table case 2", function(done) {
        let oldFunc = PTblManager.Instance.activateTables;
        let called = false;
        PTblManager.Instance.activateTables = function() {
            called = true;
            return PromiseHelper.resolve();
        };
        
        tableLister._activateTable($())
        .then(function() {
            expect(called).to.equal(false);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance.activateTables = oldFunc;
        });
    });

    it("should deactivate table", function(done) {
        let oldFunc = PTblManager.Instance.deactivateTables;
        let called = false;
        PTblManager.Instance.deactivateTables = function() {
            called = true;
            return PromiseHelper.resolve();
        };
        
        let $row = $div.find(".content .row");
        tableLister._deactivateTable($row)
        .then(function() {
            expect(called).to.equal(true);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance.deactivateTables = oldFunc;
        });
    });

    it("should deactivate table case 2", function(done) {
        let oldFunc = PTblManager.Instance.deactivateTables;
        let called = false;
        PTblManager.Instance.deactivateTables = function() {
            called = true;
            return PromiseHelper.resolve();
        };
        
        tableLister._deactivateTable($())
        .then(function() {
            expect(called).to.equal(false);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            PTblManager.Instance.deactivateTables = oldFunc;
        });
    });

    after(function() {
        PTblManager.Instance.getTables = oldGetTables;
        PTblManager.Instance.getTablesAsync = oldGetTablesAsync;
        $div.remove();
    });
});