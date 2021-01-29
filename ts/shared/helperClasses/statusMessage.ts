// displays load message and animated waiting icon near CLI button
namespace StatusMessage {
    let statusMessage: StatusMsg;
    let hasSetup: boolean = false;

    interface Msg {
        $span: JQuery;
        msgId: number;
        msg: string;
        desiredRotations: number;
    }

    interface MsgObject {
        msg?: string;
        operation?: string;
    }

    interface ShowDoneNotificationOptions {
        indexNotification?: boolean;
        datasetId?: string;
        title?: string;
    }

    interface DoneNotificationListenersOptions {
        datasetId?: string;
    }

    class StatusMsg {
        private $statusText: JQuery;
        private $waitingIcon: JQuery;
        private isLoading: boolean;
        private isFailed: boolean;
        private rotateInterval: number;
        private messages: number[];
        private msgObjs: {[key: number]: MsgObject};
        private scrollSpeed: number;
        private rotationTime: number;
        private numRotations: number;
        private rotatePosition: number;
        private scrollPromise: XDPromise<void>;
        private messagesToBeRemoved: Msg[];
        private msgIdCount: number;
        private inRotation: boolean;
        private notificationTime: number;
        private failNotificationTime: number;
        private itemHeight: number;

        constructor() {
            this.$statusText = $('#pageStatusText');
            this.$waitingIcon = $('#statusBarloadingIconWrap');
            this.isLoading = false;
            this.isFailed = false;
            this.rotateInterval;
            this.messages = [];
            this.msgObjs = {};
            this.scrollSpeed = 500;
            this.rotationTime = 2000;
            this.numRotations = 0;
            this.rotatePosition = 0;
            this.scrollPromise;
            this.messagesToBeRemoved = [];
            this.msgIdCount = 0;
            this.inRotation = false;
            this.notificationTime = 6000;
            this.failNotificationTime = 8000;
            this.itemHeight = 16; /// in pixels
            this.setup();
        }

        private setup(): void {
            const self = this;

            self.$statusText.on('click', '.close', function() {
                self.removeFailedMsg($(this).parent());
            });
        }

        // msgObj should have these properties: msg, operation
        public addMsg(msgObj: MsgObject = {}): number {
            const msg: string = msgObj.msg || StatusMessageTStr.Loading;
            this.msgIdCount++;
            this.messages.push(this.msgIdCount);
            this.msgObjs[this.msgIdCount] = msgObj;
            const self = this;

            if (this.messages.length === 1) {
                this.$statusText.append('<span id="stsMsg-' + this.msgIdCount + '">' + msg +
                                '</span><span id="stsMsg-' + this.msgIdCount + '">' +
                                    msg + '</span>');
                // we append twice in order to make a full cycle for the carousel
            } else {
                this.$statusText.children('span:last-child')
                        .before('<span id="stsMsg-' + this.msgIdCount + '">' + msg +
                                '</span>');
            }

            if (this.messages.length === 1) {
                this.scrollPromise = (function(): XDPromise<void> {
                    const deferred: XDDeferred<void> = PromiseHelper.deferred();
                    self.scrollToMessage()
                    .then(function() {
                        if (self.messages.length) {
                            $('#viewLocation').remove();
                            self.$statusText.scrollTop(0);
                        }
                        deferred.resolve();
                    });
                    return deferred.promise();
                })();
            }

            this.$waitingIcon.fadeIn(100);
            if (this.messages.length === 2) {
                this.stopRotation();
                this.rotateMessages();
            }

            this.isLoading = true;
            return (this.msgIdCount);
        };

        public getPos(): number {
            return (this.rotatePosition);
        };

        public stopRotation(): void {
            clearInterval(this.rotateInterval);
            this.inRotation = false;
            this.rotatePosition = 0;
            const self = this;
            window.setTimeout(function() {
                self.checkForMessageRemoval();
            }, self.rotationTime);
        };

        public success(
            msgId: number,
            noNotification: boolean,
            newTableId: TableId,
            options: object
        ): void {
            if (!noNotification) {
                this.showDoneNotification(msgId, false, newTableId, null, options);
            } else {
                delete this.msgObjs[msgId];
            }
            const self = this;

            this.scrollPromise
            .then(function() {
                const $successSpan: JQuery = self.$statusText.find('#stsMsg-' + msgId);
                $successSpan.addClass('success');
                const completed: string = '<span class="semibold">' + StatusMessageTStr.Completed + ': </span>';
                $successSpan.prepend(completed);

                if (self.messages.indexOf(msgId) === 0) {
                    const $secondSpan = self.$statusText.find('span:last');
                    $secondSpan.prepend(completed);
                    $secondSpan.addClass('success');
                }

                const messageToRemove: Msg = {
                    $span: $successSpan,
                    msgId: msgId,
                    msg: $successSpan.text(),
                    desiredRotations: self.numRotations + 1
                };
                self.messagesToBeRemoved.push(messageToRemove);
                if (!self.inRotation) {
                    self.checkForMessageRemoval();
                }
                if (self.messages.length <= self.messagesToBeRemoved.length) {
                    self.$waitingIcon.hide();
                }
            });
        }

