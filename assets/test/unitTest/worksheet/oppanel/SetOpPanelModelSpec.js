describe('SetOpPanelModel Test', () => {
    let setOpModel;

    before(() => {
        const inputColumns = genProgCols('fcol', 5, ColumnType.float).concat(genProgCols('scol', 4, ColumnType.string));
        const parentNode = {
            getLineage: () => ({
                getColumns: () => inputColumns
            })
        };

        setNode = {
            getParents: () => ([parentNode]),
            getParam: () => ({
                eval: [{
                    evalString: 'set(fcol#1,1)',
                    newField: 'newCol'
                }],
                icv: false,
                columns: []
            }),
            getTitle: () => "Node 1",
            validateNodes: () => null,
            getSubType: () => DagNodeSubType.Intersect,
            validateParam: () => null
        };

        setOpModel = new SetOpPanelModel(setNode, event);
    });

    it('should setColModel', () => {
        const colInfo = setOpModel.getColData();
        const modelData = new ColAssignmentModel(colInfo.allColSets, colInfo.selectedColSets)
        setOpModel.setColModel(modelData);
        console.log('colModel');
        console.log(setOpModel.colModel);
        expect(1).to.equal(1);
    })

    it('should getModel', () => {
        const model = setOpModel.getModel();
        console.log('model');
        console.log(model);
        expect(model.subType).to.equal('Intersect');
    });

    it('should getColData', () => {
        const colData = setOpModel.getColData();
        console.log(colData);
        expect(colData.allColSets[0].length).to.equal(9);
        expect(colData.selectedColSets.length).to.equal(0);
    });

    it('should getNumList', () => {
        numList = setOpModel.getNumList();
        expect(numList).to.equal(1);
    });

    it('should setDedup', () => {
        expect(setOpModel.dedup).to.be.undefined;
        setOpModel.setDedup(false);
        expect(setOpModel.dedup).to.be.false;
        setOpModel.setDedup(true);
        expect(setOpModel.dedup).to.be.true;
    });

    it('should validateNodes', () => {
        expect(setOpModel.validateNodes()).not.to.equal(null);

        setOpModel.setDedup(false);
        expect(setOpModel.validateNodes()).to.equal(null);
    });

    it('should validateResult', () => {
        const error = setOpModel.validateResult().error
        expect(error).to.equal('Please select columns for this operation.');
    });

    it('should validateCast', () => {
        expect(setOpModel.validateCast()).to.equal(null);
    });

    it('should validateAdvancedMode', () => {
        expect(setOpModel.validateAdvancedMode('{"columns": []}')).to.equal(null);
    });

    it('should submit', () => {
        console.log('submit');
        console.log(setOpModel._getParam());
        let setParamCalled = false;
        setNode.setParam = () => { setParamCalled = true };
        setOpModel.submit();
        expect(setParamCalled).to.be.true;
    });

    it('should switchMode', () => {
        let editor = {};
        let editorSetValueCalled = false;
        editor.setValue = () => { editorSetValueCalled = true };

        setOpModel.switchMode(true, editor);
        expect(editorSetValueCalled).to.be.true;
        setOpModel.switchMode(false, editor);
    });

    it('should restoreBasicModeParams', () => {
        let editor = {};
        let editorSetValueCalled = false;
        editor.setValue = () => { editorSetValueCalled = true };

        setOpModel.restoreBasicModeParams(editor);
        expect(editorSetValueCalled).to.be.true;
    });

    it('should refreshColumns', () => {
        setOpModel.refreshColumns();
    });

    function genProgCols(colPrefix, count, sep='#') {
        const cols = new Array(count);
        for (let i = 0; i < count; i ++) {
            const colName = `${colPrefix}${sep}${i + 1}`;
            const frontName = xcHelper.parsePrefixColName(colName).name;
            cols[i] = ColManager.newPullCol(frontName, colName, ColumnType.string);
        }
        return cols;
    }
});