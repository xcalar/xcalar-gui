#!/bin/bash

set -e

JSFILES="$(find assets/js -not -path "../../3rd" -name "*.js" | tr '\n' ' ')"
OS=`uname`
if [ "${OS}" = "Darwin" ]; then
    export PATH="$PWD/3rd/bower_components/uglify-js/bin:$PATH"
fi

TMPDIR="${TMPDIR:-/tmp/`id -un`}/xcalar-gui"
mkdir -p "$TMPDIR"
makefile="$TMPDIR/uglify-$$.mk"
cat > "$makefile"  <<EOF
JSFILES=$JSFILES
OUTFILES=\$(patsubst %.js,%.min.js,\$(JSFILES))
all: \$(OUTFILES)

%.min.js: %.js
	@echo $<
	@uglifyjs \$< > \$@
	@mv \$@ \$<
EOF

set +e
make -j`nproc` -f "$makefile"
rc=$?
if [ $rc -ne 0 ]; then
    echo >&2 "ERROR($rc): Failed to minify sources. See $makefile"
    exit $rc
fi
rm -f "$makefile"
exit 0
