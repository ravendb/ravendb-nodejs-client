import { DeleteCommandData } from "../CommandData.js";

export class DeletePrefixedCommandData extends DeleteCommandData {
    public constructor(prefix: string) {
        super(prefix);
    }

    protected _serializeExtraFields(resultingObject: object): void {
        resultingObject["IdPrefixed"] = true;
    }
}
