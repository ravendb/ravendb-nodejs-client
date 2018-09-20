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
     * @return Response result as JSON.
     */
    public get result(): string {
        return this._result;
    }

    /**
     * @param result Response result as JSON.
     */
    public set result(result: string) {
        this._result = result;
    }

    /**
     * @return Request headers.
     */
    public get headers(): { [key: string]: string } {
        return this._headers;
    }

    /**
     * @param headers Request headers.
     */
    public set headers(headers: { [key: string]: string }) {
        this._headers = headers;
    }

    /**
     * @return Response HTTP status code.
     */
    public get statusCode(): number {
        return this._statusCode;
    }
    /**
     * @param statusCode Response HTTP status code.
     */
    public set statusCode(statusCode) {
        this._statusCode = statusCode;
    }

    /**
     * @return Indicates if request should be retried (forced).
     */
    public get forceRetry(): boolean {
        return this._forceRetry;
    }
    /**
     * @param forceRetry Indicates if request should be retried (forced).
     */
    public set forceRetry(forceRetry) {
        this._forceRetry = forceRetry;
    }

    /**
     * @return Method used to check if request has errors.
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
