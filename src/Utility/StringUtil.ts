import {TypeUtil} from "./TypeUtil";
import {InvalidOperationException} from "../Database/DatabaseExceptions";

export class StringUtil {
  public static format(string: string, vars?: object | any, ...varsArray: any[]): string {
    if (TypeUtil.isObject(vars)) {
      return string.replace(
        /\{([\w\d\-]+)\}/g,
        (match: string, placeholder: string): string =>
          ((placeholder in vars) ? vars[placeholder] : '').toString()
      );
    }

    let inputVars: any[] = [vars].concat(varsArray);

    return string.replace(
      /\{([\d]+)\}/g,
      (match: string, placeholder: string): string => {
        let value: any = inputVars[parseInt(placeholder)];
        
        return (TypeUtil.isNone(value) ? '' : value).toString()
    });
  }

  public static validateDBName(dbName?: string): void {
    if (TypeUtil.isNone(dbName) || !dbName) {
      throw new InvalidOperationException('Empty name is not valid');
    }

    if (!/^[A-Za-z0-9_\-\.]+$/.test(dbName)) {
      throw new InvalidOperationException('Database name can only contain only A-Z, a-z, \"_\", \".\" or \"-\"');
    }
  }

  public static capitalize(string: string): string {
    return string.charAt(0).toUpperCase() + string.substring(1);
  }

  public static uncapitalize(string: string): string {
    return string.charAt(0).toLowerCase() + string.substring(1);
  }
}