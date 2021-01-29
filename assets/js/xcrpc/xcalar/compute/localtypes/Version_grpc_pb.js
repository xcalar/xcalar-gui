// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_Version_pb = require('../../../xcalar/compute/localtypes/Version_pb.js');
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

function serialize_xcalar_compute_localtypes_Version_GetVersionResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Version_pb.GetVersionResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Version.GetVersionResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Version_GetVersionResponse(buffer_arg) {
  return xcalar_compute_localtypes_Version_pb.GetVersionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var VersionService = exports.VersionService = {
  getVersion: {
    path: '/xcalar.compute.localtypes.Version.Version/GetVersion',
    requestStream: false,
    responseStream: false,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: xcalar_compute_localtypes_Version_pb.GetVersionResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_xcalar_compute_localtypes_Version_GetVersionResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Version_GetVersionResponse,
  },
};

exports.VersionClient = grpc.makeGenericClientConstructor(VersionService);
