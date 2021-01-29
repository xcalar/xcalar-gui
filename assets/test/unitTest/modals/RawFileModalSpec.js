describe("RawFileModal Test", function() {
    var $modal;
    var modal;

    before(function() {
        UnitTest.onMinMode();
        $modal = $("#rawFileModal");
        modal = RawFileModal.Instance;
    });

    describe("Previewer Id Test", function() {
        it("Should set previewer id", function() {
            modal._setPreviewerId();
            expect($modal.data("id")).not.to.be.null;
        });

        it("Should test valid id", function() {
            var id = modal._getPreviewerId();
            // case 1
            var valid = modal._isValidId(id);
            expect(valid).to.be.true;
            // case 2
            valid = modal._isValidId("test");
            expect(valid).to.be.false;
        });
    });

    describe("Previewer View Mode Test", function() {
        it("should enter hex mode", function() {
            modal._inHexMode();
            expect(modal._isInHexMode()).to.be.true;
            expect($modal.hasClass("loading")).to.be.false;
            expect($modal.hasClass("error")).to.be.false;
        });

        it("should enter preview mode", function() {
            modal._inPreviewMode();
            expect(modal._isInHexMode()).to.be.false;
            expect($modal.hasClass("loading")).to.be.false;
            expect($modal.hasClass("error")).to.be.false;
        });

        it("should enter error mode", function() {
            modal._inErrorMode();
            expect($modal.hasClass("loading")).to.be.false;
            expect($modal.hasClass("error")).to.be.true;
        });

        it("should enter load mode", function() {
            modal._inLoadMode();
            expect($modal.hasClass("loading")).to.be.true;
            expect($modal.hasClass("error")).to.be.false;
        });

        after(function() {
            modal._inPreviewMode();
        });
    });

    describe("Clean and Error Handle Test", function() {
        it("should handle error", function() {
            modal._handleError({"error": "test"});
            expect($modal.hasClass("error")).to.be.true;
            expect($modal.find(".errorSection").text())
            .to.equal("test");
        });

        it("should reset", function() {
            modal._reset();
            var id = modal._getPreviewerId();
            expect(id).to.be.null;
            expect($modal.hasClass("error")).to.be.false;
            expect($modal.find(".errorSection").text())
            .to.equal("");
            expect(getOffsetNum()).to.equal("0");
        });
    });

    describe("Preview Html Code Test", function() {
        it("should get cell style", function() {
            var style = modal._getCellStyle();
            expect(style).to.equal("height:30px; line-height:30px;");
        });

        it("should get cell html", function() {
            if (isBrowserMicrosoft) {
                return;
            }
            var cell = modal._getCell("a", 0);
            var $cell = $(cell);
            expect($cell.data("offset")).to.equal(0);
            expect($cell.text()).to.equal("a");

            // case 2
            cell = modal._getCell("<", 1);
            $cell = $(cell);
            expect($cell.data("offset")).to.equal(1);
            expect($cell.text()).to.equal("<");
        });

        it("should get char html", function() {
            var html = modal._getCharHtml("12345678", 8, 0);
            var $line = $(html);
            expect($line.find(".cell").length).to.equal(8);
            expect($line.text().length).to.equal(8);
        });

        it("should get code html", function() {
            var html = modal._getCodeHtml("12345678", 8, 0);
            var $line = $(html);
            expect($line.find(".cell").length).to.equal(8);
            expect($line.text().length).to.equal(16);
        });
    });

    describe("Show Preview Test", function() {
        let oldPreview;

        before(function() {
            oldPreview = XcalarPreview;
            XcalarPreview = () => PromiseHelper.resolve({
                base64Data: "MTc1NjMyNjg0CTIwMDYwMTAxCTIwMDYwMQkyMDA2CTIwMDYuMDAyNwkJCQkJCQkJCQkJQUZHCUFGR0hBTklTVEFOCUFGRwkJCQkJCQkJMAkwNDAJMDQwCTA0CTEJMQkyCTEJMQkzLjcwMTI1NTc4MzIxMjE2CQkJCQkwCTAJMAk0CUthbmRhaGFyLCBLYW5kYWhhciwgQWZnaGFuaXN0YW4JQUYJQUYyMwkzMS42MTMzCTY1LjcxMDEJLTMzNzkwNjQJNAlLYW5kYWhhciwgS2FuZGFoYXIsIEFmZ2hhbmlzdGFuCUFGCUFGMjMJMzEuNjEzMwk2NS43MTAxCTYyODE5ODIJMjAxMzAyMDMKMTc1NjMyOTk3CTIwMDYwMTAxCTIwMDYwMQkyMDA2CTIwMDYuMDAyNwkJCQkJCQkJCQkJVUtSCVVLUkFJTkUJVUtSCQkJCQkJCQkwCTA0NgkwNDYJMDQJMQk3",
                totalDataSize: 29817205
            });
        });

        it("show should work", function(done) {
             // need open filebrowser for the UI simulate
             modal.show({
                targetName: gDefaultSharedRoot,
                path: "/",
                fileName: "gdelt",
            })
            .then(() => {
                expect($modal.find(".preview.normal").text())
                .not.equal("");
                done();
            })
            .fail(() => {
                done("fail");
            });
        });

        it("should update offset", function() {
            if (isBrowserMicrosoft) {
                return;
            }
            // error case
            modal._updateOffset("abs");
            expect(getOffsetNum()).to.equal("0");

            // valid case
            modal._updateOffset(5, true);
            expect(getOffsetNum()).to.equal("5");
            var $cell = $modal.find(".preview.normal .cell").eq(5);
            expect($cell.hasClass("active")).to.be.true;
        });

        it("should not fetch invalid offset", function(done) {
            modal._updateOffset(0, true);

            modal._fetchNewPreview(1000000000)
            .then(function() {
                expect(getOffsetNum()).to.equal("0");
                assert.isTrue($("#statusBox").is(":visible"));
                StatusBox.forceHide();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should fetch valid offset", function(done) {
            modal._updateOffset(0, true);

            modal._fetchNewPreview(2048)
            .then(function() {
                expect(getOffsetNum()).to.equal("2048");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should close previewer", function() {
            $modal.find(".close").click();
            expect($modal.is(":visible")).to.be.false;
        });

        after(function() {
            XcalarPreview = oldPreview;
        });
    });

    after(function() {
        UnitTest.offMinMode();
    });

    function getOffsetNum() {
        return $modal.find(".offsetNum").text();
    }
});