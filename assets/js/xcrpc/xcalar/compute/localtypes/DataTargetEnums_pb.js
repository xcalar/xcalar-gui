// source: xcalar/compute/localtypes/DataTargetEnums.proto
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

goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.ExExportCreateRule', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.ExSFFileSplitType', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.ExSFHeaderType', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.ExTargetType', null, global);
/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.ExTargetType = {
  EX_TARGET_UNKNOWN_TYPE: 0,
  EX_TARGET_SF_TYPE: 1,
  EX_TARGET_UDF_TYPE: 2
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.ExExportCreateRule = {
  EX_EXPORT_UNKNOWN_RULE: 0,
  EX_EXPORT_CREATE_ONLY: 1,
  EX_EXPORT_CREATE_OR_APPEND: 2,
  EX_EXPORT_APPEND_ONLY: 3,
  EX_EXPORT_DELETE_AND_REPLACE: 4
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.ExSFFileSplitType = {
  EX_SF_FILE_SPLIT_UNKNOWN_TYPE: 0,
  EX_SF_FILE_SPLIT_NONE: 1,
  EX_SF_FILE_SPLIT_FORCE_SINGLE: 2,
  EX_SF_FILE_SPLIT_SIZE: 3
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.ExSFHeaderType = {
  EX_SF_HEADER_UNKNOWN_TYPE: 0,
  EX_SF_HEADER_EVERY_FILE: 1,
  EX_SF_HEADER_SEPARATE_FILE: 2,
  EX_SF_HEADER_NONE: 3
};

goog.object.extend(exports, proto.xcalar.compute.localtypes.XcalarEnumType);
