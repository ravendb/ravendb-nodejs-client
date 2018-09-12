import {ObjectTypeDescriptor} from "../../Types";
import {DocumentChange} from "./DocumentChange";
import {OperationStatusChange} from "./OperationStatusChange";
import {IndexChange} from "./IndexChange";
import {IChangesObservable} from "./IChangesObservable";
import {IConnectableChanges} from "./IConnectableChanges";

export interface IDatabaseChanges extends IConnectableChanges<IDatabaseChanges> {

    /**
     * Subscribe to changes for specified index only.
     * @param indexName The index name
     * @return Changes observable
     */
    forIndex(indexName: string): IChangesObservable<IndexChange>;

    /**
     * Subscribe to changes for specified document only.
     * @param docId Document identifier
     * @return Changes observable
     */
    forDocument(docId: string): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for all documents.
     * @return Changes observable
     */
    forAllDocuments(): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for specified operation only.
     * @param operationId Operation id
     * @return Changes observable
     */
    forOperationId(operationId: number): IChangesObservable<OperationStatusChange>;

    /**
     * Subscribe to change for all operation statuses.
     * @return Changes observable
     */
    forAllOperations(): IChangesObservable<OperationStatusChange>;

    /**
     * Subscribe to changes for all indexes.
     * @return Changes observable
     */
    forAllIndexes(): IChangesObservable<IndexChange>;

    /**
     * Subscribe to changes for all documents that Id starts with given prefix.
     * @param docIdPrefix The document prefix
     * @return Changes observable
     */
    forDocumentsStartingWith(docIdPrefix: string): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for all documents that belong to specified collection (Raven-Entity-Name).
     * @param collectionName The collection name.
     * @return Changes observable
     */
    forDocumentsInCollection(collectionName: string): IChangesObservable<DocumentChange>;

    /**
     * Subscribe to changes for all documents that belong to specified collection (Raven-Entity-Name).
     * @param clazz The document class
     * @return Changes observable
     */
    forDocumentsInCollection<T extends object>(type: ObjectTypeDescriptor<T>): IChangesObservable<DocumentChange>;
}
