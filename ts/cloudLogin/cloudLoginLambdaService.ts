/**
 * CloudLoginLambdaService defines authentication, cluster, and billing api lambda calls
 * to be used by CloudLogin browser page
 *
 * All lambda methods to api calls via _sendRequest
 * _sendRequest is a wrapper around fetch
 *
 * The lambda methods can be separated into two parts:
 *
 * 1. Auth Lambda Api methods, make calls to _authApiUrl.
 * These methods include /status, /login and /logout
 *
 * 2. Main Lambda Api methods, make calls to _mainApiUrl.
 * These methods include /cluster/get, /cluster/start and /billing/get
 *
 * Xcalar SaaS REST API Reference:
 * https://xcalar.atlassian.net/wiki/spaces/EN/pages/62586901/Xcalar+SaaS+REST+API+Reference
 */
class CloudLoginLambdaService {
    private _authApiUrl: string;
    private _mainApiUrl: string;

    /**
     * Initialize lambda api urls
     */
    public setup(): void {
        this._authApiUrl = XCE_SAAS_AUTH_LAMBDA_URL;
        this._mainApiUrl = XCE_SAAS_MAIN_LAMBDA_URL;
    }

    /**
     * Send request to /status to check whether the user is logged in
     */
    public statusRequest(): XDPromise<any> {
        return this._sendRequest({
            apiUrl: this._authApiUrl,
            action: "/status",
            fetchParams: {
                credentials: 'include',
            }
        })
    }

    /**
     * Send request to /login to attempt to log in
     */
    public loginRequest(username: string, password: string): XDPromise<any> {
        // return PromiseHelper.resolve({sessionId: "test"})
        return this._sendRequest({
            apiUrl: this._authApiUrl,
            action: "/login",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    "username": username,
                    "password": password
                })
            }
        })
    }

    /**
     * Send request to /logout to attempt to log out (clear session)
     */
    public logoutRequest(): XDPromise<any> {
        return this._sendRequest({
            apiUrl: this._authApiUrl,
            action: "/logout",
            fetchParams: {
                credentials: 'include',
            }
        })
    }

    /**
     * Send request to /billing/get to get the number of credits remaining
     */
    public billingGetRequest(username: string): XDPromise<any> {
        // return PromiseHelper.resolve({
        //     status: ClusterLambdaApiStatusCode.OK,
        //     credits: 200
        // });
        return this._sendRequest({
            apiUrl: this._mainApiUrl,
            action: "/billing/get",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    "username": username
                }),
            }
        })
    }

    /**
     * Get the cluster state, e.g. running, pending, or terminated
     */
    public clusterGetRequest(username: string): XDPromise<any> {
        // return PromiseHelper.resolve({
        //     status: ClusterLambdaApiStatusCode.OK,
        //     isPending: true,
        //     isStarting: true,
        // })
        return this._sendRequest({
            apiUrl: this._mainApiUrl,
            action: "/cluster/get",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    "username": username
                }),
            }
        })
    }

    /**
     * Async call to deploy a cluster for the user based on the cluster size that he has selected.
     */
    public clusterStartRequest(
        username: string,
        selectedClusterSize: 'XS'|'S'|'M'|'L'|'XL'
    ): XDPromise<any> {
        return this._sendRequest({
            apiUrl: this._mainApiUrl,
            action: "/cluster/start",
            fetchParams: {
                headers: {
                    "Content-Type": "application/json",
                },
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    "username": username,
                    "clusterParams": {
                        "type": selectedClusterSize
                    }
                })
            }
        })
    }

    /**
     * Wrapper around fetch request
     * Gets fetch response and
     * resolves promise if response status is ok
     * rejects  promise if response status is not ok
     * @param apiUrl url of lambda
     * @param action path end of api url
     * @param fetchParams parameters passed to fetch
     */
    private _sendRequest(
        {apiUrl, action, fetchParams}:
        {apiUrl: string, action: string, fetchParams: object}
    ): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const url: string = `${apiUrl}${action}`;
        let statusCode: number;
        fetch(url, fetchParams)
        .then((res) => {
            statusCode = res.status;
            return res.json();
        })
        .then((res: any) => {
            if (
                statusCode === httpStatus.OK &&
                (!res.status || res.status === ClusterLambdaApiStatusCode.OK)
            ) {
                deferred.resolve(res);
            // TODO: remove this else if after Ted removes typo in /login response
            } else if (statusCode === httpStatus.Unauthorized && res.code !== "UserNotConfirmedException") {
                const error = (action === '/login') ? 'Incorrect email or password.' : 'Authentication error, please make sure your browser has enabled third-party cookies.';
                deferred.reject(error);
            } else {
                deferred.reject(res);
            }
        })
        .catch((e) => {
            deferred.reject(e);
        });

        return deferred.promise();
    }
}