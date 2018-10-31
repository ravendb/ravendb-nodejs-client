import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import { DetailedDatabaseStatistics } from "./DetailedDatabaseStatistics";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";
import { HttpRequestParameters } from "../../Primitives/Http";
import * as stream from "readable-stream";

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

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return await this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest(): boolean {
        return false;
    }
}
