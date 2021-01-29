#!/bin/bash

set -e

die() {
    [ $# -gt 0 ] && echo "[ERROR] $*" >&2
    exit 1
}

debug() {
    echo "[DEBUG] $*" >&2
}

XLRDIR=${1:-"$XLRDIR"}
XLRGUIDIR=${2:-"$XLRGUIDIR"}
PKG_LANG="en"
[ -n "$XLRDIR" ] && [ -n "$XLRGUIDIR" ] || die "Usage: $0 <xce_repo> <xd_repo>"

scriptPath=$(cd $(dirname ${BASH_SOURCE[0]}) && pwd)
. $scriptPath/versionFunc.sh

# xcrpcSigGen="$XLRDIR/bin/genProtoVersionSig.py"
xcrpcDefDir="$XLRDIR/src/include/pb/xcalar/compute/localtypes/"
xcrpcVersionFile="$XLRGUIDIR/assets/js/xcrpc/enumMap/XcRpcApiVersion/XcRpcApiVersionToStr.json"
thriftDefFileList=(
    "$XLRDIR/src/include/libapis/LibApisCommon.h"
    "$XLRDIR/src/include/libapis/LibApisCommon.thrift"
    "$XLRDIR/src/include/UdfTypeEnums.enum"
    "$XLRDIR/src/include/SourceTypeEnum.enum"
    "$XLRDIR/src/include/OrderingEnums.enum"
    "$XLRDIR/src/include/DataFormatEnums.enum"
    "$XLRDIR/src/include/JsonGenEnums.enum"
    "$XLRDIR/src/include/JoinOpEnums.enum"
    "$XLRDIR/src/include/UnionOpEnums.enum"
    "$XLRDIR/src/include/XcalarEvalEnums.enum"
    "$XLRDIR/src/include/DagStateEnums.enum"
    "$XLRDIR/src/include/DagRefTypeEnums.enum"
    "$XLRDIR/src/include/QueryParserEnums.enum"
    "$XLRDIR/src/include/libapis/LibApisEnums.enum"
    "$XLRDIR/src/include/libapis/LibApisConstants.enum"
    "$XLRDIR/src/include/QueryStateEnums.enum"
    "$XLRDIR/src/include/DataTargetEnums.enum"
    "$XLRDIR/src/include/CsvLoadArgsEnums.enum"
    "$XLRDIR/src/include/license/LicenseTypes.enum"
    "$XLRDIR/src/data/lang/${PKG_LANG}/Subsys.enum"
    "$XLRDIR/src/data/lang/${PKG_LANG}/StatusCode.enum"
    "$XLRDIR/src/data/lang/${PKG_LANG}/FunctionCategory.enum"
    "$XLRDIR/src/include/runtime/RuntimeEnums.enum"
    "$XLRDIR/src/include/LogLevel.enum"
    "$XLRDIR/src/include/querymanager/DataflowEnums.enum"
)
thriftVersionFile="$XLRGUIDIR/ts/thrift/XcalarApiVersionSignature_types.js"

versionSigThrift=$(generateThriftVersionSig "${thriftDefFileList[@]}")
versionSigXcrpc=$(generateXcrpcVersionSig $xcrpcDefDir)

versionMatch=0
if checkApiVersionSig "$versionSigThrift" "$thriftVersionFile"; then
    debug "Thrift: Match"
else
    versionMatch=1
    debug "Thrift(backendSig=$versionSigThrift): Mismatch"
fi
if checkApiVersionSig "$versionSigXcrpc" "$xcrpcVersionFile"; then
    debug "Xcrpc: Match"
else
    versionMatch=1
    debug "Xcrpc(backendSig=$versionSigXcrpc): Mismatch"
fi

exit $versionMatch