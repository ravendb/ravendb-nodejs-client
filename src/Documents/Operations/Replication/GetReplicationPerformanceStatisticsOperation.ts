import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions.js";
import { ReplicationPerformance } from "../../Replication/ReplicationPerformance.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { Stream } from "node:stream";

export class GetReplicationPerformanceStatisticsOperation implements IMaintenanceOperation<ReplicationPerformance> {

    public getCommand(conventions: DocumentConventions): RavenCommand<ReplicationPerformance> {
        return new GetReplicationPerformanceStatisticsCommand(conventions);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

const typeInfo = {
    nestedTypes: {
        "outgoing[].performance[].started": "date",
        "outgoing[].performance[].completed": "date",
        "outgoing[].performance[].errors[].timestamp": "date",
        "incoming[].performance[].started": "date",
        "incoming[].performance[].completed": "date",
        "incoming[].performance[].errors[].timestamp": "date"
    }
};

class GetReplicationPerformanceStatisticsCommand extends RavenCommand<ReplicationPerformance> {
    private readonly _conventions: DocumentConventions;

    public constructor(conventions: DocumentConventions) {
        super();
        this._conventions = conventions;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return { uri: node.url + "/databases/" + node.database + "/replication/performance" };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        let body: string = null;
        const results = await this._defaultPipeline(_ => body = _).process(bodyStream);
        this.result = this._reviveResultTypes(results, this._conventions, typeInfo);
        return body;
    }
}
