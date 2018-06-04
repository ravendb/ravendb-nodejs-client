import * as XRegExp from "xregexp";
import {TypeUtil} from "./TypeUtil";
import {throwError} from "../Exceptions";

export class StringUtil {
  private static readonly letterRe: RegExp = XRegExp("^\\p{L}$") as RegExp;
  private static readonly digitRe: RegExp = /\d/;

  public static format(s: string, vars?: object | any, ...varsArray: any[]): string {
    if (TypeUtil.isObject(vars)) {
      return s.replace(
        /\{([\w\d\-]+)\}/g,
        (match: string, placeholder: string): string =>
          ((placeholder in vars) ? vars[placeholder] : "").toString()
      );
    }

    const inputVars: any[] = [vars].concat(varsArray);

    return s.replace(
      /\{([\d]+)\}/g,
      (match: string, placeholder: string): string => {
        const value: any = inputVars[parseInt(placeholder, 10)];
        
        return (TypeUtil.isNullOrUndefined(value) ? "" : value).toString();
    });
  }

  public static validateDBName(dbName?: string): void {
    if (TypeUtil.isNullOrUndefined(dbName) || !dbName) {
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
        if (!this.isLetter(c) && ["_", "@"].indexOf(c) === -1) {
          escape = true;
          break;
        }

        continue;
      }

      if (!this.isLetterOrDigit(c) && ["_", "@", ".", "[", "]"].indexOf(c) === -1) {
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

  public static isNullOrWhiteSpace(s?: string): boolean {
    return !(s || "").trim().length;
  }
}
