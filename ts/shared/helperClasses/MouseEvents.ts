// global MouseEvents
// useful to keep track of mousedown so when a blur happens, we know what
// element was clicked on to cause the blur
class MouseEvents {
    private $lastMouseDownTarget: JQuery;
    private $lastClickTarget: JQuery;
    private lastTime: number;
    // will store last 3 mousedowns (needed for undo)
    private lastMouseDownTargets: JQuery[];
    private $lastMDParents: JQuery;

    public constructor() {
        this.$lastMouseDownTarget = $(document);
        this.$lastClickTarget = this.$lastMouseDownTarget;
        this.lastTime = (new Date()).getTime();
        // will store last 3 mousedowns (needed for undo)
        this.lastMouseDownTargets = [this.$lastMouseDownTarget];
        this.$lastMDParents = this.$lastMouseDownTarget;
    }

    public setMouseDownTarget($element: JQuery): void {
        if (!$element) {
            this.$lastMouseDownTarget = $();
        } else {
            this.$lastMouseDownTarget = $element;
        }

        this.$lastMDParents = this.$lastMouseDownTarget.parents();

        this.lastTime = (new Date()).getTime();

        // store up to last 3 mousedowns
        if (this.lastMouseDownTargets.length === 3) {
            this.lastMouseDownTargets.splice(2, 1);
        }
        this.lastMouseDownTargets.unshift($element);
    };

    public setClickTarget($element): void {
        this.$lastClickTarget = $element;
    };

    public getLastMouseDownTarget(): JQuery {
        return this.$lastMouseDownTarget;
    };
    public getLastMouseDownParents(): JQuery {
        return this.$lastMDParents;
    };
    public getLastMouseDownTargets(): JQuery[] {
        return this.lastMouseDownTargets;
    };

    public getLastClickTarget(): JQuery {
        return this.$lastClickTarget;
    };

    public getLastMouseDownTime(): number {
        return this.lastTime;
    };

    public getLastMouseDownTargetsSerialized(): {
        el: HTML,
        time: number,
        parents: HTML[],
        prevMouseDowns: HTML[][]
    } {
        let mouseDownTargetHTML: string = "";
        const parentsHTML: string[] = [];
        const lastTargets: JQuery[] = gMouseEvents.getLastMouseDownTargets();
        const $lastTarget: JQuery = lastTargets[0];
        const prevTargetsHtml: string[][] = [];

        // get last 3 mousedown elements and parents
        if ($lastTarget && !$lastTarget.is(document)) {
            mouseDownTargetHTML = $lastTarget.clone().empty()[0].outerHTML;

            $lastTarget.parents().each(function() {
                if (!this.tagName) {
                    return;
                }
                let html: string = "<" + this.tagName.toLowerCase();
                $.each(this.attributes, function() {
                    if (this.specified) {
                        html += ' ' + this.name + '="' + this.value + '"';
                    }
                });
                html += ">";
                parentsHTML.push(html);
            });

            for (let i = 1; i < lastTargets.length; i++) {
                const prevTargetParents: string[] = [];
                lastTargets[i].parents().addBack().each(function() {
                    if (!this.tagName) {
                        return;
                    }
                    let html: string = "<" + this.tagName.toLowerCase();
                    $.each(this.attributes, function() {
                        if (this.specified) {
                            html += ' ' + this.name + '="' + this.value +
                                    '"';
                        }
                    });
                    html += ">";
                    prevTargetParents.unshift(html);
                });

                prevTargetsHtml.push(prevTargetParents);
            }
        }
        return {
            "el": mouseDownTargetHTML,
            "time": this.getLastMouseDownTime(),
            "parents": parentsHTML,
            "prevMouseDowns": prevTargetsHtml
        }
    }
}

