**API Tools**
consists of several shell scripts which help deal with Thrift and Xcrpc API files

## checkApiVersion.sh
Compare the API version of XD with that of XCE.
```bash
./checkApiVersion.sh <xce-repo> <xd-repo>
```
NOTES:
* This script is capable of generating and checking version signature before building XCE.
* The command line parameter is optional when running in XCE build enviroment

## syncXcrpc.sh
Copy over Xcrpc auto-generated Javascript files from XCE buildOut folder to XD repo.
```bash
./syncXcrpc.sh
```
NOTES:
* It is supposed to be running on machines with XCE build environment, eg. dev VMs
* It doesn't trigger the XCE build script, so XCE build must have run before hand.
* It generates remote copy commands after execution, so that to help copy over files to local XD repo.

## syncThrift.sh
Copy over Thrift auto-generated Javascript files from XCE buildOut folder to XD repo.
```bash
./syncThrift.sh
```
NOTES:
* It is supposed to be running on machines with XCE build environment, eg. dev VMs
* It doesn't trigger the XCE build script, so XCE build must have run before hand.
* It generates remote copy commands after execution, so that to help copy over files to local XD repo.

## versionFunc.sh
Common functions for generating and checking version signature. Not for executing standalone.