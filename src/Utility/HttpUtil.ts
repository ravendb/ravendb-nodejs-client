import { Response as HttpResponse } from "request";
import { HEADERS} from "../Constants";
import { IncomingHttpHeaders } from "http";
import { throwError } from "../Exceptions";
import { Caseless } from "caseless";

export function getRequiredEtagHeader(response: HttpResponse) {
    let etagHeader = response.caseless.get(HEADERS.ETAG);
    if (!etagHeader) {
        throwError("InvalidOperationException", "Response did't had an ETag header");
    }

    if (Array.isArray(etagHeader)) {
        etagHeader = etagHeader[0];
    }

    return etagHeaderToChangeVector(etagHeader);
}

export function getEtagHeader(responseOrHeaders: HttpResponse | IncomingHttpHeaders | object): string {
    let responseHeaders: Caseless;
    if ("headers" in (responseOrHeaders as any)) {
        responseHeaders = (responseOrHeaders as HttpResponse).caseless;
    }

    if (HEADERS.ETAG in responseOrHeaders) {
        return responseOrHeaders[HEADERS.ETAG];
    }

    const headers = responseHeaders.get(HEADERS.ETAG);
    return Array.isArray(headers)
        ? headers[0]
        : (headers || null);
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
    const headers = response.caseless;
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
    response.emit("end");
}

export class HeadersBuilder {

    private _result: { [key: string]: string } = {};

    public static create() {
        return new HeadersBuilder();
    }

    public withContentTypeJson() {
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