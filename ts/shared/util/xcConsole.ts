namespace xcConsole {
    setupDebugOn();
    let showThrift: boolean = false;
    let logs: Object[] = [];

    /**
     * xcConsole.log
     */
    export function log(...args: any[]): string[] {
        if (window["isBrowserMicrosoft"] || window["isBrowserSafari"]) {
            return;
        }
        let stack: string[] = stackTrace();
        if (stack[0] != null && stack[0].indexOf("thriftLog") === 0) {
            if (!showThrift) {
                return;
            }
        }

        if (this.isError) {
            // if error, we show stack trace in console no matter what
            stack.shift();
            console.error.apply(this, args.concat([stack]));
            logs.push({msg: args, stack: stack});

            if (isDebugOn()) {
                showAlert(args, stack, true);
            }
        } else {
            if (isDebugOn()) {
                if (args[2] && args[2].stack) {
                    stack = args[2].stack;
                    args.splice(2, 1);
                }
                console.log.apply(this, args.concat([stack]));
                logs.push({msg: args, stack: stack});
                showAlert(args, stack);
            } else {
                // if debug is off, we do not show stack trace in console
                let originMsg: string = null;
                if (stack[0]) {
                    originMsg = stack[0].split(" ").pop();
                }
                console.log.apply(this, args.concat(originMsg));
            }
        }
        return stack;
    };

    /**
     * xcConsole.error
     */
    export function error(..._args: any[]): string[] {
        return xcConsole.log.apply({isError: true}, arguments);
    };

    /**
     * xcConsole.getLogs
     */
    export function getLogs(): Object[] {
        return logs;
    };

    /**
     * xcConsole.toggleThrift
     * @param show
     */
    export function toggleThrift(show: boolean = false): boolean {
        showThrift = show;
        return showThrift;
    };

    function setupDebugOn() {
        try {
            window["debugOn"] = window["debugOn"] ||
                                xcLocalStorage.getItem("debugOn") === "true" ||
                                false;
        } catch(e) {
            console.error(e);
        }
    }

    function isDebugOn(): boolean {
        return window["debugOn"] || false;
    }

    function stackTrace(): string[] {
        let err: Error = new Error();
        let stack: string[] = err.stack.split("\n");
        stack.splice(0, 3);

        let firstStack: string = stack[0].trim();
        if (firstStack.indexOf('at xcAssert ') === 0 ||
            firstStack.indexOf('at window.onerror') === 0) {
            stack.shift();
        }
        for (let i = 0; i < stack.length; i++) {
            stack[i] = stack[i].trim().slice(3).split(" ").join("   ");
        }
        return stack;
    }

    function setupAlert(): JQuery {
        let $alert: JQuery = $("#debugAlert");
        if ($alert.length) {
            return $alert;
        }

        const alert: string =
            '<div id="debugAlert">' +
                '<div class="title">DEBUG' +
                    '<div class="clear" title="clear">' +
                        '<i class="icon xi-forbid"></i>' +
                    '</div>' +
                    '<div class="close" title="close">' +
                        '<i class="icon xi-close"></i>' +
                    '</div>' +
                '</div>' +
                '<div class="content"></div>' +
           '</div>';
        $("#container").append(alert);

        $alert = $("#debugAlert");

        $alert.draggable({
            "handle": ".title",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $alert.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": 100,
            "minWidth": 200,
            "containment": "document"
        });

        $alert.find(".close").click(function() {
            $alert.hide();
        });
        $alert.find(".clear").click(function() {
            $alert.find(".content").empty();
        });

        return $alert;
    }

    function showAlert(args: any[], stack: string[], isError:boolean=false): void {
        let $alert: JQuery = setupAlert();
        $alert.show();
        let stackStr: string = "";
        let msg: string = "";
        for (let i = 0; i < stack.length; i++) {
            msg = xcStringHelper.escapeHTMLSpecialChar(stack[i]);
            msg = msg.replace(/\(/g, '<span style="color: #999;">');
            msg = msg.replace(/\)/g, '</span>');
            stackStr += '<div>' + msg + '</div>';
        }

        const tag: string = isError ? '<div style="color:red;">' : '<div>';
        const content: string =
            tag +
                '<span class="semibold">Info:</span><br/>' +
                JSON.stringify(args) +
            '</div>' +
            '<div>' +
                '<span class="semibold">Stack:</span><br/>' +
                stackStr +
            '</div>';
        $alert.find('.content').html(content);
    }
}
