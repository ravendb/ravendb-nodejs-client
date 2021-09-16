import { getLogger } from "../../Utility/LogUtil";
import { IDocumentStore } from "../IDocumentStore";
import { DocumentConventions } from "../Conventions/DocumentConventions";
import { PutIndexesOperation } from "../Operations/Indexes/PutIndexesOperation";
import { IndexDefinition } from "./IndexDefinition";
import { IAbstractIndexCreationTask } from "./IAbstractIndexCreationTask";

const log = getLogger({ module: "DocumentStore" });

export class IndexCreation {

    public static async createIndexes(
        indexes: IAbstractIndexCreationTask[],
        store: IDocumentStore): Promise<void>;
    public static async createIndexes(
        indexes: IAbstractIndexCreationTask[],
        store: IDocumentStore,
        conventions: DocumentConventions): Promise<void>;
    public static async createIndexes(
        indexes: IAbstractIndexCreationTask[],
        store: IDocumentStore,
        conventions?: DocumentConventions): Promise<void> {

        if (!conventions) {
            conventions = store.conventions;
        }

        try {
            const indexesToAdd = this.createIndexesToAdd(indexes, conventions);
            await store.maintenance.send(new PutIndexesOperation(...indexesToAdd));
        } catch (err) {
            log.warn(err,
                "Could not create indexes in one shot (maybe using older version of RavenDB ?)");

            // For old servers that don't have the new endpoint for executing multiple indexes
            for (const index of indexes) {
                await index.execute(store, conventions);
            }
        }
    }

    public static createIndexesToAdd(
        indexCreationTasks: IAbstractIndexCreationTask[], conventions: DocumentConventions)
        : IndexDefinition[] {
        return indexCreationTasks
            .map(x => {
                const oldConventions = x.conventions;
                try {
                    x.conventions = conventions;
                    const definition = x.createIndexDefinition();
                    definition.name = x.getIndexName();
                    definition.priority = x.priority || "Normal";
                    definition.state = x.state || "Normal";
                    return definition;
                } finally {
                    x.conventions = oldConventions;
                }
            });
    }
}
