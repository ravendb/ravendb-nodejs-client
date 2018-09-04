import {HttpRequestParameters} from "../../Primitives/Http";
import { PatchRequest } from "./PatchRequest";
import { IOperation, OperationResultType } from "./OperationAbstractions";
import { PatchStatus } from "./PatchStatus";
import { RavenCommand } from "../../Http/RavenCommand";
import { throwError } from "../../Exceptions";
import { IDocumentStore } from "../IDocumentStore";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { HttpCache } from "../../Http/HttpCache";
import { ServerNode } from "../../Http/ServerNode";
import { JsonSerializer } from "../../Mapping/Json/Serializer";
import { ObjectKeysTransform } from "../../Mapping/ObjectMapper";
import { PatchResult } from "./PatchResult";
import * as stream from "readable-stream";
import { RavenCommandResponsePipeline, IRavenCommandResponsePipelineResult } from "../../Http/RavenCommandResponsePipeline";
import { getIgnoreKeyCaseTransformKeysFromDocumentMetadata } from "../../Mapping/Json/Docs";
import { CollectResultStreamOptions } from "../../Mapping/Json/Streams/CollectResultStream";

export interface Payload {
    patch: PatchRequest;
    patchIfMissing: PatchRequest;
}

export class PatchOperationResult<TEntity> {
    public status: PatchStatus;
    public document: TEntity;
}

export class PatchOperation implements IOperation<PatchResult> {

    private _id: string;
    private _changeVector: string;
    private _patch: PatchRequest;
    private _patchIfMissing: PatchRequest;
    private _skipPatchIfChangeVectorMismatch: boolean;

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
        store: IDocumentStore, conventions: DocumentConventions, cache: HttpCache): RavenCommand<PatchResult>  {
        return new PatchCommand(
            conventions, 
            this._id, 
            this._changeVector, 
            this._patch, 
            this._patchIfMissing, 
            this._skipPatchIfChangeVectorMismatch, 
            false, 
            false);
    }

}

const DOCS_JSON_PATH = [ /^(ModifiedDocument|OriginalDocument)$/i, { emitPath: true } ];
export class PatchCommand extends RavenCommand<PatchResult> {
    private _id: string;
    private _changeVector: string;
    private _patch: object;
    private _skipPatchIfChangeVectorMismatch: boolean;
    private _returnDebugInformation: boolean;
    private _test: boolean;
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
        this._patch = this._typedObjectMapper.toObjectLiteral({ patch, patchIfMissing });
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
            headers: this._getHeaders().withContentTypeJson().build(),
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
            initResult: {} as PatchResult ,
            reduceResults: (result, { path, value }: { path: string[], value: any }) => {
                if (path[0] === "ModifiedDocument") {
                    result.modifiedDocument = value;
                }

                if (path[0] === "OriginalDocument") {
                    result.originalDocument = value;                    
                }

                return result;
            }
        }

        return RavenCommandResponsePipeline.create()
            .collectBody()
            .parseJsonAsync(DOCS_JSON_PATH)
            .streamKeyCaseTransform({
                targetKeyCaseConvention: this._conventions.entityFieldNameConvention,
                extractIgnorePaths: (e) => [ ...getIgnoreKeyCaseTransformKeysFromDocumentMetadata(e), /@metadata\./ ],
                ignoreKeys: [ /^@/ ]
            })
            .restKeyCaseTransform({ targetKeyCaseConvention: "camel" })
            .collectResult(collectResultOpts)
            .process(bodyStream)
            .then(({ result, rest, body }: IRavenCommandResponsePipelineResult<PatchResult>) => {
                this.result = Object.assign(result, rest) as PatchResult;
                return body;
            });
    }
}
