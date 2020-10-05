import { getLogger } from "../../Utility/LogUtil";
import { IDocumentStore } from "../IDocumentStore";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { PutIndexesOperation } from "../Operations/Indexes/PutIndexesOperation";
import { IndexDefinition } from "./IndexDefinition";
import { IAbstractIndexCreationTask } from "./IAbstractIndexCreationTask";

const log = getLogger({ module: "DocumentStore" });

export class IndexCreation {

    public static createIndexes(
        indexes: IAbstractIndexCreationTask[],
        store: IDocumentStore): Promise<void>;
    public static createIndexes(
        indexes: IAbstractIndexCreationTask[],
        store: IDocumentStore,
        conventions: DocumentConventions): Promise<void>;
    public static createIndexes(
        indexes: IAbstractIndexCreationTask[],
        store: IDocumentStore,
        conventions?: DocumentConventions): Promise<void> {

        if (!conventions) {
            conventions = store.conventions;
        }

        return Promise.resolve()
            .then(() => {
                const indexesToAdd = this.createIndexesToAdd(indexes, conventions);
                return store.maintenance.send(new PutIndexesOperation(...indexesToAdd));
            })
            .catch(err => {
                log.warn(err,
                    "Could not create indexes in one shot (maybe using older version of RavenDB ?)");

                // For old servers that don't have the new endpoint for executing multiple indexes
                return indexes.reduce((result, idx) => {
                    return result.then(() => {
                        return idx.execute(store, conventions);
                    });
                }, Promise.resolve());
            })
            // tslint:disable-next-line:no-empty
            .then(() => {
            });
    }

    public static createIndexesToAdd(
        indexCreationTasks: IAbstractIndexCreationTask[], conventions: DocumentConventions)
        : IndexDefinition[] {
        return indexCreationTasks
            .map(x => {
                x.conventions = conventions;
                const definition = x.createIndexDefinition();
                definition.name = x.getIndexName();
                definition.priority = x.priority || "Normal";
                return definition;
            });
    }
}
