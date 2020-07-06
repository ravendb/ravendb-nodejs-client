import { ConnectionString } from "./ConnectionString";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { EtlConfiguration } from "./EtlConfiguration";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class AddEtlOperation<T extends ConnectionString> implements IMaintenanceOperation<AddEtlOperationResult> {
    private readonly _configuration: EtlConfiguration<T>;

    public constructor(configuration: EtlConfiguration<T>) {
        this._configuration = configuration;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<AddEtlOperationResult> {
        return new AddEtlCommand(conventions, this._configuration);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class AddEtlCommand<T extends ConnectionString> extends RavenCommand<AddEtlOperationResult> {
    private readonly _conventions: DocumentConventions;
    private readonly _configuration: EtlConfiguration<T>;

    public constructor(conventions: DocumentConventions, configuration: EtlConfiguration<T>) {
        super();

        this._conventions = conventions;
        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/etl";

        const body = JSON.stringify(this._configuration.serialize(this._conventions));
        const headers = this._headers().typeAppJson().build();

        return {
            uri,
            method: "PUT",
            body,
            headers
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}

export interface AddEtlOperationResult {
    raftCommandIndex: number;
    taskId: number;
}