/*
This file defines the state of workbook in XD Func Test
WorkbookState has the following operations:

* createWorkbook
* activateWorkbook
* deactiveWorkbook
* copyWorkbook
* renameWorkbook
* deleteWorkbook

- activateWorkbook will activate a random workbook and get into it
This will lead to a browser hard-reloading. We need to memorize the
corresponding test state infomation and restore the test env

Currently, we will switch to another state once we activate a workbook

*/
class WorkbookState extends State {
    private currentWorkbook: string;

    public constructor(stateMachine: StateMachine, verbosity: string) {
        let name = "Workbook"
        super(name, stateMachine, verbosity);

        this.availableActions = [this.createNewWorkbook];
        // Conditional constructor
        if (Object.keys(WorkbookManager.getWorkbooks()).length != 0) {
            this.addAction(this.activateWorkbook);
            this.addAction(this.deleteWorkbook);
            this.addAction(this.copyWorkbook);
            this.addAction(this.renameWorkbook);
            this.addAction(this.deactiveWorkbook);
        }
    }

    /* -------------------------------Helper Function------------------------------- */
    // Generate a random unique name
    private getUniqueRandName(prefix?: string): string {
        let validFunc = function (wkbkName) {
            let workbookNames = [];
            for (let id in WorkbookManager.getWorkbooks()) {
                workbookNames.push(WorkbookManager.getWorkbook(id).name);
            }
            return !workbookNames.includes(wkbkName);
        };
        var prefix = prefix || "FuncTest"
        return Util.uniqueRandName(prefix, validFunc, 10);
    }

    // Check if this workbook exists
    private workbookExist(wkbkName: string): boolean {
        let wkbkId = WorkbookManager.getIDfromName(wkbkName);
        return WorkbookManager.getWorkbook(wkbkId);
    }

    // Return a random workbook id
    private getRandomWorkbook(): string {
        let workbooks = WorkbookManager.getWorkbooks();
        let workbookIds = Object.keys(workbooks);
        return Util.pickRandom(workbookIds);
    }
    /* -------------------------------Helper Function------------------------------- */

    private async activateWorkbook(): Promise<State> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Activating workbook ${randomWorkbook}`);
        this.currentWorkbook = randomWorkbook;
        try {
            xcSessionStorage.setItem('xdFuncTestStateName', Util.pickRandom([DataflowState.NAME, SQLState.NAME]));
            await WorkbookManager.switchWKBK(randomWorkbook);
        } catch (error) {
            if (error["error"] != undefined && error["error"] === "Cannot switch to the same project") {
                this.log(`Workbook ${randomWorkbook} already active!`);
                $("#projectTab").click(); // Go inside the workbook
                return this.stateMachine.statesMap.get(xcSessionStorage.getItem('xdFuncTestStateName'));
            } else {
                this.log(`Error activating workbook ${randomWorkbook}`);
                throw error;
            }
        }
        return null;
    }

    private async deactiveWorkbook(): Promise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Deactivating workbook ${randomWorkbook}`);
        try {
            await WorkbookManager.deactivate(randomWorkbook);
        } catch (error) {
            this.log(`Error deactiving workbook ${randomWorkbook}`);
            throw error;
        }
        return this;
    }

    private async copyWorkbook(): Promise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Copying workbook ${randomWorkbook}`);
        let wkbkName = this.getUniqueRandName("FuncTestCopy");
        try {
            await WorkbookManager.copyWKBK(randomWorkbook, wkbkName);
        } catch (error) {
            this.log(`Error copying workbook ${randomWorkbook} to ${wkbkName}`);
            throw error;
        }
        if (!this.workbookExist(wkbkName)) {
            throw `Error copying workbook from ${randomWorkbook}. The copied workbook ${wkbkName} doesn't exist`
        }
        this.log(`Copied workbook ${randomWorkbook} to ${wkbkName}`);
        return this;
    }

    private async renameWorkbook(): Promise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Renaming workbook ${randomWorkbook}`);
        let wkbkName = this.getUniqueRandName("FuncTestRename");
        try {
            await WorkbookManager.renameWKBK(randomWorkbook, wkbkName, "");
        } catch (error) {
            this.log(`Error renaming workbook ${randomWorkbook} to ${wkbkName}`);
            throw error;
        }
        if (WorkbookManager.getWorkbook(randomWorkbook) != null) {
            throw `Error renaming workbook ${randomWorkbook}, the original still exists`;
        }
        if (!this.workbookExist(wkbkName)) {
            throw `Error renaming workbook ${randomWorkbook}, expect new workbook with name ${wkbkName} doesn't exist`;
        }
        this.log(`Renamed workbook ${randomWorkbook} to ${wkbkName}`);
        return this;
    }

    private async deleteWorkbook(): Promise<WorkbookState> {
        let randomWorkbook = this.getRandomWorkbook();
        this.log(`Deleting workbook ${randomWorkbook}`);
        try {
            await WorkbookManager.deactivate(randomWorkbook);
        } catch (error) {
            this.log(`Error deactivating workbook ${randomWorkbook}`);
            throw error;
        }
        try {
            await this.deleteWBWithRetry(randomWorkbook, 10, 1000);
        } catch(error) {
            this.log(`Error deleting workbook ${randomWorkbook}`);
            throw error;
        }
        if (WorkbookManager.getWorkbook(randomWorkbook) != null) {
            throw `Error deleting workbook ${randomWorkbook}, it still exists after attemping to delete`;
        }
        if (Object.keys(WorkbookManager.getWorkbooks()).length == 0) {
            this.deleteAction(this.activateWorkbook);
            this.deleteAction(this.copyWorkbook);
            this.deleteAction(this.renameWorkbook);
            this.deleteAction(this.deactiveWorkbook);
            this.deleteAction(this.deleteWorkbook);
        }
        this.log(`Deleted workbook ${randomWorkbook}`);
        return this
    }

    private async deleteWBWithRetry(wbId: string, numTry: number, msInterval: number): Promise<void> {
        let numTried: number = 0;
        while (numTried < numTry) {
            try {
                await WorkbookManager.deleteWKBK(wbId);
                return;
            } catch(e) {
                numTried ++;
                this.log(`Trying to delete workbook ${wbId}: ${numTried}`);
                this.log(e);
                await sleep(msInterval);
            }
        }
        throw `Fail to delete workbook ${wbId} after ${numTry} tries`;

        function sleep(msInterval: number): Promise<void> {
            return new Promise((resolve) => {
                setTimeout(() => { resolve(); }, msInterval);
            });
        }
    }

    private async createNewWorkbook(): Promise<WorkbookState> {
        let wkbkName = this.getUniqueRandName();
        this.log(`Creating workbook ${wkbkName}`);
        let wkbkId;
        try {
            wkbkId = await WorkbookManager.newWKBK(wkbkName);
        } catch (error) {
            this.log(`Error creating workbook ${wkbkName}`);
            throw error;
        }
        this.log(`Created workbook ${wkbkId}!`);
        this.addAction(this.activateWorkbook);
        this.addAction(this.copyWorkbook);
        this.addAction(this.renameWorkbook);
        this.addAction(this.deactiveWorkbook);
        return this;
    }

    public async takeOneAction(): Promise<WorkbookState> {
        let randomAction = Util.pickRandom(this.availableActions);
        this.log(`take action ${randomAction.name}`);
        const newState = await randomAction.call(this);
        return newState;
    }
}