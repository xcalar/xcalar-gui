// ExpServer side
import * as xcConsole from "../utils/expServerXcConsole.js";
import socket from "./socket";
import { ClusterLambdaApiStatusCode } from "../../../assets/js/cloudEnums.js";
var request = require('request-promise-native');

class CloudManager {
    private _numCredits: number = null;
    private _updateCreditsInterval: NodeJS.Timer;
    private _updateCreditsTime: number = 1 * 60 * 1000; // check every minute
    // XXX do not change _updateCreditsTime - it is synced with AWS Lambda
    private _userName: string;
    private _instanceId: string;
    private _awsURL: string = process.env.XCE_SAAS_MAIN_LAMBDA_URL || "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod"; // XXX temporary
    private _stopClusterMessageSent: boolean = false;
    private _lowCreditWarningSent: boolean = false;
    private _clusterPrice: number = null;

    public setup(userName: string, instanceId: string): void {
        this._userName = userName;
        this._instanceId = instanceId;
        this.checkCluster(); // to get cluster price
        this._fetchCredits();
        this._updateCredits();
    }

    /**
     * Stop the running cluster
     * @param repeatTry
     */
    public async stopCluster(repeatTry?: boolean): Promise<any> {
        xcConsole.log("stop cluster");
        try {
            const data: { status: number } = await request.post({
                url: this._awsURL + "/cluster/stop",
                body: this._getBody(),
                json: true
            });
            xcConsole.log("cluster shutting down", data);
            if (!repeatTry && (!data || data.status !== ClusterLambdaApiStatusCode.OK)) {
                return this.stopCluster(true);
            } else {
                return data;
            }
        } catch (e) {
            if (!repeatTry) {
                return this.stopCluster(true);
            } else {
                xcConsole.log("retry stop cluster fails, stop deduct credits");
                clearTimeout(this._updateCreditsInterval);
            }
            return { error: e };
        }
    }

    /**
     * used to check status, isPending,and clusterUrl properties
     */
    public async checkCluster(): Promise<any> {
        try {
            const data = request.post({
                url: this._awsURL + "/cluster/get",
                body: this._getBody(),
                json: true
            });
            if (data && data.clusterPrice) {
                this._clusterPrice = data.clusterPrice;
            }
            return data;
        } catch (e) {
            return { error: e };
        }
    }

    /**
     * get lambda url for cluster, billing, s3, etc
     */
    public getApiUrl(): string {
        return this._awsURL;
    }

    public getNumCredits(): number {
        return this._numCredits;
    }

    public async logout(): Promise<any> {
        try {
            let authLambdaUrl = process.env.XCE_SAAS_AUTH_LAMBDA_URL;
            authLambdaUrl.replace(/\/$/, "");
            authLambdaUrl += "/logout";
            let logoutResult = await request.get(authLambdaUrl);
            return logoutResult
        } catch (e) {
            return { error: e };
        }
    }

    // should only be called once in constructor and then recursively, otherwise
    // user's credits will be deducted unnecessarily
    // deducts credits, gets credits, and calls _updateCredits which calls itself
    private async _updateCredits(): Promise<void> {
        clearTimeout(this._updateCreditsInterval);
        if (!this._userName) {
            this._updateCreditsInterval = setTimeout(() => {
                this._updateCredits();
            }, this._updateCreditsTime);
            return;
        }
        try {
            await this._deductCredits();
        } catch (e) {
            xcConsole.error("deduct credits error", e.error);
        }

        try {
            await this._fetchCredits();
        } catch (e) {
            xcConsole.error("fetch credits error", e);
        }
        this._updateCreditsInterval = setTimeout(() => {
            this._updateCredits();
        }, this._updateCreditsTime);
    }

    private async _deductCredits(): Promise<void> {
        try {
            let res = await request.post({
                url: this._awsURL + "/billing/deduct",
                body: this._getBody(),
                json: true
            });
            if (res && res.status !== ClusterLambdaApiStatusCode.OK) {
                xcConsole.error("deduct credits error", res);
            }
            return res;
        } catch (e) {
            xcConsole.error(e);
            return e;
        }
    }

    private async _fetchCredits(): Promise<number> {
        try {
            const data: { status: number, credits: number } = await request.post({
                url: this._awsURL + "/billing/get",
                body: this._getBody(),
                json: true
            });
            let credits: number = null;
            if (data && data.status !== ClusterLambdaApiStatusCode.OK) {
                xcConsole.error("fetch credits error", data);
            } else if (data && data.credits != null) {
                credits = data.credits;
            }
            this._numCredits = credits;
            this._checkCreditsWarning();
            return credits;
        } catch (e) {
            xcConsole.error(e);
            return null;
        }
    }
    // shuts down cluster if credits == 0, or sends socket warning if
    // 1.5 minutes remain
    private _checkCreditsWarning(): void {
        if (this._isOutOfCredits() && !this._stopClusterMessageSent) {
            this._stopClusterMessageSent = true;
            socket.logoutMessage({
                type: "noCredits"
            });
            this.stopCluster();
            this.logout();
        } else {
            this._stopClusterMessageSent = false;
            if (this._isLowOnCredits() && !this._lowCreditWarningSent) {
                this._lowCreditWarningSent = true;
                socket.lowCreditWarning();
            } else {
                this._lowCreditWarningSent = false;
            }
        }
    }

    private _isLowOnCredits(): boolean {
        return (!isNaN(this._numCredits) &&
            this._clusterPrice &&
            this._numCredits < (1.5 * this._clusterPrice));
    }

    private _isOutOfCredits(): boolean {
        return (!isNaN(this._numCredits) &&
            (typeof this._numCredits === "number") &&
            this._numCredits <= 0);
    }

    private _getBody(): {username: string, instanceId: string} {
        return {
            "username": this._userName,
            "instanceId": this._instanceId
        };
    }
}

export default new CloudManager();
