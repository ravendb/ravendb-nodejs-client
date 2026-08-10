import {
    AddCdcSinkOperation,
    CdcSinkConfiguration,
    DeleteOngoingTaskOperation,
    GetDatabaseRecordOperation,
    GetOngoingTaskInfoOperation,
    IDocumentStore,
    OngoingTaskCdcSink,
    PutConnectionStringOperation,
    SqlConnectionString,
    ToggleOngoingTaskStateOperation,
    UpdateCdcSinkOperation
} from "../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("CdcSinkCrudTest", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function createSqlConnectionString(name = "test-sql"): SqlConnectionString {
        return Object.assign(new SqlConnectionString(), {
            name,
            factoryName: "Microsoft.Data.SqlClient",
            connectionString: "Server=localhost;Database=TestDb;User Id=sa;Password=pass;"
        });
    }

    function createCdcSinkConfiguration(name: string, connectionStringName: string): CdcSinkConfiguration {
        return {
            name,
            connectionStringName,
            tables: [
                {
                    collectionName: "Orders",
                    sourceTableSchema: "public",
                    sourceTableName: "orders",
                    columns: [
                        { column: "order_id", name: "OrderId" },
                        { column: "customer_id", name: "CustomerId" }
                    ],
                    primaryKeyColumns: ["order_id"]
                }
            ]
        };
    }

    it("canAddCdcSink", async function () {
        const connectionString = createSqlConnectionString();
        const putResult = await store.maintenance.send(new PutConnectionStringOperation(connectionString));
        assertThat(putResult.raftCommandIndex)
            .isNotNull();

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

        assertThat(addResult)
            .isNotNull();
        assertThat(addResult.taskId > 0)
            .isTrue();

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks)
            .hasSize(1);
        assertThat(record.cdcSinks[0].name)
            .isEqualTo("test-cdc");
        assertThat(record.cdcSinks[0].connectionStringName)
            .isEqualTo(connectionString.name);
    });

    it("canUpdateCdcSink", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

        // Update the configuration
        config.taskId = addResult.taskId;
        config.tables[0].sourceTableName = "updated_orders";

        const updateResult = await store.maintenance.send(new UpdateCdcSinkOperation(addResult.taskId, config));
        assertThat(updateResult)
            .isNotNull();

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks)
            .hasSize(1);
        assertThat(record.cdcSinks[0].tables[0].sourceTableName)
            .isEqualTo("updated_orders");
    });

    it("canDeleteCdcSink", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

        await store.maintenance.send(new DeleteOngoingTaskOperation(addResult.taskId, "CdcSink"));

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks)
            .hasSize(0);
    });

    it("canGetCdcSinkTaskInfo", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        config.disabled = true;
        await store.maintenance.send(new AddCdcSinkOperation(config));

        const taskInfo = (await store.maintenance.send(
            new GetOngoingTaskInfoOperation(config.name, "CdcSink"))) as OngoingTaskCdcSink;

        assertThat(taskInfo)
            .isNotNull();
        assertThat(taskInfo.error)
            .isNull();
        assertThat(taskInfo.taskState)
            .isEqualTo("Disabled");
        assertThat(taskInfo.configuration.disabled)
            .isTrue();
        assertThat(taskInfo.connectionStringName)
            .isEqualTo(connectionString.name);

        const nullTaskInfo = (await store.maintenance.send(
            new GetOngoingTaskInfoOperation("non-existing", "CdcSink"))) as OngoingTaskCdcSink;
        assertThat(nullTaskInfo)
            .isNull();
    });

    it("canToggleCdcSinkState", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

        // Disable
        await store.maintenance.send(new ToggleOngoingTaskStateOperation(addResult.taskId, "CdcSink", true));

        let record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks[0].disabled)
            .isTrue();

        // Re-enable
        await store.maintenance.send(new ToggleOngoingTaskStateOperation(addResult.taskId, "CdcSink", false));

        record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks[0].disabled)
            .isFalse();
    });

    it("canAddMultipleCdcSinks", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config1 = createCdcSinkConfiguration("cdc-sink-1", connectionString.name);
        const config2 = createCdcSinkConfiguration("cdc-sink-2", connectionString.name);

        await store.maintenance.send(new AddCdcSinkOperation(config1));
        await store.maintenance.send(new AddCdcSinkOperation(config2));

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks)
            .hasSize(2);

        const names = record.cdcSinks.map(x => x.name);
        assertThat(names)
            .contains("cdc-sink-1");
        assertThat(names)
            .contains("cdc-sink-2");
    });
});
