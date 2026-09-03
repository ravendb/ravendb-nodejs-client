import { CdcColumnType } from "./CdcColumnType.js";

/**
 * Maps a source SQL column to a document property or attachment.
 * `type` is written to the wire only when it is not the implicit "Default".
 */
export class CdcColumnMapping {
    public column: string = null;
    public name: string = null;
    public type?: CdcColumnType;

    public toJSON() {
        const json: any = {
            column: this.column,
            name: this.name
        };

        if (this.type && this.type !== "Default") {
            json.type = this.type;
        }

        return json;
    }
}
