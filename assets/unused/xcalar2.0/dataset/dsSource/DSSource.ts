namespace DSSource {
    /**
     * DSSource.setup
     */
    export function setup(): void {
        _addEventListeners();
    }
    
    /**
     * DSSource.show
     */
    export function show(): void {
        DSForm.show();
    }

    function _getCard() {
        return $("#dsForm-source");
    }

    function _addEventListeners(): void {
        let $card = _getCard();
        $card.find(".location.s3").click(() => {
            DSS3Config.Instance.show();
        });

        $card.find(".location.database").click(() => {
            DSDBConfig.Instance.show();
        });

        $card.find(".more").click(() => {
            DSForm.show();
        });
    }
}