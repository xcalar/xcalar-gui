window.Uninstaller = (function(Uninstaller, $) {
    var startApi = "/xdp/uninstallation/start";
    var statusApi = "/xdp/uninstallation/status";
    var $forms = $("form.uninstall");

    Uninstaller.setup = function() {
        InstallerCommon.setupForms($forms, validateStep, "uninstall");

        $forms.find(".backToInstall").click(function() {
            window.onbeforeunload = null;
            location.reload();
        });
    };

    function validateStep(stepId, $form) {
        switch (stepId) {
            case (0):
                return PromiseHelper.deferred().resolve().promise();
            case (1):
                return InstallerCommon.validateDiscover($form, $forms);
            case (2):
                return executeFinalArray($form);
            default:
                console.error("Unexpected step");
                return PromiseHelper.deferred().reject().promise();
        }
    }

    function executeFinalArray($form) {
        var deferred = PromiseHelper.deferred();
        var prevString = "UNINSTALL";
        var doingString = "UNINSTALLING...";
        var doingLower = "Uninstalling...";

        InstallerCommon.prepareUninstall();
        InstallerCommon.prepareStart($form, doingString, doingLower);
        InstallerCommon.startOperation(startApi)
        .then(function() {
            return InstallerCommon.getStatus($form, statusApi);
        })
        .then(function() {
            InstallerCommon.handleComplete($form);
            finalize();
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

        function finalize() {
            $form.find(".section").hide();
            $form.find(".title").hide();
            $form.find(".successSection").show();
            $form.find(".buttonSection").hide();
        }
    }
    return (Uninstaller);
}({}, jQuery));
