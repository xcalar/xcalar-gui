namespace MainMenu {
    // offset when a menu is closed (includes 5px padding in .mainContent)
    const openOffset: number = 200; // when the menu is open
    export const defaultWidth: number = 200;
    export const minWidth: number = 120;
    const collapseWidth: number = minWidth - 20;
    let hasSetUp: boolean = false;
    const formPanels: BaseOpPanel[] = [];
    const minRightPanelWidth = 600;
    export let curSQLLeftWidth = defaultWidth;
    let _popup:  PopupPanel;

    /**
     * MainMenu.setup
     */
    export function setup(openNotebookPanel: boolean) {
        if (hasSetUp) {
            return;
        }
        hasSetUp = true;
        addEventListeners();
        setupDataflowResizable();

        let winResizeTimer: number;
        $(window).on("resize.mainMenu", () => {
            clearTimeout(winResizeTimer);
            winResizeTimer = <any>setTimeout(sizeRightPanel, 100);
        });

        if (openNotebookPanel) {
            openPanel();
        }
    }

    /**
     * MainMenu.registerPanels
     * @param panel
     */
    export function registerPanels(panel): void {
        formPanels.push(panel);
    }

    function openPanel(): void {
        let $tab: JQuery = $("#resourcesTab");
        if (!$tab.hasClass("active") || WorkbookPanel.isWBMode()) {
            WorkbookPanel.hide(true);
            panelSwitchingHandler($tab);
            xcUIHelper.hideSuccessBox();
        }
    }

    function toggleResourcePanel() {
        const $tab = $("#resourcesTab");
        if ($tab.hasClass("showing")) {
            $tab.removeClass("showing");
            $("#sqlWorkSpacePanel").addClass("hidingLeftPanel");
        } else {
            $tab.addClass("showing");
            $("#sqlWorkSpacePanel").removeClass("hidingLeftPanel");
        }
        TblFunc.moveFirstColumn();
        DagCategoryBar.Instance.showOrHideArrows();
        SQLEditorSpace.Instance.refresh();
        UDFPanel.Instance.refresh();
        DagConfigNodeModal.Instance.refresh();
    }

    function addEventListeners(): void {
        $("#resourcesTab").click(() => {
            toggleResourcePanel();
        });

        $("#sqlEditorTab").click(() => {
            SQLEditorSpace.Instance.toggleDisplay();
        });

        $("#udfTab").click(() => {
            UDFPanel.Instance.toggleDisplay();
        });

        $("#appBuilderTab").click(() => {
            DagPanel.Instance.toggleDisplay();
        });

        $("#tableResultTab").click(() => {
            SQLResultSpace.Instance.toggleDisplay();
        });

        $("#debugTab").click(() => {
            DebugPanel.Instance.toggleDisplay();
        });

        $("#dagList .topSection .closeBtn").click(() => {
            toggleResourcePanel();
        });
    }

    /**
     * MainMenu.getOffset
     */
    export function getOffset(): number {
        return openOffset;
    }

    // ensures right panels are not too small
    function sizeRightPanel() {
        if ($("#sqlWorkSpacePanel").hasClass("active")) {
            TblFunc.moveFirstColumn();
            DagCategoryBar.Instance.showOrHideArrows();
        }
    }

    // XXX for dagpanel only, move this function
    /**
     * MainMenu.resize
     * @param width
     */
    export function resize(width: number): void {
        _resize($("#dataflowMenu"), width);
        curSQLLeftWidth = Math.min(width, minWidth);

        // let codemirror know it's area was resized
        formPanels.forEach(function(panel) {
            if (panel.isOpen()) {
                if (panel.getEditor && panel.getEditor()) {
                    panel.getEditor().refresh();
                }
                if (panel["getSQLEditor"] && panel["getSQLEditor"]()) {
                    panel["getSQLEditor"]().refresh();
                }
                if (panel.panelResize) {
                    panel.panelResize();
                }
            }
        });
    }

    /**
     * MainMenu.setupPopup
     */
    export function setupPopup(): void {
        _popup = new PopupPanel("dataflowMenu", {
            noUndock: true
        });
        _popup
        .on("ResizeDocked", (state) => {
            let width = Math.min(state.dockedWidth, $(window).width() - 20);
            MainMenu.resize(width);
        });
    }

    function setupDataflowResizable(): void {
        const $menu = $("#dataflowMenu");
        const onStop = (width, prevWidth) => {
            if (width < collapseWidth) {
                $menu.outerWidth(prevWidth);
                toggleResourcePanel();
            } else {
                width = Math.max(minWidth, width);
                MainMenu.resize(width);
                width = $menu[0].getBoundingClientRect().width;
                _popup.trigger("ResizeDocked_BroadCast", {
                    dockedWidth: width,
                });
            }
        };
        _setupResizable($menu, undefined, onStop);
    }

    function _setupResizable(
        $menu: JQuery,
        onResize?: () => void,
        onStop?: (width, prevWidth) => void
    ): void {
        let $ghost: JQuery;
        $menu.resizable({
            "handles": "e",
            "distance": 2,
            "helper": "mainMenuGhost",
            "start": () => {
                let winWidth =  $(window).width();
                let panelRight: number = $menu[0].getBoundingClientRect().right;
                panelRight = winWidth - panelRight + $menu.width();
                $menu.css("max-width", panelRight - 10);
                $menu.addClass("resizing");
                $ghost = $(".mainMenuGhost");
                $ghost.css("max-width", panelRight - 10);
                $("#container").addClass("noMenuAnim");
            },
            "resize": (_event, ui) => {
                if (ui.size.width < collapseWidth) {
                    $ghost.addClass("collapseSize");
                } else {
                    $ghost.removeClass("collapseSize");
                }
                if (typeof onResize === "function") {
                    onResize();
                }
            },
            "stop": (_event, ui) => {
                $menu.css("max-width", "").css("max-height", "");
                let width: number = ui.size.width;
                width = Math.min(width, $(window).width() - $("#menuBar").width() - 10);
                if (typeof onStop === "function") {
                    onStop(width, ui.originalSize.width);
                } else {
                    _resize($menu, width);
                }
            }
        });
    }

    function _resize($menu: JQuery, width: number): void {
        width = Math.max(width, minWidth);
        $("#container").addClass("noMenuAnim");
        const $mainContent = $menu.closest(".mainPanel").find("> .mainContent");
        const mainContentWidth = $mainContent.outerWidth();

        // if left panel width exceeds 50% of mainContentWidth, right panel width should be the greatest of (fullWidth - 50%) or minRightWidth;
        // if left panel is below 50%, right panel width should be fullWidth - leftPanel width
        // left margin is fullWidth - rightPanelWidth, but can never be smaller than minWidth
        let rightPanelWidth;
        if ((width > (mainContentWidth / 2)) || ((mainContentWidth - width) < minRightPanelWidth)) {
            rightPanelWidth = Math.max(mainContentWidth / 2, minRightPanelWidth);
        } else {
            rightPanelWidth = mainContentWidth - width;
        }
        let rightPanelMargin = Math.max(mainContentWidth - rightPanelWidth, minWidth);

        $menu.outerWidth(width);

        $menu.removeClass("resizing");
        const newWidth: number = $menu.outerWidth();
        if (newWidth < minWidth) {
            $menu.outerWidth(defaultWidth);
            $menu.removeClass("expanded");
        } else {
            $menu.addClass("expanded");
        }

        $mainContent.children(".rightSection").css("margin-left", rightPanelMargin);
        let widthCSS: string = $menu.css("width");
        $menu.attr("style", ""); // remove styling added by ghost
        $menu.css("width", widthCSS);
        TblFunc.moveFirstColumn();
        setTimeout(() => {
            $("#container").removeClass("noMenuAnim");
            // remove animation for a split second so there's no anim
        }, 0);
    }

    function closeMainPanels(): void {
        $(".mainPanel").removeClass("active");
    }

    function panelSwitchingHandler($curTab: JQuery): void {
        SQLWorkSpace.Instance.unfocus();
        DagViewManager.Instance.hide();

        closeMainPanels();
        const $container = $("#container");
        $container.removeClass("monitorViewOpen");
        $curTab.addClass("active");

        $("#sqlWorkSpacePanel").addClass("active");
        SQLWorkSpace.Instance.focus();
        DagViewManager.Instance.show();

        sizeRightPanel();
        StatusMessage.updateLocation(null, null);
        $(".tableDonePopupWrap").remove();
    }
}
