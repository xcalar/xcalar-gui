/* Sample.js
 * This file shows how to use the protobuf-based JS SDK in browser.
 */

// Create the client which is binding to a specific cluster
Xcrpc.createClient('DEFAULT', 'https://skywalker.int.xcalar.com:8443/app/service/xce');

// Get the pre-created client wherever you call a xcrpc service
const myClient = Xcrpc.getClient('DEFAULT');
try {
    // Call service and wait for the response
    const value = await myClient.getKVStoreService().lookup({
        keyName: 'myGlobalKey', kvScope: Xcrpc.KVStore.KVSCOPE.GLOBAL
    });
    // Succeed
    console.log(value);
} catch(error) {
    // Fail
    console.error(error);
}