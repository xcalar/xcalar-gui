var os = require('os');
require("jsdom").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }

    // promiseHelper.js uses gMutePromises global var for now
    // set it to true for server to work
    if (typeof gMutePromises === 'undefined') {
        gMutePromises = true;
    }

    // app dir root, rel the server as packaged in the app
    var APP_DIR = __dirname + '/../../../';
    // rel path from app root to dir where server dependencies are found
    var SERVER_DEPENDENCIES_DIR = APP_DIR +
        '/Contents/Resources/nwjs_root/assets/js';

    var installerFilePath = APP_DIR +
        '/Contents/Resources/Installer/local_installer_mac.sh';
    var getImgIdFilePath = APP_DIR + '/Contents/Resources/scripts/getimgid.sh';
    var launchFilePath = APP_DIR + '/Contents/MacOS/.launch';
    var installedFilePath = APP_DIR + '/Contents/MacOS/.installed';
    var dockerConfigBasePath = "$HOME/Library/Containers/com.docker.docker";
    var xcalar_docker_repo = "xcalar_design"
    var xcalar_docker_container = "xcalar_design"

    // PromiseHelper depends on jQuery; jQuery is defined in app starter but
    // this server is being started as a separate process so doesn't get those vars
    // therefore making this jQuery global scope.  In future PromiseHelper should
    // not have dependency on jQuery and at that time, this should be changed
    // to local scope
    jQuery = $ = require("jquery")(window);
    var express = require('express');
    var httpStatus = require(SERVER_DEPENDENCIES_DIR + '/httpStatus.js').httpStatus;
    var dockerStatusStates = require(SERVER_DEPENDENCIES_DIR + '/xpe/xpeServerResponses.js').dockerStatusStates;
    var PromiseHelper = require(SERVER_DEPENDENCIES_DIR + '/promiseHelper.js');
    var fs = require('fs');
    var path = require('path');
    var shelljs = require('shelljs');
    var bodyParser = require("body-parser");
    var app = express();

    var serverPort = process.env.XPE_SERVER_PORT || 8388;

    var shellProcs = {}; // will hold child processes started by shelljs calling exec cmd,
        // keyed by shell cmd,
        // so can kill via client side on GUI restarts, timeouts, etc.

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.get('/test', function (req, res) {
        console.log("ensure server is up");
        res.send({
            "status": httpStatus.OK,
            "message": "The server is up!"
        });
    });

    app.get("/hostSettings", function(req, res) {
        console.log("Get host settings");
        createHostConfigJson()
        .always(function(message) {
            //res.status(httpStatus.InternalServerError).send(message);
            res.status(message.status).send(message);
        });
    });

    // given a compressed license, return a json w/ uncompressed
    // license ('license' attr of return body), or reject if its invalid
    app.post("/license/uncompressed", function(req, res) {
        var reqJson = req.body;
        var compressedLicense = reqJson.license;
        console.log("uncompressed " + compressedLicense);
        getUncompressedLicense(compressedLicense)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    function getUncompressedLicense(compressedLicense) {
        var deferred = jQuery.Deferred();
        runShellCmd("echo " + compressedLicense + " | base64 -D | gunzip -c")
        .then(function(res) {
            deferred.resolve({
                "status": httpStatus.OK,
                "license": res.stdout
            });
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    // bring up the xdpce containers.  want to call this when xd starts
    app.post("/bringupcontainers", function(req, res) {
        console.log("Bring up the xd containers running Xcalar");
        performInstallStep("bring_up_containers")
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.get("/dockerStatus", function(req, res) {
        console.log("Get status of docker daemon");
        getDockerStatus()
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    /**
     * starts Docker daemon.
     * timeout (req body attr): seconds to wait before timing out waiting for
     *  Docker to come up
     */
    app.post("/startDocker", function(req, res) {
        console.log("Start Docker daemon and wait");
        var reqJson = req.body;
        var timeout = reqJson.timeout;
        startDocker(timeout)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    /**
     * wait and return only once Docker is up.
     * (called if Docker start process interrupted)
     * timeout (req body attr): seconds to wait before timing out waiting for
     *  Docker to come up
     */
    app.post("/dockerWait", function(req, res) {
        console.log("Wait for Docker daemon to be available (do NOT start it)");
        var reqJson = req.body;
        var timeout;
        if (reqJson.timeout) {
            timeout = reqJson.timeout;
        }
        return bringUpDocker(timeout, true)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    function startDocker(timeout) {
        var deferred = jQuery.Deferred();
        getDockerStatus() // will check if Docker is installed
        .then(function() {
            return bringUpDocker(timeout);
        })
        .then(function() {
            deferred.resolve({
                "status": httpStatus.OK
            });
        })
        .fail(function(error) {
            /**
                for these calls, just want stderr to propagaate because that
                will get displayed to user
            */
            var errorMsg = error.errorLog;
            if (error.stderr) {
                errorMsg = error.stderr;
            }
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": errorMsg
            });
        });
        return deferred.promise();
    }

    // tries to connect to Docker daemon
    // rejects only if Docker not installed
    // (todo: currently this runs 'docker version', and if it fails,
    // checks if failure is because docker not installed and rejects.
    // any other failure considers Docker daemon as down.  Could there
    // be other reasons it fails other than daemon being down? distinguish?)
    function getDockerStatus() {
        var deferred = jQuery.Deferred();
        runShellCmd('docker version')
        .then(function(shellOutput) {
            deferred.resolve({
                "status": httpStatus.OK,
                "daemon": dockerStatusStates.UP
            });
        })
        .fail(function(error) {
            // if error is that the daemon is not avaialable, return http ok
            // with daemon down
            console.log("error: " + error);
            console.log("type of error: " + typeof error);
            if(error.errorLog.indexOf("command not found") > -1) {
                deferred.reject({
                    "status": httpStatus.InternalServerError,
                    "errorLog": "Docker is not installed!"
                });
            } else {
                deferred.resolve({
                    "status": httpStatus.OK,
                    "daemon": dockerStatusStates.DOWN
                });
            }
        });
        return deferred.promise();
    }

    // calls bash script that starts Docker daemon if its not running
    // (note: bash will prevent Docker start if NODOCKERSTART env var set)
    function bringUpDocker(timeout, noStart) {
        if (typeof noStart === 'undefined') {
            noStart = false;
        }
        if (typeof timeout === 'undefined') {
            timeout = ""; // just let it take the default
        }
        return performInstallStep("ensure_docker_up " + noStart + " " + timeout);
    }

    /**
     * returns JSON with data for each image in a given repo.
     * see doc of 'getDockerRepoImages' function for format.
     * (if no repo supplied in req. body, defaults to xcalar_design repo)
     * req body (optional): repo: repo to get images of
     */
    app.get("/getImages", function(req, res) {
        var reqJson = req.body;
        var repo = xcalar_docker_repo;
        if (reqJson.hasOwnProperty('repo')) {
            repo = reqJson.repo;
        }
        console.log("Get all images from repo " + repo);
        getDockerRepoImages(repo)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    /**
     * returns JSON with data for each image in the xcalar_design repo.
     * (this would return same output as /getImages w/ req body {'repo': "xcalar_design"},
     * but w/ extra attr 'current':true added to the entry for the image
     * currently running xcalar)
     */
    app.get("/getImages/xdpce", function(req, res) {
        getXdpceImageData()
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    /**
     * gets long git sha of image running a container.
     * (returned as 'sha' attr in return body)
     * req body: (required) 'container' attr: name of container to get image sha for)
     */
    app.get("/getCurrImage", function(req, res) {
        var reqJson = req.body;
        var container = xcalar_docker_container;
        if (reqJson.hasOwnProperty('container')) {
            container = reqJson.container;
        }
        console.log("Get image sha for " + container);
        getDockerImageShaForContainer(container)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    // revert to img with Docker id, give as json with  'id' key
    app.post("/revert", function(req, res) {
        console.log("revert an image");
        var reqJson = req.body;
        var imgId = reqJson.id;
        performInstallStep("revert_xdpce " + imgId)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.delete("/image", function(req, res) {
        var reqJson = req.body;
        var imgId = reqJson.id;
        performInstallStep("cleanly_delete_docker_image " + imgId)
        .always(function(message) {
            res.status(message.status).send(message);
        });
    });

    // apis for specific install steps

    app.post("/install/clear", function(req, res) {
        console.log("Clear existing containers");
        performInstallStep("clear_containers", false, true)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.post("/install/setup", function(req, res) {
        console.log("Setup up for install");
        performInstallStep("setup", false, true)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.post("/install/upload", function(req, res) {
        console.log("Load the new images to host");
        performInstallStep("load_packed_images", false, true)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.post("/install/createGrafana", function(req, res) {
        console.log("Create the grafana container", false, true);
        performInstallStep("create_grafana")
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.post("/install/createXdpce", function(req, res) {
        console.log("Create the Xdpce container", false, true);
        var reqJson = req.body;
        var ram = reqJson.ram;
        var cores = reqJson.cores;
        var uncompressedLic = reqJson.license;
        performInstallStep(
            "create_xdpce " + xcalar_docker_repo + ":lastInstall " +
            ram + " " + cores + ' "' + uncompressedLic + '"')
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.post("/install/cleanup", function(req, res) {
        console.log("Cleanup from the install process");
        performInstallStep("cleanup", false, true)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    // can be called as part of install or as nwjs menu; hence the 'install' attr
    app.post("/startXcalar", function(req, res) {
        console.log("Start xcalar");
        var reqJson = req.body;
        var isInstall = false;
        if (reqJson.install) {
            isInstall = true;
        }
        performInstallStep("start_xcalar", false, isInstall)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.post("/stopXcalar", function(req, res) {
        console.log("Stop xcalar");
        performInstallStep("stop_xcalar")
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    app.post('/install/verify', function(req, res) {
        console.log("Verify an installation");
        performInstallStep("verify_install", false, true)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    // sets launch mark to specific content
    // ('url' attr in request body is what will set in to launchfile)
    // so app will open to that URL on next launch
    // (or if its one of the special values app recognizes, 'install',
    // 'uninstall', etc., will open to that gui on next launch)
    app.post('/launchMark', function(req, res) {
        console.log("set launchMark");
        var launchArg = "";
        var reqJson = req.body;
        if (reqJson.url) {
            launchArg = reqJson.url;
        }
        createFile(launchFilePath, launchArg)
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    // apis for specific launch marks

    // so app will open installer on next launch
    app.post('/installMark', function(req, res) {
        console.log("set install mark");
        createFile(launchFilePath, "install")
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    // so app will open to uninstaller on next launch
    app.post('/uninstallMark', function(req, res) {
        console.log("set uninstall mark");
        createFile(launchFilePath, "uninstall")
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    // so app will open to revert tool on next launch
    app.post('/revertMark', function(req, res) {
        console.log("set revert mark");
        createFile(launchFilePath, "revert")
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    // so app will open to XD on next launch
    app.post('/xdMark', function(req, res) {
        console.log("set install mark");
        createFile(launchFilePath, "xd")
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    // so app will restart once it closes.
    // (is this being used anymore?)
    app.post('/restartMark', function(req, res) {
        console.log("set restart mark");
        createFile(launchFilePath, "restart")
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    // sets .installed file so app will open to XD next time
    app.post('/markInstalled', function(req, res) {
        console.log("set app install mark");
        createFile(installedFilePath)
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    // removes .installed file so app will open to installer next time
    app.post('/unmarkInstalled', function(req, res) {
        console.log("remove app install mark");
        fileDelete(installedFilePath)
        .always(function(message) {
            res.status(message.status).send(message);
        });

    });

    app.post('/uninstall', function(req, res) {
        console.log("uninstall XPE");
        var reqJson = req.body;
        var fullUninstall = reqJson.fullUninstall;
        console.log("full uninstall: " + fullUninstall);
        var extraOp = '';
        if (fullUninstall === true) {
            console.log("will uninstall it");
            extraOp = "true";
        }
        performInstallStep("nuke " + extraOp)
        .always(function(returnResult) {
            res.status(returnResult.status).send(returnResult);
        });
    });

    /**
     * shell processes spawned by this server get hashed in to an obj and removed
     * upon completion.  this api kills any such running processes in the hash
     */
    app.post('/killRunningShellProcs', function(req, res) {
        console.log("Check for running shell proccesses and terminate");
        if (shellProcs) {
            for (var shellProcKey in shellProcs) {
                if (shellProcs.hasOwnProperty(shellProcKey)) {
                    // keys are timestamps
                    console.log("Shell proc " + shellProcs[shellProcKey].cmd +
                        " still running; kill it");
                    shellProcs[shellProcKey].process.kill();
                    delete shellProcs[shellProcKey];
                }
            }
        }
        res.send({
            "status": httpStatus.OK,
        });
    });

    /**
     * shell processes spawned by this server get hashed in to an obj and removed
     * upon completion.  install processes get marked w/ 'isInstall' attr.
     * this api kills only those processes in the hash marked as 'isInstall'
     * (note that some APIs can be called as install or other process (ex: startXcalar);
     * is up to caller of those APIs to mark the process as an install process
     * when the API is called.  but for install only APIs, spawned processes
     * are automatically marked with 'isInstall')
     */
    app.post('/killRunningInstallProcs', function(req, res) {
        console.log("Check for running shell proccesses from install and terminate");
        if (shellProcs) {
            for (var shellProcKey in shellProcs) {
                if (shellProcs.hasOwnProperty(shellProcKey)
                    && shellProcs[shellProcKey].isInstall) {
                    // keys are timestamps
                    console.log("Shell proc " + shellProcs[shellProcKey].cmd +
                        " is an install process still running; kill it");
                    shellProcs[shellProcKey].process.kill();
                    delete shellProcs[shellProcKey];
                }
            }
        }
        res.send({
            "status": httpStatus.OK,
        });
    });

    function createHostConfigJson() {
        console.log("create json of host data");
        var deferred = jQuery.Deferred();
        var dockerJsonPromise = getDockerConfigData();
        var sysJsonPromise = getSystemConfigData();
        PromiseHelper.when(sysJsonPromise, dockerJsonPromise)
        .then(function(ret) {
            deferred.resolve({
                "status": httpStatus.OK,
                "system": {
                    "os": ret[0].os
                },
                "docker": {
                    "version": ret[1].version,
                    "maxCores": ret[1].maxCores,
                    "maxRam": ret[1].maxRam
                }
            });
        })
        .fail(function(fails) {
            var errMsg = concatErrMsg(fails);
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": errMsg
            });
        });
        return deferred.promise();
    }

    function fileExists(filePath) {
        var deferred = jQuery.Deferred();
        try {
            fs.stat(filePath, function(err, stat) {
                if (err == null) {
                    deferred.resolve({
                        "status": httpStatus.OK,
                        "exists": true
                    });
                } else if (err.code == 'ENOENT') {
                    deferred.resolve({
                        "status": httpStatus.OK,
                        "exists": false
                    });
                } else {
                    deferred.reject({
                        "status": httpStatus.InternalServerError,
                        "errorLog": "fs.stat failing on " + filePath + " for " +
                            " reason other than ENOENT " +
                            JSON.stringify(err)
                    });
                }
            });
        } catch (e) {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "hit an error trying to fs.stat " +
                    filePath + " error: " + e
            });
        }
        return deferred.promise();
    }

    function getLatestImgId() {
        var deferred = jQuery.Deferred();
        runShellCmd('bash -x "' + getImgIdFilePathdocker + '"' + xcalar_docker_repo + ':current')
        .then(function(shellOutput) {
            // trim trailing newlines
            var shaStr = shellOutput.stdout.replace(/^\s+|\s+$/g, '');
            deferred.resolve({
                "status": httpStatus.OK,
                "sha": shaStr
            });
        })
        .fail(function(error) {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "Could not determine current img: "
                    + JSON.stringify(error)
            });
        });
        return deferred.promise();
    }

    function getDockerConfigData() {
        console.log("create json of Docker config data");
        var deferred = jQuery.Deferred();
        var dockerVersionPromise = getDockerVersion();
        var dockerMaxSettingsPromise = getDockerMaxSettings();
        PromiseHelper.when(dockerMaxSettingsPromise, dockerVersionPromise)
        .then(function(ret) {
            deferred.resolve(Object.assign(ret[0], ret[1]));
        })
        .fail(function(fails) {
            console.log("one of the Docker config promises were rejected");
            var errMsg = concatErrMsg(fails);
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": errMsg
            });
        });
        return deferred.promise();
    }

    /**
     * returns long image SHA of the image hosted by a container (ex):
     * sha256:123413241324lkj13241322
     * If container requested not exists returns empty string
     * @container: name or id of container to get hosting image sha of
     */
    function getDockerImageShaForContainer(container) {
        var deferred = jQuery.Deferred();
        if (typeof container === "undefined") {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "No container given to getDockerImageShaForContainer!"
            });
            return deferred.promise();
        }

        runShellCmd("docker container inspect --format='{{.Image}}' " + container)
        .then(function(shellOutput) {
            // trim trailing newlines
            var shaStr = shellOutput.stdout.replace(/^\s+|\s+$/g, '');
            deferred.resolve({
                "status": httpStatus.OK,
                "sha": shaStr
            });
        })
        .fail(function(error) {
            // if failed because no container, return empty string
            if (error.errorLog.indexOf("No such container") !== -1) {
                deferred.resolve({
                    "status": httpStatus.OK,
                    "sha": ""
                });
            } else {
                deferred.reject({
                    "status": httpStatus.InternalServerError,
                    "errorLog": "error trying to get Docker image of " +
                        " container " + container +
                        " for reason other than container not existing...\n" +
                        JSON.stringify(error)
                });
            }
        });
        return deferred.promise();
    }

    /**
     * returns long image SHA for an image, i.e., sha256:12341325312asdgas
     * @imgId: a unique identifier of the image to get the long sha of
     *  examples: <image name>:<tag>, <image name> (if only image by that name),
     *  short id ('IMAGE ID' val in 'docker images'), long SHA (would return same value)
     */
    function getShaFromImgId(imgId) {
        console.log("get the long git SHA from short image id: " + imgId);
        var deferred = jQuery.Deferred();
        runShellCmd("docker image inspect --format='{{.Id}}' " + imgId)
        .then(function(shellOutput) {
            // trim off trailing newlines
            var shaStr = shellOutput.stdout.replace(/^\s+|\s+$/g, '');
            deferred.resolve({
                "status": httpStatus.OK,
                "sha": shaStr
            });
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    /**
     * returns formatted JSON for output of 'docker images'
     * (see doc of 'parseDockerImagesOutput' for format)
     */
    function getDockerRepoImages(repo) {
        console.log("Get all the Docker images that come from repo " + repo);
        var deferred = jQuery.Deferred();
        runShellCmd('docker images ' + repo + ' --format "{{json . }}"')
        .then(function(shellOutput) {
            return parseDockerImagesOutput(shellOutput.stdout);
        })
        .then(function(retResult) {
            deferred.resolve(retResult);
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    // gets docker image data for xcalar_design repo and adds 'current': true
    // attr to the JSON corresponding to the image that's currently running xcalar
    function getXdpceImageData() {
        var deferred = jQuery.Deferred();
        var xdpceImagesJson;
        var currXdpceContainerSha;
        getDockerRepoImages(xcalar_docker_repo)
        .then(function(res) {
            xdpceImagesJson = res;
            return getDockerImageShaForContainer(xcalar_docker_container)
        })
        .then(function(res) {
            if (typeof res.sha !== 'undefined') {
                currXdpceContainerSha = res.sha;
                if (xdpceImagesJson.images.hasOwnProperty(currXdpceContainerSha)) {
                    xdpceImagesJson.images[currXdpceContainerSha].current = true;
                }
            }
            deferred.resolve(xdpceImagesJson);
        })
        .fail(function(error) {
            deferred.reject(error)
        })
        return deferred.promise();
    }

    /**
     * Takes raw 'docker images' output, and returns formatted JSON
     * JSON format:
     *  {
     *    'images':
     *           {
     *             <shaA>: {'attr1': attr, ... },
     *             <shaB>: ...
     *           }
     *  }
     * where 'images' attr has one entry for each UNIQUE image in the output,
     * up to the long GIT SHA, keyed by that git sha
     * ('docker images' has row for each tagged image, w/ duplicate git shas),
     * and json attrs for each sha entry are standardized values, not 'docker images'
     * attribute names (see 'attrMap' in standardizeDockerImagesParsedLine)
     */
    function parseDockerImagesOutput(imagesOutput) {
        var imageJsons = {};
        var deferred = jQuery.Deferred();
        if (!imagesOutput) {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "No 'docker images' output to parse!"
            });
        } else {
            var images = imagesOutput.split(os.EOL);
            // for each line, will need both parse and ultimately call an async
            // function to get the git sha for that line/image.
            // keep these promises in a list, and resolve this function
            // only once all have resolved (else will imageJsons will be empty)
            var waitPromises = [];
            for (var i = 0; i < images.length; i++) {
                var nextLine = images[i];
                // invalid JSON line expected for one of the output lines
                try {
                    var parsed = JSON.parse(nextLine);
                    // skip over images w extra tags 'current' and 'lastInstall'
                    if (parsed.hasOwnProperty("Tag") &&
                        (parsed.Tag === 'current' || parsed.Tag === 'lastInstall')) {
                        continue;
                    }
                    // ensure all req attributes in a 'docker images' line
                    // are present, and create json for that line (gen git sha,
                    // save only desired attrs).
                    // put in wrapper function because in reject case, want to
                    // print the failed line, but that's a var decalred in this
                    // loop iteration which will be out of scope by the time the
                    // line's then (now wrapped) is processed.
                    // (so passing the line as a var to the wrapper function)
                    var singleImagePromise = processDockerImagesParsedLine(parsed);
                    waitPromises.push(singleImagePromise);
                    singleImagePromise
                    .then(function(res) {
                        return validateDockerImagesParsedLine(res, imageJsons);
                    })
                    .fail(function(error) {
                        deferred.reject(error);
                    });
                }
                catch (e) {
                    if (e instanceof SyntaxError) {
                        console.log("this is not a json line " +
                            "(expected for one line in " +
                            " 'docker images' output)");
                    } else {
                        throw e; // let others bubble up
                    }
                }
            }
        }
        PromiseHelper.when.apply(this, waitPromises)
        .then(function () {
            console.log("all lines of docker images output have been parsed " +
                " (but could have rejected during one of the line validations)");
            deferred.resolve({
                "status": httpStatus.OK,
                "images": imageJsons
            });
        })
        .fail(function (errors) {
            var error = null;
            for (var i = 0; i < errors.length; i++) {
                var arg = errors[i];
                if (arg != null && typeof arg === "object" && !(arg instanceof Array)) {
                    error = arg;
                    break;
                }
            }
            console.log(error);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    /**
     * Given a JSON parsed from a single line of 'docker images' output,
     * a wrapper function to:
     *  (a) make sure the parsed line has required attrs needed by
     *      the main 'parseDockerImages' function, and
     *  (b) gather disparate info about that line (the standardized version
     *      of the parsed data, and the git sha corresponding to that line)
     * This is getting its own function so the scope of the the
     * for loop vars in the main function (corresponding to the current line),
     * aren't overwritten by the time you execute a 'then' within the for loop,
     * since want to supply those in reject messages
     */
    function processDockerImagesParsedLine(dockerImagesParsedLine) {
        var deferred = jQuery.Deferred();
        if (dockerImagesParsedLine.hasOwnProperty("ID")) {
            var standardizedJson = standardizeDockerImagesParsedLine(dockerImagesParsedLine); // this an async function
                // returns a JSON with only the attrs we want, in the format we want them
            getShaFromImgId(dockerImagesParsedLine.ID)
            .then(function(res) {
                if (res.sha) {
                    deferred.resolve({
                        "status": httpStatus.OK,
                        "gitSha": res.sha,
                        "json": standardizedJson,
                        // send back original line, so can reference it in
                        // reject cases of the calling function, which is
                        // in a for loop and will lose scope for this line
                        "originalLine": dockerImagesParsedLine
                    });
                } else {
                    deferred.reject({
                        "status": httpStatus.InternalServerError,
                        "errorLog": "Could not obtain 'git sha' for a " +
                            " parsed line of 'docker images' output, " +
                            " or, 'getShaFromImgId' is no longer resolving " +
                            " promises with a 'sha' attribute!"
                    });
                }
            })
            .fail(function(error) {
                deferred.reject(error);
            });
        } else {
              deferred.reject({
                   "status": httpStatus.InternalServerError,
                "errorLog": "Line in 'Docker images' output " +
                       " parsed to valid JSON, but it does not have " +
                    " 'ID' attr.  Am hashing each line of " +
                    " 'docker images' output on git sha of " +
                    " that image, which currently relies on " +
                    " that ID attr... Can not make sense of this line!" +
                    " 'Docker images' line: " + JSON.stringify(dockerImagesParsedLine)
            });
        }
        return deferred.promise();
    }

    /**
     * validate resolved promise of 'processDockerImagesParsedLine'
     * @lineRes: a resolved promise of 'processDockerImagesParsedLine'
     * @currImageJsons: obj holding image jsons processed thus far
     *  (so can compare current one and avoid dupes)
     */
    function validateDockerImagesParsedLine(lineRes, currImageJsons) {

        var deferred = jQuery.Deferred();

        // these attrs should be set by the wrapper function
        if (lineRes.hasOwnProperty("gitSha") && lineRes.hasOwnProperty("json") &&
            lineRes.hasOwnProperty("originalLine")) {
            var gitSha = lineRes.gitSha;
            var convertedJson = lineRes.json;
            // if already entry for this in the main one; skip
            if (currImageJsons.hasOwnProperty(gitSha)) {
                console.log("// Dev comment: " +
                       "\n\tfound more than one line in " +
                    "'docker images' output for an image " +
                    "with git sha " + gitSha +
                    ", but already skipping images tagged " +
                    "'latest'" +
                    "\n\tIf you have not made " +
                    " multiple tags for this image, this " +
                    " indicates a logic error!." +
                    " \n\tLine w/ dupe sha image:\n\t" +
                    JSON.stringify(lineRes.originalLine) +
                    "\n\tSkipping this line in API output!\n");
            } else {
                currImageJsons[gitSha] = convertedJson;
            }
            deferred.resolve({
                "status": httpStatus.OK
            });
        } else {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "Logic error in " +
                    " 'parseDockerImagesOutput': the wrapper " +
                    "function it calls has resolved a " +
                    "promise but missing 'gitSha', 'json', " +
                    " or 'originalLine'  attr from it!"
            });
        }
        return deferred.promise();
    }

    /**
     * Given a parsed JSON for a single line of 'Docker images' output,
     * returns JSON with only the attrs the 'getImages' apis should return,
     * and with values in a standardized format
     * @imageLineJson: json to convert
     */
    function standardizeDockerImagesParsedLine(imageLineJson) {
        // keys are 'docker images' json attrs, values are attrs for the JSON this function will return
        var attrMap = {
            'ID': 'id', // refers to short id of an image, not long git sha
            'CreatedAt': 'age',
            'Tag': 'build',
            'Size': 'size',
        };

        var convertedJson = {};
        // values always want to put in
        convertedJson.denom = "GB";
        // ensure all required attrs are present,
        // add in with mapped attr that will be expected client side
        for (var reqAttr in attrMap) {
            if (attrMap.hasOwnProperty(reqAttr)) {
                // make sure req attr present in the parsed JSON for this image
                if (imageLineJson.hasOwnProperty(reqAttr)) {
                    // special case for size -
                    // strip off the 'GB' in the string that Docker returns
                    if (reqAttr === 'Size') {
                        imageLineJson[reqAttr] = imageLineJson[reqAttr].replace('GB', '');
                    }
                    convertedJson[attrMap[reqAttr]] = imageLineJson[reqAttr];
                    // if its the created at, make another attr for the birth date
                    if (reqAttr === 'CreatedAt') {
                        var fullDate = imageLineJson[reqAttr];
                        convertedJson.birthday = fullDate.split(/\s+/)[0];
                    }
                } else {
                    // express will handle error
                    throw new Error("A json returned by: " +
                        "'docker images <img> --format " +
                        '"{{json . }}"' +
                        "' is missing expected attribute " + reqAttr);
                }
            }
        }
        return convertedJson;
    }

    function getSystemConfigData() {
        console.log("get a lot of data about host system");
        // for now just checking the version,
        // will add in more later and use PromiseHelper.when
        return getMacOSVersion();
    }

    function getMacOSVersion() {
        console.log("Get MacOS version...");
        var deferred = jQuery.Deferred();
        runShellCmd("sw_vers -productVersion")
        .then(function(shellOutput) {
            var version = shellOutput.stdout.replace(/\n$/, '');
            // right now just make sure it returns
            if (version) {
                deferred.resolve({
                    "status": httpStatus.OK,
                    "os": version
                });
            } else {
                deferred.reject({
                    "status": httpStatus.InternalServerError,
                    "errorLog":'Could not determine MacOS version.'
                });
            }
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function getDockerVersion() {
        console.log("Get Docker Version");
        var deferred = jQuery.Deferred();
        runShellCmd("docker -v")
        .then(function(shellOutput) {
            var version = shellOutput.stdout.replace(/\n$/, '');
            if (version) {
                if (version && version.search("command not found") > 0) {
                    deferred.reject({
                        "status": httpStatus.InternalServerError,
                        "errorLog": "Could not run 'docker -v; " +
                            "got command not found in output." +
                            " Full output: " + version
                    });
                } else {
                    deferred.resolve({
                        "status": httpStatus.OK,
                        "version": version
                    });
                }
            } else {
                deferred.reject({
                    "status": httpStatus.InternalServerError,
                    "errorLog": "No output found when running 'docker -v'"
                });
            }
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    // gets docker max ram and cores by parsing docker config file
    function getDockerMaxSettings() {
        var deferred = jQuery.Deferred();
        // docker config info will be in a json file desc from this path;
        // need to find it
        runShellCmd("find " + dockerConfigBasePath + " -type f -name '*.json'")
        .then(function(shellRes) {
            var configFilePath = shellRes.stdout.replace(/\n$/, '');

            if (!configFilePath) {
                var deferredShell = jQuery.Deferred();
                deferredShell.reject({
                    "status": httpStatus.InternalServerError,
                    "errorLog": "Could not locate Docker json config nested from " +
                        dockerConfigBasePath +
                        "; can not determine your Docker settings.  Try updating to " +
                        " the latest Docker for Mac.  (Click your Docker icon, " +
                        "and select 'Check for Updates')"
                });
                return deferredShell.promise();
            } else {
                return parseDockerConfigFile(configFilePath);
            }
        })
        .then(function(resolvedPromise) {
            deferred.resolve(resolvedPromise);
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    /**
     * parses Docker config file and returns JSON with
     * 'maxRam' (<max ram GB> (int)), and 'maxCores' (int)
     * @configFilePath: abs path to Docker config file to parse
     *  (can it be rel?)
     */
    function parseDockerConfigFile(configFilePath) {
        console.log("parse Docker config file at " + configFilePath);
        var deferred = jQuery.Deferred();
        try {
            fs.readFile(configFilePath, 'utf8', function (err,data) {
                if (err) {
                    deferred.reject({
                        "status": httpStatus.InternalServerError,
                        "errorLog": "Found json file at " +
                            configFilePath +
                            ", but encountered error when trying to " +
                            " fs.readFile on the file.  Error: " + err
                    });
                } else {
                    // the file exists; parse it. its in 'arguments' key of json
                    var jsonContent = JSON.parse(data);
                    var argumentsList = jsonContent.arguments;
                    var lastArg, nextArg, ram, cores;
                    while (argumentsList) {
                        nextArg = argumentsList.pop();
                        if (ram && cores) {
                            break;
                        }
                        switch (nextArg) {
                            case "-c":
                                cores = lastArg;
                                break;
                            case "-m":
                                ram = lastArg;
                                break;
                            default:
                        }
                        lastArg = nextArg;
                    }
                    if (!cores || !ram) {
                        deferred.reject({
                            "status": httpStatus.InternalServerError,
                            "errorLog": "Using Docker json config file " +
                                configFilePath +
                                ", in 'arguments' list, " +
                                ", either 'ram' or 'cores' could not " +
                                " be determined." +
                                "\n(Looked -m for ram, -c for cores; " +
                                " Full contents of 'arguments' list: " +
                                argumentsList
                        });
                    } else {
                        // strip off M at end of ram and convert to GB
                        if (ram.slice(-1) === 'M') {
                            ram = ram.slice(0, ram.length-1);
                            var ramgb = Math.floor(parseInt(ram)/1000);
                            deferred.resolve({
                                "status": httpStatus.OK,
                                "maxRam": ramgb,
                                "maxCores": parseInt(cores)
                            });
                        } else {
                            deferred.reject({
                                "status": httpStatus.InternalServerError,
                                "errorLog": "Ram value in Docker config " +
                                    "('-m' in list in 'arguments' key " +
                                    " in json file " +
                                    configFilePath +
                                    ") is not expected denomination " +
                                    " 'm'!  Value found: " + ram
                            });
                        }
                    }
                }
            });
        } catch (e) {
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "Caught error when trying to parse Docker json at " +
                    configFilePath +
                    " error: " + e
            });
        }
        return deferred.promise();
    }

    /**
    function getHostAvailableDiskSpace() {
        console.log("Check availble disk space on host");
        deferred = jQuery.Deferred();
        deferred.resolve({"availDiskSpace": "APInotYetImplemented"});
    }
    */

    /**
     * create a file
     * @filePath: path to create file (is rel allowed?)
     * @content: if blank just touches file
     */
    function createFile(filePath, content) {
        console.log("Touch file: " + filePath);
        var deferred = jQuery.Deferred();
        var shellCmd;
        /**
            filePath might have empty space - need to " " around
            the filePath string.  However, do not change the string,
            because you will need to fs.stat it, and it will fail
            if there are double quotes around it
        */
        if (content) {
            shellCmd = "echo " + content + " >> " + '"' + filePath + '"';
        } else {
            shellCmd = "touch " + '"' + filePath + '"';
        }
        runShellCmd(shellCmd)
        .then(function(shellOutput) {
            // touch cmd gave 0 exit code;
            // make sure file exists now
            try {
                fs.stat(filePath, function(err, stat) {
                    if (err == null) {
                        deferred.resolve({
                            "status": httpStatus.OK
                        });
                    } else if (err.code == 'ENOENT') {
                        deferred.reject({
                            "status": httpStatus.InternalServerError,
                            "errorLog": "Failed to create file " + filePath +
                                "\nstdout: " + shellOutput.stdout +
                                "\nstderr: " + shellOutput.stderr
                        });
                     } else {
                        deferred.reject({
                            "status": httpStatus.InternalServerError,
                            "errorLog": "fs.stat failing on " +
                                shellCmd +
                                " for reason other than ENOENT " +
                                "\nstdout: " + shellOutput.stdout +
                                "\nstderr: " + shellOutput.stderr
                        });
                    }
                });
            } catch (e) {
                deferred.reject({
                    "status": httpStatus.InternalServerError,
                    "errorLog": "hit an error trying to fs.stat " +
                        " created file " + filePath +
                        " error: " + e
                });
            }
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    // deletes file w/ error checking along the way.
    // resolves if file doesn't exist but adds note in return json
    function fileDelete(filePath) {
        var deferred = jQuery.Deferred();
        fileExists(filePath)
        .then(function(res) {
            if (res.exists) {
                var rmcmd = 'rm "' + filePath + '"';
                runShellCmd(rmcmd)
                .then(function(res) {
                    // make sure does not exist
                    return fileExists(filePath);
                })
                .then(function(res) {
                    if (res.exists) {
                        deferred.reject({
                            "status": httpStatus.InternalServerError,
                            "errorLog": "ran shell cmd: " + rmcmd +
                                " no errs encountered, but file " +
                                filePath + " still showing as exists!"
                        });
                    } else {
                        deferred.resolve({
                            "status": httpStatus.OK
                        });
                    }
                })
                .fail(function(error) {
                    deferred.reject(error);
                });
            } else {
                deferred.resolve({
                    "status": httpStatus.OK,
                    "note": "The file did not exist"
                });
            }
        })
        .fail(function(error) {
            deferred.reject(error);
        });
        return deferred.promise();
    }

    // concats the 'errorLog' attrs of multiple JSON responses and returns as string
    // @returns: list of JSON responses.
    function concatErrMsg(returns) {
        var errMsg = "";
        for(var i=0; i < returns.length; i++) {
            if (returns[i] && returns[i].errorLog) {
                var errMsg = errMsg + returns[i].errorLog + "\n";
            }
        }
        return errMsg;
    }

    /**
     * calls a function in the local_installer_mac.sh
     * @installFunction short name of function to call (i.e., without 'cmd_' prefix)
     *  along with any args to the function
     * @fullOutput run as bash -x
     * @isInstall: is this running as an install step? (effects how shell processes
     *  are hashed; see documentation of 'runShellCmd')
     * performInstallStep("createGrafana");
     * performInstallStep("createXdpce 4 10");
     */
    function performInstallStep(installFunction, fullOutput=true, isInstall=false) {
        var extraOutputArg = "";
        if (fullOutput) {
            extraOutputArg = "-x";
        }
        // need to double quote the filePath to account for spaces
        var bashCmd = 'bash ' + extraOutputArg + ' "' + installerFilePath + '" '
            + installFunction;
        console.log("\n\t>> Installer: " + bashCmd);
        return runShellCmd(bashCmd, isInstall);
    }

    /**
     * Runs a shell cmd as an async child process;
     * hash the child process (there is killRunningProcesses apis)
     * once the process completes remove from hash.
     * @isInstallCmd: if true, will adds 'isInstall' attr when hashing the process,
     *  as there is a seperate api just for killing current proceeses started by install
     */
    function runShellCmd(cmd, isInstallCmd=false) {
        console.log("run a shell cmd: " + cmd);
        var deferred = jQuery.Deferred();
        try {
            // will save this in hash holding all curr running shell processes
            // key using timestamp
            var dateNow = new Date().getTime();
            var newProc = shelljs.exec(cmd, {async: true}, function(retCode, stdout, stderr) {
                var returnJson = {
                    'code': retCode,
                    'stdout': stdout,
                    'stderr': stderr,
                    'errorLog': stderr
                };
                if (retCode) {
                    returnJson.status = httpStatus.InternalServerError;
                    /**
                        save errorLog as stderr, and give a sep attr for
                        full error message.
                        errorLog is what will get propagated up to the gui to user
                    */
                    returnJson.errorLogFull = "Non-0 exit status when running " +
                        " shell cmd: " + cmd +
                        "\nStatus Code: " + retCode +
                        "\nStderr: " + stderr;
                    deferred.reject(returnJson);
                } else {
                    returnJson.status = httpStatus.OK;
                    deferred.resolve(returnJson);
                }
                // remove it from the hash
                delete shellProcs[dateNow];
            });
            var shellProcEntry = {
                'cmd': cmd,
                'process': newProc,
                'isInstall': isInstallCmd
            };
            shellProcs[dateNow] = shellProcEntry;
        } catch (e) {
            console.log("error thrown during shell command %o", e);
            deferred.reject({
                "status": httpStatus.InternalServerError,
                "errorLog": "Caught error invoking shelljs " +
                    " error: " + e
            });
        }
        return deferred.promise();
    }

    /**
        start the listening of the server
    */
    var server = app.listen(serverPort, function () {
        var host = server.address().address
        var port = server.address().port
        console.log("Example app listening at http://%s:%s", host, port)
    });
    // default timeout for server appears to be 4 minutes.
    // Docker image upload takes > 4 mins on slower running machines
    // so increase timeout
    server.timeout = 600000; // specify in ms
});
