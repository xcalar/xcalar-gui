import * as React from "react";
import dict from "../../lang";
import Modal from "./Modal";

const {CommonTStr, StatusMessageTStr} = dict;

type ModalState = {
    show: boolean;
}

export default class SQLEditorShortcutsModal extends React.Component<any, ModalState> {
    constructor(props) {
        super(props);
        this.state = {
            show: false
        };
    }

    componentDidMount() {
        document.getElementById("viewSQLEditorShortCuts").addEventListener("click", () => {
            this._show();
        });
    }

    _hide() {
        this.setState({
            show: false
        })
    }

    _show(): void {
        this.setState({show: true});
    }

    render() {
        let SQLEditorSpace = window["SQLEditorSpace"];
        return (
            <Modal
                id={"SQLEditorShortcutsModal"}
                style={{
                    width: "400px",
                    height: "500px",
                    minWidth: "300px",
                    minHeight: "400px"
                }}
                header={"SQL Shortcuts"}
                show={this.state.show}
                flex
                close={{
                    text: CommonTStr.Close,
                    callback: () => this._hide()
                }}
                options={{noBackground: true}}
            >
                {SQLEditorSpace.Instance.getEditor() &&
                    SQLEditorSpace.Instance.getEditor().getShortcutKeys().sort((a,b) => {
                        if (a.name > b.name) return 1;
                        return -1;
                    }).map(shortcut => {
                    return (
                        <ShortCutRow name={shortcut.name} keys={shortcut.keys} />
                    )
                })}
            </Modal>
        )
    }
}

function ShortCutRow(props) {
    const {name, keys} = props;

    return (
        <div className="row">
            <div className="name">{name}</div>
            <div className="keys">
            {keys.map((element, i) => {
                let letters;
                if (name === "Toggle Comment") {
                    letters = ["Ctrl", "-"];
                } else {
                    letters = element.split("-");
                }
                return (
                    <div className="keyGroup">
                        <KeyBlock key={i} letters={letters} />
                    </div>
                )
            })}
            </div>
        </div>
    )
}

function KeyBlock(props) {
    const {letters} = props;
    return (
        letters.map((letter, i) => {
            if (window["isSystemMac"]) {
                if (letter === "Cmd") {
                    letter = "⌘";
                } else if (letter === "Alt") {
                    letter = "⌥";
                }
            }

            return (
                <React.Fragment key={i}>
                    <div className="key">{letter}</div>
                    { (i < letters.length - 1) ? <div className="plus">+</div> : "" }
                </React.Fragment>
            )
        })
    )
}
