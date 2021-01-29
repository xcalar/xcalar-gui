
import * as React from 'react';

type LoadStepProps = {
    num: number,
    isSelected: boolean,
    desc: string,
    isSelectable: boolean,
    onSelect: Function
};

function LoadStep(props: LoadStepProps) {
    let classNames = "step";
    if (props.isSelected) {
        classNames += " selected";
    }
    if (!props.isSelectable) {
        classNames += " xc-disabled";
    }
    return (
        <div className={classNames} onClick={() => {
            if (props.isSelectable) props.onSelect();
        }}>
            <div className="stepNum">STEP {props.num}</div>
            <div className="stepDesc">{props.desc}</div>
        </div>
    )
}

export default React.memo(LoadStep);