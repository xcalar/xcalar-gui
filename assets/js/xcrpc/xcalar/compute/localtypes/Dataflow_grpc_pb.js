// GENERATED CODE -- DO NOT EDIT!

// Original file comments:
// Copyright 2018 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//
'use strict';
var grpc = require('grpc');
var xcalar_compute_localtypes_Dataflow_pb = require('../../../xcalar/compute/localtypes/Dataflow_pb.js');
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
var xcalar_compute_localtypes_DataflowEnums_pb = require('../../../xcalar/compute/localtypes/DataflowEnums_pb.js');

function serialize_xcalar_compute_localtypes_Dataflow_AggregateEvalStrRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.AggregateEvalStrRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_AggregateEvalStrRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.AggregateEvalStrRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_AggregateRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.AggregateRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.AggregateRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_AggregateRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.AggregateRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_AggregateResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.AggregateResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.AggregateResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_AggregateResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.AggregateResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_ExecuteRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.ExecuteRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.ExecuteRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_ExecuteRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.ExecuteRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_ExecuteResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.ExecuteResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.ExecuteResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_ExecuteResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.ExecuteResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_FilterRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.FilterRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.FilterRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_FilterRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.FilterRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_FilterResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.FilterResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.FilterResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_FilterResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.FilterResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_GenRowNumRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.GenRowNumRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.GenRowNumRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_GenRowNumRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.GenRowNumRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_GenRowNumResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.GenRowNumResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.GenRowNumResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_GenRowNumResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.GenRowNumResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_GroupByRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.GroupByRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.GroupByRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_GroupByRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.GroupByRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_GroupByResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.GroupByResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.GroupByResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_GroupByResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.GroupByResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.IndexFromDatasetRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.IndexFromDatasetRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.IndexFromDatasetResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.IndexFromDatasetResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_IndexRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.IndexRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.IndexRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_IndexRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.IndexRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_IndexResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.IndexResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.IndexResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_IndexResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.IndexResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_JoinRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.JoinRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.JoinRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_JoinRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.JoinRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_JoinResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.JoinResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.JoinResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_JoinResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.JoinResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_MapRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.MapRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.MapRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_MapRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.MapRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_MapResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.MapResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.MapResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_MapResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.MapResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_ProjectRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.ProjectRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.ProjectRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_ProjectRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.ProjectRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_ProjectResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.ProjectResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.ProjectResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_ProjectResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.ProjectResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_SortRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.SortRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.SortRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_SortRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.SortRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_SortResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.SortResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.SortResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_SortResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.SortResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_SynthesizeRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.SynthesizeRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.SynthesizeRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_SynthesizeRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.SynthesizeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_SynthesizeResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.SynthesizeResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.SynthesizeResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_SynthesizeResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.SynthesizeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_UnionRequest(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.UnionRequest)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.UnionRequest');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_UnionRequest(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.UnionRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_xcalar_compute_localtypes_Dataflow_UnionResponse(arg) {
  if (!(arg instanceof xcalar_compute_localtypes_Dataflow_pb.UnionResponse)) {
    throw new Error('Expected argument of type xcalar.compute.localtypes.Dataflow.UnionResponse');
  }
  return new Buffer(arg.serializeBinary());
}

function deserialize_xcalar_compute_localtypes_Dataflow_UnionResponse(buffer_arg) {
  return xcalar_compute_localtypes_Dataflow_pb.UnionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


var DataflowService = exports.DataflowService = {
  filter: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Filter',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.FilterRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.FilterResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_FilterRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_FilterRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_FilterResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_FilterResponse,
  },
  aggregate: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Aggregate',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.AggregateRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.AggregateResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_AggregateRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_AggregateRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_AggregateResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_AggregateResponse,
  },
  aggregateWithEvalStr: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/AggregateWithEvalStr',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.AggregateEvalStrRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.AggregateResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_AggregateEvalStrRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_AggregateEvalStrRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_AggregateResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_AggregateResponse,
  },
  map: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Map',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.MapRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.MapResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_MapRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_MapRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_MapResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_MapResponse,
  },
  genRowNum: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/GenRowNum',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.GenRowNumRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.GenRowNumResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_GenRowNumRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_GenRowNumRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_GenRowNumResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_GenRowNumResponse,
  },
  project: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Project',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.ProjectRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.ProjectResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_ProjectRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_ProjectRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_ProjectResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_ProjectResponse,
  },
  join: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Join',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.JoinRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.JoinResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_JoinRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_JoinRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_JoinResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_JoinResponse,
  },
  unionOp: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/UnionOp',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.UnionRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.UnionResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_UnionRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_UnionRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_UnionResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_UnionResponse,
  },
  groupBy: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/GroupBy',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.GroupByRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.GroupByResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_GroupByRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_GroupByRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_GroupByResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_GroupByResponse,
  },
  indexFromDataset: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/IndexFromDataset',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.IndexFromDatasetRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.IndexFromDatasetResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_IndexFromDatasetResponse,
  },
  index: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Index',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.IndexRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.IndexResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_IndexRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_IndexRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_IndexResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_IndexResponse,
  },
  sort: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Sort',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.SortRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.SortResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_SortRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_SortRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_SortResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_SortResponse,
  },
  synthesize: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Synthesize',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.SynthesizeRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.SynthesizeResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_SynthesizeRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_SynthesizeRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_SynthesizeResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_SynthesizeResponse,
  },
  execute: {
    path: '/xcalar.compute.localtypes.Dataflow.Dataflow/Execute',
    requestStream: false,
    responseStream: false,
    requestType: xcalar_compute_localtypes_Dataflow_pb.ExecuteRequest,
    responseType: xcalar_compute_localtypes_Dataflow_pb.ExecuteResponse,
    requestSerialize: serialize_xcalar_compute_localtypes_Dataflow_ExecuteRequest,
    requestDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_ExecuteRequest,
    responseSerialize: serialize_xcalar_compute_localtypes_Dataflow_ExecuteResponse,
    responseDeserialize: deserialize_xcalar_compute_localtypes_Dataflow_ExecuteResponse,
  },
};

exports.DataflowClient = grpc.makeGenericClientConstructor(DataflowService);
