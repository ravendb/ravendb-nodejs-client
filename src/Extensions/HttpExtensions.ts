import { RequestPromise, RequestPromiseOptions } from "request-promise";
import { Promise as BluebirdPromise } from "bluebird";
import { UriOptions, Response as HttpResponse } from "request";
import { HEADERS, CONSTANTS } from "../Constants";
import { IncomingHttpHeaders } from "http";
import { throwError } from "../Exceptions/ClientErrors";

export function getRequiredEtagHeader(response: HttpResponse) {
    const headers = response.headers[HEADERS.ETAG];
    if (!headers || !headers.length || !headers[0]) {
        throwError("InvalidOperationException", "Response did't had an ETag header");
    }

    return etagHeaderToChangeVector(headers[0]);
}

export function getEtagHeader(responseOrHeaders: HttpResponse | IncomingHttpHeaders): string {
    let responseHeaders: IncomingHttpHeaders;
    if ((responseOrHeaders as any).headers) {
        responseHeaders = (responseOrHeaders as HttpResponse).headers;
    }

    const headers = responseHeaders[HEADERS.ETAG];
    return headers && headers.length && headers[0]
        ? headers[0]
        : null;
}

export function etagHeaderToChangeVector(responseHeader: string) {
    if (!responseHeader) {
        throwError("InvalidOperationException", "Response did't had an ETag header");
    }

    if (responseHeader.startsWith("\"")) {
        return responseHeader.substring(1);
    }

    return responseHeader;
}

export function getBooleanHeader(response: HttpResponse, header: string): boolean {
    const headers = response.headers;
    let headerVal: string | string[] = headers[header];
    if (headerVal && (headerVal as string[]).length) {
        headerVal = headerVal[0];
    }

    return headerVal 
        ? (headerVal as string).toLowerCase() === "true"
        : null;
}
