// this file maps to xcalar/.jupyter/custom/custom.js
// if this gets built in to a non-XD product (XI, XPE, etc.)
// any occurances of 'Xcalar Design' (case insensitive) in this file will get
// replaced with updated product name at build time.
define(['base/js/namespace', 'base/js/utils'], function(Jupyter, utils) {
    Jupyter._target = '_self';
    if (!$("#notebooks").length){
        return;
    }
    var wkbkFolderName = "";
    console.log("jupyter custom extension has been loaded");

    var request = {
        action: "updateLocation",
        location: "tree",
        lastNotebook: null
    };
    parent.postMessage(JSON.stringify(request), "*");
    parent.postMessage(JSON.stringify({action: "enterNotebookList"}), "*");

    // hide the log out button on the upper right
    $("#login_widget").remove();
    overwriteElementsAndListeners();
    setupJupyterEventListeners();
    window.addEventListener("message", receiveMessage, false);
    var isOthersHidden = true;

    function receiveMessage(event) {
        window.alert = function(){};
        alert = function(){};
        if (!event.data) {
            return;
        }
        var struct;
        try {
            struct = JSON.parse(event.data);
            if (!struct.fromXcalar) {
                return;
            }
        } catch (error) {
            console.log(error);
            return;
        }
        switch(struct.action) {
            case("publishTable"):
                publishTable(struct.tableName, struct.numRows);
                break;
            case ("autofillImportUdf"):
                autofillImportUdf(struct.target, struct.filePath, struct.includeStub,
                                  struct.moduleName, struct.fnName, struct.udfPanelModuleName);
                break;
            case ("newWorkbook"):
                createNewFolder(struct);
                break;
            case ("copyWorkbook"):
                copyFolder(struct.oldFolder, struct.newFolder);
                break;
            case ("renameWorkbook"):
                renameFolder(struct, struct.newFolderName, struct.oldFolderName);
                break;
            case ("deleteWorkbook"):
                deleteFolder(struct.folderName);
                break;
            case ("init"):
                wkbkFolderName = struct.folderName || "";
                highlightUserFolder();
                updateLinks();
                break;
            case ("updateFolderName"):
                updateFolderName();
                break;
            default:
                console.log("invalid operation: ", struct);
                break;
        }
    }

    // create folder, rename it, and reload list, send new name to XD
    function createNewFolder(struct) {
        Jupyter.notebook_list.contents.new_untitled("", {type: 'directory'})
        .then(function(data) {
            renameFolderHelper(struct, struct.folderName, data.path)
            .then(function(result) {
                resolveRequest(result, struct.msgId);
            })
            .fail(function(result) {
                rejectRequest(result, struct.msgId);
            });
        }) // jupyter doesn't have fail property
        .catch(function(e) {
            rejectRequest(e, struct.msgId);
        });
    }

    function renameFolder(struct, newFolderName, oldFolderName) {
        struct.folderName = newFolderName;
        renameFolderHelper(struct, newFolderName, oldFolderName)
        .then(function(result) {
            if (wkbkFolderName === oldFolderName) {
                wkbkFolderName = result.newName;
                updateLinks();
            }
            if (Jupyter.notebook_list.notebook_path === oldFolderName ||
                Jupyter.notebook_list.notebook_path.indexOf(oldFolderName + "/") === 0) {
                Jupyter.notebook_list.update_location(newFolderName);
            }
            resolveRequest(result, struct.msgId);
        })
        .fail(function(result) {
            rejectRequest(result, struct.msgId);
        });
    }

    function updateFolderName(struct) {
        if (wkbkFolderName === struct.oldFolderName) {
            wkbkFolderName = struct.newFolderName;
            updateLinks();
        }
        if (Jupyter.notebook_list.notebook_path === struct.oldFolderName ||
            Jupyter.notebook_list.notebook_path.indexOf(struct.oldFolderName + "/") === 0) {
            Jupyter.notebook_list.update_location(struct.newFolderName);
        }
    }

    function renameFolderHelper(struct, folderName, prevName, attemptNumber, prevDeferred) {
        var deferred = prevDeferred || jQuery.Deferred();

        attemptNumber = attemptNumber || 0;
        attemptNumber++;
        Jupyter.notebook_list.contents.rename(prevName, folderName)
        .then(function(data) {
            Jupyter.notebook_list.load_list();
            deferred.resolve({newName: data.name});
        })
        .catch(function(e) {
            if (e && typeof e.message === "string") {
                if (attemptNumber > 10) {
                    deferred.reject({error: "failed to create folder"});
                    return; // give up
                } else if (e.message.indexOf("No such file") > -1) {
                    deferred.reject({error: "folder not found"});
                } else if (e.message.indexOf("File already exists") === 0 &&
                    attemptNumber < 10) {
                    renameFolderHelper(struct, struct.folderName + "_" +
                        attemptNumber, prevName, attemptNumber, deferred);
                } else { // last try
                    renameFolderHelper(struct, struct.folderName + "_" +
                        Math.ceil(Math.random() * 10000), prevName,
                        attemptNumber, deferred);
                }
            } else {
                deferred.reject({error: "failed to create folder"});
            }
        });

        return deferred.promise();
    }

    function deleteFolder(folderName) {
        let deferred = jQuery.Deferred();

        // list contents
        // then delete inner contents
        // then delete self
        Jupyter.notebook_list.contents.list_contents(folderName)
        .then((contents) => {
            let promises = [];
            contents.content.forEach((item) => {
                if (item.type === "directory") {
                    promises.push(deleteFolder(item.path));
                } else {
                    promises.push(deleteFile(item.path));
                }
            });

            PromiseHelper.when(...promises)
            .then(() => {
                Jupyter.notebook_list.contents.delete(folderName)
                .then(function() {
                    Jupyter.notebook_list.notebook_deleted(folderName);
                    deferred.resolve();
                })
                .catch(deferred.resolve);
            })
            .fail(deferred.resolve);
        })
        .catch(deferred.resolve);

        return deferred.promise();
    }

    function deleteFile(path) {
        let deferred = jQuery.Deferred();
        Jupyter.notebook_list.contents.delete(path)
        .then(deferred.resolve)
        .catch(deferred.reject);
        return deferred.promise();
    }

    function publishTable(tableName, numRows) {
        numRows = numRows || 0;
        Jupyter.new_notebook_widget.contents.new_untitled(wkbkFolderName, {type: "notebook"})
        .then(function(data) {
            var encodedTableName = encodeURIComponent(tableName);
            var url = Jupyter.session_list.base_url + "notebooks/" + data.path + "?kernel_name=python3&" +
                        "needsTemplate=true&publishTable=true&" +
                        "tableName=" + encodedTableName + "&numRows=" + numRows;
            window.location.href = url;
        });
    }

    function autofillImportUdf(target, filePath, includeStub, moduleName,
                               fnName, udfPanelModuleName) {
        Jupyter.new_notebook_widget.contents.new_untitled(wkbkFolderName, {type: "notebook"})
        .then(function(data) {
            var encodedTarget = encodeURIComponent(target);
            var encodedFilePath = encodeURIComponent(filePath);
            var url = Jupyter.session_list.base_url + "notebooks/" + data.path + "?kernel_name=python3&" +
                        "needsTemplate=true&autofillImportUdf=true&" +
                        "target=" + encodedTarget + "&filePath=" + encodedFilePath +
                        "&includeStub=" + includeStub +
                        "&moduleName=" + moduleName +
                        "&fnName=" + fnName +
                        "&udfPanelModuleName=" + udfPanelModuleName;
            window.location.href = url;
        });
    }


    function setupJupyterEventListeners() {
        Jupyter.notebook_list.events.on("draw_notebook_list.NotebookList", function(evt, data) {
            highlightUserFolder();
        });
    }

    function highlightUserFolder() {
        if (!wkbkFolderName || Jupyter.notebook_list.notebook_path !== "") {
            $("#xc-showFolderOption").remove();
            // only apply styling if in root directory and user folder exists
            return;
        }

        if (!$("#xc-showFolderOption").length) {
            var checkOption = isOthersHidden ? "" : "checked";

            var html = '<div id="xc-showFolderOption">' +
                        'Show other folders' +
                        '<input type="checkbox" title="Select to show folders' +
                            ' belonging to other workbooks" ' + checkOption +
                         '>' +
                       '</div>';
            var $showOption = $(html);
            Jupyter.notebook_list.element.find("#project_name").after($showOption);
            $showOption.find("input").change(function() {
                isOthersHidden = !$(this).is(":checked");
                Jupyter.notebook_list.load_list();
            });
        }

        Jupyter.notebook_list.element.find(".list_item").each(function() {
            var $row = $(this);
            var data = $row.data();
            if (data.type === "directory") {
                if (data.name === wkbkFolderName) {
                    $row.addClass("xc-wkbkFolder");
                    $row.find(".item_icon").addClass("fa fa-folder").removeClass("folder_icon");
                    $row.find(".running-indicator").text("Your workbook folder");
                } else {
                    $row.addClass("xc-othersFolder");
                    if (isOthersHidden) {
                        $row.hide();
                        $row.find("input").attr("type", "hidden");
                    } else {
                        $row.show();
                        $row.find("input").attr("type", "checkbox");
                    }
                }
            }
        });
    }

    function overwriteElementsAndListeners() {
        $(document).ready(function() {
            // prevents new window from opening
            $("#notebook_list").on("click", "a", function(event) {
                var url = $(this).attr("href");
                if (!url) {
                    return;
                }
                event.preventDefault();
                // prevents bug where new tab opens in windows chrome
                window.location.href = $(this).attr("href");
            });
            $("#kernel-python3 a").off("click");
            $("#kernel-python3 a").click(function() {
                // code based off of newnotebook.js in jupyter/static/tree/js/tree/js
                var dir_path = Jupyter.notebook_list.notebook_path;
                Jupyter.new_notebook_widget.contents.new_untitled(dir_path, {type: "notebook"})
                .then(function(data) {
                    var url = Jupyter.session_list.base_url + "notebooks/" + data.path + "?kernel_name=python3&needsTemplate=true";
                    window.location.href = url;
                });
            });
            $("#shutdown").remove();
        });
    }

    function updateLinks() {
        var folderUrl = Jupyter.session_list.base_url + "tree/" + wkbkFolderName;
        $("#ipython_notebook").find("a").attr("href", folderUrl);
    }

    function copyFolder(oldFolder, newFolder) {
        Jupyter.notebook_list.contents.list_contents(oldFolder)
        .then(function(contents) {
            contents.content.forEach(function(item) {
                if (item.type === "notebook") {
                    Jupyter.notebook_list.contents.copy(item.path, newFolder);
                } else if (item.type === "directory") {
                    Jupyter.notebook_list.contents.new_untitled(newFolder, {type: 'directory'})
                    .then(function(data) {
                        var split = data.path.split("/");
                        split.pop();
                        split.push(item.name);
                        var desiredPath = split.join("/");
                        renameFolderHelper({folderName: desiredPath}, desiredPath, data.path)
                        .then(function(result) {
                            copyFolder(item.path, desiredPath);
                        });
                    });
                }
            });
        });
    }

    function resolveRequest(result, msgId) {
        var request = {
            action: "resolve",
            msgId: msgId
        };
        request = $.extend(request, result);
        parent.postMessage(JSON.stringify(request), "*");
    }

    function rejectRequest(result, msgId) {
         var request = {
            action: "reject",
            msgId: msgId
        };
        request = $.extend(request, result);
        parent.postMessage(JSON.stringify(request), "*");
    }

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
                    numDone++;
                    if (arguments.length === 0) {
                        returns[i] = undefined;
                    } else if (arguments.length === 1) {
                        returns[i] = arguments[0];
                    } else {
                        returns[i] = Array.prototype.slice.call(arguments);
                    }

                    if (numDone === numProm) {
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
});


