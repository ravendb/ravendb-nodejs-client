import {HttpRequestParameters} from "../../../Primitives/Http";
import {OperationResultType, IMaintenanceOperation } from "../OperationAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import * as stream from "readable-stream";
import { RavenCommandResponsePipeline } from '../../../Http/RavenCommandResponsePipeline';

export interface IdentitiesCollection {
    [key: string]: number;
}

export class GetIdentitiesOperation implements IMaintenanceOperation<IdentitiesCollection> {

    public get resultType(): OperationResultType {
        return "CommandResult";
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

        public createRequest(node: ServerNode): HttpRequestParameters {
            const uri = node.url + "/databases/" + node.database + "/debug/identities";
            return { uri };
        }

        public async setResponseAsync(bodyStream: stream.Stream, fromCache: boolean): Promise<string> {
            return RavenCommandResponsePipeline.create()
                .parseJsonSync()
                .process(bodyStream)
                .then(({ result, body }) => {
                    this.result = result as IdentitiesCollection;
                    return body;
                });
        }
}
