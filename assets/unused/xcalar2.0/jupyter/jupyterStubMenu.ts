namespace JupyterStubMenu {
    let menu: Menu;

    class Menu {
        private $jupyterPanel: JQuery; // $("#jupyterPanel");
        private $dropdownBox: JQuery;

        constructor() {
            this.$jupyterPanel = $("#jupyterPanel");
            this.$dropdownBox = this.$jupyterPanel.find(".topBar .dropdownBox");
            this.setupListeners();
        }

        private setupListeners() {
            let $jupMenu = this.$jupyterPanel.find(".jupyterMenu");
            xcMenu.add($jupMenu);
            var self = this;

            this.$dropdownBox.click(function() {
                if (self.$dropdownBox.hasClass("xc-unavailable")) {
                    return;
                }

                MenuHelper.dropdownOpen(self.$dropdownBox, $jupMenu, {
                    "offsetX": -7,
                    "toClose": function() {
                        return $jupMenu.is(":visible");
                    }
                });
            });

            this.$jupyterPanel.on("click", ".jupyterMenu li", function() {
                var stubName = $(this).attr("data-action");
                if (stubName === "basicUDF") {
                    JupyterUDFModal.Instance.show("map");
                } else if (stubName === "importUDF") {
                    JupyterUDFModal.Instance.show("newImport");
                } else {
                    JupyterPanel.appendStub(stubName);
                }
            });
        }

        public toggleVisibility(show: boolean): void {
            if (show) {
                this.$jupyterPanel.find(".topBar .rightArea").removeClass("xc-hidden");
            } else {
                this.$jupyterPanel.find(".topBar .rightArea").addClass("xc-hidden");
            }
        };

        public toggleAllow(allow: boolean): void {
            if (allow) {
                this.$dropdownBox.removeClass("xc-unavailable");
                xcTooltip.remove(this.$dropdownBox);
            } else {
                this.$dropdownBox.addClass("xc-unavailable");
                xcTooltip.add(this.$dropdownBox, {
                    "title": JupyterTStr.NoSnippetOtherWkbk
                });
            }
        }
    }
    /**
     * JupyterStubMenu.setup
     */
    export function setup(): void {
        menu = new Menu();
    }

    /**
     * JupyterStubMenu.toggleVisibility
     * @param show
     */
    export function toggleVisibility(show: boolean): void {
        menu.toggleVisibility(show);
    }

    /**
     * JupyterStubMenu.toggleAllow
     * @param allow
     */
    export function toggleAllow(allow: boolean): void {
        menu.toggleAllow(allow);
    }
}
