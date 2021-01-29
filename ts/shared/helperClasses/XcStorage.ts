
/* Storage */
// Here the use of factory is to hide the salt in the scope
// so outside can not see it
(function createXcStorage(): void {
    const salt: string = "All rights to use the secret key is reserved to Xcalar Inc";

    class XcStorage {
        private storage: LocalStorage;

        public constructor(storage) {
            this.storage = storage;
        }

        public setItem(key, value): boolean {
            try {
                const encodedVal: string = this._encode(value);
                this.storage.setItem(key, encodedVal);
            } catch (error) {
                // storage can be null when cookie is disabled
                console.error(error);
                return false;
            }
            return true;
        }

        public getItem(key: string): string {
            try {
                const encodedVal: string = this.storage.getItem(key);
                if (encodedVal == null) {
                    return null;
                }
                return this._decode(encodedVal);
            } catch (e) {
                // storage can be null when cookie is disabled
                console.error(e);
                return null;
            }
        }

        public removeItem(key: string): string {
            try {
                return this.storage.removeItem(key);
            } catch (e) {
                // storage can be null when cookie is disabled
                console.error(e);
                return null;
            }
        }

        private _encode(str: string): string {
            // null will be "null", that's how local/session storage handle it
            str = String(str);
            return CryptoJS.AES.encrypt(str, salt).toString();
        }

        private _decode(encodedStr: string): string {
            const encode: CryptoJS.Encoder = CryptoJS.enc.Utf8;
            return CryptoJS.AES.decrypt(encodedStr, salt).toString(encode);
        }
    }

    // storage can be null when cookie is disabled
    try {
        window.xcLocalStorage = new XcStorage(localStorage);
    } catch (e) {
        console.error(e);
        window.xcLocalStorage = new XcStorage(null);
    }

    try {
        window.xcSessionStorage = new XcStorage(sessionStorage);
    } catch (e) {
        console.error(e);
        window.xcSessionStorage = new XcStorage(null);
    }
}());
/* End of Storage */