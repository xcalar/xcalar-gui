// **********************************************************************
// *** DO NOT EDIT!  This file was autogenerated by xcrpc             ***
// **********************************************************************
// Copyright 2018 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//

var client = require("./Client");
var service = require('./xcalar/compute/localtypes/Service_pb');

var version = require("./xcalar/compute/localtypes/Version_pb");
var proto_empty = require("google-protobuf/google/protobuf/empty_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function VersionService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

VersionService.prototype = {
    getVersion: async function(empty) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(empty.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/google.protobuf.Empty");
        //anyWrapper.pack(empty.serializeBinary(), "Empty");

        var responseData = await this.client.execute("Version", "GetVersion", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var getVersionResponse =
        //    responseData.unpack(version.GetVersionResponse.deserializeBinary,
        //                        "GetVersionResponse");
        var getVersionResponse = version.GetVersionResponse.deserializeBinary(specificBytes);
        return getVersionResponse;
    },
};

exports.VersionService = VersionService;
