class DagNodeOperatorsMenu {
    private static _instance: DagNodeOperatorsMenu;

    public static get Instance() {
        return this._instance || (this._instance = new DagNodeOperatorsMenu());
    }

    constructor() {

    }

    public setup() {

        this._setupEvents();
        this._setupDragDrop();
    }

    private _getMenu(): JQuery {
        return $("#dagNodeOperatorsMenuWrap");
    }

    private _getSubMenu(): JQuery {
        return $("#dagNodeOperatorsSubMenu");
    }

    private _getContainer(): JQuery {
        return $("#dagView .dataflowMainArea");
    }

    private _setupDragDrop(): void {
        const $subMenu = this._getSubMenu();
        // TODO

    }

    private _setupEvents() {
        const $menu = this._getMenu();
        const $subMenu = this._getSubMenu();

        $menu.find(".controlBtn").click(() => {
            if ($menu.hasClass("dragging")) {
                return;
            }
            this._toggleCollapse();
        });

        $menu.draggable({
            // "handle": ".title",
            "distance": 4,
            "cursor": "-webkit-grabbing",
            "containment": "#dagView .dataflowMainArea",
            "start": () => {
                $menu.addClass("dragging");
                $subMenu.addClass('dragging');
                xcTooltip.hideAll();
            },
            "stop": (_event, ui) => {
                let leftPct = (ui.position.left / this._getContainer().width()) * 100;
                let topPct = (ui.position.top / this._getContainer().height()) * 100;
                $menu.css("left", `${leftPct}%`);
                $menu.css("top", `${topPct}%`);
                setTimeout(() => {
                    // timeout to block the click event
                    $menu.removeClass("dragging");
                    $subMenu.removeClass('dragging');
                    $subMenu.hide();
                }, 0);
            }
        });

        $subMenu.on("mouseup", "li", (event) => {
            if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
                return;
            }
            const $li: JQuery = $(event.currentTarget);
            if ($li.hasClass("manageCustomNodes")) {
                xcGlobal.react.showCustomNodeManagerModal();
                return;
            }

            const opid: string = $li.data('opid');
            const newNodeInfo: DagNodeCopyInfo = DagCategoryBar.Instance.getOperatorInfo(opid);
            const type: DagNodeType = newNodeInfo.type;
            const subType: DagNodeSubType = newNodeInfo.subType;
            DagViewManager.Instance.autoAddNode(type, subType, null, null,
            {autoConnect: true});
        });
    }

    private _toggleCollapse() {
        const $menu = this._getMenu();
        if ($menu.hasClass("collapsed")) {
            $menu.removeClass("collapsed");
        } else {
            $menu.addClass("collapsed");
        }
        this._repositionMenu();
        $menu.blur();
    }

    private _repositionMenu() {
        const $menu = this._getMenu()
        const containerRect = this._getContainer()[0].getBoundingClientRect();
        const menuRect = $menu[0].getBoundingClientRect();
        if (menuRect.bottom > containerRect.bottom) {
            let top = containerRect.height - menuRect.height;
            let topPct = Math.max(0, (top / containerRect.height) * 100);
            $menu.css("top", `${topPct}%`);
        }
    }
}