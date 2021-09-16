import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { SorterDefinition } from "../../../Documents/Queries/Sorting/SorterDefinition";
import { throwError } from "../../../Exceptions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";

export class PutServerWideSortersOperation implements IServerOperation<void> {
    private readonly _sortersToAdd: SorterDefinition[];

    public constructor(...sortersToAdd: SorterDefinition[]) {
        if (!sortersToAdd || sortersToAdd.length === 0) {
            throwError("InvalidArgumentException", "SortersToAdd cannot be null or empty")
        }

        this._sortersToAdd = sortersToAdd;
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PutServerWideSortersCommand(conventions, this._sortersToAdd);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

class PutServerWideSortersCommand extends RavenCommand<void> implements IRaftCommand {
    private _sortersToAdd: any[];


    constructor(conventions: DocumentConventions, sortersToAdd: SorterDefinition[]) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!sortersToAdd) {
            throwError("InvalidArgumentException", "SortersToAdd cannot be null");
        }

        this._sortersToAdd = sortersToAdd.map(x => {
            if (!x.name) {
                throwError("InvalidArgumentException", "Sorter name cannot be null");
            }
            return conventions.objectMapper.toObjectLiteral(x);
        });
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/sorters";

        const headers = this._headers()
            .typeAppJson().build();

        const body = this._serializer.serialize({
            Sorters: this._sortersToAdd
        });

        return {
            uri,
            method: "PUT",
            headers,
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