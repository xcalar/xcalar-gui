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
var xcalar_compute_localtypes_Query_pb = require('../../../xcalar/compute/localtypes/Query_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_xcalar_compute_localtypes_Query_ListRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Query_pb.ListRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Query.ListRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Query_ListRequest(buffer_arg) {
  return xcalar_compute_localtypes_Query_pb.ListRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Query_ListResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Query_pb.ListResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Query.ListResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Query_ListResponse(buffer_arg) {
  return xcalar_compute_localtypes_Query_pb.ListResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var QueryService = exports.QueryService = {
  list: {
    path: '/xcalar.compute.localtypes.Query.Query/List',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Query_pb.ListRequest,
    responseType: xcalar_compute_localtypes_Query_pb.ListResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Query_ListRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Query_ListRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Query_ListResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Query_ListResponse,
  },
};

exports.QueryClient = grpc.makeGenericClientConstructor(QueryService);
