import { JsonSerializer } from "../../../Mapping/Json/Serializer.js";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { IndexDefinition } from "../../Indexes/IndexDefinition.js";
import { throwError } from "../../../Exceptions/index.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { HeadersBuilder } from "../../../Utility/HttpUtil.js";
import { IndexTypeExtensions } from "../../Indexes/IndexTypeExtensions.js";
import { Stream } from "node:stream";
import { ServerNode } from "../../../Http/ServerNode.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";

export interface PutIndexResult {
    index: string;
    raftCommandIndex: number;
}

export class PutIndexesOperation implements IMaintenanceOperation<PutIndexResult[]> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _indexToAdd: IndexDefinition[];

    public constructor(...indexToAdd: IndexDefinition[]) {
        if (!indexToAdd || !indexToAdd.length) {
            throwError("InvalidArgumentException", "indexToAdd cannot be null");
        }
        this._indexToAdd = indexToAdd;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<PutIndexResult[]> {
        return new PutIndexesCommand(conventions, this._indexToAdd);
    }
}

export class PutIndexesCommand extends RavenCommand<PutIndexResult[]> implements IRaftCommand {

    private readonly _indexToAdd: object[];
    private _allJavaScriptIndexes: boolean;
    private readonly _conventions: DocumentConventions;

    public constructor(conventions: DocumentConventions, indexesToAdd: IndexDefinition[]) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "conventions cannot be null or undefined.");
        }

        if (!indexesToAdd) {
            throwError("InvalidArgumentException", "indexesToAdd cannot be null or undefined.");
        }

        this._conventions = conventions;
        this._allJavaScriptIndexes = true;
        this._indexToAdd = indexesToAdd.reduce((result, next) => {
            // We validate on the server that it is indeed a javascript index.
            if (!IndexTypeExtensions.isJavaScript(next.type)) {
                this._allJavaScriptIndexes = false;
            }

            if (!next.name) {
                throwError("InvalidArgumentException", "Index name cannot be null.");
            }

            result.push(this._conventions.objectMapper.toObjectLiteral(next));

            return result;
        }, []);
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database 
            + (this._allJavaScriptIndexes ? "/indexes" : "/admin/indexes");

        const INDEX_DEF_FIELDS_REGEX = /^Indexes\.\[]\.(Fields|Configuration)$/;

        const bodyJson = ObjectUtil.transformObjectKeys({
            Indexes: this._indexToAdd
        }, {
            recursive: true,
            defaultTransform: ObjectUtil.pascal,
            paths: [
                {
                    path: INDEX_DEF_FIELDS_REGEX,
                    transform: x => x
                }
            ]
        });

        const body = JsonSerializer.getDefault()
            .serialize(bodyJson);

        const headers = HeadersBuilder
            .create()
            .typeAppJson()
            .build();
        return {
            method: "PUT",
            uri,
            body,
            headers
        };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        let body: string = null;
        const results = await this._defaultPipeline(x => body = x)
            .process(bodyStream);
        this.result = results["results"];
        return body;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
