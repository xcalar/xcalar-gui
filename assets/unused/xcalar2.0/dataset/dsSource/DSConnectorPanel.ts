abstract class DSConnectorPanel {
    public constructor() {
        this._addEventListeners();
    }

    public show(): void {
        this._clear();
        this._focusOnPath();
    }

    protected abstract _getCard(): JQuery;
    protected abstract _renderTargetList(): HTML;
    protected abstract _onCreateNew($input: JQuery): void;
    protected abstract _onSelectConnector(connector: string): void;

    protected _getPathInput(): JQuery {
        return this._getPathSection().find(".path input");
    }

    private _clear(): void {
        this._focusOnPath();
        this._getPathSection().find(".path").each((i, el) => {
            let $path = $(el);
            if (i === 0) {
                $path.find("input").val("");
            } else {
                $path.remove();
            }
        });
        this._getMultiDSSection().addClass("xc-hidden");
    }

    private _getConnectorSection(): JQuery {
        return this._getCard().find(".target");
    }

    private _getPathSection(): JQuery {
        return this._getCard().find(".pathSection");
    }

    private _getMultiDSSection(): JQuery {
        return this._getCard().find(".multiDS");
    }

    private _focusOnPath(): void {
        this._getPathInput().eq(0).focus();
    }

    private _addPath(): JQuery {
        let $pathSection = this._getPathSection();
        let $path = $pathSection.find(".content").eq(0).clone();
        $path.find("input").val("");
        $pathSection.append($path);
        // if (!XVM.isDataMart()) {
        //     this._getMultiDSSection().removeClass("xc-hidden");
        // }
        return $path;
    }

    private _validatePreview(checkPath: boolean): {
        connector: string,
        paths: {path: string}[]
    } | null {
        let $path: JQuery = this._getPathInput();
        let $target = this._getConnectorSection().find("input");
        let eles = [{$ele: $target}];
        let paths: {path: string}[] = [];

        $path.each((_i, el) => {
            let $ele = $(el);
            let path: string = $ele.val().trim();
            if (path !== "") {
                paths.push({ path });
            }
        });
        if (paths.length === 0 && checkPath) {
            // when all path is empty
            eles.push({ $ele: $path.eq(0) });
        }
        let valid: boolean = xcHelper.validate(eles);
        if (!valid) {
            return null;
        }

        let connector: string = $target.val();
        return {
            connector,
            paths
        };
    }

    private _restoreFromPreview(connector: string, paths: {path: string}[]): void {
        this.show();
        this._getConnectorSection().find("input").val(connector);

        let $pathSection = this._getPathSection();
        paths.forEach((path, i) => {
            let $input: JQuery;
            if (i === 0) {
                $input = $pathSection.find(".path input").eq(0);
            } else {
                let $path = this._addPath();
                $input = $path.find("input");
            }
            $input.val(path.path);
        });
    }

    private _preview(): void {
        let res = this._validatePreview(false);
        if (res == null) {
            return;
        }
        let {paths, connector} = res;
        let path: string = paths[0] ? paths[0].path : "";
        path = DSForm.normalizePath(path);
        let cb = () => this._restoreFromPreview(connector, paths);
        this._clear();
        FileBrowser.show(connector, path, false, {
            backCB: cb
        });
    }

    private _submitForm(): void {
        let res = this._validatePreview(true);
        if (res == null) {
            return;
        }
        let {paths, connector} = res;
        let multiDS: boolean = this._getMultiDSSection().find(".switch").hasClass("on");
        if (paths.length === 1) {
            multiDS = false;
        }
        let cb = () => this._restoreFromPreview(connector, paths);
        this._clear();
        DSConfig.show({
            targetName: connector,
            files: paths,
            multiDS: multiDS,
        }, cb, false);
    }

    private _addDropdownListeners(): void {
        let $dropDown = this._getConnectorSection().find(".dropDownList.connector");
        new MenuHelper($dropDown, {
            onOpen: () => {
                let html: HTML = this._renderTargetList();
                $dropDown.find("ul").html(html);
            },
            onSelect: ($li) => {
                let $input = $dropDown.find("input");
                if ($li.hasClass("createNew")) {
                    this._onCreateNew($input);
                    return;
                }
                let connector: string = $li.text();
                $input.val(connector);
                this._onSelectConnector(connector);
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
        }).setupListeners();
    }

    private _addEventListeners(): void {
        //set up dropdown list for target
        let $card = this._getCard();
        this._addDropdownListeners();

        $card.on("click", ".confirm", () => {
            this._submitForm();
        });

        $card.on("click", ".addPath", () => {
            this._addPath();
        });

        $card.find(".browse").click(() => {
            this._preview();
        });

        this._getPathInput().on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                $card.find(".browse").click();
            }
        });

        $card.find(".back").click(() => {
            // back to data source panel
            this._clear();
            DataSourceManager.startImport(null);
        });

        this._getMultiDSSection().on("click", ".switch, .switchLabel", (el) => {
            let $switch = $(el.currentTarget).closest(".switchWrap").find(".switch");
            if ($switch.hasClass("on")) {
                $switch.removeClass("on");
                $switch.next().removeClass("highlighted");
                $switch.prev().addClass("highlighted");
            } else {
                $switch.addClass("on");
                $switch.prev().removeClass("highlighted");
                $switch.next().addClass("highlighted");
            }
        });
    }
}