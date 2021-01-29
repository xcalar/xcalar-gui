module.exports = {
    reporter : function(results, done) {
        console.log(`XD e2etest passed = ${results.failed === 0}`)
        // console.log(results);
        done();
    },
    "default": {
        user: "dftest",
        buildTestUrl: function(browser, user) {
            return `${browser.globals.launchUrl}testSuite.html?
                test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${user}&id=0`
        }
    },
    "jenkins": {
        user: "dftest",
        buildTestUrl: function(browser, user) {
            return `${browser.globals.launchUrl}testSuite.html?
                test=n&noPopup=y&animation=y&cleanup=y&close=y&user=${user}&id=0`
        }
    }
};