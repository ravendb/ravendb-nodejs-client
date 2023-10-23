import {
    AddEtlOperation, GetOngoingTaskInfoOperation,
    IDocumentStore,
    OlapConnectionString,
    OlapEtlConfiguration,
    PutConnectionStringOperation, Transformation
} from "../../../../../src";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../Utils/TestUtil";
import { OngoingTaskOlapEtlDetails } from "../../../../../src/Documents/Operations/OngoingTasks/OngoingTask";
import { assertThat } from "../../../../Utils/AssertExtensions";

(RavenTestContext.isPullRequest ? describe.skip : describe)("OlapTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canSetupOlap", async () => {

        const connectionString = new OlapConnectionString();
        connectionString.name = "o1";
        connectionString.ftpSettings = {
            url: "localhost:9090",
        };
        connectionString.type = "Olap";

        await store.maintenance.send(new PutConnectionStringOperation(connectionString));

        const etlConfiguration = new OlapEtlConfiguration();
        etlConfiguration.connectionStringName = "o1";
        etlConfiguration.etlType = "Olap";
        const transformation = new Transformation();
        transformation.collections = ["Orders"];
        transformation.script = "var userData = { UserId: id(this), Name: this.Name }; loadToTest(userData)";
        transformation.name = "Script #1";
        etlConfiguration.transforms = [transformation];

        const etlResult = await store.maintenance.send(new AddEtlOperation(etlConfiguration));

        const ongoingTask = await store.maintenance.send(new GetOngoingTaskInfoOperation(etlResult.taskId, "OlapEtl")) as OngoingTaskOlapEtlDetails;

        assertThat(ongoingTask)
            .isNotNull();
        assertThat(ongoingTask.taskType)
            .isEqualTo("OlapEtl");
        assertThat(ongoingTask.configuration instanceof OlapEtlConfiguration)
            .isTrue();
        assertThat(ongoingTask.configuration.transforms)
            .hasSize(1);
        assertThat(ongoingTask.configuration.transforms[0] instanceof Transformation)
            .isTrue();
    });
});
