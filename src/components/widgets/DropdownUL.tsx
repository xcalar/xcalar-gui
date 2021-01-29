import * as React from "react";
import keyCode from "../../enums/keyCode";

type DropdownULProps = {
    list: {value: any, text: string, key?: string, icon?: string, className?: string, unavailable?: boolean}[],
    hint?: string,
    onItemClick: Function,
    onEscape: Function,
    rightMargin?: number,
    usingHintList?: boolean,
    noMatchNoHint?: boolean
};

interface DropdownULState {
    selectedIndex: number,
    disableMouseEnter: boolean,
    left: number,
    top: number,
    width: number,
    maxHeight: number | "auto",
    hasScrollers: boolean,
    bottomScrollStopped: boolean,
    topScrollStopped: boolean
}

export default class DropdownUL extends React.Component<DropdownULProps, DropdownULState> {
    private listRef;
    private ulRef;
    private liRefs;
    private innerHeight;
    private outerHeight;
    private timer;

    constructor(props) {
        super(props);
        this.state = {
            selectedIndex: -1,
            disableMouseEnter: false,
            left: 0,
            top: 0,
            width: 0,
            maxHeight: "auto",
            hasScrollers: false,
            bottomScrollStopped: false,
            topScrollStopped: true
        };
        this.listItemHighlight = this.listItemHighlight.bind(this);
        this.liRefs = this.props.list.map(() => {
            return React.createRef();
        });
        this.listRef = React.createRef();
        this.ulRef = React.createRef();
        this.timer = {
            "scroll": null,
            "mouseScroll": null
        };
    }
    componentDidMount() {
        document.addEventListener("keydown", this.listItemHighlight);
        let rect = this.listRef.current.parentElement.getBoundingClientRect();
        let top = rect.top + rect.height;
        let ul = this.ulRef.current;
        let maxHeight: number | "auto" = window.innerHeight - 10 - top;

        let hasScrollers = false;
        if (ul.getBoundingClientRect().height > maxHeight) {
            hasScrollers = true;
            this.outerHeight = Math.min(this.listRef.current.getBoundingClientRect().height, maxHeight);
        } else {
            maxHeight = "auto";
        }
        this.innerHeight = this.ulRef.current.scrollHeight;
        this.setState({
            left: rect.left,
            top: top,
            width: rect.width,
            maxHeight: maxHeight,
            hasScrollers: hasScrollers
        });
    }

    componentWillUnmount() {
        document.removeEventListener("keydown", this.listItemHighlight);
        clearTimeout(this.timer.mouseScroll);
        clearTimeout(this.timer.scroll);
    }

    listItemHighlight(event) {
        const keyCodeNum = event.which;
        let direction;
        let horizontal = false;
        let vertical = false;
        let enter;

        switch (keyCodeNum) {
            case (keyCode.Up):
                direction = -1;
                vertical = true;
                break;
            case (keyCode.Down):
                direction = 1;
                vertical = true;
                break;
            case (keyCode.Left):
                if ($('input:focus, textarea:focus').length) {
                    return;
                }
                horizontal = true;
                break;
            case (keyCode.Right):
                if ($('input:focus, textarea:focus').length) {
                    return;
                }
                horizontal = true;
                break;
            case (keyCode.Enter):
                if ($('input:focus, textarea:focus').length) {
                    return;
                }
                enter = true;
                break;
            case (keyCode.Escape):
              // TODO: check for inputs inside of lis
                // if ($(event.target).is('input')) {
                //     return;
                // }
                event.preventDefault();
                this.props.onEscape();
                return;
            case (keyCode.Backspace):
                // TODO: check for inputs inside of lis
                // if ($(event.target).is('input')) {
                //     return;
                // }
                if ($('input:focus, textarea:focus').length) {
                    return;
                }
                if (!this.props.usingHintList) {
                    event.preventDefault();
                    this.props.onEscape();
                }
                return;
            default:
                return; // key not supported
        }
        event.preventDefault();

        if (!this.props.list.length) {
            return;
        }

        if (enter) {
            let item = this.props.list[this.state.selectedIndex];
            if (item) {
                this.props.onItemClick(item.value);
            }
        }

        if (horizontal) {
            //TODO:
        } else if (vertical) {
            // skips over unavailable list items
            let list = this.props.list.filter((item) => {
                return !item.unavailable;
            });
            let numLis = list.length;
            let curItem = this.props.list[this.state.selectedIndex];
            let curIndex = list.indexOf(curItem);
            let newIndex = (curIndex + direction + numLis) % numLis;
            newIndex = this.props.list.indexOf(list[newIndex]);
            this.setState({
                selectedIndex: newIndex,
                disableMouseEnter: true
            });
            const element = this.liRefs[newIndex].current;
            // TODO: remove dependency on jquery
            $(element)["scrollintoview"]({duration: 0});
            setTimeout(() => {
                // settimeout so mousenter isn't triggered on scroll
                this.setState({disableMouseEnter: false});
            }, 0);
        }
    }

