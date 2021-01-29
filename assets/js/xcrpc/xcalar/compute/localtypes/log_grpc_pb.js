// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2020 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_log_pb = require('../../../xcalar/compute/localtypes/log_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
var xcalar_compute_localtypes_LogLevel_pb = require('../../../xcalar/compute/localtypes/LogLevel_pb.js');

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_log_GetLevelResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_log_pb.GetLevelResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.log.GetLevelResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_log_GetLevelResponse(buffer_arg) {
  return xcalar_compute_localtypes_log_pb.GetLevelResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_log_SetLevelRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_log_pb.SetLevelRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.log.SetLevelRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_log_SetLevelRequest(buffer_arg) {
  return xcalar_compute_localtypes_log_pb.SetLevelRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var LogService = exports.LogService = {
  // rpc for XcalarApiLogLevelGet
  getLevel: {
    path: '/xcalar.compute.localtypes.log.Log/GetLevel',
    requestStream: false,
    responseStream: false,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: xcalar_compute_localtypes_log_pb.GetLevelResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_xcalar_compute_localtypes_log_GetLevelResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_log_GetLevelResponse,
  },
  // rpc for XcalarApiLogLevelSet
  setLevel: {
    path: '/xcalar.compute.localtypes.log.Log/SetLevel',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_log_pb.SetLevelRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_log_SetLevelRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_log_SetLevelRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.LogClient = grpc.makeGenericClientConstructor(LogService);
