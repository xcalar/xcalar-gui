import * as React from "react";
import dict from "../../lang";
import Modal from "./Modal";

const {CommonTStr, StatusMessageTStr, AlertTStr} = dict;

type ModalState = {
    show: boolean;
    customNodes: any[]
}

export default class CustomNodeManagerModal extends React.Component<any, ModalState> {
    constructor(props) {
        super(props);
        this.state = {
            show: false,
            customNodes: []
        };
    }

    componentDidMount() {
        window["xcGlobal"]["react"]["showCustomNodeManagerModal"]  = () => {
            this._show();
        };
    }

    _hide() {
        this.setState({
            show: false
        });
    }

    _show(): void {
        this.setState({
            show: true
        });
        this._setNodes();
    }

    _setNodes() {
        const dagCategories = window["DagCategoryBar"].Instance.getCategories();
        const customNodes = [];
        dagCategories.getCategories().forEach((category) => {
            const operators = category.getSortedOperators();
            operators.forEach((categoryNode) => {
                if (categoryNode.isHidden()) {
                    return;
                }
                if (categoryNode.getNodeType() === window["DagNodeType"].Custom) {
                    customNodes.push(categoryNode);
                }
            });
        });
        this.setState({
            customNodes: customNodes
        });
    }

    _selectDelete(index): void {
        Alert.show({
            title: AlertTStr.SharedCustomOpDeleteTitle,
            msg: AlertTStr.ShardCustomOpDeleteMsg,
            onConfirm: () => {
                window["DagCategoryBar"].Instance.deleteOperator(this.state.customNodes[index].getNode().getId())
                .always(() => {
                    this._setNodes();
                })

            }
        });
    }

    _selectEdit(index): void {
        const opId = this.state.customNodes[index].getNode().getId();
        window["DagCustomRenameModal"].Instance.show({
            name: this.state.customNodes[index].getNode().getDisplayNodeType(opId),
            validateFunc: (newName) => {
                let category = window["DagCategoryBar"].Instance.getCategories().getCategoryByNodeId(opId);
                return window["DagCategoryBar"].Instance.isValidOperatorName(category, newName);
            },
            onSubmit: (newName) => {
                window["DagCategoryBar"].Instance.renameOperator(opId, newName)
                .always(() => {
                    this._setNodes();
                });
            }
        });
    }

    render() {
        const nodesList = this.state.customNodes.map((categoryNode, index) => {
            const operator = categoryNode.getNode();
            let opDisplayName: string = categoryNode.getDisplayNodeType();
            return <div key={operator.getId()} className="row operator" data-opid={operator.getId()}>
                            <span className="label">
                            {
                                // this.state.editingIndex === index ?
                                // <input className="xc-input" type="text" spellCheck={false} value={this.state.editingName} onChange={this._onNameChange} />
                                // :
                                opDisplayName
                            }
                            </span>
                            <div className="actions">
                                <div className="iconWrap rename xc-action"
                                    data-toggle="tooltip"
                                    data-container="body"
                                    data-title={"Rename"}
                                    onClick={this._selectEdit.bind(this, index)}
                                >
                                    <i className="icon xi-edit"></i>
                                </div>
                                <div className="iconWrap delete xc-action"
                                    data-toggle="tooltip"
                                    data-container="body"
                                    data-title={"Delete"}
                                    onClick={this._selectDelete.bind(this, index)}
                                >
                                    <i className="icon xi-trash"></i>
                                </div>
                            </div>
                    </div>
        });
        return (
            <Modal
                id={"CustomNodeManagerModal"}
                style={{
                    width: "400px",
                    height: "400px",
                    minWidth: "300px",
                    minHeight: "300px"
                }}
                header={"Custom Node Manager"}
                show={this.state.show}
                flex
                close={{
                    text: CommonTStr.Close,
                    callback: () => {
                        this._hide();
                    }
                }}
            >
            <div>
                {nodesList.length ? nodesList : <div className="noNodes">There are no custom nodes left to edit.</div>}
            </div>
            </Modal>
        )
    }
}
