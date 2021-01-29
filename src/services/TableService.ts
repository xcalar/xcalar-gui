class DeleteTableModalService {
    /**
     * list session tables
     */
    public list(): Promise<{
        dagNodeId: string, name: string, size: number, pinned: boolean
    }[]> {
        let XcalarGetTables = window["XcalarGetTables"];
        return new Promise((resolve, reject) => {
            XcalarGetTables("*")
            .then((result) => {
                resolve(result.nodeInfo);
            })
            .fail((error) => {
                reject(error);
            });
        });
    }

    /**
     * delete tables
     * @param tableNames
     * @param modalId
     */
    public deleteTables(tableNames: string[], modalId: string): Promise<void> {
        // XXX TODO: remove window hack
        let DagTblManager = window["DagTblManager"];
        let MemoryAlert = window["MemoryAlert"];
        tableNames.forEach((tableName) => DagTblManager.Instance.deleteTable(tableName, false));

        if (tableNames.length === 0) {
            return new Promise((resolve) => {
                resolve()
            });
        } else {
            return new Promise((resolve, reject) => {
                DagTblManager.Instance.forceDeleteSweep()
                .then(() => {
                    resolve();
                })
                .fail((err) => {
                    reject();
                    this._failHandler(err, modalId);
                })
                .always(() => {
                    // should re-dected memory usage
                    MemoryAlert.Instance.check();
                });
            });
        }
    }

    // XXX replace window variables with react components
    private _failHandler(args: any[], modalId: string): void {
        let $container = $(`#${modalId}`);
        let hasSuccess: boolean = false;
        let failedTables: string[] = [];
        let failedMsg: string = "";
        let failFound: boolean = false;
        let noDelete: boolean = false;
        let xcStringHelper = window["xcStringHelper"];
        let StatusBox = window["StatusBox"];
        let ErrTStr = window["ErrTStr"];
        let StatusMessageTStr = window["StatusMessageTStr"];
        let ErrWRepTStr = window["ErrWRepTStr"];
        args = args || [];
        for (let i = 0; i < args.length; i++) {
            if (args[i] && args[i].error && args[i].tableName) {
                failFound = true;
                let tableName: string = args[i].tableName
                failedTables.push(tableName);
                let error: string = args[i].error;
                if (!failedMsg && error !== ErrTStr.CannotDropLocked) {
                    failedMsg = error;
                } else if (error === ErrTStr.CannotDropLocked) {
                    noDelete = true;
                }

                let $gridUnit = $container.find('.grid-unit').filter((_i, el) => {
                    let $grid = $(el);
                    return ($grid.find('.name').text() === tableName);
                });
                $gridUnit.addClass('failed');

            } else if (args[i] == null) {
                hasSuccess = true;
            }
        }
        if (!failFound) {
            return;
        }

        if (!failedMsg && noDelete) {
            // only show cannot dropped message if ther are no other
            // fail messages
            failedMsg = ErrTStr.CannotDropLocked;
        }
        let errorMsg;
        if (hasSuccess) {
            if (failedTables.length === 1) {
                errorMsg = failedMsg + ". " +
                xcStringHelper.replaceMsg(ErrWRepTStr.ResultSetNotDeleted, {
                    "name": failedTables[0]
                });
            } else {
                errorMsg = failedMsg + ". " +
                           StatusMessageTStr.PartialDeleteResultSetFail + ".";
            }
        } else {
            errorMsg = failedMsg + ". " + ErrTStr.NoResultSetDeleted;
        }
        let $firstGrid = $container.find('.grid-unit.failed').eq(0);
        StatusBox.show(errorMsg, $firstGrid, false, {
            "side": "left",
            "highZindex": true
        });
    }
}

export default new DeleteTableModalService();