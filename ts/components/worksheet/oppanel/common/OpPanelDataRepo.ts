/**
 * Component data model repository
 * @description
 * Use cases:
 * 1. Check data model changes
 * 2. Keep track of data model history
 */
class OpPanelDataRepo {
    private _dataHistory: string[] = [];
    private _options: {
        capacity: number,
    };

    private static _defaultCapacity = 10;

    public constructor(options?: {
        capacity?: number
    }) {
        const {
            capacity = OpPanelDataRepo._defaultCapacity
        } = (options || {});
        this._options = {
            capacity: capacity
        };
    }

    /**
     * Push the data model to the repo.
     * @param data The data model object
     * @returns A flag to indicate if the data model is changed. true: No change
     */
    public push(data: any): boolean {
        let newStr = '{}';
        if (data != null) {
            newStr = JSON.stringify(data);
        }

        const currentIndex = this._dataHistory.length - 1;
        if (currentIndex >= 0) {
            if (newStr === this._dataHistory[currentIndex]) {
                return true;
            }
        }

        this._dataHistory.push(newStr);
        if (this._dataHistory.length > this._options.capacity) {
            this._dataHistory.shift();
        }

        return false;
    }
}
