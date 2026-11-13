import {
    AbstractCsharpTimeSeriesIndexCreationTask,
    CreateDatabaseOperation,
    DatabaseSmugglerExportOptions,
    DeleteDatabasesOperation,
    GetStatisticsOperation,
    IDocumentStore
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Employee } from "../../Assets/Entities.js";

class Employees_HeartBeat extends AbstractCsharpTimeSeriesIndexCreationTask {
    public constructor() {
        super();
        this.map = "from ts in timeSeries.Employees.HeartBeat from entry in ts.Entries select new { Name = ts.Name, Value = entry.Value }";
    }
}

describe("RavenDB_14826", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function assertImported(databaseName: string) {
        await testContext.waitForIndexing(store, databaseName);

        const stats = await store.maintenance.forDatabase(databaseName).send(new GetStatisticsOperation());
        assertThat(stats.countOfDocuments).isEqualTo(2);
        assertThat(stats.countOfTimeSeriesSegments).isEqualTo(1);
        assertThat(stats.countOfIndexes).isEqualTo(1);
        assertThat(stats.indexes[0].isStale).isFalse();
    }

    it("smugglerShouldTriggerTimeSeriesNotificationsForIndexing", async () => {
        await new Employees_HeartBeat().execute(store);

        const session = store.openSession();
        const employee = new Employee();
        await session.store(employee);
        const baseline = new Date();
        session.timeSeriesFor(employee, "HeartBeat").append(baseline, 10);
        session.timeSeriesFor(employee, "HeartBeat").append(new Date(baseline.getTime() + 1000), 15);
        await session.saveChanges();

        await assertImported(store.database);

        const databaseName = store.database + "_smuggler";
        await store.maintenance.server.send(new CreateDatabaseOperation({ databaseName }));

        try {
            const operation = await store.smuggler.export(new DatabaseSmugglerExportOptions(), store.smuggler.forDatabase(databaseName));
            await operation.waitForCompletion(30_000);

            await assertImported(databaseName);
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({ databaseNames: [databaseName], hardDelete: true }));
        }
    });
});
