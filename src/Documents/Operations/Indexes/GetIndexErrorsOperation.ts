import {IMaintenanceOperation, OperationResultType} from "../OperationAbstractions";
import {IndexErrors} from "../../Indexes/Errors";
import {RavenCommand} from "../../../Http/RavenCommand";
import {DocumentConventions} from "../../Conventions/DocumentConventions";
import {ServerNode} from "../../../Http/ServerNode";
import {HttpRequestParameters} from "../../../Primitives/Http";
import * as stream from "readable-stream";

export class GetIndexErrorsOperation implements IMaintenanceOperation<IndexErrors[]> {

    private readonly _indexNames: string[];

    public constructor();
    public constructor(indexNames: string[]);
    public constructor(indexNames: string[] = null) {
        this._indexNames = indexNames;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexErrors[]> {
        return new GetIndexErrorsCommand(this._indexNames);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetIndexErrorsCommand extends RavenCommand<IndexErrors[]> {
    private readonly _indexNames: string[];

    public constructor(indexNames: string[]) {
        super();
        this._indexNames = indexNames;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/indexes/errors";

        if (this._indexNames && this._indexNames.length) {
            uri += "?";

            for (const indexName of this._indexNames) {
                uri += "&name=" + indexName;
            }
        }

        return {uri};
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        const typeInfo = {
            nestedTypes: {
                "results[].errors[].timestamp": "date"
            }
        };

        let body: string = null;
        await this._defaultPipeline(_ => body = _).process(bodyStream)
            .then(results => {
                this.result = this._reviveResultTypes(results, typeInfo)["results"];
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
