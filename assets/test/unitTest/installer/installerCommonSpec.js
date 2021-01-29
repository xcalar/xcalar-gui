describe("InstallerCommon Common Test", function() {
    var $forms;
    var installStatus = {
        "Error": -1,     // Error shows up, installation fails and quits
        "Running": 1,     // Installation is running in some steps
        "Done": 2       // Entire installation is sucessfully done
    };
    var fakeRes = {
        "error": [-1, -1]
    };

    before(function() {
        $forms = $("form");
        for (var i = 0; i < $forms.length; i++) {
            $forms[i].reset();
        }
    });

    it("Validate Key should work - invalid license key check by frontend", function(done) {
        var $form = $("#licenseForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        var originSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        $form.find(".licenseKey").val("123");
        InstallerCommon.validateKey($form)
        .then(function() {
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done("fail");
        })
        .fail(function(data1, data2) {
            expect(data1).to.equal("Invalid license key");
            expect(data2).to.equal("The license "+
                        "key that you have entered is not valid. Please " +
                        "check the key and try again");
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done();
        });
    });

    it("Validate Key should work - valid license key handle", function(done) {
        var $form = $("#licenseForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");

        var unitTestStructPara;
        var originSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        $form.find(".licenseKey").val("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAJAAAGADY" +
        "JTAAPAXN7SBTEWC3S6DQT46XD64MCQKEHKKE5QFEF5QALLH247EKBXSNZA" +
        "TCHH5G55SEZNCE3FNESAABLBY========");
        unitTestStructPara = {verified: true};
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.resolve("hint", unitTestStructPara);
        });
        InstallerCommon.validateKey($form)
        .then(function() {
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done();
        })
        .fail(function() {
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done("fail");
        });
    });

    it("Validate Key should work - invalid license key check by backend", function(done) {
        var $form = $("#licenseForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");

        var unitTestStructPara;
        var originSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        $form.find(".licenseKey").val("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAJAAAGADY" +
        "JTAAPAXN7SBTEWC3S6DQT46XD64MCQKEHKKE5QFEF5QALLH247EKBXSNZA" +
        "TCHH5G55SEZNCE3FNESAABLBY========");
        unitTestStructPara = {verified: false};
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.resolve("hint", unitTestStructPara);
        });
        InstallerCommon.validateKey($form)
        .then(function() {
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done("fail");
        })
        .fail(function(data1, data2) {
            expect(data1).to.equal("Invalid server license key");
            expect(data2).to.equal("The license key that you have entered is" +
                            " not valid. Please check the key and try again");
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done();
        });
    });

    it("Validate Key should work - connection error", function(done) {
        var $form = $("#licenseForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");

        var unitTestStructPara;
        var originSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        $form.find(".licenseKey").val("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAJAAAGADY" +
        "JTAAPAXN7SBTEWC3S6DQT46XD64MCQKEHKKE5QFEF5QALLH247EKBXSNZA" +
        "TCHH5G55SEZNCE3FNESAABLBY========");
        unitTestStructPara = {};
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.reject("hint", unitTestStructPara);
        });
        InstallerCommon.validateKey($form)
        .then(function() {
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done("fail");
        })
        .fail(function(data1, data2) {
            expect(data1).to.equal("Connection Error");
            expect(data2).to.equal("Connection with the" +
                        " authentication server cannot be established.");
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done();
        });
    });

    it("Validate Key upgrade should work - no select checkbox will not upgrade", function(done) {
        var $form = $("#licenseUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        var originSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        $form.find(".checkbox").removeClass("checked");
        $form.find(".licenseKey").val("123");
        InstallerCommon.validateKey($form)
        .then(function() {
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done();
        })
        .fail(function() {
            $form.find(".licenseKey").val("");
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done("fail");
        });
    });

    it("Validate Pre config should work - choose preConfig", function(done) {
        var $form = $("#preConfigForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".radioButton[data-option='yes']").click();
        InstallerCommon.validatePreConfig($form)
        .always(function(res) {
            expect(res.preConfig).equal(true);
            done();
        });
    });

    it("Validate Pre config should work - do no choose preConfig", function(done) {
        var $form = $("#preConfigForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".radioButton[data-option='no']").click();
        InstallerCommon.validatePreConfig($form)
        .always(function(res) {
            expect(res.preConfig).equal(false);
            done();
        });
    });

    it("Validate NFS should work - xcalarNfs", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=xcalarNfs]").click();
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(JSON.stringify(data), Object.keys(data).sort())
            .to.equal('{"nfsOption":{"copy":false,"option":"xcalarNfs"}}');
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - customerNfs with empty nfsServer", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=customerNfs]").click();
        $form.find(".nfsServer").text("");
        InstallerCommon.validateNfs($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("NFS Server Invalid");
            expect(data2).to.equal("You must provide a valid NFS Server" +
                " IP or FQDN");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - customerNfs with empty nfsMountPoint", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=customerNfs]").click();
        $form.find(".nfsServer").val("A");
        $form.find("input.nfsMountPoint").val("");
        InstallerCommon.validateNfs($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("NFS MountPoint Invalid");
            expect(data2).to.equal("You must provide a valid NFS Mount Point");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - customerNfs", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=customerNfs]").click();
        $form.find(".nfsServer").val("A");
        $form.find(".nfsMountPoint").val("B");
        $form.find(".nfsUserName").val("C");
        $form.find(".nfsUserGroup").val("D");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("customerNfs");
            expect(data.nfsOption.copy).to.equal(false);
            expect(data.nfsOption.nfsServer).to.equal("A");
            expect(data.nfsOption.nfsMountPoint).to.equal("/B");
            expect(data.nfsOption.nfsUsername).to.equal("C");
            expect(data.nfsOption.nfsGroup).to.equal("D");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - customerNfs - slash path", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=customerNfs]").click();
        $form.find(".nfsServer").val("A");
        $form.find(".nfsMountPoint").val("/B");
        $form.find(".nfsUserName").val("C");
        $form.find(".nfsUserGroup").val("D");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("customerNfs");
            expect(data.nfsOption.copy).to.equal(false);
            expect(data.nfsOption.nfsServer).to.equal("A");
            expect(data.nfsOption.nfsMountPoint).to.equal("/B");
            expect(data.nfsOption.nfsUsername).to.equal("C");
            expect(data.nfsOption.nfsGroup).to.equal("D");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - readyNfs with empty mount point", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=readyNfs]").click();
        $form.find(".nfsMountPointReady").text("");
        InstallerCommon.validateNfs($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("NFS Mount Path Invalid");
            expect(data2).to.equal("You must provide a valid NFS Mount Path");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - readyNfs cases add slash", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=readyNfs]").click();
        $form.find(".nfsMountPointReady").val("E");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("readyNfs");
            expect(data.nfsOption.nfsReuse).to.equal("/E");
            expect(data.nfsOption.copy).to.equal(false);
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - readyNfs cases", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=readyNfs]").click();
        $form.find(".nfsMountPointReady").val("/E");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("readyNfs");
            expect(data.nfsOption.nfsReuse).to.equal("/E");
            expect(data.nfsOption.copy).to.equal(false);
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - readyNfs cases remove slash at the back", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=readyNfs]").click();
        $form.find(".nfsMountPointReady").val("E/");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("readyNfs");
            expect(data.nfsOption.nfsReuse).to.equal("/E");
            expect(data.nfsOption.copy).to.equal(false);
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS should work - readyNfs cases remove slash at the back 2", function(done) {
        var $form = $("#sharedStorageForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $form.find(".nfsChoice .radioButton[data-option=readyNfs]").click();
        $form.find(".nfsMountPointReady").val("/E/");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("readyNfs");
            expect(data.nfsOption.nfsReuse).to.equal("/E");
            expect(data.nfsOption.copy).to.equal(false);
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS for upgrade should work - do nothing", function(done) {
        var $form = $("#sharedStorageUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        if ($form.find(".checkbox").hasClass("checked")) {
            $form.find(".checkbox").click();
        }
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("readyNfs");
            expect(data.nfsOption.nfsReuse).to.equal(undefined);
            $form.find(".checkbox").removeClass("checked");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS for upgrade should work - xcalarNfs", function(done) {
        var $form = $("#sharedStorageUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        if (!$form.find(".checkbox").hasClass("checked")) {
            $form.find(".checkbox").click();
        }
        $form.find(".copyChoice .radioButton[data-option=xcalarCopy]").click();
        $form.find(".nfsChoice .radioButton[data-option=xcalarNfs]").click();
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(JSON.stringify(data), Object.keys(data).sort())
            .to.equal('{"nfsOption":{"copy":true,"option":"xcalarNfs"}}');
            $form.find(".checkbox").removeClass("checked");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS for upgrade should work - customerNfs case empty nfsServer", function(done) {
        var $form = $("#sharedStorageUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        if (!$form.find(".checkbox").hasClass("checked")) {
            $form.find(".checkbox").click();
        }
        $form.find(".nfsChoice .radioButton[data-option=customerNfs]").click();
        $form.find(".nfsServer").text("");
        InstallerCommon.validateNfs($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("NFS Server Invalid");
            expect(data2).to.equal("You must provide a valid NFS Server" +
                " IP or FQDN");
            $form.find(".checkbox").removeClass("checked");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS for upgrade should work - customerNfs case empty nfsMountPoint", function(done) {
        var $form = $("#sharedStorageUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        if (!$form.find(".checkbox").hasClass("checked")) {
            $form.find(".checkbox").click();
        }
        $form.find(".nfsChoice .radioButton[data-option=customerNfs]").click();
        $form.find(".nfsServer").val("A");
        $form.find(".nfsMountPoint").val("");
        InstallerCommon.validateNfs($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("NFS MountPoint Invalid");
            expect(data2).to.equal("You must provide a valid NFS Mount Point");
            $form.find(".checkbox").removeClass("checked");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS for upgrade should work - customerNfs case", function(done) {
        var $form = $("#sharedStorageUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        if (!$form.find(".checkbox").hasClass("checked")) {
            $form.find(".checkbox").click();
        }
        $form.find(".nfsChoice .radioButton[data-option=customerNfs]").click();
        $form.find(".nfsServer").val("A");
        $form.find(".nfsMountPoint").val("B");
        $form.find(".nfsUserName").val("C");
        $form.find(".nfsUserGroup").val("D");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("customerNfs");
            expect(data.nfsOption.copy).to.equal(true);
            expect(data.nfsOption.nfsServer).to.equal("A");
            expect(data.nfsOption.nfsMountPoint).to.equal("/B");
            expect(data.nfsOption.nfsUsername).to.equal("C");
            expect(data.nfsOption.nfsGroup).to.equal("D");
            $form.find(".checkbox").removeClass("checked");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS for upgrade should work - readyNfs case with empty nfsMountPoint", function(done) {
        var $form = $("#sharedStorageUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        if (!$form.find(".checkbox").hasClass("checked")) {
            $form.find(".checkbox").click();
        }
        $form.find(".nfsChoice .radioButton[data-option=readyNfs]").click();
        $form.find(".nfsMountPointReady").text("");
        InstallerCommon.validateNfs($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("NFS Mount Path Invalid");
            expect(data2).to.equal("You must provide a valid NFS Mount Path");
            $form.find(".checkbox").removeClass("checked");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate NFS for upgrade should work - readyNfs case", function(done) {
        var $form = $("#sharedStorageUpdateForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        if (!$form.find(".checkbox").hasClass("checked")) {
            $form.find(".checkbox").click();
        }
        $form.find(".nfsChoice .radioButton[data-option=readyNfs]").click();
        $form.find(".nfsMountPointReady").val("E");
        InstallerCommon.validateNfs($form)
        .always(function(data) {
            expect(data.nfsOption.option).to.equal("readyNfs");
            expect(data.nfsOption.nfsReuse).to.equal("/E");
            expect(data.nfsOption.copy).to.equal(true);
            $form.find(".checkbox").removeClass("checked");
            $form.find(".nfsServer").val("");
            $form.find(".nfsMountPoint").val("");
            $form.find(".nfsUserName").val("");
            $form.find(".nfsUserGroup").val("");
            $form.find(".nfsMountPointReady").val("");
            done();
        });
    });

    it("Validate validateInstallationDirectory should work - empty case", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find(".installationDirectorySection input").val("");
        var res = InstallerCommon.validateInstallationDirectory($form) || fakeRes;
        expect(res["error"][0]).to.equal("Empty Installation Directory");
        expect(res["error"][1]).to.equal("Please assign a value to Installation Directory");
    });

    it("Validate validateInstallationDirectory should work slash before end", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find(".installationDirectorySection input").val("/abcd/");
        var res = InstallerCommon.validateInstallationDirectory($form) || fakeRes;
        expect(JSON.stringify(res)).to.equal('{"installationDirectory":"/abcd"}');
    });

    it("Validate validateInstallationDirectory should work no slash", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find(".installationDirectorySection input").val("abcd");
        var res = InstallerCommon.validateInstallationDirectory($form) || fakeRes;
        expect(JSON.stringify(res)).to.equal('{"installationDirectory":"/abcd"}');
    });

    it("Validate validateInstallationDirectory should work slash before", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find(".installationDirectorySection input").val("/abcd");
        var res = InstallerCommon.validateInstallationDirectory($form) || fakeRes;
        expect(JSON.stringify(res)).to.equal('{"installationDirectory":"/abcd"}');
    });

    it("Validate validateInstallationDirectory should work slash end", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find(".installationDirectorySection input").val("abcd/");
        var res = InstallerCommon.validateInstallationDirectory($form) || fakeRes;
        expect(JSON.stringify(res)).to.equal('{"installationDirectory":"/abcd"}');
    });

    it("Validate validateSerializationDirectory should work - empty case", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find('.radioButton[data-option="xcalarRootDirectory"]').click();
        $form.find(".serializationDirectorySection .SERDESDirectory input").val("");
        var res = (InstallerCommon.validateSerializationDirectory($form)) || res;
        expect(res.serializationDirectory).to.equal(null);
    });

    it("Validate validateSerializationDirectory should work - empty case", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find('.radioButton[data-option="otherDirectory"]').click();
        $form.find(".serializationDirectorySection .SERDESDirectory input").val("");
        var res = (InstallerCommon.validateSerializationDirectory($form)) || res;
        expect(res["error"][0]).to.equal("Empty Serialization / Deserialization Directory");
        expect(res["error"][1]).to.equal("Please assign a value to Serialization / Deserialization Directory");
    });

    it("Validate validateSerializationDirectory should work slash before end", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find('.radioButton[data-option="otherDirectory"]').click();
        $form.find(".serializationDirectorySection .SERDESDirectory input").val("/abcd/");
        var res = (InstallerCommon.validateSerializationDirectory($form)) || res;
        expect(JSON.stringify(res)).to.equal('{"serializationDirectory":"/abcd"}');
    });

    it("Validate validateSerializationDirectory should work no slash", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find('.radioButton[data-option="otherDirectory"]').click();
        $form.find(".serializationDirectorySection .SERDESDirectory input").val("abcd");
        var res = (InstallerCommon.validateSerializationDirectory($form)) || res;
        expect(JSON.stringify(res)).to.equal('{"serializationDirectory":"/abcd"}');
    });

    it("Validate validateSerializationDirectory should work slash before", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find('.radioButton[data-option="otherDirectory"]').click();
        $form.find(".serializationDirectorySection .SERDESDirectory input").val("/abcd");
        var res = (InstallerCommon.validateSerializationDirectory($form)) || res;
        expect(JSON.stringify(res)).to.equal('{"serializationDirectory":"/abcd"}');
    });

    it("Validate validateSerializationDirectory should work slash end", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find('.radioButton[data-option="otherDirectory"]').click();
        $form.find(".serializationDirectorySection .SERDESDirectory input").val("abcd/");
        var res = (InstallerCommon.validateSerializationDirectory($form)) || res;
        expect(JSON.stringify(res)).to.equal('{"serializationDirectory":"/abcd"}');
    });

    it("Validate Credentials should work - empty username and port", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        var res = InstallerCommon.validateCredentials($form) || fakeRes;
        expect(res["error"][0]).to.equal("Empty Username / Port");
        expect(res["error"][1]).to.equal("Your SSH username / port cannot be empty.");
        $(".hostUsername .input").eq(0).removeAttr('value');
        $(".hostPassword input").val("");
        $(".hostSshKey textarea").val("");
    });

    it("Validate Credentials should work - empty password case", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        $form.find(".hostUsername input:visible").eq(0).val("username");
        $form.find(".hostUsername input:visible").eq(1).val("ssh port");
        $form.find('.radioButton[data-option="password"]').click();
        var res = InstallerCommon.validateCredentials($form) || fakeRes;
        expect(res["error"][0]).to.equal("Empty Password");
        expect(res["error"][1]).to.equal("For passwordless ssh, upload your ssh key");
        $(".hostUsername .input").eq(0).removeAttr('value');
        $(".hostPassword input").val("");
        $(".hostSshKey textarea").val("");
    });

    it("Validate Credentials should work - password case", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        $form.find(".hostUsername input:visible").eq(0).val("username");
        $form.find(".hostUsername input:visible").eq(1).val("ssh port");
        $form.find('.radioButton[data-option="password"]').click();
        $form.find(".hostPassword input").val("12345");
        var res = InstallerCommon.validateCredentials($form) || fakeRes;
        expect(res.credentials.password).to.equal("12345");
        $(".hostUsername .input").eq(0).removeAttr('value');
        $(".hostPassword input").val("");
        $(".hostSshKey textarea").val("");
    });

    it("Validate Credentials should work - empty ssh key case", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        $form.find(".hostUsername input:visible").eq(0).val("username");
        $form.find(".hostUsername input:visible").eq(1).val("ssh port");
        $form.find('.radioButton[data-option="sshKey"]').click();
        var res = InstallerCommon.validateCredentials($form) || fakeRes;
        expect(res["error"][0]).to.equal("Empty Ssh Key");
        expect(res["error"][1]).to.equal("Your ssh key is generally located at ~/.ssh/id_rsa");
        $(".hostUsername .input").eq(0).removeAttr('value');
        $(".hostPassword input").val("");
        $(".hostSshKey textarea").val("");
    });

    it("Validate Credentials should work - ssh key case", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        $form.find(".hostUsername input:visible").eq(0).val("username");
        $form.find(".hostUsername input:visible").eq(1).val("ssh port");
        $form.find('.radioButton[data-option="sshKey"]').click();
        $form.find(".hostSshKey textarea").val("6789");
        var res = InstallerCommon.validateCredentials($form) || fakeRes;
        expect(res.credentials.sshKey).to.equal("6789");
        $(".hostUsername .input").eq(0).removeAttr('value');
        $(".hostPassword input").val("");
        $(".hostSshKey textarea").val("");
    });

    it("Validate Credentials should work - ssh user Settings", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(1);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        $form.find(".hostUsername input:visible").eq(0).val("username");
        $form.find(".hostUsername input:visible").eq(1).val("ssh port");
        $form.find('.radioButton[data-option="sshUserSettings"]').click();
        var res = InstallerCommon.validateCredentials($form) || fakeRes;
        expect(res.credentials.sshUserSettings).to.equal(true);
    });

    it("Validate Hosts should work - empty hosts", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        var res = InstallerCommon.validateHosts($form) || fakeRes;
        expect(res["error"][0]).to.equal("No hosts");
        expect(res["error"][1]).to.equal("You must install on at least 1 host");
    });

    it("Validate Hosts should work - private hostname without public hostname", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        var hostArray = $(".row .hostname .publicName input");
        var hostPrivateArray = $(".row .hostname .privateName input");

        hostArray.val("");
        hostPrivateArray.eq(0).val("127.0.0.1");
        var res = InstallerCommon.validateHosts($form) || fakeRes;
        expect(res["error"][0]).to.equal("No public name");
        expect(res["error"][1]).to.equal("You must provide a public name for all private names");
    });

    it("Validate Hosts should work - not every node has privHosts", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        var hostArray = $(".row .hostname .publicName input");
        var hostPrivateArray = $(".row .hostname .privateName input");

        hostPrivateArray.eq(0).val("127.0.0.1");
        hostArray.eq(0).val("127.0.0.1");
        hostArray.eq(1).val("127.0.0.1");
        var res = InstallerCommon.validateHosts($form) || fakeRes;
        expect(res["error"][0]).to.equal("Private / Public Hostname Error");
        expect(res["error"][1]).to.equal("Either provide private hostnames / IPs for all or none of the hosts");
    });

    it("Validate Hosts should work - duplicate public Hosts", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        var hostArray = $(".row .hostname .publicName input");
        var hostPrivateArray = $(".row .hostname .privateName input");

        hostPrivateArray.eq(0).val("127.0.0.1");
        hostPrivateArray.eq(1).val("127.0.0.1");
        hostArray.eq(0).val("127.0.0.1");
        hostArray.eq(1).val("127.0.0.1");
        var res = InstallerCommon.validateHosts($form) || fakeRes;
        expect(res["error"][0]).to.equal("Duplicate Hosts");
        expect(res["error"][1]).to.equal("Public Hostname 127.0.0.1 is a duplicate");
    });

    it("Validate Hosts should work - duplicate private Hosts", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        var hostArray = $(".row .hostname .publicName input");
        var hostPrivateArray = $(".row .hostname .privateName input");

        hostPrivateArray.eq(0).val("127.0.0.1");
        hostPrivateArray.eq(1).val("127.0.0.1");
        hostArray.eq(0).val("127.0.0.1");
        hostArray.eq(1).val("127.0.0.2");
        var res = InstallerCommon.validateHosts($form) || fakeRes;
        expect(res["error"][0]).to.equal("Duplicate Hosts");
        expect(res["error"][1]).to.equal("Private Hostname 127.0.0.1 is a duplicate");
    });

    it("Validate Hosts should work", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        var hostArray = $(".row .hostname .publicName input");
        var hostPrivateArray = $(".row .hostname .privateName input");

        hostPrivateArray.eq(0).val("");
        hostPrivateArray.eq(1).val("");
        hostArray.eq(0).val("127.0.0.1");
        hostArray.eq(1).val("127.0.0.2");
        var res = InstallerCommon.validateHosts($form) || fakeRes;
        expect(res.hostnames[0]).to.equal("127.0.0.1");
        expect(res.hostnames[1]).to.equal("127.0.0.2");
    });

    it("Validate Settings should work", function(done) {
        var originValidateHosts = InstallerCommon.validateHosts;
        var originValidateInstallationDirectory = InstallerCommon.validateInstallationDirectory;
        var originValidateSerializationDirectory = InstallerCommon.validateSerializationDirectory;
        var originValidateCredentials = InstallerCommon.validateCredentials;
        var originSupportBundles = InstallerCommon.validateSupportBundles;
        var originValidateEnableHotPatches = InstallerCommon.validateEnableHotPatches;

        InstallerCommon.validateHosts = function() {
            return {"a": "a"};
        };
        InstallerCommon.validateInstallationDirectory = function() {
            return {"b": "b"};
        };
        InstallerCommon.validateSerializationDirectory = function() {
            return {"c": "c"};
        };
        InstallerCommon.validateCredentials = function() {
            return {"d": "d"};
        };
        InstallerCommon.validateSupportBundles = function() {
            return {"e": "e"};
        }
        InstallerCommon.validateEnableHotPatches = function() {
            return {"f": "f"};
        }

        InstallerCommon.validateSettings($("#hostForm"))
        .always(function() {
            expect(InstallerCommon.__testOnly__.finalStruct.a).to.equal("a");
            expect(InstallerCommon.__testOnly__.finalStruct.b).to.equal("b");
            expect(InstallerCommon.__testOnly__.finalStruct.c).to.equal("c");
            expect(InstallerCommon.__testOnly__.finalStruct.d).to.equal("d");
            expect(InstallerCommon.__testOnly__.finalStruct.e).to.equal("e");
            expect(InstallerCommon.__testOnly__.finalStruct.f).to.equal("f");
            delete InstallerCommon.__testOnly__.finalStruct.a;
            delete InstallerCommon.__testOnly__.finalStruct.b;
            delete InstallerCommon.__testOnly__.finalStruct.c;
            delete InstallerCommon.__testOnly__.finalStruct.d;
            delete InstallerCommon.__testOnly__.finalStruct.e;
            delete InstallerCommon.__testOnly__.finalStruct.f;
            InstallerCommon.validateHosts = originValidateHosts;
            InstallerCommon.validateInstallationDirectory = originValidateInstallationDirectory;
            InstallerCommon.validateSerializationDirectory = originValidateSerializationDirectory;
            InstallerCommon.validateCredentials = originValidateCredentials;
            InstallerCommon.validateSupportBundles = originSupportBundles;
            InstallerCommon.validateEnableHotPatches = originValidateEnableHotPatches;
            done();
        });
    });

    it("Validate Settings should work - width error", function(done) {
        var originValidateHosts = InstallerCommon.validateHosts;
        var originValidateInstallationDirectory = InstallerCommon.validateInstallationDirectory;
        var originValidateSerializationDirectory = InstallerCommon.validateSerializationDirectory;
        var originValidateCredentials = InstallerCommon.validateCredentials;
        var originSupportBundles = InstallerCommon.validateSupportBundles;

        InstallerCommon.validateHosts = function() {
            return {"a": "a"};
        };
        InstallerCommon.validateInstallationDirectory = function() {
            return {"b": "b"};
        };
        InstallerCommon.validateSerializationDirectory = function() {
            return {"error": ["error-state-1", "error-state-2"]};
        };
        InstallerCommon.validateCredentials = function() {
            return {"d": "d"};
        };
        InstallerCommon.validateSupportBundles = function() {
            return {"e": "e"};
        }

        InstallerCommon.validateSettings()
        .always(function(data1, data2) {
            expect(data1).to.equal("error-state-1");
            expect(data2).to.equal("error-state-2");
            delete InstallerCommon.__testOnly__.finalStruct.a;
            delete InstallerCommon.__testOnly__.finalStruct.b;
            delete InstallerCommon.__testOnly__.finalStruct.c;
            delete InstallerCommon.__testOnly__.finalStruct.d;
            delete InstallerCommon.__testOnly__.finalStruct.e;
            InstallerCommon.validateHosts = originValidateHosts;
            InstallerCommon.validateInstallationDirectory = originValidateInstallationDirectory;
            InstallerCommon.validateSerializationDirectory = originValidateSerializationDirectory;
            InstallerCommon.validateCredentials = originValidateCredentials;
            InstallerCommon.validateSupportBundles = originSupportBundles;
            done();
        });
    });

    it("Validate Login Configuration should work - empty arguemnts", function(done) {
        var $form = $("#ldapForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.addClass("xcalarLdapOptions");
        $params.find("input").each(function(idx, val) {
            $(val).val("");
        });
        InstallerCommon.setupLoginConfiguration($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("Blank arguments");
            expect(data2).to.equal("Please populate all fields");
            $params.find("input").each(function(idx, val) {
                $(val).val("");
            });
            done();
        });
    });

    it("Validate Login Configuration should work - different password", function(done) {
        var $form = $("#ldapForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.addClass("xcalarLdapOptions");
        $params.find("input").each(function(idx, val) {
            $(val).val("");
        });

        $params.addClass("xcalarLdapOptions");
        $params.find("input").eq(0).val("p0");
        $params.find("input").eq(1).val("AA");
        $params.find("input").eq(2).val("BB");
        $params.find("input").eq(3).val("p3");
        InstallerCommon.setupLoginConfiguration($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("Passwords different");
            expect(data2).to.equal("Passwords must be the same");
            $params.find("input").each(function(idx, val) {
                $(val).val("");
            });
            done();
        });
    });

    it("Validate Login Configuration should work - xcalar Install", function(done) {
        var $form = $("#ldapForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.addClass("xcalarLdapOptions");
        $params.find("input").each(function(idx, val) {
            $(val).val("");
        });

        $params.addClass("xcalarLdapOptions");
        $params.find("input").eq(0).val("p0");
        $params.find("input").eq(1).val("AA");
        $params.find("input").eq(2).val("AA");
        $params.find("input").eq(3).val("p3");
        if (!$form.find(".createDefaultAdmin.checkbox").hasClass("checked")) {
            $form.find(".createDefaultAdmin.checkbox").click();
        }
        $("#defaultAdminUsername").val("admin");
        $("#defaultAdminEmail").val("admin@gmail.com");
        $("#defaultAdminPassword").val("1234");
        $("#defaultAdminPasswordConfirm").val("1234");

        InstallerCommon.setupLoginConfiguration($form)
        .always(function() {
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.deployOption).to.equal("xcalarLdap");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.domainName).to.equal("p0");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.password).to.equal("AA");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.companyName).to.equal("p3");
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.defaultAdminEnabled).to.equal(true);
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.username).to.equal("admin");
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.email).to.equal("admin@gmail.com");
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.password).to.equal("1234");
            $params.find("input").each(function(idx, val) {
                $(val).val("");
            });
            done();
        });
    });

    it("Validate Login Configuration should work - customer Install", function(done) {
        var $form = $("#ldapForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.find("input").each(function(idx, val) {
            $(val).val("");
        });

        $forms.find(".radioButton[data-option=customerLdap]").click();
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.find("input").eq(0).val("p0");
        $params.find("input").eq(1).val("AA");
        $params.find("input").eq(2).val("AA");
        $params.find("input").eq(3).val("p3");

        $form.find("#ADChoice .radioButton[data-option=true]").click();
        if ($form.find(".createDefaultAdmin.checkbox").hasClass("checked")) {
            $form.find(".createDefaultAdmin.checkbox").click();
        }
        InstallerCommon.setupLoginConfiguration($form)
        .always(function() {
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.deployOption).to.equal("customerLdap");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.ldap_uri).to.equal("p0");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.userDN).to.equal("AA");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.searchFilter).to.equal("AA");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.serverKeyFile).to.equal("p3");
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.activeDir).to.equal(true);
            expect(InstallerCommon.__testOnly__.finalStruct.ldap.useTLS).to.equal(false);
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.defaultAdminEnabled).to.equal(false);
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.username).to.equal(undefined);
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.email).to.equal(undefined);
            expect(InstallerCommon.__testOnly__.finalStruct.defaultAdminConfig.password).to.equal(undefined);
            $params.find("input").each(function(idx, val) {
                $(val).val("");
            });
            done();
        });
    });

    it("Validate Login Configuration should work - configure ldap later without default admin", function(done) {
        var $form = $("#ldapForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.find("input").each(function(idx, val) {
            $(val).val("");
        });

        $forms.find(".radioButton[data-option=configLdapLater]").click();
        if ($form.find(".createDefaultAdmin.checkbox").hasClass("checked")) {
            $form.find(".createDefaultAdmin.checkbox").click();
        }
        InstallerCommon.setupLoginConfiguration($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("Blank Login Configurations");
            expect(data2).to.equal("Please either setup LDAP or enable default admin account");
            done();
        });
    });

    it("Validate Login Configuration should work - configure ldap later with default admin", function(done) {
        var $form = $("#ldapForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.find("input").each(function(idx, val) {
            $(val).val("");
        });

        $forms.find(".radioButton[data-option=configLdapLater]").click();
        if (!$form.find(".createDefaultAdmin.checkbox").hasClass("checked")) {
            $form.find(".createDefaultAdmin.checkbox").click();
        }
        $("#defaultAdminUsername").val("");
        $("#defaultAdminPassword").val("");
        $("#passwordStrength").val("");
        $("#defaultAdminPasswordConfirm").val("");
        InstallerCommon.setupLoginConfiguration($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("Blank arguments");
            expect(data2).to.equal("Please populate all fields");
            done();
        });
    });

    it("Validate Login Configuration should work - configure ldap later with default admin", function(done) {
        var $form = $("#ldapForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $params = $form.find(".ldapParams:not(.hidden)");
        $params.find("input").each(function(idx, val) {
            $(val).val("");
        });

        $forms.find(".radioButton[data-option=configLdapLater]").click();
        if (!$form.find(".createDefaultAdmin.checkbox").hasClass("checked")) {
            $form.find(".createDefaultAdmin.checkbox").click();
        }
        $("#defaultAdminUsername").val("");
        $("#defaultAdminPassword").val("");
        $("#passwordStrength").val("");
        $("#defaultAdminPasswordConfirm").val("");
        InstallerCommon.setupLoginConfiguration($form)
        .always(function(data1, data2) {
            expect(data1).to.equal("Blank arguments");
            expect(data2).to.equal("Please populate all fields");
            done();
        });
    });

    it("Find Step Id and show step should work", function() {
        var $forms = $("form.install");
        var $choiceForm = $("#choiceForm");
        var $licenseForm = $("#licenseForm");
        var $preConfigForm = $("#preConfigForm");
        var $sharedStorageForm = $("#sharedStorageForm");
        var $ldapForm = $("#ldapForm");
        var $hostForm = $("#hostForm");
        var $licenseUpdateForm = $("#licenseUpdateForm");
        expect(InstallerCommon.__testOnly__.findStepId($choiceForm, $forms))
        .to.equal(0);
        expect(InstallerCommon.__testOnly__.findStepId($licenseForm, $forms))
        .to.equal(1);
        expect(InstallerCommon.__testOnly__.findStepId($preConfigForm, $forms))
        .to.equal(2);
        expect(InstallerCommon.__testOnly__.findStepId($sharedStorageForm, $forms))
        .to.equal(3);
        expect(InstallerCommon.__testOnly__.findStepId($ldapForm, $forms))
        .to.equal(4);
        expect(InstallerCommon.__testOnly__.findStepId($hostForm, $forms))
        .to.equal(5);
        expect(InstallerCommon.__testOnly__.findStepId($licenseUpdateForm, $forms))
        .to.equal(-1);

        $forms.addClass("hidden");
        expect($choiceForm.not(":visible"));
        expect($licenseForm.not(":visible"));
        expect($preConfigForm.not(":visible"));
        expect($sharedStorageForm.not(":visible"));
        expect($ldapForm.not(":visible"));
        expect($hostForm.not(":visible"));

        InstallerCommon.__testOnly__.showStep(0, $forms);
        expect($choiceForm.is(":visible"));
        InstallerCommon.__testOnly__.showStep(1, $forms);
        expect($licenseForm.is(":visible"));
        InstallerCommon.__testOnly__.showStep(2, $forms);
        expect($preConfigForm.is(":visible"));
        InstallerCommon.__testOnly__.showStep(3, $forms);
        expect($sharedStorageForm.is(":visible"));
        InstallerCommon.__testOnly__.showStep(4, $forms);
        expect($ldapForm.is(":visible"));
        InstallerCommon.__testOnly__.showStep(5, $forms);
        expect($hostForm.is(":visible"));

        $forms.addClass("hidden");
    });

    it ("prepare install should work", function() {
        var $form = $("#hostForm");
        $forms.addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        var $back = $form.find("input.back");
        var $cancel = $form.find("input.cancel");
        expect($back.is(":visible"));
        expect($cancel.not(":visible"));
        InstallerCommon.prepareStart($form, "doingString", "doingLower");
        expect($form.find(".row .curStatus").eq(0).text()).eq("doingLower");
        expect($form.find(".row .curStatus").eq(1).text()).eq("doingLower");
        expect($back.not(":visible"));
        expect($cancel.is(":visible"));
    });

    it("Validate getStatus should work - cancel case", function(done) {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        this.timeout(200000);

        var originalSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        InstallerCommon.__testOnly__.setCancel(true);
        InstallerCommon.__testOnly__.setDone(false);
        InstallerCommon.getStatus($form, "fakeApi")
        .always(function(data1, data2) {
            expect(data1).to.equal("Cancelled");
            expect(data2).to.equal("Operation cancelled");
            InstallerCommon.__testOnly__.setCancel(false);
            InstallerCommon.__testOnly__.setDone(false);
            InstallerCommon.__testOnly__.setSendViaHttps(originalSendViaHttps);
            done();
        });
    });

    it("Validate getStatus should work - error case", function(done) {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        this.timeout(200000);

        var originalSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        InstallerCommon.__testOnly__.setCancel(false);
        InstallerCommon.__testOnly__.setDone(false);
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.resolve(
                "hint",
                {
                    "status": 200,
                    "curStepStatus": installStatus.Error,
                    "retVal": ["A(Error)", "B(Done)"],
                    "errorLog": "1234567"
                }
            );
        });
        InstallerCommon.getStatus($form, "fakeApi")
        .always(function(data1, data2) {
            expect(data1).to.equal("Status Error");
            expect(data2.status).to.equal(200);
            expect(data2.curStepStatus).to.equal(installStatus.Error);
            expect(data2.retVal.length).to.equal(2);
            expect(data2.retVal[0]).to.equal("A(Error)");
            expect(data2.retVal[1]).to.equal("B(Done)");
            expect(data2.errorLog).to.equal("1234567");
            InstallerCommon.__testOnly__.setCancel(false);
            InstallerCommon.__testOnly__.setDone(false);
            InstallerCommon.__testOnly__.setSendViaHttps(originalSendViaHttps);
            done();
        });
    });

    it("Validate getStatus should work - done case", function(done) {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        this.timeout(200000);

        var originalSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        InstallerCommon.__testOnly__.setCancel(false);
        InstallerCommon.__testOnly__.setDone(false);
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.resolve(
                "hint",
                {
                    "status": 200,
                    "curStepStatus": installStatus.Done,
                    "retVal": ["A(Done)", "B(Done)"]
                }
            );
        });
        InstallerCommon.getStatus($form, "fakeApi")
        .always(function(data1, data2) {
            expect(data1).to.equal(undefined);
            expect(data2).to.equal(undefined);
            InstallerCommon.__testOnly__.setCancel(false);
            InstallerCommon.__testOnly__.setDone(false);
            InstallerCommon.__testOnly__.setSendViaHttps(originalSendViaHttps);
            done();
        });
    });

    it("Validate getStatus should work - error connection case", function(done) {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        this.timeout(200000);

        var originalSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        InstallerCommon.__testOnly__.setCancel(false);
        InstallerCommon.__testOnly__.setDone(false);
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.reject();
        });
        InstallerCommon.getStatus($form, "fakeApi")
        .always(function(data1, data2) {
            expect(data1).to.equal("Connection Error");
            expect(data2).to.equal("Connection to server cannot be " +
                                   "established. Please contact Xcalar " +
                                   "Support.");
            InstallerCommon.__testOnly__.setCancel(false);
            InstallerCommon.__testOnly__.setDone(false);
            InstallerCommon.__testOnly__.setSendViaHttps(originalSendViaHttps);
            done();
        });
    });

    it("Validate getStatus should work", function(done) {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);
        this.timeout(200000);

        var originalSendViaHttps = InstallerCommon.__testOnly__.sendViaHttps;

        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.resolve(
                "hint",
                {
                    "status": 200,
                    "curStepStatus": installStatus.Running,
                    "retVal": ["A", "B"]
                }
            );
        });
        InstallerCommon.__testOnly__.setCancel(false);
        InstallerCommon.__testOnly__.setDone(false);
        InstallerCommon.getStatus($form, "fakeApi");
        setTimeout(function() {
            expect($form.find(".row .curStatus").eq(0).html()).to.equal(
                '<div class="animatedEllipsisWrapper">' +
                '<div class="text">' +
                    'A' +
                '</div>' +
                '<div class="animatedEllipsis">' +
                  '<div>.</div>' +
                  '<div>.</div>' +
                  '<div>.</div>' +
                '</div>' +
            '</div>');
            expect($form.find(".row .curStatus").eq(1).html()).to.equal(
                    '<div class="animatedEllipsisWrapper">' +
                    '<div class="text">' +
                        'B' +
                    '</div>' +
                    '<div class="animatedEllipsis">' +
                      '<div>.</div>' +
                      '<div>.</div>' +
                      '<div>.</div>' +
                    '</div>' +
                '</div>');
            InstallerCommon.__testOnly__.setCancel(true);
            InstallerCommon.__testOnly__.setCancel(false);
            InstallerCommon.__testOnly__.setDone(false);
            InstallerCommon.__testOnly__.setSendViaHttps(originalSendViaHttps);
            done();
        }, 4000);
    });

    it("Validate radioButton should work", function() {
        var $radioButtonGroup;
        var $radioButton;
        var $form;

        $radioButtonGroup = $("#installChoice");
        $form = $radioButtonGroup.closest("form");
        $radioButton = $radioButtonGroup.find('.radioButton[data-option="install"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($("#formArea").hasClass("install"));
        expect(!$("#formArea").hasClass("upgrade"));
        expect(!$("#formArea").hasClass("uninstall"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="upgrade"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect(!$("#formArea").hasClass("install"));
        expect($("#formArea").hasClass("upgrade"));
        expect(!$("#formArea").hasClass("uninstall"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="uninstall"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect(!$("#formArea").hasClass("install"));
        expect(!$("#formArea").hasClass("upgrade"));
        expect($("#formArea").hasClass("uninstall"));


        $radioButtonGroup = $("#preConfigChoice");
        $form = $radioButtonGroup.closest("form");
        $radioButton = $radioButtonGroup.find('.radioButton[data-option="yes"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($(".container").hasClass("preConfig"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="no"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect(!$(".container").hasClass("preConfig"));

        $radioButtonGroup = $("#nfsChoice");
        $form = $radioButtonGroup.closest("form");
        $radioButton = $radioButtonGroup.find('.radioButton[data-option="xcalarNfs"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".customerNfsOptions").not(":visible"));
        expect($form.find(".readyNfsOptions").not(":visible"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="customerNfs"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".customerNfsOptions").is(":visible"));
        expect($form.find(".readyNfsOptions").not(":visible"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="readyNfs"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".customerNfsOptions").not(":visible"));
        expect($form.find(".readyNfsOptions").is(":visible"));

        $radioButtonGroup = $("#passwordChoice");
        $form = $radioButtonGroup.closest("form");
        $radioButton = $radioButtonGroup.find('.radioButton[data-option="password"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".hostPassword").not(":visible"));
        expect($form.find(".hostSshKey").not(":visible"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="sshKey"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".hostPassword").is(":visible"));
        expect($form.find(".hostSshKey").not(":visible"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="sshUserSettings"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".hostPassword").not(":visible"));
        expect($form.find(".hostSshKey").is(":visible"));

        $radioButtonGroup = $("#ldapDeployChoice");
        $form = $radioButtonGroup.closest("form");
        $radioButton = $radioButtonGroup.find('.radioButton[data-option="customerLdap"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".customerLdapOptions").is(":visible"));
        expect($form.find(".xcalarLdapOptions").not(":visible"));

        $radioButton = $radioButtonGroup.find('.radioButton[data-option="xcalarLdap"]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".customerLdapOptions").not(":visible"));
        expect($form.find(".xcalarLdapOptions").is(":visible"));

        $radioButtonGroup = $("#ADChoice");
        $form = $radioButtonGroup.closest("form");
        $radioButton = $radioButtonGroup.find('.radioButton[data-option=true]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect(!$(".container").hasClass("preConfig"));
        expect($form.find(".fieldWrap .inputWrap input").eq(4).attr("placeholder"))
        .equal("[ldap://adserver.company.com:3268]");
        expect($form.find(".fieldWrap .inputWrap input").eq(5).attr("placeholder"))
        .equal("[dc=company,dc=com]");
        expect($form.find(".fieldWrap .inputWrap input").eq(6).attr("placeholder"))
        .equal("[(&(objectclass=user)(userPrincipalName=%username%))]");
        expect($form.find(".fieldWrap .inputWrap input").eq(7).attr("placeholder"))
        .equal("[/etc/pki/tls/cert.pem]");
        expect($form.find(".fieldWrap .inputWrap input").eq(8).attr("placeholder"))
        .equal("[Active Directory User Group Name]");
        expect($form.find(".fieldWrap .inputWrap input").eq(9).attr("placeholder"))
        .equal("[Active Directory Admin Group Name]");
        expect($form.find(".fieldWrap .inputWrap input").eq(10).attr("placeholder"))
        .equal("[Active Directory Domain Name]");

        $radioButton = $radioButtonGroup.find('.radioButton[data-option=false]');
        $radioButton.click();
        InstallerCommon.__testOnly__.radioAction($radioButtonGroup, $radioButton, $form);
        expect($form.find(".fieldWrap .inputWrap input").eq(4).attr("placeholder"))
        .equal("[ldap://ldapserver.company.com:389]");
        expect($form.find(".fieldWrap .inputWrap input").eq(5).attr("placeholder"))
        .equal("[mail=%username%,ou=People,dc=company,dc=com]");
        expect($form.find(".fieldWrap .inputWrap input").eq(6).attr("placeholder"))
        .equal("[(memberof=cn=users,ou=Groups,dc=company,dc=com)]");
        expect($form.find(".fieldWrap .inputWrap input").eq(7).attr("placeholder"))
        .equal("[/etc/pki/tls/cert.pem]");
    });

    it("Validate discover should work", function(done) {
        var originValidateHosts = InstallerCommon.validateHosts;
        var originValidateInstallationDirectory = InstallerCommon.validateInstallationDirectory;
        var originValidateCredentials = InstallerCommon.validateCredentials;
        var originSendViaHttps = InstallerCommon.sendViaHttps;
        var $form = $("#upgradeDiscoveryForm");
        var $sharedStorageUpdateForm = $("#sharedStorageUpdateForm");
        var $upgradeHostsForm = $("#upgradeHostsForm");
        var $forms = $("form.upgrade");
        $forms.addClass("hidden");
        $form.removeClass("hidden");

        InstallerCommon.validateHosts = function() {
            return {"a": "a"};
        };
        InstallerCommon.validateInstallationDirectory = function() {
            return {"b": "b"};
        };
        InstallerCommon.validateCredentials = function() {
            return {"c": "c"};
        };
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.resolve(
                "hint",
                {
                    "discoverResult":
                    {
                        "hosts": ["hostA", "hostB"],
                        "xcalarMount": {
                            "path": "fake-path",
                            "server": "fake-server"
                        },
                        "privHosts": ["fake-privHost-1", "fake-privHost-2"],
                        "ldapConfig": {}
                    }
                }
            );
        });

        InstallerCommon.validateDiscover($form, $forms)
        .always(function() {
            expect(InstallerCommon.__testOnly__.finalStruct.a).to.equal("a");
            expect(InstallerCommon.__testOnly__.finalStruct.b).to.equal("b");
            expect(InstallerCommon.__testOnly__.finalStruct.c).to.equal("c");
            expect(InstallerCommon.__testOnly__.finalStruct.privHostNames[0]).to.equal("fake-privHost-1");
            expect(InstallerCommon.__testOnly__.finalStruct.privHostNames[1]).to.equal("fake-privHost-2");
            expect($upgradeHostsForm.find(".row:not(.header) input").eq(0).val().trim())
            .to.equal("hostA");
            expect($upgradeHostsForm.find(".row:not(.header) input").eq(1).val().trim())
            .to.equal("hostB");
            expect($sharedStorageUpdateForm.find(".discoverServer .text").text())
            .to.equal("fake-server");
            expect($sharedStorageUpdateForm.find(".discoverMountPath .text").text())
            .to.equal("fake-path");
            delete InstallerCommon.__testOnly__.finalStruct.a;
            delete InstallerCommon.__testOnly__.finalStruct.b;
            delete InstallerCommon.__testOnly__.finalStruct.c;
            InstallerCommon.__testOnly__.finalStruct.privHosts = [];
            InstallerCommon.validateHosts = originValidateHosts;
            InstallerCommon.validateInstallationDirectory = originValidateInstallationDirectory;
            InstallerCommon.validateCredentials = originValidateCredentials;
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done();
        });
    });

    it("Validate discover should work - error case object", function (done) {
        var originValidateHosts = InstallerCommon.validateHosts;
        var originValidateInstallationDirectory = InstallerCommon.validateInstallationDirectory;
        var originValidateCredentials = InstallerCommon.validateCredentials;
        var originSendViaHttps = InstallerCommon.sendViaHttps;
        var $form = $("#upgradeDiscoveryForm");
        var $sharedStorageUpdateForm = $("#sharedStorageUpdateForm");
        var $upgradeHostsForm = $("#upgradeHostsForm");
        var $forms = $("form.upgrade");
        $forms.addClass("hidden");
        $form.removeClass("hidden");

        InstallerCommon.validateHosts = function () {
            return { "a": "a" };
        };
        InstallerCommon.validateInstallationDirectory = function () {
            return { "b": "b" };
        };
        InstallerCommon.validateCredentials = function () {
            return { "error": ["error-state-1", {"error-state-2": true}] };
        };
        InstallerCommon.__testOnly__.setSendViaHttps(function () {
            return PromiseHelper.resolve(
                "hint",
                {
                    "discoverResult":
                    {
                        "hosts": ["hostA", "hostB"],
                        "xcalarMount": {
                            "path": "fake-path",
                            "server": "fake-server"
                        },
                        "privHosts": ["fake-privHost-1", "fake-privHost-2"],
                        "ldapConfig": {}
                    }
                }
            );
        });

        InstallerCommon.validateDiscover($form, $forms)
            .always(function (data1, data2) {
                expect(data1).to.equal("Failed to discover");
                expect(data2).to.equal('error-state-1: {"error-state-2":true}');
                expect(InstallerCommon.__testOnly__.finalStruct.a).to.equal(undefined);
                expect(InstallerCommon.__testOnly__.finalStruct.b).to.equal(undefined);
                expect(InstallerCommon.__testOnly__.finalStruct.c).to.equal(undefined);
                InstallerCommon.validateHosts = originValidateHosts;
                InstallerCommon.validateInstallationDirectory = originValidateInstallationDirectory;
                InstallerCommon.validateCredentials = originValidateCredentials;
                InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
                done();
            });
    });

    it("Validate discover should work - error case string", function(done) {
        var originValidateHosts = InstallerCommon.validateHosts;
        var originValidateInstallationDirectory = InstallerCommon.validateInstallationDirectory;
        var originValidateCredentials = InstallerCommon.validateCredentials;
        var originSendViaHttps = InstallerCommon.sendViaHttps;
        var $form = $("#upgradeDiscoveryForm");
        var $sharedStorageUpdateForm = $("#sharedStorageUpdateForm");
        var $upgradeHostsForm = $("#upgradeHostsForm");
        var $forms = $("form.upgrade");
        $forms.addClass("hidden");
        $form.removeClass("hidden");

        InstallerCommon.validateHosts = function() {
            return {"a": "a"};
        };
        InstallerCommon.validateInstallationDirectory = function() {
            return {"b": "b"};
        };
        InstallerCommon.validateCredentials = function() {
            return {"error": ["error-state-1", "error-state-2"]};
        };
        InstallerCommon.__testOnly__.setSendViaHttps(function() {
            return PromiseHelper.resolve(
                "hint",
                {
                    "discoverResult":
                    {
                        "hosts": ["hostA", "hostB"],
                        "xcalarMount": {
                            "path": "fake-path",
                            "server": "fake-server"
                        },
                        "privHosts": ["fake-privHost-1", "fake-privHost-2"],
                        "ldapConfig": {}
                    }
                }
            );
        });

        InstallerCommon.validateDiscover($form, $forms)
        .always(function(data1, data2) {
            expect(data1).to.equal("Failed to discover");
            expect(data2).to.equal("error-state-1: error-state-2");
            expect(InstallerCommon.__testOnly__.finalStruct.a).to.equal(undefined);
            expect(InstallerCommon.__testOnly__.finalStruct.b).to.equal(undefined);
            expect(InstallerCommon.__testOnly__.finalStruct.c).to.equal(undefined);
            InstallerCommon.validateHosts = originValidateHosts;
            InstallerCommon.validateInstallationDirectory = originValidateInstallationDirectory;
            InstallerCommon.validateCredentials = originValidateCredentials;
            InstallerCommon.__testOnly__.setSendViaHttps(originSendViaHttps);
            done();
        });
    });

    it("Validate show Error Message should work", function() {
        expect($("#errorMessageModal").not(":visible"));
        var ret =  {
            "status": 500,
            "curStepStatus": installStatus.Error,
            "retVal": ["A(Error)", "B(Done)"],
            "errorLog": "1234567"
        };
        InstallerCommon.showErrorModal(ret);
        expect($("#errorMessageModal").find(".errorCode .text").text()).equal("500");
        expect($("#errorMessageModal").find(".errorMessage .text").text()).equal("1234567");
        ErrorMessage.close();
    });

    it("Validate handle failure should work", function() {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        InstallerCommon.__testOnly__.showFailure($form, ["error-arg1", "error-arg2"]);
        expect($form.find(".error span").eq(0).text()).equal("error-arg1");
        expect($form.find(".error span").eq(1).text()).equal("error-arg2");
        $form.find(".error span").eq(0).text('');
        $form.find(".error span").eq(1).text('');
        $form.find(".error").hide();
    });

    it("Validate handle complete should work", function() {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        InstallerCommon.handleComplete($form);
        expect($form.find(".row .curStatus").eq(0).text()).equal("Complete!");
        expect($form.find(".row .curStatus").eq(1).text()).equal("Complete!");
        $form.find(".row .curStatus").eq(0).text("");
        $form.find(".row .curStatus").eq(1).text("");
    });

    it("Validate handle failure should work", function() {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        $("#hostForm .hint input").val(2);
        var e = $.Event("keyup");
        e.which = 13; //choose the one you want
        e.keyCode = 13;
        $("#numServers").trigger(e);

        var prevString = "prevString";
        var doingLower = "doingLower";
        expect($form.find(".row .curStatus").eq(0).text()).equal("");
        expect($form.find(".row .curStatus").eq(1).text()).equal("");
        $form.find(".row .curStatus").eq(0).text("(step1)");
        $form.find(".row .curStatus").eq(1).text("(step1)");
        InstallerCommon.handleFail($form, prevString, doingLower);
        expect($form.find(".row .curStatus").eq(0).text()).equal("(Cancelled)");
        expect($form.find(".row .curStatus").eq(1).text()).equal("(Cancelled)");
        $form.find(".btn.next").val("INSTALL");
    });

    it("finalize should work", function() {
        var $form = $("#hostForm");
        $("form").addClass("hidden");
        $form.removeClass("hidden");
        expect($form.find(".btn.next").val()).equal("INSTALL");
        expect($form.find(".section").is(":visible"));
        expect($form.find(".title").is(":visible"));
        expect($form.find(".btn.back").not(":visible"));
        expect($form.find(".btn.cancel").not(":visible"));
        expect($form.find(".successSection").not(":visible"));
        expect($form.find(".buttonSection").is(":visible"));
        InstallerCommon.finalize($form, false);
        expect($form.find(".btn.redirect").val()).equal("LAUNCH XD");
        expect($form.find(".section").not(":visible"));
        expect($form.find(".title").not(":visible"));
        expect($form.find(".btn.back").is(":visible"));
        expect($form.find(".btn.cancel").is(":visible"));
        expect($form.find(".successSection").is(":visible"));
        expect($form.find(".buttonSection").is(":visible"));
    });

    it("Click next back clear delete should work", function() {
        var $forms = $("form.install");
        $forms.addClass("hidden");

        validateStep = function() {
            return PromiseHelper.resolve();
        };

        var formClass = "install";
        InstallerCommon.setupForms($forms, validateStep, formClass);

        var $choiceForm = $("#choiceForm");
        var $licenseForm = $("#licenseForm");
        var $preConfigForm = $("#preConfigForm");
        var $sharedStorageForm = $("#sharedStorageForm");
        var $ldapForm = $("#ldapForm");
        var $hostForm = $("#hostForm");

        $licenseForm.removeClass("hidden");
        expect($choiceForm.not(":visible"));
        expect($licenseForm.is(":visible"));
        expect($preConfigForm.not(":visible"));
        expect($sharedStorageForm.not(":visible"));
        expect($ldapForm.not(":visible"));
        expect($hostForm.not(":visible"));

        $licenseForm.find(".licenseKey").val("fake-license-key");
        expect($licenseForm.find(".licenseKey").val()).eq("fake-license-key");
        $licenseForm.find("input.clear").click();
        expect($licenseForm.find(".licenseKey").val()).eq("");

        $licenseForm.find("input.next").click();

        expect($choiceForm.not(":visible"));
        expect($licenseForm.not(":visible"));
        expect($preConfigForm.is(":visible"));
        expect($sharedStorageForm.not(":visible"));
        expect($ldapForm.not(":visible"));
        expect($hostForm.not(":visible"));

        $preConfigForm.find("input.next").click();

        expect($choiceForm.not(":visible"));
        expect($licenseForm.not(":visible"));
        expect($preConfigForm.not(":visible"));
        expect($sharedStorageForm.is(":visible"));
        expect($ldapForm.not(":visible"));
        expect($hostForm.not(":visible"));

        $sharedStorageForm.find("input.next").click();

        expect($choiceForm.not(":visible"));
        expect($licenseForm.not(":visible"));
        expect($preConfigForm.not(":visible"));
        expect($sharedStorageForm.not(":visible"));
        expect($ldapForm.is(":visible"));
        expect($hostForm.not(":visible"));

        $ldapForm.find("input.next").click();

        expect($choiceForm.not(":visible"));
        expect($licenseForm.not(":visible"));
        expect($preConfigForm.not(":visible"));
        expect($sharedStorageForm.not(":visible"));
        expect($ldapForm.not(":visible"));
        expect($hostForm.is(":visible"));

        $hostForm.find("input.cancel").click();
        expect($hostForm.find("input.cancel").val()).equal("CANCELLING...");

        $hostForm.find("input.back").click();

        expect($choiceForm.not(":visible"));
        expect($licenseForm.not(":visible"));
        expect($preConfigForm.not(":visible"));
        expect($sharedStorageForm.not(":visible"));
        expect($ldapForm.is(":visible"));
        expect($hostForm.not(":visible"));

        $ldapForm.find("input.back").click();

        expect($choiceForm.not(":visible"));
        expect($licenseForm.not(":visible"));
        expect($preConfigForm.not(":visible"));
        expect($sharedStorageForm.is(":visible"));
        expect($ldapForm.not(":visible"));
        expect($hostForm.not(":visible"));

        Installer.setup();
    });

    it("prepare uninstall should work", function() {

        InstallerCommon.__testOnly__.setDiscoverResult (
            {
                "xcalarMount": {
                    "option": "customerNfs",
                    "server": "customerNfs-server",
                    "path": "customerNfs-path"
                }
            }
        );

        InstallerCommon.prepareUninstall();
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.option)
            .to.eq('customerNfs');
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.nfsServer)
            .to.eq('customerNfs-server');
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.nfsMountPoint)
            .to.eq('customerNfs-path');

        InstallerCommon.__testOnly__.setDiscoverResult (
            {
                "xcalarMount": {
                    "option": "readyNfs",
                    "path": "readyNfs-path"
                }
            }
        );

        InstallerCommon.prepareUninstall();
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.option)
            .to.eq('readyNfs');
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.nfsServer)
            .to.eq(undefined);
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.nfsReuse)
            .to.eq('readyNfs-path');

        InstallerCommon.__testOnly__.setDiscoverResult (
            {
                "xcalarMount": {
                    "option": "xcalarNfs"
                }
            }
        );

        InstallerCommon.prepareUninstall();
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.option)
            .to.eq('xcalarNfs');
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.nfsServer)
            .to.eq(undefined);
        expect(InstallerCommon.__testOnly__.finalStruct.nfsOption.nfsMountPoint)
            .to.eq(undefined);
    });

    after(function() {
        var $forms = $("form.install");
        for (var i = 0; i < $forms.length; i++) {
            $forms[i].reset();
        }
    });
});
