import * as React from "react";

type ButtonProps = {
    children: string | React.ReactChildren;
    className: string;
    onClick;
};
let Button = React.forwardRef((props: ButtonProps, ref: any) => {
    const { children, className, onClick } = props;
    const classNames: string[] = ["btn"];
    classNames.push(className);

    return (
        <button
            type="button"
            className={classNames.join(" ")}
            onClick={onClick}
            ref={ref}
        >
            { children }
        </button>
    )
});
export default Button;