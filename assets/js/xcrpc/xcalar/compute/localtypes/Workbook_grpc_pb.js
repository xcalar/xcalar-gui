// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2018 - 2019 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Workbook_pb.ConvertKvsToQueryRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Workbook.ConvertKvsToQueryRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryRequest(buffer_arg) {
  return xcalar_compute_localtypes_Workbook_pb.ConvertKvsToQueryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Workbook_pb.ConvertKvsToQueryResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Workbook.ConvertKvsToQueryResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryResponse(buffer_arg) {
  return xcalar_compute_localtypes_Workbook_pb.ConvertKvsToQueryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var WorkbookService = exports.WorkbookService = {
  convertKvsToQuery: {
    path: '/xcalar.compute.localtypes.Workbook.Workbook/ConvertKvsToQuery',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Workbook_pb.ConvertKvsToQueryRequest,
    responseType: xcalar_compute_localtypes_Workbook_pb.ConvertKvsToQueryResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Workbook_ConvertKvsToQueryResponse,
  },
};

exports.WorkbookClient = grpc.makeGenericClientConstructor(WorkbookService);
