import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { throwError } from "../../../Exceptions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { IndexPriority } from "../../Indexes/Enums";
import { ServerNode } from "../../../Http/ServerNode";
import { HttpRequestBase } from "../../../Primitives/Http";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";

export class SetIndexesPriorityOperation implements IMaintenanceOperation<void> {

    private _parameters: SetIndexesPriorityOperationParameters;

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
        return "COMMAND_RESULT";
    }
}

export class SetIndexPriorityCommand extends RavenCommand<void> {

    private _parameters: object;

    public constructor(conventions: DocumentConventions, parameters: SetIndexesPriorityOperationParameters) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }

        this._parameters = this._typedObjectMapper.toObjectLiteral(parameters);
    }

    public createRequest(node: ServerNode): HttpRequestBase {
        const uri = node.url + "/databases/" + node.database + "/indexes/set-priority";
        const body = JsonSerializer
            .getDefaultForCommandPayload()
            .serialize(this._parameters);
        const headers = this._getHeaders()
            .withContentTypeJson().build();

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