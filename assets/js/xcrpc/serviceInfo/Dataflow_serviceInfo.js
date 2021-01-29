// **********************************************************************
// *** DO NOT EDIT!  This file was autogenerated by xcrpc             ***
// **********************************************************************
// Copyright 2018 Xcalar, Inc. All rights reserved.
//
// No use, or distribution, of this source code is permitted in any form or
// means without a valid, written license agreement with Xcalar, Inc.
// Please refer to the included "COPYING" file for terms and conditions
// regarding the use and redistribution of this software.
//

const _serviceInfo = {
    "Dataflow" : {
        "Filter" : ["xcalar.compute.localtypes.Dataflow.FilterRequest", "xcalar.compute.localtypes.Dataflow.FilterResponse"],
        "Aggregate" : ["xcalar.compute.localtypes.Dataflow.AggregateRequest", "xcalar.compute.localtypes.Dataflow.AggregateResponse"],
        "AggregateWithEvalStr" : ["xcalar.compute.localtypes.Dataflow.AggregateEvalStrRequest", "xcalar.compute.localtypes.Dataflow.AggregateResponse"],
        "Map" : ["xcalar.compute.localtypes.Dataflow.MapRequest", "xcalar.compute.localtypes.Dataflow.MapResponse"],
        "GenRowNum" : ["xcalar.compute.localtypes.Dataflow.GenRowNumRequest", "xcalar.compute.localtypes.Dataflow.GenRowNumResponse"],
        "Project" : ["xcalar.compute.localtypes.Dataflow.ProjectRequest", "xcalar.compute.localtypes.Dataflow.ProjectResponse"],
        "Join" : ["xcalar.compute.localtypes.Dataflow.JoinRequest", "xcalar.compute.localtypes.Dataflow.JoinResponse"],
        "UnionOp" : ["xcalar.compute.localtypes.Dataflow.UnionRequest", "xcalar.compute.localtypes.Dataflow.UnionResponse"],
        "GroupBy" : ["xcalar.compute.localtypes.Dataflow.GroupByRequest", "xcalar.compute.localtypes.Dataflow.GroupByResponse"],
        "IndexFromDataset" : ["xcalar.compute.localtypes.Dataflow.IndexFromDatasetRequest", "xcalar.compute.localtypes.Dataflow.IndexFromDatasetResponse"],
        "Index" : ["xcalar.compute.localtypes.Dataflow.IndexRequest", "xcalar.compute.localtypes.Dataflow.IndexResponse"],
        "Sort" : ["xcalar.compute.localtypes.Dataflow.SortRequest", "xcalar.compute.localtypes.Dataflow.SortResponse"],
        "Synthesize" : ["xcalar.compute.localtypes.Dataflow.SynthesizeRequest", "xcalar.compute.localtypes.Dataflow.SynthesizeResponse"],
        "Execute" : ["xcalar.compute.localtypes.Dataflow.ExecuteRequest", "xcalar.compute.localtypes.Dataflow.ExecuteResponse"],
    },
};

exports.serviceInfo = _serviceInfo;