import React from 'react'

function Container({ children }) {
    return <div className="advOption">{children}</div>
}

function Title({ children }) {
    return <div className="header advOption-header">{children}</div>
}

function OptionGroup({ children, classNames = [] }) {
    const cssClass = ['advOption-group'].concat(classNames);
    return <div className={cssClass.join(' ')}>{children}</div>
}

function Option({ children, classNames = [] }) {
    classNames = ["advOption-option", ...classNames]
    return <div className={classNames.join(" ")}>{children}</div>
}

function OptionLabel({ onClick, children }) {
    if (onClick != null) {
        return <label className="advOption-option-label" onClick={onClick}>{children}</label>
    } else {
        return <label className="advOption-option-label">{children}</label>
    }
}

function OptionValue({ children, classNames = [] }) {
    const cssClass = ['advOption-option-value'].concat(classNames);
    return <div className={cssClass.join(' ')}>{children}</div>
}

export {
    Container,
    Title,
    OptionGroup,
    Option,
    OptionLabel,
    OptionValue
}