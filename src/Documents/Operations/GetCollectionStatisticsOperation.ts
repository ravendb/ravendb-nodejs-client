import { HttpRequestBase } from "../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "./OperationAbstractions";
import { CollectionStatistics } from "./CollectionStatistics";
import { RavenCommand } from "../../Http/RavenCommand";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { ServerNode } from "../../Http/ServerNode";
import { ObjectKeysTransform } from "../../Mapping/ObjectMapper";
import { JsonSerializer } from "../../Mapping/Json/Serializer";

export class GetCollectionStatisticsOperation implements IMaintenanceOperation<CollectionStatistics> {

    public getCommand(conventions: DocumentConventions): RavenCommand<CollectionStatistics> {
        return new GetCollectionStatisticsCommand();
    }

    public get resultType(): OperationResultType {
        return "COMMAND_RESULT";
    }

}

export class GetCollectionStatisticsCommand extends RavenCommand<CollectionStatistics> {

    public constructor() {
        super();
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/collections/stats";
        return { uri };
    }
    
    protected get _serializer(): JsonSerializer {
        return JsonSerializer.getDefault();
    }

    public setResponse(response: string, fromCache: boolean): void {
        if (!response) {
            this._throwInvalidResponse();
        }

        const rawResult = this._serializer.deserialize(response);
        this.result = ObjectKeysTransform.camelCase(rawResult);
    }
}
