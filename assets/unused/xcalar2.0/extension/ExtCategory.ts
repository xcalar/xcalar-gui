class ExtCategory {
    private name: string;
    private extensions: {[extName: string]: ExtItem};

    public constructor(categoryName) {
        this.name = categoryName;
        this.extensions = {};
    }

    public getName(): string {
        return this.name;
    }

    public getExtension(extName): ExtItem {
        return this.extensions[extName];
    }

    public hasExtension(extName: string): boolean {
        return this.extensions.hasOwnProperty(extName);
    }

    public addExtension(extension: ExtItem): boolean {
        const extName: string = extension.getName();
        if (extName == null || this.hasExtension(extName)) {
            console.error("Duplicated extension");
            return false;
        }

        this.extensions[extName] = extension;
        return true;
    }

    public getExtensionList(searchKey?: string): ExtItem[] {
        searchKey = searchKey || "";
        searchKey = xcStringHelper.escapeRegExp(searchKey);
        const extensions = this.extensions;
        type Tuple = [ExtItem, string]
        let listToSort: Tuple[] = [];
        const regExp: RegExp = new RegExp(searchKey, "i");
        for (const extName in extensions) {
            if (!regExp.test(extName)) {
                continue;
            }
            listToSort.push([extensions[extName], extName]);
        }

        // sort by extension name
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        let resList: ExtItem[] = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    }
}