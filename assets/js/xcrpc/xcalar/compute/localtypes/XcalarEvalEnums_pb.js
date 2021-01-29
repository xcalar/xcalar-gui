// source: xcalar/compute/localtypes/XcalarEvalEnums.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.AccumulatorType', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.XcalarEvalArgType', null, global);
/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.XcalarEvalArgType = {
  OPTIONAL_ARG: 0,
  REQUIRED_ARG: 1,
  VARIABLE_ARG: 2
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.AccumulatorType = {
  ACCUMULATOR_MAX: 0,
  ACCUMULATOR_MIN: 1,
  ACCUMULATOR_COUNT: 2,
  ACCUMULATOR_AVG: 3,
  ACCUMULATOR_AVG_NUMERIC: 4,
  ACCUMULATOR_SUM_FLOAT: 5,
  ACCUMULATOR_SUM_INTEGER: 6,
  ACCUMULATOR_SUM_NUMERIC: 7
};

goog.object.extend(exports, proto.xcalar.compute.localtypes.XcalarEnumType);
