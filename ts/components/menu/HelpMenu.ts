class HelpMenu {
    private static _instance: HelpMenu;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * HelpMenu.Instance.setup
     */
    public setup() {
        const $menu: JQuery = this._getMenu();
        xcMenu.add($menu);

        if (XVM.isCloud()) {
            $menu.find(".supTicket").hide();
        }

        $("#helpArea").click((event) =>  {
            const $target: JQuery = $(event.currentTarget);
            MenuHelper.dropdownOpen($target, $menu, <DropdownOptions>{
                "offsetY": -1,
                "toggle": true
            });
        });

        $menu.on("mouseup", ".discourse", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._popup('https://discourse.xcalar.com/');
        });

        $menu.on("mouseup", ".document", (event) => {
            if (event.which !== 1) {
                return;
            }
            this._popup('https://xcalar.com/documentation/Content/Home_doc_portal.htm');
        });

        $menu.on("mouseup", ".supTicket", (event) => {
            if (event.which !== 1) {
                return;
            }
            SupTicketModal.Instance.show();
        });
    }

    private _popup(url: string): void {
        const win: Window = window.open(url, '_blank');
        if (win) {
            win.focus();
        } else {
            alert('Please allow popups for this website');
        }
    }

    private _getMenu(): JQuery {
        return $("#helpAreaMenu");
    }
}
