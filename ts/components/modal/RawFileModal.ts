class RawFileModal {
    private static _instance: RawFileModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _id: string;
    private _previewArgs: any;
    private _initialOffset: number;
    private _totalSize: number;

    // constant
    private readonly _outDateError: string = "preview id is out of date";
    private readonly _lineHeight: number = 30;

    private constructor() {
        let timeout;
        this._modalHelper = new ModalHelper(this._getModal(), {
            noEnter: true,
            resizeCallback: (_e, resizeInfo) => {
                // if (!this._isInHexMode()) {
                //     return;
                // }
                this._inLoadMode();
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this._initialPreview(resizeInfo.size.height, resizeInfo.size.width);
                }, 500);
            }
        });
        this._addEventListeners();
    }

    /**
     * RawFileModal.Instance.show
     * @param options
     */
    public show(
        options: {
            targetName: string,
            path: string,
            fileName: string
        }
    ): XDPromise<void> {
        this._reset();
        this._setPreviewerId();
        this._setInstr(options.fileName);
        this._modalHelper.setup();
        this._previewArgs = options;
        return this._initialPreview();
    }

    private _close(): void {
        this._modalHelper.clear();
        this._reset();
    }

    private _reset(): void {
        this._getFileNameEl().empty();
        this._id = null;
        this._previewArgs = null;
        this._initialOffset = 0;
        this._totalSize = 0;
        let $modal = this._getModal();
        $modal.find(".preview").empty();
        $modal.find(".errorSection").empty();
        $modal.find(".offsetNum").text(0);
        $modal.find(".skipToOffset")
        .removeClass("xc-disabled").val("");
        this._inPreviewMode();
    }

    private _getModal(): JQuery {
        return $("#rawFileModal");
    }

    private _getFileNameEl(): JQuery {
        return this._getModal().find(".fileName");
    }

    private _setInstr(fileName: string): void {
        this._getFileNameEl().text(xcStringHelper.escapeHTMLSpecialChar(fileName));
    }

    private _getPreviewerId(): string {
        return this._id;
    }

    private _setPreviewerId(): void {
        this._id = xcHelper.randName("id");
    }

    private _isValidId(previewerId: string): boolean {
        return (previewerId === this._getPreviewerId());
    }

    private _inPreviewMode(): void {
        this._previewOrHexMode();
        this._getModal().removeClass("hexMode");
    }

    private _isInHexMode(): boolean {
        return this._getModal().hasClass("hexMode");
    }

    private _inHexMode(): void {
        this._previewOrHexMode();
        this._getModal().addClass("hexMode");
    }

    private _previewOrHexMode(): void {
        this._getModal().removeClass("loading")
                            .removeClass("error");
    }

    private _inLoadMode(): void {
        this._getModal().removeClass("error")
                        .addClass("loading");
    }

    private _inErrorMode(): void {
        this._getModal().removeClass("loading hexMode")
                        .addClass("error");
    }

    private _initialPreview(height?: number, width?: number): XDPromise<void> {
        return this._previewFile(0, height, width);
    }

    private _previewFile(offset: number, height?: number, width?: number): XDPromise<void> {
        if (this._previewArgs == null) {
            console.error("invalid arguments");
            return PromiseHelper.reject("invalid arguments");
        }
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let previewerId = this._getPreviewerId();

        let blockSize = this._calculateCharsPerLine(width);
        let numBytesToRequest = this._calculateBytesToPreview(blockSize, height);
        let wasHexMode = this._isInHexMode();
        this._inLoadMode();

        let args = {
            ...this._previewArgs,
            recursive: false,
            fileNamePattern: ""
        };
        XcalarPreview(args, numBytesToRequest, offset)
        .then((res) => {
            if (!this._isValidId(previewerId)) {
                deferred.reject(this._outDateError);
            } else {
                try {
                    this._initialOffset = offset;
                    this._totalSize = res.totalDataSize;

                    if (wasHexMode) {
                        this._inHexMode();
                    } else {
                        this._inPreviewMode();
                    }

                    this._showPreview(res.base64Data, blockSize);
                    deferred.resolve();
                } catch (e) {
                    console.error(e);
                    return PromiseHelper.reject(e.message);
                }
            }
        })
        .fail((error) => {
            if (!this._isValidId(previewerId)) {
                // ignore the error
                deferred.reject(this._outDateError);
            } else {
                this._handleError(error);
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    private _handleError(error: any): void {
        this._inErrorMode();
        if (error && typeof error === "object" && error.error) {
            error = error.error;
        }
        this._getModal().find(".errorSection").text(error);
    }

    private _calculateCharWidth(): number {
        let $section = this._getModal().find(".preview.normal");
        let $fakeElement = $(this._getCharHtml("a", null, null));

        $fakeElement.css("font-family", "monospace");
        $section.append($fakeElement);
        let charWidth = xcUIHelper.getTextWidth($fakeElement);
        $fakeElement.remove();
        return charWidth;
    }

    private _calculateCharsPerLine(width?: number): number {
        const padding: number = 37;
        let sectionWidth: number
        if (this._isInHexMode()) {
            sectionWidth = 340 - padding;
        } else {
            let $modal = this._getModal();
            sectionWidth = width || $modal.width() - 30;
        }
        let charWidth = this._calculateCharWidth();
        const oneBlockChars: number = 8;
        let numOfBlock: number = Math.floor(sectionWidth / charWidth / oneBlockChars);
        let charsPerLine: number = numOfBlock * oneBlockChars;
        return charsPerLine;
    }

    private _calculateBytesToPreview(charsPerLine: number, height?: number): number {
        let $section = this._getModal().find(".preview.normal");
        height = height || $section.height();
        let numLine: number = Math.floor(height / this._lineHeight);
        let numBytes: number = numLine * charsPerLine;
        return numBytes;
    }

    private _showPreview(base64Data: any, blockSize: number): void {
        // Note: hex dump is different from view the data using editor.
        // so use atob instead of Base64.decode
        let buffer = atob(base64Data);
        let codeHtml: string = "";
        let charHtml: string = "";

        for (let i = 0, len = buffer.length; i < len; i += blockSize) {
            let endIndex: number = Math.min(i + blockSize, buffer.length);
            let block = buffer.slice(i, endIndex);
            // use dot to replace special chars
            let chars = block.replace(/[\x00-\x1F\x20]/g, '.')
                                .replace(/[^\x00-\x7F]/g, '.'); // non-ascii chars

            charHtml += this._getCharHtml(chars, blockSize, i);
            codeHtml += this._getCodeHtml(block, blockSize, i);
        }

        if (!charHtml) {
            charHtml = "File is empty.";
        }

        let $modal = this._getModal();
        $modal.find(".preview.normal").html(charHtml);
        $modal.find(".preview.hexDump").html(codeHtml);
        this._updateCSS();
        this._hoverEvent();
    }

    private _getCharHtml(
        block: string,
        blockSize: number,
        startOffset: number
    ): HTML {
        startOffset = startOffset || 0;

        let chars = block.split("").map((ch, index) => {
            let offset = startOffset + index;
            return this._getCell(ch, offset);
        }).join("");

        if (blockSize != null) {
            let numOfPaddings = blockSize - block.length;
            chars += '<span class="cell"> </span>'.repeat(numOfPaddings);
        }

        let style = this._getCellStyle();
        let html = '<div class="line" style="' + style + '">' +
                        chars +
                    '</div>';

        return html;
    }

    private _getCodeHtml(
        block: string,
        blockSize: number,
        startOffset: number
    ): HTML {
        let hex: string = "0123456789ABCDEF";
        let codes = block.split("").map((ch, index) => {
            let offset = startOffset + index;
            let code = ch.charCodeAt(0);
            let hexCode = hex[(0xF0 & code) >> 4] + hex[0x0F & code];
            let cell = this._getCell(hexCode, offset);
            return "" + cell;
        }).join("");

        let numOfPaddings = blockSize - block.length;
        codes += '  <span class="cell">  </span>'.repeat(numOfPaddings);

        let style = this._getCellStyle();
        let html = '<div class="line" style="' + style + '">' +
                        codes +
                    '</div>';
        return html;
    }

    private _getCell(ch: string, offset: number): HTML {
        offset = this._initialOffset + offset;
        let cell: HTML =
        '<span class="cell" data-offset="' + offset + '">' +
            xcStringHelper.escapeHTMLSpecialChar(ch) +
        '</span>';
        return cell;
    }

    private _getCellStyle(): string {
        let style = "height:" + this._lineHeight + "px; " +
                    "line-height:" + this._lineHeight + "px;";
        return style;
    }

    private _updateCSS(): void {
        let charWidth = this._calculateCharWidth();
        this._getModal().find(".preview.normal .cell")
        .css("width", charWidth + "px");
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.find(".toggleHex").click(() => {
            if (this._isInHexMode()) {
                this._inPreviewMode();
            } else {
                this._inHexMode();
            }
            this._initialPreview();
        });

        let $skipToOffset = $modal.find(".skipToOffset");
        $skipToOffset.on("keyup", (e) => {
            if (e.which === keyCode.Enter) {
                let offset = $(e.currentTarget).val();
                if (offset !== "") {
                    this._updateOffset(Number(offset), false);
                }
            }
        });
    }

    private _hoverEvent(): void {
        this._getModal().find(".cell").hover((e) => {
            let offset = $(e.currentTarget).data("offset");
            this._updateOffset(offset, false);
        });
    }

    // the noFetch is a prevent of potential recursive
    private _updateOffset(offset: number, noFetch: boolean): void {
        if (!Number.isInteger(offset) || offset < 0) {
            return;
        }

        let $modal = this._getModal();
        $modal.find(".cell.active").removeClass("active");
        let $cell = $modal.find(".cell[data-offset='" + offset + "']");
        if ($cell.length > 0) {
            $modal.find(".offsetNum").text(offset);
            $cell.addClass("active");
        } else if (!noFetch) {
            this._fetchNewPreview(offset);
        }
    }

    private _fetchNewPreview(offset: number): XDPromise<void> {
        let $modal = this._getModal();
        let $skipToOffset = $modal.find(".skipToOffset");
        if (offset >= this._totalSize) {
            StatusBox.show(DSTStr.OffsetErr, $skipToOffset, false, {
                "side": "left"
            });
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let normalizedOffset = this._normalizeOffset(offset);
        $skipToOffset.addClass("xc-disabled");

        this._previewFile(normalizedOffset)
        .then(() => {
            this._updateOffset(offset, false);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            $skipToOffset.removeClass("xc-disabled");
        });

        return deferred.promise();
    }

    private _normalizeOffset(offset: number): number {
        let charsInOneLine = this._calculateCharsPerLine();
        return Math.floor(offset / charsInOneLine) * charsInOneLine;
    }
}