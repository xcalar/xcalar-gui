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
var xcalar_compute_localtypes_License_pb = require('../../../xcalar/compute/localtypes/License_pb.js');
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

function serialize_xcalar_compute_localtypes_License_CreateRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_License_pb.CreateRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.License.CreateRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_License_CreateRequest(buffer_arg) {
  return xcalar_compute_localtypes_License_pb.CreateRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_License_DestroyRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_License_pb.DestroyRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.License.DestroyRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_License_DestroyRequest(buffer_arg) {
  return xcalar_compute_localtypes_License_pb.DestroyRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_License_GetRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_License_pb.GetRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.License.GetRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_License_GetRequest(buffer_arg) {
  return xcalar_compute_localtypes_License_pb.GetRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_License_GetResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_License_pb.GetResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.License.GetResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_License_GetResponse(buffer_arg) {
  return xcalar_compute_localtypes_License_pb.GetResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_License_UpdateRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_License_pb.UpdateRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.License.UpdateRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_License_UpdateRequest(buffer_arg) {
  return xcalar_compute_localtypes_License_pb.UpdateRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_License_ValidateRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_License_pb.ValidateRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.License.ValidateRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_License_ValidateRequest(buffer_arg) {
  return xcalar_compute_localtypes_License_pb.ValidateRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_License_ValidateResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_License_pb.ValidateResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.License.ValidateResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_License_ValidateResponse(buffer_arg) {
  return xcalar_compute_localtypes_License_pb.ValidateResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var LicenseService = exports.LicenseService = {
  create: {
    path: '/xcalar.compute.localtypes.License.License/Create',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_License_pb.CreateRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_License_CreateRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_License_CreateRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  destroy: {
    path: '/xcalar.compute.localtypes.License.License/Destroy',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_License_pb.DestroyRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_License_DestroyRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_License_DestroyRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  get: {
    path: '/xcalar.compute.localtypes.License.License/Get',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_License_pb.GetRequest,
    responseType: xcalar_compute_localtypes_License_pb.GetResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_License_GetRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_License_GetRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_License_GetResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_License_GetResponse,
  },
  validate: {
    path: '/xcalar.compute.localtypes.License.License/Validate',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_License_pb.ValidateRequest,
    responseType: xcalar_compute_localtypes_License_pb.ValidateResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_License_ValidateRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_License_ValidateRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_License_ValidateResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_License_ValidateResponse,
  },
  update: {
    path: '/xcalar.compute.localtypes.License.License/Update',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_License_pb.UpdateRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_License_UpdateRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_License_UpdateRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
};

exports.LicenseClient = grpc.makeGenericClientConstructor(LicenseService);
