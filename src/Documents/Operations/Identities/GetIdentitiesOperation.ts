import {HttpRequestBase} from "../../../Primitives/Http";
import {OperationResultType, IMaintenanceOperation } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";

export interface IdentitiesCollection {
    [key: string]: number;
}

export class GetIdentitiesOperation implements IMaintenanceOperation<IdentitiesCollection> {

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<IdentitiesCollection> {
        return new GetIdentitiesCommand();
    }
}

export class GetIdentitiesCommand extends RavenCommand<IdentitiesCollection> {

        public constructor() {
            super();
        }

        public get isReadRequest(): boolean {
            return true;
        }

        public createRequest(node: ServerNode): HttpRequestBase {
            const uri = node.url + "/databases/" + node.database + "/debug/identities";
            return { uri };
        }

        public setResponse(response: string, fromCache: boolean): void {
            this.result = this._commandPayloadSerializer.deserialize(response);
        }
    }
