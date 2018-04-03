export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export class RequestMethods {
  public static readonly Get: RequestMethod = "GET";
  public static readonly Post: RequestMethod = "POST";
  public static readonly Put: RequestMethod = "PUT";
  public static readonly Patch: RequestMethod = "PATCH";
  public static readonly Delete: RequestMethod = "DELETE";
  public static readonly Options: RequestMethod = "OPTIONS";
}