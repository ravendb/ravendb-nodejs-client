import { 
    IDocumentStore, 
    PutConnectionStringOperation, 
    ReplicationNode, 
    ExternalReplication, 
    RavenConnectionString, 
    UpdateExternalReplicationOperation
} from "../../src";
import { Stopwatch } from "../../src/Utility/Stopwatch";
import { DocumentType } from "../../src"; 

export class ReplicationTestContext {

    protected _modifyReplicationDestination(replicationNode: ReplicationNode) {
        // empty by design
    }

    public async setupReplication(fromStore: IDocumentStore, ...destinations: IDocumentStore[]): Promise<void> {

        for (const store of destinations) {
            const databaseWatcher: ExternalReplication = {
                database: store.database,
                connectionStringName: "ConnectionString-" + store.identifier
            };

            await this._modifyReplicationDestination(databaseWatcher);
            await this._addWatcherToReplicationTopology(fromStore, databaseWatcher);
        }
    }

    private async _addWatcherToReplicationTopology(store: IDocumentStore, watcher: ExternalReplication): Promise<void> {

        const connectionString = new RavenConnectionString();
        connectionString.name = watcher.connectionStringName;
        connectionString.database = watcher.database;
        connectionString.topologyDiscoveryUrls = store.urls;

        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const op = new UpdateExternalReplicationOperation(watcher);
        await store.maintenance.send(op);
    }

    public async waitForDocumentToReplicate<T extends object>(
        store: IDocumentStore, id: string, timeout: number, documentType: DocumentType<T>): Promise<T> {
        const sw = Stopwatch.createStarted();

        while (sw.elapsed <= timeout) {
            const session = store.openSession();
            const doc: T = await session.load<T>(id, documentType);
            if (doc) {
                return doc;
            }
        }

        return null;
    }

}
