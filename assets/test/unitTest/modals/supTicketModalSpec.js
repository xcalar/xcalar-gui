describe("SupTicketModal Test", function() {
    var $modal;
    var $ticketIdSection;
    var $commentSection;

    before(function() {
        $modal = $("#supTicketModal");
        $ticketIdSection = $modal.find(".ticketIDSection");
        $commentSection = $modal.find(".commentSection");
        UnitTest.onMinMode();
    });

    describe("SupTicketModal UI Behavior Test", function() {
        it("should show the modal", function() {
            SupTicketModal.Instance.show();
            assert.isTrue($modal.is(":visible"));
        });

        it("should refresh", function() {
            var cache = SupTicketModal.Instance.restore;
            var called = false;
            SupTicketModal.Instance.restore = function() {
                called = true;
            }
            $modal.find(".refresh").click();
            expect(called).to.be.true;
            SupTicketModal.Instance.restore = cache;
        });

        it("should toggle dropdown list", function(){
            var $dropdown = $modal.find(".issueList");
            var $input = $dropdown.find(".text");
            var cacheFn = SupTicketModal.Instance.restore;
            SupTicketModal.Instance.restore = function() {
                return PromiseHelper.resolve();
            };
            $($dropdown.find("li").get().reverse()).each(function() {
                var $li = $(this);
                $li.trigger(fakeEvent.mouseup);
                expect($input.val()).to.equal($li.text());
            });

            // already selected so shouldn't do anything
            $ticketIdSection.addClass("closed");
            $dropdown.find("li").eq(0).trigger(fakeEvent.mouseup);
            expect($ticketIdSection.hasClass("closed")).to.be.true;
            $ticketIdSection.removeClass("closed");
            SupTicketModal.Instance.restore = cacheFn;
        });

        it("should select severity", function() {
            var $dropdown = $modal.find(".severityList");
            var $input = $dropdown.find(".text");

            $dropdown.find("li").eq(1).trigger(fakeEvent.mouseup);
            expect($input.val()).to.equal("3 - General information request");
            expect($input.data("val")).to.equal(3);

            $dropdown.find("li").eq(0).trigger(fakeEvent.mouseup);
            expect($input.val()).to.equal("4 - Feature request");
            expect($input.data("val")).to.equal(4);
        });

        it("should toggle check box", function() {
            var $section = $modal.find(".genBundleRow .checkboxSection");
            var $checkbox = $section.find(".checkbox");
            expect($checkbox.hasClass("checked")).to.be.false;
            // check
            $section.click();
            expect($checkbox.hasClass("checked")).to.be.true;
            // uncheck
            $section.click();
            expect($checkbox.hasClass("checked")).to.be.false;
        });

        it("should close the modal", function() {
            $modal.find(".cancel").click();
            assert.isFalse($modal.is(":visible"));
        });

        it("alert modal should not be visible if modal background locked" ,function () {
            expect($modal.hasClass("locked")).to.be.false;
            $("#modalBackground").addClass("locked");

            SupTicketModal.Instance.show();

            expect($modal.hasClass("locked")).to.be.true;
            expect($("#alertModal").hasClass("xc-hidden")).to.be.true;

            $modal.find(".cancel").click();
            assert.isFalse($modal.is(":visible"));
            $("#modalBackground").removeClass("locked");
            $modal.removeClass("locked");
            expect($("#alertModal").hasClass("xc-hidden")).to.be.false;
        });

        it("subject input should show correct limit when typing", function() {
            SupTicketModal.Instance.show();
            expect($modal.find(".remainingChar").text()).to.equal("100");
            $modal.find(".subjectInput").val("hey").trigger("input");
            expect($modal.find(".remainingChar").text()).to.equal("97");

            $modal.find(".subjectInput").val("a".repeat(1000)).trigger("input");
            expect($modal.find(".remainingChar").text()).to.equal("0");

            $modal.find(".subjectInput").val("").trigger("input");
            expect($modal.find(".remainingChar").text()).to.equal("100");
            SupTicketModal.Instance._close();
        });

        it("subject input should not allow extra characters", function() {
            var text = "a".repeat(100);
            var called = false;
            var e = $.Event("keypress", {which: keyCode.Y, preventDefault: function() {
                called = true;
            }});
            var $input = $modal.find(".subjectInput");
            $input.val(text);
            $input.trigger(e);
            expect(called).to.be.true;
        });
    });

    describe("Existing tickets test", function() {
        var longStr;
        before(function() {
            longStr = "blah blah ".repeat(40);
            SupTicketModal.Instance.show();
        });

        it("SupTicketModal.Instance.restore should work", function(done) {
            var ret1 = {
                logs: JSON.stringify({tickets: [
                    {"created_at": 12345, "updated_at": 12456, "id": 1, "comment": "abc", "subject": "testSubject"},
                    {"created_at": 12348, "id": 2, "comment": longStr, "subject": "testSubject"}
                ]})
            };

            var ret2 = {
                logs: JSON.stringify({comments: [
                    {"created_at": 12345, "id": 1, "comment": "abc"},
                    {"created_at": 12346, "id": 1, "comment": "ghi"},
                    {"created_at": 12347, "id": 1, "comment": "jkl"}
                ]})
            };

             var ret3 = {
                logs: JSON.stringify({comments: [
                    {"created_at": 12348, "id": 2, "comment": longStr}
                ]})
            };

            var cache1 = adminTools.getTickets;
            var count = 0;
            adminTools.getTickets = function() {
                count++;
                if (count === 1) {
                    return PromiseHelper.resolve(ret1);
                } else if (count === 2) {
                    return PromiseHelper.resolve(ret2);
                } else if (count === 3) {
                    return PromiseHelper.resolve(ret3);
                }
            };

            SupTicketModal.Instance.restore()
            .then(function() {
                expect($ticketIdSection.find(".tableBody .row").length).to.equal(2);
                expect($ticketIdSection.find(".tableBody .innerRow").length).to.equal(4);
                expect($ticketIdSection.find(".tableBody .row").eq(0).find(".innerRow").length).to.equal(1);
                expect($ticketIdSection.find(".tableBody .row").eq(1).find(".innerRow").length).to.equal(3);
                expect($ticketIdSection.find(".tableBody .details .text").eq(0).text()).to.equal('Subject: testSubjectDescription: ' + longStr);
                expect($ticketIdSection.find(".tableBody .details .text").eq(1).text()).to.equal('Subject: testSubjectDescription: abc');


                adminTools.getTickets = cache1;
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("parseTicketList() should work", function() {
            var fn = SupTicketModal.Instance._parseTicketList;
            list = fn([{"created_at": 1, "updated_at": 2}, {"created_at": 1, "updated_at": 1}]);
            expect(list[0].hasUpdate).to.equal(true);
            expect(list[0].author).to.equal("user");
        });

        it("getTickets() errors should work", function(done) {
            var cache1 = adminTools.getTickets;
            adminTools.getTickets = function() {
                getCalled = true;
                return PromiseHelper.reject();
            };

            SupTicketModal.Instance._getTickets()
            .then(function(ret) {
                expect(getCalled).to.be.true;
                expect(ret).to.deep.equal([]);
                adminTools.getTickets = cache1;
                $("#debugAlert .xi-close").click();
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("ticket id radio buttons should work", function() {
            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").filter(function() {
                return $(this).data("val") === "existing";
            }).trigger(fakeEvent.mouseup);

            expect($ticketIdSection.hasClass("inactive")).to.be.false;
            expect($commentSection.hasClass("inactive")).to.be.true;

            $ticketIdSection.find(".radioButton").eq(0).click();

            expect($ticketIdSection.hasClass("inactive")).to.be.true;
            expect($commentSection.hasClass("inactive")).to.be.false;
            expect($ticketIdSection.find(".row.xc-hidden").length).to.equal(1);
        });

        it("mousedown on commentsection should work", function() {
            $ticketIdSection.find(".innerRow").eq(0).click();
            expect($ticketIdSection.hasClass("inactive")).to.be.false;
            expect($commentSection.hasClass("inactive")).to.be.true;

            $ticketIdSection.find(".tableBody .row").addClass("xc-hidden");

            $commentSection.mousedown();
            expect($ticketIdSection.find(".row").eq(0).hasClass("xc-hidden")).to.be.false;
        });

        it("clicking on comments should expand row", function() {
            $ticketIdSection.find(".tableBody .row").eq(0).removeClass("expanded");
            $ticketIdSection.find(".tableBody .subjectWrap").eq(0).click();

            expect($ticketIdSection.find(".tableBody .row").eq(0).hasClass("expanded")).to.be.true;
        });

        it("expand comment via icon should work", function() {
            $ticketIdSection.find(".tableBody .row").eq(0).removeClass("expanded");
            expect($ticketIdSection.find(".tableBody .row").eq(0).hasClass("expanded")).to.be.false;
            $ticketIdSection.find(".expand").eq(0).click();
            expect($ticketIdSection.find(".tableBody .row").eq(0).hasClass("expanded")).to.be.true;

            $ticketIdSection.find(".expand").eq(0).click();
            expect($ticketIdSection.find(".tableBody .row").eq(0).hasClass("expanded")).to.be.false;
        });
    });

    describe("functions tests", function() {
        it("includeUpdatedTickets should work", function() {
            var tickets = {
                0: [{id: 0}]
            };
            SupTicketModal.Instance._updatedTickets = tickets;
            SupTicketModal.Instance._includeUpdatedTickets();
            var tix = SupTicketModal.Instance._tickets;
            expect(tix.length).to.equal(3);
            tix.splice(0, 1);
        });

        it("reverseLogs should work", () => {
            const logs = {a: [1, 2], b: "test"};
            const res = SupTicketModal.Instance._reverseLogs(logs);
            expect(Object.keys(res).length).to.equal(2);
            expect(res.a).to.deep.equal([2, 1]);
            expect(res.b).to.equal("test");
            // error case
            expect(SupTicketModal.Instance._reverseLogs(null)).to.be.null;
        });
    });

    describe("SupTicketModal Submit Test", function() {
        var oldSupport;
        var oldGetLicense;
        var oldApiTop;
        var oldFileTicket;
        var oldDownload;
        var oldSuccess;
        var successMsg;

        before(function() {
            SupTicketModal.Instance.show();
            oldSupport = XcalarSupportGenerate;
            oldGetLicense = adminTools.getLicense;
            oldApiTop = XcalarApiTop;
            oldFileTicket = adminTools.fileTicket;
            oldDownload = xcHelper.downloadAsFile;
            oldSuccess = xcUIHelper.showSuccess;

            adminTools.getLicense = function() {
                return PromiseHelper.resolve("test license");
            };

            XcalarApiTop = function() {
                return PromiseHelper.resolve("test api top");
            };

            adminTools.fileTicket = function(input) {
                return PromiseHelper.resolve(JSON.parse(input));
            };

            xcUIHelper.showSuccess = function(input) {
                successMsg = input;
            };

            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").filter(function() {
                return $(this).data("val") === "new";
            }).trigger(fakeEvent.mouseup);
        });

        it("should trim large logs", function() {
            var cacheFn = Log.getAllLogs;
            Log.getAllLogs = function() {
                return {
                    version: "a",
                    logs: ["try".repeat(60 * KB), "test"],
                    errors: ["a".repeat(40 * KB), "b".repeat(50 * KB), "c".repeat(10 * KB), "d"],
                    overwrittenLogs: []
                };
            };

            var logs = SupTicketModal.Instance.trimRecentLogs();
            logs = JSON.parse(logs);
            expect(logs.logs.length).to.equal(1);
            expect(logs.logs[0]).to.equal("test");
            expect(logs.errors.length).to.equal(3);
            expect(logs.errors[0]).to.equal("d");
            expect(logs.errors[2]).to.equal("b".repeat(50 * KB));

            Log.getAllLogs = cacheFn;
        });

        it("should handle submit bundle error", function(done) {
            var test = false;
            var oldAjax = HTTPService.Instance.ajax;
            HTTPService.Instance.ajax = function(options) {
                options.error({
                    statusText: "Not Found"
                });
            };

            XcalarSupportGenerate = function() {
                test = true;
                return PromiseHelper.reject("test");
            };
            SupTicketModal.Instance._submitBundle()
            .then(function() {
                done("fail");
            })
            .fail(function(res) {
                expect(res).to.equal("Not Found");
                expect(test).to.be.true;
                expect($modal.hasClass("bundleError")).to.be.true;
                expect($modal.find(".errorText").text())
                .to.contains(ErrTStr.BundleFailed);
                done();
            })
            .always(function() {
                HTTPService.Instance.ajax = oldAjax;
            });
        });

        it("should submit bundle", function(done) {
            var test = false;
            var oldAjax = HTTPService.Instance.ajax;
            HTTPService.Instance.ajax = function(options) {
                options.success({});
            };

            XcalarSupportGenerate = function() {
                test = true;
                return PromiseHelper.resolve({});
            };

            SupTicketModal.Instance._submitBundle()
            .then(function() {
                expect(test).to.be.true;
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                HTTPService.Instance.ajax = oldAjax;
            });
        });

        it("should submit ticket", function(done) {
            var ticketObj = {
                "type": "",
                "ticketId": null,
                "comment": "",
                "xiLog": "",
                "userIdName": "",
                "userIdUnique": "",
                "sessionName": "",
                "version": {
                    "backendVersion": "",
                    "frontendVersion": "",
                    "thriftVersion": ""
                }
            };

            SupTicketModal.Instance.submitTicket(ticketObj)
            .then(function(res) {
                expect(res).to.be.an("object");
                expect(Object.keys(res).length).to.equal(9);
                expect(res).to.have.property("topInfo")
                .and.to.equal("test api top");
                expect(res).to.have.property("userIdName");
                expect(res).to.have.property("userIdUnique");
                expect(res).to.have.property("sessionName");
                expect(res).to.have.property("xiLog");
                expect(res).to.have.property("version")
                .and.to.be.an("object");
                expect(res).to.have.property("ticketId")
                .and.to.be.null;

                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should download ticket", function() {
            var res1 = null;
            var res2 = null;
            xcHelper.downloadAsFile = function(arg1, arg2) {
                res1 = arg1;
                res2 = arg2;
            };
            SupTicketModal.Instance._downloadTicket({"test": "a"});
            expect(res1).to.equal("xcalarTicket.txt");
            expect(res2).to.contains('"test":"a"');
        });

        it("should submit to download", function(done) {
            xcHelper.downloadAsFile = function() {};

            SupTicketModal.Instance._submitForm(true)
            .then(function() {
                expect(successMsg).to.equal(SuccessTStr.DownloadTicket);
                expect($modal.hasClass("downloadSuccess")).to.be.true;
                $modal.removeClass("downloadSuccess");
                done();
            })
            .fail(function() {
                done("fail");
            });
        });

        it("should handle submit form fail case", function(done) {
            var cache = adminTools.fileTicket;
            adminTools.fileTicket = function() {
                return PromiseHelper.reject("test");
            };

            SupTicketModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                assert.isTrue($("#statusBox").is(":visible"));
                StatusBox.forceHide();
                adminTools.fileTicket = cache;
                done();
            });
        });

        it("should show error if comment is too long", function(done) {
            var oldVal = $modal.find(".xc-textArea").val();
            $modal.find(".xc-textArea").val("a".repeat(10001));

            var cache = adminTools.fileTicket;
            adminTools.fileTicket = function() {
                return PromiseHelper.reject("test");
            };

            SupTicketModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(xcStringHelper.replaceMsg(MonitorTStr.CharLimitErr, {
                    "limit": xcStringHelper.numToStr(10000)
                }));
                $modal.find(".xc-textArea").val(oldVal);

                adminTools.fileTicket = cache;
                done();
            });
        });

        it("should shandle submit error", function(done) {
            SupTicketModal.Instance.show();
            $modal.removeClass("bundleError");
            XcalarSupportGenerate = function() {
                return PromiseHelper.resolve();
            };

            adminTools.fileTicket = function() {
                return PromiseHelper.resolve({logs: '{"ticketId":123}'});
            };

            var cache2 = SupTicketModal.Instance.fetchLicenseInfo;
            SupTicketModal.Instance.fetchLicenseInfo = function() {
                return PromiseHelper.resolve({key: "key", "expiration": ""});
            };

            var cache3 = SupTicketModal.Instance.submitTicket;
            SupTicketModal.Instance.submitTicket = function() {
                return  PromiseHelper.resolve({
                    logs: JSON.stringify({error: "User does not belong"})
                });
            };

            SupTicketModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(MonitorTStr.TicketErr2);
                done();
            })
            .always(function() {
                SupTicketModal.Instance.fetchLicenseInfo = cache2;
                SupTicketModal.Instance.submitTicket = cache3;
            });
        });
        it("should shandle submit error", function(done) {
            SupTicketModal.Instance.show();
            $modal.removeClass("bundleError");
            XcalarSupportGenerate = function() {
                return PromiseHelper.resolve();
            };

            adminTools.fileTicket = function() {
                return PromiseHelper.resolve({logs: '{"ticketId":123}'});
            };

            var cache2 = SupTicketModal.Instance.fetchLicenseInfo;
            SupTicketModal.Instance.fetchLicenseInfo = function() {
                return PromiseHelper.resolve({key: "key", "expiration": ""});
            };

            var cache3 = SupTicketModal.Instance.submitTicket;
            SupTicketModal.Instance.submitTicket = function() {
                return  PromiseHelper.resolve({
                    logs: JSON.stringify({error: "Ticket could not be found"})
                });
            };

            SupTicketModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(MonitorTStr.TicketErr2);
                done();
            })
            .always(function() {
                SupTicketModal.Instance.fetchLicenseInfo = cache2;
                SupTicketModal.Instance.submitTicket = cache3;
            });
        });


        it("should shandle submit error", function(done) {
            SupTicketModal.Instance.show();
            $modal.removeClass("bundleError");
            XcalarSupportGenerate = function() {
                return PromiseHelper.resolve();
            };

            adminTools.fileTicket = function() {
                return PromiseHelper.resolve({logs: '{"ticketId":123}'});
            };

            var cache2 = SupTicketModal.Instance.fetchLicenseInfo;
            SupTicketModal.Instance.fetchLicenseInfo = function() {
                return PromiseHelper.resolve({key: "key", "expiration": ""});
            };

            $modal.find(".customTicketRow input").val(1);
            $modal.find(".radioButton").removeClass('active');
            $modal.find('.issueList .text').val(CommonTxtTstr.Existing);

            SupTicketModal.Instance._submitForm()
            .then(function() {
                done("fail");
            })
            .fail(function() {
                UnitTest.hasStatusBoxWithError(MonitorTStr.TicketErr1);
                done();
            })
            .always(function() {
                SupTicketModal.Instance.fetchLicenseInfo = cache2;
            });
        });

        it("should submit bundle if selected", function() {
            var cache1 = XcalarSupportGenerate;
            var cache2 = adminTools.fileTicket;
            var cache3 = adminTools.getLicense;
            var cache4 = XcalarSetConfigParams;
            var cache5 = SupTicketModal.Instance.fetchLicenseInfo;
            var supGenCalled = false;
            XcalarSupportGenerate = function() {
                supGenCalled = true;
                return PromiseHelper.resolve({});
            };
            adminTools.fileTicket = function() {
                return PromiseHelper.resolve({logs: JSON.stringify({ticketId: 5})});
            };
            adminTools.getLicense = function() {
                return PromiseHelper.resolve();
            };
            SupTicketModal.Instance.fetchLicenseInfo = function() {
                return PromiseHelper.resolve({key: "key", "expiration": ""});
            };
            XcalarSetConfigParams = () => {
                return PromiseHelper.resolve();
            };
            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").eq(0).trigger(fakeEvent.mouseup);
            $modal.find(".genBundleBox .checkbox").addClass("checked");

            $modal.find('.confirm').click();

            expect(supGenCalled).to.be.true;
            XcalarSupportGenerate = cache1;
            adminTools.fileTicket = cache2;
            adminTools.getLicense = cache3;
            XcalarSetConfigParams = cache4;
            SupTicketModal.Instance.fetchLicenseInfo = cache5;
        });

        it("should provide error if no id selected", function() {
            var $dropdown = $modal.find(".issueList");
            $dropdown.find("li").eq(1).trigger(fakeEvent.mouseup);

            $ticketIdSection.find(".radioButton").removeClass("active");
            $modal.find(".download").click();
            UnitTest.hasStatusBoxWithError(MonitorTStr.SelectExistingTicket);
            $ticketIdSection.find(".radioButton").eq(0).addClass("active");
        });

        it("should submit form", function(done) {
            $modal.removeClass("bundleError");
            XcalarSupportGenerate = function() {
                return PromiseHelper.resolve();
            };

            adminTools.fileTicket = function() {
                return PromiseHelper.resolve({logs: '{"ticketId":123}'});
            };

            var cache2 = SupTicketModal.Instance.fetchLicenseInfo;
            SupTicketModal.Instance.fetchLicenseInfo = function() {
                return PromiseHelper.resolve({key: "key", "expiration": ""});
            };

            SupTicketModal.Instance._submitForm()
            .then(function() {
                return UnitTest.testFinish(function() {
                    return $("#alertHeader").find(".text").text().trim() ===
                            SuccessTStr.SubmitTicket;
                });
            })
            .then(function() {
                Alert.forceClose();
                // should close modal after submit
                assert.isFalse($modal.is(":visible"));
                done();
            })
            .fail(function() {
                done("fail");
            })
            .always(function() {
                SupTicketModal.Instance.fetchLicenseInfo = cache2;
            });
        });

        after(function() {
            XcalarSupportGenerate = oldSupport;
            adminTools.getLicense = oldGetLicense;
            XcalarApiTop = oldApiTop;
            adminTools.fileTicket = oldFileTicket;
            xcHelper.downloadAsFile = oldDownload;
            xcUIHelper.showSuccess = oldSuccess;
            // $modal.find(".cancel").click();
        });
    });

    after(function() {
        $modal.find(".close").click();
        UnitTest.offMinMode();
    });
});