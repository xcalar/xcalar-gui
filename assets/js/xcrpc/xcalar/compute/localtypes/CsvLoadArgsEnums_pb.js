// source: xcalar/compute/localtypes/CsvLoadArgsEnums.proto
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

goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.CsvDialect', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.CsvSchemaMode', null, global);
/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.CsvSchemaMode = {
  CSV_SCHEMA_MODE_NONE_PROVIDED: 0,
  CSV_SCHEMA_MODE_USE_HEADER: 1,
  CSV_SCHEMA_MODE_USE_SCHEMA_FILE: 2,
  CSV_SCHEMA_MODE_USE_LOAD_INPUT: 3
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.CsvDialect = {
  CSV_DIALECT_DEFAULT: 0,
  CSV_DIALECT_XCALAR_SNAPSHOT: 1
};

goog.object.extend(exports, proto.xcalar.compute.localtypes.XcalarEnumType);
