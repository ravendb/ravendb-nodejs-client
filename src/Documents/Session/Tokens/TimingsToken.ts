import * as StringBuilder from "string-builder";
import { QueryToken } from "./QueryToken";

export class TimingsToken extends QueryToken {
     private constructor() {
         super();
     }

    public static instance: TimingsToken = new TimingsToken();

    public writeTo(writer: StringBuilder): void {
        writer.append("timings()");
    }
}
