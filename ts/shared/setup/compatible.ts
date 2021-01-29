namespace Compatible {
    window["isBrowserMicrosoft"] = false;
    window["isBrowserEdge"] = false;
    window["isBrowserIE"] = false;
    window["isBrowserChrome"] = false;
    window["isBrowserFirefox"] = false;
    window["isBrowserSafari"] = false;
    window["isSystemMac"] = false;

    /**
     * Compatible.check
     * checks all compatibility
     */
    export function check(): void {
        stringCheck();
        browserCheck();
        systemCheck();
        featureCheck();
        extraCheck();
    };

    function stringCheck(): void {
        // XXX(Always Open) check if those functions are already
        // supported by all browsers frequently

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith
        if (!String.prototype.startsWith) {
            String.prototype.startsWith = function(searchString: string, position: number): boolean {
                position = position || 0;
                return this.indexOf(searchString, position) === position;
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith
        if (!String.prototype.endsWith) {
            String.prototype.endsWith = function(searchString: string, position: number): boolean {
                var subjectString: string = this.toString();
                if (position === undefined || position > subjectString.length) {
                    position = subjectString.length;
                }
                position -= searchString.length;
                var lastIndex: number = subjectString.indexOf(searchString, position);
                return lastIndex !== -1 && lastIndex === position;
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
        if (!String.prototype.includes) {
            String.prototype.includes = function(): boolean {'use strict';
                return String.prototype.indexOf.apply(this, arguments) !== -1;
            };
        }

        // custom
        if (!String.prototype.trimLeft) {
            String.prototype.trimLeft = function (): string {
                return String(this).replace(/^\s+/, '');
            };
        }

        // custom
        if (!String.prototype.trimRight) {
            String.prototype.trimRight = function(): string {
                return String(this).replace(/\s+$/, '');
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
        if (!Number.prototype["isInteger"]) {
            Number.isInteger = function(value: any): boolean {
                return (typeof value === "number" &&
                        isFinite(value) &&
                        Math.floor(value) === value);
            };
        }

        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
        if (!Array.prototype.map) {
            Object.defineProperty(Array.prototype, "map", {
                enumerable: false,
                writable: false,
                configurable: false,
                value: function(callback: Function, thisArg: any) {
                    var T: any, A: any[], k: number;

                    if (this == null) {
                        throw (' this is null or not defined');
                    }

                    // 1. Let O be the result of calling ToObject passing the |this|
                    //    value as the argument.
                    var O: object = Object(this);

                    // 2. Let lenValue be the result of calling the Get internal
                    //    method of O with the argument "length".
                    // 3. Let len be ToUint32(lenValue).
                    var len: number = O["length"] >>> 0;

                    // 4. If IsCallable(callback) is false, throw a TypeError exception.
                    // See: http://es5.github.com/#x9.11
                    if (typeof callback !== 'function') {
                        throw (callback + ' is not a function');
                    }

                    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
                    if (arguments.length > 1) {
                        T = thisArg;
                    }

                    // 6. Let A be a new array created as if by the expression new Array(len)
                    //    where Array is the standard built-in constructor with that name and
                    //    len is the value of len.
                    A = new Array(len);

                    // 7. Let k be 0
                    k = 0;

                    // 8. Repeat, while k < len
                    while (k < len) {
                        var kValue: any, mappedValue: any;

                        // a. Let Pk be ToString(k).
                        //   This is implicit for LHS operands of the in operator
                        // b. Let kPresent be the result of calling the HasProperty internal
                        //    method of O with argument Pk.
                        //   This step can be combined with c
                        // c. If kPresent is true, then
                        if (k in O) {
                        // i. Let kValue be the result of calling the Get internal
                        //    method of O with argument Pk.
                            kValue = O[k];

                            // ii. Let mappedValue be the result of calling the Call internal
                            //     method of callback with T as the this value and argument
                            //     list containing kValue, k, and O.
                            mappedValue = callback.call(T, kValue, k, O);

                            // iii. Call the DefineOwnProperty internal method of A with arguments
                            // Pk, Property Descriptor
                            // { Value: mappedValue,
                            //   Writable: true,
                            //   Enumerable: true,
                            //   Configurable: true },
                            // and false.

                            // In browsers that support Object.defineProperty, use the following:
                            // Object.defineProperty(A, k, {
                            //   value: mappedValue,
                            //   writable: true,
                            //   enumerable: true,
                            //   configurable: true
                            // });

                            // For best browser support, use the following:
                            A[k] = mappedValue;
                        }
                        // d. Increase k by 1.
                        k++;
                    }

                    // 9. return A
                    return A;
                }
            });
        }

        if (!Array.prototype.fill) {
            Object.defineProperty(Array.prototype, 'fill', {
                enumerable: false,
                writable: false,
                configurable: false,
                value: function(value: any): object {

                    // Steps 1-2.
                    if (this == null) {
                        throw new TypeError('this is null or not defined');
                    }

                    var O: object = Object(this);

                    // Steps 3-5.
                    var len: number = O["length"] >>> 0;

                    // Steps 6-7.
                    var start: number = arguments[1];
                    var relativeStart: number = start >> 0;

                    // Step 8.
                    var k: number = relativeStart < 0 ?
                    Math.max(len + relativeStart, 0) :
                    Math.min(relativeStart, len);

                    // Steps 9-10.
                    var end: number = arguments[2];
                    var relativeEnd: number = end === undefined ?
                    len : end >> 0;

                    // Step 11.
                    var final: number = relativeEnd < 0 ?
                    Math.max(len + relativeEnd, 0) :
                    Math.min(relativeEnd, len);

                    // Step 12.
                    while (k < final) {
                        O[k] = value;
                        k++;
                    }

                    // Step 13.
                    return O;
                }
            });
        }

        if (!Array.prototype.includes) {
            Object.defineProperty(Array.prototype, "includes", {
                enumerable: false,
                writable: false,
                configurable: false,
                value: function(searchElement: any): boolean {
                    'use strict';
                    if (this == null) {
                        throw ('Array.prototype.includes called on null or undefined');
                    }

                    var O: object = Object(this);
                    var len = parseInt(O["length"], 10) || 0;
                    if (len === 0) {
                        return false;
                    }
                    var n: number = parseInt(arguments[1], 10) || 0;
                    var k: number;
                    if (n >= 0) {
                        k = n;
                    } else {
                        k = len + n;
                        if (k < 0) {k = 0;}
                    }
                    var currentElement: any;
                    while (k < len) {
                        currentElement = O[k];
                        if (searchElement === currentElement ||
                            (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
                            return true;
                        }
                        k++;
                    }
                    return false;
                }
            });
        }

        if (!Array.from) {
            Array.from = (function (): any {
                var toStr: Function = Object.prototype.toString;
                var isCallable: Function = function (fn: Function): boolean {
                    return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
                };
                var toInteger: Function = function (value: any): number {
                    var number: number = Number(value);
                    if (isNaN(number)) { return 0; }
                    if (number === 0 || !isFinite(number)) { return number; }
                    return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
                };
                var maxSafeInteger: number = Math.pow(2, 53) - 1;
                var toLength: Function = function (value: any): number {
                    var len: number = toInteger(value);
                    return Math.min(Math.max(len, 0), maxSafeInteger);
                };

                // The length property of the from method is 1.
                return function from(arrayLike: any/*, mapFn, thisArg */) {
                    // 1. Let C be the this value.
                    var C: any = this;

                    // 2. Let items be ToObject(arrayLike).
                    var items: object = Object(arrayLike);

                    // 3. ReturnIfAbrupt(items).
                    if (arrayLike == null) {
                        throw new TypeError('Array.from requires an array-like object - not null or undefined');
                    }

                    // 4. If mapfn is undefined, then let mapping be false.
                    var mapFn: Function = arguments.length > 1 ? arguments[1] : void undefined;
                    var T: any;
                    if (typeof mapFn !== 'undefined') {
                        // 5. else
                        // 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
                        if (!isCallable(mapFn)) {
                            throw new TypeError('Array.from: when provided, the second argument must be a function');
                        }

                        // 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
                        if (arguments.length > 2) {
                            T = arguments[2];
                        }
                    }

                    // 10. Let lenValue be Get(items, "length").
                    // 11. Let len be ToLength(lenValue).
                    var len: number = toLength(items["length"]);

                // 13. If IsConstructor(C) is true, then
                    // 13. a. Let A be the result of calling the [[Construct]] internal method
                    // of C with an argument list containing the single item len.
                    // 14. a. Else, Let A be ArrayCreate(len).
                    var A: object[] = isCallable(C) ? Object(new C(len)) : new Array(len);

                    // 16. Let k be 0.
                    var k: number = 0;
                    // 17. Repeat, while k < len… (also steps a - h)
                    var kValue: any;
                    while (k < len) {
                        kValue = items[k];
                        if (mapFn) {
                            A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
                        } else {
                            A[k] = kValue;
                        }
                        k += 1;
                    }
                    // 18. Let putStatus be Put(A, "length", len, true).
                    A.length = len;
                    // 20. Return A.
                    return A;
                };
            }());
        }

        // https://tc39.github.io/ecma262/#sec-array.prototype.find
        if (!Array.prototype.find) {
            Object.defineProperty(Array.prototype, 'find', {
                value: function(predicate: Function): any {
                    // 1. Let O be ? ToObject(this value).
                    if (this == null) {
                        throw new TypeError('"this" is null or not defined');
                    }

                    var o: object = Object(this);

                    // 2. Let len be ? ToLength(? Get(O, "length")).
                    var len = o["length"] >>> 0;

                    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
                    if (typeof predicate !== 'function') {
                        throw new TypeError('predicate must be a function');
                    }

                    // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
                    var thisArg: any = arguments[1];

                    // 5. Let k be 0.
                    var k: number = 0;

                    // 6. Repeat, while k < len
                    while (k < len) {
                        // a. Let Pk be ! ToString(k).
                        // b. Let kValue be ? Get(O, Pk).
                        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
                        // d. If testResult is true, return kValue.
                        var kValue: any = o[k];
                        if (predicate.call(thisArg, kValue, k, o)) {
                            return kValue;
                        }
                        // e. Increase k by 1.
                        k++;
                    }

                    // 7. Return undefined.
                    return undefined;
                }
            });
        }

        if (!String.prototype.repeat) {
            Object.defineProperty(String.prototype, "repeat", {
                enumerable: false,
                writable: false,
                configurable: false,
                value: function(count: number): string {
                    'use strict';
                    if (this == null) {
                        throw ('can\'t convert ' + this + ' to object');
                    }
                    var str: string = '' + this;
                    count = +count;
                    if (count !== count) {
                        count = 0;
                    }
                    if (count < 0) {
                        throw ('repeat count must be non-negative');
                    }
                    if (count === Infinity) {
                        throw ('repeat count must be less than infinity');
                    }
                    count = Math.floor(count);
                    if (str.length === 0 || count === 0) {
                        return '';
                    }
                    // Ensuring count is a 31-bit integer allows us to heavily optimize the
                    // main part. But anyway, most current (August 2014) browsers can't handle
                    // strings 1 << 28 chars or longer, so:
                    if (str.length * count >= 1 << 28) {
                        throw ('repeat count must not overflow maximum string size');
                    }
                    var rpt: string = '';
                    for (;;) {
                        if ((count & 1) === 1) {
                            rpt += str;
                        }
                        count >>>= 1;
                        if (count === 0) {
                            break;
                        }
                        str += str;
                    }
                    // Could we try:
                    // return Array(count + 1).join(this);
                    return rpt;
                }
            });
        }
    }

    function browserCheck(): void {
        var userAgent = navigator.userAgent;
        if (/MSIE 10/i.test(userAgent)) {
           // this is internet explorer 10
            window["isBrowserMicrosoft"] = true;
            window["isBrowserIE"] = true;
        }

        if (/MSIE 9/i.test(userAgent) || /rv:11.0/i.test(userAgent)) {
            // this is internet explorer 9 and 11
            window["isBrowserMicrosoft"] = true;
            window["isBrowserIE"] = true;
        }

        if (/Edge/i.test(userAgent)) {
           // this is Microsoft Edge
            window["isBrowserMicrosoft"] = true;
            window["isBrowserEdge"] = true;
            $('html').addClass('edge');
        }
        if (isBrowserMicrosoft) {
            $('html').addClass('microsoft');
        } else if (/chrome/i.test(userAgent)) {
            window["isBrowserChrome"] = true;
        } else if (/firefox/i.test(userAgent)) {
            window["isBrowserFirefox"] = true;
            $('html').addClass('firefox');
        }

        if (/safari/i.test(userAgent) && !window["isBrowserChrome"]) {
            window["isBrowserSafari"] = true;
            $('html').addClass('safari');
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
    }

    function systemCheck(): void {
        if (/MAC/i.test(navigator.platform)) {
            window["isSystemMac"] = true;
        }
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

    function featureCheck() {
        window["hasFlash"] = flashBlockDetect() === 0;
        window["gMaxDivHeight"] = getMaxDivHeight();
        window["gScrollbarWidth"] = getScrollbarWidth();

        function flashBlockDetect(callbackMethod?: Function): number{
            var return_value: number = 0;

            if (navigator.plugins["Shockwave Flash"]) {
                var embed_length: number = $('embed').length;
                var object_length: number = $('object').length;

                if ((embed_length > 0) || (object_length > 0)) {
                    // Mac / Chrome using FlashBlock + Mac / Safari using AdBlock
                    $('object, embed').each(function() {
                        if ($(this).css('display') === 'none'){
                            return_value = 2;
                        }
                    });
                } else {
                    // Mac / Firefox using FlashBlock
                    if ($('div[bginactive]').length > 0) {
                        return_value = 2;
                    }
                }
            } else if (navigator.userAgent.indexOf('MSIE') > -1) {
                try {
                    new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
                } catch (e) {
                    return_value = 2;
                }
            } else {
                // If flash is not installed
                return_value = 1;
            }

            if (callbackMethod && typeof(callbackMethod) === "function") {
                callbackMethod(return_value);
            } else {
                return return_value;
            }
        }

        function getMaxDivHeight(): number {
            var max: number = Math.pow(2, 53);
            var curHeight: number = 1000000;
            $("body").append('<div id="maxDivHeight"></div>');
            var $div: JQuery = $("#maxDivHeight");
            var height: number = findHeight(curHeight);
            height = Math.max(curHeight, Math.floor(height * .99)); // 1% buffer
            $("#maxDivHeight").remove();

            return height;

            function findHeight(height: number): number {
                var newHeight: number = height * 2;
                if (newHeight > max) {
                    return 1000000;
                }
                $div.height(newHeight);
                var divHeight: number = $div.height();
                if (divHeight === 0) {
                    return getMaxHeight(height, newHeight);
                } else if (divHeight === height) {
                    return divHeight;
                } else {
                    return findHeight(divHeight);
                }
            }

            function getMaxHeight(minHeight: number, maxHeight: number): number {
                var mid: number = Math.floor((minHeight + maxHeight) / 2);
                if (mid === minHeight) {
                    return minHeight;
                }
                $div.height(mid);
                var midHeight: number = $div.height();
                if (midHeight === 0) {
                    return getMaxHeight(minHeight, mid);
                } else {
                    return getMaxHeight(mid, maxHeight);
                }
            }
        }

        function getScrollbarWidth() {
            var outer: HTMLDivElement = document.createElement("div");
            outer.style.visibility = "hidden";
            outer.style.width = "100px";
            outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps

            document.body.appendChild(outer);

            var widthNoScroll: number = outer.offsetWidth;
            // force scrollbars
            outer.style.overflow = "scroll";

            // add innerdiv
            var inner: HTMLDivElement = document.createElement("div");
            inner.style.width = "100%";
            outer.appendChild(inner);

            var widthWithScroll: number = inner.offsetWidth;

            // remove divs
            outer.parentNode.removeChild(outer);

            return Math.max(8, widthNoScroll - widthWithScroll);
        }
    }

    function extraCheck(): void {
        /**
        *
        *  Base64 encode / decode
        *  http://www.webtoolkit.info/
        *
        **/
        window["Base64"] = {
            // private property
            _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
            // public method for encoding
            encode: function (input: string): string {
                var output: string = "";
                var chr1: any, chr2: any, chr3: any, enc1: any, enc2: any, enc3: any, enc4: any;
                var i: number = 0;

                input = Base64._utf8_encode(input);

                while (i < input.length) {
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);

                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;

                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }

                    output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
                }

                return output;
            },

            // public method for decoding
            decode: function (input: string): string {
                var output: string = "";
                var chr1: number, chr2: number, chr3: number;
                var enc1: number, enc2: number, enc3: number, enc4: number;
                var i: number = 0;

                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

                while (i < input.length) {
                    enc1 = this._keyStr.indexOf(input.charAt(i++));
                    enc2 = this._keyStr.indexOf(input.charAt(i++));
                    enc3 = this._keyStr.indexOf(input.charAt(i++));
                    enc4 = this._keyStr.indexOf(input.charAt(i++));

                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;

                    output = output + String.fromCharCode(chr1);

                    if (enc3 !== 64) {
                        output = output + String.fromCharCode(chr2);
                    }

                    if (enc4 !== 64) {
                        output = output + String.fromCharCode(chr3);
                    }
                }

                output = Base64._utf8_decode(output);
                return output;
            },

            // private method for UTF-8 encoding
            _utf8_encode: function (string: string): string {
                string = string.replace(/\r\n/g,"\n");
                var utftext: string = "";
                for (var n: number = 0; n < string.length; n++) {
                    var c: number = string.charCodeAt(n);

                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }

                    else if ((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }

                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                }

                return utftext;
            },

            // private method for UTF-8 decoding
            _utf8_decode: function (utftext: string): string {
                var string: string = "";
                var i: number = 0;
                var c: number = 0, c2: number = 0, c3: number = 0;

                while ( i < utftext.length ) {
                    c = utftext.charCodeAt(i);

                    if (c < 128) {
                        string += String.fromCharCode(c);
                        i++;
                    }

                    else if ((c > 191) && (c < 224)) {
                        c2 = utftext.charCodeAt(i+1);
                        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                        i += 2;
                    }

                    else {
                        c2 = utftext.charCodeAt(i+1);
                        c3 = utftext.charCodeAt(i+2);
                        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                        i += 3;

                    }
                }

                return string;
            }
        };


        if (FileReader.prototype.readAsBinaryString === undefined) {
            FileReader.prototype.readAsBinaryString = function (fileData: Blob): void {
                var binary: string = "";
                var pt: any = this;
                var reader: FileReader = new FileReader();
                reader.onload = function () {
                    var bytes: Uint8Array = new Uint8Array(reader.result);
                    var length: number = bytes.byteLength;
                    for (var i = 0; i < length; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    //pt.result  - readonly so assign content to another property
                    pt.content = binary;
                    pt.onload();
                };
                reader.readAsArrayBuffer(fileData);
            };
        }

        // check set up transitionEnd event
        (function() {
            var fakeEl: HTMLElement = document.createElement('fakeelement');
            var transitions: object = {
                'transition': 'transitionend',
                'OTransition': 'oTransitionEnd',
                'MozTransition': 'transitionend',
                'WebkitTransition': 'webkitTransitionEnd'
            };

            for (var t in transitions){
                if (fakeEl.style[t] !== undefined ) {
                    window["transitionEnd"] = transitions[t];
                    return;
                }
            }
        }());

        // addClass, removeClass, hasClass for SVG elements
        (function($){

            /* addClass shim
             ****************************************************/
            var addClass = $.fn.addClass;
            $.fn.addClass = function(value) {
              var orig = addClass.apply(this, arguments);

              var elem,
                i = 0,
                len = this.length;

              for (; i < len; i++ ) {
                elem = this[ i ];
                if ( elem instanceof SVGElement ) {
                  var classes = $(elem).attr('class');
                  if ( classes ) {
                      var index = classes.indexOf(value);
                      if (index === -1) {
                        classes = classes + " " + value;
                        $(elem).attr('class', classes);
                      }
                  } else {
                    $(elem).attr('class', value);
                  }
                }
              }
              return orig;
            };

            /* removeClass shim
             ****************************************************/
            var removeClass = $.fn.removeClass;
            $.fn.removeClass = function(value) {
              var orig = removeClass.apply(this, arguments);

              var elem,
                i = 0,
                len = this.length;

              for (; i < len; i++ ) {
                elem = this[ i ];
                if ( elem instanceof SVGElement ) {
                  var classes = $(elem).attr('class');
                  if ( classes ) {
                    var values = value.split(" ").map((v) => v.trim());
                    let modified = false;
                    values.forEach((value) => {
                        var index = classes.indexOf(value);
                        if (index !== -1) {
                          classes = classes.substring(0, index) + classes.substring((index + value.length), classes.length);
                          modified = true;
                        }
                    });
                    if (modified) {
                        $(elem).attr('class', classes);
                    }
                  }
                }
              }
              return orig;
            };

            /* hasClass shim
             ****************************************************/
            var hasClass = $.fn.hasClass;
            $.fn.hasClass = function(value) {
              var orig = hasClass.apply(this, arguments);

              var elem,
                i = 0,
                len = this.length;

              for (; i < len; i++ ) {
                elem = this[ i ];
                if ( elem instanceof SVGElement ) {
                  var classes = $(elem).attr('class');

                  if ( classes ) {
                    if ( classes.indexOf(value) === -1 ) {
                      return false;
                    } else {
                      return true;
                    }
                  } else {
                      return false;
                  }
                }
              }
              return orig;
            };
          })(jQuery);
    }
}
