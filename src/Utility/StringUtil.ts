import * as XRegExp from "xregexp";
import { TypeUtil } from "./TypeUtil";
import { throwError } from "../Exceptions";
import * as changeCase from "change-case";
import { CasingConvention } from "./ObjectUtil";
import { StringBuilder } from "./StringBuilder";

export class StringUtil {
    private static readonly letterRe: RegExp = XRegExp("^\\p{L}$") as RegExp;
    private static readonly digitRe: RegExp = /\d/;

    public static leftPad(s: string, length: number, char: string) {
        const inputLength = s ? s.length : 0;
        if (inputLength === length) {
            // no need for padding
            return s;
        }
        return char.repeat(length - inputLength) + s;
    }

    public static toWebSocketPath(url: string) {
        return url
            .replace("https://", "wss://")
            .replace("http://", "ws://");
    }

    public static format(s: string, vars?: object | any, ...varsArray: any[]): string {
        if (TypeUtil.isObject(vars)) {
            return s.replace(
                /\{([\w\d-]+)\}/g,
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

        if (!/^[A-Za-z0-9_\-.]+$/.test(dbName)) {
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

    public static isNullOrEmpty(s?: string): boolean {
        return !(s || "").length;
    }

    public static isNullOrWhitespace(s?: string): boolean {
        return !(s || "").trim().length;
    }

    public static changeCase(transformName: CasingConvention, s: string) {
        return changeCase[transformName](s);
    }

    public static equalsIgnoreCase(s1: string, s2: string) {
        const s1Type = typeof s1;
        const s2Type = typeof s2;
        return s1Type === s2Type
            && s1Type !== "undefined"
            && s2Type !== "undefined"
            && s1.toLowerCase() === s2.toLowerCase();
    }

    public static escapeString(builder: StringBuilder, value: string) {
        if (StringUtil.isNullOrWhitespace(value)) {
            return;
        }

        StringUtil._escapeStringInternal(builder, value);
    }

    private static _escapeStringInternal(builder: StringBuilder, value: string) {
        let escaped = JSON.stringify(value);

        escaped = escaped.replace(/'/g, "\\'");

        builder.append(escaped.substring(1, escaped.length - 1));
    }

    public static splice(input: string, start: number, delCount: number, newSubStr: string) {
        return input.slice(0, start) + newSubStr + input.slice(start + Math.abs(delCount));
    }
}
