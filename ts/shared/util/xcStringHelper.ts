namespace xcStringHelper {
    /**
     * xcStringHelper.replaceInsideQuote
     * @param str
     * @param quoteChar
     */
    export function replaceInsideQuote(str: string, quoteChar: string): string {
        // baisc case '/(?=")(?:"[^"\\]*(?:\\[\s\S][^"\\]*)*")/g'
        const regExStr: string = `(?=${quoteChar})(?:${quoteChar}[^${quoteChar}\\\\]*(?:\\\\[\\s\\S][^${quoteChar}\\\\]*)*${quoteChar})`;
        const regEx: RegExp = new RegExp(regExStr, 'g');
        return str.replace(regEx, '');
    }

    /**
     * xcStringHelper.fullTextRegExKey
     * @param searchKey
     */
    export function fullTextRegExKey(searchKey: string): string {
        // Make it a full-text regex search
        return (searchKey + '$');
    }

    /**
     * containRegExKey
     * @param searchKey
     */
    export function containRegExKey(searchKey: string): string {
        // Make it a "contain" regex search, i.e. prepend .* and append .*
        return ('.*' + searchKey + '.*');
    }

    /**
     * xcStringHelper.getFileNamePattern
     * @param pattern
     * @param isRegex
     */
    export function getFileNamePattern(
        pattern?: string,
        isRegex?: boolean
    ): string {
        if (pattern == null) {
            return "";
        }

        var regexPrefix = isRegex ? "re:" : "";
        return (regexPrefix + pattern);
    }

    /**
     * xcStringHelper.listToEnglish
     * takes ["a", "b", "c"] and returns "a, b, and c"
     * @param list
     */
    export function listToEnglish(list: string[]): string {
        if (list.length === 1) {
            return list[0];
        } else if (list.length === 2) {
            return list[0] + " and " + list[1];
        } else if (list.length > 2) {
            let str = "";
            for (let i = 0; i < list.length; i++) {
                if (i === list.length - 1) {
                    str += "and " + list[i];
                } else {
                    str += list[i] + ", ";
                }
            }
            return str;
        } else {
            return "";
        }
    }

    /**
     * xcStringHelper.capitalize
     * @param str
     */
    export function capitalize(str: string): string {
        if (!str) {
            return str;
        }
        return str[0].toUpperCase() + str.slice(1);
    }

     /**
     * xcStringHelper.replaceMsg
     * replaces is an object, its keys are the mark strings to replace
     * each key's value is the string to replace with
     * @param txt
     * @param replaces
     */
    export function replaceMsg(
        txt: string,
        replaces: object = {},
        isGlobal: boolean = false
    ): string {
        return replaceTemplate(
            txt,
            Object.keys(replaces).reduce((res, key) => {
                res[`<${key}>`] = replaces[key];
                return res;
            }, {}),
            isGlobal
        );
    }

    /**
     * xcStringHelper.replaceTemplate
     * @param txt Template string
     * @param replaces An object. key is the string/regex to be replaced. value is the string to replace with.
     * @param isGlobal true: replace all matches; false: replace the first math
     * @param isSQLMatch true: do case insensitive match with a check; false: case sensitive
     * @example replaceTemplate('Replace <me>', {'<me>': 'you'}). The output is 'Replace you'.
     */
    export function replaceTemplate(
        txt: string,
        replaces: object = {},
        isGlobal: boolean = false,
        isSQLMatch: boolean = false
    ): string {
        try {
            let flag = isGlobal ? 'g' : undefined;
            let flag2;
            if (isSQLMatch) {
                flag2 = isGlobal ? 'gi' : "i";
            }
            // First round do exact match
            for (let key in replaces) {
                const str: string = replaces[key];
                if (str == null) {
                    continue;
                }

                txt = txt.replace(new RegExp(key, flag), str);
            }
            // For SQL, do a second round case insensitively
            if (isSQLMatch) {
                for (let key in replaces) {
                    if (isSQLMatch && txt.match(new RegExp(key, flag2)) && !Alert.isOpen()) {
                        // Check if duplicate (case insensitive) exist in param list
                        let findDup: boolean = false;
                        for (let key2 in replaces) {
                            if (key != key2 && key.match(new RegExp(key2, 'i'))) {
                                findDup = true;
                                break;
                            }
                        }
                        if (findDup) {
                            Alert.show({
                                title: SQLErrTStr.Warning,
                                msg: SQLErrTStr.DuplicateParamNames + key.toUpperCase(),
                                isAlert: true,
                                align: "left",
                                preSpace: true,
                                sizeToText: true
                            });
                        }
                    }
                    const str: string = replaces[key];
                    if (str == null) {
                        continue;
                    }

                    txt = txt.replace(new RegExp(key, flag2), str);
                }
            }
        } catch(e) {
            console.error(e);
        }

        return txt;
    }


    /**
     * xcUIHelper.escapeDblQuoteForHTML
     * @param str
     */
    export function escapeDblQuoteForHTML(str: string): string {
        return str.replace(/\"/g, "&quot;");
    }

    /**
     * xcUIHelper.escapeDblQuote
     * used for $el.find(str) when str is '[data-val="val"ue"]'
     * @param str
     */
    export function escapeDblQuote(str: string): string {
        return str.replace(/\"/g, "\\\"");
    }

    /**
     * xcStringHelper.isStartWithLetter
     * @param str
     */
    export function isStartWithLetter(str: string): boolean {
        if (str == null) {
            return false;
        }
        return /^[a-zA-Z]/.test(str);
    }

    /**
     * xcStringHelper.escapeNonPrintableChar
     * @param str - str to escapse
     * @param replace - char that replcae the non printable chars
     */
    export function escapeNonPrintableChar(str: string, replace: string): string {
        try {
            // this special chars is coming from CodeMirror
            const specialChars: RegExp = /[\t\u0000-\u0019\u00ad\u200b-\u200f\u2028\u2029\ufeff]/g
            const replaceChar: string = replace;
            return str.replace(specialChars, replaceChar);
        } catch (e) {
            console.error(e);
            return str;
        }
    }

    /**
     * xcStringHelper.escapeHTMLSpecialChar
     * @param str - str to replace
     * @param ignoreTab - ignore tab or not
     */
    export function escapeHTMLSpecialChar(
        str: string,
        ignoreTab?: boolean
    ): string {
        try {
            // esacpe & to &amp;, so text &quot; will not become " in html
            // escape < & > so external html doesn't get injected
            str = str.replace(/\&/g, '&amp;')
                    .replace(/\</g, '&lt;')
                    .replace(/\>/g, '&gt;');
            if (!ignoreTab) {
                str = str.replace(/\\t/g, '&emsp;');
            }
        } catch (e) {
            console.error(e);
        }

        return str;
    }

    /**
     * xcStringHelper.escapeRegExp
     * @param str
     */
    export function escapeRegExp(str: string): string {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }

    /**
     * xcStringHelper.camelCaseToRegular
     * turns camelCase to Camel Case
     * @param str
     */
    export function camelCaseToRegular(str: string): string {
        const res: string = str.replace(/([A-Z])/g, ' $1')
                                .replace(/^./, (str) => str.toUpperCase())
                                .trim();
        return res;
    }

    /**
     * xcStringHelper.numToStr
     * adds commas to large numbers (52000 becomes "52,000")
     * @param value
     * @param maxDecimals
     */
    export function numToStr(
        value: number | null | undefined,
        maxDecimals: number = 3
    ): string | null | undefined {
        if (value === null) {
            return null;
        }
        if (value === undefined) {
            return undefined;
        }

        let temNum: number = value;
        let res: string = value + "";

        if (value != null) {
            temNum = Number(value);
            if (isNaN(temNum)) {
                return res;
            }

            const n: number = Math.pow(10, maxDecimals);
            if (temNum !== 0 && Math.abs(temNum * n) < 1) {
                res = temNum.toExponential();
            } else {
                res = temNum.toLocaleString("en", {
                    "maximumFractionDigits": maxDecimals
                });
            }
        }
        return res;
    }
}
if (typeof exports !== "undefined") {
    exports.xcStringHelper = xcStringHelper;
}