// a read only tab to test execution
abstract class DagTabExecuteOnly extends DagTabUser {
    private _storageKey: string;

    public constructor(id, name, storageKey) {
        super({
            id,
            name,
            dagGraph: new DagGraph()
        });
        this._storageKey = storageKey;
    }

    public abstract getIcon(): string;

    /**
     * @override
     */
    public isEditable(): boolean {
        return false;
    }

    public viewOnlyAlert(bypassAlert?: boolean): XDPromise<void> {
        try {
            const noAlert = xcLocalStorage.getItem(this._storageKey) === "true";
            if (bypassAlert || noAlert) {
                DagTabManager.Instance.convertNoEditableTab(this);
                return PromiseHelper.resolve();
            }
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            const writeChecked = (hasChecked) => {
                if (hasChecked) {
                    xcLocalStorage.setItem(this._storageKey, "true");
                }
            };
            Alert.show({
                title: `${this._name} is read only`,
                msg: this._getViewOnlyMessage(),
                isCheckBox: true,
                buttons: [{
                    name: "Create new plan",
                    className: "larger",
                    func: (hasChecked) => {
                        writeChecked(hasChecked);
                        DagTabManager.Instance.convertNoEditableTab(this);
                        deferred.resolve();
                    }
                }],
                onCancel: (hasChecked) => {
                    writeChecked(hasChecked);
                    deferred.reject();
                }
            });

            return deferred.promise();
        } catch (e) {
            console.error(e);
            return PromiseHelper.resolve();
        }
    }

    private _getViewOnlyMessage(): string {
        return "To modify/extend this ready-only plan, you must convert the current version to an editable plan.";
    }
}