import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";
import { 
    RavenCommandResponsePipeline, 
    IRavenCommandResponsePipelineResult } from "../../../Http/RavenCommandResponsePipeline";
import { getIgnoreKeyCaseTransformKeysFromDocumentMetadata } from "../../../Mapping/Json/Docs";
export class GetIndexOperation implements IMaintenanceOperation<IndexDefinition> {

    private _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexDefinition> {
        return new GetIndexCommand(this._indexName);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class GetIndexCommand extends RavenCommand<IndexDefinition> {

    private _indexName: string;

    public constructor(indexName: string) {
        super();
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/indexes?name="
            + encodeURIComponent(this._indexName);

        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        return RavenCommandResponsePipeline.create()
            .collectBody()
            .parseJsonSync()
            .streamKeyCaseTransform({
                defaultTransform: "camel",
                ignorePaths:  [ /fields\.[^.]+$/i ]
            })
            .process(bodyStream)
            .then((result: IRavenCommandResponsePipelineResult<object>) => {
                const indexDefTypeInfo = {
                    nestedTypes: {
                        "results[]": "IndexDefinition",
                        "results[].maps": "Set"
                    },
                };
                const knownTypes = new Map([[IndexDefinition.name, IndexDefinition]]);
                const allResults = this._reviveResultTypes(result.result, indexDefTypeInfo, knownTypes);
                this.result = allResults["results"][0] || null;
                return result.body;
            });
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
