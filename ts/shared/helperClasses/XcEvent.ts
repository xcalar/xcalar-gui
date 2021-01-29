class XcEvent {
    private _events: {[key: string]: Function};

    public constructor() {
        this._events = {};
    }

    /**
     *
     * @param event
     * @param callback
     */
    public addEventListener(event: string, callback: Function): void {
        this._events[event] = callback;
    }

    /**
     *
     * @param event
     * @param args
     */
    public dispatchEvent(event, ...args): any {
        if (typeof this._events[event] === 'function') {
            return this._events[event](...args);
        } else {
            return null;
        }
    }
}