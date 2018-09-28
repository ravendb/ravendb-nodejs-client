import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import { ServerNode } from "../../Http/ServerNode";
import { RavenCommand } from "../../Http/RavenCommand";
import { HttpRequestParameters } from "../../Primitives/Http";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { DatabaseStatistics } from "./DatabaseStatistics";
import { RavenCommandResponsePipeline } from "../../Http/RavenCommandResponsePipeline";
import { throwError } from "../../Exceptions";
import * as stream from "readable-stream";

export class GetStatisticsOperation implements IMaintenanceOperation<DatabaseStatistics> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _debugTag: string;

    public constructor(debugTag?: string) {
        this._debugTag = debugTag;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DatabaseStatistics> {
        return new GetStatisticsCommand(this._debugTag);
    }
}

export class GetStatisticsCommand extends RavenCommand<DatabaseStatistics> {

    private _debugTag: string;

    public constructor(debugTag?: string) {
        super();
        this._debugTag = debugTag;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = `${node.url}/databases/${node.database}/stats`;
        if (this._debugTag) {
            uri += "?" + this._debugTag;
        }

        return { uri };
    }

    public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        return this._parseResponseDefaultAsync(bodyStream);
    }

    public get isReadRequest() {
        return true;
    }
}
