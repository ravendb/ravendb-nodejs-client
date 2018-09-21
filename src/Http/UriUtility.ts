import {TypeUtil} from "../Utility/TypeUtil";

export class UriUtility {
  public static parseUrls(urls: string | string[]): string[] {
    return (TypeUtil.isArray(urls) ? urls as string[] : [urls as string])
      .reduce((accumulator: string[], iteratee: string | string[]): string[] =>
        accumulator.concat((TypeUtil.isArray(iteratee) ? iteratee as string[] 
        : (iteratee as string).split(/,|;/).map((url: string): string => url.trim())
        .filter((url: string): boolean => !!url))
      ), []);
  }

  public static isSecure(url: string): boolean {
    return 0 === url.toLowerCase().indexOf("https");
  }
}
