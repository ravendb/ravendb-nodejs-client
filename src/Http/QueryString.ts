import {StringUtil} from "../Utility/StringUtil";
export class QueryString {
  public static stringify(params: Object): string {
    let result: string[] = [];

    const render = (param: string, value: any): string => StringUtil
      .format('{0}={1}', encodeURIComponent(param),
        encodeURIComponent(value.toString())
      );

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