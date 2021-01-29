import * as React from "react";
import DropdownUL from "./DropdownUL";
type InputDropdownProps = {
    onSelect: Function,
    onInputChange?: Function,
    onOpen?: Function,
    val: string,
    list: {value: string, text: string, icon?: string, className?: string}[],
    hint?: string,
    readOnly?: boolean,
    disabled?: boolean,
    classNames?: string[],
    hintDropdown?: boolean,
    noListSort?: boolean,
    noMatchNoHint?: boolean, // option to not show dropdown if no matches found when typing
};

type InputDropdownState = {
    open: boolean,
    filteredList: {value: string, text: string, icon?: string, className?: string}[],
    usingHintList: boolean
};

export default class InputDropdown extends React.Component<InputDropdownProps, InputDropdownState> {
    private dropdownRef: React.RefObject<any>;

    constructor(props) {
        super(props);
        this.state = {
            open: false,
            filteredList: this.props.list,
            usingHintList: false
        };
        this.dropdownRef = React.createRef();
        this.onOuterListClick = this.onOuterListClick.bind(this);
        this.handleClickOutside = this.handleClickOutside.bind(this);
        this.onItemClick = this.onItemClick.bind(this);
        this.closeDropdown = this.closeDropdown.bind(this);
    }

    componentWillUnmount() {
        this.closeDropdown();
    }

    openDropdown() {
        this.setState({
            open: true
        });
        document.addEventListener('mousedown', this.handleClickOutside);
        window.addEventListener("resize", this.closeDropdown);
        window.addEventListener("blur", this.closeDropdown);
        if (typeof this.props.onOpen === "function") {
            this.props.onOpen();
        }
    }

    closeDropdown() {
        this.setState({
            open: false
        });
        document.removeEventListener('mousedown', this.handleClickOutside);
        window.removeEventListener("resize", this.closeDropdown);
        window.removeEventListener("blur", this.closeDropdown);
    }

    onInputChange(value) {
        this.closeDropdown();
        if (this.props.hintDropdown) {
            let filteredList;
            let usingHintList = false;
            if (value.length) {
                filteredList = this.props.list.filter((li) => {
                    return li.text.toLowerCase().includes(value.toLowerCase());
                });
                usingHintList = true;
            } else {
                filteredList = this.props.list;
            }

            this.setState({
                filteredList: filteredList,
                usingHintList: usingHintList
            });
            this.openDropdown();
        }
        if (this.props.onInputChange) {
            this.props.onInputChange(value);
        }
    }

    onItemClick(value) {
        this.closeDropdown();
        if (this.props.onSelect) {
            this.props.onSelect(value);
        }
    }

    onOuterListClick() {
        if (this.state.open) {
            this.closeDropdown();
        } else {
            this.setState({
                filteredList: this.props.list,
                usingHintList: false
            });
            this.openDropdown();
        }
    }

    handleClickOutside(e) {
        if (this.dropdownRef && !this.dropdownRef.current.contains(e.target)) {
            this.closeDropdown();
        }
    }

    render() {
        let readOnly = (this.props.readOnly === true) ? true : false;
        let disabled = (this.props.disabled === true) ? true : false;

        const { classNames = [] } = this.props || {};
        const cssClass = ['dropDownList', 'selectList'].concat(classNames);
        let list = this.props.list;
        if (this.state.usingHintList) {
            list = this.state.filteredList;
        }

        if (disabled) {
            return (
                <div className={cssClass.join(' ')}>
                    <input
                        className="text"
                        type="text"
                        spellCheck={false}
                        value={this.props.val}
                        readOnly={true}
                    />
                    <div className="iconWrapper">
                        <i className="icon xi-arrow-down"></i>
                    </div>
                </div>
            );
        } else {
            let inputClass = "text";
            if (!readOnly) {
                inputClass += " inputable";
            }
            if (!this.props.noListSort) {
                list.sort((a,b) => {
                    let aText = a.text.toLowerCase();
                    let bText = b.text.toLowerCase();
                    return (aText < bText ? -1 : (aText > bText ? 1 : 0));
                });
            }
            return (
                <div className={cssClass.join(' ')} ref={this.dropdownRef} onClick={this.onOuterListClick}>
                    <input
                        className={inputClass}
                        type="text"
                        spellCheck={false}
                        value={this.props.val}
                        onChange={e => {
                            let val = e.target.value;
                            this.onInputChange(val);
                        }}
                        readOnly={readOnly}
                    />
                    <div className="iconWrapper">
                        <i className="icon xi-arrow-down"></i>
                    </div>
                    {this.state.open &&
                        <DropdownUL
                            list={list}
                            hint={this.props.hint}
                            onItemClick={this.onItemClick}
                            onEscape={this.closeDropdown}
                            usingHintList={this.state.usingHintList}
                            noMatchNoHint={this.props.noMatchNoHint}
                        />
                    }
                </div>
            )
        }
    }
}