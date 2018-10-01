import { StatusCodes } from "../../../Http/StatusCode";

export class GetResponse {
    public constructor() {
        this._headers = {};
    }

    private _headers: { [key: string]: string };
    private _result: string;
    private _statusCode: number;
    private _forceRetry;

    public static create(data: object) {
        return Object.assign(new GetResponse(), data);
    }

    /**
     * Response result as JSON.
     */
    public get result(): string {
        return this._result;
    }

    /**
     * Response result as JSON.
     */
    public set result(result: string) {
        this._result = result;
    }

    /**
     * Request headers.
     */
    public get headers(): { [key: string]: string } {
        return this._headers;
    }

    /**
     * Request headers.
     */
    public set headers(headers: { [key: string]: string }) {
        this._headers = headers;
    }

    /**
     * Response HTTP status code.
     */
    public get statusCode(): number {
        return this._statusCode;
    }
    /**
     * Response HTTP status code.
     */
    public set statusCode(statusCode) {
        this._statusCode = statusCode;
    }

    /**
     * Indicates if request should be retried (forced).
     */
    public get forceRetry(): boolean {
        return this._forceRetry;
    }
    /**
     * Indicates if request should be retried (forced).
     */
    public set forceRetry(forceRetry) {
        this._forceRetry = forceRetry;
    }

    /**
     * Method used to check if request has errors.
     */
    public requestHasErrors(): boolean {
        switch (this._statusCode) {
            case 0:
            case StatusCodes.Ok:
            case StatusCodes.Created:
            case StatusCodes.NonAuthoritativeInformation:
            case StatusCodes.NoContent:
            case StatusCodes.NotModified:
            case StatusCodes.NotFound:
                return false;
            default:
                return true;
        }
    }
}
