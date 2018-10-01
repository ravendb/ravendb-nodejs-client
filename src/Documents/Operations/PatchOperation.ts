import {HttpRequestParameters} from "../../Primitives/Http";
import {PatchRequest} from "./PatchRequest";
import {IOperation, OperationResultType} from "./OperationAbstractions";
import {PatchStatus} from "./PatchStatus";
import {RavenCommand} from "../../Http/RavenCommand";
import {throwError} from "../../Exceptions";
import {IDocumentStore} from "../IDocumentStore";
import {DocumentConventions} from "../Conventions/DocumentConventions";
import {HttpCache} from "../../Http/HttpCache";
import {ServerNode} from "../../Http/ServerNode";
import {PatchResult} from "./PatchResult";
import * as stream from "readable-stream";
import {CollectResultStreamOptions} from "../../Mapping/Json/Streams/CollectResultStream";
import {streamArray} from "stream-json/streamers/StreamArray";
import {streamObject} from "stream-json/streamers/StreamObject";
import {streamValues} from "stream-json/streamers/StreamValues";
import {pick} from "stream-json/filters/Pick";
import {filter} from "stream-json/filters/Filter";
import {ignore} from "stream-json/filters/Ignore";
import {parseRestOfOutput} from "../../Mapping/Json/Streams/Pipelines";

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
        this._patch = this._typedObjectMapper.toObjectLiteral({patch, patchIfMissing});
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

        const body = this._serializer.serialize(this._patch);
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

        const collectResultOpts: CollectResultStreamOptions<PatchResult> = {
            initResult: {} as PatchResult,
            reduceResults: (reduceResult, {key, value}: { key: string, value: any }) => {
                if (key === "ModifiedDocument") {
                    reduceResult.modifiedDocument = value;
                }

                if (key === "OriginalDocument") {
                    reduceResult.originalDocument = value;
                }

                return reduceResult;
            }
        };

        let body: string = null;
        const resultPromise = this._pipeline()
            .collectBody(b => body = b)
            .parseJsonAsync([
                filter({filter: /^ModifiedDocument|OriginalDocument$/}),
                streamObject()
            ])
            .streamKeyCaseTransform(this._conventions.entityFieldNameConvention, "DOCUMENT_LOAD")
            .collectResult(collectResultOpts)
            .process(bodyStream);

        const restPromise = parseRestOfOutput(bodyStream, /^ModifiedDocument|OriginalDocument$/);
        const [result, rest] = await Promise.all([resultPromise, restPromise]);
        this.result = Object.assign(result, rest) as PatchResult;
        return body;
    }
}
