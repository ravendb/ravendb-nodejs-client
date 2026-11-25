import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { IndexDefinition } from "../../Indexes/IndexDefinition.js";
import { throwError } from "../../../Exceptions/index.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { Stream } from "node:stream";
import { ObjectUtil } from "../../../Utility/ObjectUtil.js";

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

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            return;
        }

        let body: string = null;
        const result = await this._pipeline<object>()
            .collectBody(b => body = b)
            .parseJsonSync()
            .objectKeysTransform({
                defaultTransform: ObjectUtil.camel,
                ignorePaths: [/fields\.[^.]+$/i,/configuration\./i, /^results\.\[]\.schemaDefinitions\./]
            })
            .process(bodyStream);
        const indexDefTypeInfo = {
            nestedTypes: {
                "results[]": "IndexDefinition",
                "results[].maps": "Set"
            },
        };
        const knownTypes = new Map([[IndexDefinition.name, IndexDefinition]]);
        const allResults = this._reviveResultTypes(result, this._conventions, indexDefTypeInfo, knownTypes);
        this.result = allResults["results"][0] || null;

        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
