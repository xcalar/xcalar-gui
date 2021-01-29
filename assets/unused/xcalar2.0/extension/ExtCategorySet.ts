class ExtCategorySet {
    private set: {[categoryName: string]: ExtCategory};

    public constructor() {
        this.set = {};
    }

    public get(categoryName: string): ExtCategory {
        return this.set[categoryName];
    }

    public has(categoryName: string): boolean {
        return this.set.hasOwnProperty(categoryName);
    }

    public addExtension(data: object): void {
        const extension: ExtItem = new ExtItem(data);
        let categoryName: string = extension.getCategory() || ExtTStr.XcCategory;
        let extCategory: ExtCategory;

        if (this.has(categoryName)) {
            extCategory = this.get(categoryName);
        } else {
            extCategory = new ExtCategory(categoryName);
            this.set[categoryName] = extCategory;
        }
        extCategory.addExtension(extension);
    }

    public getExtension(categoryName: string, extensionName: string): ExtItem {
        if (!this.has(categoryName)) {
            return null;
        }

        const category: ExtCategory = this.get(categoryName);
        return category.getExtension(extensionName);
    }

    public getList(): ExtCategory[] {
        const set: {[categoryName: string]: ExtCategory} = this.set;
        type Tuple = [ExtCategory, string]
        let listToSort: Tuple[] = [];
        for (const categoryName in set) {
            listToSort.push([set[categoryName], categoryName]);
        }

        // sort by category
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        let resList: ExtCategory[] = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    }
}