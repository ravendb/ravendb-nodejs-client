import { ObjectTypeDescriptor } from "../../Types";
import { DocumentChange } from "./DocumentChange";
import { OperationStatusChange } from "./OperationStatusChange";
import { IndexChange } from "./IndexChange";
import { IChangesObservable } from "./IChangesObservable";
import { IConnectableChanges } from "./IConnectableChanges";
import { CounterChange } from "./CounterChange";

export interface IDatabaseChanges extends IConnectableChanges<IDatabaseChanges> {

    /**
     * Subscribe to changes for specified index only.
     */
    forIndex(indexName: string): IChangesObservable<IndexChange>;

    /**
     * Subscribe to changes for specified document only.
     */
    forDocument(docId: string): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for all documents.
     */
    forAllDocuments(): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for specified operation only.
     */
    forOperationId(operationId: number): IChangesObservable<OperationStatusChange>;

    /**
     * Subscribe to change for all operation statuses.
     */
    forAllOperations(): IChangesObservable<OperationStatusChange>;

    /**
     * Subscribe to changes for all indexes.
     */
    forAllIndexes(): IChangesObservable<IndexChange>;

    /**
     * Subscribe to changes for all documents that Id starts with given prefix.
     */
    forDocumentsStartingWith(docIdPrefix: string): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for all documents that belong to specified collection (Raven-Entity-Name).
     */
    forDocumentsInCollection(collectionName: string): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for all documents that belong to specified collection (Raven-Entity-Name).
     */
    forDocumentsInCollection<T extends object>(type: ObjectTypeDescriptor<T>): IChangesObservable<DocumentChange>;

    /**
     * Subscribe for changes for all counters.
     */
    forAllCounters(): IChangesObservable<CounterChange>;
    /**
     * Subscribe to changes for all counters with a given name.
     */
    forCounter(counterName: string): IChangesObservable<CounterChange>;
    /**
     * Subscribe to changes for counter from a given document and with given name.
     */
    forCounterOfDocument(documentId: string, counterName: string): IChangesObservable<CounterChange>;
    /**
     * Subscribe to changes for all counters from a given document.
     */
    forCountersOfDocument(documentId: string): IChangesObservable<CounterChange>;
}
