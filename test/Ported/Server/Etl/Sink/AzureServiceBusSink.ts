import {
    IDocumentStore,
    PutConnectionStringOperation,
    GetConnectionStringsOperation,
    GetDatabaseRecordOperation,
    QueueConnectionString,
    AddQueueSinkOperation,
    GetOngoingTaskInfoOperation,
    OngoingTaskQueueSink,
    QueueSinkConfiguration,
    AzureServiceBusConnectionSettings,
    AzureServiceBusSinkSource
} from "../../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../../../Utils/AssertExtensions.js";

const fakeConnectionString = "Endpoint=sb://ns.servicebus.windows.net/;SharedAccessKeyName=key;SharedAccessKey=abc";

// A fake sb:// string passes server validation (the authoritative check happens at connect
// time in the Azure SDK), so the whole setup path runs without a reachable namespace.
(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("AzureServiceBusSink", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canSetupAzureServiceBusSink", async function () {
        const connectionStringName = "asb-cs";
        const connectionString = new QueueConnectionString();
        connectionString.name = connectionStringName;
        connectionString.brokerType = "AzureServiceBus";
        connectionString.azureServiceBusConnectionSettings = new AzureServiceBusConnectionSettings();
        connectionString.azureServiceBusConnectionSettings.connectionString = fakeConnectionString;

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(connectionString));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(
            new GetConnectionStringsOperation(connectionStringName, "Queue"));
        const readBack = connectionStrings.queueConnectionStrings[connectionStringName];
        assertThat(readBack)
            .isNotNull();
        assertThat(readBack.brokerType)
            .isEqualTo("AzureServiceBus");
        assertThat(readBack.azureServiceBusConnectionSettings.connectionString)
            .isEqualTo(fakeConnectionString);

        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.queueConnectionStrings[connectionStringName].azureServiceBusConnectionSettings.connectionString)
            .isEqualTo(fakeConnectionString);

        // A disabled sink never reaches the namespace; the subscription helper encodes topic;subscription.
        const queueSinkConfiguration: QueueSinkConfiguration = {
            brokerType: "AzureServiceBus",
            disabled: true,
            name: "AzureServiceBusSink",
            connectionStringName,
            scripts: [
                {
                    name: "Script #1",
                    queues: [
                        AzureServiceBusSinkSource.queue("users"),
                        AzureServiceBusSinkSource.subscription("orders", "subscribers")
                    ],
                    script: "this.a = 5"
                }
            ]
        };

        const addResult = await store.maintenance.send(new AddQueueSinkOperation(queueSinkConfiguration));
        assertThat(addResult)
            .isNotNull();
        assertThat(addResult.taskId)
            .isGreaterThan(0);

        const sink = (await store.maintenance.send(
            new GetOngoingTaskInfoOperation(queueSinkConfiguration.name, "QueueSink"))) as OngoingTaskQueueSink;
        assertThat(sink)
            .isNotNull();
        assertThat(sink.taskState)
            .isEqualTo("Disabled");
        assertThat(sink.brokerType)
            .isEqualTo("AzureServiceBus");
        assertThat(sink.connectionStringName)
            .isEqualTo(connectionStringName);
        assertThat(sink.configuration.scripts[0].queues)
            .contains("users");
        assertThat(sink.configuration.scripts[0].queues)
            .contains("orders;subscribers");
    });

    it("serverRejectsInvalidSubscriptionEntry", async function () {
        const connectionStringName = "asb-cs";
        const connectionString = new QueueConnectionString();
        connectionString.name = connectionStringName;
        connectionString.brokerType = "AzureServiceBus";
        connectionString.azureServiceBusConnectionSettings = { connectionString: fakeConnectionString };
        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        // The server validates topic/subscription entries at raft apply; a bare "topic;"
        // with an empty subscription half is rejected.
        const invalidSinkConfiguration: QueueSinkConfiguration = {
            brokerType: "AzureServiceBus",
            disabled: true,
            name: "AzureServiceBusInvalid",
            connectionStringName,
            scripts: [
                {
                    name: "S",
                    queues: ["topic;"],
                    script: "this.a = 5"
                }
            ]
        };

        await assertThrows(() => store.maintenance.send(new AddQueueSinkOperation(invalidSinkConfiguration)), err => {
            assertThat((err as Error).message)
                .contains("Invalid Queue Sink configuration.");
        });
    });
});
