describe("ColSchemaSection Test", function() {
    let section;
    let schemaSection;
    let mySchema;
    let $schemaSelectionModal;

    before(() => {
        let fakeSchemaSelectionModalHTML =
            '<div id="schemaSelectionModal" class="modalContainer opPanel">' +
                '<header class="modalHeader ui-draggable-handle">' +
                '<span class="text">Schema Wizard</span>' +
                '<div class="close" data-container="body" data-toggle="tooltip" data-original-title="Close">' +
                    '<i class="icon xi-close"></i>' +
                '</div>' +
                '</header>' +
                '<section class="modalMain">' +
                '<div class="label">Column Schema:</div>' +
                '<div class="xc-colSchema colSchemaSection">' +
                    '<div class="buttonSection">' +
                    '<div class="detect xc-action">' +
                        '<i class="icon xi-magic-wand"></i>' +
                        '<span>DETECT</span>' +
                    '</div>' +
                    '<div class="clear xc-action">' +
                        '<i class="icon xi-select-none"></i>' +
                        '<span>CLEAR ALL</span>' +
                    '</div>' +
                    '</div>' +
                    '<div class="listSection">' +
                    '<div class="title">' +
                        '<div class="part">' +
                        '<div class="name">Column Name</div>' +
                        '<div class="type">Column Type</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="content">' +
                        '<div class="part">' +
                            '<div class="name dropDownList"><i class="remove icon xi-close-no-circle xc-action fa-8"></i><input value="col1" spellcheck="false"><div class="list"><ul></ul><div class="scrollArea top"><i class="arrow icon xi-arrow-up"></i></div><div class="scrollArea bottom"><i class="arrow icon xi-arrow-down"></i></div></div></div><div class="type dropDownList"><div class="text">array</div><div class="iconWrapper"><i class="icon xi-arrow-down"></i></div><div class="list"><ul></ul><div class="scrollArea top"><i class="arrow icon xi-arrow-up"></i></div><div class="scrollArea bottom"><i class="arrow icon xi-arrow-down"></i></div></div></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="addColumn addArgWrap addArgWrapSmall">' +
                        '<button class="addArg btn btn-secondary btn-100-rounded">' +
                        '<i class="icon xi-plus"></i>' +
                        '</button>' +
                        '<span class="text">Add Column</span>' +
                    '</div>' +
                    '</div>' +
                '</div>' +
                '</section>' +
                '<section class="modalBottom">' +
                '<button type="button" class="btn confirm">Confirm</button>' +
                '<button type="button" class="btn cancel">Cancel</button>' +
                '</section>' +
            '</div>';
        $schemaSelectionModal = $(fakeSchemaSelectionModalHTML);
        $("#container").append($schemaSelectionModal);

        schemaSection = $schemaSelectionModal.find(".colSchemaSection");
        section = new ColSchemaSection(schemaSection);
        mySchema = [
            {
                name: "col1",
                type: "array"
            }
        ]
    });

    it("should create an instance", function() {
        expect(section).to.be.an.instanceof(ColSchemaSection);
        expect(Object.keys(section).length).to.equal(4);
        expect(section._validTypes).to.be.an("array");
        expect(section._$section).to.equal(schemaSection);
        expect(section._options != null).to.equal(true);
    });

    it("should set params", function() {
        section.setInitialSchema(mySchema);
        section.setHintSchema(mySchema);
        section.setValidTypes(mySchema);

        expect(section._initialSchema).to.equal(mySchema);
        expect(section._hintSchema).to.equal(mySchema);
        expect(section._validTypes).to.equal(mySchema);
    });

    it("should get schema", function() {
        section = new ColSchemaSection(schemaSection);

        let schema = section.getSchema();
        expect(schema).to.deep.equal(mySchema);
        $schemaSelectionModal.find(".content .part").after('<div class="part"><div class="name dropDownList"><i class="remove icon xi-close-no-circle xc-action fa-8"></i><input value="" spellcheck="false"><div class="list"><ul></ul><div class="scrollArea top"><i class="arrow icon xi-arrow-up"></i></div><div class="scrollArea bottom"><i class="arrow icon xi-arrow-down"></i></div></div></div><div class="type dropDownList"><div class="text"></div><div class="iconWrapper"><i class="icon xi-arrow-down"></i></div><div class="list"><ul></ul><div class="scrollArea top"><i class="arrow icon xi-arrow-up"></i></div><div class="scrollArea bottom"><i class="arrow icon xi-arrow-down"></i></div></div></div></div>');
        schema = section.getSchema();
        expect(schema).to.deep.equal(null);
    });

    it("should render schema", function() {
        section.render(mySchema);
    });

    it("_selectList should work", function() {
        section._selectList($('.part'), mySchema);
    });

    it("_removeList should work", function() {
        section._removeList($('.part'));
    });

    it("_populateHintDropdown should work", function() {
        section._populateHintDropdown($('.dropDownList'));
    });

    it("_populateTypeDropdown should work", function() {
        section._populateTypeDropdown($('.dropDownList'));
    });

    after(() => {
        $schemaSelectionModal.remove();
        StatusBox.forceHide();
    });
});