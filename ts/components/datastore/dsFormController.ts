interface DSPreviewingSource {
    file: string;
    index: number;
}
// dsPreview.js
class DSFormController {
    public files: {
        path: string,
        dsToReplace: string,
        autoCSV: boolean,
        isFolder: boolean,
        fileNamePattern: string,
        recursive: boolean
    }[];
    private previewSet: object;
    public headersList: {colType: string, colName: string}[][];
    private originalHeadersList: {colType: string, colName: string}[][];
    private suggestHeadersList: {colType: string, colName: string}[][];
    public targetName: string;
    public multiDS: boolean;
    private format: string;
    private fieldDelim: string;
    private lineDelim: string;
    private hasHeader: boolean;
    private quote: string;
    private previewingSource: DSPreviewingSource;
    private path: string;
    private udfModule: string;
    private udfFunc: string;

    public constructor() {
    }

    public set(options: DSPreviewOptions): void {
        options = options || <any>{};
        this.previewSet = {};
        this.headersList = [];
        this.originalHeadersList = [];
        this.suggestHeadersList = [];
        this.files = this.files || [];

        if (options.targetName != null) {
            this.targetName = options.targetName;
        }

        if (options.multiDS != null) {
            this.multiDS = options.multiDS || false;
        }

        /*
            * each ele of files:
            *  {
            *      path: path of the file.folder
            *      recursive: recursive or not
            *      dsToReplace: dsId that to replace
            *      dsName: dsName to restore
            *      fileNamePattern: regex pattern that matches filename
            *      autoCSV: if it needs to auto detect csv type or not
            *  }
            */
        if (options.files != null) {
            this.files = options.files;
        }

        if (options.format != null) {
            this.format = options.format;
        }
    }

    public reset(): void {
        this.fieldDelim = "";
        this.lineDelim = "\n";
        this.hasHeader = false;
        this.quote = "\"";
        this.previewingSource = null;
        this.previewSet = {};
        this.headersList = [];
        this.originalHeadersList = [];
        this.suggestHeadersList = [];
        this.files = [];

        delete this.multiDS;
        delete this.targetName;
        delete this.path;
        delete this.format;
        delete this.udfModule;
        delete this.udfFunc;
    }

    public getTargetName(): string {
        return this.targetName;
    }

    public getFile(index: number): object {
        return this.files[index];
    }

    public getFormat(): string {
        return this.format;
    }

    public setFormat(format: string) {
        this.format = format;
    }

    public useHeader(): boolean {
        return this.hasHeader || false;
    }

    public setHeader(hasHeader: boolean): void {
        if (hasHeader == null) {
            this.hasHeader = !this.hasHeader;
        } else {
            this.hasHeader = hasHeader;
        }
    }

    public setFieldDelim(fieldDelim: string): void {
        this.fieldDelim = fieldDelim;
    }

    public getFieldDelim(): string {
        return this.fieldDelim;
    }

    public setLineDelim(lineDelim: string): void {
        this.lineDelim = lineDelim;
    }

    public getLineDelim(): string {
        return this.lineDelim;
    }

    public setQuote(quote: string): void {
        this.quote = quote;
    }

    public getQuote(): string {
        return this.quote;
    }

    public setPreviewingSource(index: number, file: string): void {
        this.previewingSource = {
            index: index,
            file: file
        };
    }

    public getPreviewingSource(): DSPreviewingSource {
        return this.previewingSource;
    }

    public getPreviewFile(): string {
        if (this.previewingSource == null) {
            return null;
        }
        return this.previewingSource.file;
    }

    public getPreivewIndex(): number {
        if (this.previewingSource == null) {
            return null;
        }
        return this.previewingSource.index;
    }

    private _getPreviewHeadersIndex(index: number): number {
        // single souce only have one headers
        return this.multiDS ? index : 0;
    }

    public setPreviewHeaders(index: number, headers: {colType: string, colName: string}[]) {
        index = this._getPreviewHeadersIndex(index);
        if (headers instanceof Array && headers.length > 0) {
            this.headersList[index] = headers;
        }
    }

    public getPreviewHeaders(index: number): any {
        index = this._getPreviewHeadersIndex(index);
        return this.headersList[index];
    }

    public setOriginalHeaders(headers: {colType: string, colName: string}[]): void {
        let index: number = this.getPreivewIndex();
        if (index != null) {
            index = this._getPreviewHeadersIndex(index);
            this.originalHeadersList[index] = headers;
        }
    }

    public getOriginalHeaders(index: number): {colType: string, colName: string}[] {
        index = this._getPreviewHeadersIndex(index);
        return this.originalHeadersList[index] || [];
    }

    public setSuggestHeaders(
        sourceIndex: number,
        colNames: string[],
        colTypes: string[]
    ): void {
        const colInfos: {colType: string, colName: string}[] = colNames.map(function(colName, index) {
            return {
                colName: colName,
                colType: colTypes[index]
            };
        });
        const index: number = this._getPreviewHeadersIndex(sourceIndex);
        this.suggestHeadersList[index] = colInfos;
    }

    public getSuggestHeaders(index: number): {colType: string, colName: string}[] {
        index = this._getPreviewHeadersIndex(index);
        return this.suggestHeadersList[index];
    }

    public resetCachedHeaders(): void {
        this.headersList = [];
        this.originalHeadersList = [];
        this.suggestHeadersList = [];
    }

    public hasPreviewMultipleFiles(): boolean {
        if (!this.multiDS) {
            return false;
        }

        const previewIndex: number = this.getPreivewIndex();
        let otherHeaders: object[] = [];

        if (previewIndex != null) {
            otherHeaders = this.headersList.filter(function(header, index) {
                return header != null && index !== previewIndex;
            });
        }
        return otherHeaders.length > 0;
    }

    public getArgStr(): string {
        let args: DSFormController = $.extend({}, this);
        delete args.previewingSource;
        delete args.files;
        delete args.multiDS;
        delete args.previewSet;
        delete args.headersList;
        delete args.originalHeadersList;
        delete args.suggestHeadersList;
        return JSON.stringify(args);
    }

    public listFileInPath(
        path: string,
        recursive: boolean,
        pattern: string
    ): XDPromise<any> {
        // set local variable at first in case
        // in the middle of async call this.previewSet get reset
        const previewSet: object = this.previewSet;

        if (previewSet.hasOwnProperty(path)) {
            return PromiseHelper.resolve(previewSet[path]);
        } else {
            const deferred: XDDeferred<any> = PromiseHelper.deferred();
            const options: object = {
                "targetName": this.getTargetName(),
                "path": path,
                "recursive": recursive,
                "fileNamePattern": pattern
            };
            XcalarListFiles(options)
            .then(function(res) {
                previewSet[path] = res;
                deferred.resolve(res);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    }
}