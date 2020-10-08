import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ConfigureTimeSeriesOperationResult } from "./ConfigureTimeSeriesOperationResult";
import { TimeSeriesConfiguration } from "./TimeSeriesConfiguration";
import { throwError } from "../../../Exceptions";
import { DocumentConventions, IRaftCommand, RavenCommand, ServerNode } from "../../..";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class ConfigureTimeSeriesOperation implements IMaintenanceOperation<ConfigureTimeSeriesOperationResult> {
    private readonly _configuration: TimeSeriesConfiguration;

    public constructor(configuration: TimeSeriesConfiguration) {
        if (!configuration) {
            throwError("InvalidArgumentException", "Configuration cannot be null");
        }

        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureTimeSeriesOperationResult> {
        return new ConfigureTimeSeriesCommand(this._configuration);
    }
}

class ConfigureTimeSeriesCommand extends RavenCommand<ConfigureTimeSeriesOperationResult> implements IRaftCommand {
    private readonly _configuration: TimeSeriesConfiguration;

    public constructor(configuration: TimeSeriesConfiguration) {
        super();

        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/timeseries/config";

        const body = this._serializer.serialize(this._configuration.serialize());

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
