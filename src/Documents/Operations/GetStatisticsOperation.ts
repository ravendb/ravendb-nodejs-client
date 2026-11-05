import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions.js";
import { ServerNode } from "../../Http/ServerNode.js";
import { RavenCommand } from "../../Http/RavenCommand.js";
import { HttpRequestParameters } from "../../Primitives/Http.js";
import { DocumentConventions } from "../Conventions/DocumentConventions.js";
import { DatabaseStatistics } from "./DatabaseStatistics.js";
import { Stream } from "node:stream";

export class GetStatisticsOperation implements IMaintenanceOperation<DatabaseStatistics> {

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    private readonly _debugTag: string;
    private readonly _nodeTag: string;

    public constructor()
    public constructor(debugTag: string)
    public constructor(debugTag: string, nodeTag: string)
    public constructor(debugTag?: string, nodeTag?: string) {
        this._debugTag = debugTag;
        this._nodeTag = nodeTag;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<DatabaseStatistics> {
        return new GetStatisticsCommand(this._debugTag, this._nodeTag);
    }
}

export class GetStatisticsCommand extends RavenCommand<DatabaseStatistics> {

    private readonly _debugTag: string;

    public constructor(debugTag?: string, nodeTag?: string) {
        super();
        this._debugTag = debugTag;
        this._selectedNodeTag = nodeTag;

        this.timeout = 15_000;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        let uri = `${node.url}/databases/${node.database}/stats`;
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

    public get isReadRequest() {
        return true;
    }
}
