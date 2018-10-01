import { CommandType, ICommandData } from "../CommandData";
import { PatchRequest } from "../../Operations/PatchRequest";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../..";

export class PatchCommandData implements ICommandData {
    public id: string;
    public name: string = null;
    public changeVector: string;
    public patch: PatchRequest;
    public patchIfMissing: PatchRequest;
    public type: CommandType = "PATCH";

    constructor(id: string, changeVector: string, patch: PatchRequest, patchIfMissing: PatchRequest) {
        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        if (!patch) {
            throwError("InvalidArgumentException", "Patch cannot be null");
        }

        this.id = id;
        this.patch = patch;
        this.changeVector = changeVector;
        this.patchIfMissing = patchIfMissing;
    }

    public serialize(conventions: DocumentConventions): object {
        return {
            Id: this.id,
            ChangeVector: this.changeVector,
            Type: "PATCH" as CommandType,
            Patch: this.patch.serialize(conventions),
            PatchIfMissing: this.patchIfMissing ? this.patchIfMissing.serialize(conventions) : undefined
        };
    }
}
