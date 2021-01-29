import * as React from "react";

type CheckboxProps = {
    checked: boolean;
    onClick?;
};
export default function Checkbox(props: CheckboxProps) {
    const {checked, onClick} = props;
    const classNames = ["checkbox"];
    if (checked) {
        classNames.push("checked");
    }
    return (
        <div className="checkboxSection">
            <div
                className={classNames.join(" ")}
                onClick={onClick}
            >
            {
                checked
                ? <i className="icon xi-ckbox-selected"></i>
                : <i className="icon xi-ckbox-empty"></i>
            }
            </div>
        </div>
    )
}