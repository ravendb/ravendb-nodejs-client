import { OperationExecutor } from "./OperationExecutor";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations";
import { DocumentStoreBase } from "../DocumentStoreBase";
import * as deprecate from "deprecate";
import { throwError } from "../../Exceptions";

/**
 * For internal session use only
 */
export class SessionOperationExecutor extends OperationExecutor {
    private readonly _session: InMemoryDocumentSessionOperations;

   /**
    * This constructor should not be used
    */
   public constructor(store: DocumentStoreBase);
   public constructor(store: DocumentStoreBase, databaseName: string);
   public constructor(session: InMemoryDocumentSessionOperations);
   public constructor(sessionOrStore: DocumentStoreBase | InMemoryDocumentSessionOperations, databaseName?: string) {
       if (arguments.length === 1 && sessionOrStore instanceof DocumentStoreBase) {
           super(sessionOrStore);
           deprecate("Passing document store only to SessionOperationExecutor ctor is deprecated.");
           this._session = null;
       } else if (arguments.length === 1 && sessionOrStore instanceof InMemoryDocumentSessionOperations) {
           super(sessionOrStore.documentStore, sessionOrStore.databaseName);
           this._session = sessionOrStore;
       } else {
           super(sessionOrStore as DocumentStoreBase, databaseName);
           this._session = null;
       }
   }

   public forDatabase(databaseName: string): never {
       return throwError("InvalidOperationException", "The method is not supported.");
   }
}
