enum hardcodedInteractives {
    SQLCreateTablePanel = "#sourceTblButton",
    DatasetCreateTablePanel = "#inButton"
}

namespace TooltipManager {
    // default options
    let options = {
        overlayOpacity: 0.5,
        popoverPosition: 'bottom',
        popoverHorzPadding: 19,
        popoverVertPadding: 19,
        popoverMargin: 10,
        highlightPadding: 10,
        // preventSelection: false, // prevent highlighted area from being clickable
        loop: false, // if true, returns to step 1 after last step
        includeNumbering: true,
        closeOnModalClick: false, // close modal when background is clicked
        actionsRequired: ""
    };

    let $currElem: JQuery;
    let $popover: JQuery;
    let validPositions: string[] = ['left', 'right', 'top', 'bottom'];
    let arrowHeight: number = 10;
    let currElemRect: ClientRect | DOMRect;
    let pathTemplate: string = "M0 0 L20000 0 L20000 20000 L 0 20000 Z ";
    let popoverBorderWidth: number = 2;
    let resizeTimeout;
    let stepNumber: number = -1;
    // let video;
    // let $videoCloseArea;
    let currWalkthrough: TooltipInfo[];
    let $clickEle: JQuery;
    let title: string;
    let checkBoxChecked: boolean = false;
    let nextStepDisabled: boolean = false;

    /**
     * TooltipManager.start
     * @param walkthroughInfo
     * @param steps
     * @param step
     * @param userOptions: {
     *  includeNumbering: boolean,
     *  closeOnModalClick: boolean
     * }
     */
    export function start(
        walkthroughInfo: WalkthroughInfo,
        steps: TooltipInfo[],
        step: number,
        userOptions?: any
    ): XDPromise<void> {
        stepNumber = step - 1;
        currWalkthrough = steps;
        title = walkthroughInfo.title;
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (userOptions) {
            setOptions(userOptions);
        }

        let promise;

        if (walkthroughInfo.isSingleTooltip) {
            // This is for future singular tooltip popups, rather than walkthroughs.
            // We can assume the tooltip is on the screen we're on now.
            promise = PromiseHelper.resolve();
        } else {
            promise = switchScreen(walkthroughInfo.startScreen);
        }

        promise
        .then(() => {
            if (walkthroughInfo.background) {
                createOverlay(true);
            } else if (options.closeOnModalClick) {
                createOverlay(false);
            }

            /*if (options.video) {
                setupVideo();
                setupVideoBreakpoints();
                options.preventSelection = false;
            }*/
            // if (options.preventSelection) {
            // }
            createPopover(walkthroughInfo.isSingleTooltip, title);
            nextStep();
            $(window).resize(winResize);

            // temp
            //$('#xcalarVid').attr('muted', "true");
            deferred.resolve();
        })
        .fail((e) => {
            console.error("Could not open walkthrough: " + e);
            deferred.reject();
        });
        return deferred.promise();
    };

