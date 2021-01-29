const puppeteer = require('puppeteer');
const fs = require('fs');
const exec = require("child_process").execSync;
const spawn = require('child_process').spawn;

const commandLineArgs = process.argv;

// Usage: npm test <testName> <hostname>
// E.g.: npm test unitTest https://cantor:8443
// valid testName: testSuite sqlTest expServer xcrpcTest
// unitTest unitTestOnDev XDFuncTest
let testName = "unitTestOnDev";
let hostname = "http://localhost:8888";
// Host name must be with protocol and whatever port
if (commandLineArgs.length > 2) {
    testName = commandLineArgs[2].trim();
    if (commandLineArgs.length > 3) {
        hostname = commandLineArgs[3].trim();;
    }
}

runTest(testName, hostname);

async function runTest(testType, hostname) {
    try {
        let browser;
        if (testType === "testSuite" || testType === "sqlTest") {
            browser = await puppeteer.launch({
                headless: true,
                ignoreHTTPSErrors: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else if (testType === "expServer") {
            let exitCode = 0;
            // try {
            //     let mochaTest = "npm test --prefix ../../../xcalar-gui/services/expServer";
            //     const output = exec(mochaTest, {encoding: 'utf8'});
            //     console.log(output)
            //     console.log("Expserver test passed.");
            // } catch (error) {
            //     console.log(error.stderr, error.stdout);
            //     console.log("Expserver test failed.");
            //     exitCode = error.status;
            // }
            // process.exit(exitCode);

            console.log("ExpServerTest START:" + new Date().getTime());

            const expServerTest = spawn('npm', ['test', '--prefix', '../../../xcalar-gui/services/expServer']);

            expServerTest.stdout.on('data', function (data) {
                console.log('ExpServerTest: ' + data.toString());
            });

            expServerTest.stderr.on('data', function (data) {
                console.log('ExpServerTest Error: ' + data.toString());
            });

            expServerTest.on('exit', function (code) {
                console.log('ExpServerTest exited with code ' + code.toString());
                console.log("ExpServerTest END:" + new Date().getTime());
                exitCode = code;
                process.exit(exitCode);
            });

            return;
        } else if(testType === "xcrpcTest") {
            let exitCode = 0;
            try {
                let mochaTest = "npm test --prefix ../../../xcalar-gui/assets/test/integrationTest/xcrpc/";
                const output = exec(mochaTest, {encoding: 'utf8'});
                console.log(output)
                console.log("xcrpc test passed.");
            } catch (error) {
                console.log(error.stderr, error.stdout);
                console.log("xcrpc test failed.");
                exitCode = error.status;
            }
            process.exit(exitCode);

        } else if (testType === "unitTest") {
            browser = await puppeteer.launch({
                headless: true,
                ignoreHTTPSErrors: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else if (testType === "unitTestOnDev") {
            browser = await puppeteer.launch({
                headless: false,
                ignoreHTTPSErrors: true
            });
        } else if (testType === "XDFuncTest") {
            return runFuncTests();
        } else {
            throw "Unspport!";
        }
        const page = await browser.newPage();
        await page.setViewport({width: 1920, height: 1076});

        addPageEvent(page);

        const userName = "unitTestUser" + Math.ceil(Math.random() * 100000 + 1);
        if (testType === "testSuite") {
            url = hostname + "/testSuite.html?type=testSuite&test=y&noPopup=y&animation=y&cleanup=y&close=y&user=ts-" + userName + "&id=0&workbook=testSuite";
        } else if (testType === "sqlTest") {
            url = hostname + "/testSuite.html?type=sql&test=y&noPopup=y&animation=y&cleanup=y&close=y&user=ts-" + userName + "&id=0&createWorkbook=sqlTest";
        } else {
            url = hostname + "/unitTest.html?noPopup=y&createWorkbook=y&user=" + userName;
        }
        // if (testType === "unitTestOnDev") {
        await page.coverage.startJSCoverage({ resetOnNavigation: true });
        // }
        console.log("Opening page:", url)
        await page.goto(url, {timeout: 120000});
        // time out after 1 day
        await page.waitForSelector('#testFinish', {timeout: 864000000});
        const results = await page.evaluate(() => document.querySelector('#testFinish').textContent);
        let exitCode = 1;
        if (results === "PASSED") {
            console.log("All passed!");
            exitCode = 0;
        } else {
            console.log("Failed: " + JSON.stringify(results));
        }

        // if (testType === "unitTestOnDev") {
        console.log("test finished, getting code coverage");
        const jsCoverage = await page.coverage.stopJSCoverage();
        getCoverage(jsCoverage, testType);
        // }

        if (testType !== "unitTestOnDev") {
            browser.close();
            process.exit(exitCode);
        }
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

function addPageEvent(page) {
    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i) {
            console.log(`${msg.args()[i]}`);
        }
    });

    page.on('error', error => {
        console.error("general error occurred:", error);
    });

    page.on('pageerror', error => {
        console.warn("Warning uncaught execption:", error);
    });

    page.on('requestfailed', request => {
        console.error("page failed to load:", request.url(), "Error:", request.failure().errorText);
    });
}

function getCoverage(coverage, testType) {
    let totalBytes = 0;
    let usedBytes = 0;
    const coverageToReport = [];
    const excludeFolders = [
        '/thrift/', '/sdk/', 'tutorial',
        '/components/sql/node', '/components/sql/operators', '/components/sql/rules/',
        '/xcrpc/', '/shared/Xcrpc/'
    ];
    const excludeFiles = ['config.js', 'loginConfig.js', 'compatible.js',
    'XcalarThrift.js', 'SQLCompiler.js', 'sqlTest.js', 'logicalOptimizer.js',
    'upgrader.js', 'librpc.js'];

    let entryMap = {};
    let entrySizeMap = {};
    for (const entry of coverage) {
        if (!entry.url.includes('assets/js')) {
            continue;
        }

        let shouldExclude = false;
        excludeFolders.forEach((name) => {
            if (entry.url.includes(name)) {
                shouldExclude = true;
                return false;
            }
        });

        if (shouldExclude) {
            continue;
        }

        shouldExclude = false;
        excludeFiles.forEach((name) => {
            if (entry.url.endsWith(name)) {
                shouldExclude = true;
                return false;
            }
        });

        if (shouldExclude) {
            continue;
        }

        // becuase of the iframe refresh, same url can occurl several times,
        // need to find the one that has the most coverage
        let url = entry.url;
        let bytes = 0;
        for (const range of entry.ranges) {
            bytes += range.end - range.start - 1;
        }

        if (!entryMap.hasOwnProperty(entry.url) ||
            bytes > entrySizeMap[url]
        ) {
            entryMap[url] = entry;
            entrySizeMap[url] = bytes;
        }
    }

    for (const url in entryMap) {
        const entry = entryMap[url];
        coverageToReport.push(entry);
        totalBytes += entry.text.length;
        usedBytes += entrySizeMap[url];
    }

    if (testType === "unitTestOnDev") {
        fs.writeFileSync("coverage/coverage.js", 'var coverage =' + JSON.stringify(coverageToReport));
    }
    if (testType === "unitTest") {
        fs.writeFileSync("coverage/coverage.json", JSON.stringify(coverageToReport));
    }
    console.log(`Bytes used: ${usedBytes / totalBytes * 100}%`);
}

// Runs the XD func tests as seperate pages based on number of users provided
async function runFuncTests() {
    let browser;
    let numOfUsers = 1, iterations = 200, seed="";
    console.log(commandLineArgs);
    numOfUsers = commandLineArgs[4] || numOfUsers;
    iterations = commandLineArgs[5] || iterations;
    seed = commandLineArgs[6] || seed;
    browser = await puppeteer.launch({
        headless: true,
        ignoreHTTPSErrors: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    let pages = [];
    let iter = 1;
    while (iter <= numOfUsers) {
        let userName = `admin${iter}`;
        let page = await browser.newPage();
        await page.setViewport({width: 1920, height: 1076});

        page.on('console', msg => {
            for (let i = 0; i < msg.args().length; ++i)
            console.log(`${userName} ${msg.args()[i]}`);
        });

        url = `${hostname}/funcTest.html?noPopup=y&animation=y&cleanup=y&user=${userName}&iterations=${iterations}&seed=${seed}`;
        console.log("Opening page:", url)
        try {
            await page.goto(url, {timeout: 120000});
            pages.push(page);
        } catch (error) {
           console.log(`Error opening url: ${url}`, error);
        }
        iter++;
    }
    let exitCode = 0;
    try {
        await Promise.all(pages.map(async (page) => {
            return new Promise((resolve, reject) => {
                // time out after 1 day
                page.waitForSelector('#testFinish', { timeout: 864000000 }).then(function () {
                    return page.evaluate(() => document.querySelector('#testFinish').textContent);
                }).then(function (result) {
                    if (result === "PASSED") {
                        console.log("Test passed for URL => ", page.url());
                        resolve();
                    } else {
                        console.log("Test failed for URL => ", page.url());
                        reject();
                    }
                }).catch(function () {
                    //reject the promise
                    console.log("Test failed for URL => ", page.url());
                    reject();
                });
            });
        }));
    } catch (error) {
       exitCode = 1;
       console.log("Tests failed!");
       console.log(error);
    }
    console.log("Tests finished!!!");
    browser.close();
    process.exit(exitCode);
}
