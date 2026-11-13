import { IOperation, OperationResultType } from "../OperationAbstractions.js";
import { IDocumentStore } from "../../IDocumentStore.js";
import { DocumentConventions } from "../../Conventions/DocumentConventions.js";
import { HttpCache } from "../../../Http/HttpCache.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { throwError } from "../../../Exceptions/index.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";

export class RevertRevisionsByIdOperation implements IOperation<void> {
    private readonly _idToChangeVector: Record<string, string>;

    public constructor(id: string, changeVector: string);
    public constructor(idToChangeVector: Record<string, string>);
    public constructor(idOrIdToChangeVector: string | Record<string, string>, changeVector?: string) {
        if (TypeUtil.isString(idOrIdToChangeVector)) {
            if (!idOrIdToChangeVector) {
                throwError("InvalidArgumentException", "id cannot be null or empty.");
            }

            if (!changeVector) {
                throwError("InvalidArgumentException", "cv cannot be null or empty.");
            }

            this._idToChangeVector = { [idOrIdToChangeVector]: changeVector };
            return;
        }

        if (!idOrIdToChangeVector) {
            throwError("InvalidArgumentException", "idToChangeVector cannot be null.");
        }

        if (!Object.keys(idOrIdToChangeVector).length) {
            throwError("InvalidArgumentException", "idToChangeVector must contain at least one item.");
        }

        this._idToChangeVector = idOrIdToChangeVector;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    public getCommand(
        store: IDocumentStore, conventions: DocumentConventions, httpCache: HttpCache): RavenCommand<void> {
        return new RevertRevisionsByIdCommand(this._idToChangeVector);
    }
}

class RevertRevisionsByIdCommand extends RavenCommand<void> {
    private readonly _idToChangeVector: Record<string, string>;

    public constructor(idToChangeVector: Record<string, string>) {
        super();
        this._idToChangeVector = idToChangeVector;
    }

    public get isReadRequest(): boolean {
        return false;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/databases/" + node.database + "/revisions/revert/docs";

        return {
            method: "POST",
            uri,
            headers: this._headers().typeAppJson().build(),
            body: JSON.stringify({ IdToChangeVector: this._idToChangeVector })
        };
    }
}
