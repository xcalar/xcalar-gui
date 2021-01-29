// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2018-2019 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_Table_pb = require('../../../xcalar/compute/localtypes/Table_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
var xcalar_compute_localtypes_ColumnAttribute_pb = require('../../../xcalar/compute/localtypes/ColumnAttribute_pb.js');

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_IndexRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.IndexRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.IndexRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_IndexRequest(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.IndexRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_ListTablesRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.ListTablesRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.ListTablesRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_ListTablesRequest(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.ListTablesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_ListTablesResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.ListTablesResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.ListTablesResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_ListTablesResponse(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.ListTablesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_PublishRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.PublishRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.PublishRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_PublishRequest(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.PublishRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_PublishResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.PublishResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.PublishResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_PublishResponse(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.PublishResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_TableMetaRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.TableMetaRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.TableMetaRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_TableMetaRequest(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.TableMetaRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_TableMetaResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.TableMetaResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.TableMetaResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_TableMetaResponse(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.TableMetaResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Table_UnpublishRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Table_pb.UnpublishRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Table.UnpublishRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Table_UnpublishRequest(buffer_arg) {
  return xcalar_compute_localtypes_Table_pb.UnpublishRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


var TableService = exports.TableService = {
  addIndex: {
    path: '/xcalar.compute.localtypes.Table.Table/AddIndex',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Table_pb.IndexRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_Table_IndexRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Table_IndexRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  removeIndex: {
    path: '/xcalar.compute.localtypes.Table.Table/RemoveIndex',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Table_pb.IndexRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_Table_IndexRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Table_IndexRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  publishTable: {
    path: '/xcalar.compute.localtypes.Table.Table/PublishTable',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Table_pb.PublishRequest,
    responseType: xcalar_compute_localtypes_Table_pb.PublishResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Table_PublishRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Table_PublishRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Table_PublishResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Table_PublishResponse,
  },
  unpublishTable: {
    path: '/xcalar.compute.localtypes.Table.Table/UnpublishTable',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Table_pb.UnpublishRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_xcalar_compute_localtypes_Table_UnpublishRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Table_UnpublishRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  listTables: {
    path: '/xcalar.compute.localtypes.Table.Table/ListTables',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Table_pb.ListTablesRequest,
    responseType: xcalar_compute_localtypes_Table_pb.ListTablesResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Table_ListTablesRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Table_ListTablesRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Table_ListTablesResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Table_ListTablesResponse,
  },
  tableMeta: {
    path: '/xcalar.compute.localtypes.Table.Table/TableMeta',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Table_pb.TableMetaRequest,
    responseType: xcalar_compute_localtypes_Table_pb.TableMetaResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Table_TableMetaRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Table_TableMetaRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Table_TableMetaResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Table_TableMetaResponse,
  },
};

exports.TableClient = grpc.makeGenericClientConstructor(TableService);
