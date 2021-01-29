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
var xcalar_compute_localtypes_UDF_pb = require('../../../xcalar/compute/localtypes/UDF_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');

function serialize_xcalar_compute_localtypes_UDF_GetResolutionRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_UDF_pb.GetResolutionRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.UDF.GetResolutionRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_UDF_GetResolutionRequest(buffer_arg) {
  return xcalar_compute_localtypes_UDF_pb.GetResolutionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_UDF_GetResolutionResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_UDF_pb.GetResolutionResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.UDF.GetResolutionResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_UDF_GetResolutionResponse(buffer_arg) {
  return xcalar_compute_localtypes_UDF_pb.GetResolutionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var UserDefinedFunctionService = exports.UserDefinedFunctionService = {
  getResolution: {
    path: '/xcalar.compute.localtypes.UDF.UserDefinedFunction/GetResolution',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_UDF_pb.GetResolutionRequest,
    responseType: xcalar_compute_localtypes_UDF_pb.GetResolutionResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_UDF_GetResolutionRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_UDF_GetResolutionRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_UDF_GetResolutionResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_UDF_GetResolutionResponse,
  },
};

exports.UserDefinedFunctionClient = grpc.makeGenericClientConstructor(UserDefinedFunctionService);
