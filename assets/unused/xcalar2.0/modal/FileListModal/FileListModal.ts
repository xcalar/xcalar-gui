interface FileTreeNode {
    value: any;
    children: FileTreeNode[];
}

class FileListModal {
    private static _instance: FileListModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _searchBar: SearchBar;
    private _nodesMap: {[key: string]: FileTreeNode};
    private _roots: {[key: string]: FileTreeNode};
    private _curResultSetId: string;
    private _modalId: number;

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            noEnter: true,
            sizeToDefault: true,
            defaultWidth: 400,
            defaultHeight: 400
        });

        this._addEventListeners();
        this._setupSearch();
    }

    /**
     * FileListModal.Instance.show
     * @param dsId
     * @param dsName
     * @param hasFileErrors
     */
    public show(dsId: string, dsName: string, hasFileErrors: boolean): void {
        let $modal = this._getModal();
        if ($modal.is(":visible")) {
            return;
        }
        this._modalId = Date.now();
        let curModalId: number = this._modalId;
        dsName = dsName || "Dataset";
        this._modalHelper.setup();
        $modal.addClass("load");
        $modal.find(".loadingSection .text").text(StatusMessageTStr.Loading);

        this._getList(dsId, hasFileErrors)
        .then((list) => {
            if (this._modalId !== curModalId) {
                return;
            }

            this._constructTree(list, dsName);
            this._drawAllTrees();
            this._resizeModal();
        })
        .fail((error) => {
            if (this._modalId !== curModalId) {
                return;
            }
            $modal.addClass("hasError");
            let type: string = typeof error;
            let msg: string;
            let log: string = "";

            if (type === "object") {
                msg = error.error || AlertTStr.ErrorMsg;
                log = error.log;
            } else {
                msg = error;
            }

            $modal.find(".errorSection").text(msg + ". " + log);
        })
        .always(() => {
            if (this._modalId !== curModalId) {
                return;
            }
            $modal.removeClass("load");
        });
    }

    private _getModal(): JQuery {
        return $("#fileListModal");
    }

    private _close(): void {
        let $modal = this._getModal();
        $modal.find(".treeWrap").empty();
        this._modalHelper.clear();
        this._searchBar.clearSearch();
        $modal.find(".searchbarArea").addClass("closed");
        this._nodesMap = null;
        this._roots = null;
        this._modalId = null;
        $modal.removeClass("hasError load");
        if (this._curResultSetId) {
            XcalarSetFree(this._curResultSetId);
        }
        this._curResultSetId = null;
    }


    private _scrollMatchIntoView($match: JQuery): void {
        $match.parents("li.collapsed").removeClass("collapsed");
        let $container = this._getModal().find(".modalMain");
        let containerHeight: number = $container.outerHeight();
        let scrollTop: number = $container.scrollTop();
        let containerTop: number = $container.offset().top;
        let matchOffset: number = $match.offset().top - containerTop;

        if (matchOffset > containerHeight - 15 || matchOffset < 0) {
            $container.scrollTop(scrollTop + matchOffset - (containerHeight / 2));
        }
    }

    private _searchText(): void {
        let $modal = this._getModal();
        let $content = $modal.find(".treeWrap");
        let $searchArea = $modal.find(".searchbarArea");
        let $searchInput = $searchArea.find("input");
        let text: string = $searchInput.val().toLowerCase();
        if (text === "") {
            this._searchBar.clearSearch();
            return;
        }

        $content.find(".highlightedText").contents().unwrap();
        let $targets = $content.find('.name').filter(function() {
            return ($(this).text().toLowerCase().indexOf(text) !== -1);
        });

        text = xcStringHelper.escapeRegExp(text);
        let regex = new RegExp(text, "gi");

        $targets.each(function() {
            let foundText: string = $(this).text();
            foundText = foundText.replace(regex, function(match) {
                return ('<span class="highlightedText">' + match + '</span>');
            });
            $(this).html(foundText);
        });
        this._searchBar.updateResults($content.find('.highlightedText'));

        if (this._searchBar.numMatches !== 0) {
            this._scrollMatchIntoView(this._searchBar.$matches.eq(0));
        }
    }

    private _getList(dsName: string, hasFileErrors: boolean): XDPromise<any> {
        let deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarMakeResultSetFromDataset(dsName, true)
        .then((result) => {
            this._curResultSetId = result.resultSetId;
            let numEntries: number = result.numEntries;
            let maxPerCall: number = hasFileErrors ? 100 : 10;
            return XcalarFetchData(this._curResultSetId, 0, numEntries, numEntries, null, null, maxPerCall);
        })
        .then((results) => {
            if ($.isEmptyObject(results)) {
                deferred.reject(AlertTStr.FilePathError);
                return;
            }

            try {
                let files = [];
                for (let i = 0; i < results.length; i++) {
                    files.push(JSON.parse(results[i]).fullPath);
                }
                deferred.resolve(files);
            } catch (e) {
                console.error(e);
                deferred.reject();
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _constructTree(list: string[], dsName: string): void {
        this._nodesMap = {};
        this._roots = {};

        for (let i = 0; i < list.length; i++) {
            let heirarchy = list[i].split("/");
            // first el in heirarchy is "" because fullpath starts with /
            heirarchy[0] = dsName;
            let prevNode = null;
            for (let j = heirarchy.length - 1; j >= 0; j--) {
                let name = heirarchy[j];
                let fullPath = heirarchy.slice(0, j + 1).join("/");
                if (this._nodesMap.hasOwnProperty(fullPath)) {
                    // stop searching because we already stored this directory
                    // as well as it's parents directories
                    if (prevNode) {
                        this._nodesMap[fullPath].children.push(prevNode);
                    }
                    break;
                }

                let node: FileTreeNode = {
                    value: {
                        type: j === (heirarchy.length - 1) ? "file" : "folder",
                        name: name,
                        fullPath: fullPath,
                        isRoot: false
                    },
                    children: []
                };

                this._nodesMap[fullPath] = node;
                if (j === 0) {
                    node.value.isRoot = true;
                    this._roots[fullPath] = node;
                }
                if (prevNode) {
                    node.children.push(prevNode);
                }
                prevNode = node;
            }
        }
    }

    private _drawAllTrees(): void {
        let html: HTML = "";
        for (let name in this._roots) {
            html += '<ul class="root">' +
                        this._drawTree(this._roots[name]) +
                    '</ul>';
        }
        this._getModal().find(".treeWrap").html(html);
    }

    private _drawTree(node: FileTreeNode): HTML {
        let collapsed: string = "";
        if (node.children.length > 100) {
            // collapse folder if it has too many files
            collapsed = "collapsed";
        }
        let icon: string = "";
        if (node.value.isRoot) {
            icon = '<i class="icon datasetIcon xi_data"></i>';
        } else if (node.value.type === "folder") {
            icon = '<i class="icon folderIcon xi-folder"></i>' +
                    '<i class="icon folderIcon xi-folder-opened"></i>';
        }
        let html = '<li class="' + collapsed + '">' +
                    '<div class="label ' + node.value.type + '">' +
                        icon +
                        '<div class="name">' + node.value.name + '</div>' +
                    '</div>';
        if (node.children.length) {
            html += '<ul>';
        }
        node.children.sort(function(a, b) {
            let aVal: string;
            let bVal: string;
            if (a.value.type !== b.value.type) {
                aVal = a.value.type;
                bVal = b.value.type;
            } else {
                aVal = a.value.name;
                bVal = b.value.name;
            }
            return (aVal < bVal ? -1 : (aVal > bVal ? 1 : 0));

        });

        for (let i = 0; i < node.children.length; i++) {
            html += this._drawTree(node.children[i]);
        }
        if (node.children.length) {
            html += '</ul>';
        }
        html += '</li>';
        return html;
    }

    private _resizeModal(): void {
        let $modal = this._getModal();
        let $treeWrap = $modal.find(".treeWrap");
        let innerHeight = $treeWrap.outerHeight();
        let wrapHeight = $modal.find(".modalMain").height();
        let diff: number = innerHeight - wrapHeight;
        let winDiff: number;

        let change: boolean = false;
        if (diff > 0) {
            let modalHeight = $modal.height();
            let winHeight = $(window).height() - 10;
            winDiff = winHeight - modalHeight;
            if (winDiff > 0) {
                let heightToAdd = Math.min(winDiff, diff);
                $modal.height(modalHeight + heightToAdd);
                change = true;
            }
        }

        let innerWidth = $treeWrap.outerWidth();
        let wrapWidth = $modal.find(".modalMain").width();
        diff = innerWidth - wrapWidth;
        if (diff > 0) {
            let modalWidth = $modal.width();
            let winWidth = $(window).width() - 10;
            winDiff = winWidth - modalWidth;
            if (winDiff > 0) {
                let widthToAdd = Math.min(winDiff, diff);
                $modal.width(modalWidth + widthToAdd);
                change = true;
            }
        }

        if (change) {
            this._modalHelper.center();
        }
    }

    private _setupSearch(): void {
        let $modal = this._getModal();
        let $searchArea = $modal.find(".searchbarArea");
        this._searchBar = new SearchBar($searchArea, {
            "removeSelected": function() {
                $modal.find('.selected').removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            },
            "scrollMatchIntoView": this._scrollMatchIntoView.bind(this),
            "$list": $modal.find(".treeWrap"),
            "removeHighlight": true,
            "toggleSliderCallback": this._searchText.bind(this),
            "onInput": this._searchText.bind(this)
        });

        let $searchInput = $searchArea.find("input");
        $searchArea.find(".closeBox").click(() => {
            if ($searchInput.val() === "") {
                this._searchBar.toggleSlider();
            } else {
                this._searchBar.clearSearch(() => {
                    $searchInput.focus();
                });
            }
        });
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".label.folder", function() {
            $(this).parent().toggleClass("collapsed");
        });
    }
}