        public remove(msgId: number): void {
            if (!this.msgObjs[msgId]) {
                return;
            }
            delete this.msgObjs[msgId];
            this.removeFailedMsg($('#stsMsg-' + msgId));
        }

        public fail(
            failMessage: string = StatusMessageTStr.Error,
            msgId: number,
            srcTableId: TableId
        ): void {
            const self = this;
            this.showDoneNotification(msgId, true, null, srcTableId);
            const failHTML: string = '<span class="text fail">' + failMessage + '</span>' +
                           '<i class="icon close xi-close fa-17 xc-action"></i>';

            const $statusSpan: JQuery = $('#stsMsg-' + msgId);
            $statusSpan.html(failHTML);
            if (this.messages.indexOf(msgId) === 0) {
                if (this.$statusText.find('span:last').attr("id") === "stsMsg-" + msgId) {
                    this.$statusText.find('span:last').html(failHTML);
                }
            }
            if (this.messages.length <= this.$statusText.find('.fail').length) {
                this.$waitingIcon.hide();
            }
            setTimeout(function(){
                self.removeFailedMsg($('#stsMsg-' + msgId));
            }, 12000);
        }

        public cancel(msgId: number): void {
            if (!this.msgObjs[msgId]) {
                return;
            }
            const txt: string = this.msgObjs[msgId].operation[0].toUpperCase() +
                      this.msgObjs[msgId].operation.slice(1) + " canceled";
            const cancelHTML: string = '<span class="text fail">' + txt + '</span>' +
                           '<i class="icon close xi-close fa-17 xc-action"></i>';
            const $statusSpan: JQuery = $('#stsMsg-' + msgId);
            $statusSpan.html(cancelHTML);
            const self = this;
            if (this.messages.indexOf(msgId) === 0) {
                this.$statusText.find('span:last').html(cancelHTML);
            }
            if (this.messages.length <= this.$statusText.find('.fail').length) {
                this.$waitingIcon.hide();
            }
            delete this.msgObjs[msgId];
            window.setTimeout(function() {
                self.removeFailedMsg($('#stsMsg-' + msgId));
            }, 6000);
        }

        public reset(): void {
            this.msgIdCount = 0;
            this.stopRotation();
            this.updateLocation(true);
            this.isFailed = false;
            this.messages = [];
            this.numRotations = 0;
            this.messagesToBeRemoved = [];
        }

        public checkIsFailed(): boolean {
            return this.isFailed;
        }

        public updateLocation(force: boolean = false, text: string = ""): void {
            if (!this.isLoading || force) {
                const locationHTML: string =
                    '<span id="viewLocation">' +
                        (text || "") +
                    '</span>';
                this.$statusText.html(locationHTML);
            }
        }

        public removePopups(): void {
            $(".tableDonePopup").trigger(fakeEvent.mousedown);
        }

        private rotateMessages(): void {
            const self = this;
            this.inRotation = true;
            this.rotatePosition = 0;
            this.rotateInterval = <any>setInterval(function() {
                self.scrollToMessage()
                .then(function() {
                    if (self.rotatePosition >= self.messages.length) {
                        self.$statusText.scrollTop(0);
                        self.rotatePosition = 0;
                        self.numRotations++;
                    }
                    self.checkForMessageRemoval();
                });
            }, self.rotationTime);
        }

