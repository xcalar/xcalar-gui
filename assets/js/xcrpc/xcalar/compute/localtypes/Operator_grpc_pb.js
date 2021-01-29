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
var xcalar_compute_localtypes_Operator_pb = require('../../../xcalar/compute/localtypes/Operator_pb.js');
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

function serialize_xcalar_compute_localtypes_Operator_MergeRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Operator_pb.MergeRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Operator.MergeRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Operator_MergeRequest(buffer_arg) {
  return xcalar_compute_localtypes_Operator_pb.MergeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var OperatorService = exports.OperatorService = {
  opMerge: {
    path: '/xcalar.compute.localtypes.Operator.Operator/OpMerge',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Operator_pb.MergeRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_Operator_MergeRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Operator_MergeRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.OperatorClient = grpc.makeGenericClientConstructor(OperatorService);
