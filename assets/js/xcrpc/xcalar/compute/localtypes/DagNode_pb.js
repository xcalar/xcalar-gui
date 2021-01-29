// source: xcalar/compute/localtypes/DagNode.proto
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

var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
goog.object.extend(proto, google_protobuf_empty_pb);
var xcalar_compute_localtypes_Workbook_pb = require('../../../xcalar/compute/localtypes/Workbook_pb.js');
goog.object.extend(proto, xcalar_compute_localtypes_Workbook_pb);
goog.exportSymbol('proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.displayName = 'proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.toObject = function(includeInstance, msg) {
  var f, obj = {
    dagNodeName: jspb.Message.getFieldWithDefault(msg, 1, ""),
    scope: (f = msg.getScope()) && xcalar_compute_localtypes_Workbook_pb.WorkbookScope.toObject(includeInstance, f)
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg}
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg;
  return proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg}
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setDagNodeName(value);
      break;
    case 2:
      var value = new xcalar_compute_localtypes_Workbook_pb.WorkbookScope;
      reader.readMessage(value,xcalar_compute_localtypes_Workbook_pb.WorkbookScope.deserializeBinaryFromReader);
      msg.setScope(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getDagNodeName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getScope();
  if (f != null) {
    writer.writeMessage(
      2,
      f,
      xcalar_compute_localtypes_Workbook_pb.WorkbookScope.serializeBinaryToWriter
    );
  }
};


/**
 * optional string dag_node_name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.getDagNodeName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg} returns this
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.setDagNodeName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional xcalar.compute.localtypes.Workbook.WorkbookScope scope = 2;
 * @return {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope}
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.getScope = function() {
  return /** @type{?proto.xcalar.compute.localtypes.Workbook.WorkbookScope} */ (
    jspb.Message.getWrapperField(this, xcalar_compute_localtypes_Workbook_pb.WorkbookScope, 2));
};


/**
 * @param {?proto.xcalar.compute.localtypes.Workbook.WorkbookScope|undefined} value
 * @return {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg} returns this
*/
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.setScope = function(value) {
  return jspb.Message.setWrapperField(this, 2, value);
};


/**
 * Clears the message field making it undefined.
 * @return {!proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg} returns this
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.clearScope = function() {
  return this.setScope(undefined);
};


/**
 * Returns whether this field is set.
 * @return {boolean}
 */
proto.xcalar.compute.localtypes.DagNode.DagNodeInputMsg.prototype.hasScope = function() {
  return jspb.Message.getField(this, 2) != null;
};


goog.object.extend(exports, proto.xcalar.compute.localtypes.DagNode);