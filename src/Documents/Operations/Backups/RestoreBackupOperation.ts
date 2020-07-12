import { IServerOperation, OperationIdResult, OperationResultType } from "../OperationAbstractions";
import { RestoreBackupConfiguration } from "./RestoreBackupConfiguration";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export class RestoreBackupOperation implements IServerOperation<OperationIdResult> {
    private readonly _restoreConfiguration: RestoreBackupConfiguration;

    public constructor(restoreConfiguration: RestoreBackupConfiguration) {
        this._restoreConfiguration = restoreConfiguration;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<OperationIdResult> {
        return new RestoreBackupCommand(conventions, this._restoreConfiguration);
    }

    public get resultType(): OperationResultType {
        return "OperationId";
    }
}

class RestoreBackupCommand extends RavenCommand<OperationIdResult> {
    private readonly _conventions: DocumentConventions;
    private readonly _restoreConfiguration: RestoreBackupConfiguration;

    public constructor(conventions: DocumentConventions, restoreConfiguration: RestoreBackupConfiguration) {
        super();

        this._conventions = conventions;
        this._restoreConfiguration = restoreConfiguration;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/restore/database";

        const body = this._serializer.serialize(this._restoreConfiguration);

        return {
            uri,
            method: "POST",
            body,
            headers: this._headers().typeAppJson().build()
        }
    }

    async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
        if (!bodyStream) {
            this._throwInvalidResponse();
        }

        return this._parseResponseDefaultAsync(bodyStream);
    }
}
