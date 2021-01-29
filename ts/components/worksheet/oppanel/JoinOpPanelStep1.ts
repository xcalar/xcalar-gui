class JoinOpPanelStep1 {
    private _templateMgr = new OpPanelTemplateManager();
    private _componentFactory: OpPanelComponentFactory;
    private _setColumnPickerTarget: (
        target: HTMLElement, setData: (colName: string) => void
    ) => void;
    private _$elem: JQuery = null;
    private _onDataChange = () => {};
    private static readonly _templateIdClasue = 'templateClause';
    private static readonly _templateIdCast = 'templateCast';
    private _$elemInstr: JQuery = null;
    private _$elemPreview: JQuery = null;
    private _componentJoinTypeDropdown: OpPanelDropdown = null;
    private _modelRef: JoinOpPanelModel = null;
    private _opSectionSelector = "#joinOpPanel .opSection";

    public static readonly joinTypeMenuItems: OpPanelDropdownMenuItem[] = [
        { text: JoinTStr.joinTypeInner, tip: JoinTStr.joinTypeInnerTip, value: JoinOperatorTStr[JoinOperatorT.InnerJoin] },
        { text: JoinTStr.joinTypeLeft, tip: JoinTStr.joinTypeLeftTip, value: JoinOperatorTStr[JoinOperatorT.LeftOuterJoin] },
        { text: JoinTStr.joinTypeRight, tip: JoinTStr.joinTypeRightTip, value: JoinOperatorTStr[JoinOperatorT.RightOuterJoin] },
        { text: JoinTStr.joinTypeFull, tip: JoinTStr.joinTypeFullTip, value: JoinOperatorTStr[JoinOperatorT.FullOuterJoin] },
        { text: JoinTStr.joinTypeSepAdv, cssClass: ['sectionLabel'], isNotMenuItem: true },
        { text: JoinTStr.joinTypeLeftSemi, tip: JoinTStr.joinTypeLeftSemiTip, value: JoinOperatorTStr[JoinOperatorT.LeftSemiJoin], cssClass: ['advanced'] },
        { text: JoinTStr.joinTypeLeftAnti, tip: JoinTStr.joinTypeLeftAntiTip, value: JoinOperatorTStr[JoinOperatorT.LeftAntiJoin], cssClass: ['advanced'] },
        { text: JoinTStr.joinTypeCross, tip: JoinTStr.joinTypeCrossTip, value: JoinOperatorTStr[JoinOperatorT.CrossJoin], cssClass: ['advanced'] },
    ];
    public constructor(props: {
        container: JQuery
    }) {
        const { container } = props;
        this._$elem = BaseOpPanel.findXCElement(container, 'joinFirstStep');
        this._$elemInstr = BaseOpPanel.findXCElement(this._$elem, 'colInstruction');
        this._$elemPreview = BaseOpPanel.findXCElement(this._$elem, 'joinPreview');
        this._componentJoinTypeDropdown = new OpPanelDropdown({
            container: BaseOpPanel.findXCElement(this._$elem, 'joinType'),
            boundingSelector: this. _opSectionSelector,
            inputXcId: 'text',
            ulXcId: 'menuItems',
            isForceUpdate: false,
            isDelayInit: false, // Not inside of a template, so can not do lazy init
            setTitleFunc: ($elemTitle, text) => { $elemTitle.text(text); }
        });
        this._templateMgr.loadTemplate(JoinOpPanelStep1._templateIdClasue, this._$elem);
        this._templateMgr.loadTemplate(JoinOpPanelStep1._templateIdCast, this._$elem);
        this._componentFactory = new OpPanelComponentFactory(this._opSectionSelector);
    }

    public updateUI(props: {
        modelRef: JoinOpPanelModel,
        onDataChange: () => void,
        setColumnPickerTarget: (
            target: HTMLElement, setData: (colName: string) => void
        ) => void
    }): void {
        const { modelRef, onDataChange, setColumnPickerTarget } = props;
        this._modelRef = modelRef;
        this._onDataChange = onDataChange;
        this._setColumnPickerTarget = setColumnPickerTarget;
        this._updateUI();
    }

    protected _updateUI(): void {
        const joinType = this._modelRef.getJoinType();
        if (this._modelRef.getCurrentStep() !== 1 || this._modelRef.isAdvMode()) {
            this._$elem.hide();
            return;
        }
        this._$elem.show();
        // Setup join type dropdown
        let defaultDropdownText = '';
        const joinTypeMenuItems = JoinOpPanelStep1.joinTypeMenuItems.map((item) => {
            if (item.value === joinType) {
                defaultDropdownText = item.text;
            }
            const menuInfo: OpPanelDropdownMenuItem = {
                text: item.text,
                value: item.value,
                tip: item.tip,
                isNotMenuItem: item.isNotMenuItem,
                isSelected: (item.value === joinType),
                cssClass: (item.cssClass != null) ? [].concat(item.cssClass) : []
            };
            return menuInfo;
        });
        this._componentJoinTypeDropdown.updateUI({
            menuItems: joinTypeMenuItems,
            onSelectCallback: (typeId: string) => {
                this._changeJoinType(typeId);
                this._onDataChange();
            },
            isDisabled: this._modelRef.isFixedType(),
            defaultText: defaultDropdownText
        });
        // Setup instruction section
        let text = JoinTStr.DagColSelectInstr;
        if (this._modelRef.isCrossJoin()) {
            text = JoinTStr.DagColSelectInstrCross;
        }
        xcTooltip.add(this._$elemInstr, {
            title: text
        });
        // Setup join options section
        this._updateJoinOptionsSection();
        // Setup main section
        const $elemClauseArea = BaseOpPanel.findXCElement(this._$elem, 'clauseArea');
        $elemClauseArea.hide();
        if (!this._modelRef.isValidEvalString()) {
            // TODO: Show error message
        }
        // JoinOn columns
        if (!this._modelRef.isCrossJoin())
        {
            $elemClauseArea.show();
            // $elemCrossJoinFilter.hide();
            // Setup clause section
            this._updateJoinClauseUI();
        }
        // Add clause button
        const $elemAddClause = BaseOpPanel.findXCElement(this._$elem, 'addClauseBtn');
        $elemAddClause.off();
        if (this._isEnableAddClause()) {
            $elemAddClause.on('click', (e) => {
                $(e.currentTarget).blur();
                this._addColumnPair();
                this._onDataChange();
            });
            $elemAddClause.removeClass('btn-disabled');
        } else {
            if (!$elemAddClause.hasClass('btn-disabled')) {
                $elemAddClause.addClass('btn-disabled');
            }
        }
        // Command Preview section
        this._updatePreview();
    }

    private _updateJoinOptionsSection() {
        const $advancedSection = BaseOpPanel.findXCElement(this._$elem, 'advancedSection');

        // Update nullSafe option UI
        const $nullSafeOption = BaseOpPanel.findXCElement($advancedSection, 'nullSafeOption');
        const $nullSafeCheckbox = BaseOpPanel.findXCElement($nullSafeOption, 'nullSafeCheckbox');
        toggleCheckbox($nullSafeCheckbox, this._modelRef.isNullSafe());

        // Register events
        // Toggle options
        BaseOpPanel.findXCElement($advancedSection, 'toggleIcons').off().on('click', () => {
            if ($advancedSection.hasClass('collapsed')) {
                $advancedSection.removeClass('collapsed');
                $advancedSection.addClass('expanded');
            } else {
                $advancedSection.removeClass('expanded');
                $advancedSection.addClass('collapsed');
            }
        });
        // nullSafe checkbox
        BaseOpPanel.findXCElement($advancedSection, 'nullSafeOption').off().on('click', () => {
            const isNullSafe =  this._modelRef.isNullSafe();
            this._modelRef.setNullSafe(!isNullSafe);
            toggleCheckbox($nullSafeCheckbox, !isNullSafe);
        });

        function toggleCheckbox($checkbox, isChecked) {
            if (isChecked) {
                if (!$checkbox.hasClass('checked')) {
                    $checkbox.addClass('checked');
                }
            } else {
                $checkbox.removeClass('checked');
            }
        }
    }

    private _updatePreview() {
        const htmlJoinType = `<span class="joinType keyword">${this._getJoinTypeText(this._modelRef.getJoinType())}</span>`;
        const htmlTables = ' <span class="highlighted">table1</span>,<span class="highlighted">table2</span>';

        let html = `${htmlJoinType}${htmlTables}`;
        if (!this._modelRef.isCrossJoin()) {
            const emptyColumn = '""';
            const htmlOn = '<br/><span class="keyword">ON </span>';
            const htmlClause = this._modelRef.getColumnPairs().reduce( (res, pair, i) => {
                const col1 = xcStringHelper.escapeHTMLSpecialChar(
                    pair.leftName.length == 0
                        ? emptyColumn
                        : pair.leftName
                );
                const col2 = xcStringHelper.escapeHTMLSpecialChar(
                    pair.rightName.length == 0
                        ? emptyColumn
                        : pair.rightName
                );
                const pre = (i > 0) ? '<span class="keyword"><br/>AND </span>' : '';
                const cols = `<span class="highlighted">${col1}</span> =
                    <span class="highlighted">${col2}</span>`;
                return `${res}${pre}${cols}`;
            }, '');
            html = `${html}${htmlOn}${htmlClause}`;
        }
        const filterEval = this._modelRef.getEvalString();
        if (filterEval.length !== 0) {
            const htmlWhere = '<br/><span class="keyword">WHERE </span>';
            const htmlFilter = `<span class="highlighted">${xcStringHelper.escapeHTMLSpecialChar(filterEval)}</span>`;
            html = `${html}${htmlWhere}${htmlFilter}`;
        }

        this._$elemPreview.html(html);
    }

    private _updateJoinClauseUI() {
        let numErrorShown = 1;
        const columnPairs = this._modelRef.getColumnPairs();
        const nodeList = [];
        for (let i = 0; i < columnPairs.length; i++) {
            const columnPair = columnPairs[i];
            const { leftName, leftCast, rightName, rightCast } = columnPair;

            // Column dropdowns
            const {
                left: leftColsToShow, leftType: leftTypesToShow,
                right: rightColsToShow, rightType: rightTypesToShow
            } = this._getColumnsToShow(i);
            const {
                left: leftTableName,
                right: rightTableName
            } = this._modelRef.getPreviewTableNames();
            const elemLeftColumnDropdown = this._createColumnHintDropdown({
                colNames: leftColsToShow,
                colTypes: leftTypesToShow,
                colSelected: leftName,
                pairIndex: i,
                isLeft: true,
                smartSuggestParam: {
                    srcColumnName: rightName,
                    srcTableName: rightTableName,
                    suggestTableName: leftTableName
                }
            });
            const elemRightColumnDropdown = this._createColumnHintDropdown({
                colNames: rightColsToShow,
                colTypes: rightTypesToShow,
                colSelected: rightName,
                pairIndex: i,
                isLeft: false,
                smartSuggestParam: {
                    srcColumnName: leftName,
                    srcTableName: leftTableName,
                    suggestTableName: rightTableName
                }
            });

            // Clause section
            const isLeftDetached = this._modelRef.isColumnDetached(leftName, true);
            const isRightDetached = this._modelRef.isColumnDetached(rightName, false);
            const isShowError = !this._isCompatiableColumnType(leftCast, rightCast)
                && (numErrorShown-- > 0);

            const clauseSection = this._templateMgr.createElements(JoinOpPanelStep1._templateIdClasue, {
                'onDelClick': columnPairs.length > 1
                    ? () => {
                        this._removeColumnPair(i);
                        this._onDataChange();
                    }
                    : () => {},
                'delCss': columnPairs.length > 1 ? '' : 'removeIcon-nodel',
                'leftColErrCss': (isLeftDetached ? 'dropdown-detach' : ''),
                'rightColErrCss': (isRightDetached ? 'dropdown-detach' : ''),
                'APP-LEFTCOLUMNS': elemLeftColumnDropdown,
                'APP-RIGHTCOLUMNS': elemRightColumnDropdown,
                'APP-ERRMSG': isShowError
                    ? this._componentFactory.createErrorMessage({
                        msgText: JoinTStr.TypeMistch
                    }) : null
            });
            if (clauseSection == null || clauseSection.length > 1) {
                // This should never happend. Possibly caused by invalid template.
                console.error('JoinOpPanelStep1.updateUI: template error');
                continue;
            }
            const $clauseSection = $(clauseSection[0]);
            // Type cast row
            if (this._modelRef.isCastNeed(columnPair)) {
                const $castContainer = BaseOpPanel.findXCElement($clauseSection, 'castRow');
                const castMsg = this._createCastMessage({
                    type1: leftCast,
                    type2: rightCast
                })
                const castRow = this._templateMgr.createElements(
                    JoinOpPanelStep1._templateIdCast,
                    { 'APP-ERRORMSG': castMsg }
                );
                for (const row of castRow) {
                    $castContainer.append(<HTMLElement>row);
                }
                // Left column type dropdown
                this._createTypeCastDropdown({
                    container: $castContainer,
                    dropdownId: 'leftCastDropdown',
                    typeValues: BaseOpPanel.getBasicColTypes(false).map((type) => type),
                    typeSelected: leftCast,
                    pairIndex: i,
                    isLeft: true,
                });
                // Right column type dropdown
                this._createTypeCastDropdown({
                    container: $castContainer,
                    dropdownId: 'rightCastDropdown',
                    typeValues: BaseOpPanel.getBasicColTypes(false).map((type) => type),
                    typeSelected: rightCast,
                    pairIndex: i,
                    isLeft: false,
                });
            }
            clauseSection.forEach((elem) => {
                nodeList.push(elem);
            });
        }
        const $clauseContainer = BaseOpPanel.findXCElement(this._$elem, 'clauseContainer');
        this._templateMgr.updateDOM(<any>$clauseContainer[0], nodeList);
    }

    private _getJoinTypeText(type: string) {
        switch(type) {
            case JoinOperatorTStr[JoinOperatorT.InnerJoin]:
                return JoinTStr.joinTypeInner;
            case JoinOperatorTStr[JoinOperatorT.LeftOuterJoin]:
                return JoinTStr.joinTypeLeft;
            case JoinOperatorTStr[JoinOperatorT.RightOuterJoin]:
                return JoinTStr.joinTypeRight;
            case JoinOperatorTStr[JoinOperatorT.LeftSemiJoin]:
                return JoinTStr.joinTypeLeftSemi;
            case JoinOperatorTStr[JoinOperatorT.LeftAntiJoin]:
                return JoinTStr.joinTypeLeftAnti;
            case JoinOperatorTStr[JoinOperatorT.CrossJoin]:
                return JoinTStr.joinTypeCross;
            default:
                return '';
        }
    }

    private _createTypeCastDropdown(props: {
        container: JQuery;
        dropdownId: string;
        typeValues: ColumnType[];
        typeSelected: ColumnType;
        pairIndex: number;
        isLeft: boolean;
    }): OpPanelDropdown {
        const { container, dropdownId, typeValues, typeSelected, pairIndex, isLeft } = props;
        const $elemDropdown = BaseOpPanel.findXCElement(container, dropdownId);
        const menuItems: OpPanelDropdownMenuItem[] = typeValues.map((type) => {
            const menuItem: OpPanelDropdownMenuItem = {
                text: type as string,
                value: { pairIndex: pairIndex, type: type },
                isSelected: (typeSelected === type)
            };
            return menuItem;
        });
        const componentDropdown = new OpPanelDropdown({
            container: $elemDropdown,
            boundingSelector: this. _opSectionSelector,
            inputXcId: 'menuInput',
            ulXcId: 'menuItems',
            setTitleFunc: ($elem, text) => { $elem.text(text); }
        });
        componentDropdown.updateUI({
            menuItems: menuItems,
            onSelectCallback: ({ pairIndex, type }) => {
                this._modifyColumnType(isLeft, pairIndex, type);
                this._onDataChange();
            }
        });
        return componentDropdown;
    }

    private _createCastMessage(props: {
        type1: string, type2: string
    }) {
        const { type1, type2 } = props;
        const content = xcStringHelper.replaceMsg(
            JoinTStr.MismatchDetail,
            { type1: `<span class="semibold">${type1}</span>`, type2: `<span class="semibold">${type2}</span>` }
        );
        const $element = BaseOpPanel.createElementFromString(`<span>${content}</span>`);
        return $element[0];
    }

    private _createColumnHintDropdown(props: {
        colNames: string[],
        colTypes: ColumnType[],
        colSelected: string,
        pairIndex: number,
        isLeft: boolean,
        smartSuggestParam: {
            srcColumnName: string, srcTableName: string, suggestTableName: string
        }
    }): HTMLElement[] {
        const {
            colNames, colSelected, pairIndex, isLeft,
            smartSuggestParam, colTypes
        } = props;
        const { srcColumnName, srcTableName, suggestTableName } = smartSuggestParam;
        const colNameSet: Set<string> = new Set(colNames);

        // Columns
        const menuItems = colNames.map((colName, i) => ({
            colName: colName,
            colType: colTypes[i] || ColumnType.unknown
        }));
        // Smart suggestion
        const smartSuggestText = 'Smart Suggest';
        if ( srcColumnName != null && srcColumnName.length > 0
            && srcTableName != null && srcTableName.length > 0
            && suggestTableName != null && suggestTableName.length > 0
            && this._isTalbeExist(srcTableName) && this._isTalbeExist(suggestTableName)
        ) {
            menuItems.unshift({
                colName: smartSuggestText,
                colType: null
            });
        }

        const compProps: HintDropdownProps = {
            type: '', name: '',
            inputVal: colSelected, placeholder: '',
            menuList: menuItems,
            onDataChange: (newName) => {
                if (newName === smartSuggestText) {
                    const suggestInput = this._getSmartSuggestInput({
                        srcColumnName: srcColumnName,
                        srcTableName: srcTableName,
                        suggestTableName: suggestTableName,
                        candidateColumnNames: colNames
                    });
                    if (suggestInput != null) {
                        const suggestion = xcSuggest.suggestJoinKey(suggestInput);
                        if (suggestion != null && suggestion.colToSugg != null) {
                            this._modifyColumnPair(isLeft, pairIndex, suggestion.colToSugg);
                        }
                    }
                    this._onDataChange();
                } else if (newName !== colSelected) {
                    this._modifyColumnPair(isLeft, pairIndex, newName);
                    this._onDataChange();
                }
            },
            onFocus: (elem) => {
                this._setColumnPickerTarget(elem, (colName) => {
                    if (!colNameSet.has(colName)) {
                        return;
                    }
                    this._modifyColumnPair(isLeft, pairIndex, colName);
                    this._onDataChange();
                });
            }
        };
        return this._componentFactory.createHintDropdown(compProps);
    }

    private _isEnableAddClause(): boolean {
        const joinClauseLen = this._modelRef.getColumnPairs().length;

        const leftColLen = this._modelRef.getColumnMetaLeft().length;
        if (leftColLen > 0 && joinClauseLen >= leftColLen) {
            return false;
        }
        const rightColLen = this._modelRef.getColumnMetaRight().length;
        if (rightColLen > 0 && joinClauseLen >= rightColLen) {
            return false;
        }

        return true;
    }

    private _isTalbeExist(tableName: string) {
        return gTables[xcHelper.getTableId(tableName)] != null;
    }

    private _getSmartSuggestInput(props: {
        srcColumnName: string,
        srcTableName: string,
        suggestTableName: string,
        candidateColumnNames: string[]
    }): xcSuggest.ColInput {
        try {
            const {
                srcColumnName, srcTableName, suggestTableName, candidateColumnNames
            } = props;
            const candidateMap = {};
            for (const name of candidateColumnNames) {
                candidateMap[name] = true;
            }
            // Source info
            const srcTable = getTable(srcTableName);
            const srcInfo = getColumnInfo(srcTable, srcColumnName);
            // Suggest(Dest) Info
            const destInfo = [];
            const suggTable = getTable(suggestTableName);
            for (const col of suggTable.getAllCols()) {
                const colName = col.getBackColName();
                if (!col.isDATACol() && candidateMap[colName] != null) {
                    destInfo.push(getColumnInfo(suggTable, col.getBackColName()));
                }
            }

            return {
                srcColInfo: srcInfo,
                destColsInfo: destInfo
            };
        } catch {
            return null;
        }

        function getTable(tableName) {
            return gTables[xcHelper.getTableId(tableName)];
        }

        function getColumnInfo(table, columnName): xcSuggest.ColInfo {
            const colInfo = table.getColByBackName(columnName);
            const colId = table.getColNumByBackName(columnName);
            const colData = table.getColContents(colId);
            return {
                type: colInfo.getType(),
                length: colData.length,
                name: colInfo.getFrontColName(),
                data: colData,
                uniqueIdentifier: columnName,
                tableId: table.getId()
            };
        }
    }

    // Data model manipulation === start
    private _changeJoinType(typeId: string): void {
        this._modelRef.setJoinTypeAndRebuild(typeId);
    }
    private _removeColumnPair(pairIndex: number): void {
        this._modelRef.removeColumnPair(pairIndex);
        this._modelRef.updateRenameInfo();
        this._modelRef.updateSelectedColumnInfo();
    }
    private _modifyColumnPair(isLeft: boolean, pairIndex: number, colName: string): void {
        const pairInfo = {
            left: isLeft ? colName : null,
            right: isLeft ? null : colName
        };
        this._modelRef.modifyColumnPairName(pairIndex, pairInfo);
        this._modelRef.updateRenameInfo();
        this._modelRef.updateSelectedColumnInfo();
    }
    private _modifyColumnType(isLeft: boolean, pairIndex: number, type: ColumnType): void {
        const typeInfo = {
            left: isLeft ? type : null,
            right: isLeft ? null : type
        };
        this._modelRef.modifyColumnPairCast(pairIndex, typeInfo);
    }
    private _addColumnPair() {
        this._modelRef.addColumnPair();
        this._modelRef.updateRenameInfo();
        this._modelRef.updateSelectedColumnInfo();
    }

    private _getColumnsToShow(currentPairIndex: number) {
        const pairs = this._modelRef.getColumnPairs();
        pairs.splice(currentPairIndex, 1);
        const leftExclude = {};
        const rightExclude = {};
        for (const {leftName, rightName} of pairs) {
            leftExclude[leftName] = true;
            rightExclude[rightName] = true;
        }

        const leftCols: string[] = [];
        const leftTypes: ColumnType[] = [];
        for (const col of this._modelRef.getColumnMetaLeft()) {
            const name = col.name;
            if (!leftExclude[name]) {
                leftCols.push(name);
                leftTypes.push(col.type);
            }
        }
        const rightCols: string[] = [];
        const rightTypes: ColumnType[] = [];
        for (const col of this._modelRef.getColumnMetaRight()) {
            const name = col.name;
            if (!rightExclude[name]) {
                rightCols.push(name);
                rightTypes.push(col.type);
            }
        }

        return {
            left: leftCols, right: rightCols,
            leftType: leftTypes, rightType: rightTypes
        };
    }

    private _isCompatiableColumnType(
        colType1: ColumnType, colType2: ColumnType
    ): boolean {
        if (colType1 == null || colType1 === ColumnType.undefined) {
            return true;
        }
        if (colType2 == null || colType2 === ColumnType.undefined) {
            return true;
        }
        return colType1 === colType2;
    }
    // Data model manipulation === end
}