import {
    AbstractCsharpIndexCreationTask,
    DeleteByQueryOperation,
    IDocumentStore,
    IndexQuery,
    IOperationProgress,
    QueryOperationOptions
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { Company } from "../../Assets/Entities.js";

class Company_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from c in docs.Companies select new { c.name }";
    }
}

describe("RavenDB_11662", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async s => {
            s.conventions.operationStatusFetchMode = "Polling";
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    it("canUsePollingForFetchingOperationStatus", async () => {
        await new Company_ByName().execute(store);

        const session = store.openSession();
        for (let i = 0; i < 1500; i++) {
            await session.store(Object.assign(new Company(), { name: "Company " + i }));
        }
        await session.saveChanges();

        await testContext.waitForIndexing(store);

        const operation = await store.operations.send(new DeleteByQueryOperation(
            new IndexQuery(`FROM INDEX '${new Company_ByName().getIndexName()}'`),
            // slows the operation down, so an "in progress" state is polled before "completed"
            { maxOpsPerSecond: 500 } as QueryOperationOptions));

        const progresses: IOperationProgress[] = [];
        operation.on("progress", progress => progresses.push(progress));

        await operation.waitForCompletion(30_000);

        assertThat(progresses).isNotEmpty();
    });
});
