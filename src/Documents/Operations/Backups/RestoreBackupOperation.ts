import { IServerOperation, OperationIdResult, OperationResultType } from "../OperationAbstractions";
import { RestoreBackupConfiguration } from "./RestoreBackupConfiguration";
import { HttpRequestParameters } from "../../../Primitives/Http";
import * as stream from "readable-stream";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { RestoreBackupConfigurationBase } from "./RestoreBackupConfigurationBase";

export class RestoreBackupOperation implements IServerOperation<OperationIdResult> {
    private readonly _restoreConfiguration: RestoreBackupConfigurationBase;
    private readonly _nodeTag: string;

    public constructor(restoreConfiguration: RestoreBackupConfigurationBase, nodeTag?: string) {
        this._restoreConfiguration = restoreConfiguration;
        this._nodeTag = nodeTag;
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<OperationIdResult> {
        return new RestoreBackupCommand(conventions, this._restoreConfiguration, this._nodeTag);
    }

    public get resultType(): OperationResultType {
        return "OperationId";
    }

    public get nodeTag(): string {
        return this._nodeTag;
    }
}

class RestoreBackupCommand extends RavenCommand<OperationIdResult> {
    private readonly _restoreConfiguration: RestoreBackupConfigurationBase;

    public constructor(conventions: DocumentConventions, restoreConfiguration: RestoreBackupConfigurationBase, nodeTag: string) {
        super();

        this._restoreConfiguration = restoreConfiguration;
        this.selectedNodeTag = nodeTag;
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
