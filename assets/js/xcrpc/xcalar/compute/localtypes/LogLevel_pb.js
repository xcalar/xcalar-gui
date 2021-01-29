// source: xcalar/compute/localtypes/LogLevel.proto
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

goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.XcalarSyslogFlushLevel', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.XcalarSyslogMsgLevel', null, global);
/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.XcalarSyslogMsgLevel = {
  XLOG_EMERG: 0,
  XLOG_ALERT: 1,
  XLOG_CRIT: 2,
  XLOG_ERR: 3,
  XLOG_WARN: 4,
  XLOG_NOTE: 5,
  XLOG_INFO: 6,
  XLOG_DEBUG: 7,
  XLOG_VERBOSE: 8,
  XLOG_INVAL: 9
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.XcalarSyslogFlushLevel = {
  XLOG_FLUSH_NONE: 0,
  XLOG_FLUSH_GLOBAL: 1,
  XLOG_FLUSH_LOCAL: 2
};

goog.object.extend(exports, proto.xcalar.compute.localtypes.XcalarEnumType);
