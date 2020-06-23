import { Request, RequestInit, Response } from "node-fetch";
import { AgentOptions } from "http";

export type HttpRequestParameters = RequestInit & { uri: string; agentOptions?: AgentOptions };
export type HttpRequestParametersWithoutUri = RequestInit;
export type HttpResponse = Response;
export type HttpRequest = Request;
