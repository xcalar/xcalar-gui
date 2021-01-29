(function() {
    var PromiseHelper = {};
    /**
    oneIter: Function that returns a promise. It represents one iteration of the
    loop.
    args: Arguments to apply to oneIter. Must be in an array
    condition: This is what we are going to call eval on. So this is a string
    that can take in arguments as in put and do whatever it wants with it. For
    example, if oneIter returns an integer, and we want to terminate if the
    integer is < 0.01(opaqueArgs.threshold), then
    condition = "arguments[0] < opaqueArgs.threshold"
    opaqueArgs: User can choose to use this argument in the condition. This
    function will not touch this argument and will not use it unless the caller
    manipulates it in side condition
    */
    PromiseHelper.deferred = function() {
        return jQuery.Deferred();
    };

    PromiseHelper.doWhile = function(oneIter, args, condition, opaqueArgs) {
        // XXX: Type check!
        function doWork() {
            return (oneIter.apply({}, args)
                    .then(function() {
                        if (!eval(condition)) {
                            return doWork();
                        }
                    })
                );
        }
        return doWork();
    };

    /**
    Same thing as doWhile except that it checks for the condition first before
    kicking into doWhile loop
    */
    PromiseHelper.while = function(oneIter, args, condition, opaqueArgs) {
        if (!eval(condition)) {
            return PromiseHelper.doWhile(oneIter, args, condition, opaqueArgs);
        } else {
            return PromiseHelper.resolve();
        }
    };

    /**
    Runs all promises in the argument in parallel and resolves when all of
    them are complete or fails
    */
    PromiseHelper.when = function() {
        var numProm = arguments.length;
        if (numProm === 0) {
            return PromiseHelper.resolve([]);
        }
        var mainDeferred = PromiseHelper.deferred();

        var numDone = 0;
        var returns = [];
        var argument = arguments;
        var hasFailures = false;

        for (var t = 0; t < numProm; t++) {
            whenCall(t);
        }

        function whenCall(i) {
            argument[i].then(function() {
                if (!gMutePromises) {
                    console.log("Promise", i, "done!");
                }
                numDone++;
                if (arguments.length === 0) {
                    returns[i] = undefined;
                } else if (arguments.length === 1) {
                    returns[i] = arguments[0];
                } else {
                    returns[i] = Array.prototype.slice.call(arguments);
                }

                if (numDone === numProm) {
                    if (!gMutePromises) {
                        console.log("All done!");
                    }
                    if (hasFailures) {
                        mainDeferred.reject.call($, returns);
                    } else {
                        mainDeferred.resolve.call($, returns);
                    }
                }
            }, function() {
                console.warn("Promise", i, "failed!");
                numDone++;
                if (arguments.length === 0) {
                    returns[i] = undefined;
                } else if (arguments.length === 1) {
                    returns[i] = arguments[0];
                } else {
                    returns[i] = Array.prototype.slice.call(arguments);
                }
                hasFailures = true;
                if (numDone === numProm) {
                    console.log("All done!");
                    mainDeferred.reject.call($, returns);
                }
            });
        }

        return (mainDeferred.promise());
    };

    /**
    Chains the promises such that only after promiseArray[i] completes, then
    promiseArray[i+1] will start.
    */
    PromiseHelper.chain = function(promiseArray) {
        // Takes an array of promise *generators*.
        // This means that promisearray[i]() itself calls a promise.
        // Reason for this being, promises start executing the moment they are
        // called, so you need to prevent them from being called in the first place.
        if (!promiseArray ||
            !Array.isArray(promiseArray) ||
            typeof promiseArray[0] !== "function") {
            return PromiseHelper.resolve(null);
        }
        var head = promiseArray[0]();
        if (head == null) {
            head = PromiseHelper.resolve();
        }
        for (var i = 1; i < promiseArray.length; i++) {
            head = head.then(promiseArray[i]);
        }
        return (head);
    };

    PromiseHelper.chainHelper = function(promiseFunction, valueArr) {
        // Takes a function that returns a promise, and an array of values
        // to pass to that promise in a chain order..
        var promiseGeneratorClosures = [];
        for (var i = 0; i < valueArr.length; i++) {
            var promiseClosure = (function(someArg) {
                return (function() {
                    return promiseFunction(someArg);
                });
            })(valueArr[i]);
            promiseGeneratorClosures.push(promiseClosure);
        }
        return PromiseHelper.chain(promiseGeneratorClosures);
    };

    /* Always resolve when passed in promise is done */
    PromiseHelper.alwaysResolve = function(def) {
        var deferred = PromiseHelper.deferred();
        def.always(deferred.resolve);
        return deferred.promise();
    };

    /* return a promise with resvoled value */
    PromiseHelper.resolve = function() {
        var deferred = PromiseHelper.deferred();
        deferred.resolve.apply(this, arguments);
        return deferred.promise();
    };

    /* return a promise with rejected error */
    PromiseHelper.reject = function() {
        var deferred = PromiseHelper.deferred();
        deferred.reject.apply(this, arguments);
        return deferred.promise();
    };

    /**
     * Convert JQuery/XD promise to native promise
     */
    PromiseHelper.convertToNative = function(promise) {
        if (typeof promise.fail !== 'undefined') {
            // JQuery/XD promise
            return new Promise((resolve, reject) => {
                try {
                    promise
                        .then((ret) => { resolve(ret) })
                        .fail((e) => { reject(e) });
                } catch(e) {
                    reject(e);
                }
            });
        } else {
            // Native promise
            return promise;
        }
    };

    /**
     * Convert native promise to JQuery/XD promise
     */
    PromiseHelper.convertToJQuery = function(promise) {
        if (typeof promise.fail === 'undefined') {
            // Native promise
            const deferred = PromiseHelper.deferred();
            try {
                promise
                    .then((ret) => { deferred.resolve(ret) })
                    .catch((e) => { deferred.reject(e) });
            } catch(e) {
                deferred.reject(e);
            }
            return deferred.promise();
        } else {
            // JQuery/XD promise
            return promise;
        }
    }

    if (typeof exports !== "undefined") {
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = PromiseHelper;
        }
        exports.PromiseHelper = PromiseHelper;
    } else {
        window.PromiseHelper = PromiseHelper;
    }

}());
