class TableMenuManager {
    private static _instance: TableMenuManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private tableMenu: TableMenu;
    private colMenu: ColMenu;
    private cellMenu: CellMenu;

    public constructor() {
        this.tableMenu = new TableMenu();
        this.colMenu = new ColMenu();
        this.cellMenu = new CellMenu();
    }

    public getTableMenu(): TableMenu {
        return this.tableMenu;
    }

    /**
     * Get TableManuManger Instance
     */
    public getColMenu(): ColMenu {
        return this.colMenu;
    }

    public getCellMenu(): CellMenu {
        return this.cellMenu;
    }

    /**
     *
     * @param menuId
     * @param nameInput
     */
    public updateExitOptions(menuId: string, nameInput?: string): void {
        const $menu: JQuery = $(menuId).find(".exitOp:first");
        $menu.attr('class', 'exitOp exitMainMenuOp');
        if (!nameInput) {
            return;
        }
        const name: string = nameInput;
        let nameUpper: string = xcStringHelper.capitalize(name);
        let label: string = nameUpper;
        switch (nameInput) {
            case ('dfcreate'):
                nameUpper = 'Module';
                label = 'Module';
                break;
            case ('group by'):
                label = 'Group By';
                break;
            case ('smartcast'):
                nameUpper = 'SmartCast';
                label = 'Smart Cast';
                break;
            default:
                break;
        }
        $menu.html('<span class="label">Exit ' + label + '</span>');
        $menu.addClass('exit' + nameUpper.replace(/ /g,''));
    }
}