import { HttpRequestParameters } from "../../Primitives/Http";
import { PatchRequest } from "./PatchRequest";
import { IOperation, OperationResultType } from "./OperationAbstractions";
import { PatchStatus } from "./PatchStatus";
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { IDocumentStore } from "../IDocumentStore";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { HttpCache } from "../../Http/HttpCache";
import { ServerNode } from "../../Http/ServerNode";
import { PatchResult } from "./PatchResult";
import * as stream from "readable-stream";
import { ObjectUtil } from "../../Utility/ObjectUtil";
import { ServerCasing, ServerResponse } from "../../Types";

export interface Payload {
    patch: PatchRequest;
    patchIfMissing: PatchRequest;
}

export class PatchOperationResult<TEntity> {
    public status: PatchStatus;
    public document: TEntity;
}

export class PatchOperation implements IOperation<PatchResult> {

    private readonly _id: string;
    private readonly _changeVector: string;
    private readonly _patch: PatchRequest;
    private readonly _patchIfMissing: PatchRequest;
    private readonly _skipPatchIfChangeVectorMismatch: boolean;

    public get resultType(): OperationResultType {
        return "PatchResult";
    }

    public constructor(
        id: string, changeVector: string, patch: PatchRequest);
    public constructor(
        id: string,
        changeVector: string,
        patch: PatchRequest,
        patchIfMissing: PatchRequest,
        skipPatchIfChangeVectorMismatch: boolean);
    public constructor(
        id: string,
        changeVector: string,
        patch: PatchRequest,
        patchIfMissing: PatchRequest = null,
        skipPatchIfChangeVectorMismatch: boolean = false) {

        if (!patch) {
            throwError("InvalidArgumentException", "Patch cannot be null");
        }

        if (!patch.script || !patch.script.trim()) {
            throwError("InvalidArgumentException", "Patch script cannot be null");
        }

        if (patchIfMissing && !patchIfMissing.script.trim()) {
            throwError("InvalidArgumentException", "PatchIfMissing script cannot be null");
        }

        this._id = id;
        this._changeVector = changeVector;
        this._patch = patch;
        this._patchIfMissing = patchIfMissing;
        this._skipPatchIfChangeVectorMismatch = skipPatchIfChangeVectorMismatch;

    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache,
        returnDebugInformation: boolean = false, test: boolean = false): RavenCommand<PatchResult> {
        return new PatchCommand(
            conventions,
            this._id,
            this._changeVector,
            this._patch,
            this._patchIfMissing,
            this._skipPatchIfChangeVectorMismatch,
            returnDebugInformation,
            test);
    }
}

export class PatchCommand extends RavenCommand<PatchResult> {
    private readonly _id: string;
    private readonly _changeVector: string;
    private readonly _patch: object;
    private readonly _skipPatchIfChangeVectorMismatch: boolean;
    private readonly _returnDebugInformation: boolean;
    private readonly _test: boolean;
    private _conventions: DocumentConventions;

    public constructor(
        conventions: DocumentConventions, id: string, changeVector: string,
        patch: PatchRequest, patchIfMissing: PatchRequest, skipPatchIfChangeVectorMismatch: boolean,
        returnDebugInformation: boolean, test: boolean) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!patch) {
            throwError("InvalidArgumentException", "Patch cannot be null");
        }

        if (!patch.script.trim()) {
            throwError("InvalidArgumentException", "Patch.Script cannot be null");
        }

        if (patchIfMissing && !patchIfMissing.script.trim()) {
            throwError("InvalidArgumentException", "PatchIfMissing.Script cannot be null");
        }

        if (!id) {
            throwError("InvalidArgumentException", "Id cannot be null");
        }

        this._id = id;
        this._changeVector = changeVector;
        this._patch = ObjectUtil.transformObjectKeys(
            conventions.objectMapper.toObjectLiteral({ patch, patchIfMissing }),
            {
                defaultTransform: "pascal",
                paths: [
                    {
                        transform: conventions.remoteEntityFieldNameConvention,
                        path: /Values/i
                    }
                ]
            });
        this._skipPatchIfChangeVectorMismatch = skipPatchIfChangeVectorMismatch;
        this._returnDebugInformation = returnDebugInformation;
        this._test = test;
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/docs?id=" + encodeURIComponent(this._id);

        if (this._skipPatchIfChangeVectorMismatch) {
            uri += "&skipPatchIfChangeVectorMismatch=true";
        }

        if (this._returnDebugInformation) {
            uri += "&debug=true";
        }

        if (this._test) {
            uri += "&test=true";
        }

        const body = JSON.stringify(this._patch);
        const req = {
            method: "PATCH",
            uri,
            headers: this._headers().typeAppJson().build(),
            body
        };

        this._addChangeVectorIfNotNull(this._changeVector, req);
        return req;
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body;
        const results= await this._pipeline<ServerCasing<ServerResponse<PatchResult>>>()
            .collectBody(_ => body = _)
            .parseJsonSync()
            .process(bodyStream);

        this.result = PatchCommand._mapToLocalObject(results, this._conventions);

        return body;
    }

    private static _mapToLocalObject(json: ServerCasing<ServerResponse<PatchResult>>, conventions: DocumentConventions): PatchResult {
        return {
            changeVector: json.ChangeVector,
            collection: json.Collection,
            debug: json.Debug,
            lastModified: conventions.dateUtil.parse(json.LastModified),
            status: json.Status,
            modifiedDocument: ObjectUtil.transformDocumentKeys(json.ModifiedDocument, conventions),
            originalDocument: ObjectUtil.transformDocumentKeys(json.OriginalDocument, conventions)
        }
    }
}
