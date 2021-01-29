import * as React from "react";
type props = {
    onNext: Function,
    onPrev: Function,
    page?: number,
    numPages?: number
}
export default function Pagination(props) {
    const { onNext, onPrev, page, numPages } = props;
    return (<div className="paginationRow">
        <ul style={{listStyle: 'none', userSelect: 'none'}}>
            <NavButton onClick={onPrev}>{'< Previous'}</NavButton>
            <NavButton onClick={onNext}>{'Next >'}</NavButton>
        </ul>
        {(page) ?
            <div className="pageInfo">
                Page {page} {numPages ? "of " + numPages: null }
            </div>
            : null
        }
    </div>);

    function NavButton({ onClick, children }) {
        const style = {
            padding: '4px',
            display: 'inline',
            cursor: 'pointer',
        };
        if (onClick == null) {
            style["opacity"] = '0.3';
            style["pointerEvents"] = 'none';
        }
        return (<li style={style} onClick={() => {onClick()}}>{children}</li>);
    }
}
