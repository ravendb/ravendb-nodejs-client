export class StringUtil {
  public static format(string: string, args?: Object, ...arrayArgs: any[]): string {
    let inputArgs: any[] | Object = args;

    if (!(inputArgs instanceof Object)) {
      inputArgs = [args].concat(arrayArgs);
    }

    return string.replace(
      /\{([\w\d\-]+)\}/g,
      (match: string, placeholder: string): string =>
        (inputArgs[placeholder] || '').toString()
    );
  }
}