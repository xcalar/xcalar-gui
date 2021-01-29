namespace xcTimeHelper {
    let timeOffset: number = 0; // diff between server time and browser's time

    // xcTimeHelper.setup
    export function setup(): XDPromise<any> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        moment.relativeTimeThreshold('s', 8);
        moment.relativeTimeThreshold('m', 55); // test
        xcTimeHelper.resetMoment();
        const startTime = Date.now();
        getServerTime()
        .then((time) => {
            if (time && !isNaN(time)) {
                time = parseInt(time);
                timeOffset = Math.round(((Date.now() + startTime) / 2) - time);
            }
            deferred.resolve();
        })
        .fail(deferred.resolve);
        return deferred.promise();
    }

    // xcTimeHelper.resetMoment
    export function resetMoment(): void {
        moment.updateLocale('en', {
            calendar: {
                lastDay: '[Yesterday] LT',
                sameDay: '[Today] LT',
                nextDay: '[Tomorrow] LT',
                // lastWeek: '[last] dddd LT',
                lastWeek: 'dddd LT',
                nextWeek: 'dddd LT',
                sameElse: 'll'
            }
        });
    };

    interface TipOption {
        container?: string;
        prefix?: string;
    }

    /*
     * xcTimeHelper.getDateTip
     * returns tooltip string for dates
     * date can be date timestamp or moment object
     */
    export function getDateTip(date: Date | any, options: TipOption = <TipOption>{}): string {
        if (typeof date !== "object" || !date._isAMomentObject) {
            date = moment(date);
        }
        const container: string = options.container || "body";
        const prefix = options.prefix || "";
        const title: string = prefix + date.format("h:mm:ss A M-D-Y");
        return ' data-toggle="tooltip" data-placement="auto top" ' +
                'data-container="' + container +
                '" data-original-title="' + title + '" ';
    };

    /*
     * xcTimeHelper.getDateTip
     * returns tooltip string for dates
     * date can be date timestamp or moment object
     */
    export function reactGetDateTip(date: Date | any, options: TipOption = <TipOption>{}): object {
        if (typeof date !== "object" || !date._isAMomentObject) {
            date = moment(date);
        }
        const container: string = options.container || "body";
        const prefix = options.prefix || "";
        const title: string = prefix + date.format("h:mm:ss A M-D-Y");
        return {"data-toggle": "tooltip",
                "data-placement": "top",
                "data-container": container,
                "data-original-title": title
        };
    };

    export function getServerTime(): JQueryPromise<any> {
        const action: string = "GET";
        const url: string = "/service/getTime";
        return xcHelper.sendRequest(action, url);
    }

    export function now(): number {
        return Date.now() - timeOffset;
    }

    /**
     * xcHelper.timeStampConvertSeconds
     * Converts the timestamp from seconds to Days Hours Minutes Seconds
     * @param timeInSeconds
     * @param noZeros {boolean} if true will not show values if is 0
     */
    export function timeStampConvertSeconds(
        timeInSeconds: number,
        noZeros: boolean
    ): string {
        const days: number = Math.floor(timeInSeconds / (24 * 60 * 60));
        timeInSeconds -= days * 24 * 60 * 60;
        const hours: number = Math.floor(timeInSeconds / (60 * 60));
        timeInSeconds -= hours * 60 * 60;
        const minutes: number = Math.floor(timeInSeconds / 60);
        timeInSeconds -= minutes * 60;
        const seconds: number = timeInSeconds;
        let dateString: string = "";
        let nonZeroFound = false;

        // Lol, grammatically, it's 0 hours, 1 hour, 2 hours, etc.
        if (!noZeros || days !== 0) {
            dateString += days + " day";
            dateString += days !== 1 ? "s": "";
            dateString += ", ";
            nonZeroFound = true;
        }

        if ((!noZeros || hours !== 0) || nonZeroFound) {
            dateString += hours + " hour";
            dateString += hours !== 1 ? "s": "";
            dateString += ", ";
            nonZeroFound = true;
        }

        if ((!noZeros || minutes !== 0) || nonZeroFound) {
            dateString += minutes + " minute";
            dateString += minutes !== 1 ? "s": "";
            dateString += ", ";
        }

        dateString += seconds + " second";
        dateString += seconds !== 1 ? "s": "";

        return dateString;
    }

        /**
     * xcTimeHelper.getElapsedTimeStr
     * @param milliSeconds - integer
     * @param round - boolean, if true will round down to nearest second
     * when value is greater than 1second. 3120 becomes 3s instead of 3.12
     * @param rejectZero - 0 to be treated as N/A
     */
    export function getElapsedTimeStr(
        milliSeconds: number | string,
        round?: boolean,
        rejectZero?: boolean
    ): string {
        if (!milliSeconds && rejectZero || typeof milliSeconds === "string") {
            return CommonTxtTstr.NA;
        }

        const s: number = Math.floor(milliSeconds / 1000);
        const seconds: number = Math.floor(s) % 60;
        const minutes: number = Math.floor((s % 3600) / 60);
        const hours: number = Math.floor(s / 3600);
        let timeString: string = '';

        if (hours > 0) {
            timeString += hours + "h ";
        }
        if (minutes > 0) {
            timeString += minutes + "m ";
        }

        if (milliSeconds < 1000) {
            timeString += milliSeconds + "ms";
        } else {
            timeString += seconds;
            if (milliSeconds < 60000 && !round) {// between 1 and 60 seconds
                let mills: number = milliSeconds % (seconds * 1000);
                if (milliSeconds < 10000) { // single digit seconds ex. 9s
                    mills = Math.floor(mills / 10);
                    let millStr = mills + "";
                    if (mills < 10) {
                        millStr = "0" + millStr;
                    }
                    timeString += "." + millStr;
                } else {
                    timeString += "." + Math.floor(mills / 100);
                }
            }
            timeString += "s";
        }

        return timeString;
    }

    /**
     * xcTimeHelper.getCurrentTimeStamp
     */
    export function getCurrentTimeStamp(): number {
        return new Date().getTime();
    }

    /**
     * xcTimeHelper.getDate, format is mm-dd-yyyy
     * @param delimiter
     * @param date
     * @param timeStamp
     */
    export function getDate(
        delimiter: string = '-',
        date: Date | null,
        timeStamp: string | null
    ): string {
        const resDate: Date = genDate(date, timeStamp);
        return resDate.toLocaleDateString().replace(/\//g, delimiter);
    }

    function genDate(date: Date | null, timeStamp: string | null): Date {
        if (date == null) {
            date = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }
        return date;
    }
}

if (typeof exports !== "undefined") {
    exports.xcTimeHelper = xcTimeHelper;
}