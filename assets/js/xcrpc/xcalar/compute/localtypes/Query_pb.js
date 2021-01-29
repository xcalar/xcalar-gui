// source: xcalar/compute/localtypes/Query.proto
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
goog.exportSymbol('proto.xcalar.compute.localtypes.Query.ListRequest', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Query.ListResponse', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.Query.QueryInfo', null, global);
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
proto.xcalar.compute.localtypes.Query.ListRequest = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Query.ListRequest, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.xcalar.compute.localtypes.Query.ListRequest.displayName = 'proto.xcalar.compute.localtypes.Query.ListRequest';
}
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
proto.xcalar.compute.localtypes.Query.QueryInfo = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Query.QueryInfo, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.xcalar.compute.localtypes.Query.QueryInfo.displayName = 'proto.xcalar.compute.localtypes.Query.QueryInfo';
}
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
proto.xcalar.compute.localtypes.Query.ListResponse = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.xcalar.compute.localtypes.Query.ListResponse.repeatedFields_, null);
};
goog.inherits(proto.xcalar.compute.localtypes.Query.ListResponse, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.xcalar.compute.localtypes.Query.ListResponse.displayName = 'proto.xcalar.compute.localtypes.Query.ListResponse';
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
proto.xcalar.compute.localtypes.Query.ListRequest.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Query.ListRequest.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Query.ListRequest} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Query.ListRequest.toObject = function(includeInstance, msg) {
  var f, obj = {
    namePattern: jspb.Message.getFieldWithDefault(msg, 1, "")
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
 * @return {!proto.xcalar.compute.localtypes.Query.ListRequest}
 */
proto.xcalar.compute.localtypes.Query.ListRequest.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Query.ListRequest;
  return proto.xcalar.compute.localtypes.Query.ListRequest.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Query.ListRequest} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Query.ListRequest}
 */
proto.xcalar.compute.localtypes.Query.ListRequest.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setNamePattern(value);
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
proto.xcalar.compute.localtypes.Query.ListRequest.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Query.ListRequest.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Query.ListRequest} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Query.ListRequest.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getNamePattern();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
};


/**
 * optional string name_pattern = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Query.ListRequest.prototype.getNamePattern = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.xcalar.compute.localtypes.Query.ListRequest} returns this
 */
proto.xcalar.compute.localtypes.Query.ListRequest.prototype.setNamePattern = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};





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
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Query.QueryInfo.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Query.QueryInfo} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.toObject = function(includeInstance, msg) {
  var f, obj = {
    name: jspb.Message.getFieldWithDefault(msg, 1, ""),
    millisecondsElapsed: jspb.Message.getFieldWithDefault(msg, 2, 0),
    state: jspb.Message.getFieldWithDefault(msg, 3, "")
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
 * @return {!proto.xcalar.compute.localtypes.Query.QueryInfo}
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Query.QueryInfo;
  return proto.xcalar.compute.localtypes.Query.QueryInfo.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Query.QueryInfo} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Query.QueryInfo}
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setName(value);
      break;
    case 2:
      var value = /** @type {number} */ (reader.readUint64());
      msg.setMillisecondsElapsed(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setState(value);
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
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Query.QueryInfo.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Query.QueryInfo} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getName();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getMillisecondsElapsed();
  if (f !== 0) {
    writer.writeUint64(
      2,
      f
    );
  }
  f = message.getState();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string name = 1;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.getName = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.xcalar.compute.localtypes.Query.QueryInfo} returns this
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.setName = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * optional uint64 milliseconds_elapsed = 2;
 * @return {number}
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.getMillisecondsElapsed = function() {
  return /** @type {number} */ (jspb.Message.getFieldWithDefault(this, 2, 0));
};


/**
 * @param {number} value
 * @return {!proto.xcalar.compute.localtypes.Query.QueryInfo} returns this
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.setMillisecondsElapsed = function(value) {
  return jspb.Message.setProto3IntField(this, 2, value);
};


/**
 * optional string state = 3;
 * @return {string}
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.getState = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * @param {string} value
 * @return {!proto.xcalar.compute.localtypes.Query.QueryInfo} returns this
 */
proto.xcalar.compute.localtypes.Query.QueryInfo.prototype.setState = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.xcalar.compute.localtypes.Query.ListResponse.repeatedFields_ = [1];



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
proto.xcalar.compute.localtypes.Query.ListResponse.prototype.toObject = function(opt_includeInstance) {
  return proto.xcalar.compute.localtypes.Query.ListResponse.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.xcalar.compute.localtypes.Query.ListResponse} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Query.ListResponse.toObject = function(includeInstance, msg) {
  var f, obj = {
    queriesList: jspb.Message.toObjectList(msg.getQueriesList(),
    proto.xcalar.compute.localtypes.Query.QueryInfo.toObject, includeInstance)
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
 * @return {!proto.xcalar.compute.localtypes.Query.ListResponse}
 */
proto.xcalar.compute.localtypes.Query.ListResponse.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.xcalar.compute.localtypes.Query.ListResponse;
  return proto.xcalar.compute.localtypes.Query.ListResponse.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.xcalar.compute.localtypes.Query.ListResponse} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.xcalar.compute.localtypes.Query.ListResponse}
 */
proto.xcalar.compute.localtypes.Query.ListResponse.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = new proto.xcalar.compute.localtypes.Query.QueryInfo;
      reader.readMessage(value,proto.xcalar.compute.localtypes.Query.QueryInfo.deserializeBinaryFromReader);
      msg.addQueries(value);
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
proto.xcalar.compute.localtypes.Query.ListResponse.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.xcalar.compute.localtypes.Query.ListResponse.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.xcalar.compute.localtypes.Query.ListResponse} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.xcalar.compute.localtypes.Query.ListResponse.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getQueriesList();
  if (f.length > 0) {
    writer.writeRepeatedMessage(
      1,
      f,
      proto.xcalar.compute.localtypes.Query.QueryInfo.serializeBinaryToWriter
    );
  }
};


/**
 * repeated QueryInfo queries = 1;
 * @return {!Array<!proto.xcalar.compute.localtypes.Query.QueryInfo>}
 */
proto.xcalar.compute.localtypes.Query.ListResponse.prototype.getQueriesList = function() {
  return /** @type{!Array<!proto.xcalar.compute.localtypes.Query.QueryInfo>} */ (
    jspb.Message.getRepeatedWrapperField(this, proto.xcalar.compute.localtypes.Query.QueryInfo, 1));
};


/**
 * @param {!Array<!proto.xcalar.compute.localtypes.Query.QueryInfo>} value
 * @return {!proto.xcalar.compute.localtypes.Query.ListResponse} returns this
*/
proto.xcalar.compute.localtypes.Query.ListResponse.prototype.setQueriesList = function(value) {
  return jspb.Message.setRepeatedWrapperField(this, 1, value);
};


/**
 * @param {!proto.xcalar.compute.localtypes.Query.QueryInfo=} opt_value
 * @param {number=} opt_index
 * @return {!proto.xcalar.compute.localtypes.Query.QueryInfo}
 */
proto.xcalar.compute.localtypes.Query.ListResponse.prototype.addQueries = function(opt_value, opt_index) {
  return jspb.Message.addToRepeatedWrapperField(this, 1, opt_value, proto.xcalar.compute.localtypes.Query.QueryInfo, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.xcalar.compute.localtypes.Query.ListResponse} returns this
 */
proto.xcalar.compute.localtypes.Query.ListResponse.prototype.clearQueriesList = function() {
  return this.setQueriesList([]);
};


goog.object.extend(exports, proto.xcalar.compute.localtypes.Query);