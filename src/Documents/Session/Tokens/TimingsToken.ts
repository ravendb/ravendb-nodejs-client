import { QueryToken } from "./QueryToken";
import { StringBuilder } from "../../../Utility/StringBuilder";

export class TimingsToken extends QueryToken {
     private constructor() {
         super();
     }

    public static instance: TimingsToken = new TimingsToken();

    public writeTo(writer: StringBuilder): void {
        writer.append("timings()");
    }
}
