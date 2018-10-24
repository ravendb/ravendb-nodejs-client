import { InMemoryDocumentSessionOperations} from "./InMemoryDocumentSessionOperations";
import { StringUtil } from "../../Utility/StringUtil";
import { throwError } from "../../Exceptions";
import { TypeUtil } from "../../Utility/TypeUtil";
import { IdTypeAndName } from "../IdTypeAndName";
import { CounterOperationType } from "../Operations/Counters/CounterOperationType";
import { CountersBatchCommandData } from "../Commands/Batches/CountersBatchCommandData";
import { CounterOperation } from "../Operations/Counters/CounterOperation";

/**
 * Abstract implementation for in memory session operations
 */
export abstract class SessionCountersBase {
    protected _docId: string;
    protected _session: InMemoryDocumentSessionOperations;

    protected constructor(
        session: InMemoryDocumentSessionOperations, entityOrId: string | object) {
        if (TypeUtil.isObject(entityOrId)) {
            const document = session.documentsByEntity.get(entityOrId);
            if (!document) {
                this._throwEntityNotInSession(entityOrId);
                return;
            }

            this._docId = document.id;
        } else if (TypeUtil.isString(entityOrId)) {
            if (!entityOrId) {
                throwError("InvalidArgumentException", "DocumentId cannot be empty.");
            }

            this._docId = entityOrId;
        } else {
            throwError("InvalidArgumentException", "Document ID or entity argument is neither string nor entity.");
        }

        this._session = session;
    }

    public increment(counter: string): void;
    public increment(counter: string, delta: number): void;
    public increment(counter: string, delta = 1): void {
       if (StringUtil.isNullOrWhitespace(counter)) {
           throwError("InvalidArgumentException", "Counter cannot be empty.");
       }

       const counterOp = new CounterOperation();
       counterOp.type = "Increment" as CounterOperationType;
       counterOp.counterName = counter;
       counterOp.delta = delta;
       const documentInfo = this._session.documentsById.getValue(this._docId);
       if (documentInfo && this._session.deletedEntities.has(documentInfo.entity)) {
           SessionCountersBase._throwDocumentAlreadyDeletedInSession(this._docId, counter);
       }

       const command = this._session.deferredCommandsMap.get(
           IdTypeAndName.keyFor(this._docId, "Counters", null));

       if (command) {
           const countersBatchCommandData = command as CountersBatchCommandData;
           if (countersBatchCommandData.hasDelete(counter)) {
               SessionCountersBase._throwIncrementCounterAfterDeleteAttempt(this._docId, counter);
           }

           countersBatchCommandData.counters.operations.push(counterOp);
       } else {
           this._session.defer(new CountersBatchCommandData(this._docId, counterOp));
       }
   }
    public delete(counter: string): void {
       if (StringUtil.isNullOrWhitespace(counter)) {
           throwError("InvalidArgumentException", "Counter is required.");
       }

       if (this._session.deferredCommandsMap.has(
           IdTypeAndName.keyFor(this._docId, "DELETE", null))) {
           return; // no-op
       }

       const documentInfo = this._session.documentsById.getValue(this._docId);
       if (documentInfo && this._session.deletedEntities.has(documentInfo.entity)) {
           return;  //no-op
       }

       const counterOp = new CounterOperation();
       counterOp.type = "Delete";
       counterOp.counterName = counter;
       const command = this._session.deferredCommandsMap.get(
           IdTypeAndName.keyFor(this._docId, "Counters", null));
       if (command) {
           const countersBatchCommandData = command as CountersBatchCommandData;
           if (countersBatchCommandData.hasIncrement(counter)) {
               SessionCountersBase._throwDeleteCounterAfterIncrementAttempt(this._docId, counter);
           }
           
           countersBatchCommandData.counters.operations.push(counterOp);
       } else {
           this._session.defer(new CountersBatchCommandData(this._docId, counterOp));
       }

       const cache = this._session.countersByDocId.get(this._docId);
       if (cache) {
           cache.data.delete(counter);
       }
   }
    protected _throwEntityNotInSession(entity: object): void {
       throwError(
           "InvalidArgumentException", 
            `Entity is not associated with the session, cannot add counter to it. ` +
           "Use documentId instead of track the entity in the session");
   }
   
   private static _throwIncrementCounterAfterDeleteAttempt(documentId: string, counter: string): void {
       throwError(
           "InvalidOperationException", 
           "Can't increment counter " + counter 
           + " of document " + documentId 
           + ", there is a deferred command registered to delete a counter with the same name.");
   }
   
   private static _throwDeleteCounterAfterIncrementAttempt(documentId: string, counter: string): void {
       throwError("InvalidOperationException", 
           "Can't delete counter " + counter 
           + " of document " + documentId 
           + ", there is a deferred command registered to increment a counter with the same name.");
   }

   private static _throwDocumentAlreadyDeletedInSession(documentId: string, counter: string): void {
       throwError(
           "InvalidOperationException", 
            "Can't increment counter " + counter 
            + " of document " + documentId 
            + ", the document was already deleted in this session.");
   }
}