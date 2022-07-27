import * as md5 from "md5";
import { TypeUtil } from "../../Utility/TypeUtil";
import { TypesAwareObjectMapper } from "../../Mapping/ObjectMapper";

const typeSignatures = {
    bigint: Buffer.from([1]),
    boolean: Buffer.from([2]),
    function: Buffer.from([3]),
    number: Buffer.from([4]),
    object: Buffer.from([5]),
    string: Buffer.from([6]),
    symbol: Buffer.from([7]),
    undefined: Buffer.from([8]),
};

export class HashCalculator {

    private _buffers: Buffer[] = [];

    public getHash(): string {
        return md5(Buffer.concat(this._buffers));
    }

    //TBD 4.1 public void Write(HighlightedField[] highlightedFields)

    public write(o: any, mapper?: TypesAwareObjectMapper) {
        if (TypeUtil.isNullOrUndefined(o)) {
            this._buffers.push(Buffer.from("null"));
            return;
        }
        
        // Push a byte that identifies the type, to differentiate strings, numbers, and bools
        this._buffers.push(typeSignatures[typeof o] || typeSignatures.undefined);

        if (typeof o === "number") {
            this._buffers.push(Buffer.from([o]));
        } else if (typeof o === "string") {
            this._buffers.push(Buffer.from(o));
        } else if (typeof o === "boolean") {
            this._buffers.push(Buffer.from(o ? [1] : [2]));
        } else if (Array.isArray(o)) {
            for (const item of o) {
                this.write(item, mapper);
            }
        } else if (typeof o === "object") {
            for (const key of Object.keys(o)) {
                this.write(key, mapper);
                this.write(o[key], mapper);
            }
        } else {
            this.write(mapper.toObjectLiteral(o), mapper);
        }
    }
}
