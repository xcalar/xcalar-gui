window.Installer = (function(Installer, $) {
    var startApi = "/xdp/installation/start";
    var statusApi = "/xdp/installation/status";
    var $forms = $("form.install");
    var isTarball = $("#installerContainer").hasClass("tarball");

    Installer.setup = function() {
        InstallerCommon.setupForms($forms, validateStep, "install");
        $forms.find("#numServers").on("keyup", function(e) {
            var keyCode = e.which;
            if (keyCode === 13) {
                var $form = $(this).closest("form");
                generateHostFields($form);
            }
        });

        $forms.find(".checkbox.adSubGroupTree").click(function() {
            // If option is the same as before, ignore and return
            $(this).toggleClass("checked");
            return false;
        });

        $forms.find(".checkbox.adSearchShortName").click(function() {
            // If option is the same as before, ignore and return
            $(this).toggleClass("checked");
            return false;
        });

        $forms.find(".checkbox.TLSChoice").click(function() {
            // If option is the same as before, ignore and return
            $(this).toggleClass("checked");
            return false;
        });

        $forms.find(".checkbox.supportBundles").click(function() {
            // If option is the same as before, ignore and return
            $(this).toggleClass("checked");
            return false;
        });

        $forms.find(".checkbox.createDefaultAdmin").click(function() {
            // If option is the same as before, ignore and return
            var $form = $(this).closest("form");
            $(this).toggleClass("checked");
            if ($(this).hasClass("checked")) {
                $form.find(".defaultAdminParams").show();
            } else {
                $form.find(".defaultAdminParams").hide();
            }
        });

        $forms.find(".checkbox.selectHotPatch").click(function() {
            // If option is the same as before, ignore and return
            $(this).toggleClass("checked");
            return false;
        });

        $("#hostForm .btn.servers").on("click", function() {
            var $form = $(this).closest("form");
            generateHostFields($form);
        });

        $(document).on("keydown", ".ipOrFqdn", function(e) {
            // For chrome or something like that
            if (e.which === 38) {
                e.preventDefault();
            }
        });

        $(document).on("keypress", ".ipOrFqdn", function(e) {
            // For safari or something like that
            if (e.which === 38) {
                e.preventDefault();
            }
        });

        $(document).on("keyup", ".ipOrFqdn", function(e) {
            var keyCode = e.which;
            if (keyCode === 38) {
                // keyup
                if ($(this).closest(".row").index() - 1 > 0) {
                    $(this).closest(".row").prev().find("input").focus();
                    // -1 because of header row
                }
            } else if (keyCode === 40) {
                var numKids = $(this).closest(".hostnameSection").find(".row")
                                     .length;
                // keydown
                if ($(this).closest(".row").index() + 1 === numKids) {
                    // -1 because of header row
                } else {
                    var $input = $(this).closest(".row").next().find("input");
                    $input.focus();
                    $input.caret($input.val().length);
                }
            }
        });
    };

    function generateHostFields($form) {
        var numServers = parseInt($form.find("#numServers").val());
        var html = "";
        var i;
        var license = InstallerCommon.getLicense();

        InstallerCommon.hideFailure($form);

        if (numServers === 0 || numServers === "") {
            return;
        }

        if (!license.NodeCount || (numServers > license.NodeCount)) {
            var nodeCount = (license.NodeCount) ? license.NodeCount : -1;
            var args = [ "The requested number of " + numServers + " servers",
                         "exceeds the " + nodeCount + " allowed by license" ];
            InstallerCommon.showFailure($form, args);
            return;
        }

        var curNum = $form.find(" .row").length - 1;
        if (curNum < numServers) {
            // Add extra rows at bottom
            var extraRows = numServers - curNum;
            for (i = 0; i < extraRows; i++) {
                html += hostnameHtml();
            }
            $form.find(" .row").last().after(html);
        } else if (curNum > numServers) {
            // Remove from the bottom
            var toRemove = curNum - numServers;
            for (i = 0; i < toRemove; i++) {
                $form.find(" .row").last().remove();
            }
        }

        $form.find(".hostnameSection").removeClass("hidden");
        $form.find(".credentialSection").removeClass("hidden");
        $form.find(".installationDirectorySection").removeClass("hidden");
        $form.find(".serializationDirectorySection").removeClass("hidden");
        $form.find(".supportBundleSection").removeClass("hidden");
        $form.find(".hotPatchSection").removeClass("hidden");
        $form.find(".title").removeClass("hidden");
        $("#installButton").removeClass("hidden");
        $("#serversButton").addClass("hidden");

        function hostnameHtml() {
            return ('<div class="row">' +
                '<div class="leftCol hostname">' +
                  '<div class="publicName">' +
                    '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                    'value="" ' +
                    'name="useless" placeholder="[IP or FQDN]">' +
                    '<div class="bar">Public</div>' +
                  '</div>' +
                  '<div class="privateName">' +
                    '<input class="input ipOrFqdn" type="text" autocomplete="off" ' +
                    'value="" ' +
                    'name="useless" placeholder="[IP or FQDN (Optional)]">' +
                    '<div class="bar">Private</div>' +
                  '</div>' +
                '</div>' +
                '<div class="rightCol status">' +
                  '<span class="curStatus">' +
                    '----' +
                  '</span>' +
                '</div>' +
            '</div>');
        }
    }

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
                    return InstallerCommon.validateNfs($form);
                case (4):
                    return InstallerCommon.setupLoginConfiguration($form);
                case (5):
                    return validateInstall($form);
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
                    return InstallerCommon.validateNfs($form);
                case (3):
                    return InstallerCommon.setupLoginConfiguration($form);
                case (4):
                    return validateInstall($form);
                default:
                    console.error("Unexpected step");
                    return PromiseHelper.deferred().reject().promise();
            }
        }
    }

    function validateInstall($form) {
        var deferred = PromiseHelper.deferred();
        InstallerCommon.validateSettings($form)
        .then(function() {
            return executeFinalArray($form);
        })
        .fail(function(arg1, arg2) {
            deferred.reject(arg1, arg2);
        });
        return deferred.promise();
    }

    function executeFinalArray($form) {
        var deferred = PromiseHelper.deferred();
        var prevString = "INSTALL";
        var doingString = "INSTALLING...";
        var doingLower = "Installing...";

        prepareStart();
        InstallerCommon.startOperation(startApi)
        .then(function() {
            scrollToStatus();
            return InstallerCommon.getStatus($form, statusApi);
        })
        .then(function() {
            InstallerCommon.handleComplete($form);
            InstallerCommon.finalize($form, isTarball);
            deferred.resolve();
        })
        .fail(function() {
            handleFail();
            if (arguments.length > 0 && arguments[0] !== "Cancelled") {
                InstallerCommon.showErrorModal(arguments[1]);
            }
            if (arguments[0]) {
                deferred.reject(arguments[0], arguments[1]);
            } else {
                deferred.reject("Failed to install", arguments[1]);
            }
        });
        return deferred.promise();

        function prepareStart() {
            var hostnames = $form.find(".row:not(.header)");
            for (var i = 0; i < hostnames.length; i++) {
                if (hostnames.eq(i).find("input").val().trim().length === 0) {
                    hostnames.eq(i).hide();
                }
            }
            $form.find(".section:not(.buttonSection) input").prop("disabled", true);
            $form.find("#numServers").prop("disabled", true);
            $form.find(".radioButtonGroup").addClass("unclickable");
            InstallerCommon.prepareStart($form, doingString, doingLower);
        }

        function handleFail() {
            $form.find(".section:not(.buttonSection) input").prop("disabled", false);
            $form.find("#numServers").prop("disabled", false);
            $form.find(".radioButtonGroup").removeClass("unclickable");
            InstallerCommon.handleFail($form, prevString, doingLower);
        }

        function scrollToStatus() {
            $("#bottomSection").animate({ scrollTop: 0}, 1000);
        }
    }
    return (Installer);
}({}, jQuery));

