import * as xcConsole from "../utils/expServerXcConsole";
import * as jsdom from "jsdom/lib/old-api";
import * as request from "request";
import * as jwt from "jsonwebtoken";
import jwkToPem = require("jwk-to-pem")
import NodeCache = require("node-cache");

interface ReturnMsg {
    status: boolean,
    data: any,
    url?: string,
    error?: any,
    message?: string
}

class AuthManager {
    private static _instance = null;
    public static get getInstance(): AuthManager {
        return this._instance || (this._instance = new this());
    }

    private _b2cEnabled: boolean;
    private _msKeyCache: NodeCache;
    private readonly _msAzureCE2Url: string = 'https://login.microsoftonline' +
        '.com/common/v2.0/.well-known/openid-configuration';
    private readonly _msAzureB2CUrl: string = 'https://login.microsoftonline' +
        '.com/fabrikamb2c.onmicrosoft.com/v2.0/.well-known/openid-configuration' +
        '?p=b2c_1_sign_in';

    private jQuery: any;

    private constructor() {
        this._b2cEnabled = false;
        this._msKeyCache = new NodeCache( { stdTTL:86400, checkperiod: 21600 } );

        jsdom.env("", (err, window) => {
            if (err) {
                xcConsole.error('require in auth', err);
                return;
            }
            this.jQuery = require("jquery")(window);
        });
    }

    private getUrl(url: string): Promise<ReturnMsg> {
        let deferred: any = this.jQuery.Deferred();
        let retMsg: ReturnMsg = { status: false, url: url, data: null,
                                    error: null };

        request.get(url, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                retMsg.data = JSON.parse(body);
                retMsg.status = true;
                deferred.resolve(retMsg);
            } else {
                retMsg.error = error;
                deferred.reject(retMsg);
            }
        });

        return deferred.promise();
    }

    private getError(data: ReturnMsg): Promise<ReturnMsg> {
        let deferred: any = this.jQuery.Deferred();
        xcConsole.error("Key URL not found or returned unexpected data: " +
                            data.url);
        deferred.reject(data)
        return deferred.promise();
    }

    private passData(data: ReturnMsg): Promise<ReturnMsg> {
        let deferred: any = this.jQuery.Deferred();
        deferred.resolve(data)
        return deferred.promise();
    }

    private getKeys(outKid: string): Promise<ReturnMsg> {
        let deferred: any = this.jQuery.Deferred();
        let retMsg: ReturnMsg = { status: false, data: null, message: 'Failure' };
        let msAzureUrl: string = (this._b2cEnabled) ? this._msAzureB2CUrl
                                                    : this._msAzureCE2Url;

        this.getUrl(msAzureUrl)
        .then((urlData) => {
            if (urlData.data.jwks_uri) {
                return(this.getUrl(urlData.data.jwks_uri));
            }
            urlData.status = false;
            return(this.getError(urlData));
        }, (data) => {
            return(this.getError(data));
        })
        .then((urlData) => {
            if (urlData.data !== null && urlData.data.hasOwnProperty('keys')) {
                for (let i: number = 0; i < urlData.data.keys.length; i++) {
                    let b: Buffer = Buffer.from(jwkToPem(urlData.data.keys[i]));
                    this._msKeyCache.set(urlData.data.keys[i].kid, b);
                    if (urlData.data.keys[i].kid === outKid) {
                        xcConsole.log("found key for key id: " + outKid);
                        retMsg = { status: true, data: b, message: 'success' };
                    }
                }
                if (retMsg.status) {
                    deferred.resolve(retMsg);
                    return;
                }

                retMsg = { status: false,
                        data: urlData.data,
                        message: 'Key not present in returned keys'};
            } else if (urlData.data !== null) {
                retMsg = { status: false,
                        data: urlData.data,
                        message: 'Keys not found in retrieved for url: ' +
                                    urlData.url };
                if (urlData.error) {
                    retMsg.message += ' Error: ' + urlData.error.message;
                }
            } else {
                retMsg = { status: false,
                        data: null,
                        message: 'Key retrieval error for url: ' + urlData.url };
                if (urlData.error) {
                    retMsg.message += ' Error: ' + urlData.error.message;
                }
            }

            deferred.reject(retMsg);
            return;
        });

        return deferred.promise();
    }

    private retrieveKey(kid: string): Promise<ReturnMsg> {
        let deferred: any = this.jQuery.Deferred();
        let retMsg: ReturnMsg = { status: true, data: null, message: 'Success' };

        this._msKeyCache.get(kid, (err, data) => {
            if (err || data === undefined) {
                retMsg = { status: false,
                        data: data,
                        message: (data === undefined) ?
                        'Key not found in the cache' :
                        'Error retrieving data from the cache: ' + err.message };
                deferred.reject(retMsg);
            }

            retMsg.data = data;
            deferred.resolve(retMsg);
        });

        return deferred.promise();
    }

    enableB2C(enabled: boolean): void {
        this._b2cEnabled = enabled;
    }

    processToken(idToken: string): Promise<ReturnMsg> {
        let headerBuf: Buffer = Buffer.from(idToken.split('.')[0], 'base64');
        let header: any = JSON.parse(headerBuf.toString());
        let deferred: any = this.jQuery.Deferred();
        let retMsg: ReturnMsg = { status: true, message: 'Success', data: null };

        this.retrieveKey(header.kid)
        .then((msg) => {
            return(this.passData(msg));
        }, () => {
            return(this.getKeys(header.kid));
        })
        .always((msg) => {
            if (!msg.status) {
                msg.data = false;
                deferred.reject(msg);
                return;
            }

            jwt.verify(idToken, msg.data, {clockTolerance: 120},
                    (err, decoded) => {
                if (err) {
                    retMsg = {
                        status: false,
                        data: decoded,
                        message: "Error during web token verification: " +
                                    err.message
                    };
                    deferred.reject(retMsg);
                    return;
                }
                retMsg.data = decoded;
                deferred.resolve(retMsg);
            });
        });

        return deferred.promise();
    }
}
const authManager = AuthManager.getInstance;
export default authManager;