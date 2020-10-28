import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { ConfigureTimeSeriesOperationResult } from "./ConfigureTimeSeriesOperationResult";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class RemoveTimeSeriesPolicyOperation implements IMaintenanceOperation<ConfigureTimeSeriesOperationResult> {
    private readonly _collection: string;
    private readonly _name: string;

    public constructor(collection: string, name: string) {
        if (!collection) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        if (!name) {
            throwError("InvalidArgumentException", "Collection cannot be null");
        }

        this._collection = collection;
        this._name = name;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }


    getCommand(conventions: DocumentConventions): RavenCommand<ConfigureTimeSeriesOperationResult> {
        return new RemoveTimeSeriesPolicyCommand(this._collection, this._name);
    }
}

class RemoveTimeSeriesPolicyCommand extends RavenCommand<ConfigureTimeSeriesOperationResult> implements IRaftCommand {
    private readonly _collection: string;
    private readonly _name: string;

    public constructor(collection: string, name: string) {
        super();

        this._collection = collection;
        this._name = name;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database
            + "/admin/timeseries/policy?collection=" + this._urlEncode(this._collection)
            + "&name=" + this._urlEncode(this._name);

        return {
            method: "DELETE",
            uri
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
