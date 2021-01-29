describe("PTblSchema Test", function() {
    let $container;
    let ptblSchema;

    before(function() {
        $container = $('<div></div>');
        $("#container").append($container);
        ptblSchema = new PTblSchema($container);
    });

    it("should be an instance of PTblSchema", function() {
        expect(ptblSchema).to.be.an.instanceof(PTblSchema);
    });

    it("should be initizlied", function() {
        expect($container.find(".header").length).to.equal(1);
        expect($container.find(".content").length).to.equal(1);
    });

    it("should render", function() {
        ptblSchema.render([{
            "name": "a",
            "type": ColumnType.integer,
            "primaryKey": "Y"
        }]);
        expect($container.find(".content .row").length).to.equal(1);
    });

    it("should clear", function() {
        ptblSchema.clear();
        expect($container.find(".content .row").length).to.equal(0);
    });

    after(function() {
        $container.remove();
    });
});