interface InputSuggestOptions {
    onClick?: Function;
    $container?: JQuery;
}

class InputSuggest {
    private $container: JQuery;
    private onClick: Function;

    public constructor(options?: InputSuggestOptions) {
        options = options || {};
        this.$container = options.$container;
        this.onClick = options.onClick;

        const self: InputSuggest = this;
        // when click the hint list
        this.$container.on("click", ".hint li", function() {
            if (typeof self.onClick === "function") {
                self.onClick($(this));
            }
        });
    }

    public listHighlight (event: JQueryEventObject): void {
        const $input: JQuery = $(event.currentTarget);
        const $list: JQuery = $input.siblings('.openList');
        if ($list.length && (event.which === keyCode.Up ||
            event.which === keyCode.Down))
        {
            xcUIHelper.listHighlight($input, event, true);
            // bold the similar text
            $list.find("li").each(function() {
                var $suggestion = $(this);
                xcUIHelper.boldSuggestedText($suggestion, $input.val());
            });
        }
    }
}
