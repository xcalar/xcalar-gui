#!/bin/bash
set -e

# Check if envvar PRODUCTNAME is set. If it is, use that. Else use xcalar-gui
cd $XLRGUIDIR/xcalar-gui/assets/js/thrift/
cp $XLRDIR/bin/jsPackage/*.js .

cd $XLRGUIDIR
ln -s xcalar-gui prod
