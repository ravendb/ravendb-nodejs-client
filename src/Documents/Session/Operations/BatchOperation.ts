import {InMemoryDocumentSessionOperations} from "../InMemoryDocumentSessionOperations";
import {IRavenObject} from "../../../Types/IRavenObject";
import {BatchCommand} from "../../Commands/Batches/BatchCommand";
import {throwError} from "../../../Exceptions";
import {CONSTANTS} from "../../../Constants";
import {SessionAfterSaveChangesEventArgs} from "../SessionEvents";

export class BatchOperation {

    private readonly _session: InMemoryDocumentSessionOperations;

    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    private _entities: object[];
    private _sessionCommandsCount: number;

    public createRequest(): BatchCommand {
        const result = this._session.prepareForSaveChanges();

        this._sessionCommandsCount = result.sessionCommands.length;
        result.sessionCommands.push(...result.deferredCommands);
        if (!result.sessionCommands.length) {
            return null;
        }

        this._session.incrementRequestCount();

        this._entities = result.entities;

        return new BatchCommand(this._session.conventions, result.sessionCommands, result.options);
    }

    private static _throwOnNullResults() {
        throwError("InvalidOperationException",
            "Received empty response from the server. This is not supposed to happen and is likely a bug.");
    }

    public setResult(result: IRavenObject): void {
        if (!result.results) {
            BatchOperation._throwOnNullResults();
            return;
        }

        const results = result.results;
        for (let i = 0; i < this._sessionCommandsCount; i++) {
            const batchResult = results[0];
            if (!batchResult) {
                throwError("InvalidArgumentException", "result");
            }

            const type = batchResult.type;

            if (type !== "PUT") {
                continue;
            }

            const entity = this._entities[i];
            const documentInfo = this._session.documentsByEntity.get(entity);
            if (!documentInfo) {
                continue;
            }

            const changeVector = batchResult[CONSTANTS.Documents.Metadata.CHANGE_VECTOR];
            if (!changeVector) {
                throwError("InvalidOperationException",
                    "PUT response is invalid. @change-vector is missing on " + documentInfo.id);
            }

            const id = batchResult[CONSTANTS.Documents.Metadata.ID];
            if (!id) {
                throwError("InvalidOperationException",
                    "PUT response is invalid. @id is missing on " + documentInfo.id);
            }

            for (const propertyName of Object.keys(batchResult)) {
                if ("type" === propertyName) {
                    continue;
                }

                documentInfo.metadata[propertyName] = batchResult[propertyName];
            }

            documentInfo.id = id;
            documentInfo.changeVector = changeVector;
            documentInfo.document[CONSTANTS.Documents.Metadata.KEY] = documentInfo.metadata;
            documentInfo.metadataInstance = null;

            this._session.documentsById.add(documentInfo);
            this._session.generateEntityIdOnTheClient.trySetIdentity(entity, id);

            const afterSaveChangesEventArgs =
                new SessionAfterSaveChangesEventArgs(this._session, documentInfo.id, documentInfo.entity);
            this._session.emit("afterSaveChanges", afterSaveChangesEventArgs);
        }
    }

}
