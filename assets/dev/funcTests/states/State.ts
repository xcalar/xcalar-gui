
abstract class State {
    public name: string;
    public run: number; // How many iterations ran in this state currently
    protected stateMachine: StateMachine;
    protected verbosity: string;
    protected availableActions: Function[];

    public constructor(name: string, stateMachine: StateMachine,
        verbosity: string) {
        this.name = name;
        this.stateMachine = stateMachine;
        this.verbosity = verbosity;
    }

    public log(message: string) {
        if (this.verbosity === "Verbose") {
            console.log(`XDFuncTest log: ${message}`);
        }
    }

    public logError(errorMsg: any) {
        if (typeof errorMsg === "object") {
            if (this.isCyclic(errorMsg)) {
                console.log("cyclic case!");
            }
            if (errorMsg instanceof Error) {
                errorMsg = errorMsg.stack;
            } else if (errorMsg.error instanceof Error) {
                errorMsg = errorMsg.error.stack;
            } else {
                errorMsg = JSON.stringify(errorMsg);
            }
        }
        console.log(`XDFuncTest Error log: ${errorMsg}`);
    }

    /* -------------------------------Helper Function------------------------------- */
    // Add an availble action
    // If this action already exists, don't do anything. Otherwise add it
    public addAction(action: Function) {
        if (!this.availableActions.includes(action)) {
            this.availableActions.push(action);
        }
    }

    // Delete an availble action
    // If this action doesnt exist, don't do anything. Otherwise delete it
    public deleteAction(action: Function) {
        if (this.availableActions.includes(action)) {
            this.availableActions.splice(this.availableActions.indexOf(action), 1);
        }
    }

    public async delay(ms: number) {
        // return await for better async stack trace support in case of errors.
        return await new Promise(resolve => setTimeout(resolve, ms));
    }

    // Use checkFunc to check at a interval
    // The overall timeout should be outCnt * interval
    public async testFinish(checkFunc: Function, interval?: number) {
        var checkTime = interval || 200;
        var outCnt = 80;
        var timeCnt = 0;

        while (timeCnt < outCnt) {
            await this.delay(checkTime);
            let pass = await checkFunc();
            if (pass) {
                return "PASS";
            } else if (pass == null) {
                return "Check Error!";
            } else {
                console.log("check not pass yet!");
                timeCnt++;
            }
        }

        console.log("Time Out!", JSON.stringify(checkFunc));

        return "TIMEOUT"
    }
    /* -------------------------------Helper Function------------------------------- */

    abstract takeOneAction(): Promise<State>;

    private isCyclic(obj) {
        let seenObjects = [];
        function detect(obj) {
            if (obj && typeof obj === 'object') {
                if (seenObjects.indexOf(obj) !== -1) {
                    return true;
                }
                seenObjects.push(obj);
                for (let key in obj) {
                    if (obj.hasOwnProperty(key) && detect(obj[key])) {
                        console.log(obj + 'cycle at ' + key);
                        return true;
                    }
                }
            }
            return false;
        }
        return detect(obj);
    }
}
