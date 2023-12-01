import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../Utils/TestUtil";
import {
    AddEtlOperation, GetOngoingTaskInfoOperation,
    IDocumentStore,
    PutConnectionStringOperation,
    QueueConnectionString, Transformation
} from "../../../../../src";
import { QueueEtlConfiguration } from "../../../../../src/Documents/Operations/Etl/Queue/QueueEtlConfiguration";
import { OngoingTaskQueueEtlDetails } from "../../../../../src/Documents/Operations/OngoingTasks/OngoingTask";
import { assertThat } from "../../../../Utils/AssertExtensions";


(RavenTestContext.isPullRequest ? describe.skip : describe)("KafkaTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canSetupKafka", async () => {
        const connectionString = new QueueConnectionString();
        connectionString.name = "k1";
        connectionString.brokerType = "Kafka";
        connectionString.kafkaConnectionSettings = {
            bootstrapServers: "localhost:9092",
        }

        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const etlConfiguration = new QueueEtlConfiguration();
        etlConfiguration.connectionStringName = "k1";
        etlConfiguration.transforms = [
            {
                collections: ["Orders"],
                script: "var userData = { UserId: id(this), Name: this.Name }; loadToTest(userData)",
                name: "Script #1"
            }
        ];
        etlConfiguration.brokerType = "Kafka";

        const etlResult = await store.maintenance.send(new AddEtlOperation(etlConfiguration));

        const ongoingTask = await store.maintenance.send(new GetOngoingTaskInfoOperation(etlResult.taskId, "QueueEtl")) as OngoingTaskQueueEtlDetails;

        assertThat(ongoingTask)
            .isNotNull();
        assertThat(ongoingTask.taskType)
            .isEqualTo("QueueEtl");
        assertThat(ongoingTask.configuration instanceof QueueEtlConfiguration)
            .isTrue();
        assertThat(ongoingTask.configuration.etlType)
            .isEqualTo("Queue");
        assertThat(ongoingTask.configuration.brokerType)
            .isEqualTo("Kafka");
        assertThat(ongoingTask.configuration.transforms)
            .hasSize(1);
        assertThat(ongoingTask.configuration.transforms[0] instanceof Transformation)
            .isTrue();

    });
});
