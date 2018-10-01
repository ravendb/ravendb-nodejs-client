import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IndexPriority } from "../../Indexes/Enums";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestParameters } from "../../../Primitives/Http";

export class SetIndexesPriorityOperation implements IMaintenanceOperation<void> {

    private readonly _parameters: SetIndexesPriorityOperationParameters;

    public constructor(indexName: string, mode: IndexPriority);
    public constructor(parameters: SetIndexesPriorityOperationParameters);
    public constructor(paramsOrIndexName: string | SetIndexesPriorityOperationParameters, priority?: IndexPriority) {
        if (TypeUtil.isString(paramsOrIndexName)) {
            const indexName = paramsOrIndexName as string;
            if (!indexName) {
                throwError("InvalidArgumentException", "IndexName cannot be null.");
            }

            this._parameters = {
                indexNames: [indexName],
                priority
            };
        } else {
            const parameters = paramsOrIndexName as SetIndexesPriorityOperationParameters;
            if (!parameters) {
                throwError("InvalidArgumentException", "Parameters cannot be null.");
            }

            if (!parameters.indexNames || !parameters.indexNames.length) {
                throwError("InvalidArgumentException", "IndexNames cannot be null or empty.");
            }

            this._parameters = parameters;
        }

    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new SetIndexPriorityCommand(conventions, this._parameters);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class SetIndexPriorityCommand extends RavenCommand<void> {

    private readonly _parameters: object;

    public constructor(conventions: DocumentConventions, parameters: SetIndexesPriorityOperationParameters) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }

        this._parameters = conventions.objectMapper.toObjectLiteral(parameters);
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/indexes/set-priority";
        const body = this._serializer.serialize(this._parameters);
        const headers = this._headers()
            .typeAppJson().build();

        return {
            uri,
            method: "POST",
            body,
            headers
        };
    }

    public get isReadRequest() {
        return false;
    }
}

export interface SetIndexesPriorityOperationParameters {
    indexNames: string[];
    priority: IndexPriority;
}
