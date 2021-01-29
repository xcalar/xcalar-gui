import * as React from "react";
import dict from "../../lang";

const CommonTStr = dict.CommonTStr;
type WaitboxProps = {
    children: string;
};
export default function(props: WaitboxProps) {
    return (
        <div className="animatedEllipsisWrapper">
            <div className="text">
                {props.children || CommonTStr.PleaseWait}
            </div>
            <div className="wrap">
                <div className="animatedEllipsis hiddenEllipsis">....</div>
                <div className="animatedEllipsis staticEllipsis">....</div>
            </div>
        </div>
    )
}