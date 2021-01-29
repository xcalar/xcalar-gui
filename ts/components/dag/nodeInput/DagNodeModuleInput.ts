class DagNodeModuleInput extends DagNodeInput {
    protected input: any;

    public isConfigured(): boolean {
        return true;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeModuleInput = DagNodeModuleInput;
};
