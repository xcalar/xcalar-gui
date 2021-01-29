import * as React from "react";
import { Rnd } from "react-rnd";
import dict from "../../lang";
import Button from "../widgets/Button";
import keyCode from "../../enums/keyCode";

const CommonTStr = dict.CommonTStr;

type ModalProps = {
    id: string;
    header: string;
    instruct?: string;
    show: boolean;
    children: any;
    confirm?: {
        text?: string,
        disabled?: boolean,
        callback: any
    },
    close: {
        text?: string,
        disabled?: boolean,
        callback: any
    },
    style: any;
    className?: string;
    options?: {
        locked?: boolean
        verticalQuartile?: boolean,
        noBackground?: boolean
    };
    flex?: boolean
}

type ModalState = {
    isDragging: boolean;
};

export default class Modal extends React.Component<ModalProps, ModalState> {
    _confirmRef: React.RefObject<HTMLButtonElement>;
    _closeRef: React.RefObject<HTMLDivElement>;
    rnd: Rnd;

    constructor(props) {
        super(props);
        this._handleConfirm = this._handleConfirm.bind(this);
        this._handleKeyboardEvent = this._handleKeyboardEvent.bind(this);
        this._confirmRef = React.createRef();
        this._closeRef = React.createRef();
        this.state = {
            isDragging: false
        };
    }

    componentDidUpdate(prevProps) {
        if (!prevProps.show && this.props.show) {
            // when show
            document.addEventListener("keydown", this._handleKeyboardEvent);
        } else if (prevProps.show && !this.props.show) {
            // when hide
            document.removeEventListener("keydown", this._handleKeyboardEvent);
            window["xcTooltip"].hideAll();
        }
    }

    render() {
        if (!this.props.show) {
            return null;
        }

        let { id, className, header, instruct,
            children, close, confirm, options } = this.props;
        options = options || {};
        // XXX remove window hack
        let gMinModeOn: boolean = typeof window !== "undefined" && window["gMinModeOn"];
        let modalClassNames = ["modalContainer"];
        if (className) {
            modalClassNames.push(className);
        }
        if (this.state.isDragging) {
            modalClassNames.push("dragging");
        }

        let modalBgClassNames = ["modalBackground"];
        if (options.locked) {
            modalBgClassNames.push("locked");
        }

        if (!gMinModeOn) {
            modalClassNames.push("anim");
            modalBgClassNames.push("anim");
        }
        if (this.props.flex) {
            modalClassNames.push("flex visible");
        }
        if (options.noBackground) {
            modalClassNames.push("noBackground");
        }
        if (!instruct) {
            modalClassNames.push("noInstr");
        }

        return (
            <React.Fragment>
                <Rnd
                    ref={c => { this.rnd = c; }}
                    id={id}
                    className={modalClassNames.join(" ")}
                    style={this._getStyle()}
                    default = {{...this._center(false)}}
                    bounds="body"
                    dragHandleClassName="modalHeader"
                    onDragStart={() => this.setState({isDragging: true})}
                    onDragStop={() => this.setState({isDragging: false})}
                >
                    <header className="modalHeader">
                        <span className="text">{header}</span>
                        <div
                            className="headerBtn exitFullScreen"
                            data-toggle="tooltip"
                            data-container="body"
                            data-placement="top auto"
                            data-tipclasses="highZindex"
                            data-original-title={CommonTStr.Minimize}
                            onClick={() => this._exitFullScreen()}
                        >
                            <i className="icon xi-exit-fullscreen"></i>
                        </div>
                        <div
                            className="headerBtn fullScreen"
                            data-toggle="tooltip"
                            data-container="body"
                            data-placement="top auto"
                            data-tipclasses="highZindex"
                            data-original-title={CommonTStr.Maximize}
                            onClick={() => this._enterFullScreen()}
                        >
                            <i className="icon xi-fullscreen"></i>
                        </div>
                        <div
                            className="close"
                            onClick={close.callback}
                            ref={this._closeRef}
                            data-toggle="tooltip"
                            data-container="body"
                            data-placement="top auto"
                            data-tipclasses="highZindex"
                            data-original-title={CommonTStr.Close}
                        >
                            <i className="icon xi-close"></i>
                        </div>
                    </header>
                    { instruct ?
                    <section className="modalInstruction oneLine">
                        <div className="text">{instruct}</div>
                    </section>
                    : null }
                    <section className="modalMain">
                        {children}
                    </section>
                    <section className="modalBottom">
                        {confirm &&
                            <Button
                                className={"confirm" + (confirm.disabled ? " xc-disabled" : "")}
                                onClick={this._handleConfirm}
                                ref={this._confirmRef}
                            >
                                {confirm.text || CommonTStr.Confirm}
                            </Button>
                        }
                        <Button
                            className={"cancel" + (close.disabled ? " xc-disabled" : "")}
                            onClick={close.callback}
                        >
                            {close.text || CommonTStr.Close}
                        </Button>
                    </section>
                </Rnd>
                {!options.noBackground &&
                    <div className={modalBgClassNames.join(" ")} style={{display: "block"}}></div>
                }

            </React.Fragment>
        );
    }

    private _getStyle() {
        let { style } = this.props;
        return {
            ...style,
            display: style.display || "block"
        };
    }

    private _center(isFullScreen: boolean): {x: number, y: number, width: number, height: number} {
        let {width, height} = this.props.style;
        let width_num: number = parseFloat(width);
        let height_num: number = parseFloat(height);
        let left: number;
        let top: number;

        if (isFullScreen) {
            width_num = window.innerWidth - 14;
            height_num = window.innerHeight - 9;
            top = 0;
            left = Math.round((window.innerWidth - width_num) / 2);
            return {x: left, y: top, width: width_num, height: height_num};
        } else if (isNaN(width_num) || isNaN(height_num)) {
            return {x: left, y: top, width, height};
        } else {
            left = (window.innerWidth - width_num) / 2;
            let options = this.props.options || {};
            if (options.verticalQuartile) {
                top = (window.innerHeight - height_num) / 4;
            } else {
                top = (window.innerHeight - height_num) / 2;
            }
            return {x: left, y: top, width: width_num, height: height_num};
        }
    }

    private _handleConfirm() {
        this._confirmRef.current.blur();
        this.props.confirm.callback();
    }

    private _handleKeyboardEvent(event) {
        if (event.which === keyCode.Escape) {
            this._closeRef.current.click();
            return false;
        }
    }

    private _enterFullScreen() {
        const pos = this._center(true);
        this.rnd.updateSize(pos);
        this.rnd.updatePosition(pos);
    }

    private _exitFullScreen() {
        const pos = this._center(false);
        this.rnd.updateSize(pos);
        this.rnd.updatePosition(pos);
    }
}