        private checkForMessageRemoval(): void {
            const self = this;
            let currIndex: number;
            // because multiple messages scroll through a carousel, we must
            // wait for the right time to remove the message
            for (let i = 0; i < this.messagesToBeRemoved.length; i++) {
                const msg: Msg = this.messagesToBeRemoved[i];
                const msgIndex: number = this.messages.indexOf(msg.msgId);

                if (this.numRotations > msg.desiredRotations) {
                    const numTotalMessages:number = this.messages.length;

                    if (numTotalMessages === 1) {
                        currIndex = i;
                        window.setTimeout(function() {
                            self.removeSuccessMessage(msg.$span, msgIndex, currIndex,
                                                 msg.msgId);
                        }, 2000);

                    } else if (msgIndex > this.rotatePosition) {
                        self.removeSuccessMessage(msg.$span, msgIndex, i, msg.msgId);
                        i--;
                    } else if (msgIndex === 0 && this.rotatePosition !== 0) {
                        self.removeSuccessMessage(msg.$span, msgIndex, i, msg.msgId);
                        self.$statusText.scrollTop(0);
                        self.rotatePosition = 0;
                        i--;
                    }
                } else if (!this.inRotation) {
                    currIndex = i;
                    window.setTimeout(function() {
                        self.removeSuccessMessage(msg.$span, msgIndex, currIndex,
                                             msg.msgId);
                    }, self.rotationTime);
                }
            }
        }

        private removeSuccessMessage(
            $span: JQuery,
            msgIndex: number,
            removalIndex: number,
            msgId: number
        ): void {
            $span.remove();
            this.messages.splice(msgIndex, 1);
            this.messagesToBeRemoved.splice(removalIndex, 1);
            const $duplicateMsg: JQuery = $('#stsMsg-' + msgId);
            if ($duplicateMsg.length !== 0) {
                $duplicateMsg.remove();
                const $firstSpan: JQuery = this.$statusText.find('span').eq(0).clone();
                this.$statusText.append($firstSpan);
            }

            this.messageRemoveHelper();
            if (this.messages.length <= this.$statusText.find('.fail').length) {
                this.$waitingIcon.hide();
            }
        }

        private removeFailedMsg($statusSpan: JQuery): void {
            if (!$statusSpan.length) {
                // removeFailedMsg could have been triggered with setTimeout
                // after user already manually triggered
                return;
            }
            const msgId: number = parseInt($statusSpan.attr('id').substr(7));
            const msgIndex: number = this.messages.indexOf(msgId);
            this.messages.splice(msgIndex, 1);
            $statusSpan.remove();
            $('#stsMsg-' + msgId).remove(); // remove duplicate if exists
            $('#stsMsg-' + msgId).remove(); // remove duplicate if exists
            if (msgIndex === 0) {
                const $firstSpan: JQuery = this.$statusText.find('span').eq(0).clone();
                this.$statusText.append($firstSpan);
                this.$statusText.scrollTop(0);
                this.rotatePosition = 0;
            }
            this.messageRemoveHelper();
        }

        private scrollToMessage(): XDPromise<any> {
            const deferred = PromiseHelper.deferred();
            this.rotatePosition++;
            this.$statusText.animate({scrollTop: this.itemHeight * this.rotatePosition},
                this.scrollSpeed,
                function() {
                window.setTimeout(function() {
                    deferred.resolve();
                }, 300);
            });
            return deferred.promise();
        }

        private messageRemoveHelper(): void {
            if (this.messages.length === 0) {
                this.isLoading = false;
                this.$waitingIcon.hide();
                this.updateLocation();
                this.stopRotation();
            } else if (this.messages.length < 2) {
                this.stopRotation();
            }
        }

