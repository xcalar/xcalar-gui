class ProgCol extends Durable {
    public static readonly NewCellWidth: number = 115;

    public name: string; // front column name
    public backName: string; // back column name
    public prefix: string; // not persist striped from backName
    public immediate: boolean;
    public type: ColumnType;

    public width: number | string; // column width
    public sizedTo: string;

    public userStr: string;
    public func: ColFunc;
    public format: ColFormat;
    public textAlign: ColTextAlign;
    public sortedColAlias: string; // for prefixed column, the actual column name that is sorted and hidden

    public isNewCol: boolean; // if is new column
    private knownType: boolean; // if the type is known or just a guess
    public isMinimized: boolean; // columns is hidden or not

    constructor(options: ProgColDurable) {
        options = options || <ProgColDurable>{};
        super(options.version);

        this.name = options.name || "";
        this.backName = options.backName || this.name;
        this.prefix = xcHelper.parsePrefixColName(this.backName).prefix;
        this.immediate = options.immediate || false;
        this.type = options.type || null;

        this.width = options.width || ProgCol.NewCellWidth;
        this.sizedTo = options.sizedTo || "auto";

        this.userStr = options.userStr || "";
        this.func = new ColFunc(options.func);
        this.format = options.format || null;
        this.textAlign = options.textAlign || ColTextAlign.Left;
        this.sortedColAlias = options.sortedColAlias || options.backName || "";

        this.knownType = options.knownType || false;
        this.isNewCol = options.isNewCol || false;
        this.isMinimized = options.isMinimized || false;
    }

    public isDATACol(): boolean {
        if (this.name === "DATA" &&
            this.func &&
            this.func.name === "raw"
        ) {
            return true;
        } else {
            return false;
        }
    }

    // XXX TODO: remove it, should not be enough
    public isEmptyCol(): boolean {
        return this.isNewCol || this.name === "" || this.func && this.func.name === "";
    }

    public isImmediate(): boolean {
        if (this.immediate === true) {
            return true;
        } else {
            return false;
        }
    }

    public isKnownType(): boolean {
        if (!this.immediate) {
            return false;
        } else {
            return this.knownType;
        }
    }

    public getFrontColName(includePrefix: boolean = false): string {
        let name = this.name || "";
        if (includePrefix) {
            name = xcHelper.getPrefixColName(this.prefix, name);
        }
        return name;
    }

    public setFrontColName(name: string): boolean {
        if (typeof name === "string" && name !== "") {
            this.name = name;
            return true;
        } else {
            return false;
        }
    }

    public getBackColName(): string {
        return this.backName;
    }

    public setBackColName(backColName: string): boolean {
        if (backColName == null) {
            return false;
        }

        this.backName = backColName;
        this.prefix = xcHelper.parsePrefixColName(backColName).prefix;
        return true;
    }

    public getSortedColAlias(): string {
        return this.sortedColAlias;
    }

    public setSortedColAlias(colName: string): void {
        this.sortedColAlias = colName;
    }

    public setImmediateType(typeId: number): boolean {
        if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
            // error case
            console.error("Invalid typeId");
            return false;
        }

        this.immediate = true;
        this.knownType = true;
        if (typeId === DfFieldTypeT.DfFatptr) {
            console.error("Should not set fat pointer's type");
            this.immediate = false;
            this.knownType = false;
        } else {
            this.type = xcHelper.convertFieldTypeToColType(typeId);
            if (this.type == null) {
                // error case
                this.knownType = false;
            }
        }
        return true;
    }

    public getPrefix(): string {
        return this.prefix;
    }

    public getType(): ColumnType {
        return this.type;
    }

    public setType(type: ColumnType): void {
        this.type = type;
    }

    public updateType(val: string): void {
        if (this.isEmptyCol()) {
            return;
        } else if (this.isKnownType()) {
            // don't check for knownType
            return;
        } else {
            this.type = xcHelper.parseColType(val, this.type);
        }
    }

    public getDisplayWidth(): number | string {
        if (this.isMinimized &&
            typeof gHiddenColumnWidth !== "undefined"
        ) {
            return gHiddenColumnWidth;
        } else {
            return this.width;
        }
    }

    public getWidth(): number | string {
        return this.width;
    }

    public setWidth(width: number): void {
        this.width = width;
    }

    public getFormat(): ColFormat {
        if (this.format == null) {
            return ColFormat.Default;
        } else {
            return this.format;
        }
    }

    public setFormat(format: ColFormat): void {
        if (format === ColFormat.Default) {
            this.format = null;
        } else {
            this.format = format;
        }
    }

    public minimize(): void {
        this.isMinimized = true;
    }

    public maximize(): void {
        this.isMinimized = false;
    }

    public hasMinimized(): boolean {
        return this.isMinimized;
    }

    public getTextAlign(): ColTextAlign {
        return this.textAlign;
    }

    public setTextAlign(alignment: ColTextAlign | string | null): void {
        if (alignment == null) {
            return;
        }

        this.textAlign = <any>alignment;
    }

    public isNumberCol(): boolean {
        return (this.type === ColumnType.integer ||
                this.type === ColumnType.float);
    }

    public stringifyFunc(): string {
        let str: string = "";
        let parseHelper = (func) => {
            if (func.name) {
                str += func.name;
                str += "(";
            }

            let args = func.args;
            for (let i = 0; i < args.length; i++) {
                if (i > 0) {
                    str += ",";
                }

                if (typeof args[i] === "object") {
                    parseHelper(args[i]);
                } else {
                    str += args[i];
                }
            }
            if (func.name) {
                str += ")";
            }
        }

       try {
           parseHelper(this.func);
            return str;
        } catch (e) {
            console.error(e);
            return "";
        }
    }

    public parseFunc(): void {
        if (!this.userStr) {
            console.error("no userStr");
            return;
        }

        let funcString: string = this.userStr;
        // Everything must be in a "name" = function(args) format
        // var open = funcString.indexOf("\"");
        // var close = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
        // var name = funcString.substring(open + 1, close);
        let funcSt: string = funcString.substring(funcString.indexOf("=") + 1);

        let func = this._parseFuncString(funcSt);
        this.func = new ColFunc(func);
    }

    // not used
    public serialize(): string {
        return null;
    }

    // not used
    protected _getDurable() {
        return null;
    }

    // assumes we are sending in a valid func ex. map(add(3,2))
    private _parseFuncString(funcString: string): ColFuncDurable {
        let func: ColFuncDurable = {args: [], name: undefined};

        this._parseFuncStringHelper(funcString, func);

        func = func.args[0];
        return func;
    }

    private _parseFuncStringHelper(
        funcString: string,
        func: ColFuncDurable | ColFunc
    ): number {
        let tempString: string | number = "";
        let inQuotes: boolean = false;
        let singleQuote: boolean = false;
        let hasComma: boolean = false;
        let isEscaped: boolean = false;

        for (var i = 0; i < funcString.length; i++) {
            if (isEscaped) {
                tempString += funcString[i];
                isEscaped = false;
                continue;
            }

            if (inQuotes) {
                if ((funcString[i] === "\"" && !singleQuote) ||
                    (funcString[i] === "'" && singleQuote)) {
                    inQuotes = false;
                }
            } else {
                if (funcString[i] === "\"") {
                    inQuotes = true;
                    singleQuote = false;
                } else if (funcString[i] === "'") {
                    inQuotes = true;
                    singleQuote = true;
                }
            }

            if (funcString[i] === "\\") {
                isEscaped = true;
                tempString += funcString[i];
            } else if (inQuotes) {
                tempString += funcString[i];
            } else {
                if (funcString[i] === "(") {
                    let newFunc = new ColFunc({name: tempString.trim()});
                    func.args.push(newFunc);
                    tempString = "";
                    i += this._parseFuncStringHelper(funcString.substring(i + 1), newFunc);
                } else if (funcString[i] === "," || funcString[i] === ")") {
                    // tempString could be blank if funcString[i] is a comma
                    // after a )
                    if (tempString !== "") {
                        tempString = tempString.trim();

                        if (funcString[i] !== ")" || hasComma ||
                            tempString !== "") {

                        // true if it's an int or decimal, false if its anything
                        // else such as 0xff 1e2 or 023 -- we will keep these as
                        // strings to retain the formatting
                        // if "0" treat as 0, but if "010", treat as "010" to
                        // preserve it as "010" is 8 in base 8
                            if (/^[0-9.]+$/.test(tempString) &&
                            (tempString[0] !== "0" || tempString === "0")) {
                                if (func && func.name && func.name.indexOf("pull") > -1) {
                                    // treat as string if in pull function
                                } else {
                                    tempString = parseFloat(tempString);
                                }
                            }
                            func.args.push(tempString);
                        }
                        tempString = "";
                    }
                    if (funcString[i] === ")") {
                        break;
                    } else {
                        hasComma = true;
                    }
                } else {
                    tempString += funcString[i];
                }
            }
        }
        return (i + 1);
    }
}
