import * as React from "react";
import dict from "../../lang";
const CommonTStr = dict.CommonTStr;

type LoadingTextProps = {
    className?: string,
    children?: any
}

export default function LoadingText(props: LoadingTextProps) {
    return (
        <div className={props.className}>
            <div className="animatedEllipsisWrapper">
                <div className="text">{props.children || CommonTStr.PleaseWait}</div>
                <div className="wrap">
                    <div className="animatedEllipsis hiddenEllipsis">....</div>
                    <div className="animatedEllipsis staticEllipsis">....</div>
                </div>
            </div>
        </div>
    )
}