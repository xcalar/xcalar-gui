// if using in browser, make sure to include assets/lang/en/globalAutogen.js
// with <script tag

// window always defined running in nwjs, even in node context
// but in node context, window.autogenVars won't be defined and need to require
var autogenVars = ((typeof window === 'undefined' || typeof window.autogenVars === 'undefined') && typeof require !== 'undefined') ? require('./../../lang/en/globalAutogen.js') : window.autogenVars;

XPEStr = {
    "prodname": autogenVars.prodName
};
