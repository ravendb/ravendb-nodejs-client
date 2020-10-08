import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ConfigureTimeSeriesOperationResult } from "./ConfigureTimeSeriesOperationResult";
import { throwError } from "../../../Exceptions";
import { DocumentConventions, IRaftCommand, RavenCommand, ServerNode } from "../../..";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { StringUtil } from "../../../Utility/StringUtil";

export class ConfigureTimeSeriesValueNamesOperation implements IMaintenanceOperation<ConfigureTimeSeriesOperationResult> {
    private readonly _parameters: ConfigureTimeSeriesValueNamesParameters;

    public constructor(parameters: ConfigureTimeSeriesValueNamesParameters) {
        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }

        this._parameters = parameters;

        if (StringUtil.isNullOrEmpty(parameters.collection)) {
            throwError("InvalidArgumentException", "Collection cannot be null or empty");
        }

        if (StringUtil.isNullOrEmpty(parameters.timeSeries)) {
            throwError("InvalidArgumentException", "TimeSeries cannot be null or empty");
        }

        if (!parameters.valueNames || !parameters.valueNames.length) {
            throwError("InvalidArgumentException", "ValueNames cannot be null or empty");
        }
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureTimeSeriesOperationResult> {
        return new ConfigureTimeSeriesValueNamesCommand(this._parameters);
    }
}

class ConfigureTimeSeriesValueNamesCommand extends RavenCommand<ConfigureTimeSeriesOperationResult> implements IRaftCommand {
    private readonly _parameters: ConfigureTimeSeriesValueNamesParameters;

    public constructor(parameters: ConfigureTimeSeriesValueNamesParameters) {
        super();

        this._parameters = parameters;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/timeseries/names/config";

        const body = this._serializer.serialize(this._parameters);

        return {
            uri,
            method: "POST",
            headers: this._headers().typeAppJson().build(),
            body
        };
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

export interface ConfigureTimeSeriesValueNamesParameters {
    collection: string;
    timeSeries: string;
    valueNames: string[];
    update?: boolean;
}