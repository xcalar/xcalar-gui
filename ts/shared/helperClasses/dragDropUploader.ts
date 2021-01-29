class DragDropUploader {
    private $container: JQuery;
    private $dropArea: JQuery;
    private helpText: string;
    private onDropCallback: Function;
    private onErrorCallback: Function;
    private dragCount: number;
    private activated: boolean;

    constructor(options: {
        $container: JQuery,
        onDrop: Function,
        text?: string,
        onError?: Function
    }) {
        this.$container = options.$container;
        this.helpText = options.text || "Drop here";
        this.onDropCallback = options.onDrop;
        this.onErrorCallback = options.onError || function(){};
        this.dragCount = 0;
        this.activated = false;
        this.setup();
    }

    private setup(): void {
        const $dropArea: JQuery = $('<div class="xc-dragDropArea">' + this.helpText + '</div>');
        this.$container.append($dropArea);
        this.$dropArea = $dropArea;

        this.$container.on('drag dragstart dragend dragover dragenter dragleave',
            function(event) {
            event.preventDefault();
            event.stopPropagation();
        });

        this.toggle(true);
    }

    public toggle(activate: boolean): void {
        const self = this;
        if (!activate) {
            this.activated = false;
            this.$container.off(".xcUpload");
            this.$container.removeClass("xc-fileDroppable");
        } else if (!this.activated) {
            // when it's not activated but to activate
            this.activated = true;
            this.$container.addClass("xc-fileDroppable");
            this.$container.on('dragenter.xcUpload', function(event: JQueryEventObject) {
                const dt = (<DragEvent>event.originalEvent).dataTransfer;
                if (dt.types && dt.types.indexOf && dt.types.indexOf('Files') !== -1) {
                    dt.effectAllowed = "copy";
                    dt.dropEffect = "copy";
                    self.$dropArea.addClass('entering');
                    self.dragCount++;
                }
            });

            this.$container.on('dragover.xcUpload', function(event) {
                (<DragEvent>event.originalEvent).dataTransfer.effectAllowed = "copy";
                (<DragEvent>event.originalEvent).dataTransfer.dropEffect = "copy";
            });

            this.$container.on('dragleave.xcUpload', function(event) {
                const dt = (<DragEvent>event.originalEvent).dataTransfer;
                if (dt.types && dt.types.indexOf && dt.types.indexOf('Files') !== -1) {
                    self.dragCount--;
                    if (self.dragCount === 0) {
                        self.$dropArea.removeClass('entering');
                    }
                }
            });

            this.$container.on('drop.xcUpload', function(event) {
                self.dragCount = 0;
                self.$dropArea.removeClass('entering');
                const dataTransfer: DataTransfer = (<DragEvent>event.originalEvent).dataTransfer;
                const files: FileList = dataTransfer.files;
                if (!files || !files.length) {
                    return;
                }
                let error: string;
                if (files.length > 1) {
                    error = "multipleFiles";
                } else if (dataTransfer && dataTransfer.items &&
                    dataTransfer.items.length) {
                    let folderFound: boolean = false;
                    // special chrome check for folder
                    [].forEach.call(dataTransfer.items, function(item) {
                        const entry: object = item.webkitGetAsEntry();
                        if (entry && entry["isDirectory"]) {
                            folderFound = true;
                            return false;
                        }
                    });
                    if (folderFound){
                        error = "invalidFolder";
                    }
                }

                if (error) {
                    self.onErrorCallback(error);
                } else {
                    self.onDropCallback(files[0]);
                }
            });
        } else {
            throw new Error("error case");
        }
    }
}