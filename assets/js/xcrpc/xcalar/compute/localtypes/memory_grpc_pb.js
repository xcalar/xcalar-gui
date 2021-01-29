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
var xcalar_compute_localtypes_memory_pb = require('../../../xcalar/compute/localtypes/memory_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');

function serialize_xcalar_compute_localtypes_memory_GetUsageRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_memory_pb.GetUsageRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.memory.GetUsageRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_memory_GetUsageRequest(buffer_arg) {
  return xcalar_compute_localtypes_memory_pb.GetUsageRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_memory_GetUsageResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_memory_pb.GetUsageResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.memory.GetUsageResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_memory_GetUsageResponse(buffer_arg) {
  return xcalar_compute_localtypes_memory_pb.GetUsageResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var MemoryService = exports.MemoryService = {
  // rpc for XcalarApiGetMemoryUsage
  getUsage: {
    path: '/xcalar.compute.localtypes.memory.Memory/GetUsage',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_memory_pb.GetUsageRequest,
    responseType: xcalar_compute_localtypes_memory_pb.GetUsageResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_memory_GetUsageRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_memory_GetUsageRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_memory_GetUsageResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_memory_GetUsageResponse,
  },
};

exports.MemoryClient = grpc.makeGenericClientConstructor(MemoryService);
