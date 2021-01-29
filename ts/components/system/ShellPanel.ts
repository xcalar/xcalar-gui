// place to put shell integration reltead js code
class ShellPanel {
    private _container: string;
    
    constructor(container: string) {
        this._container = container;
        // add any initial setup if needed
    }

    // return the jQuery selector of the panel
    private _getContainer(): JQuery {
        return $(`#${this._container}`);
    }

    // add any code that needed
}