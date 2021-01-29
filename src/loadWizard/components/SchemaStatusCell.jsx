import React from "react";

export default function SourceData({status, fileId}) {

    return (
        <div>{status[fileId]}</div>
    );
}