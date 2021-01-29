var xcConsole = {
    "verbose": function() {
        return true;
    },
    "log": function(error) {
        if (this.verbose()) {
            console.log(getTimeStamp() + ":Xcalar ExpServer:",
            error);
        }
    }
};
function getTimeStamp() {
    var date = new Date();
    return toISOString(date) + getTimezone(date);

    function pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }

    function toISOString(date) {
        return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        '.' + (date.getMilliseconds() / 1000).toFixed(6).slice(2, 8) +
        'Z';
    }

    function getTimezone(date) {
        var pattern = /-\d*/;
        return pattern.exec(date.toTimeString());
    }
}
if (process.env.NODE_ENV === "test") {
    exports.getTimeStamp = getTimeStamp;
}
exports.xcConsole = xcConsole;
