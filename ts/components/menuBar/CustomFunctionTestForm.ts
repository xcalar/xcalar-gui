class CustomFunctionTestForm {
    private static _instance = null;
    private _isOpen = false;
    private _newField: string = "TEST_FIELD";

    public static get Instance(): CustomFunctionTestForm {
        return this._instance || (this._instance = new this());
    }

    constructor() {
        const $form = this._getForm();
        $form.find(".closeTestForm").click(this.hide.bind(this));
        $form.find(".clear").click(this._clear.bind(this));
        $form.find(".submit").click(this._submit.bind(this));
        $form.find(".checkboxSection").click((event) => {
            $(event.currentTarget).find(".checkbox").toggleClass("checked");
        });

        this._setupDropdowns();

        $form.resizable({
            "handles": "n",
            "distance": 2,
            "minHeight": 20,
            "maxHeight": 300,
            "start": () => {
            },
            "resize": (_event, ui) => {
            },
            "stop": (_event, ui) => {
            }
        });
    }

    public isOpen() {
        return this._isOpen;
    }

    public toggle() {
        if (this._isOpen) {
            this.hide();
        } else {
            this.show();
        }
    }

    public show() {
        this._isOpen = true;
        const $form = this._getForm();
        $("#udfSection").addClass("testFormOpen");
        let topSectionHeight = $("#udfSection").find(".menuContent").height();

        if (topSectionHeight < 20) {
            $form.height("-=" + (20 - topSectionHeight));
        }
        UDFPanel.Instance.refresh();

        if ($form.find(".arg[data-arg='function']").val().trim() === "" &&
            !UDFTabManager.Instance.getActiveTab().isNew) {
            const prefix = UDFTabManager.Instance.getActiveTab().name + ":";
            const funcs = XDFManager.Instance.getAllUDFs().filter((udf) => {
                return udf.displayName.startsWith(prefix);
            });

            funcs.sort((a, b) => {
                if (a.displayName > b.displayName) return 1;
                return -1;
            });

            if (funcs[0]) {
                const name = funcs[0].displayName.slice(funcs[0].displayName.indexOf(":") + 1)
                $form.find(".arg[data-arg='function']").val(name);
            }
        }
    }

    public hide() {
        this._isOpen = false;
        $("#udfSection").removeClass("testFormOpen");
        UDFPanel.Instance.refresh();
    }

    private _getForm(): JQuery {
        return $("#udfSection .testForm");
    }

    private _setupDropdowns() {
        const $form = this._getForm();
        const $dropdownList = $form.find(".arg[data-arg='function']").closest(".dropDownList");
        const customScalarFnsList: MenuHelper = new MenuHelper($dropdownList, {
            "onOpen": ($list) => {
                let list = "";
                if (!UDFTabManager.Instance.getActiveTab().isNew) {
                    const prefix = UDFTabManager.Instance.getActiveTab().name + ":";
                    const funcs = XDFManager.Instance.getAllUDFs().filter((udf) => {
                        return udf.displayName.startsWith(prefix);
                    });

                    funcs.sort((a, b) => {
                        if (a.displayName > b.displayName) return 1;
                        return -1;
                    });

                    funcs.forEach((fn) => {
                        let name = fn.displayName.slice(fn.displayName.indexOf(":") + 1);
                        let li = '<li data-container="body" ' +
                        'data-placement="auto right" data-toggle="tooltip" title="' +
                        fn.fnDesc + '">' + name + '</li>';
                        list += li;
                    });
                }

                if (!list.length) {
                    list = '<li class="hint noResultHint" ' +
                     'style="pointer-events:none">' +
                        UDFTStr.NoFunction +
                    '</li>';
                }
                $list.find(".list > ul").empty().append(list);
            },
            "onSelect": ($li) => {
                const func = $li.text().trim();
                $dropdownList.find(".text").val(func);
            },
            "container": "#udfSection",
            "bounds": "#udfSection",
            "bottomPadding": 4,
            "fixedPosition": {
                $selector: $dropdownList.find(".text")
            }
        });

        customScalarFnsList.setupListeners();

        new InputDropdownHint($dropdownList, {
            menuHelper: customScalarFnsList,
            order: true,
            preventClearOnBlur: true,
            onEnter: (val, $input) => {
                $input.val(val);
                return true;
            }
        });

        const $tableList = $form.find(".arg[data-arg='table']").closest(".dropDownList");
        const tableList: MenuHelper = new MenuHelper($tableList, {
            "onOpen": ($list) => {
                let list = "";
                const tables = PTblManager.Instance.getAvailableTables();
                const allTables = tables.map((table) => {
                    return {
                        name: table.name,
                        type: "published",
                        status: table.active ? "active" : "inactive"
                    }
                });

                DagTblManager.Instance.getAllTables().forEach((tableName) => {
                    allTables.push({
                        name: tableName,
                        type: "session",
                        status: "active"
                    });
                })
                allTables.sort((a, b) => {
                    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
                    return -1;
                });

                allTables.forEach((table) => {
                    let li = '<li data-container="body" ' +
                    'data-placement="auto right" data-toggle="tooltip" title="">' + table.name + '</li>';
                    list += li;
                });

                if (!list.length) {
                    list = '<li class="hint noResultHint" ' +
                     'style="pointer-events:none">' +
                        CommonTxtTstr.NoResult +
                    '</li>';
                }
                $list.find(".list > ul").empty().append(list);
            },
            "onSelect": ($li) => {
                const func = $li.text().trim();
                $tableList.find(".text").val(func);
            },
            "container": "#udfSection",
            "bounds": "#udfSection",
            "bottomPadding": 4,
            "fixedPosition": {
                $selector: $tableList.find(".text")
            }
        });

        tableList.setupListeners();

        new InputDropdownHint($tableList, {
            menuHelper: tableList,
            order: true,
            preventClearOnBlur: true,
            onEnter: (val, $input) => {
                $input.val(val);
                return true;
            }
        });

        const $columnList = $form.find(".arg[data-arg='columns']").closest(".dropDownList");
        const columnList: MenuHelper = new MenuHelper($columnList, {
            "onOpen": async ($list) => {
                let list = "";
                let isSessionTable = false;

                let tables = PTblManager.Instance.getAvailableTables();
                let table: PbTblInfo | string = tables.find((table) => {
                    return table.name === $form.find(".arg[data-arg='table']").val().trim();
                });
                if (!table) {
                    table = DagTblManager.Instance.getAllTables().find((tableName) => {
                        return tableName === $form.find(".arg[data-arg='table']").val().trim()
                    }) as string;
                    if (table) {
                        isSessionTable = true;
                    }
                }
                if (table) {
                    let columns = [];
                    if (isSessionTable) {
                        try {
                            const tableMeta = await XIApi.getTableMeta(<string>table);
                            columns = tableMeta.valueAttrs.map((valueAttr) => {
                                return {name: valueAttr.name}
                            });
                        } catch (e){}
                    } else {
                        columns = (<PbTblInfo>table).columns;
                    }

                    columns = columns.filter((column) => {
                        return !xcHelper.isInternalColumn(column.name);
                    });

                    columns.sort((a, b) => {
                        if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
                        return -1;
                    });

                    columns.forEach((table) => {
                        let li = '<li data-container="body" ' +
                        'data-placement="auto right" data-toggle="tooltip" title="">' + table.name + '</li>';
                        list += li;
                    });
                }

                if (!list.length) {
                    list = '<li class="hint noResultHint" ' +
                     'style="pointer-events:none">' +
                        CommonTxtTstr.NoResult +
                    '</li>';
                }
                $list.find(".list > ul").empty().append(list);
            },
            "onSelect": ($li) => {
                let val = $li.text().trim();
                const special: string = ["None", "null"].find((word) => {
                    return gColPrefix + word === val;
                });
                if (!special) {
                    val = gColPrefix + val;
                }
                this._appendColumn(val);
                // $columnList.find(".text").val(val);
            },
            "container": "#udfSection",
            "bounds": "#udfSection",
            "bottomPadding": 4,
            "fixedPosition": {
                $selector: $columnList.find(".text")
            }
        });

        tableList.setupListeners();

        new InputDropdownHint($columnList, {
            menuHelper: columnList,
            order: true,
            preventClearOnBlur: true,
            isColumnsList: true,
            getInput: () => {
                const $input = this._getForm().find(".arg[data-arg='columns']");
                const argsMap = new Map();
                argsMap.set("columns", {
                    type: $input.data("arg"),
                    rawValue: $input.val(),
                    parsedValue: $input.val().trim(),
                    $input: $input
                });
                this._parseColumns(argsMap);
                let columns = argsMap.get("columns").columns;
                let lastCol = "";
                if (columns.length) {
                    lastCol = columns[columns.length - 1];
                    if (lastCol.startsWith(gColPrefix)) {
                        lastCol = lastCol.slice(1);
                    }
                }
                return lastCol;
            },
            onEnter: (val, $input) => {
                // $input.val(gColPrefix + val);
                this._appendColumn(gColPrefix + val);
                return true;
            }
        });
    }

    private _appendColumn(val) {
        const $input = this._getForm().find(".arg[data-arg='columns']");
        const argsMap = new Map();
        argsMap.set("columns", {
            type: $input.data("arg"),
            rawValue: $input.val(),
            parsedValue: $input.val().trim(),
            $input: $input
        });
        this._parseColumns(argsMap);
        let columns = argsMap.get("columns").columns;
        if (columns.length) {
            let lastCol = columns[columns.length - 1].toLowerCase();
            if (val.toLowerCase().startsWith(lastCol) ||
             (!lastCol.startsWith(gColPrefix) && val.toLowerCase().startsWith(gColPrefix + lastCol))) {
                columns[columns.length - 1] = val;
            } else {
                columns.push(val);
            }
            $input.val(columns.join(", "));
        } else {
            $input.val(val);
        }
    }

    private _getValidations(arg) {
        let validations = {
            function: [{$ele: arg.$input}, {
                check: () => {
                    let udfName = UDFTabManager.Instance.getActiveTab().name + ":" + arg.parsedValue;
                    return !XDFManager.Instance.hasUDF(udfName)
                },
                error: `Function ${UDFTabManager.Instance.getActiveTab().name + ":" + arg.parsedValue} was not found in this module. Make sure your module is saved and try again.`
            }],
            table: [{$ele: arg.$input}],
            columns: [{
                check: () => {
                    return arg.rawValue.trim().length && arg.parsedValue.length === 0
                },
                error: "No columns or values were detected."
            }],
            rows: [{$ele: arg.$input}, {
                check: () => {
                    return isNaN(arg.parsedValue);
                },
                error: "Enter a valid integer greater than 0."
            },
            {
                check: () => {
                    return arg.parsedValue < 1
                },
                error: "Enter a number greater than 0."
            }
        ]
        }
        return validations[arg.type];
    }

    private _validate() {
        const $form = this._getForm();
        const argsMap: Map<string, any> = new Map();
        const $inputs = $form.find(".arg");
        for (let i = 0; i < $inputs.length; i++) {
            const $input = $inputs.eq(i);
            let data = {
                type: $input.data("arg"),
                rawValue: $input.val(),
                parsedValue: $input.val().trim(),
                $input: $input
            };
            argsMap.set($input.data('arg'), data);
        }

        this._parseColumns(argsMap, true);
        this._parseRows(argsMap);

        for (let [_key, arg] of argsMap) {
            let validations: any[] = this._getValidations(arg);
            validations.forEach((obj) => {
                obj.$ele = arg.$input
            });
            if (!xcHelper.validate(validations)) {
                return null;
            }
        }

        const finalArgs = new Map();
        argsMap.forEach((value, key) => {
            if (key === "columns") {
                finalArgs.set(key, {
                    value: value.parsedValue,
                    columns: value.columns
                });
            } else {
                finalArgs.set(key, value.parsedValue);
            }
        });
        return finalArgs;
    }

    private _parseColumns(argsMap, replacePrefix?: boolean) {
        let columns = [];
        const replacement = "<X4GHSef8gF>";
        let originalCols = argsMap.get("columns").parsedValue;
        if (replacePrefix) {
            originalCols = GeneralOpPanelModel.replaceColPrefixes(argsMap.get("columns").parsedValue, replacement)
        }
        const res = XDParser.XEvalParser.parseEvalStr("a(" + originalCols + ")");
        if (!res.error) {
            let colSet = new Set();
            replace(res);
            (res.args as any).forEach((arg: ParsedEvalArg) => {
                if (arg.type === "fn") {
                    columns.push(DagNodeInput.stringifyEval(arg));
                } else {
                    columns.push(arg.value);
                }
            });
            argsMap.get("columns").columns = [...colSet];

            function replace(evalStruct) {
                evalStruct.args.forEach((arg: ParsedEvalArg) => {
                    if (arg.type === "paramArg" && arg.value.startsWith(replacement)) {
                        arg.value = arg.value.slice(replacement.length);
                        arg.type = "columnArg";
                        colSet.add(arg.value);
                    } else if (arg.type === "columnArg" && arg.value !== "null") {
                        arg.value = '"' + arg.value + '"';
                        colSet.add(arg.value);
                    } else if (arg.type === "fn") {
                        replace(arg);
                    }
                });
            }
        } else {
            argsMap.get("columns").parsedValue = argsMap.get("columns").parsedValue.split(",");
            argsMap.get("columns").parsedValue.forEach((val) => {
                val = val.trim();
                if (val) {
                    columns.push(val);
                }
            });
            argsMap.get("columns").columns = columns;
        }

        argsMap.get("columns").parsedValue = columns;
    }

    private _parseRows(argsMap) {
        argsMap.get("rows").parsedValue = parseInt(argsMap.get("rows").parsedValue);
    }

    private _clear() {
        const $form = this._getForm();
        $form.find(".checkbox.checked").closest(".checkboxSection").click();
        $form.find(".arg").each((i, el) => {
            $(el).val("");
        });
        $form.find(".arg[data-arg='rows']").val(100);
    }

    private _submit() {
        const $form = this._getForm();
        const fnTab = UDFTabManager.Instance.getActiveTab();
        if (fnTab.isNew) {
            StatusBox.show("The module needs to be saved before executing a test.", $("#udfSection .saveFile"), false, {
                offsetX: -12
            });
            return;
        }
        const argsMap = this._validate();
        if (!argsMap) return;
        const sqlString =  `SELECT * FROM \`${argsMap.get("table")}\` LIMIT ${argsMap.get("rows")}`;
        const cleanTableName = xcHelper.checkNamePattern(PatternCategory.SQLIdentifier, PatternAction.Fix,argsMap.get("table"), "_");
        const sqlNode: DagNodeSQL = DagNodeFactory.create({
            type: DagNodeType.SQL,
            input: {
                sqlQueryStr: sqlString,
                dropAsYouGo: true,
                mapping: [{
                    identifier: cleanTableName,
                    source: null
                }],
                outputTableName: "ScalarFnTest"
            },
            configured: true
        }) as DagNodeSQL;

        const mapNode: DagNodeMap = DagNodeFactory.create({
            type: DagNodeType.Map,
            input: {
                eval: [{
                    evalString: `${fnTab.name}:${ argsMap.get("function")}(${argsMap.get("columns").value.join(", ")})`,
                    newField: this._newField
                }],
                icv: false,
                outputTableName: "ScalarFnTest"
            },
            configured: true
        }) as DagNodeMap;

        const dagTab = DagTabScalarFnExecute.test(sqlNode, mapNode);
        $form.find(".submit").addClass('xc-disabled');
        this._configureSQL(sqlNode, sqlString, cleanTableName)
        .then(() => {
            this._reorderColumns(mapNode);
            const dagView = DagViewManager.Instance.getDagViewById(dagTab.getId());
            return dagView.run([mapNode.getId()], false, false, true)
        })
        .then(() => {
            if (mapNode.hasUDFError()) {
                DagUDFErrorModal.Instance.show(mapNode.getId());
            }

            return DagViewManager.Instance.viewResult(mapNode, dagTab.getId())
        })
        .then(() => {
            TblManager.highlightColumn($("#sqlTableArea .xcTable th.col1"));
        })
        .fail((e) => {
            Alert.error("Custom Function failed", e);
        })
        .always(() => {
            $form.find(".submit").removeClass('xc-disabled');
        });
    }

    private _configureSQL(sqlNode, sqlString, tableName) {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const queryId = xcHelper.randName("sqlQuery", 8);
        const sourceMapping = [{
            identifier: tableName,
            source: null
        }];
        const identifiers = new Map();
        identifiers.set(1, tableName);
        const options = {
            identifiers: identifiers,
            dropAsYouGo: true,
            sourceMapping: sourceMapping
        };

        sqlNode.compileSQL(sqlString, queryId, options)
        .then(() => {
            sqlNode.setIdentifiers(identifiers);
            sqlNode.setParam({
                sqlQueryStr: sqlString,
                dropAsYouGo: true,
                mapping: sourceMapping
            }, true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _hideColumns(columns, mapNode) {
        columns =[...columns, this._newField];
        const colsToHide = mapNode.getLineage().getColumns().filter((progCol) => {
            return !columns.includes(progCol.getBackColName());
        });
        const colNamesToHide = colsToHide.map(p=>p.getBackColName());
        const colTypesToHide = colsToHide.map(p=>({type: p.getType()}));
        mapNode.columnChange(DagColumnChangeType.Hide, colNamesToHide, colTypesToHide);
    }

    private _reorderColumns(mapNode) {
       const columns = mapNode.getLineage().getColumns().map(c => c.getBackColName());
       if (!columns.length) return;
       const col = columns.pop();
       columns.unshift(col);
       mapNode.columnChange(DagColumnChangeType.Reorder, columns);
    }
}