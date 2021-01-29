import * as React from 'react';
import { Rnd } from "react-rnd";

const Dialog = React.forwardRef((props: any, ref: any) => {
    const {
        children,
        id,
        resizable,
        style
    } = props;
    let modalId = id ||"";

    React.useEffect(() => {
        $("#container").addClass("loadModalOpen");
        return () => {
            $("#container").removeClass("loadModalOpen");
        }
    });

    return (
        <div id={modalId} className='modal' onClick={(e) => { e.stopPropagation(); }}>
            { resizable ?
            <Rnd
                className="modal-content"
                default = {{..._center(false, props)}}
                bounds="window"
                dragHandleClassName="modal-header"
                ref={ref}
            >
                {children}
            </Rnd>:
            <section className="modal-content" ref={ref}>
                {children}
            </section>
            }

        </div>
    );
});

function Body({
    style = {},
    classNames = [],
    children
}) {
    const className = ['modal-body'].concat(classNames).join(' ');
    return <section style={style} className={className}>{children}</section>
}


function Header({
    onClose,
    children
}) {
    return (
        <header className='modal-header'>
            <span className="text">{children}</span>
            <div className="close" onClick={()=>{ onClose(); }}>
                <i className="icon xi-close" />
            </div>
        </header>
    );
}

function Footer({
    children
}) {
    return <section className="modal-footer">{children}</section>
}


function _center(isFullScreen: boolean, props): {x: number, y: number, width: number, height: number} {
    const style = props.style || {
        width: "400px",
        height: "500px",
        minWidth: "300px",
        minHeight: "400px"
    }
    let {width, height} = style;
    let width_num: number = parseFloat(width);
    let height_num: number = parseFloat(height);
    let left: number;
    let top: number;

    if (isFullScreen) {
        width_num = window.innerWidth - 14;
        height_num = window.innerHeight - 9;
        top = 0;
        left = Math.round((window.innerWidth - width_num) / 2);
        return {x: left, y: top, width: width_num, height: height_num};
    } else if (isNaN(width_num) || isNaN(height_num)) {
        return {x: left, y: top, width, height};
    } else {
        left = (window.innerWidth - width_num) / 2;
        let options = props.options || {};
        if (options.verticalQuartile) {
            top = (window.innerHeight - height_num) / 4;
        } else {
            top = (window.innerHeight - height_num) / 2;
        }
        return {x: left, y: top, width: width_num, height: height_num};
    }
}


export { Dialog, Header, Body, Footer};