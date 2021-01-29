class SharedTable {
    private _name: string;

    constructor({ name }) {
        this._name = name;
    }

    public getName() {
        return this._name;
    }
}

export { SharedTable };