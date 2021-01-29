// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2018 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_PublishedTable_pb = require('../../../xcalar/compute/localtypes/PublishedTable_pb.js');
var xcalar_compute_localtypes_ColumnAttribute_pb = require('../../../xcalar/compute/localtypes/ColumnAttribute_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_PublishedTable_ChangeOwnerRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_PublishedTable_pb.ChangeOwnerRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.PublishedTable.ChangeOwnerRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_PublishedTable_ChangeOwnerRequest(buffer_arg) {
  return xcalar_compute_localtypes_PublishedTable_pb.ChangeOwnerRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_PublishedTable_ListTablesRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_PublishedTable_pb.ListTablesRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.PublishedTable.ListTablesRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_PublishedTable_ListTablesRequest(buffer_arg) {
  return xcalar_compute_localtypes_PublishedTable_pb.ListTablesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_PublishedTable_ListTablesResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_PublishedTable_pb.ListTablesResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.PublishedTable.ListTablesResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_PublishedTable_ListTablesResponse(buffer_arg) {
  return xcalar_compute_localtypes_PublishedTable_pb.ListTablesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_PublishedTable_SelectRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_PublishedTable_pb.SelectRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.PublishedTable.SelectRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_PublishedTable_SelectRequest(buffer_arg) {
  return xcalar_compute_localtypes_PublishedTable_pb.SelectRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_PublishedTable_SelectResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_PublishedTable_pb.SelectResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.PublishedTable.SelectResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_PublishedTable_SelectResponse(buffer_arg) {
  return xcalar_compute_localtypes_PublishedTable_pb.SelectResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var PublishedTableService = exports.PublishedTableService = {
  select: {
    path: '/xcalar.compute.localtypes.PublishedTable.PublishedTable/Select',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_PublishedTable_pb.SelectRequest,
    responseType: xcalar_compute_localtypes_PublishedTable_pb.SelectResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_PublishedTable_SelectRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_PublishedTable_SelectRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_PublishedTable_SelectResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_PublishedTable_SelectResponse,
  },
  listTables: {
    path: '/xcalar.compute.localtypes.PublishedTable.PublishedTable/ListTables',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_PublishedTable_pb.ListTablesRequest,
    responseType: xcalar_compute_localtypes_PublishedTable_pb.ListTablesResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_PublishedTable_ListTablesRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_PublishedTable_ListTablesRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_PublishedTable_ListTablesResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_PublishedTable_ListTablesResponse,
  },
  // rpc for XcalarApiPtChangeOwner
  changeOwner: {
    path: '/xcalar.compute.localtypes.PublishedTable.PublishedTable/ChangeOwner',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_PublishedTable_pb.ChangeOwnerRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_PublishedTable_ChangeOwnerRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_PublishedTable_ChangeOwnerRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.PublishedTableClient = grpc.makeGenericClientConstructor(PublishedTableService);
