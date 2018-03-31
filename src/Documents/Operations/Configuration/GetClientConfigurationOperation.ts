import { ServerNode } from "../../../Http/ServerNode";
import { RavenCommand } from "../../../Http/RavenCommand";
import { HttpRequestBase } from "../../../Primitives/Http";
import { ClientConfiguration } from "../Configuration/ClientConfiguration";
import { IMaintenanceOperation } from "../IMaintenanceOperation";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class GetClientConfigurationOperation implements IMaintenanceOperation<IGetClientConfigurationOperationResult> {
    public getCommand(conventions: DocumentConventions): RavenCommand<IGetClientConfigurationOperationResult> {
        return new GetClientConfigurationCommand();
    }
}

export class GetClientConfigurationCommand extends RavenCommand<IGetClientConfigurationOperationResult> {

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

        // this.result = this._mapper.readValue(response);
        this.result = JSON.parse(response); // TODO
    }
}

export interface IGetClientConfigurationOperationResult {
    etag: number;
    configuration: ClientConfiguration;
}
