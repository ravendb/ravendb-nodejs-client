declare module "string-builder";

declare module "string-builder" {
    
    class StringBuilder {
        // new(init?: string): StringBuilder;
        constructor(init?: string);
        append(s: string);
        toString(): string;
    }

    namespace StringBuilder {}

    export = StringBuilder;
}
