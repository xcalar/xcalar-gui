describe('PublishIMDOpPanel Test', () => {
    let opPanel;
    let $panel;
    let $columns
    let node;
    let editor;
    let oldGetActiveDag;

    before((done) => {
        UnitTest.testFinish(() => DagPanel.Instance.hasSetup())
        .always(function() {
            const inputColumns = genProgCols('myPrefix::coll', 5).concat(genProgCols('col', 4));
            const parentNode = {
                getLineage: () => ({
                    getColumns: () => inputColumns
                })
            };

            var publishNode = {
                getParents: () => ([parentNode]),
                getParam: () => ({
                    "pubTableName": "testName",
                    "primaryKeys": ["col#1", "col#2"],
                    "operator": "",
                    "columns": [
                        "col#1","col#2"
                    ],
                }),
                getTitle: () => "Node 1",
                getId:() => "Node1"
            };

            node = new DagNodePublishIMD({})
            node.getParents = function() {
                return [parentNode];
            };
            oldGetActiveDag = DagViewManager.Instance.getActiveDag;
            DagViewManager.Instance.getActiveDag = () => {
                return new DagGraph();
            };

            PublishIMDOpPanel.Instance.show(publishNode, {})
            .then(() => {
                $panel = $("#publishIMDOpPanel");
                $columns = $("#publishIMDColumns");
                opPanel = PublishIMDOpPanel.Instance;
                editor = opPanel.getEditor();
                if ($panel.find(".advancedEditor").is(":visible")) {
                    $("#publishIMDOpPanel .bottomSection .xc-switch").click();
                }
                done();
            });
        });
    });

    after(() => {
        DagViewManager.Instance.getActiveDag = oldGetActiveDag;
    });

    describe('Basic UI Tests', () => {
        it('Columns', () => {
            const $colList = opPanel._$publishColList;
            expect($colList.find(".col").length).to.equal(9);
            expect($colList.find(".col .checked").length).to.equal(2);
        });

        it('Primary Keys', () => {
            expect($panel.find(".primaryKeyList").length).to.equal(2);
            // Double the regular amount since there are two dropdowns
            expect($panel.find(".primaryKeyColumns li").length).to.equal(18);
        });

        it ("Should be hidden at start", function () {
            opPanel.close();
            expect($('#publishIMDOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be visible when show is called", function () {

            opPanel.show(node, {});
            expect($('#publishIMDOpPanel').hasClass("xc-hidden")).to.be.false;
        });

        it ("Should be hidden when close is called after showing", function () {
            opPanel.show(node, {});
            opPanel.close();
            expect($('#publishIMDOpPanel').hasClass("xc-hidden")).to.be.true;
        });

        it ("Should be hidden when close is clicked", function () {
            opPanel.show(node, {});
            $('#publishIMDOpPanel .close').click();
            expect($('#publishIMDOpPanel').hasClass("xc-hidden")).to.be.true;
        });
    });

    describe('Panel tests', () => {
        before(() => {
            opPanel.show(node, {});
        });

        it("Should be able to add and remove a new primary key", () => {
            expect($panel.find(".primaryKeyInput").length).to.equal(1);
            $panel.find(".addArg").click();
            expect($panel.find(".primaryKeyInput").length).to.equal(2);
            $panel.find(".primaryKeyList .xi-cancel").click();
            expect($panel.find(".primaryKeyInput").length).to.equal(1);
        });

        it("Should be able to check and uncheck a column", () => {
            expect($columns.find(".col .checked").length).to.equal(0);
            $columns.find(".col .checkbox").eq(0).click();
            expect($columns.find(".col .checked").length).to.equal(1);
            $columns.find(".col .checkbox").eq(0).click();
            expect($columns.find(".col .checked").length).to.equal(0);
        });

        it("Should be able to select and unselect all columns", () => {
            expect($columns.find(".col .checked").length).to.equal(0);
            $columns.find(".selectAllWrap .checkbox").click();
            expect($columns.find(".col .checked").length).to.equal(9);
            $columns.find(".selectAllWrap .checkbox").click();
            expect($columns.find(".col .checked").length).to.equal(0);
        });

        it("Should check and uncheck columns corresponding to the keys", () => {
            expect($columns.find(".col .checked").length).to.equal(0);
            $panel.find('.primaryKeyInput').click();
            $panel.find('.primaryKeyColumns [data-value="$col#1"]').trigger(fakeEvent.mouseup);
            expect($columns.find(".col .checked").length).to.equal(1);
            expect($columns.find('[data-original-title="col#1"]').parent().hasClass("active")).to.be.true;
            $panel.find('.primaryKeyInput').val('');
            $panel.find('.primaryKeyInput').blur();
            expect($columns.find(".col .checked").length).to.equal(0);
            expect($columns.find('[data-original-title="col#1"]').parent().hasClass("active")).to.be.false;
        });

        it("Should be unable to uncheck a key", () => {
            $panel.find('.primaryKeyInput').click();
            $panel.find('.primaryKeyColumns [data-value="$col#1"]').trigger(fakeEvent.mouseup);
            expect($columns.find(".col .checked").length).to.equal(1);
            $columns.find('[data-original-title="col#1"]').parent().find(".checkbox").click();
            expect($columns.find(".col .checked").length).to.equal(1);
            $panel.find('.primaryKeyInput').val('');
            $panel.find('.primaryKeyInput').blur();
        });
    });

    describe("Advanced Mode related Publish IMD Op Panel Tests", function() {
        it("Should show statusbox error if not all fields are there", function() {
            opPanel.show(node, {});
            $("#publishIMDOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify({}, null, 4));
            $("#publishIMDOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            opPanel.close();
        });
        it("Should show statusbox error if pubTableName is not there", function() {
            opPanel.show(node, {});
            $("#publishIMDOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify(
                {"primaryKeys": [], "operator": "", "columns": ["test"]},
                null, 4));
            $("#publishIMDOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            opPanel.close();
        });
        it("Should show statusbox error if primaryKeys is not there", function() {
            opPanel.show(node, {});
            $("#publishIMDOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify(
                {"pubTableName": "test", "operator": "", "columns": ["test"]},
                null, 4));
            $("#publishIMDOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            opPanel.close();
        });
        it("Should show statusbox error if operator is not there", function() {
            opPanel.show(node, {});
            $("#publishIMDOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify(
                {"pubTableName": "test", "primaryKeys": [], "columns": ["test"]},
                null, 4));
            $("#publishIMDOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            opPanel.close();
        });
        it("Should show statusbox error if columns is not there", function() {
            opPanel.show(node, {});
            $("#publishIMDOpPanel .bottomSection .xc-switch").click();
            editor.setValue(JSON.stringify(
                {"pubTableName": "test", "primaryKeys": [], "operator": ""},
                null, 4));
            $("#publishIMDOpPanel .bottomSection .btn-submit").click();
            expect($("#statusBox").hasClass("active")).to.be.true;
            opPanel.close();
        });
    });

    function genProgCols(colPrefix, count) {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}#${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }
});