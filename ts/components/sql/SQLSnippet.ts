class SQLSnippet {
    private static _instance: SQLSnippet;
    private static _uid: XcUID;
    private static _unsavedPrefix  = ".unsaved.";

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    public static generateId(): string {
        this._uid = this._uid || new XcUID("Snippet");
        return this._uid.gen();
    }

    /**
     * SQLSnippet.getAppPath
     * @param snippetObj
     */
    public static getAppPath(snippetObj: SQLSnippetDurable): string {
        if (snippetObj.app == null) {
            return snippetObj.name;
        }
        return AppList.Instance.getAppPath(snippetObj.app, snippetObj.name);
    }

    private _snippets: SQLSnippetDurable[];
    private _fetched: boolean;
    private _delaySave: boolean;

    private constructor() {
        this._snippets = [];
        this._fetched = false;
    }

    /**
     * SQLSnippet.Instance.load
     */
    public async load(): Promise<boolean | null> {
        return this._fetchSnippets();
    }

    /**
     * SQLSnippet.Instance.create
     * @param name
     */
    public create(name: string | null): string {
        name = this.getValidName(name);
        const id: string = SQLSnippet.generateId();
        this._snippets.push({
            id,
            name,
            snippet: "SELECT * FROM ",
            app: null
        });
        this._updateSnippets();
        return id;
    }

     /**
     * SQLSnippet.Instance.createTemp
     * @param name
     */
    public createTemp(name: string | null): string {
        name = this.getValidName(name);
        const id: string = SQLSnippet.generateId();
        this._snippets.push({
            id,
            name,
            snippet: "",
            temp: true,
            app: null
        });
        this._updateSnippets();
        return id;
    }

    /**
     * SQLSnippet.Instance.list
     */
    public list(): SQLSnippetDurable[] {
        return this._snippets;
    }

    /**
     * SQLSnippet.Instance.getSnippetObj
     * @param id
     */
    public getSnippetObj(id: string): SQLSnippetDurable | null {
        return this._getSnippetObjectById(id);
    }

    /**
     * SQLSnippet.Instance.getSnippetText
     * Get snippet text from either the unsaved snippet or saved version
     * @param snippetObj
     */
    public getSnippetText(
        snippetObj: SQLSnippetDurable,
        updateState: boolean = false
    ): string {
        const unsavedSnippetObj: SQLSnippetDurable = this._getUnsavedSnippetObjById(snippetObj.id);
        if (unsavedSnippetObj) {
            if (updateState) {
                SQLTabManager.Instance.toggleUnSaved(snippetObj.id, true);
            }
            return unsavedSnippetObj.snippet || "";
        } else {
            return snippetObj.snippet || "";
        }
    }

    /**
     * SQLSnippet.Instance.hasSnippetWithId
     * @param id
     */
    public hasSnippetWithId(id: string): boolean {
        return this._getSnippetObjectById(id) != null;
    }

    /**
     * SQLSnippet.Instance.hasSnippetWithName
     * @param snippetName
     */
    public hasSnippetWithName(name: string): boolean {
        for (let snippetObj of this._snippets) {
            if (snippetObj.name === name) {
                return true;
            }
        }
        return false;
    }

    /**
     * SQLSnippet.Instance.update
     * @param id
     * @param snippetName
     * @param snippet
     */
    public async update(
        id: string,
        snippet: string,
        unsavedChange: boolean = false
    ): Promise<void> {
        const snippetObj = this._getSnippetObjectById(id);
        if (snippetObj == null) {
            return;
        }
        if (snippetObj.temp) {
            snippetObj.snippet = snippet;
            return;
        } else if (unsavedChange) {
            return this._storedUnSavedSnippet(snippetObj, snippet);
        } else {
            return this._storeSavedSnippet(snippetObj, snippet);
        }
    }

    /**
     * SQLSnippet.Instance.updateUnsavedChange
     * @param id
     * @param save
     */
    public async updateUnsavedChange(
        snippetObj: SQLSnippetDurable,
        save: boolean
    ): Promise<void> {
        try {
            const unsavedSnippetObj = this._getUnsavedSnippetObjById(snippetObj.id);
            if (save) {
                return this._storeSavedSnippet(snippetObj, unsavedSnippetObj.snippet);
            } else {
                // discard unsaved change
                return this._storeSavedSnippet(snippetObj, snippetObj.snippet);
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * SQLSnippet.Instance.delete
     * @param id
     */
    public delete(id: string): void {
        this._deleteSnippet(id);
        this._refresh();
    }

    public deleteTempTab(id: string): void {
        const index: number = this._snippets.findIndex((snippetObj) => snippetObj.id === id);
        if (index > -1) {
            this._snippets.splice(index, 1);
        }
    }

    /**
     * SQLSnippet.Instance.deleteByIds
     * @param ids
     */
    public deleteByIds(ids: string[]): void {
        for (let id of ids) {
            this._deleteSnippet(id);
        }
        this._refresh();
    }

    /**
     * SQLSnippet.Instance.deleteByApp
     * @param appId
     */
    public deleteByApp(appId: string): void {
        const toDelete: string[] = [];
        this._snippets.forEach((snippetObj) => {
            if (snippetObj.app === appId) {
                toDelete.push(snippetObj.id);
            }
        });

        toDelete.forEach((id) => { this._deleteSnippet(id); });
    }

    /**
     * SQLSnippet.Instance.rename
     * @param id
     * @param oldName
     * @param newName
     */
    public rename(id: string, newName: string): void {
        const snippetObj = this._getSnippetObjectById(id);
        if (snippetObj == null || this.hasSnippetWithName(newName)) {
            return;
        }
        snippetObj.name = newName;
        this._refresh();
        this._updateSnippets();
    }

    /**
     * SQLSnippet.Instance.download
     * @param id
     */
    public download(id: string): void {
        const snippetObj = this._getSnippetObjectById(id);
        if (snippetObj == null) {
            return;
        }
        const fileName: string = snippetObj.name + ".sql";
        const content: string = snippetObj.snippet;
        xcHelper.downloadAsFile(fileName, content);
    }

    /**
     * SQLSnippet.Instance.getValidName
     * @param name
     */
    public getValidName(name: string | null): string {
        name = name || CommonTxtTstr.Untitled;
        let cnt = 0;
        let validName = name;
        while (this.hasSnippetWithName(validName)) {
            cnt++;
            validName = name + cnt;
        }
        return validName;
    }

    public hasUnsavedId(snippetObj: SQLSnippetDurable): boolean {
        return snippetObj.id.startsWith(SQLSnippet._unsavedPrefix);
    }

    // checks if snippet has corresponding unsaved ID
    public hasUnsavedChanges(snippetObj: SQLSnippetDurable): boolean {
        const unsavedId: string = this._getUnsavedId(snippetObj.id);
        const unsavedSnippetObj: SQLSnippetDurable = this._getSnippetObjectById(unsavedId);
        return unsavedSnippetObj != null;
    }

    private _getKVStore(): KVStore {
        let snippetQueryKey: string = KVStore.getKey("gSQLSnippetQuery");
        return new KVStore(snippetQueryKey, gKVScope.WKBK);
    }

    private async _fetchSnippets(): Promise<boolean | null> {
        if (this._fetched) {
            return true;
        }

        try {
            const res: SQLSnippetListDurable = await this._getKVStore().getAndParse();
            if (res != null) {
                this._fetched = true;

                if (!res.snippets) {
                    // XXX a upgrade case that should be deprecated
                    for (let key in res) {
                        const snippet = {
                            id: SQLSnippet.generateId(),
                            name: key,
                            snippet: res[key],
                            app: null
                        };
                        this._snippets.push(snippet)
                    }
                } else {
                    this._snippets = res.snippets;
                }
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.error("fail sql snippet fails", e);
            return null;
        }
    }

    private _getDurable(): SQLSnippetListDurable {
        return {
            snippets: this._snippets.filter(snippet => {
                return !snippet.temp;
            })
        };
    }

    private _getSnippetObjectById(id: string): SQLSnippetDurable | null {
        for (let snippet of this._snippets) {
            if (snippet.id === id) {
                return snippet;
            }
        }
        return null;
    }

    private async _updateSnippets(delay = false): Promise<void> {
        if (delay) {
            if (this._delaySave) {
                return;
            }
            this._delaySave = true;
            await xcHelper.asyncTimeout(1000);
            if (!this._delaySave) {
                return;
            }
        }
        this._delaySave = false;
        const jsonStr = JSON.stringify(this._getDurable());
        await this._getKVStore().put(jsonStr, true);
    }

    private async _deleteSnippet(id: string): Promise<void> {
        SQLTabManager.Instance.closeTab(id);
        const unsavedId = this._getUnsavedId(id);
        let found: boolean = false;
        this._snippets = this._snippets.filter((snippetObj) => {
            // remove both snippet and unsaved version
            if (snippetObj.id === id || snippetObj.id == unsavedId) {
                found = true;
                return false;
            } else {
                return true;
            }
        });
        if (found) {
            return this._updateSnippets();
        }
    }

    private async _storedUnSavedSnippet(
        snippetObj: SQLSnippetDurable,
        snippet: string
    ): Promise<void> {
        const id: string = snippetObj.id;
        SQLTabManager.Instance.toggleUnSaved(id, true);
        const unsavedId: string = this._getUnsavedId(id);
        let unsavedSnippetObj: SQLSnippetDurable = this._getSnippetObjectById(unsavedId);
        if (unsavedSnippetObj == null) {
            unsavedSnippetObj = {
                ...snippetObj,
                id: unsavedId
            };
            this._snippets.push(unsavedSnippetObj);
        }
        unsavedSnippetObj.snippet = snippet;
        return this._updateSnippets();
    }

    private async _storeSavedSnippet(
        snippetObj: SQLSnippetDurable,
        snippet: string
    ): Promise<void> {
        snippetObj.snippet = snippet;
        const unsavedId: string = this._getUnsavedId(snippetObj.id);
        const unsavedSnippetObj: SQLSnippetDurable = this._getSnippetObjectById(unsavedId);
        if (unsavedSnippetObj) {
            this._snippets = this._snippets.filter(({ id }) => id !== unsavedId);
        }
        await this._updateSnippets();
        SQLTabManager.Instance.toggleUnSaved(snippetObj.id, false);
        return;
    }

    private _getUnsavedId(id: string): string {
        return `${SQLSnippet._unsavedPrefix}${id}`;
    }

    private _getUnsavedSnippetObjById(id: string): SQLSnippetDurable {
        const unsavedId: string = this._getUnsavedId(id);
        return this._getSnippetObjectById(unsavedId);
    }

    private _refresh(): void {
        ResourceMenu.Instance.render(ResourceMenu.KEY.SQL);
    }
}

if (typeof runEntity !== "undefined") {
    runEntity.SQLSnippet = SQLSnippet;
}