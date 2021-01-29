/* SearchBar */
/*
 * options:
 * ignore: string or number, if ignore value is present in input, searching
 *         will not occur
 * removeSelected: function, callback for removing highlighted text
 * highlightSelected: function, callback for highlighted text
 * scrollMatchIntoView: function, callback for scrolling to a highlighted match
 * onInput: function, callback for input event
 * onEnter: function, callback for enter event
 * removeHighlight: boolean, if true, will unwrap $list contents and remove
 *                 highlighted class
 * arrowsPreventDefault: boolean, if true, preventDefault & stopPropagation will
                         be applied to the search arrows
 * codeMirror: codeMirror object
 * $input: jquery input, will search for 'input' in $searchArea by default
 * $list: container (typically a ul) for search contents
 *
 */

 interface SearchBarOptions {
    $list?: JQuery; // typically a ul element
    $input?: JQuery;
    codeMirror?: CodeMirror.Editor;
    toggleSliderCallback?: Function;
    ignore?: string,
    removeSelected?: Function,
    hideSelected?: Function,
    highlightSelected?: Function,
    onEnter?: Function,
    onInput?: Function,
    scrollMatchIntoView?: Function,
    removeHighlight?: boolean,
    arrowsPreventDefault?: boolean,
    $searchInput?: JQuery,
    inputPaddingRight?: number
}

interface SearchBarClearOptions {
    keepVal?: boolean
}

class SearchBar {
    private $searchArea: JQuery;
    private $counter: JQuery;
    private $position: JQuery;
    private $total: JQuery;
    public $arrows: JQuery;
    private $upArrow: JQuery;
    private $downArrow: JQuery;
    private options: SearchBarOptions;
    private matchIndex: number = null;
    public numMatches: number;
    public $matches: JQuery;
    private $list: JQuery;
    private $searchInput: JQuery;
    private codeMirror: CodeMirror.Editor;
    private isSlider: boolean;
    private toggleSliderCallback: Function

    public constructor($searchArea: JQuery, options?: SearchBarOptions) {
        options = options || {};
        this.$searchArea = $searchArea;
        this.$counter = $searchArea.find('.counter');
        this.$position = this.$counter.find('.position');
        this.$total = this.$counter.find('.total');
        this.$arrows = $searchArea.find('.arrows');
        this.$upArrow = $searchArea.find('.upArrow');
        this.$downArrow = $searchArea.find('.downArrow');
        this.options = options || {};
        this.matchIndex = null;
        this.numMatches = 0;
        this.$matches = $();
        this.$list = options.$list; // typically a ul element

        if (options.codeMirror) {
            this.$searchInput = options.$input;
            this.codeMirror = options.codeMirror;
        } else {
            this.$searchInput = $searchArea.find('input');
        }

        if (this.$searchArea.parent().hasClass("slidingSearchWrap")) {
            this.isSlider = true;
        }

        if (typeof options.toggleSliderCallback === "function") {
            this.toggleSliderCallback = options.toggleSliderCallback;
        }

        this._setup();
    }

    private _setup(): void {
        const searchBar: SearchBar = this;
        const options: SearchBarOptions = searchBar.options || {};

        // keydown event for up, down, enter keys
        // secondaryEvent is the event passed in by codemirror
        function handleKeyDownEvent(event: JQueryEventObject | CodeMirror.Editor, secondaryEvent: JQueryEventObject): void {
            if (searchBar.numMatches === 0) {
                return;
            }
            let e: JQueryEventObject;
            if (searchBar.codeMirror) {
                e = secondaryEvent;
            } else {
                e = <JQueryEventObject> event;
            }

            if (e.which === keyCode.Up ||
                e.which === keyCode.Down ||
                e.which === keyCode.Enter) {
                let val: string;
                if (searchBar.codeMirror) {
                    val = searchBar.codeMirror.getValue();
                } else {
                    val = searchBar.$searchInput.val();
                }
                val = val.trim();
                // if ignore value exists in the input, do not search
                if (options.ignore && val.indexOf(options.ignore) !== -1) {
                    return;
                }

                if (e.preventDefault) {
                    e.preventDefault();
                }
                const $matches: JQuery = searchBar.$matches;
                const oldSearchIndex: number = searchBar.matchIndex;
                if (e.which === keyCode.Up) {
                    searchBar.matchIndex--;
                    if (searchBar.matchIndex < 0) {
                        searchBar.matchIndex = searchBar.numMatches - 1;
                    }

                } else if (e.which === keyCode.Down ||
                           e.which === keyCode.Enter) {
                    searchBar.matchIndex++;
                    if (searchBar.matchIndex >= searchBar.numMatches) {
                        searchBar.matchIndex = 0;
                    }
                }
                if (options.removeSelected) {
                    options.removeSelected(oldSearchIndex);
                }
                const $selectedMatch: JQuery = $matches.eq(searchBar.matchIndex);
                if (options.highlightSelected) {
                    options.highlightSelected($selectedMatch);
                }
                $selectedMatch.addClass('selected');
                searchBar.$position.html(searchBar.matchIndex + 1 + "");
                searchBar.scrollMatchIntoView($selectedMatch);
                if (e.which === keyCode.Enter &&
                    typeof options.onEnter === "function") {
                    options.onEnter();
                }
            }
        }
        // secondaryEvent is the event passed in by codemirror
        if (searchBar.codeMirror) {
            searchBar.codeMirror.on("keydown",
            function (instance: CodeMirror.Editor, secondaryEvent: JQueryEventObject) {
                handleKeyDownEvent(instance, secondaryEvent);
                return false;
            });
        } else {
            searchBar.$searchInput.on("keydown",
            function (event: JQueryEventObject, secondaryEvent: JQueryEventObject) {
                handleKeyDownEvent(event, secondaryEvent);
            });
        }

        searchBar.$downArrow.click(function() {
            const evt = $.Event("keydown", {which: keyCode.Down});
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                searchBar.$searchInput.trigger(evt);
            }
        });

