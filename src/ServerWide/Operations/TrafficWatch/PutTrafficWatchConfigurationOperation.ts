import { throwError } from "../../../Exceptions/index.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";

export type TrafficWatchMode = "None" | "Off" | "ToLogFile";

export type TrafficWatchChangeType =
    "None"
    | "Queries"
    | "Operations"
    | "MultiGet"
    | "BulkDocs"
    | "Index"
    | "Counters"
    | "Hilo"
    | "Subscriptions"
    | "Streams"
    | "Documents"
    | "TimeSeries"
    | "Notifications"
    | "ClusterCommands";

export interface PutTrafficWatchConfigurationParameters {
    trafficWatchMode: TrafficWatchMode;
    databases?: string[];
    statusCodes?: number[];
    minimumResponseSizeInBytes?: number;
    minimumRequestSizeInBytes?: number;
    minimumDurationInMs?: number;
    httpMethods?: string[];
    changeTypes?: TrafficWatchChangeType[];
    certificateThumbprints?: string[];
    /**
     * Saves the configuration to settings.json, so it survives a server restart.
     */
    persist?: boolean;
}

export class PutTrafficWatchConfigurationOperation implements IServerOperation<void> {
    private readonly _parameters: PutTrafficWatchConfigurationParameters;

    public constructor(parameters: PutTrafficWatchConfigurationParameters) {
        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }
        this._parameters = parameters;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PutTrafficWatchConfigurationCommand(this._parameters);
    }
}

class PutTrafficWatchConfigurationCommand extends RavenCommand<void> {
    private readonly _parameters: PutTrafficWatchConfigurationParameters;

    public constructor(parameters: PutTrafficWatchConfigurationParameters) {
        super();
        this._parameters = parameters;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return {
            uri: node.url + "/admin/traffic-watch/configuration",
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body: this._serializer.serialize(this._parameters)
        };
    }
}
