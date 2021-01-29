var XCPatch;
(function(XCPatch) {
    console.log("dynamic loaded");
    gPatchVersion = null;
    var fullVersion = XVM.getVersion();
    var patchVersionDict = {
        "1.3.0": 1,
        "1.3.1": 1,
        "1.4.0": 7,
        "1.4.0.1": 2,
        "1.4.1": 1
    };

    // Insert patch code here. Remembmer that all js files will be minified and
    // uglified
    function lowerVersion(v1str, v2str) {
        var v1 = v1str.split(".");
        var v2 = v2str.split(".");
        if (1 * v1[0] !== 1 * v2[0]) {
            return (1 * v1[0] < 1 * v2[0]);
        }
        if (1 * v1[1] !== 1 * v2[1]) {
            return (1 * v1[1] < 1 * v2[1]);
        }
        if (1 * v1[2] !== 1 * v2[2]) {
            return (1 * v1[2] < 1 * v2[2]);
        }
    }

    function exactVersion(v1str, v2str) {
        return (v1str === v2str);
    }

    function addPatch(version) {
        var dynamicSrc = "https://www.xcalar.com/xdscripts/dynamic-" + version + ".js";
        var randId = "" + Math.ceil(Math.random() * 100000);
        var src = dynamicSrc + "?r=" + randId;
        return $.getScript(src);
    }

    function setPatchVersion(patchVersion) {
        gPatchVersion = patchVersionDict[patchVersion];
    }


    try {
        var version = fullVersion.split("-")[0];
        if (lowerVersion(version, "1.3.1")) {
            // any version before 1.3.1, there is no XCPatch.patch defined
            // load dynamic-1.3.0.js directly
            setPatchVersion("1.3.0");
            addPatch("1.3.0");
        } else if (exactVersion(version, "1.3.1")) {
            // 1.3.1 also don't have XCPatch.patch
            setPatchVersion("1.3.1");
            addPatch("1.3.1");
        } else {
            XCPatch.patch = function() {
                var patchVersion;
                if (exactVersion(version, "1.4.0")) {
                    patchVersion = "1.4.0";
                } else if (exactVersion(version, "1.4.0.1")) {
                    patchVersion = "1.4.0.1";
                } else if (exactVersion(version, "1.4.1")) {
                    patchVersion = "1.4.1";
                }

                if (patchVersion != null) {
                    setPatchVersion(patchVersion);
                    return addPatch(patchVersion);
                } else {
                    return null;
                }
            };
        }

    } catch(e) {
        console.error(e);
    }
})(XCPatch || (XCPatch = {}));