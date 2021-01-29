// XXX TODO: rename or clean up this file
class Authentication {
    private static uid_deprecated: XcUID;
    private static uid: XcUID;
    private static idCount: number;
    private static idIncTimer;

    /**
     * Authentication.setup
     */
    public static async setup(): Promise<void> {
        try {
            const idCountStr = await this._getIdCountKVStore().get();
            this.idCount = idCountStr ? Number(idCountStr) : 0;
        } catch (e) {
            console.error("fetch id count failed: " + e);
        }
    }

    /**
     * Authentication.getHashId
     */
    public static getHashId(excludeHash?: boolean): string {
        const idCount: string = this._getUId_depreacated().gen();
        if (excludeHash) {
            return (idCount + '');
        } else {
            return ("#" + idCount);
        }
    }

    /**
     * Authentication.getTableId
     */
    public static getTableId(): string {
        let idCount: string;
        if (xcHelper.isNodeJs() || this.idCount == null) {
            return this._getHeadLessTableUid().gen();
        } else {
            idCount = "v" + this.idCount;
            this.incIdCount();
        }

        return ("#" + idCount);
    }

    private static _getUId_depreacated(): XcUID {
        if (this.uid_deprecated == null) {
            // Note that . and - is not good for HTML rendering reason
            // so here the choice is _
            this.uid_deprecated = new XcUID("t");
            this.uid_deprecated.setGenerator((prefix: string, count: number): string => {
                return prefix + "_" + new Date().getTime() + "_" + count;
            });
        }
        return this.uid_deprecated;
    }

    private static _getHeadLessTableUid(): XcUID {
        if (this.uid == null) {
            this.uid = new XcUID("v");
            this.uid.setGenerator((prefix: string, count: number): string => {
                const date = new Date();
                return prefix + "_" + count + "_" +
                        date.getUTCFullYear() + "-" +
                        (date.getUTCMonth() + 1) + "-" +
                        date.getUTCDate() + "T" +
                        date.getUTCHours() +
                        date.getUTCMinutes() +
                        date.getUTCSeconds() + "Z";
            });
        }
        return this.uid;
    }

    private static _getIdCountKVStore(): KVStore {
        const key: string = KVStore.getKey("gIdCountKey");
        return new KVStore(key, gKVScope.WKBK);
    }

    private static incIdCount(): void {
        this.idCount++;
        clearTimeout(this.idIncTimer);
        this.idIncTimer = setTimeout(() => {
            this._getIdCountKVStore().put(String(this.idCount), true);
        }, 1000); // 1s interval
    }
}