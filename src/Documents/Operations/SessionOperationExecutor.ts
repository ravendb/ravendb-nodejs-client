import { OperationExecutor } from "./OperationExecutor";
import { InMemoryDocumentSessionOperations } from "../Session/InMemoryDocumentSessionOperations";
import { throwError } from "../../Exceptions";

/**
 * For internal session use only
 */
export class SessionOperationExecutor extends OperationExecutor {
    private readonly _session: InMemoryDocumentSessionOperations;

   /**
    * This constructor should not be used
    */
   public constructor(session: InMemoryDocumentSessionOperations) {
       super(session.documentStore, session.databaseName);
       this._session = session;
   }

   public forDatabase(databaseName: string): never {
       return throwError("InvalidOperationException", "The method is not supported.");
   }
}
