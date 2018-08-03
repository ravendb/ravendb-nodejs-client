/// <reference path="./readable-stream.d.ts" />

declare module "xregexp" {
  const a: any;
  export = a; 
}

declare module "string-builder" {
    interface StringBuilder {
        new(): StringBuilder;
        append(s: string);
        toString(): string;
    }

    export = StringBuilder;
}

declare module "clarinet" {
    var _a: any;
    export = _a;
}