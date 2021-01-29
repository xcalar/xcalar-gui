import { Router } from "express";
import { Status } from "../utils/supportStatusFile";
import * as xcConsole from "../utils/expServerXcConsole"
import support from "../utils/expServerSupport";
export const router = Router();
import tutorialManager from "../controllers/tutorialManager";

router.post("/tutorial/download",
            [support.checkAuth], function(req, res) {
    if (!tutorialManager.s3Initialize()) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    xcConsole.log("Download Tutorial");
    let pkg = req.body;
    tutorialManager.downloadTutorial(pkg.name, pkg.version)
    .then(function(ret) {
        res.jsonp({status: Status.Ok, data: ret.data});
    })
    .fail(function(err) {
        xcConsole.error("download extension failed", err);
        res.jsonp({
            status: Status.Error,
            error: err
        });
    });
});

router.get("/tutorial/listPackage",
           [support.checkAuth], function(req, res) {
    xcConsole.log("Listing Tutorials");
    if (!tutorialManager.s3Initialize()) {
        return res.jsonp({
            status: Status.Error,
            error: "s3 package not setup correctly!"
        });
    }
    tutorialManager.fetchAllTutorials()
    .then(function(data) {
        return res.send(data);
    })
    .fail(function(error) {
        return res.send({"status": Status.Error, "error": error});
    });
});