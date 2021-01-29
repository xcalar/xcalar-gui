import * as React from "react"
import * as Modal from './Modal'
import Button from '../../components/widgets/Button'
import RefreshIcon from '../../components/widgets/RefreshIcon'
import dict from "../../lang";
const DSTargetTStr = dict.DSTargetTStr;
export default class ConnectorsModal extends React.Component<any, any> {
    private modalContentRef;

    constructor(props){
        super(props);
        this.modalContentRef = React.createRef();
        this.state = {
            currentView: "list",
            connectors: DSTargetManager.getAllTargets(),
            connector: null,
            loading: true,
            targetTypes: {},
            locked: null
        };
        DSTargetManager.updateModal = (rect) => {
            this._updateModal(rect);
        }
    }
    async componentDidMount() {
        try {
            if (!DSTargetManager.hasTypeList()) {
                let time = Date.now();
                await DSTargetManager.getTargetTypeList(true);
                let delay = Math.max(0, 1500 - (Date.now() - time));
                setTimeout(() => {
                    this.setState({
                        loading: false
                    });
                }, delay);
            } else {
                this.setState({
                    loading: false
                });
            }
        } catch (e) {
            this.setState({
                loading: false
            });
            console.error(e);
        }
        const targetTypes = DSTargetManager.getAllTargetTypes();
        this.setState({
            targetTypes: targetTypes
        });
    }

    _updateModal(rect) {
        this.modalContentRef.current.updateSize({
            width: rect.width, height: rect.height
        });
        this.modalContentRef.current.updatePosition({
            x: rect.left, y: rect.top
        });
    }

    _viewDetails(connector) {
        this.setState({
            currentView: "details",
            connector: connector
        });
    }

    _delete(connector) {
        let msg = xcStringHelper.replaceMsg(DSTargetTStr.DelConfirmMsg, {
            target: connector.name
        });
        Alert.show({
            title: DSTargetTStr.DEL,
            msg: msg,
            onConfirm: () => {
                let time = Date.now();
                this.setState({
                    locked: "deleting"
                });
                XcalarTargetDelete(connector.name)
                .then(() => {
                    return DSTargetManager.refreshTargets(true);
                })
                .then(() => {
                    this.setState({
                        connectors: DSTargetManager.getAllTargets()
                    });
                })
                .fail((error) => {
                    Alert.error(DSTargetTStr.DelFail, error.error);
                })
                .always(() => {
                    let delay = Math.max(0, 1500 - (Date.now() - time));
                    setTimeout(() => {
                        this.setState({
                            locked: null
                        });
                    }, delay);
                })
            }
        });
    }

    _addConnector() {
        DSTargetManager.showTargetCreateView(true);
    }

    render() {
        const { onClose} = this.props;
        let connectorRows = [];
        const connectors = this.state.connectors;
        for (let i in connectors) {
            connectorRows.push(
                <div className="row" key={connectors[i].name}>
                    <div>{connectors[i].name}</div>
                    <div className="connectorName">
                        <span className="text">{connectors[i].type_name}</span>
                        <div className="buttons">
                            <Button className="btn-secondary btn-new viewDetails"
                                onClick={this._viewDetails.bind(this, connectors[i])}
                            >View Details</Button>
                             <Button className="btn-secondary btn-new delete"
                                onClick={this._delete.bind(this, connectors[i])}
                            >Delete</Button>
                        </div>
                    </div>
                </div>
            )
        }
        return (
            <Modal.Dialog resizable id="connectorManager" style={{
                width: 600,
                height: 500
            }} ref={this.modalContentRef}>
                <Modal.Header onClose={onClose}>
                {this.state.currentView === "list" ?
                    "Manage Connectors" :
                    <React.Fragment>
                    <div className="backBtn xc-action-icon" onClick={() => {
                        this.setState({
                            currentView: "list"
                        });
                    }}><i className="icon xi-load-back-popup"></i></div>
                    Connector Details
                    </React.Fragment>
                }

                </Modal.Header>
                {this.state.loading ?
                    <RefreshIcon lock />
                    :
                <Modal.Body style={{padding: '0px'}}>
                    { this.state.currentView === "list" ?
                    <div className="connectorsListArea">
                        <div className="row rowHeader">
                            <div>Connector Name</div>
                            <div>Connector Type</div>
                        </div>
                        <div className="connectorsList">
                        {connectorRows}
                        </div>
                        <div className="addBtn xc-action"
                            data-toggle="tooltip"
                            data-placement="auto top"
                            data-container="body"
                            data-original-title="Add a new connector"
                            onClick={this._addConnector.bind(this)}>
                            <i className="icon xi-plus"></i>
                        </div>
                    </div> : null }
                    { this.state.currentView === "details" ?
                    <div className="connectorsDetailArea">
                        <div className="row">
                            <div className="label">
                            Connector Name
                            </div>
                            <div className="value">
                            { this.state.connector.name }
                            </div>
                        </div>
                        <div className="row">
                            <div className="label">
                            Connector Type
                            </div>
                            <div className="value">
                            { this.state.connector.type_name }
                            </div>
                        </div>
                        <div className="row descriptionRow">
                            <div className="label">
                            Description
                            </div>
                            <div className="value">
                            { this.state.targetTypes[this.state.connector.type_id].description }
                            </div>
                        </div>
                        <ConfigSection
                            target={this.state.connector}
                            targetTypes={this.state.targetTypes}
                        />
                    </div> : null }
                    {this.state.locked &&
                        <RefreshIcon lock />
                    }
                </Modal.Body> }
            </Modal.Dialog>
        );
    }
}

function ConfigSection({target, targetTypes}) {
    const params = target.params;
    const targetInfo = targetTypes[target.type_id];
    const paramList = targetInfo.parameters.map((param) => {
        return param.name;
    });
    let paramKeys = Object.keys(params);
    let rows = [];


        paramList.forEach((paramName) => {
            try {
                if (!paramKeys.includes(paramName)) {
                    // This parameter wasnt specified.
                    return;
                }
                let paramVal = params[paramName];
                if (typeof paramVal !== "string") {
                    paramVal = JSON.stringify(paramVal);
                }
                if (_isSecretParam(targetInfo, paramName)) {
                    paramVal = "*".repeat(6);
                }
                rows.push(
                    <div className="row" key={paramName}>
                        <div className="label">
                        {paramName}
                        </div>
                        <div className="value">
                            {paramVal}
                        </div>
                </div>)
             } catch (e) {
                console.error(e);
            }
        });


    return <div className="configArea">
        {rows.length ? <div className="subHeading">Configuration</div>
        : null}
        {rows}
    </div>
}

function _isSecretParam(targetType, paramName) {
    try {
        for (let i = 0; i < targetType.parameters.length; i++) {
            let param = targetType.parameters[i];
            if (param.name === paramName) {
                return param.secret;
            }
        }
    } catch (e) {
        console.error(e);
    }
    return false;
}