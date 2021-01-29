class SQLService {
    /**
     * list SQL Snippets
     */
    public async list(): Promise<{id: string, name: string}[]> {
        let SQLSnippet = window["SQLSnippet"];
        return SQLSnippet.Instance.list();
    }

    /**
     * Delete SQL Snippets
     * @param tableNames
     */
    public async delete(snippetIds: string[]): Promise<void> {
        let SQLSnippet = window["SQLSnippet"];
        SQLSnippet.Instance.deleteByIds(snippetIds);
    }

    public hasUnsavedId(snippet): boolean {
        let SQLSnippet = window["SQLSnippet"];
        return  SQLSnippet.Instance.hasUnsavedId(snippet);
    }
}

export default new SQLService();