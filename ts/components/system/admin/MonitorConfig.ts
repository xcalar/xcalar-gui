class MonitorConfig {
    private _id: string;
    private _paramsCache: {[key: string]: any};
    private _formHelper: FormHelper;
    private _event: XcEvent;

    public constructor(id: string) {
        this._id = id;
        this._paramsCache = {};
        this._formHelper = new FormHelper(this._getCard(), {
            "noEsc": true,
            "noTabFocus": true
        });
        this._event = new XcEvent();
        this._addEventListeners();
    }

    /**
     * updateOnly will not wipe out new rows
     * @param firstTouch
     */
    public refreshParams(firstTouch: boolean): XDPromise<{[key: string]: any}> {
        let deferred: XDDeferred<{[key: string]: any}> = PromiseHelper.deferred();
        XcalarGetConfigParams()
        .then((res) => {
            try {
                let params = res.parameter;
                for (let i = 0; i < params.length; i++) {
                    let paramName: string = params[i].paramName.toLowerCase();
                    this._paramsCache[paramName] = params[i];
                }

                if (firstTouch) {
                    this._setupVisibleParamsList();
                }
                deferred.resolve(this._paramsCache);
            } catch (e) {
                deferred.reject(e.message);
            }
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public on(event: string, callback: Function): MonitorConfig {
        this._event.addEventListener(event, callback);
        return this;
    }

    public getParam(paramName: string) {
        if (!paramName || typeof paramName !== "string") {
            return null;
        }
        return this._paramsCache[paramName.toLowerCase()];
    }

    private _getCard(): JQuery {
        return $(`#${this._id}`);
    }

    private _getPlaceHolder(): JQuery {
        return this._getCard().find(".placeholder");
    }

    private _addEventListeners(): void {
        this._getPlaceHolder().click(() => {
            this._addInputRow();
        });

        let $configCard = this._getCard();
        $configCard.find('.toggleSize').on('click', '.headerBtn', (e) => {
            let $el = $(e.currentTarget);
            if ($el.hasClass('minimize')) {
                $configCard.addClass('minimized');
                $el.parent().addClass('minimized');
                this._event.dispatchEvent("minimize");
            } else {
                $configCard.removeClass('minimized');
                $el.parent().removeClass('minimized');
                this._event.dispatchEvent("maximize");
            }
        });


        $configCard.on('keypress', '.paramName', (e) => {
            if (e.which !== keyCode.Enter) {
                return;
            }
            this._submitParamName($(e.currentTarget), false);
        });

        $configCard.on('blur', '.paramName', (e) => {
            let $nameInput = $(e.currentTarget);
            $nameInput.val($nameInput.attr('data-value'));
        });

        $configCard.on("change", ".paramName", (e) => {
            this._submitParamName($(e.currentTarget), true);
        });

        $configCard.on('keydown', '.newVal', (e) => {
            if (e.which === keyCode.Enter) {
                $(e.currentTarget).blur();
            }
        });

        $configCard.on('click', '.removeRow', (e) => {
            $(e.currentTarget).closest('.formRow').remove();
        });

        $configCard.on('click', '.defaultParam', (e) => {
            this._resetDefaultParam($(e.currentTarget).closest('.formRow'));
        });

        $configCard.on("click", ".settingSave", (e) => {
            $(e.currentTarget).blur();
            this._submitForm();
        });

        $configCard.on("click", ".resetAll", (e) => {
            $(e.currentTarget).blur();
            this._resetAllDefaultParams();
        });


        $configCard.on("mouseenter", ".tooltipOverflow", (e) => {
            xcTooltip.auto(<any>e.currentTarget);
        });
    }

    private _resetAllDefaultParams(): void {
        let $rows = this._getCard().find(".formRow.nameIsSet:not(.uneditable)");
        $rows.each((_index, el) => {
            let $row = $(el);
            let oldVal = $row.find(".curVal").val();
            $row.find(".newVal").val(oldVal);
        });
    }

    // fills in user's val input with default value
    private _resetDefaultParam($row: JQuery): void {
        let $nameInput: JQuery = $row.find('.paramName');
        let paramObj = this._getParamObjFromInput($nameInput);
        if (!paramObj) {
            return;
        }
        let defaultVal: string = paramObj.defaultValue;
        if (defaultVal === "(null)") {
            defaultVal = "";
        }
        $row.find('.newVal').val(defaultVal);
    }

    private _getParamObjFromInput($nameInput: JQuery): any {
        return this._paramsCache[$nameInput.val().toLowerCase().trim()];
    }

    private _hasParam(paramName: string): boolean {
        let $row = this._getCard().find('input[data-value="' + paramName + '"]');
        return ($row.length > 0);
    }

    private _submitParamName(
        $nameInput: JQuery,
        onChangeTriggered: boolean
    ): void {
        let val: string = $nameInput.val().trim();
        if (!val.length) {
            return;
        }

        let $formRow = $nameInput.closest('.formRow');
        let $curValInput = $formRow.find('.curVal');
        let $newValInput = $formRow.find('.newVal');
        let paramObj = this._getParamObjFromInput($nameInput);

        if (paramObj) {
            if (this._hasParam(paramObj.paramName)) {
                if (!onChangeTriggered) {
                    this._showAddParamError(ErrTStr.ConfigParamExists, $nameInput);
                }
                return;
            }

            $nameInput.attr('data-value', paramObj.paramName)
                      .prop('readonly', true)
                      .val(paramObj.paramName);
            $curValInput.val(paramObj.paramValue);
            xcTooltip.changeText($curValInput, paramObj.paramValue);
            $formRow.addClass('nameIsSet');

            if (paramObj.changeable) {
                if ($newValInput.val() === "") {
                    $newValInput.val(paramObj.paramValue);
                }
                $newValInput.prop('readonly', false);
            } else {
                $formRow.addClass('uneditable');
                $newValInput.addClass('readonly')
                            .prop('readonly', true)
                            .val("");
                $formRow.find('.defaultParam').addClass('xc-hidden');
                xcTooltip.enable($newValInput);
            }
            let defValTooltip = this._getDefaultTooltip(paramObj);
            xcTooltip.changeText($formRow.find('.defaultParam'), defValTooltip);
        } else {
            $nameInput.attr('data-value', val);
            $curValInput.val('');
            xcTooltip.changeText($curValInput, "");
            if (!onChangeTriggered) {
                this._showAddParamError(ErrTStr.ConfigParamNotFound, $nameInput);
            }
        }
    }

    private _getDefaultTooltip(paramObj: any): string {
        let defValTooltip;
        if (paramObj && paramObj.hasOwnProperty('defaultValue')) {
            defValTooltip = xcStringHelper.replaceMsg(MonitorTStr.DefaultWithVal, {
                value: paramObj.defaultValue
            });
        } else {
            defValTooltip = CommonTxtTstr.RevertDefaultVal;
        }
        return defValTooltip;
    }

    private _showAddParamError(error: string, $nameInput: JQuery): void {
        StatusBox.show(error, $nameInput, false, {
            "offsetX": -5,
            "side": "top"
        });
    }

    protected _submitForm(): XDPromise<void> {
        let errorFound: {input: JQuery, reason: string};
        let promises: XDPromise<void>[] = [];
        let rows: JQuery[] = [];
        let needRestart: boolean = false;

        this._getCard().find('.configTable .formRow').each((_index, el) => {
            let $row = $(el);
            if ($row.hasClass('placeholder') || $row.hasClass('uneditable')) {
                return true;
            }

            let $newValInput = $row.find('.newVal');
            let newVal: string = $newValInput.val().trim();
            let $nameInput = $row.find('.paramName');
            let paramObj = this._getParamObjFromInput($nameInput);

            if (!paramObj) {
                errorFound = {
                    input: $nameInput,
                    reason: "invalidName"
                };
                return false;
            }

            if (!newVal.length && paramObj.defaultValue !== "") {
                errorFound = {
                    input: $newValInput,
                    reason: "empty"
                };
                return false;
            }

            if (newVal !== paramObj.paramValue) {
                let pName: string = paramObj.paramName;
                needRestart = needRestart || paramObj.restartRequired;
                rows.push($row);
                promises.push(XcalarSetConfigParams(pName, newVal));
            }
        });

        if (errorFound) {
            this._showFormError(errorFound);
            return PromiseHelper.reject();
        }

        if (promises.length) {
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            this._formHelper.disableSubmit();
            PromiseHelper.when(...promises)
            .then(() => {
                if (needRestart) {
                    var msg = SuccessTStr.SaveParam + " " +
                              MonitorTStr.RestartMsg;
                    Alert.show({
                        "title": MonitorTStr.Restart,
                        "msg": msg,
                        "isAlert": true
                    });
                } else {
                    xcUIHelper.showSuccess(SuccessTStr.SaveParam);
                }
                deferred.resolve();
            })
            .fail((args) => {
                // XXX also need to handle partial failures better
                // (alert restarat if necessary)
                this._submitFailHandler(args, rows);
                deferred.reject();
            })
            .always(() => {
                this.refreshParams(false)
                .then(() => {
                    this._updateParamInputs(rows);
                })
                .always(() => {
                    this._formHelper.enableSubmit();
                });
            });
            return deferred.promise();
        } else {
            xcUIHelper.showSuccess(SuccessTStr.SaveParam);
            return PromiseHelper.resolve();
        }
    }

    private _submitFailHandler(args: any, rows: JQuery[]): void {
        let errorMsg: string = "";
        let $errorRow: JQuery = $();
        for (let i = 0; i < args.length; i++) {
            if (args[i].error) {
                if (!errorMsg) {
                    errorMsg = args[i].error;
                    $errorRow = rows[i];
                }
            }
        }
        // xx not sure how to show all the errored rows if multiple
        let paramName: string = $errorRow.find('.paramName').val();
        let newVal: string = $errorRow.find('.newVal').val();
        errorMsg += '<br/>' + xcStringHelper.replaceMsg(
        MonitorTStr.ParamConfigFailMsg, {
            name: paramName,
            value: newVal
        });
        Alert.error(MonitorTStr.ParamConfigFailed, errorMsg, {
            msgTemplate: errorMsg
        });
    }

    private _showFormError(errorObj: {input: JQuery, reason: string}): void {
        let msg: string = "";
        switch (errorObj.reason) {
            case ("empty"):
                msg = ErrTStr.NoEmpty;
                break;
            case ("invalidName"):
                msg = ErrTStr.ConfigParamNotFound;
                break;
            default:
                break;
        }
        StatusBox.show(msg, errorObj.input, null, {side: "top"});
    }

    private _setupVisibleParamsList(): void {
        let html: HTML = "";
        for (let name in this._paramsCache) {
            let paramObj = this._paramsCache[name];
            if (paramObj.visible) {
                html += this._getInputRowHtml(paramObj);
            }
        }
        if (html.length === 0) {
            html += this._getInputRowHtml(null);
        }

        let $placeholder = this._getPlaceHolder();
        $placeholder.siblings().remove();
        $placeholder.before(html);
    }

    private _updateParamInputs(rows: JQuery[]): void {
        for (let i = 0; i < rows.length; i++) {
            let $row = rows[i];
            let $nameInput: JQuery = $row.find('.paramName');
            let paramObj = this._getParamObjFromInput($nameInput);
            if (paramObj) {
                $nameInput.val(paramObj.paramName);
                let $curValInput = $row.find('.curVal');
                $curValInput.val(paramObj.paramValue);
                xcTooltip.changeText($curValInput, paramObj.paramValue);
            }
        }
    }

    private _addInputRow(): void {
        let html = this._getInputRowHtml(null);
        let $row: JQuery = $(html);
        let $placeholder = this._getPlaceHolder();
        $placeholder.before($row);
        $row.find("input").eq(0).focus();
        setTimeout(() => {
            $placeholder.prev().removeClass('animating');
        }, 0);

        // position scrollbar
        let $configCard = this._getCard();
        let rowHeight: number = $configCard.find(".formRow").eq(0).outerHeight();
        let posDiff: number = $placeholder.offset().top + rowHeight;
        this._event.dispatchEvent("adjustScollbar", posDiff);
    }

    private _getInputRowHtml(
        paramObj: {
            paramName: string,
            paramValue: any,
            changeable: boolean,
            restartRequired: boolean
        }
    ): HTML {
        let paramName: string = "";
        let curVal: string = "";
        let newVal: string = "";
        let rowClassNames: string = "";
        let paramNameDisabledProp: string = "";
        let uneditable: boolean = false;
        let restartClass: string = "";

        if (paramObj) {
            paramName = paramObj.paramName;
            curVal = paramObj.paramValue;
            rowClassNames += " nameIsSet";
            paramNameDisabledProp = "readonly";
            if (paramObj.changeable) {
                newVal = curVal;
            } else {
                rowClassNames += " uneditable";
                uneditable = true;
            }
            if (paramObj.restartRequired) {
                restartClass = "restartRequired";
            }
        } else {
            rowClassNames += " animating";
        }
        let html = '<div class="formRow ' + rowClassNames + '">' +
                    '<div class="removeRow">' +
                        '<i class="icon xi-close fa-14"></i>' +
                    '</div>' +
                  '<label class="argWrap paramNameWrap">' +
                    '<input type="text" class="xc-input paramName" ' +
                    'data-value="' + paramName + '" ' + paramNameDisabledProp +
                    ' value="' + paramName + '" spellcheck="false">' +
                  '</label>' +
                  '<label class="argWrap curValWrap">' +
                    '<input type="text" readonly ' +
                    'class="xc-input curVal readonly tooltipOverflow" ' +
                    'value="' + curVal + '" spellcheck="false" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + curVal + '">' +
                  '</label>' +
                  '<label class="argWrap">';
        if (uneditable) {
            html += '<input type="text" class="xc-input newVal readonly" ' +
                        'readonly value="' + newVal + '" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' + TooltipTStr.ParamValNoChange +
                        '" spellcheck="false">';
        } else {
            html += '<input type="text" class="xc-input newVal" ' +
                    'data-original-title="' + TooltipTStr.ParamValNoChange +
                    '" data-container="body" ' +
                    'value="' + newVal + '" spellcheck="false">';
        }
        if (!uneditable) {
            let defValTooltip = this._getDefaultTooltip(paramObj);
            html +=
                '<div class="defaultParam iconWrap xc-action" ' +
                    'data-toggle="tooltip" data-container="body" ' +
                    'data-original-title="' + defValTooltip + '">' +
                    '<i class="icon xi-reset center fa-15"></i>' +
                '</div>';
        }
        html += '</label>' +
                '<label class="argWrap restartWrap ' + restartClass + '">' +
                    '<i class="icon xi-tick"></i>' +
                '</label>' +
                '</div>' +
                '</div>';
        return html;
    }
}
