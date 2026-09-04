import { BunTlsOptions } from "../Types/BunTypes.js";

export type HttpRequestParameters = RequestInit & {
  uri: string;
  fetcher?: any;
  tls?: BunTlsOptions;
  /** Deno only: a Deno.HttpClient presenting the configured client certificate. */
  client?: unknown;
};
export type HttpRequestParametersWithoutUri = RequestInit & {
  fetcher?: any;
  tls?: BunTlsOptions;
  /** Deno only: a Deno.HttpClient presenting the configured client certificate. */
  client?: unknown;
};
export type HttpResponse = Response;
export type HttpRequest = Request;
