import * as XRegExp from "xregexp";
import {TypeUtil} from "./TypeUtil";
import {InvalidOperationException} from "../Database/DatabaseExceptions";

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
      throw new InvalidOperationException('Empty name is not valid');
    }

    if (!/^[A-Za-z0-9_\-\.]+$/.test(dbName)) {
      throw new InvalidOperationException('Database name can only contain only A-Z, a-z, \"_\", \".\" or \"-\"');
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
        if (!this.isLetter(c) && !['_', '@'].includes(c)) {
          escape = true;
          break;
        }

        continue;
      }

      if (!this.isLetterOrDigit(c) && !['_', '@', '.', '[', ']'].includes(c)) {
        escape = true;
        break;
      }
    }

    if (escape) {
      return `'${field}'`;
    }

    return field;
  }

  public static capitalize(string: string): string {
    return string.charAt(0).toUpperCase() + string.substring(1);
  }

  public static uncapitalize(string: string): string {
    return string.charAt(0).toLowerCase() + string.substring(1);
  }

  public static isCharacter(character: string) {
    return character && (1 === character.length);
  }

  public static isDigit(character: string) {
    return this.isCharacter(character)
      && this.digitRe.test(character);
  }

  public static isLetter(character: string) {
    return this.isCharacter(character)
      && this.letterRe.test(character);
  }

  public static isLetterOrDigit(character: string) {
    return this.isLetter(character)
      || this.isDigit(character);
  }
}