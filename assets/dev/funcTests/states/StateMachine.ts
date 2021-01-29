class StateMachine {
    public statesMap: Map<string, State>;
    private iterations: number;
    private test: any;
    private stateName: string;
    private currentState: State;

    constructor(verbosity, iterations, test) {
        //Retrieve the iterations from KVStore if it's being set
        this.iterations = iterations;
        this.test = test;

        //Instantiate workbook states here
        this.statesMap = new Map();
        this.statesMap.set("Workbook", new WorkbookState(this, verbosity));

        this.stateName = xcSessionStorage.getItem('xdFuncTestStateName') || "Workbook";
        // Only instantiate a Dataflow/SQL state when we're inside a active workbook
        if (this.stateName != "Workbook") {
            this.statesMap.set(DataflowState.NAME, new DataflowState(this, verbosity));
            this.statesMap.set(SQLState.NAME, new SQLState(this, verbosity));
        } else {
            $("#projectTab").click(); // Go back to the workbook panel;
        }
        this.currentState = this.statesMap.get(this.stateName);
        xcSessionStorage.removeItem('xdFuncTestStateName');
    }

    async run() {
        if (typeof window !== "undefined") {
            window.verbose = true;
        }
        // make sure it's in notebook panel
        $("#notebookScreenBtn").click();
        await this.prepareData();
        let maxRun = new Map();
        maxRun.set(SQLState.NAME, Util.getRandomInt(40) + 20);
        maxRun.set(DataflowState.NAME, Util.getRandomInt(60) + 30);
        while (this.iterations > 0) {
            let currentRun = parseInt(xcSessionStorage.getItem('xdFuncTestIterations'));
            let totalRun = parseInt(xcSessionStorage.getItem('xdFuncTestTotalRun'));
            console.log(`Running the ${totalRun - currentRun}/${totalRun} iterations`);
            this.currentState = await this.currentState.takeOneAction()
            if (this.currentState == null) { // Hit the workbook activation
                xcSessionStorage.setItem('xdFuncTestIterations', String(this.iterations-1));
                break;
            }
            // Mode Switch
            if (this.currentState.name != "Workbook" && this.currentState.run >= maxRun.get(this.currentState.name)) {
                this.currentState.run = 0;
                this.currentState = this.statesMap.get(Util.pickRandom([...<any>this.statesMap.keys()]));
                if (this.currentState.name == 'Workbook') {
                    $("#projectTab").click(); // Go back to the workbook panel;
                }
            }
            this.iterations -= 1;
            xcSessionStorage.setItem('xdFuncTestIterations', String(this.iterations));
        }
    }

    async prepareData() {
        try {
            // load some tables (published tables) for functests
            if (this.stateName != 'Workbook' && xcSessionStorage.getItem("xdFuncTestFirstTimeInit") == undefined) {
                const nameBase = "AIRPORT" + Math.floor(Util.random() * 10000);
                const check = "#previewTable td:eq(1):contains(00M)";
                const url = "/netstore/datasets/flight/" + this.test.mode + "airports.csv";
                const tblName = nameBase;
                await this.test.loadTable(tblName, url, check, true);
                xcSessionStorage.setItem('xdFuncTestFirstTimeInit', 'false');
            }
        } catch (e) {
            console.error("Prepare data failed", e);
            throw e;
        }
    }
}
