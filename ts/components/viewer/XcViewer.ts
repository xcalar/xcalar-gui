abstract class XcViewer {
    private id: string;
    protected $view: JQuery;

    constructor(id: string) {
        this.id = id;
        this.$view = $('<div class="viewWrap xc-contentView"></div>');
    }

    abstract getTitle(): string;

    /**
     * render to viewer
     */
    public render($container: JQuery): XDPromise<void> {
        $container.append(this.$view);
        return PromiseHelper.resolve();
    }

    /**
     * @returns {id} return the id of the viewer
     */
    public getId(): string {
        return this.id;
    }

    /**
     * clear the view
     */
    public clear(_isRefresh: boolean = false): void {
        this.$view.remove();
    }

    public getView(): JQuery {
        return this.$view;
    }
}