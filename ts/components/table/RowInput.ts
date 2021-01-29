class RowInput {
    private $rowInputSection: JQuery;
    private rowManager: RowManager;

    public constructor(rowManager: RowManager) {
        this.rowManager = rowManager;
    }

    /**
     * Clear Row Input
     */
    public clear(): void {
        if (this.$rowInputSection != null) {
            this.$rowInputSection.remove();
        }
    }

    /**
     * Render Row Input
     * @param $container
     */
    public render($container: JQuery): void {
        this.$rowInputSection = $(this._genHTML());
        this._addEventListerners();
        this._updateTotalRows();
        this.updateCurrentRowNum();
        $container.empty().append(this.$rowInputSection);
    }

    /**
     * Skip to a row
     * @param rowNum
     */
    public skipTo(rowNum: number): void {
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.val(rowNum);
        $rowInput.trigger(fakeEvent.enter, true);
    }

    /**
     * Update the row number
     */
    public updateCurrentRowNum(): void {
        const firstRowNum: number = this.rowManager.getFirstVisibleRowNum();
        if (firstRowNum !== null) {
            this._setRowNum(firstRowNum);
        }
    }

    public updateTotalRowsText(text: string): void {
        this.$rowInputSection.find(".totalRows").text(text);
    }

    private _updateTotalRows(): void {
        const totalRows: number = this.rowManager.getTotalRowNum();
        this.updateTotalRowsText(xcStringHelper.numToStr(totalRows));
        let inputWidth: number = 50;
        const numDigits: number = ("" + totalRows).length;
        inputWidth = Math.max(inputWidth, 10 + (numDigits * 8));
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.width(inputWidth);
        if (totalRows > Number($rowInput.attr('size'))) {
            $rowInput.attr({
                'maxLength': totalRows,
                'size': totalRows
            });
        }
    }

    // XXX TODO, remove the id numPages after sql test get fixed
    private _genHTML(): string {
        const html: string =
        `<label>${TblTStr.SkipToRow}</label>
        <input type="number" min="0"  step="1" spellcheck="false">
        <label id="numPages">of <span class="totalRows"></span></label>`;
        return html;
    }

    private _getRowInput(): JQuery {
        return this.$rowInputSection.filter("input");
    }

    private _addEventListerners(): void {
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.blur(() => {
            $rowInput.val($rowInput.data("val"));
        });

        $rowInput.keypress((event, noScrollBar) => {
            if (event.which !== keyCode.Enter) {
                return;
            }

            const rowManager: RowManager = this.rowManager;
            if (!rowManager.canScroll()) {
                return;
            }

            const curRow: number = this._getRowNum();
            let targetRow: number = Number($rowInput.val());
            const backRow: number = targetRow;
            let canScroll: boolean;
            [targetRow, canScroll] = rowManager.normalizeRowNum(targetRow);
            if (!canScroll) {
                this._setRowNum(targetRow == null ? curRow : targetRow);
                return;
            } else {
                this._setRowNum(targetRow);
                const rowOnScreen: number = rowManager.getLastVisibleRowNum() - curRow + 1;
                rowManager.skipToRow(backRow, targetRow, rowOnScreen, noScrollBar)
                .always(() => {
                    this.updateCurrentRowNum();
                });
            }
        });
    }

    private _getRowNum(): number {
        const $rowInput: JQuery = this._getRowInput();
        return Number($rowInput.data("val"));
    }

    private _setRowNum(val: number): void {
        const $rowInput: JQuery = this._getRowInput();
        $rowInput.val(val).data("val", val);
    }
}