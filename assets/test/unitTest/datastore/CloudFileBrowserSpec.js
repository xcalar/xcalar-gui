describe.skip("CloudFileBrowser Test", function() {
    let $fileBrowser;

    before(function() {
        $fileBrowser = $("#fileBrowser");
    });
    
    it("should show", function() {
        let oldFunc = FileBrowser.show;
        called = false;
        FileBrowser.show = () => called = true;
        
        CloudFileBrowser.show();
        expect(called).to.equal(true);
        expect($fileBrowser.hasClass("cloud")).to.be.true;

        FileBrowser.show = oldFunc;
    });

    it("CloudFileBrowser.getCloudPath should work", function(done) {
        let oldFunc = CloudManager.Instance.getS3BucketInfo;
        CloudManager.Instance.getS3BucketInfo = () => PromiseHelper.resolve({
            "bucket": "test"
        });
        
        CloudFileBrowser.getCloudPath()
        .then(function(path) {
            expect(path).to.equal("/test/");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            CloudManager.Instance.getS3BucketInfo = oldFunc;
        });
    });

    it("CloudFileBrowser.getCloudPath should handle fail case", function(done) {
        let oldFunc = CloudManager.Instance.getS3BucketInfo;
        CloudManager.Instance.getS3BucketInfo = () => PromiseHelper.reject("test");
        
        CloudFileBrowser.getCloudPath()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.be.undefined;
            done();
        })
        .always(function() {
            CloudManager.Instance.getS3BucketInfo = oldFunc;
        });
    });

    it("should clear", function() {
        CloudFileBrowser.clear();
        expect($fileBrowser.hasClass("cloud")).to.be.false;
    });
});