        searchBar.$upArrow.click(function() {
            const evt = $.Event("keydown", {which: keyCode.Up});
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                searchBar.$searchInput.trigger(evt);
            }
        });

        if (options.arrowsPreventDefault) {
            searchBar.$arrows.mousedown(function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // click listener on search icon for searchbar sliding
        if (searchBar.isSlider) {
            searchBar.$searchArea.find(".searchIcon").click(function() {
                searchBar.toggleSlider();
            });
        }

        if (typeof options.onInput === "function") {
            searchBar.$searchInput.on("input", function(event) {
                if (!$(this).is(":visible")) return; // ENG-8642
                const val: string = $(this).val();
                options.onInput(val, event);
            });
        }
    }

    public getSearchIndex(): number {
        return this.matchIndex;
    }

    public highlightSelected($match: JQuery): any {
        if (this.options.highlightSelected) {
            return (this.options.highlightSelected($match));
        } else {
            return (undefined);
        }
    }
    public scrollMatchIntoView($match: JQuery): any {
        if (this.options.scrollMatchIntoView) {
            return (this.options.scrollMatchIntoView($match));
        } else {
            return (this._scrollMatchIntoView($match));
        }
    }
    private _scrollMatchIntoView($match: JQuery): void {
        const $list: JQuery = this.$list;
        if (!$list || $list.length === 0) {
            return;
        }
        xcUIHelper.scrollIntoView($match, $list);
    }
    public updateResults($matches: JQuery): void {
        const searchBar: SearchBar = this;
        searchBar.$matches = $matches;
        searchBar.numMatches = $matches.length;
        searchBar.$matches.eq(0).addClass('selected');
        const position: number = Math.min(1, searchBar.numMatches);
        searchBar.matchIndex = position - 1;
        searchBar.$position.text(position);
        searchBar.$total.text("of " + searchBar.numMatches);
        if (searchBar.isSlider) {
            const paddingRight = searchBar.options.inputPaddingRight || 0;
            searchBar.$searchInput.css("padding-right",
                                        searchBar.$counter.width() + 25 + paddingRight);
        }
    }
    public clearSearch(callback?: Function, options?: SearchBarClearOptions): void {
        const searchBar: SearchBar = this;
        searchBar.$position.html("");
        searchBar.$total.html("");
        searchBar.matchIndex = 0;
        searchBar.$matches = $();
        searchBar.numMatches = 0;
        if (!options || !options.keepVal) {
            if (searchBar.codeMirror) {
                searchBar.codeMirror.setValue("");
            } else {
                searchBar.$searchInput.val("");
            }
        }
        if (searchBar.options.removeHighlight && searchBar.$list) {
            searchBar.$list.find(".highlightedText").contents().unwrap();
        }
        if (searchBar.isSlider) {
            searchBar.$searchInput.css("padding-right", 25);
        }

        if (typeof callback === "function") {
            callback();
        }
    }
    public toggleSlider(): void {
        const searchBar: SearchBar = this;
        if (!searchBar.isSlider) {
            return;
        }
        const $searchBar: JQuery = searchBar.$searchArea;
        if ($searchBar.hasClass('closed')) {
            $searchBar.removeClass('closed');
            setTimeout(function() {
                searchBar.$searchInput.focus();
            }, 310);

        } else {
            $searchBar.addClass('closed');
            searchBar.$searchInput.val("");

            if (searchBar.toggleSliderCallback) {
                searchBar.toggleSliderCallback();
            } else {
                searchBar.clearSearch();
            }
        }
    }
}
