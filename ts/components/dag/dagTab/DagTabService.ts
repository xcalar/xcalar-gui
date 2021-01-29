// Specify dependencies here:
// const DagTab = require("./DagTab");
// const DagTabUser = require("./DagTabUser");

class DagTabService {
    private _activeUserDags: DagTab[] = [];

    /**
     * Create a DagUserTab from JSON, and add it to the tab list
     * @param dagInfo 
     * @description It is used in nodejs env
     */
    public addActiveUserTabFromJSON(dagInfo): void {
        if (dagInfo == null) {
            throw new Error('JSON not provided');
        }
        if (dagInfo.name == null) {
            throw new Error('Module name not provided');
        }
        const newTab = DagRuntime.isAccessible(this)
            ? this.getRuntime().accessible(new DagTabUser({
                name: dagInfo.name,
                id: dagInfo.id
            }))
            : new DagTabUser({
                name: dagInfo.name,
                id: dagInfo.id
            });
        
        newTab.loadFromJSON(dagInfo);
        this._activeUserDags.push(newTab);
    }

    public getActiveUserTabs(): DagTab[] {
        if (typeof DagTabManager !== 'undefined') {
            return DagTabManager.Instance.getTabs();
        } else {
            // expServer goes here
            return this._activeUserDags.map((v) => v);
        }
    }

    public getTabById(tabId: string): DagTab {
        if (typeof DagTabManager !== 'undefined') {
            return DagTabManager.Instance.getTabById(tabId);
        } else {
            // expServer goes here
            for (const dagTab of this._activeUserDags) {
                if (dagTab.getId() === tabId) {
                    return dagTab;
                }
            }
            return null;
        }
    }

    public removeTabByNode(dagNode: DagNodeCustom | DagNodeSQL): void {
        if (typeof DagTabManager !== 'undefined') {
            return DagTabManager.Instance.removeTabByNode(dagNode);
        } else {
            // expServer goes here
            // Do nothing
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagTabService = DagTabService;
}
