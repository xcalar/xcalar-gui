// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_Stats_pb = require('../../../xcalar/compute/localtypes/Stats_pb.js');
var google_protobuf_timestamp_pb = require('google-protobuf/google/protobuf/timestamp_pb.js');
var google_protobuf_wrappers_pb = require('google-protobuf/google/protobuf/wrappers_pb.js');

function serialize_xcalar_compute_localtypes_Stats_GetLibstatsRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Stats_pb.GetLibstatsRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Stats.GetLibstatsRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Stats_GetLibstatsRequest(buffer_arg) {
  return xcalar_compute_localtypes_Stats_pb.GetLibstatsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Stats_GetLibstatsResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Stats_pb.GetLibstatsResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Stats.GetLibstatsResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Stats_GetLibstatsResponse(buffer_arg) {
  return xcalar_compute_localtypes_Stats_pb.GetLibstatsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Stats_GetStatsRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Stats_pb.GetStatsRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Stats.GetStatsRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Stats_GetStatsRequest(buffer_arg) {
  return xcalar_compute_localtypes_Stats_pb.GetStatsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Stats_GetStatsResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Stats_pb.GetStatsResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Stats.GetStatsResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Stats_GetStatsResponse(buffer_arg) {
  return xcalar_compute_localtypes_Stats_pb.GetStatsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Stats_ResetStatsRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Stats_pb.ResetStatsRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Stats.ResetStatsRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Stats_ResetStatsRequest(buffer_arg) {
  return xcalar_compute_localtypes_Stats_pb.ResetStatsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Stats_ResetStatsResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Stats_pb.ResetStatsResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Stats.ResetStatsResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Stats_ResetStatsResponse(buffer_arg) {
  return xcalar_compute_localtypes_Stats_pb.ResetStatsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var StatsService = exports.StatsService = {
  getStats: {
    path: '/xcalar.compute.localtypes.Stats.Stats/GetStats',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Stats_pb.GetStatsRequest,
    responseType: xcalar_compute_localtypes_Stats_pb.GetStatsResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Stats_GetStatsRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Stats_GetStatsRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Stats_GetStatsResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Stats_GetStatsResponse,
  },
  getLibstats: {
    path: '/xcalar.compute.localtypes.Stats.Stats/GetLibstats',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Stats_pb.GetLibstatsRequest,
    responseType: xcalar_compute_localtypes_Stats_pb.GetLibstatsResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Stats_GetLibstatsRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Stats_GetLibstatsRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Stats_GetLibstatsResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Stats_GetLibstatsResponse,
  },
  resetStats: {
    path: '/xcalar.compute.localtypes.Stats.Stats/ResetStats',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Stats_pb.ResetStatsRequest,
    responseType: xcalar_compute_localtypes_Stats_pb.ResetStatsResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Stats_ResetStatsRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Stats_ResetStatsRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Stats_ResetStatsResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Stats_ResetStatsResponse,
  },
};

exports.StatsClient = grpc.makeGenericClientConstructor(StatsService);