    function switchScreen(screen: TooltipStartScreen): JQueryPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!$("#fileBrowser").hasClass("xc-hidden")) {
            // Close any file browser open, just in case.
            FileBrowser.close();
        }
        switch(screen) {
            case(TooltipStartScreen.Home):
                HomeScreen.switch(UrlToTab.home);
                deferred.resolve();
                break;
            case (TooltipStartScreen.Load):
                HomeScreen.switch(UrlToTab.load);
                break;
            case (TooltipStartScreen.Notebook):
                HomeScreen.switch(UrlToTab.notebook);
                if (!WorkbookPanel.isWBMode()) {
                    WorkbookPanel.show(true);
                }
                deferred.resolve();
                break;
            default:
                throw new Error("Unsupported screen to switch");
        }
        return deferred.promise();
    }

    function createOverlay(showBackground: boolean) {

        let gClass = "";
        if (!showBackground) {
            gClass = ' class="hiddenOverlay"';
        }

        // highlights an element + padding
        let visibleOverlay: string = '<svg id="intro-visibleOverlay" class="intro-overlay"><g' + gClass + '><path class="intro-path"' +
            ' d="' + pathTemplate + '"></path></g></svg>';

        // prevents user from clicking on elements in XD (except highlighted element if type !== text)
        // does not contain padding - smaller than visible overlay
        let clickableOverlay: string = '<svg id="intro-clickableOverlay" class="intro-overlay"><g class="hiddenOverlay"><path class="intro-path"' +
            ' d="' + pathTemplate + '"></path></g></svg>';

        let $visibleOverlay: JQuery = $(visibleOverlay);
        let $clickableOverlay: JQuery = $(clickableOverlay);

        $('body').append($visibleOverlay);
        $('body').append($clickableOverlay);

        setTimeout(function() {
            $visibleOverlay.css('opacity', options.overlayOpacity);
        }, 0);
        if (options.closeOnModalClick) {
            $visibleOverlay.mousedown(closeWalkthrough);
        }
    }

    function createPopover(isSingleTooltip: boolean, title: string) {
        let next: string = "";
        let tooltipCheckbox = "";
        if(!isSingleTooltip) {
            next = '<div class="next">' +
                        '<i class="icon xi-next"></i>' +
                    '</div>'
        }

        if (title === WKBKTStr.Location) {
            const checked = checkBoxChecked ? "checked" : "";
            tooltipCheckbox = '<section>' +
                                    '<div class="alertCheckBox checkboxSection">' +
                                    '<div class="checkbox ' + checked + '">' +
                                    '<i class="icon xi-ckbox-empty"></i>' +
                                    '<i class="icon xi-ckbox-selected"></i>' +
                                    '</div>' +
                                    '<div class="checkboxText">Don\'t show again</div>' +
                                    '</div>' +
                                '</section>'
        }

        // UI subject to change
        let popoverHtml: string = '<div id="intro-popover" style="padding:' +
                            options.popoverVertPadding + 'px ' +
                            options.popoverHorzPadding + 'px;">' +
                            '<div class="topArea">' +
                                '<div class="title">' +
                                    title +
                                '</div>' +
                                '<div class="close">' +
                                    '<i class="icon xc-action xi-close cancel"></i>' +
                                '</div>' +
                            '</div>' +
                            '<div class="textContainer">' +
                                '<div class="text"></div>' +
                            '</div>' +
                            '<div class="bottomArea">' +
                                tooltipCheckbox +
                                next +
                                '<div class="intro-number"></div>' +
                            '</div>' +
                            '<div class="intro-arrow top"></div>' +
                          '</div>';
        $popover = $(popoverHtml);
        $('body').append($popover);

        // fade in popover, currently 400 ms
        $popover.css('opacity', 0);
        setTimeout(function() {
            $popover.css('opacity', 1);
        }, 100);

        if (!options.includeNumbering) {
            $popover.find('.intro-number').hide();
        }

        $popover.find('.next').click(function() {
            nextStep();
        });

        $popover.find('.close').click(function() {
            closeWalkthrough();
        });

        $popover.find('.alertCheckBox').click(function() {
            const $checkBox = $popover.find('.alertCheckBox').find('.checkbox');
            checkBoxChecked = !checkBoxChecked;
            if (checkBoxChecked) {
                $checkBox.addClass("checked");
            } else {
                $checkBox.removeClass("checked");
            }
            // TooltipWalkthroughs.setShowWorkbook(!checkBoxChecked);
        });

    }

    function waitFor(selector, cnt = 0) {
        const outCnt = 20;
        const time = 500; // 0.5s per check
        let $el = $(selector);

        if ($el.length) {
            nextStep();
        } else if (cnt > outCnt) {
            console.error("check time out");
            nextStep();
        } else {
            setTimeout(() => {
                waitFor(selector, cnt + 1);
            }, time);
        }
    }

    let tempDisableNextStep = function() {
        nextStepDisabled = true;
        setTimeout(() => nextStepDisabled = false, 500);
    }

    /* controls nextStep whether it be forward, backwards or skipping
    *  @param {Object} arg : options include skip: boolean, back: boolean
    */
    function nextStep(arg?) {
        if (nextStepDisabled) {
            return;
        }
        tempDisableNextStep();
        stepNumber++;

        clearListeners();
        // if currentStep goes past total number of steps
        if (!(arg && arg.skip) && stepNumber >= currWalkthrough.length) {
            closeWalkthrough();
            return;
        }
        if ($currElem) {
            $currElem.removeClass(".intro-highlightedElement");
        }

        /**if (options.video) {
            $popover.css({'opacity': 0});

            if (stepNumber === 0) {
                $popover.css({'visibility': 'hidden'});
            } else {
                setTimeout(function(){
                    $popover.css({'visibility': 'hidden'});
                }, 1000);
            }

            removeHighlightBox();
            video.play();
            if (stepNumber >= currWalkthrough.length) {
                return;
            }
        }*/
        // prevent currentStep from going out of range
        stepNumber = Math.max(0, stepNumber);
        stepNumber = Math.min(stepNumber, currWalkthrough.length - 1);

        if (stepNumber >= currWalkthrough.length - 1) {
            showPopoverEndState();
        }

        if (stepNumber > 0) {
            let oldInteractiveEle = currWalkthrough[stepNumber - 1].interact_div;
            if (currWalkthrough[stepNumber - 1].type == TooltipType.Click) {
                ensureOpenScreen(oldInteractiveEle);
            }
        }

        if (currWalkthrough[stepNumber].pre_mousedown_div) {
            $(currWalkthrough[stepNumber].pre_mousedown_div).mousedown();
        }

        highlightNextElement();
    }

    /**
     * This ensures that some hardcoded interactive elements open respective panels.
     * In the future this function could be removed entirely, but for now there are some
     * behaviors that may need to be hardcoded.
     * @param interact_div
     */
    function ensureOpenScreen(interact_div) {
        if (!interact_div) {
            return;
        }
        switch(interact_div) {
            case (hardcodedInteractives.DatasetCreateTablePanel):
                DataSourceManager.startImport(false);
                break;
            case (hardcodedInteractives.SQLCreateTablePanel):
                DataSourceManager.startImport(true);
                break;
            default:
                break;
        }
        return;
    }

    function clearListeners() {
        if ($clickEle) {
            $clickEle.off(".tooltip");
        }
    }

    /*
    * Set options
    * @param {Object} userOptions : options the user wishes to change
    */
   function setOptions(userOptions) {
        for (let option in userOptions) {
            options[option] = userOptions[option];
        }

        return (options);
    };

    function emergencyPopup() {
        TooltipManager.start({
            title: "Warning",
            background: false,
            startScreen: null,
            isSingleTooltip: true
        },
        [{
            highlight_div: "#homeBtn",
            interact_div: "#homeBtn",
            text: "Something has gone wrong while executing this tooltip walkthrough. Please try again later.",
            type: TooltipType.Click
        }],
        0,
        {
            closeOnModalClick: false,
            includeNumbering: false
        }
        );
    }

    function highlightNextElement() {
        let currentStep = currWalkthrough[stepNumber];

        $currElem = $(currentStep.highlight_div);
        if ($currElem.length == 0) {
            // the next element was not successfully found.
            closeWalkthrough()
            .then(() => {
                emergencyPopup();
            });
            return;
        }

        $currElem.addClass('intro-highlightedElement');
        currElemRect = $currElem[0].getBoundingClientRect();
        if (currElemRect.width == 0 || currElemRect.height == 0) {
            // the next element is not successfully displayed.
            closeWalkthrough()
            .then(() => {
                emergencyPopup();
            });
            return;
        }

        moveClickableOverlay();
        moveHighlightBox();
        updatePopover(true);
    }

    function moveClickableOverlay() {
        let rect: ClientRect | DOMRect = currElemRect;
        let clickablePath: string;
        if (currWalkthrough[stepNumber].type == TooltipType.Text) {
            clickablePath = pathTemplate;
        } else {
            // avoid clicking on bordering elements
            let left: number = rect.left + 2;
            let right: number = rect.right - 2;
            let top: number = rect.top + 2;
            let bottom: number = rect.bottom - 2;
            clickablePath = pathTemplate +
                       ' M' + left + ' ' + top +
                       ' L' + right + ' ' + top +
                       ' L' + right + ' ' + bottom +
                       ' L' + left + ' ' + bottom;
        }

        $('#intro-clickableOverlay path').attr('d', clickablePath);
    }

    function updatePopover(initial?) {
        if (!initial) {
            $popover.css('opacity', 1);
        }
        clearListeners();

        let $popoverNumber = $popover.find('.intro-number');
        $popoverNumber.text("Steps " + String(stepNumber + 1) + "/" + currWalkthrough.length);
        let $infoArrow: JQuery = $popover.find('.intro-arrow');
        $infoArrow.removeClass('top bottom left right');
        $infoArrow.css({'top': 0, 'bottom': 'auto'});

        if (currWalkthrough[stepNumber].title) {
            $popover.find('.title').html(currWalkthrough[stepNumber].title);
        }
        $popover.find('.text').html(currWalkthrough[stepNumber].text);
        let windowWidth: number = $(window).width();
        let windowHeight: number = $(window).height();
        let titleHeight: number = $popover.find('.title').outerHeight();
        let textHeight: number = $popover.find('.text').outerHeight();
        let textContainerPaddingTop: number = parseInt($popover.find('.textContainer').css("padding-top"));
        let textWidth: number = $popover.find('.text').outerWidth();
        let bottomHeight: number = $popover.find('.bottomArea').outerHeight();
        let popoverHeight: number =
            titleHeight +
            textHeight +
            textContainerPaddingTop +
            bottomHeight +
            (options.popoverVertPadding * 2) +
            (popoverBorderWidth * 2);
        // we can't directly calculate popover width because it has a
        // width transition that changes its width over time
        let popoverWidth: number = textWidth +
                           (options.popoverHorzPadding * 2) +
                           (popoverBorderWidth * 2);
        let rect: ClientRect | DOMRect = currElemRect;
        let top: number = 0;
        let minLeft: number = 0;
        let center: number = rect.left + (rect.width / 2);
        let centerVert: number = rect.top + (rect.height / 2);
        let tempLeft: number = center - (popoverWidth / 2);
        let left: number = Math.max(minLeft, tempLeft);
        let userPosition = $currElem.data('introposition');
        let positionIndex: number = validPositions.indexOf(userPosition);
        if (positionIndex !== -1 ) {
            userPosition = validPositions[positionIndex];
        } else {
            userPosition = 'auto';
        }

        if (currWalkthrough[stepNumber].position) {
            userPosition = currWalkthrough[stepNumber].position;
        }

        if (userPosition === 'auto') {
            if (options.popoverPosition === 'bottom') {
                let bottomOfPopover: number = rect.bottom + popoverHeight +
                                      options.popoverMargin + arrowHeight;
                if (bottomOfPopover <= windowHeight) {
                    top = rect.bottom + options.popoverMargin + arrowHeight;
                    $infoArrow.addClass('bottom');
                } else {
                    top = rect.top - popoverHeight -
                          options.popoverMargin - arrowHeight;
                    $infoArrow.addClass('top');
                }
            }
        } else {
            switch (userPosition) {
                case ('top'):
                    top = currElemRect.top - popoverHeight -
                          options.popoverMargin - arrowHeight;
                    break;
                case ('bottom'):
                    top = rect.bottom + options.popoverMargin + arrowHeight;
                    break;
                case ('left'):
                    top = currElemRect.top +
                         ((currElemRect.height - popoverHeight) / 2);
                    left = currElemRect.left - popoverWidth -
                           options.popoverMargin - arrowHeight;
                    $infoArrow.css({
                        'left': 'auto'
                    });
                    $popoverNumber.addClass('left');
                    break;
                case ('right'):
                    top = currElemRect.top +
                         ((currElemRect.height - popoverHeight) / 2);
                    left = currElemRect.right + options.popoverMargin +
                           arrowHeight;
                    break;
            }

            $infoArrow.addClass(userPosition);
        }
        top = Math.max(0, top);
        top = Math.min(windowHeight - popoverHeight, top);
        $popover.css('top', top);


        if (left + popoverWidth > windowWidth) {
            left = windowWidth - popoverWidth;
            $infoArrow.css('left', currElemRect.left - left - 5);
            $popoverNumber.addClass('left');
        }

        $popover.css({
            'left': left
        });

        if (!$infoArrow.hasClass('left') && !$infoArrow.hasClass('right')) {
            let arrowLeft: number = Math.max(5, center - left - arrowHeight);
            let maxArrowLeft: number = popoverWidth - (arrowHeight * 2) - 5;
            arrowLeft = Math.min(arrowLeft, maxArrowLeft);
            $infoArrow.css('left', arrowLeft);
        } else {
            let currentArrowTop: number = top + popoverBorderWidth;
            let vertDiff: number = centerVert - currentArrowTop;
            // console.log(currentArrowTop, centerVert, vertDiff);
            $infoArrow.css('top', vertDiff - 10);

        }

        $popover.find('.textContainer').height(textHeight);

        let currentStep: TooltipInfo = currWalkthrough[stepNumber];

        if (currentStep.type != TooltipType.Text) {
            $popover.find(".next").addClass("unavailable");
            $clickEle = $(currentStep.interact_div).eq(0);
            if (currentStep.type == TooltipType.Click) {
                $clickEle.on("click.tooltip", () => {
                    $clickEle.off("click.tooltip");

                    // changed to timeout from the following:
                    // e.stopPropagation();
                    // $clickEle.click();
                    // nextStep()

                    // stopPropagation didn't work and caused double click
                    // just nextStep() didn't work because the next element doesn't exist yet
                    if (currentStep.wait_for_div) {
                        waitFor(currentStep.wait_for_div);
                    } else {
                        setTimeout(()=>nextStep(), currentStep.wait_before_next_step || 0);
                    }
                });
            } else if (currentStep.type == TooltipType.Value) {
                $clickEle.on("keyup.tooltip", () => {
                    if ($clickEle.val() == currentStep.value) {
                        $clickEle.off("keyup.tooltip");
                        nextStep();
                    }
                })
            } else if (currentStep.type == TooltipType.DoubleClick) {
                $clickEle.on("dblclick.tooltip", () => {
                    $clickEle.off("dblclick.tooltip");

                    // changed to timeout from the following:
                    // e.stopPropagation();
                    // $clickEle.click();
                    // nextStep()

                    // stopPropagation didn't work and caused double click
                    // just nextStep() didn't work because the next element doesn't exist yet
                    setTimeout(()=>nextStep(), 0);
                });
            }
        } else {
            $popover.find(".next").removeClass("unavailable");
        }
    }

    function moveHighlightBox() {
        let rect: ClientRect | DOMRect = currElemRect;

        let left: number = rect.left - options.highlightPadding;
        let right: number = rect.right + options.highlightPadding;
        let top: number = rect.top - options.highlightPadding;
        let bottom: number = rect.bottom + options.highlightPadding;
        let path: string = pathTemplate +
                   ' M' + left + ' ' + top +
                   ' L' + right + ' ' + top +
                   ' L' + right + ' ' + bottom +
                   ' L' + left + ' ' + bottom;

        if (d3) { //  how do we do a better check for d3?
            d3.select('#intro-visibleOverlay path').transition().duration(300)
                                    .ease('ease-out').attr('d', path);
        } else {
            $('#intro-visibleOverlay path').attr('d', path);
        }
    }

    function removeHighlightBox() {
        $('#intro-visibleOverlay path').attr('d', pathTemplate);
    }

    function winResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if ($currElem.length) {
                currElemRect = $currElem[0].getBoundingClientRect();
                moveClickableOverlay();
                updatePopover();
                moveHighlightBox();
            }
            //adjustVideoClosePosition();
        }, 40);
    }

    function showPopoverEndState() {
        $popover.find('.next, .skip').addClass('unavailable');
    }


    function closeWalkthrough(): Promise<void> {
        return new Promise((resolve) => {
            stepNumber = -1;
            clearListeners();
            removeHighlightBox();

            $('#intro-visibleOverlay').css('opacity', 0);
            $('#intro-videoClose').remove();
            setTimeout(function() {
                $('#intro-visibleOverlay').remove();
                $('#intro-clickableOverlay').remove();
                resolve();
            }, 300);
            $popover.css('opacity', 0).remove();
            $('.intro-highlightedElement').removeClass('intro-highlightedElement');
            $('#intro-popover').remove();
            $(window).off('resize', winResize);
        })
    }

    /**function setupVideo() {
        let $video = $(options.video);
        video = $video[0];
        video.play();
        let closeHtml = '<div id="intro-videoClose">' +
                            '<span>' +
                                CommonTxtTstr.Exit.toUpperCase() +
                            '</span>' +
                        '</div>';
        $('body').append(closeHtml);
        $videoCloseArea = $('#intro-videoClose');
        $videoCloseArea.click(function() {
            closeWalkthrough();
        });
        video.onloadedmetadata = adjustVideoClosePosition;
        video.onended = function() {
            $('#intro-videoClose').show();
        };
    }

    function setupVideoBreakpoints() {

        video.addEventListener("timeupdate", function() {
            if (this.currentTime >= options.videoBreakpoints[stepNumber]) {
                this.pause();
                moveHighlightBox();
                // highlightNextElement();
                $popover.css({'visibility': 'visible', 'opacity': 1});
            }
        });
    }

    function adjustVideoClosePosition() {
        if (!options.video) {
            return;
        }
        let $video = $(options.video);
        let offsetTop = $video.offset().top;
        let offsetLeft = $video.offset().left;
        let width = $video.width();
        let height = $video.height();
        $videoCloseArea.css({
            top: offsetTop,
            left: offsetLeft,
            width: width,
            height: height
        });
    }*/
    /* Unit Test Only */
    if (window["unitTestMode"]) {
        tempDisableNextStep = () => {}
    }
    /* End Of Unit Test Only */
}