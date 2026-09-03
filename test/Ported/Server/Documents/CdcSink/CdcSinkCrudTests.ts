import {
    IDocumentStore,
    PutConnectionStringOperation,
    SqlConnectionString,
    AddCdcSinkOperation,
    CdcSinkConfiguration,
    CdcSinkTableConfig,
    CdcSinkEmbeddedTableConfig,
    CdcSinkLinkedTableConfig,
    CdcSinkOnDeleteConfig,
    UpdateCdcSinkOperation,
    GetOngoingTaskInfoOperation,
    GetDatabaseRecordOperation,
    DeleteOngoingTaskOperation,
    ToggleOngoingTaskStateOperation,
    OngoingTaskCdcSink
} from "../../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../Utils/TestUtil.js";
import { assertThat } from "../../../../Utils/AssertExtensions.js";

(RavenTestContext.isPullRequest || !RavenTestContext.isRavenDbServerVersion("7.2") ? describe.skip : describe)("CdcSinkCrudTests", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canAddCdcSink", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        config.disabled = true;

        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

        assertThat(addResult)
            .isNotNull();
        assertThat(addResult.taskId)
            .isGreaterThan(0);

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks.length)
            .isEqualTo(1);
        const cdcSink = record.cdcSinks[0];
        assertThat(cdcSink.name)
            .isEqualTo("test-cdc");
        assertThat(cdcSink.connectionStringName)
            .isEqualTo(connectionString.name);
        assertThat(cdcSink.disabled)
            .isTrue();
        assertThat(cdcSink.tables.length)
            .isEqualTo(1);
        assertThat(cdcSink.tables[0].collectionName)
            .isEqualTo("Orders");
        assertThat(cdcSink.tables[0].sourceTableSchema)
            .isEqualTo("public");
        assertThat(cdcSink.tables[0].sourceTableName)
            .isEqualTo("orders");
        assertThat(cdcSink.tables[0].primaryKeyColumns)
            .contains("order_id");
        assertThat(cdcSink.tables[0].onDelete.ignoreDeletes)
            .isTrue();
        assertThat(cdcSink.tables[0].embeddedTables.length)
            .isEqualTo(1);
        assertThat(cdcSink.tables[0].embeddedTables[0].propertyName)
            .isEqualTo("Lines");
        assertThat(cdcSink.tables[0].linkedTables.length)
            .isEqualTo(1);
        assertThat(cdcSink.tables[0].linkedTables[0].linkedCollectionName)
            .isEqualTo("Customers");
    });

    it("canUpdateCdcSink", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        config.disabled = true;

        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

        // Update the configuration
        config.tables[0].sourceTableName = "updated_orders";

        const updateResult = await store.maintenance.send(new UpdateCdcSinkOperation(addResult.taskId, config));
        assertThat(updateResult)
            .isNotNull();

        // Update deletes and re-adds the task: the task id in the record becomes the update's raft index
        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks.length)
            .isEqualTo(1);
        assertThat(record.cdcSinks[0].taskId)
            .isEqualTo(updateResult.taskId);
        assertThat(record.cdcSinks[0].tables[0].sourceTableName)
            .isEqualTo("updated_orders");

        const taskInfo = (await store.maintenance.send(
            new GetOngoingTaskInfoOperation(config.name, "CdcSink"))) as OngoingTaskCdcSink;
        assertThat(taskInfo)
            .isNotNull();
        assertThat(taskInfo.configuration.tables[0].sourceTableName)
            .isEqualTo("updated_orders");
        assertThat(taskInfo.configuration.tables[0].onDelete.ignoreDeletes)
            .isTrue();
    });

    it("canDeleteCdcSink", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        config.disabled = true;

        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

        await store.maintenance.send(new DeleteOngoingTaskOperation(addResult.taskId, "CdcSink"));

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.cdcSinks.length)
            .isEqualTo(0);
    });

    it("canGetCdcSinkTaskInfo", async function () {
        const connectionString = createSqlConnectionString();
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const config = createCdcSinkConfiguration("test-cdc", connectionString.name);
        config.disabled = true;

        const addResult = await store.maintenance.send(new AddCdcSinkOperation(config));

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
        assertThat(taskInfo.configuration.name)
            .isEqualTo("test-cdc");
        assertThat(taskInfo.configuration.tables[0].sourceTableName)
            .isEqualTo("orders");
        assertThat(taskInfo.configuration.tables[0].onDelete.ignoreDeletes)
            .isTrue();

        const nonExisting = await store.maintenance.send(new GetOngoingTaskInfoOperation("non-existing", "CdcSink"));
        assertThat(nonExisting)
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
        assertThat(record.cdcSinks.length)
            .isEqualTo(2);

        const names = record.cdcSinks.map(x => x.name);
        assertThat(names)
            .contains("cdc-sink-1");
        assertThat(names)
            .contains("cdc-sink-2");
    });
});

function createSqlConnectionString(name = "test-sql"): SqlConnectionString {
    const connectionString = new SqlConnectionString();
    connectionString.name = name;
    connectionString.factoryName = "Microsoft.Data.SqlClient";
    connectionString.connectionString = "Server=localhost;Database=TestDb;User Id=sa;Password=pass;";
    return connectionString;
}

function createCdcSinkConfiguration(name: string, connectionStringName: string): CdcSinkConfiguration {
    const config = new CdcSinkConfiguration();
    config.name = name;
    config.connectionStringName = connectionStringName;

    const table = new CdcSinkTableConfig();
    table.collectionName = "Orders";
    table.sourceTableSchema = "public";
    table.sourceTableName = "orders";
    table.columns = [
        { column: "order_id", name: "OrderId" },
        { column: "customer_id", name: "CustomerId" }
    ];
    table.primaryKeyColumns = ["order_id"];

    const onDelete = new CdcSinkOnDeleteConfig();
    onDelete.patch = "this.Archived = true; this.ArchivedAt = new Date().toISOString();";
    onDelete.ignoreDeletes = true;
    table.onDelete = onDelete;

    const embedded = new CdcSinkEmbeddedTableConfig();
    embedded.sourceTableSchema = "public";
    embedded.sourceTableName = "order_lines";
    embedded.propertyName = "Lines";
    embedded.columns = [
        { column: "line_id", name: "LineId" },
        { column: "product_id", name: "ProductId" }
    ];
    embedded.primaryKeyColumns = ["line_id"];
    embedded.joinColumns = ["order_id"];
    embedded.type = "Array";
    table.embeddedTables = [embedded];

    const linked = new CdcSinkLinkedTableConfig();
    linked.sourceTableSchema = "public";
    linked.sourceTableName = "customers";
    linked.propertyName = "Customer";
    linked.joinColumns = ["customer_id"];
    linked.linkedCollectionName = "Customers";
    table.linkedTables = [linked];

    config.tables = [table];
    return config;
}
