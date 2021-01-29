class PbTableService {
    /**
     * list published tables
     */
    public list(): Promise<{
        name: string, size: number, createTime: number | null
    }[]> {
        const PTblManager = window["PTblManager"];
        return new Promise((resolve, reject) => {
            PTblManager.Instance.getTablesAsync(true)
            .then((pbTables) => {
                resolve(pbTables);
            })
            .fail((error) => {
                reject(error);
            });
        });
    }

    public listDeactivatedTables(): Promise<{name: string}[]> {
        const PTblManager = window["PTblManager"];
        const PbTblState = window['PbTblState'];
        return PTblManager.Instance.getAvailableTables().filter((pbTable) => {
            return !pbTable.active && pbTable.state !== PbTblState.Activating;
        });
    }

    /**
     * Delete published tables
     * @param pbTableNames
     */
    public delete(pbTableNames: string[]): Promise<void> {
        // XXX TODO: remove window hack
        const PTblManager = window["PTblManager"];
        return PTblManager.Instance.deleteTablesOnConfirm(pbTableNames, true, false);
    }

    /**
     * Activate/recreate published tables
     * @param pbTableNames
     */
    public activate(pbTableNames: string[]): Promise<void> {
        // XXX TODO: remove window hack
        const PTblManager = window["PTblManager"];
        return PTblManager.Instance.activateTables(pbTableNames);
    }
}

export default new PbTableService();