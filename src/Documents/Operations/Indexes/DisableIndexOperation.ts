import { HttpRequestParameters } from "../../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class DisableIndexOperation implements IMaintenanceOperation<void> {

    private readonly _indexName: string;
    private readonly _clusterWide: boolean;

    public constructor(indexName: string, clusterWide: boolean = false) {
        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        this._indexName = indexName;
        this._clusterWide = clusterWide;
    }

    public getCommand(conventions: DocumentConventions) {
        return new DisableIndexCommand(this._indexName, this._clusterWide);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

}

export class DisableIndexCommand extends RavenCommand<void> implements IRaftCommand {

    public get isReadRequest() {
        return false;
    }

    private readonly _indexName: string;
    private readonly _clusterWide: boolean;

    public constructor(indexName: string, clusterWide: boolean) {
        super();

        if (!indexName) {
            throwError("InvalidArgumentException", "IndexName cannot be null");
        }

        this._responseType = "Empty";
        this._indexName = indexName;
        this._clusterWide = clusterWide;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url
            + "/databases/" + node.database
            + "/admin/indexes/disable?name=" + encodeURIComponent(this._indexName)
            + "&clusterWide=" + this._clusterWide;

        return { method: "POST", uri };
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
