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
var xcalar_compute_localtypes_ResultSet_pb = require('../../../xcalar/compute/localtypes/ResultSet_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
var xcalar_compute_localtypes_ProtoFieldValue_pb = require('../../../xcalar/compute/localtypes/ProtoFieldValue_pb.js');

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_ResultSet_pb.ResultSetMakeRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.ResultSet.ResultSetMakeRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeRequest(buffer_arg) {
  return xcalar_compute_localtypes_ResultSet_pb.ResultSetMakeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_ResultSet_pb.ResultSetMakeResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.ResultSet.ResultSetMakeResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeResponse(buffer_arg) {
  return xcalar_compute_localtypes_ResultSet_pb.ResultSetMakeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_ResultSet_ResultSetNextRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_ResultSet_pb.ResultSetNextRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.ResultSet.ResultSetNextRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_ResultSet_ResultSetNextRequest(buffer_arg) {
  return xcalar_compute_localtypes_ResultSet_pb.ResultSetNextRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_ResultSet_ResultSetNextResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_ResultSet_pb.ResultSetNextResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.ResultSet.ResultSetNextResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_ResultSet_ResultSetNextResponse(buffer_arg) {
  return xcalar_compute_localtypes_ResultSet_pb.ResultSetNextResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_ResultSet_ResultSetReleaseRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_ResultSet_pb.ResultSetReleaseRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.ResultSet.ResultSetReleaseRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_ResultSet_ResultSetReleaseRequest(buffer_arg) {
  return xcalar_compute_localtypes_ResultSet_pb.ResultSetReleaseRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_ResultSet_ResultSetSeekRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_ResultSet_pb.ResultSetSeekRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.ResultSet.ResultSetSeekRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_ResultSet_ResultSetSeekRequest(buffer_arg) {
  return xcalar_compute_localtypes_ResultSet_pb.ResultSetSeekRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var ResultSetService = exports.ResultSetService = {
  make: {
    path: '/xcalar.compute.localtypes.ResultSet.ResultSet/Make',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_ResultSet_pb.ResultSetMakeRequest,
    responseType: xcalar_compute_localtypes_ResultSet_pb.ResultSetMakeResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_ResultSet_ResultSetMakeResponse,
  },
  release: {
    path: '/xcalar.compute.localtypes.ResultSet.ResultSet/Release',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_ResultSet_pb.ResultSetReleaseRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_ResultSet_ResultSetReleaseRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_ResultSet_ResultSetReleaseRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  next: {
    path: '/xcalar.compute.localtypes.ResultSet.ResultSet/Next',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_ResultSet_pb.ResultSetNextRequest,
    responseType: xcalar_compute_localtypes_ResultSet_pb.ResultSetNextResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_ResultSet_ResultSetNextRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_ResultSet_ResultSetNextRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_ResultSet_ResultSetNextResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_ResultSet_ResultSetNextResponse,
  },
  seek: {
    path: '/xcalar.compute.localtypes.ResultSet.ResultSet/Seek',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_ResultSet_pb.ResultSetSeekRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_ResultSet_ResultSetSeekRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_ResultSet_ResultSetSeekRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.ResultSetClient = grpc.makeGenericClientConstructor(ResultSetService);
