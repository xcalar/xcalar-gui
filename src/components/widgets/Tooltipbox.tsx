import * as React from "react";

type TooltipboxProps = {
    className: string;
    container: string;
    title: string;
    children: any;
    placement?: string;
};
export default class Tooltipbox extends React.Component<TooltipboxProps> {
    _element: any;

    constructor(props) {
        super(props);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
    }

    handleMouseEnter() {
        // XXX TODO: remove the window hack
        let xcTooltip = window["xcTooltip"];
        xcTooltip.auto(this._element);
    }

    render() {
        let classNames = ["tooltipOverflow"];
        if (this.props.className) {
            classNames.push(this.props.className);
        }
        return (
            <div className={classNames.join(" ")}
            data-toggle="tooltip"
            data-container={this.props.container}
            data-placement={this.props.placement || "top"}
            data-title={this.props.title}
            onMouseEnter={this.handleMouseEnter}
            ref={el => (this._element = el)}>
                {this.props.children}
            </div>
        )
    }
}