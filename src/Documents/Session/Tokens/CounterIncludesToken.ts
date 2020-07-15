import { QueryToken } from "./QueryToken";
import * as StringBuilder from "string-builder";

export class CounterIncludesToken extends QueryToken {
     private _sourcePath: string;
    private readonly _counterName: string;
    private readonly _all: boolean;

    private constructor(
        sourcePath: string, counterName: string, all: boolean) {
        super();
        this._counterName = counterName;
        this._all = all;
        this._sourcePath = sourcePath;
    }
     public static create(sourcePath: string, counterName: string): CounterIncludesToken {
        return new CounterIncludesToken(sourcePath, counterName, false);
    }
     public static all(sourcePath: string): CounterIncludesToken {
        return new CounterIncludesToken(sourcePath, null, true);
    }
     public addAliasToPath(alias: string): void {
        this._sourcePath = !this._sourcePath ?
                alias
                : alias + "." + this._sourcePath;
    }

    public writeTo(writer: StringBuilder): void {
        writer.append("counters(");
        if (this._sourcePath) {
            writer.append(this._sourcePath);
            if (!this._all) {
                writer.append(", ");
            }
        }
        
        if (!this._all) {
            writer
                .append("$")
                .append(this._counterName);
        }

        writer.append(")");
    }
}
