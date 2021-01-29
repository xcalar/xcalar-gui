
interface InfListOptions {
    numToFetch?: number;
    numInitial?: number;
}

class InfList {
    private $list: JQuery;
    private numToFetch: number;
    private numInitial: number;

    public constructor($list: JQuery, options?: InfListOptions) {
        options = options || {};
        const self: InfList = this;
        self.$list = $list;
        self.numToFetch = options.numToFetch || 20;
        self.numInitial = options.numInitial || 40;
        self.__init();
    }

    private __init(): void {
        const self: InfList = this;
        const $list: JQuery = self.$list;
        let isMousedown: boolean = false;
        let lastPosition: number = 0;

        $list.on("mousedown", function() {
            isMousedown = true;
            lastPosition = $list.scrollTop();
            $(document).on("mouseup.listScroll", function() {
                isMousedown = false;
                $(document).off("mouseup.listScroll");
                const curPosition: number = $list.scrollTop();
                const height: number = $list[0].scrollHeight;
                const curTopPct: number = curPosition / height;
                // scroll up if near top 2% of textarea
                if (curPosition === 0 ||
                    (curTopPct < 0.02 && curPosition < lastPosition)) {
                    scrollup();
                }
            });
        });

        $list.scroll(function() {
            if ($list.scrollTop() === 0) {
                if (isMousedown) {
                    return;
                }
                scrollup();
            }
        });

        function scrollup(): void {
            const $hidden: JQuery = $list.find(".infListHidden");
            const prevHeight: number = $list[0].scrollHeight;
            $hidden.slice(-self.numToFetch).removeClass("infListHidden");
            const top: number = $list[0].scrollHeight - prevHeight;
            $list.scrollTop(top);
        }
    }

    public restore(selector: string): void {
        const $list: JQuery = this.$list;
        const $items: JQuery = $list.find(selector);
        const limit: number = $items.length - this.numInitial;
        if (limit > 0) {
            $items.filter(":lt(" + limit + ")").addClass("infListHidden");
        }
    }
}
