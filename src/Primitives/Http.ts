import * as request from "request";

export type HttpRequestParameters = request.UriOptions & request.CoreOptions;
export type HttpRequestParametersWithoutUri = request.CoreOptions;
export type HttpResponse = request.Response;
export type HttpRequest = request.Request;
