class CodeMirrorManager {
    private static _instance: CodeMirrorManager;
    public static readonly DefaultColorTheme: string = "xcalar-dark";

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _editors: CodeMirror.Editor[];
    private _colorTheme: string;

    private constructor() {
        this._editors = [];
        this._colorTheme = CodeMirrorManager.DefaultColorTheme; // default theme
    }

    /**
     * CodeMirrorManager.Instance.register
     * @param editor
     */
    public register(editor: CodeMirror.Editor): void {
        this._editors.push(editor);
    }

    /**
     * CodeMirrorManager.Instance.getColorTheme
     */
    public getColorTheme(): string {
        return this._colorTheme;
    }

    /**
     * CodeMirrorManager.Instance.setColorTheme
     * @param theme
     */
    public setColorTheme(theme: string): void {
        if (!theme || theme === this._colorTheme) {
            return;
        }
        this._colorTheme = theme;
        this._editors.forEach((editor) => editor.setOption("theme", theme));
    }

}