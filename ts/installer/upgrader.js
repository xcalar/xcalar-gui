window.Upgrader = (function(Upgrader, $) {
    var startApi = "/xdp/upgrade/start";
    var statusApi = "/xdp/upgrade/status";
    var $forms = $("form.upgrade");
    var isTarball = $("#installerContainer").hasClass("tarball");

    Upgrader.setup = function() {
        InstallerCommon.setupForms($forms, validateStep, "upgrade");
        // Set up listeners for radioButtons
        $forms.find(".checkbox.updateLicense").click(function() {
            // If option is the same as before, ignore and return
            var $form = $(this).closest("form");
            $(this).toggleClass("checked");
            if ($(this).hasClass("checked")) {
                $form.find(".licenseKey").show();
            } else {
                $form.find(".licenseKey").hide();
            }
            return false;
        });

        $forms.find(".checkbox.changeXcalarRoot").click(function() {
            // If option is the same as before, ignore and return
            var $form = $(this).closest("form");
            $(this).toggleClass("checked");
            if ($(this).hasClass("checked")) {
                $form.find(".update").removeClass("hidden");
            } else {
                $form.find(".update").addClass("hidden");
            }
            return false;
        });
    };

    function validateStep(stepId, $form) {
        if (isTarball) {
            switch (stepId) {
                case (0):
                    return PromiseHelper.deferred().resolve().promise();
                case (1):
                    return InstallerCommon.validateKey($form);
                case (2):
                    return InstallerCommon.validatePreConfig($form);
                case (3):
                    return InstallerCommon.validateDiscover($form, $forms);
                case (4):
                    return InstallerCommon.validateNfs($form);
                case (5):
                    return executeFinalArray($form);
                default:
                    console.error("Unexpected step");
                    return PromiseHelper.deferred().reject().promise();
            }
        } else {
            switch (stepId) {
                case (0):
                    return PromiseHelper.deferred().resolve().promise();
                case (1):
                    return InstallerCommon.validateKey($form);
                case (2):
                    return InstallerCommon.validateDiscover($form, $forms);
                case (3):
                    return InstallerCommon.validateNfs($form);
                case (4):
                    return executeFinalArray($form);
                default:
                    console.error("Unexpected step");
                    return PromiseHelper.deferred().reject().promise();
            }
        }
    }

    function executeFinalArray($form) {
        var deferred = PromiseHelper.deferred();
        var prevString = "UPGRADE";
        var doingString = "UPGRADING...";
        var doingLower = "Upgrading...";

        InstallerCommon.prepareStart($form, doingString, doingLower);
        InstallerCommon.startOperation(startApi)
        .then(function() {
            return InstallerCommon.getStatus($form, statusApi);
        })
        .then(function() {
            InstallerCommon.handleComplete($form);
            InstallerCommon.finalize($form, isTarball);
            deferred.resolve();
        })
        .fail(function() {
            InstallerCommon.handleFail($form, prevString, doingLower);
            if (arguments.length > 0 && arguments[0] !== "Cancelled") {
                InstallerCommon.showErrorModal(arguments[1]);
            }
            deferred.reject("Failed to install", arguments[1]);
        });
        return deferred.promise();
    }
    return (Upgrader);
}({}, jQuery));
