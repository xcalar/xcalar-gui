class DagParamPopup {
    private static _instance: DagParamPopup;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _setup: boolean;
    private _container: string;
    private _hasChange: boolean;
    private _modalHelper: ModalHelper;

    private _paramRowLen: number = 5;
    private _paramRowTemplate: HTML = '<div class="row unfilled">' +
        '<div class="cell paramNameWrap textOverflowOneLine">' +
            '<div class="paramName textOverflowOneLine"></div>' +
        '</div>' +
        '<div class="cell paramValWrap textOverflowOneLine">' +
            '<input class="paramVal" spellcheck="false"/>' +
        '</div>' +
        '<div class="cell paramNoValueWrap">' +
            '<div class="checkbox">' +
                '<i class="icon xi-ckbox-empty fa-15"></i>' +
                '<i class="icon xi-ckbox-selected fa-15"></i>' +
            '</div>' +
        '</div>' +
        '<div class="cell paramActionWrap">' +
            '<i class="paramDelete icon xi-close fa-15 xc-action">' +
            '</i>' +
        '</div>' +
    '</div>';

    private constructor() {
        this._container = "paramPopUp";
        this._hasChange = false;
        this._setup = false;
    }

    /**
     * DagParamPopup.Instance.setup
     */
    public setup() {
        if (this._setup) {
            return;
        }
        this._setup = true;
        this._modalHelper = new ModalHelper(this._getContainer(), {
            noBackground: true,
            noEnter: true
        });
        this._addEventListeners();
    }

    private _getContainer(): JQuery {
        return $(`#${this._container}`);
    }

    private _getParamList(): JQuery {
        return this._getContainer().find(".paramList");
    }

    private _getTriggerBtn(): JQuery {
        return $("#dagView .optionsMenu .parameters");
    }

    private _getParams() {
        const params = DagParamManager.Instance.getParamMap();
        const paramStructs = {};
        for (var i in params) {
            paramStructs[i] = {
                value: params[i]
            };
        }
        return paramStructs;
    }

    private _show() {
        xcMenu.close();
        StatusBox.forceHide();
        const $container = this._getContainer();
        if (!$container.hasClass("active")) {
            $container.find(".newParam").val("");
            this._initializeList();
            $container.addClass("active");
            $("#container").on("mousedown.retTab", (event) => {
                const $target: JQuery = $(event.target);
                if ($container.hasClass("active") &&
                    !$target.closest(".tabWrap").length &&
                    !$target.closest(".retTab").length &&
                    !$target.closest($container).length
                ) {
                    this._close();
                    return false;
                }
            });

            this._modalHelper.setup();
        } else {
            this._close();
        }
    }

   private _initializeList(): void {
       const params = this._getParams();
       let html: string = "";
       for (let i = 0; i < this._paramRowLen; i++) {
           html += this._paramRowTemplate;
       }
       this._getParamList().html(html);
       let paramArray: any[] = [];

       for (let i in params) {
           paramArray.push({
               name: i,
               value: params[i].value,
               isEmpty: params[i].isEmpty || !params[i].value
           });
       }
       paramArray = paramArray.sort(sortParams);
       for (let i = 0; i < paramArray.length; i++) {
           this._addParamToList(paramArray[i].name,
                               paramArray[i].value,
                               paramArray[i].isEmpty,
                               false);
       }

       function sortParams(a, b) {
           return xcHelper.sortVals(a.name, b.name);
       }
   }

    private _close() {
        let invalidFound: boolean = false;
        this._getParamList().find(".row:not(.unfilled)").each((_index, el) => {
            let $row: JQuery = $(el);
            let val: string = $row.find(".paramVal").val();
            if (!this._validateParamValue(val, $row.find(".paramVal"))) {
                invalidFound = true;
                return false;
            }
        });

        if (!invalidFound) {
            this._getContainer().removeClass("active");
            StatusBox.forceHide();
            $("#container").off("mousedown.retTab");
            $(window).off(".dagParamPopup");
            this._modalHelper.clear();
        }

        if (!invalidFound && this._hasChange) {
            this._hasChange = false;
            this._updateParams();
        }
    }

    private _submitNewParam(): void {
        let $input: JQuery = this._getContainer().find(".newParam");
        let val: string = $input.val().trim();
        if (!this._validateParamName($input, val)) {
            return;
        }

        $input.val("");
        this._addParamToList(val, "", true, false);
        this._hasChange = true;
    }

    private _validateParamName($ele: JQuery, paramName: string): boolean {
        return xcHelper.validate([
            {
                "$ele": $ele
            },
        {
            "$ele": $ele,
            "error": ErrTStr.NoSpecialCharOrSpace,
            "check": () => {
                return !xcHelper.checkNamePattern(PatternCategory.Param,
                    PatternAction.Check, paramName);
            }
        },
        {
            "$ele": $ele,
            "error": xcStringHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                "name": paramName
            }),
            "check": () => {
                return this._getParamsFromList().hasOwnProperty(paramName);
            }
        }]);
    }

    private _validateParamValue(val: string, $input: JQuery): boolean {
        if (!val.length &&
            !$input.closest(".row").find(".paramNoValueWrap .checkbox")
                    .hasClass("checked")) {
            StatusBox.show("Please enter a value or select 'No Value'", $input, true,
                            {preventImmediateHide: true});
            return false;
        }
        return true;
    }

    private _updateParams() {
        const paramsList = this._getParamsFromList();
        const params = {};
        for (var i in paramsList) {
            params[i] = paramsList[i].value || "";
        }
        DagParamManager.Instance.updateParamMap(params);
    }

    private _addParamToList(
        name: string,
        val: string,
        isEmpty: boolean,
        isInUse: boolean
    ) {
        const $paramList: JQuery = this._getParamList();
        if (val != null) {
            try {
                val = val.toString();
            } catch(e) {
                console.error("add paramar to list error", e, val);
                val = "";
            }
        }
        let $row: JQuery = $paramList.find(".unfilled:first");

        if (!$row.length) {
            $row = $(this._paramRowTemplate);
            $paramList.append($row);
            xcUIHelper.scrollToBottom($paramList.closest(".tableContainer"));
        }

        $row.find(".paramName").text(name);
        $row.find(".paramName").append('<i class="icon xi-copy-clipboard"></i>');
        if (val != null) {
            $row.find(".paramVal").val(val);
            if (isEmpty && val.trim() === "") {
                $row.find(".paramNoValueWrap .checkbox").addClass("checked");
            }
        } else if (isEmpty) {
            $row.find(".paramNoValueWrap .checkbox").addClass("checked");
        }
        if (isInUse) {
            const $paramAction: JQuery = $row.find(".paramActionWrap");
            $paramAction.addClass("unavailable");
            xcTooltip.add($paramAction, {title: ErrTStr.InUsedNoDelete});
        }

        $row.removeClass("unfilled");

        if (val == null || val.trim() === "") { // empty
            $row.find(".paramNoValueWrap .checkbox").removeClass("xc-disabled");
        } else {
            $row.find(".paramNoValueWrap .checkbox").removeClass("checked")
                                                    .addClass("xc-disabled");
        }
    }

    private _getParamsFromList(): object {
        let params: object = {};
        this._getParamList().find(".row:not(.unfilled)").each(function() {
            let $row = $(this);
            params[$row.find(".paramName").text()] =
                {
                    "value": $row.find(".paramVal").val(),
                    "isEmpty": $row.find(".paramNoValueWrap .checkbox")
                                    .hasClass("checked")
                };
        });
        return params;
    }

    private _deleteParam($row: JQuery) {
        const $paramName: JQuery = $row.find(".paramName");
        const paramName: string = $paramName.text();
        if (!this._validateDelete($paramName, paramName)) {
           return;
        }

        $row.remove();
        const $paramList = this._getParamList();
        if ($paramList.find(".row").length < this._paramRowLen) {
            $paramList.append(this._paramRowTemplate);
        }
        this._hasChange = true;
    }

    private _validateDelete($paramName: JQuery, paramName: string) {
        if (DagParamManager.Instance.checkParamInUse(paramName)) {
            StatusBox.show(ErrTStr.ParamInUse, $paramName, false);
            return false;
        }
        return true;
    }

    private _addEventListeners() {
        const $container = this._getContainer();;

         // toggle open retina pop up
        this._getTriggerBtn().click(() => {
            this._show();
        });

        $container.on("click", ".close", () => {
            this._close();
        });
        // delete retina para
        $container.on("click", ".paramDelete", (event) => {
            event.stopPropagation();
            var $row: JQuery = $(event.currentTarget).closest(".row");
            this._deleteParam($row);
        });

        $container.on("keypress", ".newParam", (event) => {
            if (event.which === keyCode.Enter) {
                this._submitNewParam();
            }
        });

        $container.on("click", ".submitNewParam", () => {
            this._submitNewParam();
        });

        $container.on("keypress", ".paramVal", (event) => {
            if (event.which === keyCode.Enter) {
                $(event.currentTarget).blur();
            }
        });

        $container.on("input", ".paramVal", (event) => {
            if (!$container.find(".paramVal").is(":visible")) return; // ENG-8642
            const $val = $(event.currentTarget);
            if ($val.val().trim() !== "") {
                 $val.closest(".row").find(".paramNoValueWrap .checkbox")
                                        .removeClass("checked")
                                        .addClass("xc-disabled");
            } else { // empty
                 $val.closest(".row").find(".paramNoValueWrap .checkbox")
                                        .removeClass("xc-disabled");
            }
            this._hasChange = true;
        });

        $container.on("click", ".checkbox", (event) => {
            $(event.currentTarget).toggleClass("checked");
        });

        $container.on("mouseup", ".paramNameWrap", (event) => {
            const $el = $(event.currentTarget);
            if ($el.closest($container).length) {
                xcUIHelper.copyToClipboard("<" + $el.text() + ">");
            }
        });
    }
}