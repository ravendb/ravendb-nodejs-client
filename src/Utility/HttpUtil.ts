import { Response as HttpResponse } from "request";
import { HEADERS} from "../Constants";
import { IncomingHttpHeaders } from "http";
import { throwError } from "../Exceptions";

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
    let etagHeaders: string[] | string;
    if ("caseless" in responseOrHeaders) {
        etagHeaders = (responseOrHeaders as HttpResponse).caseless.get(HEADERS.ETAG);
    } else if (HEADERS.ETAG in responseOrHeaders) {
        etagHeaders = (responseOrHeaders as IncomingHttpHeaders)[HEADERS.ETAG];
    } else if ("headers" in responseOrHeaders) {
        etagHeaders = responseOrHeaders["headers"][HEADERS.ETAG];
    } else {
        etagHeaders = null;
    }

    return Array.isArray(etagHeaders) ? etagHeaders[0] : (etagHeaders || null);
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
