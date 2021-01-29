describe("DFUploadModal Test", function() {
    var $modal;
    var $sourcePath;
    var $destPath;

    before(function() {
        $modal = $("#dfUploadModal");
        $sourcePath = $modal.find(".source .path");
        $destPath = $modal.find(".dest .path");
    });

    describe("Upload Dataflow Api Test", function() {
        it("should show the modal", function() {
            DFUploadModal.Instance.show();
            assert.isTrue($modal.is(":visible"));
        });

        it("should change the file path and check invalid case", function() {
            var name = "test";
            name = xcHelper.checkNamePattern("dataflow", "fix", name);
            var path = name;
            var cnt = 0;
            while (!DagList.Instance.isUniqueName(path)) {
                path = `${name}${++cnt}`;
            }

            DFUploadModal.Instance._changeFilePath("test.pdf");
            expect($sourcePath.val()).to.equal("test.pdf");
            expect($destPath.val()).to.equal(path);
            expect($modal.find(".confirm").hasClass("btn-disabled"))
            .to.be.true;
            UnitTest.hasStatusBoxWithError(ErrTStr.RetinaFormat);
        });

        it("should change file path to valid case", function() {
            DFUploadModal.Instance._changeFilePath("file.tar.gz");
            expect($sourcePath.val()).to.equal("file.tar.gz");
            expect($destPath.val()).to.equal("file");
            expect($modal.find(".confirm").hasClass("btn-disabled")).to.be.false;
        });

        it("fakeBrowse btn should trigger real btn", function() {
            var clicked = false;
            var $browseBtn = DFUploadModal.Instance._getBrowseButton();
            $browseBtn.attr("type", "");
            $browseBtn.on("click.unitTest", function() {
                clicked = true;
            });
            $modal.find(".source button.browse").click();
            expect(clicked).to.be.true;
            clicked = false;
            $sourcePath.mousedown();
            expect(clicked).to.be.true;
            $browseBtn.attr("type", "file");
        });

        it("should close the card", function() {
            $modal.find(".close").click();
            assert.isFalse($modal.is(":visible"));
        });
    });

    describe("Upload Dataflow Submit Test", function() {
        var oldReader;
        var oldAddDF;
        var isAddDF = false;
        var oldShowSuccess = xcUIHelper.showSuccess;

        before(function() {
            var FakeFileReader = function() {
                return this;
            };
            //Fake version of the method we depend upon
            FakeFileReader.prototype.readAsBinaryString = function(file){
                var e = {"target": {"result": 'test'}};
                this.onload(e);
                return file;
            };
            FakeFileReader.prototype.onload = null;

            oldReader = FileReader;
            FileReader = FakeFileReader;

            oldAddDF = DagTabUser.prototype.upload;
            oldShowSuccess = xcUIHelper.showSuccess;

            DagTabUser.prototype.upload = function() {
                isAddDF = true;
                return PromiseHelper.resolve({tabUploaded: {}})
            };

            xcUIHelper.showSuccess = function(input) {
                successMsg = input;
            };

            DFUploadModal.Instance.show();
            DFUploadModal.Instance._changeFilePath("file.json");
            StatusBox.forceHide();
        });

        beforeEach(() => {
            let $btn = DFUploadModal.Instance._getModal().find(".confirm");
            $btn.removeClass("btn-disabled");
        });

        it("should reject if confirm btn is disabled", function(done) {
            let $btn = DFUploadModal.Instance._getModal().find(".confirm");
            $btn.addClass("btn-disabled");
            DFUploadModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function(error) {
                expect(error).to.be.undefined;
                done();
            });
        });

        it("should handle empty name error", function(done) {
            $destPath.val("");

            DFUploadModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
                done();
            });
        });

        it("should handle name error", function(done) {
            $destPath.val("invalid#name");

            DFUploadModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(ErrTStr.DFNameIllegal);
                done();
            });
        });

        it("should handle name duplicate error", function(done) {
            var name = "DupNameTest"
            var oldFunc = DagList.Instance.isUniqueName;
            DagList.Instance.isUniqueName = () => false;

            DagList.Instance.changeName(name, "test");
            $destPath.val(name);
            DFUploadModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(DFTStr.DupDataflowName);
                done();
            })
            .always(() => {
                DagList.Instance.isUniqueName = oldFunc;
            });
        });

        it("should handle large file size error", function(done) {
            DFUploadModal.Instance._changeFilePath("file.tar.gz");
            DFUploadModal.Instance._file = {size: 6 * MB};
            DFUploadModal.Instance._submitForm();

            UnitTest.testFinish(function() {
                return $("#alertModal").is(":visible");
            })
            .then(function() {
                UnitTest.hasAlertWithTitle(AlertTStr.Title);
                DFUploadModal.Instance._changeFilePath("file.tar.gz");
                DFUploadModal.Instance._file = {size: 1 * KB};
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should upload the df", function(done) {
            let oldAdd = DagList.Instance.addDag;
            let oldLoad = DagTabManager.Instance.loadTab;
            let called = 0;
            DagList.Instance.addDag = () => { called++; };
            DagTabManager.Instance.loadTab = () => { called++; }

            FileReader.prototype.readAsBinaryString = function(file){
                var e = {"target": {"result": '{"nodes":[],"display":{"width":-1,"height":-1}}'}};
                this.onload(e);
                return file;
            };
            $destPath.val("uploadTest");
            DFUploadModal.Instance._submitForm()
            .then(() => {
                expect(isAddDF).to.be.true;
                expect(called).to.equal(2);
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                DagList.Instance.addDag = oldAdd;
                DagTabManager.Instance.loadTab = oldLoad;
            });
        });

        after(function() {
            FileReader = oldReader;
            DagTabUser.prototype.upload = oldAddDF;
            xcUIHelper.showSuccess = oldShowSuccess;
        });
    });

    after(function() {
        DFUploadModal.Instance._close();
    });
});