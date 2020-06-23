import { Request, RequestInit, Response } from "node-fetch";

export type HttpRequestParameters = RequestInit & { uri: string };
export type HttpRequestParametersWithoutUri = RequestInit;
export type HttpResponse = Response;
export type HttpRequest = Request;
