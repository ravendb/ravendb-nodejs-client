import { HttpRequestParameters } from "../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import { CollectionStatistics } from "./CollectionStatistics";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";
import { JsonSerializer } from "../../Mapping/Json/Serializer";
import * as stream from "readable-stream";

export class GetCollectionStatisticsOperation implements IMaintenanceOperation<CollectionStatistics> {

    public getCommand(conventions: DocumentConventions): RavenCommand<CollectionStatistics> {
        return new GetCollectionStatisticsCommand();
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class GetCollectionStatisticsCommand extends RavenCommand<CollectionStatistics> {

    public constructor() {
        super();
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/collections/stats";
        return { uri };
    }

    protected get _serializer(): JsonSerializer {
        return JsonSerializer.getDefault();
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        this.result = await this._defaultPipeline(_ => body = _)
            .collectBody()
            .streamKeyCaseTransform({
                defaultTransform: "camel",
                ignorePaths: [/^collections\./i]
            })
            .process(bodyStream);
        return body;
    }
}
