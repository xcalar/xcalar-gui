// A basic test
mocha.timeout(50 * 1000);
describe("Mocha Setup Test", function() {
    this.timeout(2 * 60 * 1000);
    before(function() {
        console.log("Mocha Setup Test");
        UnitTest.onMinMode();
    });

    // Note that this test helps to wait for 1s so that
    // UI has enough time to load
    it("Should pass simple promise test", function(done) {
        simplePromiseTest()
        .then(function(res) {
            expect(res).to.equal("pass");
            done();
        });
    });

    it("Should set up correctly", function(done) {
        function transformToAssocArray(prmstr) {
            var params = {};
            var prmarr = prmstr.split("&");
            for ( var i = 0; i < prmarr.length; i++) {
                var tmparr = prmarr[i].split("=");
                params[tmparr[0]] = tmparr[1];
            }
            return params;
        }
        function getUrlParameters() {
            var prmstr = window.location.search.substr(1);
            return prmstr != null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
        }
        params = getUrlParameters();
        if (params.hasOwnProperty("createWorkbook")) {
            TestSuiteSetup.setup();
            TestSuiteSetup.initialize(true)
            .always(function() {
                expect("pass").to.equal("pass");
                done();
            });
        } else {
            xcManager.setup()
            .then(function() {
                XcUser.CurrentUser.disableIdleCheck();
                window.onbeforeunload = function() {
                    return;
                };

                expect("pass").to.equal("pass");
                done();
            })
            .fail(function(error) {
                done("failed");
                console.error(error);
                // fail case
                throw error;
            });
        }
    });

    it("Should check license type", function() {
        var mode = XVM.getLicenseMode();
        var valid = (mode === XcalarMode.Oper) || (mode === XcalarMode.Mod);
        if (valid) {
            expect(valid).to.be.true;
        } else if (mode === XcalarMode.Unlic) {
            console.error("license type is unlicensed, it should not happen, but still trying running test");
        } else {
            console.error("invalid license, it should not happen, but still trying running test");
        }

    });

    it("duplicate element IDs should not exist", function() {
         var map = {};
         $('[id]').each(function(){
             var id = $(this).attr('id');
             if (map[id]) {
                 expect(id).to.equal("duplicate element IDs should not exist");
                 return false;
             } else {
                 map[id] = true;
             }
         });
    });

    it("should go to notebook screen", () => {
        if (!$("#sqlWorkSpacePanel").is(":visible")) {
            $("#notebookScreenBtn").click();
            expect($("#sqlWorkSpacePanel").is(":visible")).to.be.true;
        }
    });

    after(function() {
        UnitTest.offMinMode();
    });

    function simplePromiseTest() {
        var deferred = PromiseHelper.deferred();

        setTimeout(function() {
            deferred.resolve("pass");
        }, 100);

        return deferred.promise();
    }
});



