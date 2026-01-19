import { BunTlsOptions } from "../Types/BunTypes.js";

export type HttpRequestParameters = RequestInit & {
  uri: string;
  fetcher?: any;
  tls?: BunTlsOptions;
};
export type HttpRequestParametersWithoutUri = RequestInit & {
  fetcher?: any;
  tls?: BunTlsOptions;
};
export type HttpResponse = Response;
export type HttpRequest = Request;
