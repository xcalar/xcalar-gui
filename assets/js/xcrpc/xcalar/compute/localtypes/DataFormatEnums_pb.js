// source: xcalar/compute/localtypes/DataFormatEnums.proto
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

goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.DfFormatType', null, global);
/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.DfFieldType = {
  DF_UNKNOWN: 0,
  DF_STRING: 1,
  DF_INT32: 2,
  DF_U_INT32: 3,
  DF_INT64: 4,
  DF_U_INT64: 5,
  DF_FLOAT32: 6,
  DF_FLOAT64: 7,
  DF_BOOLEAN: 8,
  DF_TIMESPEC: 9,
  DF_BLOB: 10,
  DF_NULL: 11,
  DF_MIXED: 12,
  DF_FATPTR: 13,
  DF_SCALAR_PTR: 14,
  DF_SCALAR_OBJ: 15,
  DF_OP_ROW_META_PTR: 16,
  DF_ARRAY: 17,
  DF_OBJECT: 18,
  DF_MONEY: 19
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.DfFormatType = {
  DF_FORMAT_UNKNOWN: 0,
  DF_FORMAT_JSON: 1,
  DF_FORMAT_CSV: 2,
  DF_FORMAT_SQL: 3,
  DF_FORMAT_INTERNAL: 4,
  DF_FORMAT_PARQUET: 5
};

goog.object.extend(exports, proto.xcalar.compute.localtypes.XcalarEnumType);
