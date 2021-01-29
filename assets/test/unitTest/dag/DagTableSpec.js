describe("DagTable Test", () => {
    let viewer;
    let renderCount = 0;
    let $container;

    before(() => {
        class TestViewer extends XcViewer {
            constructor(id) {
                super(id);
            }

            render($container) {
                renderCount++;
                return super.render($container);
            }

            getTitle() {
                return "test";
            }
        }

        viewer = new TestViewer("id");
        $container = $("#sqlTableArea");
    });

    it("should get instance", () => {
       const dagTable = DagTable.Instance;
       expect(dagTable).to.be.an.instanceof(DagTable);
    });

    it("should show the viewer", (done) => {
        DagTable.Instance._show(viewer)
        .then(() => {
            expect($container.hasClass("xc-hidden")).to.be.false;
            expect(renderCount).to.equal(1);
            done();
        })
        .fail((error) => {
            done(error);
        });
    });

    it("should not render the same viewer again", (done) => {
        DagTable.Instance._show(viewer)
        .then(() => {
            expect(renderCount).to.equal(1);
            done();
        })
        .fail((error) => {
            done(error);
        });
    });

    // it("should click close button to close", () => {
    //     $container.find(".close").click();
    //     expect($container.hasClass("xc-hidden")).to.be.true;
    // });

    describe("Error Case Test", () => {
        before(() => {
            class ErrorViewer extends XcViewer {
                constructor(id) {
                    super(id);
                }

                render($container) {
                    super.render($container);
                    return PromiseHelper.reject("test error");
                }

                getTitle() {
                    return "test";
                }
            }

            viewer = new ErrorViewer("id2");
        });

        it("should show error", (done) => {
            DagTable.Instance._show(viewer)
            .then(() => {
                done("fail");
            })
            .fail(() => {
                expect($container.hasClass("error")).to.be.true;
                expect($container.find(".errorSection").text())
                .to.equal("test error");
                done();
            });
        });

        it("close should clear error", () => {
            DagTable.Instance.close();
            expect($container.hasClass("error")).to.be.false;
            expect($container.find(".errorSection").text())
            .to.equal("");
        });
    });
});