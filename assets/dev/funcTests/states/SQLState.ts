/*
This file defines the state of SQL in XD Func Test
SQLState has the following operations:

* createSnippet
* deleteSnippet
* executeSnippet

- createSnippet will generate a random sql query (or use a SQL Func with 40% chance)
and randomly chose the existing publish tables in the newly created snippet.
- executeSnippet will execute the sql query within the snippet and publish the result
table (We only publish relatively small tables --> with row nums in (0, 500])

*/
class SQLState extends State {
    static NAME = "SQL";

    private currentWKBKId: string;

    public constructor(stateMachine: StateMachine, verbosity: string) {
        super(SQLState.NAME, stateMachine, verbosity);

        //turn off auto execute and auto preview for dataflow
        UserSettings.Instance.setPref("dfAutoExecute", false, false);
        UserSettings.Instance.setPref("dfAutoPreview", false, false);

        this.currentWKBKId = WorkbookManager.getActiveWKBK();

        this.availableActions = [this.createSnippet];
        this.run = 0;
    }

    /* -------------------------------Helper Function------------------------------- */
    // Generate a random unique snippet name
    private getUniqueName(prefix?: string, validFunc?: Function): string {
        prefix = prefix || "FuncTestSnippet";
        validFunc = validFunc || function (snippetName) { return (!SQLSnippet.Instance.hasSnippetWithName(snippetName));};
        return Util.uniqueRandName(prefix, validFunc, 10);
    }

    // Return a random snippet
    private getRandomSnippet(): SQLSnippetDurable {
        return Util.pickRandom(SQLSnippet.Instance.list());
    }

    private async getPublishTables(): Promise<string[]>{
        let tableLoaded = await PTblManager.Instance.getTablesAsync(true);
        let tables = [];
        for (let table of tableLoaded) {
            tables.push(table.name);
        }
        return tables;
    }

    // Generate sql query
    private async generateSQL(): Promise<string> {
        let publishTables = await this.getPublishTables();
        let tables = [];
        let filters = [];
        for (let idx of Array.from(Array(Util.getRandomInt(3)+1).keys())) {
            let tableName = Util.pickRandom(publishTables);
            tables.push(`${tableName} as t${idx}`)
            filters.push(`t${idx}.ROWNUM <= ${Util.getRandomInt(30)+1}`)
        }
        // Do a filter on ROWNUM column of the table
        // e.g: select * from table as t0 join table as t1 where t0.ROWNUM < 30 and t1.ROWNUM < 15
        let sql = `select * from ${tables.join(' join ')} where ${filters.join(' and ')}`;
        // 40% chance we will use SQL func
        if (Util.getRandomInt(10) > 5) {
            const sqlFuncs = await DagList.Instance.listSQLFuncAsync();
            const dags = sqlFuncs.dags;
            if (dags.length > 0) {
                let sqlFunc = Util.pickRandom(dags).name;
                sql = `SELECT * FROM ${sqlFunc}(${Util.pickRandom(publishTables)})`;
            }
        }
        return sql;
    }

    // Get latest sql history
    private async getLatestSQLHistory(): Promise<SqlQueryHistory.QueryInfo> {
        try{
            await SqlQueryHistory.getInstance().readStore(false);
        } catch (err) {
            this.log(`Read sql query history from kvstore fails, error: ${JSON.stringify(err)}`);
        }
        let historyMap = SqlQueryHistory.getInstance().getQueryMap();
        let qInfo = null;
        for (let idx in historyMap) {
            let q = historyMap[idx];
            if (qInfo == null || qInfo.startTime < q.startTime) {
                qInfo = q;
            }
        }
        return qInfo;
    }
    /* -------------------------------Helper Function------------------------------- */

    private async createSnippet(): Promise<SQLState> {
        let snippetName = this.getUniqueName();
        this.log(`Creating snippet ${snippetName} in WKBK ${this.currentWKBKId}`);
        try {
            SQLTabManager.Instance.newTab(snippetName);
            let sql = await this.generateSQL();
            SQLEditorSpace.Instance.newSQL(sql);
        } catch (err) {
            this.log(`Error creating snippet in WKBK ${this.currentWKBKId}`);
            throw err;
        }

        if (SQLSnippet.Instance.list().length >= 1) {
            // If has at least one snippet
            // add more actions
            this.addAction(this.deleteSnippet);
            this.addAction(this.executeSnippet);
        }
        return this;
    }

