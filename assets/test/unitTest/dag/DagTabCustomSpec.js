describe('DagTabCustom Test', () => {
    describe('constructor() should work', () => {
        it('test', () => {
            const customNode = new DagNodeCustom();
            const tab = new DagTabCustom({
                id: 'testId', name: 'testName', customNode: customNode
            });
            expect(tab._customNode).to.equal(customNode);
        });
    });

    describe('getGraph() should work', () => {
        it('test', () => {
            const customNode = new DagNodeCustom();
            const tab = new DagTabCustom({
                id: 'testId',
                name: 'testName',
                customNode: customNode
            });
            expect(tab.getGraph()).to.equal(customNode.getSubGraph());
        })
    });

    describe('abstract functions should work', () => {
        it('save()', (done) => {
            const oldFunction = DagTabManager.Instance.saveParentTab;
            const customNode = new DagNodeCustom();
            const tab = new DagTabCustom({
                id: 'testId',
                name: 'testName',
                customNode: customNode
            });

            let saveCalled = false;
            DagTabManager.Instance.saveParentTab = () => {
                saveCalled = true;
                return PromiseHelper.resolve();
            }

            let hasError = false;
            tab.save().fail(() => { hasError = true; })
            .always(() => {
                expect(saveCalled).to.be.true;
                expect(hasError).to.be.false;
                DagTabManager.Instance.saveParentTab = oldFunction;
                done();
            });
        });

        it('load()', (done) => {
            const tab = new DagTabCustom({
                id: 'testId',
                name: 'testName',
                customNode: new DagNodeCustom()
            });

            let hasError = false;
            tab.load().fail(() => { hasError = true; })
            .always(() => {
                expect(hasError).to.be.false;
                done();
            });
        });

        it('delete()', (done) => {
            const tab = new DagTabCustom({
                id: 'testId',
                name: 'testName',
                customNode: new DagNodeCustom()
            });

            let hasError = false;
            tab.delete().fail(() => { hasError = true; })
            .always(() => {
                expect(hasError).to.be.false;
                done();
            });
        });

        it('download()', (done) => {
            const tab = new DagTabCustom({
                id: 'testId',
                name: 'testName',
                customNode: new DagNodeCustom()
            });

            let hasError = false;
            tab.download().fail(() => { hasError = true; })
            .always(() => {
                expect(hasError).to.be.true;
                done();
            });
        });

        it('upload()', (done) => {
            const tab = new DagTabCustom({
                id: 'testId',
                name: 'testName',
                customNode: new DagNodeCustom()
            });

            let hasError = false;
            tab.upload().fail(() => { hasError = true; })
            .always(() => {
                expect(hasError).to.be.true;
                done();
            });
        });
    });
});