import { ServerNode } from "../../../Http/ServerNode";
import { RavenCommand } from "../../../Http/RavenCommand";
import { HttpRequestBase } from "../../../Primitives/Http";
import { ClientConfiguration } from "../Configuration/ClientConfiguration";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";

export class GetClientConfigurationOperation implements IMaintenanceOperation<GetClientConfigurationOperationResult> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<GetClientConfigurationOperationResult> {
        return new GetClientConfigurationCommand();
    }
}

export class GetClientConfigurationCommand extends RavenCommand<GetClientConfigurationOperationResult> {

    constructor() {
        super();
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = `${ node.url }/databases/${ node.database }/configuration/client`;
        return { uri };
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            return;
        }

        this.result = this._jsonSerializer.deserialize(response);
    }
}

export interface GetClientConfigurationOperationResult {
    etag: number;
    configuration: ClientConfiguration;
}
