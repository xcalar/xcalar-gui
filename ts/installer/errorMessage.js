window.ErrorMessage = (function(ErrorMessage, $){
    var $modal;   // $("#ErrorMessageModal")
    var $modalBg; // $("#modalBackground")
    var colorNum = 8;
    // constant
    var minHeight = 580;
    var minWidth  = 800;

    ErrorMessage.setup = function() {
        $modal = $("#errorMessageModal");
        $modalBg = $("#installerBackground");
        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $modal.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document"
        });

        var $fullScreenBtn = $modal.find('.fullScreen');
        var $exitFullScreenBtn = $modal.find('.exitFullScreen');
        if ($fullScreenBtn.length) {
            $fullScreenBtn.click(function() {
                var winWidth = $(window).width();
                var winHeight = $(window).height();
                $modal.width(winWidth - 14);
                $modal.height(winHeight - 9);
                $modal.css({
                    "top": 0,
                    "left": Math.round((winWidth - $modal.width()) / 2)
                });
            });

        }
        if ($exitFullScreenBtn.length) {
            $exitFullScreenBtn.click(function() {
                $modal.width(minWidth);
                $modal.height(minHeight);
                $modal.css({
                    "top": "calc(50% - 400px)",
                    "left": "calc(50% - 300px)"
                });
            });
        }
        // set close and cancel button
        $modal.on("click", ".close", function(event) {
            event.stopPropagation();
            ErrorMessage.close();
        });

        $modal.on("click", ".showHideButton", function() {
            var panelHeight = $modal.height();
            var logWrapHeight = $modal.find(".logWrap").height();
            $modal.toggleClass("hiddenLog");
            logWrapHeight = Math.max(logWrapHeight, $modal.find(".logWrap").height());
            if ($modal.hasClass("hiddenLog")) {
                $modal.height(panelHeight - logWrapHeight);
            } else {
                $modal.height(panelHeight + logWrapHeight);
            }
        });
    };

    ErrorMessage.show = function(options) {
        options = options || {};
       /* options includes:
            errorCode: error code
            description: Error description
            errorMessage: error Message
            isShow: whether to show the error Logs or not
            lockScreen: if screen should be frozen
            highZIndex: boolean, if true then will set z-index above locked
                        background modal
        */
        $modalBg.show();
        $modal.show();
        configErrorMessageModal(options);

        // resize modal back to it's smallest width and height
        $modal.width(minWidth);
        $modal.height(minHeight);

        if ($modal.find("button:visible").length > 3) {
            $modal.addClass("flex");
        } else {
            $modal.removeClass("flex");
        }

        if (window.isBrowserIE) { // all text will be on 1 line otherwise
            setTimeout(function() {
                $modal.width(parseInt(minWidth) + 1);
                setTimeout(function() {
                    $modal.width(minWidth);
                });
            });
        }
    };

    ErrorMessage.close = function() {
        $modal.hide();
        $modalBg.hide();
        ErrorMessage.clear();
    };

    ErrorMessage.clear = function() {
        $("#errorMessageModal .modalHeader .text").text("");
        $("#errorMessageModal .modalInstruction .up").text("");
        $("#errorMessageModal .modalInstruction .down").text("");
        $("#errorMessageModal .formWrap .errorCode .text").text("");
        $("#errorMessageModal .formWrap .errorMessage .text").text("");
    };

    // configuration for error Log modal
    function configErrorMessageModal(options) {
        /* options includes:
            title: window title
            errorCode: error code
            description: Error description
            errorMessage: error Message
            isShow: whether to show the error Logs or not
            lockScreen: if screen should be frozen
            highZIndex: boolean, if true then will set z-index above locked
                        background modal
        */
        options = options || {};
        // set title
        var title = options.title || ErrorMessageTStr.title;
        $("#errorMessageModal .modalHeader .text").text(title);

        // set instruction up
        var instrUp = options.instrUp || ErrorMessageTStr.instrUp;
        $("#errorMessageModal .modalInstruction .up").text(instrUp);

        // set instruction down
        var instrDown = options.instrDown || ErrorMessageTStr.instrDown;
        $("#errorMessageModal .modalInstruction .down").text(instrDown);

        // set error code
        var errorCode = options.errorCode || "";
        $("#errorMessageModal .formWrap .errorCode .text").text(errorCode);

        // set error Message
        var errorMessage = options.errorMessage || "";
        $("#errorMessageModal .formWrap .errorMessage .text").text(errorMessage);

        // set Log
        var installationLogs = options.installationLogs || "";
        appendLog(installationLogs);
    }

    function appendLog(installationLogs) {
        var $content = $("#errorMessageModal .logWrap .logArea");
        try {
            installationLogs = installationLogs.split('\n').reverse().join('\n');
            if (installationLogs[0] === '\n') {
                installationLogs = installationLogs.substring(1);
            }
        } catch (e) {
            // skip
        }
        // $content.html(splitLogByHost(installationLogs));
        $content.html("<div class='msgRow'>" + installationLogs + "</div>");
    }

    function splitLogByHost(logs) {
        var colorId = 0;
        var out = "";
        var allNodes = logs.split("Host:");
        for (var i = 0; i < allNodes.length; i++) {
            if (allNodes[i] === "" ||
                allNodes[i].indexOf("for all Nodes:") !== -1) {
                continue;
            } else {
                var color = "color" + colorId;
                out += "<div class='msgRow'>" +
                       "<div class='" + color + "'>" +
                       "Host:" + allNodes[i] +
                       "</div>" +
                       "</div>";
                colorId++;
                if (colorId >= colorNum) {
                    colorId -= colorNum;
                }
            }
        }
        return out;
    }
    return (ErrorMessage);
}({}, jQuery));
