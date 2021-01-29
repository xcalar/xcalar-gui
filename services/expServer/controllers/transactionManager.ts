import UserActivityManager from "./userActivityManager";

interface tx {
    operation: string,
    startTime: number,
    interval: any // setInterval
};
// TransactionManger tracks xce requests and updates user's activity
class TransactionManager {
    private static _instance = null;
    public static get getInstance(): TransactionManager {
        return this._instance || (this._instance = new this());
    }

    private _txCache: Map<number, tx> = new Map();
    private _txIdCount: number = 1;
    private _checkTime: number = 60 * 1000;

    private constructor() {}

    // assign the operation an id, tell UserActivityManager that user is active,
    // and keep telling UserActivityManager that user is active until operation is complete
    public start(operation: string): number {
        operation = operation || "n/a";
        const txId: number = this._txIdCount;
        const interval = setInterval(() => {
            // update activity every minute the operation is running
            UserActivityManager.updateUserActivity();
        }, this._checkTime);

        const tx: tx = {
            operation: operation,
            interval: interval,
            startTime: Date.now()
        };
        this._txCache.set(txId, tx);
        this._txIdCount++;

        UserActivityManager.updateUserActivity();

        return txId;
    }

    // update UserActivityManager 1 more time and stop the operation's
    // interval, then remove the transaction
    // XXX we can store this operation here in the future
    public done(txId: number): void {
        UserActivityManager.updateUserActivity();
        if (this._txCache.has(txId)) {
            const tx = this._txCache.get(txId);
            clearInterval(tx.interval);
            this._txCache.delete(txId);
        }
    }

    public hasPendingTransactions(): boolean {
        return this._txCache.size > 0;
    }
}

export default TransactionManager.getInstance;