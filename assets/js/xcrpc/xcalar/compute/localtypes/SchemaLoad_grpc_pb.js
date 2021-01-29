// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_SchemaLoad_pb = require('../../../xcalar/compute/localtypes/SchemaLoad_pb.js');

function serialize_xcalar_compute_localtypes_SchemaLoad_AppRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_SchemaLoad_pb.AppRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.SchemaLoad.AppRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_SchemaLoad_AppRequest(buffer_arg) {
  return xcalar_compute_localtypes_SchemaLoad_pb.AppRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_SchemaLoad_AppResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_SchemaLoad_pb.AppResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.SchemaLoad.AppResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_SchemaLoad_AppResponse(buffer_arg) {
  return xcalar_compute_localtypes_SchemaLoad_pb.AppResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var SchemaLoadService = exports.SchemaLoadService = {
  appRun: {
    path: '/xcalar.compute.localtypes.SchemaLoad.SchemaLoad/AppRun',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_SchemaLoad_pb.AppRequest,
    responseType: xcalar_compute_localtypes_SchemaLoad_pb.AppResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_SchemaLoad_AppRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_SchemaLoad_AppRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_SchemaLoad_AppResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_SchemaLoad_AppResponse,
  },
};

exports.SchemaLoadClient = grpc.makeGenericClientConstructor(SchemaLoadService);
