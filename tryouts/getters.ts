class StringUtil {
  public static format(string: string, vars?: object | any, ...varsArray: any[]): string {
    if (('object' === (typeof vars)) && !Array.isArray(vars)) {
      return string.replace(
        /\{([\w\d\-]+)\}/g,
        (match: string, placeholder: string): string =>
          (vars[placeholder] || '').toString()
      );
    }

    let inputVars: any[] = [vars].concat(varsArray);

    return string.replace(
      /\{([\d]+)\}/g,
      (match: string, placeholder: string): string =>
        (inputVars[parseInt(placeholder)] || '').toString()
    );
  }
}

class ObjectWithProps {
  constructor(
    private _prop: string = 'value',
    public publicProp = 'public'
  ) {}

  public get prop(): string {
    return this._prop;
  }
}

const literal = {prop: 'value', publicProp: 'public'};

console.log(StringUtil.format('Here is string {0} and number {1}', 'abcd', 1.5));

console.log(StringUtil.format('/get/{publicProp}/{prop}', literal));

console.log(StringUtil.format('/get/{publicProp}/{prop}', new ObjectWithProps()));

