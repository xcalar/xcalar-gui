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
[ -n "$XLRDIR" ] && [ -n "$XLRGUIDIR" ] || die "Usage: $0 <xce_repo> <xd_repo>"

BUILD_DIR=${BUILD_DIR:-"${XLRDIR}/buildOut"}

CLIENT_DEST="assets/js/xcrpc"
CLIENT_SRC="${BUILD_DIR}/src/bin/jsClient/jsPackage"
ENUM_DEST="${CLIENT_DEST}/enumMap"
ENUM_SRC="${BUILD_DIR}/src/lib/libenum/JSONENUMLIB"

# Cleanup xd files
debug "[Clean up] ${XLRGUIDIR}/${CLIENT_DEST}/*"
rm -rf ${XLRGUIDIR}/${CLIENT_DEST}/* || die "Cleanup failed"

# Copy over protobuf generated files
debug "[Copy proto] ${CLIENT_SRC} to ${CLIENT_DEST}"
cp -r ${CLIENT_SRC}/* ${XLRGUIDIR}/${CLIENT_DEST}/ || die "Copy proto files failed"

# Copy over enum map files
debug "[Make directory] ${ENUM_DEST}"
mkdir ${XLRGUIDIR}/${ENUM_DEST} || die "Create enum map folder failed"
debug "[Copy enum] ${ENUM_SRC} to ${ENUM_DEST}"
cp -r ${ENUM_SRC}/* ${XLRGUIDIR}/${ENUM_DEST}/ || die "Copy enum maps failed"

# Generate command to copy over files remotely
SSH_OPTS="-oUserKnownHostsFile=/dev/null -oStrictHostKeyChecking=no"
cat << EOF
rm -rf ${CLIENT_DEST}/*
scp ${SSH_OPTS} -r ${USER}@${HOSTNAME}:${CLIENT_SRC}/* ${CLIENT_DEST}/
mkdir ${ENUM_DEST}
scp ${SSH_OPTS} -r ${USER}@${HOSTNAME}:${ENUM_SRC}/* ${ENUM_DEST}/
EOF