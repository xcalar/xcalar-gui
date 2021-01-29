class DFService {
    /**
     * list dataflow modules
     */
    public async listModules(): Promise<{id: string, name: string, createdTime: number}[]> {
        let DagList = window["DagList"];
        let res = await DagList.Instance.listUserDagAsync();
        let dags = res ? res.dags : [];
        return dags.filter((dag) => dag.app == null);
    }

    /**
     * list table functions
     */
    public async listTableFuncs(): Promise<{id: string, name: string, createdTime: number}[]> {
        let DagList = window["DagList"];
        let res = await DagList.Instance.listSQLFuncAsync();
        let dags = res ? res.dags : [];
        return dags.filter((dag) => dag.app == null);
    }

    /**
     * list apps
     */
    public listApps(): {id: string, name: string}[] {
        let AppList = window["AppList"];
        return AppList.Instance.list();
    }

    /**
     * list optimized datafows and query dataflows
     */
    public async listSpeicalApps(): Promise<{id: string, name: string}[]> {
        let DagList = window["DagList"];
        let DagTabOptimized = window["DagTabOptimized"];
        let DagTabQuery = window["DagTabQuery"];

        await DagList.Instance.refresh();
        let specialApps = [];
        DagList.Instance.getAllDags().forEach((dagTab) => {
            if (dagTab instanceof DagTabOptimized ||
                dagTab instanceof DagTabQuery
            ) {
                specialApps.push({
                    id: dagTab.getId(),
                    name: dagTab.getPath()
                });
            }
        });
        return specialApps;
    }

    /**
     * Delete dataflow module by ids
     */
    public async deleteByIds(
        moduleIds: string[]
    ): Promise<{id: string, error: string}[]> {
        let DagList = window["DagList"];
        let failedModules = [];
        for (let id of moduleIds) {
            try {
                await DagList.Instance.deleteDataflow(id);
            } catch (e) {
                failedModules.push({
                    id,
                    error: e.error
                });
            }
        }
        return failedModules.length ? failedModules : null;
    }

    public deleteApps(appIds: string[]): void {
        let AppList = window["AppList"];
        AppList.Instance.bulkDelete(appIds);
    }
}

export default new DFService();