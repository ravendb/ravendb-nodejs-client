import {TypeUtil} from "../Utility/TypeUtil";

export class UriUtility {
  public static parseUrls(urls: string | string[]): string[] {
    return (TypeUtil.isArray(urls) ? <string[]>urls : [<string>urls])
      .reduce((accumulator: string[], iteratee: string | string[]): string[] =>
        accumulator.concat((TypeUtil.isArray(iteratee) ? <string[]>iteratee 
        : (<string>iteratee).split(/,|;/).map((url: string): string => url.trim())
        .filter((url: string): boolean => !!url))
      ), []);
  }

  public static isSecure(url: string): boolean {
    return 0 === url.toLowerCase().indexOf('https');
  }
}