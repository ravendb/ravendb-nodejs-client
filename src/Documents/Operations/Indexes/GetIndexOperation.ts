import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";

export class GetIndexOperation implements IMaintenanceOperation<IndexDefinition> {

    private readonly _indexName: string;

    public constructor(indexName: string) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexDefinition> {
        return new GetIndexCommand(this._indexName, conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class GetIndexCommand extends RavenCommand<IndexDefinition> {

    private readonly _indexName: string;
    private readonly _conventions: DocumentConventions;

    public constructor(indexName: string, conventions: DocumentConventions) {
        super();
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null.");
        }

        this._indexName = indexName;
        this._conventions = conventions;
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

        let body: string = null;
        await this._pipeline()
            .collectBody(b => body = b)
            .parseJsonSync()
            .objectKeysTransform({
                defaultTransform: "camel",
                ignorePaths: [/fields\.[^.]+$/i]
            })
            .process(bodyStream)
            .then((result: object) => {
                const indexDefTypeInfo = {
                    nestedTypes: {
                        "results[]": "IndexDefinition",
                        "results[].maps": "Set"
                    },
                };
                const knownTypes = new Map([[IndexDefinition.name, IndexDefinition]]);
                const allResults = this._reviveResultTypes(result, this._conventions, indexDefTypeInfo, knownTypes);
                this.result = allResults["results"][0] || null;
            });

        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
