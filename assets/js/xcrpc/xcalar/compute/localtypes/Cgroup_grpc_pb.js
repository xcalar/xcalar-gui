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
var xcalar_compute_localtypes_Cgroup_pb = require('../../../xcalar/compute/localtypes/Cgroup_pb.js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');

function serialize_xcalar_compute_localtypes_Cgroup_CgRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Cgroup_pb.CgRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Cgroup.CgRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Cgroup_CgRequest(buffer_arg) {
  return xcalar_compute_localtypes_Cgroup_pb.CgRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Cgroup_CgResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Cgroup_pb.CgResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Cgroup.CgResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Cgroup_CgResponse(buffer_arg) {
  return xcalar_compute_localtypes_Cgroup_pb.CgResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var CgroupService = exports.CgroupService = {
  process: {
    path: '/xcalar.compute.localtypes.Cgroup.Cgroup/Process',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Cgroup_pb.CgRequest,
    responseType: xcalar_compute_localtypes_Cgroup_pb.CgResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Cgroup_CgRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Cgroup_CgRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Cgroup_CgResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Cgroup_CgResponse,
  },
};

exports.CgroupClient = grpc.makeGenericClientConstructor(CgroupService);
