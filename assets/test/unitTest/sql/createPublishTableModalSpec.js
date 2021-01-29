describe("Create Publish Table Modal Test", function() {
    var $modal;
    var columns;

    before(function() {
        UnitTest.onMinMode();
        $modal = $("#createPublishTableModal");
        columns = [
            {name: "col1", getBackColName: function() {return "col1";}, getType: function() {return "integer";}},
            {name: "col2", getBackColName: function() {return "col2";}, getType: function() {return "string";}},
            {name: "col3", getBackColName: function() {return "col3";}, getType: function() {return "integer";}},
            {name: "col4", getBackColName: function() {return "col4";}, getType: function() {return "integer";}}]
    });

    it("Should open the modal", function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        assert.isTrue($modal.is(":visible"));
        $("#createPublishTableModal .close").click();
    });

    it("Should display columns correctly",  function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        expect($("#publishTableModalColumns .col").length).to.equal(4);
        expect($("#createPublishTableModal .primaryKeyColumns li").length).to.equal(4);
        $("#createPublishTableModal .close").click();
    })

    it("Should have correct checkbox behavior",  function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        var $box = $("#publishTableModalColumns .col .checkbox").eq(0);
        assert.isFalse($box.hasClass("checked"));
        assert.isFalse($box.parent().hasClass("checked"));
        $box.click();
        assert.isTrue($box.hasClass("checked"));
        assert.isTrue($box.parent().hasClass("checked"));
        $box.click();
        assert.isFalse($box.hasClass("checked"));
        assert.isFalse($box.parent().hasClass("checked"));
        $("#createPublishTableModal .close").click();
    })

    it("Should have correct select all checkbox behavior",  function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        var $box = $("#publishTableModalColumns .selectAllWrap .checkbox");
        expect($("#publishTableModalColumns .col .checkbox.checked").length).to.equal(0);
        $box.click();
        expect($("#publishTableModalColumns .col .checkbox.checked").length).to.equal(4);
        $box.click();
        expect($("#publishTableModalColumns .col .checkbox.checked").length).to.equal(0);
        $("#createPublishTableModal .close").click()
    })

    it("Should have correct primary key behavior",  function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        $("#createPublishTableModal .primaryKeyInput").eq(0).click();
        expect($("#createPublishTableModal .primaryKeyInput").val()).to.equal("");
        $("#createPublishTableModal .primaryKeyList .list .primaryKeyColumns li").eq(1).trigger(fakeEvent.mouseup);
        expect($("#createPublishTableModal .primaryKeyInput").val()).to.equal("$col2");
        $("#createPublishTableModal .close").click();
    })

    it("Should have correct primary key + checkbox behavior",  function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        var $box = $("#publishTableModalColumns .col .checkbox").eq(0);
        $("#createPublishTableModal .primaryKeyInput").eq(0).click();
        assert.isFalse($box.hasClass("checked"));
        assert.isFalse($box.hasClass("active"));
        $("#createPublishTableModal .primaryKeyList .list .primaryKeyColumns li").eq(0).trigger(fakeEvent.mouseup);
        assert.isTrue($box.hasClass("checked"));
        assert.isTrue($box.hasClass("active"));
        $box.click();
        assert.isTrue($box.hasClass("checked"));
        assert.isTrue($box.hasClass("active"));
        $("#createPublishTableModal .primaryKeyInput").eq(0).click();
        $("#createPublishTableModal .primaryKeyList .list .primaryKeyColumns li").eq(1).trigger(fakeEvent.mouseup);
        assert.isFalse($box.hasClass("checked"));
        assert.isFalse($box.hasClass("active"));
        $("#createPublishTableModal .close").click();
    })

    it("Should display the correct errors",  function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        $("#createPublishTableModal .IMDNameInput").val("");
        $("#createPublishTableModal .confirm").click();
        expect($("#statusBox .message").text()).to.equal(ErrTStr.NoEmpty);
        $("#createPublishTableModal .IMDNameInput").val("_testTable");
        $("#createPublishTableModal .confirm").click();
        expect($("#statusBox .message").text()).to.equal("Table name should start with a letter and contain only letters, digits, or underscores(_)");
        $("#createPublishTableModal .IMDNameInput").val("testTable");
        $("#createPublishTableModal .confirm").click();
        expect($("#statusBox .message").text()).to.equal("No Columns Selected");
        $("#createPublishTableModal .close").click();
    })

    it("Should clean the modal", function() {
        CreatePublishTableModal.Instance.show("testTable", columns);
        $("#createPublishTableModal .IMDNameInput").val("testTable");
        $("#createPublishTableModal .primaryKeyInput").eq(0).click();
        $("#createPublishTableModal .primaryKeyList .list .primaryKeyColumns li").eq(0).trigger(fakeEvent.mouseup);
        $("#createPublishTableModal .close").click()
        assert.isFalse($modal.is(":visible"));
        CreatePublishTableModal.Instance.show("testTable", columns);
        expect($("#createPublishTableModal .IMDNameInput").val()).to.equal("");
        assert.isFalse($("#publishTableModalColumns .col .checkbox").eq(0).hasClass("checked"));
        $("#createPublishTableModal .close").click();
    });

    after(function() {
        UnitTest.offMinMode();
    });
});