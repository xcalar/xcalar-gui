class DagNodeOptimizeInput extends DagNodeInput {
    protected input: DagNodeOptimizeInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeOptimizeInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns || [],
            driver: input.driver || "",
            driverArgs: input.driverArgs || null
        };
    }
}