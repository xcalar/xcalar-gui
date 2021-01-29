class CSHelp {
    private static _instance: CSHelp;

    private constructor() {

        $(document).on("click", ".csHelp", function() {
            const topic = $(this).attr("data-topic");
            const helpBaseUrl = HelpPanel.Instance.getHelpDocBaseURL();
            const lookup = csLookup;
            const url = helpBaseUrl + "ContentXDHelp/" + lookup[topic];
            window.open(url, "xcalar");
        });
    }

    public static setup(): CSHelp {
        return this._instance || (this._instance = new this());
    }
}