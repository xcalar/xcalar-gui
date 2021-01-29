/**
    Usage:
    1) var mutex = new Mutex(YOURKEY);
    2) concurrency = new Concurreny(mutex)
    2) concurrency.initLock();
    3) concurrency.lock(OPTIONAL TIMEOUT);
    4) concurrency.unlock();
*/
class Concurrency {
    private _mutex: Mutex;
    private _kvStore: KVStore;
    private _lockString: string;
    private _unlocked: string;
    private _backoffBasis: number;
    private _backoffTimeLimit: number;

    public constructor(mutex) {
        if (mutex == null || !(mutex instanceof Mutex)) {
            throw ConcurrencyEnum.NoLock;
        }
        this._mutex = mutex;
        this._kvStore = new KVStore(mutex.key, mutex.scope);
        this._unlocked = "0";
        this._backoffBasis = 100; // Start time for exponential backoff.
        this._backoffTimeLimit = 10 * 1000; // Max time allowed for a trial before
        // asking user for action
        this._lockString = null;
    }

    /**
     * concurrency.initLock
     * NOTE: This function can only be called ONCE by ONE instance.
     * Otherwise you are going to run into races
     */
    public initLock(): XDPromise<void> {
        return this._kvStore.get()
            .then((value) => {
                if (value == null) {
                    // console.log("initialize", this._mutex.key);
                    return this.putUnlockedValue();
                } else {
                    return PromiseHelper.reject(ConcurrencyEnum.AlreadyInit);
                }
            });
    }

    /**
     * concurrency.delLock
     */
    public delLock(): XDPromise<void> {
        return this._kvStore.delete();
    }

    /**
     * concurrency.lock
     * Caller must look out for deferred.reject(ConcurrencyEnum.OverLimit)
     * and handle it appropriately.
     * @param startBackoffBasis
     */
    public lock(startBackoffBasis: number): XDPromise<string> {
        const lockString: string = this.getLockString();
        const backoff: number = startBackoffBasis || this._backoffBasis;
        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        // Deferred will get resolved / rejected inside retryLock
        this.retryLock(lockString, deferred, backoff);
        return deferred.promise();
    }

    /**
     * concurrency.tryLock
     */
    public tryLock(): XDPromise<string> {
        // unless backoffTimeLimit is less than 2, otherwise this will cause
        // retryLock function to only run once
        return this.lock(this._backoffTimeLimit - 1);
    }

    /**
     * concurrency.unlock
     */
    public unlock(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this.getLockValue()
            .then((value) => {
                // console.log('unlock', value);
                if (value === this._lockString) {
                    // I was the one who locked it. Now I'm going to unlock it
                    return this.putUnlockedValue();
                } else {
                    // Looks like someone forced me out. Nothing for me to do
                    console.warn("Lock has been forcefully taken away, or " +
                        "unlocker is not the same as the locker. noop.");
                }
            })
            .then(() => {
                this.resetLockString();
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * concurrency.forceUnlock
     */
    public forceUnlock(): XDPromise<void> {
        return this.putUnlockedValue();
    }

    /**
     * concurrency.isLocked
     */
    public isLocked(): boolean {
        return this._lockString != null;
    }

    /**
     * concurrency.hasLockedValue
     */
    public hasLockedValue(): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();

        this.getLockValue()
        .then((val) => {
            const locked: boolean = (val !== this._unlocked);
            deferred.resolve(locked);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private getLockString(): string {
        const s: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const lockString: string = Array.apply(null, Array(88)).map(function() {
            return s.charAt(Math.floor(Math.random() * s.length));
        }).join('');
        return lockString;
    }

    private setLockString(lockString): void {
        this._lockString = lockString;
    }

    private resetLockString(): void {
        this._lockString = null;
    }

    private retryLock(
        lockString: string,
        deferred: XDDeferred<string>,
        timeout: number
    ): void {
        if (timeout > this._backoffTimeLimit) {
            deferred.reject(ConcurrencyEnum.OverLimit);
            return;
        }

        // No locks can stay locked across restarts because XD is dead by then
        this._kvStore.setIfEqual(this._unlocked, lockString, false, true)
            .then(({noKV}) => {
                if (noKV) {
                    // This happens when status is kvStore not found or kvEntry
                    // not found.
                    deferred.reject(ConcurrencyEnum.NoKVStore);
                } else {
                    // Return the dynamically generated lockString for unlock later
                    // console.log("lock key", this._mutex.key, "with", lockString);
                    this.setLockString(lockString);
                    deferred.resolve(lockString);
                }
            })
            .fail((tError) => {
                // XXX TODO: use the xcrpc status once the query status enum(xcrpc) is ready
                if (tError.status === StatusT.StatusKvEntryNotEqual) {
                    // Locked state. Exp backoff until time limit, and then ask the
                    // user for force / give up
                    // console.log("Retrying with timeout: " + timeout / 1000);
                    setTimeout(() => {
                        this.retryLock(lockString, deferred, timeout * 2);
                    }, timeout);
                } else {
                    deferred.reject(tError.error);
                }
            });
    }

    private getLockValue(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        this._kvStore.get()
            .then((value) => {
                if (value == null) {
                    console.warn(ConcurrencyEnum.NoKey);
                    deferred.reject(ConcurrencyEnum.NoKey);
                } else {
                    deferred.resolve(value);
                }
            })
            .fail(deferred.reject);

        return deferred.promise();
    }

    private putUnlockedValue(): XDPromise<void> {
        return this._kvStore.put(this._unlocked, false, true);
    }
}
