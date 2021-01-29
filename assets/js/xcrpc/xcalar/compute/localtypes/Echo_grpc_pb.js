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
var xcalar_compute_localtypes_Echo_pb = require('../../../xcalar/compute/localtypes/Echo_pb.js');
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

function serialize_xcalar_compute_localtypes_Echo_EchoErrorRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Echo_pb.EchoErrorRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Echo.EchoErrorRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Echo_EchoErrorRequest(buffer_arg) {
  return xcalar_compute_localtypes_Echo_pb.EchoErrorRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Echo_EchoRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Echo_pb.EchoRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Echo.EchoRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Echo_EchoRequest(buffer_arg) {
  return xcalar_compute_localtypes_Echo_pb.EchoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Echo_EchoResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Echo_pb.EchoResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Echo.EchoResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Echo_EchoResponse(buffer_arg) {
  return xcalar_compute_localtypes_Echo_pb.EchoResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var EchoService = exports.EchoService = {
  echoMessage: {
    path: '/xcalar.compute.localtypes.Echo.Echo/EchoMessage',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Echo_pb.EchoRequest,
    responseType: xcalar_compute_localtypes_Echo_pb.EchoResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Echo_EchoRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Echo_EchoRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Echo_EchoResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Echo_EchoResponse,
  },
  echoErrorMessage: {
    path: '/xcalar.compute.localtypes.Echo.Echo/EchoErrorMessage',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Echo_pb.EchoErrorRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_Echo_EchoErrorRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Echo_EchoErrorRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.EchoClient = grpc.makeGenericClientConstructor(EchoService);
