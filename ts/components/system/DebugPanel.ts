class DebugPanel {
    private static _instance: DebugPanel;
    private _systemLogCard: SystemLog;
    private _shellPanel: ShellPanel;
    private _popup: PopupPanel;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._addEventListeners();
        this._systemLogCard = new SystemLog("systemLogCard");
        this._shellPanel = new ShellPanel("shellPanel");
    }

    /**
     * DebugPanel.Instance.toggleDisplay
     * @param display
     */
    public toggleDisplay(display?: boolean): void {
        const $container = this._getContainer().parent();
        if (display == null) {
            display = $container.hasClass("xc-hidden");
        }

        const $tab = $("#debugTab");
        if (display) {
            $tab.addClass("active");
            $container.removeClass("xc-hidden");
            this._popup.trigger("Show_BroadCast");
        } else {
            $tab.removeClass("active");
            $container.addClass("xc-hidden");
            this._popup.trigger("Hide_BroadCast");
        }
    }

    public isVisible() {
        return !this._getContainer().parent().hasClass("xc-hidden");
    }

    /**
     * DebugPanel.Instance.switchTab
     * @param tab
     */
    public switchTab(tab: string): void {
        return this._switchTab(tab);
    }

    /**
     * DebugPanel.Instance.addOutput
     * @param output
     */
    public addOutput(output: string): void {
        const html = this._getOutputHTML(output);
        const $section = this._getOutputSection();
        $section.append(html);
    }

    public setupPopup(): void {
        this._popup = new PopupPanel("debugViewContainer", {
            noUndock: true
        });
        this._popup
        .on("Show", () => { // currently only getting called at startup
            this.toggleDisplay(true);
        })
        .on("ResizeDocked", (state) => {
            $("#debugViewContainer").parent().css("height", `${state.dockedHeight}%`);
        });
    }

    public getPopup(): PopupPanel {
        return this._popup;
    }

    private _getContainer(): JQuery {
        return $("#debugViewContainer");
    }

    private _getTopSection(): JQuery {
        return this._getContainer().find(".topSection");
    }

    private _getContentSection(): JQuery {
        return this._getContainer().find(".contentSection");
    }

    private _getOutputSection(): JQuery {
        return this._getContentSection().find(".section.output");
    }

    private _switchTab(tab: string): void {
        const $topSection = this._getTopSection();
        $topSection.find(".tab.active").removeClass("active");
        $topSection.find(`.tab[data-tab="${tab}"]`).addClass("active");

        const $contentSection = this._getContentSection();
        $contentSection.find(".section:not(.xc-hidden)").addClass("xc-hidden");
        $contentSection.find(`.section.${tab}`).removeClass("xc-hidden");
    }

    private _getOutputHTML(output: string): HTML {
        const time = moment().format("HH:mm:ss MM/DD/YYYY");
        return '<div class="row">' +
                    time + ": " + output +
                '</div>';
    }

    private _addEventListeners(): void {
        const $topSection = this._getContainer().find(".topSection");

        $topSection.on("click", ".tab", (event) => {
            const $tab = $(event.currentTarget);
            if (!$tab.hasClass("active")) {
                this._switchTab($tab.data("tab"));
            }
        });

        $topSection.find(".closeResult").click(() => {
            this.toggleDisplay(false);
        });
    }

    // export function onWinResize(): void {
    //     if (monitorLogCard != null) {
    //         monitorLogCard.adjustTabNumber();
    //     }
    // }
}