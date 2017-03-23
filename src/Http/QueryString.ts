import {StringUtil} from "../Utility/StringUtil";

export class QueryString {
  public static encode(string: string, isSlashReserved: boolean = false) {
    const reserved = '%:=&?~#+!$,;\\\'*[]' + (isSlashReserved ? '/' : '');

    return string.split('').map((char: string) => !~reserved
      .indexOf(char) ? char : encodeURIComponent(char)).join('');
  }

  public static stringify(params: Object): string {
    let result: string[] = [];

    const render = (param: string, value: any): string => StringUtil
      .format('{0}={1}', this.encode(param), this.encode(value.toString()));

    for (let param in params) {
      let value = params[param];

      if (null === value) {
        result.push(param);
      } else if (Array.isArray(value)) {
        (value as any[]).forEach((item: any) => result.push(render(param, item)));
      } else {
        result.push(render(param, value));
      }
    }

    return result.join('&');
  }
}