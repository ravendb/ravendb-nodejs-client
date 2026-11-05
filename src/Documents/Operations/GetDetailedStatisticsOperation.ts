import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions.js";
import { DetailedDatabaseStatistics } from "./DetailedDatabaseStatistics.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { Stream } from "node:stream";

export class GetDetailedStatisticsOperation implements IMaintenanceOperation<DetailedDatabaseStatistics> {
    private readonly _debugTag: string;

    public constructor();
    public constructor(debugTag: string);
    public constructor(debugTag?: string) {
        this._debugTag = debugTag;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DetailedDatabaseStatistics> {
         return new DetailedDatabaseStatisticsCommand(this._debugTag);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class DetailedDatabaseStatisticsCommand extends RavenCommand<DetailedDatabaseStatistics> {
    private readonly _debugTag: string;

    public constructor(debugTag: string) {
        super();
        this._debugTag = debugTag;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = node.url + "/databases/" + node.database + "/stats/detailed";
        if (this._debugTag) {
            uri += "?" + this._debugTag;
        }
        return { uri };
    }

    public async setResponseAsync(bodyStream: Stream, fromCache: boolean): Promise<string> {
        const body = await this._parseResponseDefaultAsync(bodyStream);
        this.result.staleIndexes = this.result.indexes?.filter(x => x.isStale).map(x => x.name);
        return body;
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
