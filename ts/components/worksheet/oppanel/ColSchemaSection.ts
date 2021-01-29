class ColSchemaSection { 
    private _$section: JQuery;
    private _initialSchema: ColSchema[];
    private _hintSchema: ColSchema[];
    private _validTypes: ColumnType[];
    private _callback: Function;
    private _options: {
        hasMapping: boolean, // extra "mapping" column next to name and type
        canAdd: boolean // show/hide "add column" button
    } = {
        hasMapping: false,
        canAdd: true
    };

    public constructor($section: JQuery) {
        this._$section = $section;
        this._hintSchema = null;
        this._validTypes = [ColumnType.boolean, ColumnType.float, ColumnType.integer,
        ColumnType.string, ColumnType.timestamp, ColumnType.money, ColumnType.mixed, ColumnType.unknown];
        this._addEventListeners();
    }

    public setInitialSchema(schema: ColSchema[]): void {
        this._initialSchema = schema;
    }

    public setHintSchema(schema: ColSchema[]): void {
        this._hintSchema = schema;
    }

    public setValidTypes(types: ColumnType[]): void {
        this._validTypes = types;
    }

    public render(schema: ColSchema[], options?: {
        hasMapping?: boolean,
        canAdd?: boolean
    }, callback?: Function): void {
        this.clear();
        this._callback = callback;
        const { hasMapping = false, canAdd = true } = options || {};
        this._options = {
            hasMapping: hasMapping,
            canAdd: canAdd
        };
        if (schema && schema.length > 0) {
            this._addList(schema);
        }
        this._showAddColumn();
        if (this._callback) {
            this._callback(this.getSchema(true));
        }
    }

    public clear(): void {
        this._addNoSchemaHint();
        if (this._callback) {
            this._callback(this.getSchema(true));
        }
    }

    public getSchema(ignore: boolean): ColSchema[] {
        const schema: ColSchema[] = [];
        const $contentSection: JQuery = this._getContentSection();
        let valid: boolean = true;
        $contentSection.find(".part").each((_index, el) => {
            const $part: JQuery = $(el);
            const $name: JQuery = $part.find(".name input");
            const name: string = $name.val().trim();
            if (!ignore && !name) {
                StatusBox.show(ErrTStr.NoEmpty, $name);
                valid = false;
                return false; // stop loop
            }
            const $type: JQuery = $part.find(".type .text");
            const colType: ColumnType = <ColumnType>$type.text();
            if (!ignore && !colType) {
                StatusBox.show(ErrTStr.NoEmpty, $type);
                valid = false;
                return false; // stop loop
            }
            let obj = {
                name: name,
                type: colType
            }
            if (this._options.hasMapping) {
                const $mapping: JQuery = $part.find(".mapping input");
                const mapping = $mapping.val().trim();
                if (!ignore && !mapping) {
                    StatusBox.show(ErrTStr.NoEmpty, $mapping);
                    valid = false;
                    return false; // stop loop
                }
                obj["mapping"] = mapping;
            }

            schema.push(obj);
        });
        if (!ignore && valid && schema.length === 0) {
            valid = false;
            StatusBox.show(ErrTStr.NoEmptySchema, $contentSection);
        }
        return valid ? schema : null;
    }

    private _getContentSection(): JQuery {
        return this._$section.find(".listSection .content");
    }

    private _showAddColumn(): void {
        const { canAdd } = this._options;
        const $addColumn = this._$section.find(".listSection .addColumn");

        if (canAdd) {
            $addColumn.removeClass('xc-unavailable');
            xcTooltip.remove($addColumn.find(".text"));
        } else {
            $addColumn.addClass('xc-unavailable');
            xcTooltip.add($addColumn.find(".text"), {
                title: "Columns cannot be added to CSV schemas."
            });
        }
    }

    private _addNoSchemaHint(): void {
        const html: HTML =
            '<div class="hint">' +
                OpPanelTStr.DFLinkInNoSchema +
            '</div>';
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.html(html);
    }

    private _addList(schema: ColSchema[], $rowToReplace?: JQuery): void {
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".hint").remove();
        const dropdownList: HTML =
        '<div class="list">' +
            '<ul></ul>' +
            '<div class="scrollArea top">' +
                '<i class="arrow icon xi-arrow-up"></i>' +
            '</div>' +
            '<div class="scrollArea bottom">' +
                '<i class="arrow icon xi-arrow-down"></i>' +
            '</div>' +
        '</div>';
        const fixedSchemaMap: {[key: string]: ColumnType} = {};
        const initialSchema: ColSchema[] = this._initialSchema || [];
        initialSchema.forEach((colInfo) => {
            fixedSchemaMap[colInfo.name] = colInfo.type;
        });

        const { hasMapping } = this._options;
        if (hasMapping) {
            this._$section.addClass("hasMapping");
            if (!this._$section.find(".title .mapping").length) {
                this._$section.find(".title .part .name").after('<div class="mapping">Mapping</div>');
            }
        } else {
            this._$section.removeClass("hasMapping");
            this._$section.find(".title .mapping").remove();
        }

        const list: JQuery[] = schema.map((col) => {
            let name: string =  col.name || "";
            let type: string = col.type || "";
            let typeDropdownPart: HTML = "";
            if (fixedSchemaMap[name]) {
                type = fixedSchemaMap[name];
            } else {
                typeDropdownPart =
                    '<div class="iconWrapper">' +
                        '<i class="icon xi-arrow-down"></i>' +
                    '</div>' +
                    dropdownList;
            }
            let mappingInput = "";
            if (hasMapping) {
                const mapping = xcStringHelper.escapeDblQuoteForHTML(col.mapping || "");
                mappingInput += '<div class="mapping"><input value="' + mapping + '" spellcheck="false" /></div>';
            }
            const row: HTML =
            '<div class="part">' +
                '<div class="name dropDownList">' +
                    '<i class="remove icon xi-close-no-circle xc-action fa-8"></i>' +
                    '<input value="' + name + '" spellcheck="false">' +
                    dropdownList +
                '</div>' +
                mappingInput +
                '<div class="type dropDownList">' +
                    '<div class="text">' + type + '</div>' +
                    typeDropdownPart +
                '</div>' +
            '</div>';
            return $(row);
        });

        list.forEach(($row) => {
            this._addHintDropdown($row.find(".name.dropDownList"));
            this._addTypeDropdown($row.find(".type.dropDownList"));
            if ($rowToReplace != null) {
                $rowToReplace.after($row);
            } else {
                $contentSection.append($row);
            }
        });

        if ($rowToReplace != null) {
            $rowToReplace.remove();
        }
        if (this._callback) {
            this._callback(this.getSchema(true));
        }
    }

    private _removeList($row: JQuery): void {
        $row.remove();
        if (this._$section.find(".part").length === 0) {
            this._addNoSchemaHint();
        }
        if (this._callback) {
            this._callback(this.getSchema(true));
        }
    }

    private _selectList($row: JQuery, schema: ColSchema): void {
        const index: number = $row.index();
        let $rowWithSameName: JQuery = null;
        const $contentSection: JQuery = this._getContentSection();
        $contentSection.find(".part").each((i, el) => {
            const $currentRow = $(el);
            if (index !== i &&
                $currentRow.find(".name input").val() === schema.name
            ) {
                $rowWithSameName = $currentRow;
                return false; // stop loop
            }
        })
        if ($rowWithSameName != null) {
            schema.type = schema.type || <ColumnType>$rowWithSameName.find(".type").text();
            this._addList([{name: "", type: null}], $rowWithSameName);
        }
        this._addList([schema], $row);
    }

    private _getSelector(): string {
        const $panel: JQuery = this._$section.closest(".opPanel");
        const selector: string = `#${$panel.attr("id")}`;
        return selector;
    }

    private _addHintDropdown($dropdown: JQuery): void {
        const selector: string = this._getSelector();
        const hintDropdown = new MenuHelper($dropdown, {
            onOpen: ($curDropdown) => {
                this._populateHintDropdown($curDropdown);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    let type = $li.data("type");
                    if (this._options.hasMapping) {
                        type = DfFieldTypeTStr[xcHelper.convertColTypeToFieldType(type)];
                    }
                    const schema: ColSchema = {
                        name: $li.text(),
                        type: type
                    };
                    if (this._options.hasMapping) {
                        let mapping = $li.data("mapping");
                        schema["mapping"] = mapping;
                    }
                    this._selectList($li.closest(".part"), schema);
                    xcTooltip.hideAll();
                }
            },
            container: selector,
            bounds: selector,
            bottomPadding: 2,
            fixedPosition: {
                selector: "input"
            }
        }).setupListeners();

        // colName hint dropdown
        let hintTimer: number;
        $dropdown.on("input", "input", (event) => {
            const $input: JQuery = $(event.currentTarget);
            if (!$input.is(":visible")) return; // ENG-8642
            clearTimeout(hintTimer);
            hintTimer = window.setTimeout(() => {
                this._populateHintDropdown($dropdown, $input.val().trim());
                hintDropdown.openList();
            }, 200);
        });
    }

    private _populateHintDropdown(
        $dropdown: JQuery,
        keyword: string = ""
    ): void {
        let html: HTML = "";
        let schemaMap: {[key: string]: ColSchema} = {};
        let cacheSchema = (colInfo) => {
            const colName: string = colInfo.name;
            if (colName && colName.includes(keyword)) {
                schemaMap[colName] = colInfo;
            }
        };
        const index: number = $dropdown.closest(".part").index();
        let currentSchema: ColSchema[] = this.getSchema(true);
        currentSchema.splice(index, 1); // remove the current row
        currentSchema.forEach(cacheSchema);

        const hintSchema: ColSchema[] = this._hintSchema || this._initialSchema || [];
        hintSchema.forEach(cacheSchema);

        const schema = [];
        for (let name in schemaMap) {
            schema.push(schemaMap[name]);
        }

        // sort by name
        schema.sort((a, b) => {
            let aName = a.name.toLowerCase();
            let bName = b.name.toLowerCase();
            return (aName < bName ? -1 : (aName > bName ? 1 : 0));
        });

        schema.forEach((colInfo) => {
            const colName = colInfo.name;
            let type = colInfo.type;
            let mapping = "";
            if (this._options.hasMapping) {
                type = xcHelper.convertFieldTypeToColType(DfFieldTypeTFromStr[type]);
                mapping = xcStringHelper.escapeDblQuoteForHTML(colInfo.mapping);
            }
            html +=
            '<li data-type="' + type + '" data-mapping="' + mapping + '">' +
                BaseOpPanel.craeteColumnListHTML(type, colName) +
            '</li>';
        });

        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $dropdown.find("ul").html(html);
    }

    private _addTypeDropdown($dropdown: JQuery) {
        const selector: string = this._getSelector();
        new MenuHelper($dropdown, {
            onOpen: ($curDropdown) => {
                this._populateTypeDropdown($curDropdown);
            },
            onSelect: ($li) => {
                const $text: JQuery = $li.closest(".dropDownList").find(".text");
                $text.text($li.text());
                if (this._callback) {
                    this._callback(this.getSchema(true));
                }
            },
            container: selector,
            bounds: selector,
            bottomPadding: 2,
            fixedPosition: {
                selector: ".text",
                rightMargin: 26
            }
        }).setupListeners();
    }

    private _populateTypeDropdown($dropdown: JQuery): void {
        const html: HTML = this._validTypes.map((colType) => {
            let icon;
            if (this._options.hasMapping) {
                icon = xcUIHelper.getColTypeIcon(DfFieldTypeTFromStr[colType]);
            } else {
                icon = xcUIHelper.getTypeIconFromColumnType(colType);
            }
            let li: HTML =
                '<li>' +
                    '<i class="icon ' + icon + '"></i>' +
                    '<span class="name">' + colType + '</span>' +
                '</li>';
            return li;
        }).join("");
        $dropdown.find("ul").html(html);
    }

    private _addEventListeners(): void {
        const $section: JQuery = this._$section;
        $section.on("click", ".clear", () => {
            this.clear();
        });

        $section.on("click", ".addColumn", () => {
            if ($section.find(".addColumn").hasClass("xc-unavailable")) {
                return;
            }
            this._addList([{name: "", type: null}]);
        });

        $section.on("click", ".part .remove", (event) => {
            this._removeList($(event.currentTarget).closest(".part"));
        });

        $section.on("change", ".part .name input", (event) => {
            const $nameInput: JQuery = $(event.target);
            if (this._callback) {
                this._callback(this.getSchema(true));
            }
            if ($nameInput.siblings(".list").is(":visible")) {
                return;
            }
            const $part: JQuery = $nameInput.closest(".part");
            let type = $part.find(".type .text").text();
            const schema: ColSchema = {
                name: $nameInput.val().trim(),
                type: <ColumnType>type
            }
            this._selectList($part, schema);
        });

        $section.on("change", ".part .mapping input", (event) => {
            if (this._callback) {
                this._callback(this.getSchema(true));
            }
        });
    }
}