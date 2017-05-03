import {TypeUtil} from "./TypeUtil";
import {InvalidOperationException} from "../Database/DatabaseExceptions";

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

  public static escape(string?: string, allowWildCards: boolean = false, makePhrase: boolean = false): string {
    const reservedChars: string[] = ['-', '&', '|', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', ':', '\\'];
    const wildCards: string[] = ['*', '?'];
    const spaces: string[] = [' ', '\t'];
    let buffer: string = '""';

    if (string) {
      let index: number, start: number = 0;
      let length: number = string.length;
      buffer = '';

      if ((length >= 2) && string.startsWith('//')) {
        buffer += '//';
        start = 2;
      }

      index = start;

      while (index < length) {
        const term: string = string[index];

        if (wildCards.includes(term) && allowWildCards) {
          index++;
          continue;
        }

        if (reservedChars.includes(term)) {
          if (index > start) {
            buffer += string.substring(start, index - start);
          }

          buffer += StringUtil.format('\\\\{0}', term);
          start = index + 1;
        } else if (spaces.includes(term) && makePhrase) {
          return StringUtil.format('"{0}"', this.escape(string, allowWildCards, false));
        }

        index++;
      }

      if (length > start) {
        buffer += string.substring(start, length - start);
      }
    }

    return buffer;
  }

  public static validateDBName(dbName?: string): void {
    if (TypeUtil.isNone(dbName) || !dbName) {
      throw new InvalidOperationException('Empty name is not valid');
    }

    if (!/^[A-Za-z0-9_\-\.]+$/.test(dbName)) {
      throw new InvalidOperationException('Database name can only contain only A-Z, a-z, \"_\", \".\" or \"-\"');
    }
  }

  public static ucFirst(string: string): string {
    return string.charAt(0).toUpperCase() + string.substring(1);
  }

  public static lcFirst(string: string): string {
    return string.charAt(0).toLowerCase() + string.substring(1);
  }
}