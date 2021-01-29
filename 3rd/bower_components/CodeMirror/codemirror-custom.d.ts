import * as CodeMirror from "codemirror";

declare module "codemirror" {
    function pythonHint(cm: CodeMirror.Editor): any;
    function resolveMode(mode: string): {keywords: object};
    var hint: {sql: any};

    interface Editor {
        getCursor(start?: string): {line: number, ch: number};
        removeLineWidget(widget: CodeMirror.LineWidget): void;
        clearHistory(): void;
        getSelection(): string;
        replaceSelection(text: string, replace?: string): void;
        eachLine(start: number, end: number, cb: Function): void;
        getLine(lineNum: number): string;
        setSelection(obj: object, obj2: object): void;
        replaceRange(ch: string, pos: object): void;
        setCursor(pos: object);
    }

    interface ShowHintOptions {
        alignWithWord: boolean;
        completeOnSingleClick: boolean;
        hint?: HintFunction | AsyncHintFunction;
        tables?: object;
    }

    interface EditorConfiguration {
        matchBrackets: boolean;
        autoCloseBrackets: boolean;
        search: boolean;
        hint?: HintFunction | AsyncHintFunction;
    }
}
