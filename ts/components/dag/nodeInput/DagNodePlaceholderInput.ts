class DagNodePlaceholderInput extends DagNodeInput {
    protected input: DagNodePlaceholderInputStruct;

    public getInput(replaceParameters?: boolean): DagNodePlaceholderInputStruct {
        const input = super.getInput(replaceParameters);
        return {
            args: input.args || {}
        };
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodePlaceholderInput = DagNodePlaceholderInput;
}
