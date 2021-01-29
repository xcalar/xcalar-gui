import * as React from "react"; 

type QMarkProps =  {
    text?: string,
    container?: string,
    tipPlacement?: string,
    helpTextID?: string,
    classNames?: string[]
};

export default function QMark(props: QMarkProps) {
    let {text, container, tipPlacement, helpTextID, classNames = []} = props;
    const baseClassNames = "qMark icon xi-unknown xc-action".split(" ");

    // populate tooltip with helpText info if it exists
    if (helpTextID && window["helpText"][helpTextID]) {
        const helpTextObj =  window["helpText"][helpTextID];
        text = helpTextObj.text || text || "";
        if (text && helpTextObj.link) {
            baseClassNames.push("hasTipLink");
            text +=  "\n" + `<a href=${helpTextObj.link} target="helpText">${helpTextObj.linkText || "View More..."}</a>`
        }
    }

    const allClassNames = [...baseClassNames, ...classNames];
    return  (
        <i
            className={allClassNames.join(" ")}
            style={{ position: "relative", top: "-2px", left: "4px" }}
            data-toggle="tooltip"
            data-container={container || "body"}
            data-title={text || ""}
            data-placement={tipPlacement || "auto top"}
        >
        </i>
    )
}