        // XXX TODO: update it
        private showDoneNotification(
            msgId: number,
            failed: boolean,
            newTableId: TableId,
            srcTableId: TableId,
            options: ShowDoneNotificationOptions = {}
        ): void {
            let operation: string;
            if (options.title) {
                operation = options.title;
            } else {
                operation = this.msgObjs[msgId].operation;
            }
            let popupNeeded: boolean = false;
            let popupWrapExists: boolean = false;
            let $popupNearTab: any = null;

            interface Position {
                left: string | number,
                right: string | number,
                top: string | number,
                bottom: string | number,
            }

            const pos: Position = {
                left: 'auto',
                right: 'auto',
                top: 'auto',
                bottom: 'auto'
            };
            let arrow: string = '';
            let classes: string = '';
            let status: string = failed ? ' failed' : ' completed';
            let $popups: JQuery;
            let $popupWrap: JQuery;
            let tableId: TableId = newTableId || srcTableId;
            // Either newTableId or srcTableId but not both will be defined
            // Possible to have neither (load);
            const self = this;

            const $tableDonePopup: JQuery =
                    $('<div class="tableDonePopup' + status + '"' +
                        'id="tableDonePopup' + msgId + '" >' +
                                operation + status +
                        '<div class="close">+</div></div>');

            if (operation === SQLOps.DSImport) {
                // only display notification if not on datasets tab
                if (!$('#dataStoresTab').hasClass('active')) {
                    $popups = $('.tableDonePopup.datastoreNotify');
                    if ($popups.length !== 0) {
                        $popupWrap = $popups.parent();
                        $popupWrap.append($tableDonePopup);
                        popupWrapExists = true;
                    } else {
                        $popupNearTab = $('#dataStoresTab');
                    }
                    classes += ' datastoreNotify';
                    if (failed) {
                        classes += ' noRedirect';
                    }
                    popupNeeded = true;
                }
            } else {
                if (!$("#sqlTableArea").is(":visible")) {
                    // when dag table is not visible
                    popupNeeded = true;
                    $popups = $('.tableDonePopup.worksheetNotify');
                    if ($popups.length !== 0) {
                        $popupWrap = $popups.parent();
                        $popupWrap.prepend($tableDonePopup);
                        popupWrapExists = true;
                    } else {
                        $popupNearTab = $('#resourcesTab');
                    }
                    classes += ' worksheetNotify';
                } else {
                    // we're on the correct worksheet, now find if table is visible
                    const visibility: string = this.tableVisibility(tableId);

                    if (visibility !== 'visible') {
                        popupNeeded = true;
                        if (visibility === 'left') {
                            $popups = $('.tableDonePopup.leftSide');
                            if ($popups.length !== 0) {
                                $popupWrap = $popups.parent();
                                $popupWrap.append($tableDonePopup);
                                popupWrapExists = true;
                            } else {
                                pos.left = MainMenu.getOffset() + 6;
                                pos.top = Math.max(200, ($(window).height() / 2) -
                                                        150);
                            }
                            classes += ' leftSide';
                        } else if (visibility === 'right') {
                            $popups = $('.tableDonePopup.rightSide');
                            if ($popups.length !== 0) {
                                $popupWrap = $popups.parent();
                                $popupWrap.append($tableDonePopup);
                                popupWrapExists = true;
                            } else {
                                pos.right = 15;
                                pos.top = Math.max(200, ($(window).height() / 2) -
                                                        150);
                                arrow = 'rightArrow';
                            }
                            classes += ' rightSide';
                        }
                    }
                }
            }

            if (popupNeeded) {
                $tableDonePopup.addClass(arrow + ' ' + classes)
                            .data('tableid', tableId);

                this.doneNotificationListeners($tableDonePopup, msgId, options);

                if (status.indexOf('failed') === -1 &&
                    (classes.indexOf('right') > -1 ||
                    classes.indexOf('left') > -1)) {
                    // detects if user scrolls to table. If so, remove scroll Listener
                    let scrollTimer: number;
                    $('#sqlTableArea .viewWrap').on('scroll.' + msgId, function() {
                        clearTimeout(scrollTimer);
                        scrollTimer = window.setTimeout(removePopUpIfScrolledToTable, 100);
                    });
                }

                if (!popupWrapExists) {
                    // we need to create a new container div for the popup
                    // and position it, otherwise we would have just appeneded
                    // the popup to an already existing container
                    if ($popupNearTab) {
                        pos.left = $popupNearTab.offset().left +
                                $popupNearTab.outerWidth() + 6;
                        pos.top = $popupNearTab.offset().top + 2;
                    }

                    $popupWrap = $('<div class="tableDonePopupWrap"></div>');
                    $popupWrap.css({
                        "top": pos.top,
                        "bottom": pos.bottom,
                        "left": pos.left,
                        "right": pos.right
                    });
                    $('body').append($popupWrap);
                    $popupWrap.append($tableDonePopup);
                }

                window.setTimeout(function() {
                    if (newTableId != null && !$('#xcTableWrap-' + newTableId).length) {
                        if ($tableDonePopup.siblings().length === 0) {
                            $tableDonePopup.parent().remove();
                        } else {
                            $tableDonePopup.remove();
                        }
                        return;
                    }

                    $tableDonePopup.fadeIn(200, function() {
                        let displayTime = self.notificationTime;
                        if (failed) {
                            displayTime = self.failNotificationTime;
                        }

                        window.setTimeout(function() {
                            $tableDonePopup.fadeOut(200, function(){
                                if ($tableDonePopup.siblings().length === 0) {
                                    $tableDonePopup.parent().remove();
                                } else {
                                    $tableDonePopup.remove();
                                }
                                $('#sqlTableArea .viewWrap').off('scroll.' + msgId);
                            });
                        }, displayTime);
                    });
                }, 400);
            }

            function removePopUpIfScrolledToTable() {
                const isInScreen: boolean = TblManager.isTableInScreen(newTableId);
                if (isInScreen) {
                    $tableDonePopup.remove();
                    $('#sqlTableArea .viewWrap').off('scroll.' + msgId);
                }
            }

            delete this.msgObjs[msgId];
        }

