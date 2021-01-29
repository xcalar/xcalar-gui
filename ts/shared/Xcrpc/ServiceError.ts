type ServiceError = NetworkError | XcalarError | UnknownError;

interface NetworkError {
    type: ErrorType, httpStatus: number
}
interface XcalarError {
    type: ErrorType, status: number, error: string, response?: Object
}
interface UnknownError {
    type: ErrorType, error: string
}

enum ErrorType {
    SERVICE, // Deprecated, will be replaced by UNKNOWN
    UNKNOWN, XCALAR, NETWORK
}

import status = proto.xcalar.compute.localtypes.XcalarEnumType.Status;

/**
 * Parse the error from jsClient, and create service error object
 * @param err The error thrown from jsClient
 * @param responseParser Api specific function extracting extra error information from response message
 */
function parseError(err: any, responseParser?: (resp: Object) => Object): ServiceError {
    try {
        if (rawErrorCheck.isApiError(err)) {
            const respParser = responseParser || (() => null);
            return {
                type: ErrorType.XCALAR,
                status: err.status, error: err.error,
                response: respParser(err.response)
            };
        } else if (rawErrorCheck.isNetworkError(err)) {
            return { type: ErrorType.NETWORK, httpStatus: err.statusCode };
        } else {
            return { type: ErrorType.UNKNOWN, error: err.message || JSON.stringify(err) };
        }
    } catch(e) {
        return { type: ErrorType.UNKNOWN, error: e.message || JSON.stringify(e) };
    }
}

const rawErrorCheck = {
    isApiError: function(err: Object): err is { status: number, error: string, response?: Object } {
        return err != null && err.hasOwnProperty('status') && err.hasOwnProperty('error');
    },
    isNetworkError: function(err: Object): err is { statusCode: number } {
        return err != null &&
            (err.hasOwnProperty('name') && err['name'] === 'statusCode') &&
            err.hasOwnProperty('statusCode');
    }
};

function isNetworkError(error: ServiceError): error is NetworkError {
    return error != null && error.type === ErrorType.NETWORK;
}

function isXcalarError(error: ServiceError): error is XcalarError {
    return error != null && error.type === ErrorType.XCALAR;
}

export { ServiceError, UnknownError, ErrorType, parseError, isNetworkError, isXcalarError, status };