class TooltipModal {
    private static _instance: TooltipModal;
    private _$modal: JQuery; // $("#tooltipModal")
    private _modalHelper: ModalHelper;


    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._$modal = $("#tooltipModal");

        this._modalHelper = new ModalHelper(this._$modal, {
            sizeToDefault: true,
            center: {verticalQuartile: true}
        });

        this._addEventListeners();
    }


    /**
     * TooltipModal.Instance.show
     * @returns {boolean}
     */
    public show(): boolean {
        if (this._$modal.is(":visible")) {
            return false;
        }

        this._renderWalkthroughs();

        this._modalHelper.setup();
    };

    private _renderWalkthroughs(): void {
        let walkthroughs: {name: string, description: string}[] = TooltipWalkthroughs.getAvailableWalkthroughs();
        let $modalmain = this._getModal().find(".modalMain");
        $modalmain.empty();
        let disable;
        let disableTooltip;
        let html = "";

        for( let i = 0; i < walkthroughs.length; i++ ) {
            let walkInfo = walkthroughs[i];
            if (WorkbookManager.getActiveWKBK() == null && walkInfo.name !== WKBKTStr.Location) {
                disable = 'xc-disabled';
                disableTooltip =  'data-toggle="tooltip" data-placement="auto top" data-container="body" ' +
                    'data-original-title="' + TooltipTStr.TooltipNoWorkbook + '"';
            } else {
                disable = "";
                disableTooltip = "";
            }
            html += '<div class="item">' +
                '<div class="leftPart">' +
                    '<div class="tooltipName textOverflowOneLine"' +
                    ' data-name="' + walkInfo.name + '">' +
                        walkInfo.name +
                    '</div>' +
                    '<div class="detail textOverflow">' +
                        walkInfo.description +
                    '</div>' +
                '</div>' +
                '<div class="rightPart">' +
                    '<div class="buttonArea"' + disableTooltip + '>' +
                        '<button type="button" class="btn confirm focusable ' + disable +'"' +
                        ' data-name="' + walkInfo.name + '">Start</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }
        $modalmain.append(html);
    }

    private _getModal(): JQuery {
        return $("#tooltipModal");
    }

    private _addEventListeners() {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close", () => {
            this._close();
        });

        $modal.on("click", ".item .confirm", (e) => {
            let $item: JQuery = $(e.target).closest(".item");
            let name = $item.find(".tooltipName").data("name");
            this._close();
            TooltipWalkthroughs.startWalkthrough(name);
        });
    }

    private _close(): void {
        this._modalHelper.clear();
    }
}