        private doneNotificationListeners(
            $tableDonePopup: JQuery,
            msgId: number,
            options: DoneNotificationListenersOptions
        ): void {
            const self = this;
            $tableDonePopup.mousedown(function(event) {
                xcUIHelper.removeSelectionRange();
                if (event.which !== 1) {
                    return;
                }
                const $popup = $(this);

                if ($popup.data('tableid') != null) {
                    const tableId: string = $popup.data('tableid');
                    const $tableWrap: JQuery = $('#xcTableWrap-' + tableId);

                    if ($tableWrap.length) {
                        $tableWrap.mousedown();
                    }

                }

                if ($popup.siblings().length === 0) {
                    $popup.parent().remove();
                } else {
                    $popup.remove();
                }
                $('#sqlTableArea .viewWrap').off('scroll.' + msgId);
                $(document).mouseup(self.removeSelectionRange);
            });

            $tableDonePopup.find('.close').mousedown(function(event) {
                xcUIHelper.removeSelectionRange();
                if (event.which !== 1) {
                    return;
                }
                const $popup: JQuery = $(this);
                if ($popup.hasClass('failed')) {
                    return;
                }
                event.stopPropagation();
                if ($popup.siblings().length === 0) {
                    $popup.parent().remove();
                } else {
                    $popup.remove();
                }
                $('#sqlTableArea .viewWrap').off('scroll.' + msgId);
                $(document).mouseup(self.removeSelectionRange);
            });
        }

        private tableVisibility(tableId: TableId): string | null {
            let position: string;
            const $table: JQuery = $("#xcTable-" + tableId);
            if (!$table.length) {
                position = 'visible';
                return position;
            }
            interface Rect {
                left: number,
                right: number
            }
            const rect: Rect = $table[0].getBoundingClientRect();
            const windowWidth: number = $(window).width() - 5;

            const leftBoundary: number = MainMenu.getOffset() + 40;
            if (rect.left < leftBoundary) {
                if (rect.right > leftBoundary) {
                    position = 'visible';
                } else {
                    position = 'left';
                }
            } else if (rect.left > windowWidth) {
                position = 'right';
            } else {
                position = 'visible';
            }

            return (position);
        }

        private removeSelectionRange(): void {
            const self = this;
            xcUIHelper.removeSelectionRange();
            $(document).off('mouseup', self.removeSelectionRange);
        }
    }

    /**
     * StatusMessage.setup
     */
    export function setup(): void {
        if (hasSetup) {
            return;
        }
        hasSetup = true;
        statusMessage = new StatusMsg();
    }

    /**
     * StatusMessage.addMsg
     * @param msgObj
     */
    export function addMsg(msgObj: MsgObject): number {
       return statusMessage.addMsg(msgObj);
    }

    /**
     * StatusMessage.getPos
     */
    export function getPos(): number {
        return statusMessage.getPos();
    }

    /**
     * StatusMessage.stop
     */
    export function stop(): void {
        statusMessage.stopRotation();
    }

    /**
     * StatusMessage.success
     * @param msgId
     * @param noNotification
     * @param newTableId
     * @param options
     */
    export function success(
        msgId: number,
        noNotification: boolean,
        newTableId: TableId,
        options: object
    ): void {
        statusMessage.success(msgId, noNotification, newTableId, options);
    }

    /**
     * StatusMessage.fail
     * @param failMessage
     * @param msgId
     * @param srcTableId
     */
    export function fail(
        failMessage: string = StatusMessageTStr.Error,
        msgId: number,
        srcTableId: number
    ): void {
        statusMessage.fail(failMessage, msgId, srcTableId);
    }

    /**
     * StatusMessage.cancel
     * @param msgId
     */
    export function cancel(msgId: number): void {
        statusMessage.cancel(msgId);
    }

    /**
     * StatusMessage.remove
     * @param msgId
     */
    export function remove(msgId: number): void {
        statusMessage.remove(msgId);
    }

    /**
     * StatusMessage.reset
     */
    export function reset(): void {
        statusMessage.reset();
    }

    /**
     * StatusMessage.isFailed
     */
    export function isFailed(): boolean {
        return statusMessage.checkIsFailed();
    }

    /**
     * StatusMessage.updateLocation
     * @param force
     * @param text
     */
    export function updateLocation(force?: boolean, text?: string): void {
        statusMessage.updateLocation(force, text);
    }

    /**
     * StatusMessage.removePopups
     */
    export function removePopups(): void {
        statusMessage.removePopups();
    }
}