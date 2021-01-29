class PanelHistory {
    private _wasSetup: boolean = false;
    private static _instance: PanelHistory;
    private _cursor: number = 0;
    private _sessionID: number;
    private _preventNavigation: boolean = false;

    public static get Instance() {
        return this._instance || (this._instance = new PanelHistory());
    }
    
    private constructor() {
        this._sessionID = Date.now();
    }

    /**
     * PanelHistory.Instance.setup
     */
    public setup() {
        if (this._wasSetup) {
            return;
        }
        this._wasSetup = true;
        window.addEventListener('popstate', (event) => {
            this._popStateEvent(event);
        });
        if (!window.history.state) {
            window.history.pushState({
                panel: UrlToTab.home,
                cursor: this._cursor,
                sessionID: this._sessionID
            }, "", window.location.href);
        } else if (window.history.state && window.history.state.sessionID) {
            window.history.replaceState({
                panel: window.history.state.panel,
                cursor: this._cursor,
                sessionID: this._sessionID
            }, "", window.location.href);
        }
    }

    public push(panel: string): void {
        if (!panel) {
            return;
        }
        if (window.history.state && window.history.state.panel === panel) {
            return;
        }
        let url = xcHelper.setURLParam("panel", panel);
        window.history.pushState({
            panel: panel,
            cursor: ++this._cursor,
            sessionID: this._sessionID
        }, "", url);
    }

    public deletePanelParam(): void {
        const newHref: string = xcHelper.deleteURLParam("panel");
        window.history.replaceState("", "", newHref);
    }

    public getCurrentPanel(): string {
        if (window.history.state) {
            return window.history.state.panel;
        }
        return null;
    }

    private _popStateEvent(event) {
        if (!event.state || !event.state.sessionID || (event.state.sessionID !== this._sessionID)) {
            if (!this._preventNavigation) {
                this._preventNavigation = true;
                window.history.forward();
            } else {
                this._preventNavigation = false;
            }
            return;
        }
        const oldCursor = this._cursor;
        let url;

        if (!event.state || !event.state.panel) {
            url = "projects";
            this._cursor = -1;
        } else {
            url = event.state.panel;
            this._cursor = event.state.cursor;
        }

        if (this._preventNavigation) {
            this._preventNavigation = false;
            return;
        }

        if (ModalHelper.isModalOn()) {
            // prevent user from navigating if modal is open
            this._handleHistoryChange(event, oldCursor);
            return;
        }

        HomeScreen.switch(UrlToTab[url]);
    }

    private _handleHistoryChange(event, oldCursor: number) {
          // use _preventNavigation flag to prevent looping
          this._preventNavigation = true;
          if (event.state.cursor == null || event.state.cursor < 1 || oldCursor >= event.state.cursor) {
              this._cursor++;
              window.history.forward();
          } else {
              this._cursor--;
              window.history.back();
          }
    }
}