var express = require('express');
var router = express.Router();
var fs = require("fs");
var exec = require("child_process").exec;
var upload = require('../upload.js');
var xcConsole = require('../expServerXcConsole.js').xcConsole;
var Status = require('../supportStatusFile').Status;

try {
    var aws = require("aws-sdk");
    aws.config.update({
        accessKeyId: 'AKIAJIVAAB7VSKQBZ6VQ',
        secretAccessKey: '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',
        region: 'us-west-2'
    });
    var s3 = new aws.S3();
    var s3Tmp = new aws.S3({
        "accessKeyId": "AKIAIMI35A6P3BFJTDEQ",
        "secretAccessKey": "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"
    });
} catch (error) {
    xcConsole.log("Failure: set up AWS! " + error);
}

function fetchAllExtensions() {
    var deferredOnFetch = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Prefix: 'extensions/'
    };
    var processItemsDeferred = [];
    s3.listObjects(params, function(err, data) {
        if (err) {
            xcConsole.log(err); // an error occurred
            deferredOnFetch.reject(err);
        } else {
            var ret = [];
            var items = data.Contents;
            items.forEach(function(item) {
                fileName = item.Key;
                processItemsDeferred.push(processItem(ret, fileName));
            });
            jQuery.when.apply(jQuery, processItemsDeferred)
            .then(function() {
                deferredOnFetch.resolve(ret);
            })
            .fail(function(err) {
                deferredOnFetch.reject(err);
            });
        }
    });
    return deferredOnFetch.promise();
}
function processItem(ret, fileName) {
    var deferredOnProcessItem = jQuery.Deferred();
    var getExtension = function(file) {
        var deferredOnGetFile = jQuery.Deferred();
        var params = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Key: file
        };
        s3.getObject(params, function(err, data) {
            if (err) {
                deferredOnGetFile.reject(err);
            } else {
                deferredOnGetFile.resolve(data.Body.toString('utf8'));
            }
        });
        return deferredOnGetFile.promise();
    };
    if (fileName.endsWith(".txt")) {
        getExtension(fileName)
        .then(function(data) {
            ret.push(JSON.parse(data));
            deferredOnProcessItem.resolve("processItem succeeds");
        })
        .fail(function(err) {
            deferredOnProcessItem.reject(err);
        });
    } else {
        deferredOnProcessItem.resolve("processItem succeeds");
    }
    return deferredOnProcessItem.promise();
}

function downloadExtension(appName, version) {
    var deferred = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Key: 'extensions/' + appName + "/" + version + "/" + appName +
             '-' + version + '.tar.gz'
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            var ret = {
                status: Status.Ok,
                data: data
            };
            deferred.resolve(ret);
        }
    });
    return deferred.promise();
}
function deleteExtension(appName, version) {
    var deferred = jQuery.Deferred();
    var params = {
        Bucket: 'marketplace.xcalar.com',
        Delete: {
            Objects: [
                {
                    Key: 'extensions/' + appName + "/" + version + "/" + 
                          appName + '.txt'
                },
                {
                    Key: 'extensions/' + appName + "/" + version + "/" + 
                          appName + '-' + version + '.tar.gz'
                }
            ]
        }
        
    }
    console.log("deleting: "+appName);
    s3Tmp.deleteObjects(params, function(err, data) {
        if (err) {
            xcConsole.log(err);
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise();
}
router.get("/extension/list", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    fetchAllExtensions()
    .then(function(data) {
        return res.send(data);
    })
    .fail(function(error) {
        return res.send({"status": Status.Error, "error": error});
    });
});
router.post("/extension/publish", function(req, res) {
    xcConsole.log("Uploading content");
    upload.uploadContent(req, res)
    .then(function(data) {
        res.send({"status": Status.Ok, "data": data});
    })
    .fail(function(error) {
        res.send({"status": Status.Error, "error": error});
    });
});
router.get("/extension/download", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    xcConsole.log("Download Package");
    var appName = req.query['appName'];
    var version = req.query['version'];
    var fileName = appName + '-' + version + '.tar.gz';
    xcConsole.log(fileName);
    var keyFile = 'extensions/' + appName + "/" + version + "/" + fileName;
    var params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Key: keyFile
    };
    res.attachment(keyFile);
    s3.getObject(params).createReadStream().pipe(res);
    // downloadExtension(pkg.name, pkg.version)
    // .then(function(ret) {
    //     res.attachment(pkg.name + '-' + pkg.version + '.tar.gz');
    //     res.send(ret.data);
    // })
    // .fail(function() {
    //     xcConsole.log("Failure: " + arguments);
    //     res.jsonp({
    //         status: Status.Error,
    //         error: JSON.stringify(arguments)
    //     });
    // });
});

router.delete("/extension/delete", function(req, res) {
    if (!s3) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    var appName = req.body.appName;
    var version = req.body.version;
    deleteExtension(appName, version)
    .then(function() {
        return res.send({"status": Status.Ok});
    })
    .fail(function(error) {
        return res.send({"status": Status.Error, "error": error});
    });
})
// Export router
exports.router = router;
