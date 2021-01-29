/**
 * vars to be set at build time by Grunt,
 * and made avaialble to HTML templating (htmlTStr.js),
 * and to jsTStr.js.
 */
var autogenVars = (function(autogenVars) {
    autogenVars.prodName = "<% XD_PROD_NAME %>"; // set with grunt option --branding
    return autogenVars;
})({});

if (typeof exports !== "undefined") {
    if (typeof module !== "undefined" && module.exports) {
        exports = module.exports = autogenVars;
    }
    exports.autogenVars = autogenVars;
}
