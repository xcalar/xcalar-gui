#!/bin/bash
set -e

die() {
    [ $# -gt 0 ] && echo "[ERROR] $*" >&2
    exit 1
}

debug() {
    echo "[DEBUG] $*" >&2
}

[ -n "$XLRDIR" ] || die "XLRDIR must be set"
[ -n "$XLRGUIDIR" ] || die "XLRGUIDIR must be set"

BUILD_DIR=${BUILD_DIR:-"${XLRDIR}/buildOut"}

THRIFT_DEST="ts/thrift"
fileList=(
    "${BUILD_DIR}/src/bin/legacyJsClient/jsPackage/*.js"
    "${XLRDIR}/src/bin/tests/MgmtTest.js"
    "${XLRDIR}/src/3rd/thrift/thrift.js"
)

# Clean the xd files
debug "[Clean up] ${XLRGUIDIR}/${THRIFT_DEST}/*"
rm ${XLRGUIDIR}/${THRIFT_DEST}/* || die "Cleanup failed"

# Copy over auto-generated files
for jsFile in "${fileList[@]}"; do
    debug "[Copy file] ${jsFile}"
    cp ${jsFile} ${XLRGUIDIR}/${THRIFT_DEST}/ || die "Copy ${jsFile} failed"
done

# Generate command to copy over files remotely
SSH_OPTS="-oUserKnownHostsFile=/dev/null -oStrictHostKeyChecking=no"
remoteCommand=("rm ${THRIFT_DEST}/*")
for jsFile in "${fileList[@]}"; do
    remoteCommand+=("scp ${SSH_OPTS} ${USER}@${HOSTNAME}:${jsFile} ${THRIFT_DEST}/")
done
printf '%s\n' "${remoteCommand[@]}"