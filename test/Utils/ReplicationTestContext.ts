import {
    IDocumentStore,
    PutConnectionStringOperation,
    ReplicationNode,
    ExternalReplication,
    RavenConnectionString,
    ModifyOngoingTaskResult,
    IMaintenanceOperation,
    OngoingTaskType,
    DeleteOngoingTaskOperation, UpdateExternalReplicationOperation
} from "../../src";
import { Stopwatch } from "../../src/Utility/Stopwatch";
import { DocumentType } from "../../src";
import { delay } from "../../src/Utility/PromiseUtil";
import { v4 as uuidv4 } from "uuid";
import { assertThat } from "./AssertExtensions";
import { ExternalReplicationBase } from "../../src/Documents/Replication/ExternalReplicationBase";
import { UpdatePullReplicationAsSinkOperation } from "../../src/Documents/Operations/Replication/UpdatePullReplicationAsSinkOperation";

export class ReplicationTestContext {

    protected _modifyReplicationDestination(replicationNode: ReplicationNode) {
        // empty by design
    }

    public async ensureReplicating(src: IDocumentStore, dst: IDocumentStore) {
        const id = "marker/" + uuidv4();

        {
            const s = src.openSession();
            await s.store(new Marker(), id);
            await s.saveChanges();
        }

        assertThat(await this.waitForDocumentToReplicate(dst, id, 15_000, Marker))
            .isNotNull();
    }

    public async setupReplication(fromStore: IDocumentStore, ...destinations: IDocumentStore[]): Promise<ModifyOngoingTaskResult[]> {
        const result = [] as ModifyOngoingTaskResult[];

        for (const store of destinations) {
            const databaseWatcher: ExternalReplication = {
                database: store.database,
                connectionStringName: "ConnectionString-" + store.identifier
            };

            await this._modifyReplicationDestination(databaseWatcher);
            result.push(await ReplicationTestContext.addWatcherToReplicationTopology(fromStore, databaseWatcher));
        }

        return result;
    }

    public static async addWatcherToReplicationTopology(store: IDocumentStore, watcher: ExternalReplicationBase, ...urls: string[]): Promise<ModifyOngoingTaskResult> {
        const connectionString = new RavenConnectionString();
        connectionString.name = watcher.connectionStringName;
        connectionString.database = watcher.database;
        connectionString.topologyDiscoveryUrls = urls && urls.length ? urls : store.urls;

        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        let op: IMaintenanceOperation<ModifyOngoingTaskResult>;

        if ("hubDefinitionName" in watcher) {
            op = new UpdatePullReplicationAsSinkOperation(watcher);
        } else {
            op = new UpdateExternalReplicationOperation(watcher);
        }

        return await store.maintenance.send(op);
    }

    public async deleteOngoingTask(store: IDocumentStore, taskId: number, taskType: OngoingTaskType) {
        const op = new DeleteOngoingTaskOperation(taskId, taskType);
        return store.maintenance.send(op);
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

            await delay(100);
        }

        return null;
    }

}

class Marker {
    public id: string;
}