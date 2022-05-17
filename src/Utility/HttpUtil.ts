import { Response as HttpResponse } from "node-fetch"
import { HEADERS } from "../Constants";
import { IncomingHttpHeaders } from "http";
import { throwError } from "../Exceptions";

export function getRequiredEtagHeader(response: HttpResponse) {
    let etagHeader = response.headers.get(HEADERS.ETAG);
    if (!etagHeader) {
        throwError("InvalidOperationException", "Response did't had an ETag header");
    }

    if (Array.isArray(etagHeader)) {
        etagHeader = etagHeader[0];
    }

    return etagHeaderToChangeVector(etagHeader);
}

export function getEtagHeader(responseOrHeaders: HttpResponse | IncomingHttpHeaders | object): string {
    let etagHeaders: string[] | string;
    if ("headers" in responseOrHeaders) {
        etagHeaders = (responseOrHeaders as HttpResponse).headers.get(HEADERS.ETAG);
    } else if (HEADERS.ETAG in responseOrHeaders) {
        etagHeaders = (responseOrHeaders as IncomingHttpHeaders)[HEADERS.ETAG];
    } else if ("headers" in responseOrHeaders) {
        etagHeaders = responseOrHeaders["headers"][HEADERS.ETAG];
    } else {
        etagHeaders = null;
    }

    const singleHeader = Array.isArray(etagHeaders) ? etagHeaders[0] : (etagHeaders || null);

    return singleHeader ? etagHeaderToChangeVector(singleHeader) : null;
}

export function etagHeaderToChangeVector(responseHeader: string) {
    if (!responseHeader) {
        throwError("InvalidOperationException", "Response did't had an ETag header");
    }

    if (responseHeader.startsWith(`"`)) {
        return responseHeader.substring(1, responseHeader.length - 1);
    }

    return responseHeader;
}

export function getBooleanHeader(response: HttpResponse, header: string): boolean {
    const headers = response.headers;
    let headerVal: string | string[] = headers.get(header);
    if (headerVal && Array.isArray(headerVal)) {
        headerVal = (headerVal[0] || null);
    }

    return headerVal
        ? (headerVal as string).toLowerCase() === "true"
        : null;
}

export function getHeaders() {
    return HeadersBuilder.create();
}

export function closeHttpResponse(response: HttpResponse) {
    // node-fetch closes response for us - no action is required
}

export class HeadersBuilder {

    private _result: { [key: string]: string } = {};

    public static create() {
        return new HeadersBuilder();
    }

    public typeAppJson() {
        this._result["content-type"] = "application/json";
        return this;
    }

    public with(name: string, val: string) {
        this._result[name] = val;
        return this;
    }

    public build() {
        return this._result;
    }
}
