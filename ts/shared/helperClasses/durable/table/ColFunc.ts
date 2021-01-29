// XXX TODO: remove ColFunc as it's not being used anymore
class ColFunc extends Durable {
    public name: string; // col func's name
    public args: any[]; // (array) col func's arguments

    constructor(options: ColFuncDurable) {
        options = options || <ColFuncDurable>{};
        super(options.version);
        this.name = options.name;
        this.args = options.args || [];
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used
    protected _getDurable() {
        return null;
    }
}