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
var xcalar_compute_localtypes_KvStore_pb = require('../../../xcalar/compute/localtypes/KvStore_pb.js');
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

function serialize_xcalar_compute_localtypes_KvStore_AddOrReplaceRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.AddOrReplaceRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.AddOrReplaceRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_AddOrReplaceRequest(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.AddOrReplaceRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_AppendRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.AppendRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.AppendRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_AppendRequest(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.AppendRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_DeleteKeyRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.DeleteKeyRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.DeleteKeyRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_DeleteKeyRequest(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.DeleteKeyRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_ListRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.ListRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.ListRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_ListRequest(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.ListRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_ListResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.ListResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.ListResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_ListResponse(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.ListResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_LookupRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.LookupRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.LookupRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_LookupRequest(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.LookupRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_LookupResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.LookupResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.LookupResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_LookupResponse(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.LookupResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_MultiAddOrReplaceRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.MultiAddOrReplaceRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.MultiAddOrReplaceRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_MultiAddOrReplaceRequest(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.MultiAddOrReplaceRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_KvStore_SetIfEqualRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_KvStore_pb.SetIfEqualRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.KvStore.SetIfEqualRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_KvStore_SetIfEqualRequest(buffer_arg) {
  return xcalar_compute_localtypes_KvStore_pb.SetIfEqualRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var KvStoreService = exports.KvStoreService = {
  lookup: {
    path: '/xcalar.compute.localtypes.KvStore.KvStore/Lookup',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_KvStore_pb.LookupRequest,
    responseType: xcalar_compute_localtypes_KvStore_pb.LookupResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_KvStore_LookupRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_KvStore_LookupRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_KvStore_LookupResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_KvStore_LookupResponse,
  },
  addOrReplace: {
    path: '/xcalar.compute.localtypes.KvStore.KvStore/AddOrReplace',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_KvStore_pb.AddOrReplaceRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_KvStore_AddOrReplaceRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_KvStore_AddOrReplaceRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  multiAddOrReplace: {
    path: '/xcalar.compute.localtypes.KvStore.KvStore/MultiAddOrReplace',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_KvStore_pb.MultiAddOrReplaceRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_KvStore_MultiAddOrReplaceRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_KvStore_MultiAddOrReplaceRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  deleteKey: {
    path: '/xcalar.compute.localtypes.KvStore.KvStore/DeleteKey',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_KvStore_pb.DeleteKeyRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_KvStore_DeleteKeyRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_KvStore_DeleteKeyRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  append: {
    path: '/xcalar.compute.localtypes.KvStore.KvStore/Append',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_KvStore_pb.AppendRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_KvStore_AppendRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_KvStore_AppendRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  setIfEqual: {
    path: '/xcalar.compute.localtypes.KvStore.KvStore/SetIfEqual',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_KvStore_pb.SetIfEqualRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_KvStore_SetIfEqualRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_KvStore_SetIfEqualRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  list: {
    path: '/xcalar.compute.localtypes.KvStore.KvStore/List',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_KvStore_pb.ListRequest,
    responseType: xcalar_compute_localtypes_KvStore_pb.ListResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_KvStore_ListRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_KvStore_ListRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_KvStore_ListResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_KvStore_ListResponse,
  },
};

exports.KvStoreClient = grpc.makeGenericClientConstructor(KvStoreService);
