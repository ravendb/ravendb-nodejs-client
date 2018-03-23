import * as request from "request";
import * as requestPromise from "request-promise";

export type HttpRequestBase = request.UriOptions & requestPromise.RequestPromiseOptions;
export type HttpResponse = request.Response;
