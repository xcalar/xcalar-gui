class TableSkew {
    public static getSkewColorStyle(skew: number): string {
        if (this._isInValidSkew(skew)) {
            return "";
        }
        /*
            0: hsl(104, 100%, 33)
            25%: hsl(50, 100%, 33)
            >= 50%: hsl(0, 100%, 33%)
        */
        let h: number = 104;
        if (skew <= 25) {
            h = 104 - 54 / 25 * skew;
        } else if (skew <= 50) {
            h = 50 - 2 * (skew - 25);
        } else {
            h = 0;
        }
        return `hsl(${h}, 83%, 67%)`;
    }

    private static _isInValidSkew(skew: number): boolean {
        return (skew == null || isNaN(skew));
    }

    private $skewSection: JQuery;
    private table: TableMeta;

    public constructor(table: TableMeta) {
        this.table = table;
    }

    /**
     * Render Row Input
     * @param $container
     */
    public render($container: JQuery): void {
        this.clear();
        this.$skewSection = $(this._genHTML());
        this._addEventListerners();
        $container.empty().append(this.$skewSection);
    }

    /**
     * Clear Row Input
     */
    public clear(): void {
        if (this.$skewSection != null) {
            this.$skewSection.remove();
        }
    }

    private _genHTML(): string {
        const html: string =
        `<div class="skewInfoWrap" data-toggle="tooltip" data-container="body"
        data-placement="bottom" data-title="${TblTStr.ClickToDetail}">
            <label>${TblTStr.Skew}:</label>
            <span class="text"  style="color: ${this._getSkyewColor()}">
                ${this._getSkewText()}
            </span>
        <div>`;
        return html;
    }

    private _isInValidSkew(skew: number): boolean {
        return TableSkew._isInValidSkew(skew);
    }

    private _getSkewText(): string {
        const skew: number = this.table.getSkewness();
        return this._isInValidSkew(skew) ? "N/A" : String(skew);
    }

    private _getSkyewColor(): string {
        const skew: number = this.table.getSkewness();
        return TableSkew.getSkewColorStyle(skew);
    }

    private _addEventListerners(): void {
        this.$skewSection.click(() => {
            SkewInfoModal.Instance.show(this.table);
        });
    }
}