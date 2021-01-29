class FileInfoModal {
    private static _instance: FileInfoModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;

    private constructor() {
        const $modal = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            "noBackground": true,
            "sizeToDefault": true
        });
        this._addEventListeners();
    }

    public show(
        file: {
            name: string,
            attr: {
                size: number,
                mtime: number,
                isDirectory: boolean
            }
        }
    ): void {
        this._modalHelper.setup();
        this._updateFileInfo(file);
    };

    private _getModal(): JQuery {
        return $("#fileInfoModal");
    }

    private _close() {
        this._modalHelper.clear();
        this._updateFileInfo(null);
    }
    
    private _updateFileInfo(
        file: {
            name: string,
            attr: {
                size: number,
                mtime: number,
                isDirectory: boolean
            }
        }
    ): void {
        let $modal = this._getModal();
        let $header = $modal.find(".modalHeader .text");
        let $section = $modal.find(".modalMain");
        if (file == null) {
            $header.text("");
            $section.find(".fileName").text("--");
            $section.find(".fileType").text("--");
            $section.find(".mdate .content").text("--");
            // $infoContainer.find(".cdate .content").text("--");
            $section.find(".fileSize .content").text("--");
            $section.find(".fileIcon").removeClass()
                          .addClass("icon fileIcon xi-folder");
            return;
        }
        let name = file.name;
        let mTime = moment(file.attr.mtime * 1000).format("h:mm:ss A ll");

        let isFolder = file.attr.isDirectory;
        let size: string = isFolder ? "--" : <string>xcHelper.sizeTranslator(file.attr.size);
        let fileType = isFolder ? "Folder" : xcHelper.getFormat(name);
        let $fileIcon = $section.find(".fileIcon").eq(0);

        // Update file name & type
        if (name.length > 30) {
            name = name.substring(0, 30) + "...";
        }

        $header.text(name);
        $section.find(".fileName").text(name);

        if (!fileType) {
            // Unknown type
            fileType = "File";
        }
        $section.find(".fileType").text(fileType);

        // Update file icon
        $fileIcon.removeClass();
        if (isFolder) {
            $fileIcon.addClass("xi-folder");
        } else {
            if (fileType &&
                FileBrowser.gridFormatMap.hasOwnProperty(fileType)
            ) {
                $fileIcon.addClass(FileBrowser.gridFormatMap[fileType]);
            } else {
                $fileIcon.addClass("xi-documentation-paper");
            }
        }
        $fileIcon.addClass("icon fileIcon");

        // Update file info
        $section.find(".mdate .content").text(mTime);
        $section.find(".fileSize .content").text(size);
    }

    private _addEventListeners(): void {
        const $modal = this._getModal();
        $modal.on("click", ".close", () => {
            this._close();
        });
    }
}