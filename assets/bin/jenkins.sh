#!/bin/bash

# Common set up
export XLRDIR=$PWD
XLRINFRADIR="${XLRINFRADIR:-${XLRDIR}/xcalar-infra}"

. doc/env/xc_aliases
xcEnvEnter "$HOME/.local/lib/$JOB_NAME"

setup_proxy

# First look in local (Xcalar) repo for a script and fall back to the one in xcalar-infra
for SCRIPT in "${XLRDIR}/bin/jenkins/${JOB_NAME}.sh" "${XLRINFRADIR}/jenkins/${JOB_NAME}.sh"; do
    if test -x "$SCRIPT"; then
        break
    fi
done

if ! test -x "${SCRIPT}"; then
    echo >&2 "No jenkins script for for $JOB_NAME"
    exit 1
fi

"$SCRIPT" "$@"
