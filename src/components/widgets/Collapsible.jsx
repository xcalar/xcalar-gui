import * as React from "react";

function Header(props) {
    const {
        children,
        onHeaderClick = () => {}
    } = props;
    return (
        <div className="listInfo" onClick={onHeaderClick}>
            <span className="text">{children}</span>
            <span className="expand right">
                <i className="icon xi-down"></i>
            </span>
        </div>
    );
}

function List({children}) {
    return (
        <ul>{children}</ul>
    )
}

function Item({children}) {
    return (
        <li>{children}</li>
    )
}

function Collapsible(props) {
    const [expanded, setExpanded] = React.useState(true);
    let classes = "xc-expand-list listWrap";
    if (props.className) {
        classes += (" " + props.className);
    }
    if (expanded) {
        classes += " active";
    }

    return (
        <div className={classes}>
        {
            props.children.map((child, i) => {
                return React.cloneElement(child, {
                    onHeaderClick: () => {
                        setExpanded(!expanded);
                    },
                    key: i
                });
            })
        }
        </div>
    );
}

Collapsible.Header = Header;
Collapsible.List = List;
Collapsible.Item = Item;

export default Collapsible;