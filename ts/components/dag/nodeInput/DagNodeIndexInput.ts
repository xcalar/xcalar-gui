class DagNodeIndexInput extends DagNodeInput {
    protected input: DagNodeIndexInputStruct;

    public getInput(replaceParameters?: boolean): DagNodeIndexInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            columns: input.columns || [],
            dhtName: input.dhtName || "",
            outputTableName: input.outputTableName || ""
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeIndexInput = DagNodeIndexInput;
}
