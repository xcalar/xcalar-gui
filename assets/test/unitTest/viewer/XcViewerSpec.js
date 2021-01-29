describe("XcViewer Test", () => {
    let viewer;
    let $container;

    before(() => {
        console.log("XcViewer Test");
        class ActualViewer extends XcViewer {
            constructor(id) {
                super(id);
            }

            getView() {
                return super.getView();
            }
        }

        viewer = new ActualViewer("id");
        $container = $("<div></div>")
    });

    it("should get id", () => {
        expect(viewer.getId()).to.equal("id");
    });

    it("should get view", () => {
        expect(viewer.getView().length).to.equal(1);
    });

    it("should render", (done) => {
        viewer.render($container)
        .then(() => {
            expect($container.find(".viewWrap").length).to.equal(1);
            done();
        })
        .fail((error) => {
            done(error);
        });
    });

    it("should clear", () => {
        viewer.clear();
        expect($container.find(".viewWrap").length).to.equal(0);
    });
});