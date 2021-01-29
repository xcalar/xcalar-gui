// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2019 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_Connectors_pb = require('../../../xcalar/compute/localtypes/Connectors_pb.js');
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

function serialize_xcalar_compute_localtypes_Connectors_ListFilesRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Connectors_pb.ListFilesRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Connectors.ListFilesRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Connectors_ListFilesRequest(buffer_arg) {
  return xcalar_compute_localtypes_Connectors_pb.ListFilesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Connectors_ListFilesResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Connectors_pb.ListFilesResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Connectors.ListFilesResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Connectors_ListFilesResponse(buffer_arg) {
  return xcalar_compute_localtypes_Connectors_pb.ListFilesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Connectors_RemoveFileRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Connectors_pb.RemoveFileRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Connectors.RemoveFileRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Connectors_RemoveFileRequest(buffer_arg) {
  return xcalar_compute_localtypes_Connectors_pb.RemoveFileRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var ConnectorsService = exports.ConnectorsService = {
  listFiles: {
    path: '/xcalar.compute.localtypes.Connectors.Connectors/ListFiles',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Connectors_pb.ListFilesRequest,
    responseType: xcalar_compute_localtypes_Connectors_pb.ListFilesResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Connectors_ListFilesRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Connectors_ListFilesRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Connectors_ListFilesResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Connectors_ListFilesResponse,
  },
  removeFile: {
    path: '/xcalar.compute.localtypes.Connectors.Connectors/RemoveFile',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Connectors_pb.RemoveFileRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_Connectors_RemoveFileRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Connectors_RemoveFileRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.ConnectorsClient = grpc.makeGenericClientConstructor(ConnectorsService);
