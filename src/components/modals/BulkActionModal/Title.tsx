import * as React from "react";

type Props = {
  name: string;
  className: string;
  children: string;
  onSort: Function;
};

const Title = (props: Props) => {
    const {name, className, onSort, children} = props;
    const classNames = ["title", className];
    return (
      <div className={classNames.join(" ")}>
        <span
          className="label"
          onClick={() => onSort(name)}
        >
          {children}
        </span>
        <i
          className="icon xi-sort fa-15 xc-action"
          onClick={() => onSort(name)}
        ></i>
      </div>
    )
};

export default Title;