    private async deleteSnippet(): Promise<SQLState> {
        const randomSnippet = this.getRandomSnippet();
        const { name, id } = randomSnippet;
        this.log(`Deleting snippet ${name} in WKBK ${this.currentWKBKId}`);
        try{
            await SQLSnippet.Instance.delete(id);
        } catch (err) {
            this.log(`Error deleting snippet in WKBK ${this.currentWKBKId}`);
            throw err;
        }

        if (SQLSnippet.Instance.list().length === 0) {
            this.deleteAction(this.executeSnippet);
            this.deleteAction(this.deleteSnippet);
        }
        return this;
    }

    private async executeSnippet(): Promise<SQLState> {
        const randomSnippet = this.getRandomSnippet();
        const { name, id, snippet } = randomSnippet;

        if (!snippet) {
            this.log(`empty snippet ${name} in WKBK ${this.currentWKBKId}, skip`);
            return this;
        }

        try {
            SQLTabManager.Instance.openTab(id);
            this.log(`Executing sql query ${snippet} in WKBK ${this.currentWKBKId}`);
            SQLEditorSpace.Instance.execute(snippet);
        } catch (err) {
            this.log(`Error executing snippet in WKBK ${this.currentWKBKId}`);
            throw err;
        }

        // Check the latest query history info matches the sql query
        // we just issued
        let checkFunc = async function() {
            console.info(`checking sql execution ${snippet}`);
            try {
                await SqlQueryHistory.getInstance().readStore(true);
            } catch (err) {
                console.log(`Error retrieve the sql query history: ${err}`);
                return false;
            }
            let historyMap = SqlQueryHistory.getInstance().getQueryMap();
            let qInfo = null;
            for (let idx in historyMap) {
                let q = historyMap[idx];
                if (qInfo == null || qInfo.startTime < q.startTime) {
                    qInfo = q;
                }
            }
            if (qInfo == null) {
                console.log("no sql query hisotry, return false!");
                return false;
            }
            return qInfo.queryString.replace(/\s+/g, '') == snippet.replace(/\s+/g, '') && (qInfo.status == 'Failed' || qInfo.status == 'Done');
        }
        let msg = await this.testFinish(checkFunc);
        this.log(`Finish checking ${snippet} execution in WKBK ${this.currentWKBKId}, result: ${msg}`);

        let qInfo = await this.getLatestSQLHistory();
        // Only publish those relatively small table (row nums in (0, 500])
        let publishTables = await this.getPublishTables();
        let validFunc = function(name) {return !publishTables.includes(name);}
        let tableName = this.getUniqueName("FUNCTESTPUB", validFunc);
        if (qInfo && qInfo.status == 'Done' && qInfo.queryString == snippet && qInfo.rows > 0 && qInfo.rows < 500) {
            let columns = [];
            for (let col of qInfo.columns) {
                columns.push(ColManager.newPullCol(col.name, col.backName, col.type));
            }
            try {
                // Deal with OOM issue
                this.log("create table from view created by " + JSON.stringify(qInfo));
                await PTblManager.Instance.createTableFromView([], columns, qInfo.tableName, tableName);
            } catch (error) {
                // Out of resource error
                if (error && error.status == StatusT.StatusNoXdbPageBcMem) {
                    // If OOM, randomly delete some tables
                    this.log("run into StatusNoXdbPageBcMem, resolving...");
                    let deletePublishTables = Util.pickRandomMulti(publishTables, Math.min(publishTables.length, 10));
                    await PTblManager.Instance.deleteTablesOnConfirm(deletePublishTables, false, true);
                } else {
                    this.log("create table from view fails");
                    throw error;
                }
            }
        }
        return this;
    }

    public async takeOneAction(): Promise<SQLState> {
        let randomAction = Util.pickRandom(this.availableActions);
        this.log(`take action ${randomAction.name}`);
        const newState = await randomAction.call(this);
        this.run++;
        return newState;
    }
}
