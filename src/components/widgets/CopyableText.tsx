import * as React from "react";

function CopyableText(props) {
    const [copying, setCopying] = React.useState(false);
    let classes = "copyableText";
    if (copying) {
        classes += " copying";
    }
    if (props.className) {
        classes += (" " + props.className);
    }
    const copy = () => {
        setCopying(true);
        xcUIHelper.copyToClipboard(props.value);
        setTimeout(() => {
            setCopying(false);
        }, 1800);
    };
    let textClass = "text";
    if (props.rtl) {
        textClass += " rtl";
    }
    return (
        <div className={classes} onClick={copy}>
            {props.rtl ?
                <div className="text rtl">&lrm;{props.value}&lrm;</div>
                : <div className="text">{props.value}</div>
            }
            <i className="icon xi-copy-clipboard"></i>
            <i className="icon xi-tick"></i>
        </div>
    )
}

export default CopyableText;