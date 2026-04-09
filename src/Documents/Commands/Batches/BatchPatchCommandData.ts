import { CommandType, ICommandData } from "../CommandData.js";
import { CaseInsensitiveStringSet } from "../../../Primitives/CaseInsensitiveStringSet.js";
import { PatchRequest } from "../../Operations/PatchRequest.js";
import { throwError } from "../../../Exceptions/index.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";

export interface IdAndChangeVector {
    id: string;
    changeVector: string;
}

/**
 * Commands that patches multiple documents using same patch script
 * CAUTION: This command does not update session state after .saveChanges() call
 */
export class BatchPatchCommandData implements ICommandData {
    private readonly _seenIds: Set<string> = CaseInsensitiveStringSet.create();
    private readonly _ids: IdAndChangeVector[] = [];
    private readonly _name: string = null;
    private readonly _patch: PatchRequest;
    private readonly _patchIfMissing: PatchRequest;

    public constructor(patch: PatchRequest, patchIfMissing: PatchRequest, ...ids: string[]);
    public constructor(patch: PatchRequest, patchIfMissing: PatchRequest, ...ids: IdAndChangeVector[]);
    public constructor(patch: PatchRequest, patchIfMissing: PatchRequest, ...ids: (IdAndChangeVector | string)[]) {
        if (!patch) {
            throwError("InvalidArgumentException", "Patch cannot be null.");
        }

        if (arguments.length >= 3) {
            if (!ids) {
                throwError("InvalidArgumentException", "Ids cannot be null.");
            }

            if (ids.length === 0) {
                throwError("InvalidArgumentException", "Value cannot be an empty collection.");
            }

            for (const idEntry of ids) {
                if (TypeUtil.isObject(idEntry)) {
                    const { id, changeVector } = idEntry as IdAndChangeVector;
                    this._add(id, changeVector);
                } else {
                    this._add(idEntry as string);
                }
            }
        }

        this._patch = patch;
        this._patchIfMissing = patchIfMissing;
    }

    private _add(id: string, changeVector?: string): void {
        if (StringUtil.isNullOrWhitespace(id)) {
            throwError("InvalidArgumentException", "Value cannot be null or whitespace.");
        }

        if (this._seenIds.has(id)) {
            throwError("InvalidOperationException",
                "Could not add ID '" + id + "' because item with the same ID was already added");
        }

        this._seenIds.add(id);

        this._ids.push({ id, changeVector });
    }

    public get ids() {
        return this._ids;
    }

    public get id(): string {
        return throwError("NotSupportedException");
    }

    public get name(): string {
        return this._name;
    }

    public get patch(): PatchRequest {
        return this._patch;
    }

    public patchIfMissing(): PatchRequest {
        return this._patchIfMissing;
    }

    public get changeVector(): string {
        return throwError("NotSupportedException");
    }

    public get type(): CommandType {
        return "BatchPATCH";
    }

    public serialize(conventions: DocumentConventions): object {
        const ids = this._ids.map(x => ({
            Id: x.id,
            ChangeVector: x.changeVector || undefined
        }));

        return {
            Ids: ids,
            Patch: this.patch.serialize(conventions),
            Type: "BatchPATCH",
            PatchIfMissing: this._patchIfMissing
                ? this._patchIfMissing.serialize(conventions)
                : undefined
        };
   }
}
