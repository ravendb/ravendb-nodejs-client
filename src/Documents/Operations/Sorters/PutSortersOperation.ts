import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { SorterDefinition } from "../../Queries/Sorting/SorterDefinition";
import { throwError } from "../../../Exceptions/index";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { ServerNode } from "../../../Http/ServerNode";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class PutSortersOperation implements IMaintenanceOperation<void> {
    private readonly _sortersToAdd: SorterDefinition[];

    public constructor(...sortersToAdd: SorterDefinition[]) {
        if (!sortersToAdd || !sortersToAdd.length) {
            throwError("InvalidArgumentException", "SortersToAdd cannot be null or empty");
        }

        this._sortersToAdd = sortersToAdd;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PutSortersCommand(conventions, this._sortersToAdd);
    }
}

class PutSortersCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _sortersToAdd: SorterDefinition[];

    public constructor(conventions: DocumentConventions, sortersToAdd: SorterDefinition[]) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!sortersToAdd) {
            throwError("InvalidArgumentException", "SortersToAdd cannot be null");
        }

        if (sortersToAdd.findIndex(x => !x) > -1) {
            throwError("InvalidArgumentException", "Sorter cannot be null");
        }

        this._sortersToAdd = sortersToAdd;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/admin/sorters";

        const body = this._serializer.serialize({
            Sorters: this._sortersToAdd //TODO: check casing!
        });

        return {
            uri,
            method: "PUT",
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    get isReadRequest(): boolean {
        return false;
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
