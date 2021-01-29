// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2019 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_DagNode_pb = require('../../../xcalar/compute/localtypes/DagNode_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_DagNode_DagNodeInputMsg(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_DagNode_pb.DagNodeInputMsg)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.DagNode.DagNodeInputMsg');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_DagNode_DagNodeInputMsg(buffer_arg) {
  return xcalar_compute_localtypes_DagNode_pb.DagNodeInputMsg.deserializeBinary(new Uint8Array(buffer_arg));
}


var DagNodeService = exports.DagNodeService = {
  pin: {
    path: '/xcalar.compute.localtypes.DagNode.DagNode/Pin',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_DagNode_pb.DagNodeInputMsg,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_DagNode_DagNodeInputMsg,
    requestDeserialize: deserialize_xcalar_compute_localtypes_DagNode_DagNodeInputMsg,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  unpin: {
    path: '/xcalar.compute.localtypes.DagNode.DagNode/Unpin',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_DagNode_pb.DagNodeInputMsg,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_DagNode_DagNodeInputMsg,
    requestDeserialize: deserialize_xcalar_compute_localtypes_DagNode_DagNodeInputMsg,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.DagNodeClient = grpc.makeGenericClientConstructor(DagNodeService);
