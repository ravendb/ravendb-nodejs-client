import { HttpRequestParameters } from "../../../Primitives/Http";
import { IMaintenanceOperation, OperationResultType } from "../OperationAbstractions";
import { IndexLockMode } from "../../Indexes/Enums";
import { RavenCommand } from "../../../Http/RavenCommand";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";
import { ServerNode } from "../../../Http/ServerNode";
import { TypeUtil } from "../../../Utility/TypeUtil";

export class SetIndexesLockOperation implements IMaintenanceOperation<void> {

    private _parameters: SetIndexesLockOperationParameters;

    public constructor(indexName: string, mode: IndexLockMode);
    public constructor(parameters: SetIndexesLockOperationParameters);
    public constructor(paramsOrIndexName: string | SetIndexesLockOperationParameters, mode?: IndexLockMode) {
        if (TypeUtil.isString(paramsOrIndexName)) {
            const indexName = paramsOrIndexName as string;
            if (!indexName) {
                throwError("InvalidArgumentException", "IndexName cannot be null.");
            }

            this._parameters = {
                indexNames: [indexName],
                mode
            };
        } else {
            const parameters = paramsOrIndexName as SetIndexesLockOperationParameters;
            if (!parameters) {
                throwError("InvalidArgumentException", "Parameters cannot be null.");
            }

            if (!parameters.indexNames || !parameters.indexNames.length) {
                throwError("InvalidArgumentException", "IndexNames cannot be null or empty.");
            }

            this._parameters = parameters;
        }

        this._filterAutoIndexes();
    }

    private _filterAutoIndexes() {
        // Check for auto-indexes - we do not set lock for auto-indexes
        if (this._parameters.indexNames.find(x => x.toLocaleLowerCase().startsWith("auto/"))) {
            throwError("InvalidArgumentException", "Indexes list contains Auto-Indexes. " +
                "Lock Mode is not set for Auto-Indexes.");
        }
    }

    public getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new SetIndexLockCommand(conventions, this._parameters);
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }
}

export class SetIndexLockCommand extends RavenCommand<void> {

    private _parameters: object;

    public constructor(conventions: DocumentConventions, parameters: SetIndexesLockOperationParameters) {
        super();

        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }

        this._responseType = "Empty";
        this._parameters = this._typedObjectMapper.toObjectLiteral(parameters);
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/indexes/set-lock";
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

export interface SetIndexesLockOperationParameters {
    indexNames: string[];
    mode: IndexLockMode;
}
