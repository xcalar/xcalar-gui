/**
 * To run in login.html, before scripts included in body via loginPart.html.
 * (there was a bug we encountered in IE and some browsers that
 * didn’t support ECMAScript 6. The browser would crash when it ran the code
 * in loginPart.html; this check should therefore be run before any of the
 * scripts in loginPart.html)
 */
window["isBrowserMicrosoft"] = false;
window["isBrowserEdge"] = false;
window["isBrowserIE"] = false;
window["isBrowserChrome"] = false;
window["isBrowserFirefox"] = false;
window["isBrowserSafari"] = false;
window["isSystemMac"] = false;
function browserCheck() {
    var userAgent = navigator.userAgent;
    if (/MSIE 10/i.test(userAgent)) {
       // this is internet explorer 10
        window.isBrowserMicrosoft = true;
        window.isBrowserIE = true;
    }

    if (/MSIE 9/i.test(userAgent) || /rv:11.0/i.test(userAgent)) {
        // this is internet explorer 9 and 11
        window.isBrowserMicrosoft = true;
        window.isBrowserIE = true;
    }

    if (/Edge/i.test(userAgent)) {
       // this is Microsoft Edge
        window.isBrowserMicrosoft = true;
        window.isBrowserEdge = true;

    }
    if (window.isBrowserMicrosoft) {

    } else if (/chrome/i.test(userAgent)) {
        window.isBrowserChrome = true;
    } else if (/firefox/i.test(userAgent)) {
        window.isBrowserFirefox = true;

    }

    if (/safari/i.test(userAgent) && !window.isBrowserChrome) {
        window.isBrowserSafari = true;
    }

    var version = getBrowser().version;

    if (window["isBrowserSafari"] ||
        window["isBrowserChrome"] ||
        window["isBrowserFirefox"] ||
        window["isBrowserEdge"]) {
        if ((window["isBrowserSafari"] && version < 10) ||
            (window["isBrowserChrome"] && version < 50) ||
            (window["isBrowserFirefox"] && version < 40)) {
            window["isBrowserSupported"] = false;
        } else {
            // any version of Edge is ok
            window["isBrowserSupported"] = true;
        }
    } else { // IE or opera or anything else is bad
        window["isBrowserSupported"] = false;
    }

    function getBrowser() {
        var ua=navigator.userAgent,tem,M=ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
        if(/trident/i.test(M[1])){
            tem=/\brv[ :]+(\d+)/g.exec(ua) || [];
            return {name:'IE',version:(tem[1]||'')};
        }
        if(M[1]==='Chrome'){
            tem=ua.match(/\bOPR|Edge\/(\d+)/)
            if(tem!=null)   {return {name:'Opera', version:tem[1]};}
        }
        M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
        if((tem=ua.match(/version\/(\d+)/i))!=null) {M.splice(1,1,tem[1]);}
        return {
        name: M[0],
        version: parseFloat(M[1])
        };
    }
}

browserCheck();
if (!window.isBrowserSupported) {
    alert("You are running an unsupported browser. Please use one of the " +
        "following browsers: Chrome (version 65+), Firefox " +
        "(version 59+), or Safari (version 11.1+)");
    document.write("You are running an unsupported browser. Please use one of the " +
        "following browsers: Chrome (version 65+), Firefox " +
        "(version 59+), or Safari (version 11.1+)");
}

