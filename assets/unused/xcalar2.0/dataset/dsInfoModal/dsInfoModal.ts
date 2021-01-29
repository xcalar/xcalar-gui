class DSInfoModal {
    private static _instance: DSInfoModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;

    private constructor() {
        const $modal = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            "noBackground": true,
            "noCenter": true,
            "sizeToDefault": true
        });
        this._addEventListeners();
    }

    public show(dsId: string): void {
        this._modalHelper.setup();
        this._positionModal(dsId);
        this._showDSInfo(dsId);
        $(document).on("mouseup.dsInfoModal", (event) => {
            if ($(event.target).closest("#dsInfoModal").length === 0) {
                this._close();
                $(document).off("mouseup.dsInfoModal");
            }
        });
    };

    private _getModal(): JQuery {
        return $("#dsInfoModal");
    }

    private _close() {
        this._modalHelper.clear();
    }

    private _positionModal(dsId: string): void {
        let $grid = DS.getGrid(dsId);
        let rect = $grid.get(0).getBoundingClientRect();
        let top = Math.max(20, rect.top);
        let left = rect.right + 5;
        let $modal = this._getModal();
        $modal.css({
            "top": top,
            "left": left
        });
    }

    private _showDSInfo(dsId: string): void {
        let $modal = this._getModal();
        let $section = $modal.find(".infoSection");
        let dsObj = DS.getDSObj(dsId);

        let d1 = this._addBasicInfo($section.find(".name .content"), dsObj.getName());
        let d2 = this._addBasicInfo($section.find(".owner .content"), dsObj.getUser());
        this._addUsedByInfo(dsObj.getFullName());
        this._adjustModalWidth(Math.max(d1, d2));
    }

    private _addBasicInfo($section: JQuery, val: string): number {
        $section.text(val);
        xcTooltip.changeText($section, val);

        let textWidth = xcUIHelper.getTextWidth($section, val) + 5;
        let sectionWidth = $section.width();
        return Math.max(textWidth - sectionWidth, 0); // the delta width
    }

    private _addUsedByInfo(dsName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $modal = this._getModal();
        let $userList = $modal.find(".infoSection .user .content");

        $modal.addClass("fetching");
        this._addWaitingSection($userList);
        XcalarGetDatasetUsers(dsName)
        .then((users) => {
            this._addUserList($userList, users);
            deferred.resolve();
        })
        .fail((error) => {
            this._addUserList($userList);
            deferred.reject(error);
        })
        .always(() => {
            $modal.removeClass("fetching");
        });

        return deferred.promise();
    }

    private _adjustModalWidth(delta: number): void {
        delta = Math.min(Math.max(delta, 0), 350);
        let $modal = this._getModal();
        $modal.width($modal.width() + delta);
    }

    private _addWaitingSection($section: JQuery): void {
        let html: HTML =
            '<div class="animatedEllipsisWrapper">' +
                '<div class="wrap">' +
                    '<div class="animatedEllipsis hiddenEllipsis">....</div>' +
                    '<div class="animatedEllipsis staticEllipsis">....</div>' +
                '</div>' +
            '</div>';
        $section.html(html);
    }

    private _addUserList(
        $userList: JQuery,
        users?: {userId: {userIdName: string}}[]
    ): void {
        let html: HTML;
        if (users == null) {
            // error case
            html = "N/A";
        } else if (users.length === 0) {
            html = "--";
        } else {
            let list: HTML = users.map((user) => {
                try {
                    let name: string = user.userId.userIdName;
                    let li: HTML =
                        '<li class="tooltipOverflow" ' +
                        'data-toggle="tooltip ' +
                        'data-container="body" ' +
                        'data-placement="auto top" ' +
                        'data-title="' + name + '">' +
                            name +
                        '</li>';
                    return li;
                } catch (e) {
                    console.error(e);
                    return "";
                }
            }).join("")
            html = '<ul>' + list + '</ul>';
        }
        $userList.html(html);
    }

    private _addEventListeners(): void {
        const $modal = this._getModal();
        $modal.on("click", ".close", () => {
            this._close();
        });

        $modal.on("mouseenter", ".tooltipOverflow", (event) => {
            xcTooltip.auto(<any>event.currentTarget);
        });
    }
}