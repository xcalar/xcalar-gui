var xpeServerUrl = global.xpeServerUrl;

var $deleteBtn;
var $revertBtn;
var progressDomId = "progressMsg";
var $progressDiv;

var btnDisabledClass = "btn-disabled";

$(document).ready(function() {
    $deleteBtn = $("#delete");
    $revertBtn = $("#revert");
    $progressDiv = $("#" + progressDomId);
    // promiseHelper.js uses gMutePromises global var for now
    // set it to true for server to work
    if (typeof gMutePromises === 'undefined') {
        gMutePromises = true;
    }
    if (typeof nw !== 'undefined') {
        XpeSharedContextUtils.nwjsSetup("revert");
    }
    ImageTable.setup(); // initializes ImageTable vars.
        // (must be done before any of the ImageTable functions can be used)
    pageSetup();
    setInitialPageDisplay();
});

/**
 * setup button listners and initialize ImageTable variables
 */
function pageSetup() {

    $deleteBtn.click(function() {
        if (confirm("Are you sure you want to delete the selected image(s)?  " +
            "This is an irreversable actions.")) {
            $deleteBtn.addClass(btnDisabledClass);
            $revertBtn.addClass(btnDisabledClass);
            ImageTable.pendTable();
            XpeCommonUtils.countDownDotAnimation(
                progressDomId, "Deleting selected image(s)");
            deleteImages()
            .then(function() {
                // do not unpend the table in success case; will get
                // put right back in pend state when resetting, which
                // will make it appear to be switching states back and forth quickly
                console.log("all images deleted successful");
                setInitialPageDisplay("Deleted image(s) - reloading ");
            })
            .fail(function(error) {
                ImageTable.unpendTable();
                console.log("delete failed: " + error);
                $progressDiv.html("Failed to delete image(s)! (See console log).");
                $deleteBtn.removeClass(btnDisabledClass);
                $revertBtn.removeClass(btnDisabledClass);
            });
        }
    });
    $revertBtn.click(function() {
        if (confirm("Are you sure you want to revert to the selected image?")) {
            $deleteBtn.addClass(btnDisabledClass);
            $revertBtn.addClass(btnDisabledClass);
            ImageTable.pendTable();
            // add msg to update div
            XpeCommonUtils.countDownDotAnimation(progressDomId, "Reverting image");
            revertImage()
            .then(function() {
                // do not unpend the table in success case; will get
                // put right back in pend state when resetting, which
                // will make it appear to be switching states back and forth quickly
                setInitialPageDisplay("Image reverted!  Reloading ");
            })
            .fail(function(error) {
                console.log("Revert failed: " + error);
                ImageTable.unpendTable();
                $progressDiv.html("Revert failed!  (See console log)");
                $deleteBtn.removeClass(btnDisabledClass);
                $revertBtn.removeClass(btnDisabledClass);
            });
        }
   });
}

/**
 * sets page to display it should have on a fresh page load
 * (will make new API call to server to get images and populate
 * table with this data)
 */
function setInitialPageDisplay(loadingMessage="Loading ") {
    // disable buttons; nothing in table will be selected
    $deleteBtn.addClass(btnDisabledClass);
    $revertBtn.addClass(btnDisabledClass);

    $progressDiv.html(""); // clear any previous progress message
    $progressDiv.removeClass("imageTableFailureMsg"); // remove formatting
        // for any previous failure

    ImageTable.clear();

    // populate the image table.
    // poulating the table can take couple minutes (if Docker needs to be started);
    // so gray out and disable table until it's populated
    ImageTable.pendTable();
    XpeCommonUtils.countDownDotAnimation(progressDomId, loadingMessage);

    // ImageTable.show will need to make API calls to Docker engine
    // make sure it is fully up before doing the ImageTable set up

    XpeCommonUtils.handleDockerStatusWrapper(false, 60, progressDomId, true)
    .then(function(res) {
        return ImageTable.show(); // calls server to get images then populates table rows
    })
    .then(function(res) {
        ImageTable.unpendTable();
        $progressDiv.html(""); // clears wait dots and progress msg
    })
    .fail(function(error) {
        $progressDiv.addClass("imageTableFailureMsg");
        var failureMsg = "Failed to load table.";
        if (global.hasOwnProperty("serverLogPath")) {
            failureMsg += "  See log at:<br>" +
                global.serverLogPath;
        } else {
            failureMsg += "  See logs.";
        }
        $progressDiv.html(failureMsg);
    });
}


/**
 * deletes Xcalar Design images for the currently picked
 * rows in image table
 */
function deleteImages() {
    var deferred = jQuery.Deferred();
    // get short image id for picked image row
    var pickedImages = ImageTable.getPicked();
    if (pickedImages.length < 1) {
        deferred.reject("You didn't selected any images to delete");
    } else {
        var promises = [];
        pickedImages.each(function() {
            // 'imageId' attr should be set in 'getHTMLFromFiles'
            // in imageManagementToolImageTableBuilder.js, not something that's
            // present due to attrs in server response of /getImages
            var imageId = $(this).attr('imageId');
            if (!imageId) {
                deferred.reject("Could not find image id to revert!");
            } else {
                console.log("delete image of id  " + imageId);
                promises.push(XpeSharedContextUtils.sendViaHttp("DELETE",
                    xpeServerUrl + "/image", JSON.stringify({"id": imageId})));
            }
        });
        PromiseHelper.when.apply(this, promises)
        .then(function() {
            console.log("all delete promises were resolved");
            deferred.resolve();
        })
        .fail(function(args) {
            var error = null;
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg != null && typeof arg === "object" && !(arg instanceof Array)) {
                    error = arg;
                    break;
                }
            }
            console.log(error);
            deferred.reject(error);
        });
    }
    return deferred.promise();
}

/**
 * reverts Xcalar Design to image corresponding to the
 * currently picked row in the image table
 */
function revertImage() {
    var deferred = jQuery.Deferred();

    // get short image id for picked image row
    var pickedImages = ImageTable.getPicked();
    if (pickedImages.length !== 1) {
        deferred.reject("1 (and only 1) row in innerFileBrowserContainer must" +
            " have 'picked' class in order to revert! (rows are ds visible " +
            " grid-unit divs).  Right now " + pickedImages.length +
            " have 'picked' class.");
    } else {
        // is just a single image row
        var imageId = pickedImages.attr('imageId');
        if (!imageId) {
            deferred.reject("Could not find image id to revert!");
        } else {
            console.log("will revert to image-id: " + imageId);
            XpeSharedContextUtils.sendViaHttp("POST", xpeServerUrl + "/revert",
                JSON.stringify({"id": imageId}))
            .then(function(res) {
                deferred.resolve(res);
            })
            .fail(function(error) {
                deferred.reject(error.errorLog);
            });
        }
    }
    return deferred.promise();
}
