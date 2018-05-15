declare module "string-builder" {
    interface StringBuilder {
        new(): StringBuilder;
        append(s: string);
        toString(): string;
    }

    export = StringBuilder;
}
