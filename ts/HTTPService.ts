class HTTPService {
    private static _instance: HTTPService;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    public ajax(options: any): XDPromise<any> {
        /** START DEBUG ONLY **/
        let extraOptions = null;
        if (window.location.hostname === "localhost" && 
            (typeof gLoginEnabled !== "undefined" && gLoginEnabled === true)
        ) {
            extraOptions = {xhrFields: {withCredentials: true}};
        }
        options = $.extend(options, extraOptions);
        /** END DEBUG ONLY **/
        return jQuery.ajax(options)
                .fail((error) => this._errorHandler(error));
    }

    public error(status: number) {
        if (status === httpStatus.Unauthorized) {
            if (typeof XcUser !== 'undefined') {
                // index.html case
                XcUser.logoutWarn();
            }
        }
    }

    private _errorHandler(error) {
        console.error(error);
        try {
            this.error(error.status);
        } catch (e) {
            // skip
        }
    }
}