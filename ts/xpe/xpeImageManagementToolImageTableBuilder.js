/**
 * Utility for handling setup of the main image table (calling server
 * and populating rows with that data), and its functionality
 * (column sort, click actions on the rows, etc.)
 * Makes use of classes from style.css
 *
 * This is based on the XD FileBrowser code (components/datastore/fileBrowser.js)
 */

var xpeServerUrl = global.xpeServerUrl; // defined if running nwjs via starter.js entrypoint

window.ImageTable = (function($, ImageTable) {
    /* main dom objs that will be modified.  assigned in ImageTable.setup */
    var $imageTable;     // $("#fileBrowser")
    var $container;       // $("#fileBrowserContainer")
    var $containerWrapper;// $("#fileBrowserContainer .wrapper")
    var $innerContainer;  // $("#innerFileBrowserContainer")
    var $imageTableMain; // $("#fileBrowserMain")
    var $selectAllBox;
    var numRowsChecked = 0; // how many currently picked (rows have checkbox checked)

    /* Contants */
    var defaultSortKey  = "name"; // default is sort by name;
    var dsListHeight = 29;
    /* End Of Contants */

    var curImages = []; // will hold JSON objs returned from server getImages api call
    var sortKey = defaultSortKey; // for sorting rows by col.  col divs should
        // have attr 'data-sortkey=<sortkey>' to be able to sort by sortKey = <sortkey>
    var reverseSort = false;
    var $anchor; // The anchor for selected files

    /**
     * defines the dom objects of the image table to be modified by this class,
     * and sets up events (col header buttons, click actions on the rows, etc.)
     */
    ImageTable.setup = function() {
        // divs w/ following classes/ids must be present on the page for anything
        // to work.  see site/xpe/imageTable.html - this is an included file for
        // just the image table
        $imageTable = $("#fileBrowser"); // these are called 'fileBrowser' though
            // this is not a filebrowser, because these are xd classes that the
            // styling relies on, which were initially developer for xd's file browser
        $container = $("#fileBrowserContainer");
        $containerWrapper = $("#fileBrowserContainer .wrapper").eq(0);
        $innerContainer = $("#innerFileBrowserContainer");
        $imageTableMain = $("#fileBrowserMain");
        $selectAllBox = $("#selectAllBox");
        addContainerEvents();
    };

    /**
     * call server to get list of existing Xcalar Design Docker images.
     * convert to HTML and populate table with this information (one row for each
     * image)
     */
    ImageTable.show = function() {
        var deferred = PromiseHelper.deferred();
        XpeSharedContextUtils.sendViaHttp("GET", xpeServerUrl + "/getImages/xdpce")
        .then(function (res) {
            var images = res.images;
            curImages = Object.values(images);
            var myHTML = getHTMLFromImages(curImages);
            deferred.resolve(myHTML);
        })
        .fail(function(error) {
            var errMsg = "Failure encountered trying to disable image table! " +
                error;
            console.log(errMsg);
            deferred.reject(errMsg);
        });

        return deferred.promise();
    };

    /**
     * clear all rows from the image table
     * not currently used (completely reloading page after delete/revert,
     * which will call .setup .show when the page reloads,
     * but leaving in in case don't want to rely on reloads)
     */
    ImageTable.clear = function() {
        clearAll();
        // uncheck the selectAllBox if it's selected
    };

    /**
     * returns list of dom objs for picked rows (rows with checked checkbox).
     */
    ImageTable.getPicked = function() {
        return $innerContainer.find(".grid-unit.picked");
    }

    /**
     * grays out and disables clicks within the table,
     * for when the page is loading. (relies on xpe.less)
     */
    ImageTable.pendTable = function() {
        $containerWrapper.addClass("wrapperPending");
        $imageTableMain.addClass("divDisabler"); // disables and blurs the table
    }

    /**
     * unpend table so its no longer disabled/grayed out (relies on xpe.less)
     */
    ImageTable.unpendTable = function() {
        $containerWrapper.removeClass("wrapperPending");
        $imageTableMain.removeClass("divDisabler");
    }

    /**
     * takes array of JSON objs returned by /getImages/xdpce api call,
     * converts each JSON obj to HTML and sets as a row in the image table
     */
    function getHTMLFromImages(files, keepOrder) {
        if (typeof keepOrder === 'undefined') {
            keepOrder = false;
        }
        var html = '<div class="sizer"></div>';
        // used to keep file position when
        // files before it are hidden
        var hasCtime = false;
        for (var i = 0, len = files.length; i < len; i++) {
            // fileObj: {name, isSelected, isPicked, attr{isDirectory, size}}
            var fileObj = files[i];
            var current = false;
            // file is a JSON obj for a single Docker image. (one of the results
            // returned by the 'getImages' api call)
            // the JSON obj for the Docker image currently hosting Xcalar Design
            // has an extra attr 'current'=true;
            // for this current image, will want to hide the checkbox for that row
            // (since can't delete or revert to it)
            if (fileObj.current && fileObj.current === true) {
                var current = true;
            }
            var name = fileObj.build;
            if (current) {
                name += "  (current image)";
            }
            var ctime = fileObj.birthday;
            // size should be just a number so that sort will work
            // sort will be just based off of that number
            // so the size denomination must be same for all of them!
            // if you vary the denomination later it's gonna be easiest
            // to just handle in the API call normalizing the size
            var size = fileObj.size;
            var sizeDenom = fileObj.denom;
            // will add the image id as 'val' attr in the main grid obj
            // so when reverting, can grab this and send to revert api
            // but not display on the UI
            var imgShortId = fileObj.id;
            var visibilityClass = " visible";
            var gridClass = "ds";
            var escName = xcStringHelper.escapeDblQuoteForHTML(name);
            var isSelected = fileObj.isSelected;
            var isPicked = fileObj.isPicked;
            var extraCkboxStyle = "";
            var currRowClass = "";
            if (current) {
                // hide the checkbox if its current
                //extraStyle = "visibility: hidden;";
                currRowClass = " currImageRow ";
            }

            var selectedClass = isSelected ? " selected" : "";
            var pickedClass = isPicked ? " picked" : "";
            var ckBoxClass = isPicked ? "checked" : "";

            // 'imageId' attr needed, because when deleting, will call 'getPicked'
            // to get the list of all currently selected rows, will rely on 'imageId'
            // attr in each row to know which images to delete
            extraCkboxStyle = 'style="' + extraCkboxStyle + '"';
            var currRowHtml = '<div title="' + escName + '" class="' + gridClass +
                visibilityClass + selectedClass + pickedClass + currRowClass + ' grid-unit" ' +
                'data-index="' + i + '"' + 'imageId="' + imgShortId + '">' +
                '<div class="checkbox ' + ckBoxClass + '" ' + extraCkboxStyle + '>' +
                    '<i class="icon xi-ckbox-empty"></i>' +
                    '<i class="icon xi-ckbox-selected"></i>' +
                '</div>' +
                '<div class="label fileName" data-name="' + escName + '">' +
                name +
                '</div>';
            if (ctime) {
                hasCtime = true;
                currRowHtml += '<div class="fileDate">' + ctime + '</div>';
            }
            currRowHtml += '<div class="fileSize">' + size + ' ' + sizeDenom + '</div></div>';
            // if it's the current one, and not calling this function for sorting, make it top of the rows
            if (current && !keepOrder) {
                html = currRowHtml + html;
            }
            else {
                html += currRowHtml;
            }
        }
        if (len === 0) {
            var emptyMsg = "it was empty";
            html += '<div class="hint">' + emptyMsg + '</div>';
        }
        document.getElementById('innerFileBrowserContainer').innerHTML = html;
        $innerContainer.height("auto");
        sizeImageNameColumn();
    }

    function addContainerEvents() {

        // select all box in header section
        $selectAllBox.on("click", function() {
            event.stopPropagation(); // else other click events for clicking the table
                // will register when you click select-all (for example, cleanContainer
                // will get called and the rows will become unselected too)
            if ($selectAllBox.hasClass("checked")) {
                unpickAll(); // selectAllBox will get unchecked at first row uncheck
            } else {
                pickAll(); // selectAllBox will get checked by picking all rows
            }
            updateButtons();
        });

        // click blank space to remove foucse on folder/dsds
        $imageTable.on("click", function() {
            cleanContainer({keepPicked: true});
        });

        $imageTable.on({
            "click": function(event) {
                // click to focus
                var $grid = $(this); // this is the row that was clicked
                event.stopPropagation();
                if (event.metaKey) {
                    // for selecting/deselect single row in a grid

                    if (isCurrImageRow($grid)) { // ignore if it was the curr image row they clicked
                        return;
                    }
                    if ($grid.hasClass("selected")) {
                        // If ctrl+click on a selected file, unselect and return
                        unselectRow($grid);
                        return;
                    }
                    // Keep selected & picked files
                    cleanContainer({keepSelected: true, keepPicked: true});
                    $anchor = $grid;
                    selectRow($grid);

                } else if (event.shiftKey) {
                    // ctrl + shift at same time = ctrl
                    // This is only for shift-click

                    // select all rows from anchor (or top if no anchor)
                    // to clicked row.
                    // if curr image row was clicked, will go to what's above/below it
                    cleanContainer({keepAnchor: true, keepPicked: true});
                    selectMultiImages($grid);
                } else {
                    // Regular single click
                    if (isCurrImageRow($grid)) { // take no action if its the curr image row
                        return;
                    }
                    // If there are picked files, we should keep them
                    cleanContainer({keepPicked: true});
                    $anchor = $grid;
                    selectRow($grid);
                }
            },
            "mouseenter": function() {
                var $grid = $(this);
                // don't hover on the current image since its non selectable
                if (!isCurrImageRow($grid)) {
                    $grid.addClass("hovering");
                }
            },
            "mouseleave": function() {
                var $grid = $(this);
                $grid.removeClass("hovering");
            },
        }, ".grid-unit");

        $imageTable.on({
            "click": function(event) {
                // This behavior is in essence the same as a ctrl+click
                event.stopPropagation();
                var $grid = $(this).closest(".grid-unit");
                // if its the curretn image don't take it
                if ($grid.hasClass("currImageRow")) {
                    return;
                }
                if ($grid.hasClass("selected")) {
                    cleanContainer({keepSelected: true,
                                    keepPicked: true,
                                    keepAnchor: true});
                } else if ($grid.hasClass("picked")) {
                    // If uncheck on an unselected file, remove all selected
                    cleanContainer({keepPicked: true,
                                    keepAnchor: true});
                } else {
                    // If check on an unselected file, remove all
                    // selected & unpicked files first
                    cleanContainer({keepPicked: true,
                                    keepAnchor: true,
                                    removeUnpicked: true});
                }
                selectRow($grid);
                togglePickedImages($grid);
                updateButtons();
            },
            "dblclick": function(event) {
                // dbclick on checkbox does nothing and should stopPropagation
                event.stopPropagation();
                return;
            },
        }, ".checkbox .icon");
        // click on title to sort
        var titleLabel = ".title";
        $imageTableMain.on("click", titleLabel, function(event) {
            var $title = $(this).closest(".title");

            event.stopPropagation();
            // click on selected title, reverse sort
            if ($title.hasClass("select")) {
                reverseImages();
                var $icon = $title.find(".icon").eq(0);
                toggleSortIcon($icon);
            } else {
                sortAction($title); // sort rows based on 'data-sortkey' attr for clicked col
            }
        });
    }

    function clearAll() {
        cleanContainer();

        curImages = [];

        document.getElementById("innerFileBrowserContainer").innerHTML = "";

        $(document).off(".fileBrowser");
        $(window).off(".fileBrowserResize");
        $imageTable.removeClass("loadMode errorMode");
    }

    function cleanContainer(options) {
        if (!options || !options.keepSelected) {
            var $allGrids;
            if (options && options.removeUnpicked) {
                $allGrids = $innerContainer.find(".selected:not(.picked)");
            } else {
                $allGrids = $innerContainer.find(".selected");
            }
            $allGrids.each(function() {
                var $grid = $(this);
                unselectRow($grid, false); // might be keeping picked selections
            });
        }
        if (!options || !options.keepAnchor) {
            $anchor = null;
        }
        if (!options || !options.keepPicked) {
            togglePickedImages();
        }
    }

    function sortAction($option) {
        var key = $option.data("sortkey");

        // change col arrow icon back to normal,
        // for last col that was selected for sort
        $option.siblings(".select").each(function() {
            var $currOpt = $(this);
            $currOpt.removeClass("select");
            toggleSortIcon($currOpt.find(".icon").eq(0), true);
        });
        $option.addClass("select");
        toggleSortIcon($option.find(".icon").eq(0));

        reverseSort = false;
        sortImagesBy(key);
    }

    /**
     * sort the curImages (list of JSON objs returned by server) array
     * based on a given key; regen row HTML in this order and repopulate the rows
     */
    function sortImagesBy(key) {

        if (key) {
            sortKey = key;
            curImages = sortImages(curImages, key);
        } else {
            sortKey = "name"; // default
        }
        if (reverseSort) {
            curImages.reverse();
        }
        getHTMLFromImages(curImages, true);
    }

    /**
     * sort list of objs by a given key
     * @files: objs to sort (use case now): the JSON objs returned
     *  by getImages API call which are populating the table rows.
     * @key: (only use case now): should be 'data-sortkey' attr of
     *  col header that's clicked - NOT attrs of the JSON objs returned by server
     */
    function sortImages(files, key) {
        var sorted = [];
        files.forEach(function (file) {
            sorted.push(file);
        });

        // sort in different ways depending on the col (numeric, alphabetical, etc.)
        // handle individual cases ('data-sortkey' col headers), and for each
        // case, what attr in the JSON objs returned by API call would sort by for that case

        if (key === "size") { // 'data-sortkey' col header
            sorted.sort(function (a, b) {
                return (a.size - b.size); // attr in JSON objs returned by server, that it corresponds to
            });
        }
        else if (key === "cdate") {
            // sort by ctime
            sorted.sort(function (a, b) {
                // .birthday should be string of format <year>-<month>-<day>
                var dateA = new Date(a.birthday);
                var dateB = new Date(b.birthday);
                return (dateA - dateB);
            });
        }
        else {
            // default is sort by name
            sorted.sort(function (a, b) {
                var aName = a.build.toLowerCase();
                var bName = b.build.toLowerCase();
                return (aName < bName ? -1 : (aName > bName ? 1 : 0));
            });
        }
        return sorted;
    }

    function reverseImages() {
        reverseSort = !reverseSort;
        curImages.reverse();
        getHTMLFromImages(curImages, true);
    }

    function sizeImageNameColumn() {
        var containerWidth = $imageTableMain.find(".titleSection").width();
        var fileNameWidth = $imageTableMain.find(".titleSection")
                                            .find(".fileName").outerWidth();
        var fileNamePct = 100 * (fileNameWidth + 20 ) / containerWidth;
        var siblingPct = (100 - fileNamePct) / 2;
        $innerContainer.find(".fileName").css("width", "calc(" + fileNamePct +
                                              "% - 20px)");
        $innerContainer.find(".fileDate, .fileSize").css("width", "calc(" +
                                                    siblingPct + "% - 20px)");
    }

    function scrollIconIntoView($icon) {
        var iconHeight = dsListHeight;
        var containerHeight = $containerWrapper.height();
        var scrollTop = $containerWrapper.scrollTop();

        var iconOffsetTop = $icon.position().top;
        var iconBottom = iconOffsetTop + iconHeight;

        if (iconBottom > containerHeight) {
            $containerWrapper.scrollTop(scrollTop + (iconBottom - containerHeight));
        } else if (iconOffsetTop < 0) {
            $containerWrapper.scrollTop(scrollTop + iconOffsetTop);
        }

    }

    function toggleSortIcon($icon, restoreDefault) {
        if (restoreDefault) {
            // If restore to non-sorted
            $icon.removeClass("xi-arrow-up xi-arrow-down fa-8");
            $icon.addClass("xi-sort fa-15");
        } else if ($icon.hasClass("xi-arrow-up")) {
            // ascending > descending
            $icon.removeClass("xi-sort xi-arrow-up fa-15");
            $icon.addClass("xi-arrow-down fa-8");
        } else {
            // Two cases: 1.first time sort & 2.descending > ascending
            $icon.removeClass("xi-sort xi-arrow-down fa-15");
            $icon.addClass("xi-arrow-up fa-8");
        }
    }

    /**
     * if user presses shift + click anywhere on a row (that's not the checkbox),
     * select and check all rows in the selected range (anchor/top to clicked row),
     * but filter out current image
     */
    function selectMultiImages($curActiveGrid) {

        // Select but not pick (check) the rows

        // get rows to set as selected

        var startIndex;
        if (!$anchor) {
            startIndex = 0;
        } else {
            startIndex = $anchor.data("index");
        }

        // will go until to the clicked grid row
        var $fillToRow = $curActiveGrid;

        // if the active/clicked row was the curr image row,
        // reset to row above or below it, depending if start index was above or below
        // (curr image row should never be selected or picked/clicked, as no action
        // can be taken on it)
        if (isCurrImageRow($curActiveGrid)) {
            var currImgRowInd = $curActiveGrid.data("index");
            if (startIndex > currImgRowInd) {
                // use row 1 down from clicked (row beneath curr image row)
                $fillToRow = getGridUnitRow(currImgRowInd+1);
            } else if (startIndex < currImgRowInd) {
                // use row 1 up from clicked (row above curr image row)
                $fillToRow = getGridUnitRow(currImgRowInd-1);
            } else {
                // corner case: start index and active are same row; do nothing
                // (ex: curr image row is first row, and they clicked that
                // first row w/ shift key down; there's nothing to select)
                console.log("shift selected only curr image; nothing to select");
                return;
            }
        }

        var endIndex = $fillToRow.data("index");

        // get list all rows to fill in, (up to the clicked row)
        var $grids;
        if (startIndex > endIndex) {
            $grids = $container.find(".grid-unit")
                               .slice(endIndex, startIndex + 1);
        } else {
            $grids = $container.find(".grid-unit")
                               .slice(startIndex, endIndex);
        }
        // mark all these rows as selected (ignore if you get curr image row)
        $grids.each(function() {
            var $cur = $(this);
            // do not select if its the row for the curr image (if it came in middle of grid)
            // (that row should be unselectable)
            if (!isCurrImageRow($cur)) {
                selectRow($cur); // they get marked as active and selected
            }
        });

        // now select the clicked/end row (or what it got adjusted to,
        // if it was the curr image row)
        // (note doing this sep. than the others because some special class
        // was being added to just this row before; not adding that class any
        // longer but keeping like this in case some additional action needs
        // to be taken just on this row)
        selectRow($fillToRow);
    }

    // checks if this grid/row div is for the current image
    function isCurrImageRow($row) {
        if ($row.hasClass("currImageRow")) {
            return true;
        } else {
            return false;
        }
    }

    // get all the grid units/rows in the table (.grid-unit divs)
    function getAllGridUnits() {
        return $container.find(".grid-unit");
    }

    // get grid unit/row at a given index
    function getGridUnitRow(getIndex) {
        //var gridUnitsObj = getAllGridUnits().slice(getIndex,getIndex+1);
        var gridUnitsObj = $container.find(".grid-unit").slice(getIndex,getIndex+1);
        var $gridRow;
        gridUnitsObj.each(function() {
            $gridRow = $(this);
        });
        return $gridRow;
    }

    function updateButtons() {
        // Disable your buttons if no files are selected
        var len = $innerContainer.find(".grid-unit.picked").length;
        // Enable / disable buttons
        if (len === 0) {
            $("#delete").addClass("btn-disabled");
            $("#revert").addClass("btn-disabled");
        } else if (len == 1) {
            $("#delete").removeClass("btn-disabled");
            $("#revert").removeClass("btn-disabled");
        } else {
            $("#delete").removeClass("btn-disabled");
            $("#revert").addClass("btn-disabled");
        }
    }

    function getAllAvailableImages() {
        return $innerContainer.find(".grid-unit").not(".currImageRow");
    }

    function selectRow($grid) {
        $grid.addClass('selected');
        if ($grid.data("index") != null) {
            curImages[$grid.data("index")].isSelected = true;
        }
    }

    /**
     * unselect a grid row, with option to unpick (uncheck checkbox) as well
     * (there are cases where you only want to unselect, not unpick)
     */
    function unselectRow($grid, unpick=true) {
        if ($grid.length > 0) {
            $grid.removeClass("selected");
            curImages[$grid.data("index")].isSelected = false;

            if (unpick) {
                // A picked file must be a selected file. So we unpick when unselect

                // (do NOT remove picked class prior to calling unpickRow!
                // unpickRow will remove the class, but also uncheck the checkbox
                // and update global counter of how many rows are checked.
                // but because it can get called more than once per row click, only
                // takes these actions if 'picked' class present, to avoid global
                // counter getting off. so if remove picked class here, the other
                // actions like unchecking check box will not get done in unpickRow)
                unpickRow($grid);
            }
        }
    }

    function pickRow($row) {
        // if there's an active grid unit (multiple rows selected and chcked)
        // and a new row is checked, this function gets called on all rows
        // in the larger grid unit (regradless if they are picked or not)
        // So only pick and update counter if row is not yet picked,
        // else counter for num rows checked will be off
        if (!$row.hasClass("picked")) {
            $row.addClass("picked");
            checkCkBox($row.find(".checkbox"));
            curImages[$row.data("index")].isPicked = true;
            numRowsChecked++;
            if (numRowsChecked === curImages.length-1) { // row for curr image can't be checked
                checkCkBox($selectAllBox);
            }
        }
    }

    function unpickRow($row) {
        // unpick the row and update numRowsChecked counter only if the row
        // is cuarrently picked! (this function could get called twice for
        // same row and would throw the counter off)
        if ($row.hasClass("picked")) {
            $row.removeClass("picked");
            uncheckCkBox($row.find(".checkbox"));
            curImages[$row.data("index")].isPicked = false;
            numRowsChecked--;
            $selectAllBox.removeClass("checked");
        }
    }

    function checkCkBox($checkBox) {
        $checkBox.addClass("checked");
        //$checkBox.removeClass("xi-ckbox-empty").addClass("xi-ckbox-selected");
    }

    function uncheckCkBox($checkBox, isRowCheckBox=false) {
        $checkBox.removeClass("checked");
    }

    function pickAll() {
        //$innerContainer.find(".grid-unit").each(function() {
        getAllAvailableImages().each(function() {
            var $curr=$(this);
            pickRow($curr);
        });
    }

    function unpickAll() {
        //$innerContainer.find(".grid-unit").each(function() {
        getAllAvailableImages().each(function() {
            var $curr=$(this);
            unpickRow($curr);
        });

    }

    function togglePickedImages($grid) {
        var $allSelected = $innerContainer.find(".grid-unit.selected");
        if (!$grid) {
            // For the case when we clear all
            $allSelected = ImageTable.getPicked();
        }
        if (!$grid || $grid.hasClass("picked")) {
            $allSelected.each(function() {
                var $cur = $(this);
                unpickRow($cur);
            });

        } else {
            $allSelected.each(function() {
                var $cur = $(this);
                pickRow($cur);
            });
        }
    }

    return (ImageTable);
}(jQuery, {}));