    onItemMouseEnter(index) {
        if (this.state.disableMouseEnter) {
            return;
        }
        this.setState({
            selectedIndex: index
        });
    }

    scrollList(scrollUp?: boolean) {
        const scrollTop = this.ulRef.current.scrollTop;

        if (scrollUp) {
            if (scrollTop === 0) {
                this.setState({
                    topScrollStopped: true
                });
            } else {
                this.timer.scroll = window.setTimeout(() => {
                    this.ulRef.current.scrollTop -= 7;
                    this.scrollList(true);
                }, 30);
            }

        } else {
            if (this.state.maxHeight + scrollTop >= this.innerHeight) {
                this.setState({
                    bottomScrollStopped: true
                });
            } else {
                this.timer.scroll = window.setTimeout(() => {
                    this.ulRef.current.scrollTop += 7;
                    this.scrollList();
                }, 30);
            }
        }
    }

    scrollAreaLeave() {
        clearTimeout(this.timer.scroll);
    }

    onULScroll() {
        clearTimeout(this.timer.mouseScroll);
        this.timer.mouseScroll = setTimeout(() => {
            this.mouseScroll();
        }, 300)
    }

    mouseScroll() {
        const scrollTop = this.ulRef.current.scrollTop;
        if (scrollTop === 0) {
            this.setState({
                topScrollStopped: true,
                bottomScrollStopped: false
            });
        } else if (this.outerHeight + scrollTop >= (this.innerHeight - 1)) {
            this.setState({
                topScrollStopped: false,
                bottomScrollStopped: true
            });
        } else {
            this.setState({
                topScrollStopped: false,
                bottomScrollStopped: false
            });
        }
    }

    render() {
        const {list, onItemClick, hint, rightMargin} = this.props;
        let listHTML;
        if (list.length) {
            listHTML = list.map((item, i) => {
                let className = "";
                if (this.state.selectedIndex === i) {
                    className += " selected";
                }
                if (item.className) {
                    className += (" " + item.className);
                }
                return (
                    <li
                        key={item.key || item.value}
                        ref={this.liRefs[i]}
                        className={className}
                        onClick={() => onItemClick(item.value)}
                        onMouseEnter={() => {this.onItemMouseEnter(i)}}
                    >
                        {item.icon ? <i className={"icon " + item.icon}></i> : null}
                        <span>{item.text}</span>
                    </li>
                )
            });
        } else if (this.props.noMatchNoHint) {
            this.props.onEscape();
        } else {
            if (this.props.usingHintList) {
                listHTML = <li
                                className="hint"
                            >No Results Found</li>
            } else {
                listHTML = <li
                            className="hint"
                        >{hint}</li>
            }
        }

        return (
            <div className="list" ref={this.listRef} style={{
                    position:"fixed",
                    left: this.state.left,
                    top: this.state.top,
                    width: this.state.width - (rightMargin || 35),
                    maxHeight: this.state.maxHeight || "none"
                }}
                onMouseLeave={() => { this.setState({selectedIndex: -1})}}
            >
                <ul ref={this.ulRef}
                    style={{maxHeight: this.state.maxHeight || "none"}}
                    onScroll={() => this.onULScroll()}
                >
                    {listHTML}
                </ul>
                {this.state.hasScrollers &&
                <React.Fragment>
                {!this.state.topScrollStopped &&
                <div className="scrollArea top active" style={{display: "block"}}
                    onMouseEnter={() => {this.scrollList(true)}}
                    onMouseLeave={() => {this.scrollAreaLeave()}}
                >
                    <i className="arrow icon xi-arrow-up"></i>
                </div>
                }
                {!this.state.bottomScrollStopped &&
                <div className="scrollArea bottom active" style={{display: "block"}}
                    onMouseEnter={() => {this.scrollList()}}
                    onMouseLeave={() => {this.scrollAreaLeave()}}
                    >
                    <i className="arrow icon xi-arrow-down"></i>
                </div> }
                </React.Fragment>
                }
            </div>
        )
    }

}

DropdownUL["defaultProps"] = {
    list: [],
    hint: "Empty",
    onItemClick: () => null,
    onEscape: () => null,
};