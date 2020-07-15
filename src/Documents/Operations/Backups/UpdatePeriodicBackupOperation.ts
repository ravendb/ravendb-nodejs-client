import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { UpdatePeriodicBackupOperationResult } from "./UpdatePeriodicBackupOperationResult";
import { PeriodicBackupConfiguration } from "./PeriodicBackupConfiguration";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class UpdatePeriodicBackupOperation implements IMaintenanceOperation<UpdatePeriodicBackupOperationResult> {
    private readonly _configuration: PeriodicBackupConfiguration;

    public constructor(configuration: PeriodicBackupConfiguration) {
        this._configuration = configuration;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<UpdatePeriodicBackupOperationResult> {
        return new UpdatePeriodicBackupCommand(conventions, this._configuration);
    }
}

class UpdatePeriodicBackupCommand extends RavenCommand<UpdatePeriodicBackupOperationResult> {
    private readonly _conventions: DocumentConventions;
    private readonly _configuration: PeriodicBackupConfiguration;

    public constructor(conventions: DocumentConventions, configuration: PeriodicBackupConfiguration) {
        super();

        this._conventions = conventions;
        this._configuration = configuration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/periodic-backup";

        const body = this._serializer.serialize(this._configuration);

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
}
