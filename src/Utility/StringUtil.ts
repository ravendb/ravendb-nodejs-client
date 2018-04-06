import * as XRegExp from "xregexp";
import {TypeUtil} from "./TypeUtil";
import {throwError} from "../Exceptions/ClientErrors";

export class StringUtil {
  private static readonly letterRe: RegExp = <RegExp>XRegExp("^\\p{L}$");
  private static readonly digitRe: RegExp = /\d/;

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
        
        return (TypeUtil.isNull(value) ? '' : value).toString()
    });
  }

  public static validateDBName(dbName?: string): void {
    if (TypeUtil.isNull(dbName) || !dbName) {
      throwError("InvalidOperationException", "Empty name is not valid");
    }

    if (!/^[A-Za-z0-9_\-\.]+$/.test(dbName)) {
      throwError("InvalidOperationException", `Database name can only contain only A-Z, a-z, "_", "." or "-"`);
    }
  }

  public static escapeIfNecessary(field: string): string {
    if (!field) {
      return field;
    }

    let escape: boolean = false;

    for (let i = 0; i < field.length; i++) {
      const c: string = field[i];

      if (i === 0) {
        if (!this.isLetter(c) && !['_', "@"].includes(c)) {
          escape = true;
          break;
        }

        continue;
      }

      if (!this.isLetterOrDigit(c) && !["_", "@", ".", "[", "]"].includes(c)) {
        escape = true;
        break;
      }
    }

    if (escape) {
      return `'${field}'`;
    }

    return field;
  }

  public static capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.substring(1);
  }

  public static uncapitalize(s: string): string {
    return s.charAt(0).toLowerCase() + s.substring(1);
  }

  public static isCharacter(character: string): boolean {
    return character && (1 === character.length);
  }

  public static isDigit(character: string): boolean {
    return this.isCharacter(character)
      && this.digitRe.test(character);
  }

  public static isLetter(character: string): boolean {
    return this.isCharacter(character)
      && this.letterRe.test(character);
  }

  public static isLetterOrDigit(character: string): boolean {
    return this.isLetter(character)
      || this.isDigit(character);
  }

  public static isNullOrWhiteSpace(string?: string): boolean {
    return !(string || "").trim().length;
  }
}