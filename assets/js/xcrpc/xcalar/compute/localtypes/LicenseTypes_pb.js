// source: xcalar/compute/localtypes/LicenseTypes.proto
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

goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.LicenseExpiryBehavior', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.LicensePlatform', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.LicenseProduct', null, global);
goog.exportSymbol('proto.xcalar.compute.localtypes.XcalarEnumType.LicenseProductFamily', null, global);
/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.LicensePlatform = {
  LIC_PLATFORM_ALL: 0,
  LIC_PLATFORM_LINUX_X64: 1,
  LIC_PLATFORM_MAC_OS: 2
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.LicenseProduct = {
  LIC_PRODUCT_ALL: 0,
  LIC_PRODUCT_XDP: 1,
  LIC_PRODUCT_XD_CE: 2,
  LIC_PRODUCT_XD_EE: 3
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.LicenseProductFamily = {
  LIC_PRODUCT_FAM_ALL: 0,
  LIC_PRODUCT_FAM_XDP: 1,
  LIC_PRODUCCT_FAM_XD: 2
};

/**
 * @enum {number}
 */
proto.xcalar.compute.localtypes.XcalarEnumType.LicenseExpiryBehavior = {
  LIC_EXPIRY_BEHAVIOR_WARN: 0,
  LIC_EXPIRY_BEHAVIOR_DISABLE: 1
};

goog.object.extend(exports, proto.xcalar.compute.localtypes.XcalarEnumType);
