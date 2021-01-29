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
var xcalar_compute_localtypes_Sql_pb = require('../../../xcalar/compute/localtypes/Sql_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_xcalar_compute_localtypes_Sql_SQLQueryRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Sql_pb.SQLQueryRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Sql.SQLQueryRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Sql_SQLQueryRequest(buffer_arg) {
  return xcalar_compute_localtypes_Sql_pb.SQLQueryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Sql_SQLQueryResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Sql_pb.SQLQueryResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Sql.SQLQueryResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Sql_SQLQueryResponse(buffer_arg) {
  return xcalar_compute_localtypes_Sql_pb.SQLQueryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var SqlService = exports.SqlService = {
  executeSQL: {
    path: '/xcalar.compute.localtypes.Sql.Sql/ExecuteSQL',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Sql_pb.SQLQueryRequest,
    responseType: xcalar_compute_localtypes_Sql_pb.SQLQueryResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Sql_SQLQueryRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Sql_SQLQueryRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Sql_SQLQueryResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Sql_SQLQueryResponse,
  },
};

exports.SqlClient = grpc.makeGenericClientConstructor(SqlService);
