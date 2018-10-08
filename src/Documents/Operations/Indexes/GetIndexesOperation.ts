import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IndexDefinition } from "../../Indexes/IndexDefinition";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import * as stream from "readable-stream";

export class GetIndexesOperation implements IMaintenanceOperation<IndexDefinition[]> {

    private readonly _start: number;
    private readonly _pageSize: number;

    public constructor(start: number, pageSize: number) {
        this._start = start;
        this._pageSize = pageSize;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IndexDefinition[]> {
        return new GetIndexesCommand(this._start, this._pageSize, conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

const indexDefTypeInfo = {
    nestedTypes: {
        "results[]": "IndexDefinition",
        "results[].maps": "Set"
    },
};
const knownTypes = new Map([[IndexDefinition.name, IndexDefinition]]);

export class GetIndexesCommand extends RavenCommand<IndexDefinition[]> {
    private readonly _start: number;
    private readonly _pageSize: number;
    private readonly _conventions: DocumentConventions;

    public constructor(start: number, pageSize: number, conventions: DocumentConventions) {
        super();
        this._start = start;
        this._pageSize = pageSize;
        this._conventions = conventions;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/indexes?start=" + this._start + "&pageSize=" + this._pageSize;
        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        await this._pipeline<object>()
            .collectBody(b => body = b)
            .parseJsonSync()
            .objectKeysTransform({
                defaultTransform: "camel",
                ignorePaths: [/fields\.[^.]+$/i]
            })
            .process(bodyStream)
            .then((result) => {
                this.result = this._reviveResultTypes(
                    result, this._conventions, indexDefTypeInfo, knownTypes)["results"];
            });
        return body;
    }

    public get isReadRequest(): boolean {
        return true;
    }
}
