declare module "string-builder";

declare module "string-builder" {

    class StringBuilder {
        // new(init?: string): StringBuilder;
        constructor(init?: string);

        public append(s: string);

        public toString(): string;
    }

    namespace StringBuilder {
    }

    export = StringBuilder;
}
