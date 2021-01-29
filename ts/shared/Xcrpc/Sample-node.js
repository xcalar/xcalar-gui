/* Sample-node.js
 * This file shows how to use the protobuf-based JS SDK in NodeJS.
 */

 // Create the client which is binding to a specific cluster
require('xcalarsdk').createClient('DEFAULT', 'http://localhost:12124/service/xce');
// Alternatively, we can use the hacky way when porting XD code to expServer
// global.Xcrpc = require('xcalarsdk');
// Xcrpc.createClient('DEFAULT', 'https://localhost/app/service/xce');

// Get the pre-created client whenever you call a xcrpc service
const sdk = require('xcalarsdk');
const myClient = sdk.getClient('DEFAULT');
try {
    // Call service and wait for the response
    const value = await myClient.getKVStoreService().lookup({
        keyName: 'myGlobalKey', kvScope: sdk.KVStore.KVSCOPE.GLOBAL
    });

    // Succeed
    console.log(value);
} catch(error) {
    // Fail
    console.error(error);
}
