import { Stream } from "stream";

export class StringBuilder {
    private s: any[] = [];
    private readonly newline: string;

    public constructor(v?: any) {
        this.append(v);

        Stream.call(this);

        const isWindows = process.platform === "win32";
        this.newline = isWindows ? "\r\n" : "\n";
    }

    public append(v: any) {
        // tslint:disable-next-line:triple-equals
        if (v != null) {
            this.s.push(v);
        }

        return this;
    }

    public appendLine(v: any) {
        this.s.push(this.newline);

        // tslint:disable-next-line:triple-equals
        if (v != null) {
            this.s.push(v);
        }

        return this;
    }

    public clear() {
        this.s.length = 0;
    }

    public toString() {
        return this.s.length === 0 ? "" : this.s.join("");
    }
}
