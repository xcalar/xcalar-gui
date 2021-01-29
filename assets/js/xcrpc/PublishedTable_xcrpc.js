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

var publishedTable = require("./xcalar/compute/localtypes/PublishedTable_pb");
var proto_empty = require("google-protobuf/google/protobuf/empty_pb");


////////////////////////////////////////////////////////////////////////////////
// Constructors
////////////////////////////////////////////////////////////////////////////////

function PublishedTableService(client) {
    this.client = client;
}

////////////////////////////////////////////////////////////////////////////////
// Definitions
////////////////////////////////////////////////////////////////////////////////

PublishedTableService.prototype = {
    select: async function(selectRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(selectRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.PublishedTable.SelectRequest");
        //anyWrapper.pack(selectRequest.serializeBinary(), "SelectRequest");

        var responseData = await this.client.execute("PublishedTable", "Select", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var selectResponse =
        //    responseData.unpack(publishedTable.SelectResponse.deserializeBinary,
        //                        "SelectResponse");
        var selectResponse = publishedTable.SelectResponse.deserializeBinary(specificBytes);
        return selectResponse;
    },
    listTables: async function(listTablesRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(listTablesRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.PublishedTable.ListTablesRequest");
        //anyWrapper.pack(listTablesRequest.serializeBinary(), "ListTablesRequest");

        var responseData = await this.client.execute("PublishedTable", "ListTables", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var listTablesResponse =
        //    responseData.unpack(publishedTable.ListTablesResponse.deserializeBinary,
        //                        "ListTablesResponse");
        var listTablesResponse = publishedTable.ListTablesResponse.deserializeBinary(specificBytes);
        return listTablesResponse;
    },
    changeOwner: async function(changeOwnerRequest) {
        // XXX we want to use Any.pack() here, but it is only available
        // in protobuf 3.2
        // https://github.com/google/protobuf/issues/2612#issuecomment-274567411
        var anyWrapper = new proto.google.protobuf.Any();
        anyWrapper.setValue(changeOwnerRequest.serializeBinary());
        anyWrapper.setTypeUrl("type.googleapis.com/xcalar.compute.localtypes.PublishedTable.ChangeOwnerRequest");
        //anyWrapper.pack(changeOwnerRequest.serializeBinary(), "ChangeOwnerRequest");

        var responseData = await this.client.execute("PublishedTable", "ChangeOwner", anyWrapper);
        var specificBytes = responseData.getValue();
        // XXX Any.unpack() is only available in protobuf 3.2; see above
        //var empty =
        //    responseData.unpack(proto_empty.Empty.deserializeBinary,
        //                        "Empty");
        var empty = proto_empty.Empty.deserializeBinary(specificBytes);
        return empty;
    },
};

exports.PublishedTableService = PublishedTableService;