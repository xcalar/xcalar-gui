#!/bin/bash

if command -v md5sum >/dev/null 2>&1; then
    md5File() {
        md5sum "$1" | cut -d' ' -f 1
    }
    md5Str() {
        echo -n "$1" | md5sum | cut -d' ' -f 1
    }
else
    md5File() {
        md5 "$1" | awk -F' ' '{print $NF}'
    }
    md5Str() {
        echo -n "$1" | md5 | awk -F' ' '{print $NF}'
    }
fi

checkApiVersionSig() {
    local VERSION_SIG="$1"
    local VERSION_FILE="$2"

    local ret=1
    if [ -f "$VERSION_FILE" ] && [ -n "$VERSION_SIG" ]; then
        if grep -q "$VERSION_SIG" $VERSION_FILE; then
            ret=0
        fi
    fi
    return $ret
}
generateXcrpcVersionSigPy() {
    local VERSION_GEN_PY="$1"
    local PROTO_DIR="$2"
    echo -n $($VERSION_GEN_PY -d "$PROTO_DIR" | grep ProtoAPIVersionSignature | cut -f2 -d'"')
}
generateXcrpcVersionSig() {
    local PROTO_DIR="$1"
    local DEBUG="false"
    [ $# -gt 1 ] && { DEBUG="$2"; }

    [ -d "$PROTO_DIR" ] || { echo -n ""; return 1; }

    local checkFiles=$(find $PROTO_DIR -name "*.proto" | LC_ALL=C sort)
    local totalValue=""
    local newline=$'\n'
    local protoFile
    local checkSum
    for protoFile in $checkFiles; do
        checkSum=$(md5File "$protoFile")
        totalValue="$totalValue$checkSum${newline}"
        if [ $DEBUG == "true" ]; then
            echo "$protoFile:$checkSum"
        fi
    done
    if [ $DEBUG != "true" ]; then
        echo -n $(md5Str "$totalValue")
    fi
}
generateThriftVersionSig() {
    local files=""
    for defFile in "$@"; do
        if [ -f "$defFile" ]; then
            files="${files} ${defFile}"
        fi
    done

    local newline=$'\n'
    local content="$(cat ${files})${newline}"
    echo -n $(md5Str "$content")
}