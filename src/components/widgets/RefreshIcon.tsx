import * as React from "react";
import paths from "../../enums/paths";

export default function RefreshIcon(props) {
    const [style, setStyle] = React.useState({
        display:"none",height:0, width:0
    });
    const [src, setSrc] = React.useState("");

    React.useEffect(() => {
        const hTimeout = setTimeout(() => {
            setSrc(paths.waitIcon);
            setStyle({
                display: "block",
                height: 37,
                width: 35
            });
        }, 0);
        return () => { clearTimeout(hTimeout); };
    });

    const {classNames = [], lock} = props;
    let classes = ["refreshIcon"];
    if (lock) {
        classes.push("locked");
    }
    classes = classes.concat(classNames);

    return <div className={classes.join(" ")}>
                <img src={src} style={style} />
            </div>

}