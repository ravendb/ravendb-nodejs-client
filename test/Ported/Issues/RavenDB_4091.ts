import {
    AbstractCsharpIndexCreationTask,
    DeleteByQueryOperation,
    DeterminateProgress,
    IDocumentStore,
    IndexQuery,
    IOperationProgress,
    PatchByQueryOperation,
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

describe("RavenDB_4091", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async s => {
            s.conventions.operationStatusFetchMode = "ChangesApi";
        };
        store = await testContext.getDocumentStore();
        await new Company_ByName().execute(store);
        await put1500Companies(store);
        await testContext.waitForIndexing(store);
    });

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    it("can_get_in_progress_operation_when_deleting_by_index", async () => {
        const operation = await store.operations.send(new DeleteByQueryOperation(
            new IndexQuery(`FROM INDEX '${new Company_ByName().getIndexName()}'`),
            // slows the operation down, so an "in progress" notification comes before "completed"
            { maxOpsPerSecond: 500 } as QueryOperationOptions));

        const progresses: IOperationProgress[] = [];
        operation.on("progress", progress => progresses.push(progress));

        await operation.waitForCompletion(300_000);

        assertThat(store.changes(store.database, operation.nodeTag).connected).isTrue();
        assertLastProgressCoversAllCompanies(progresses);
    });

    it("can_get_in_progress_operation_when_patching_by_script", async () => {
        const operation = await store.operations.send(new PatchByQueryOperation(
            new IndexQuery(`FROM INDEX '${new Company_ByName().getIndexName()}' UPDATE { this.sample = 'Value' }`)));

        const progresses: IOperationProgress[] = [];
        operation.on("progress", progress => progresses.push(progress));

        await operation.waitForCompletion(15_000);

        assertThat(store.changes(store.database, operation.nodeTag).connected).isTrue();
        assertLastProgressCoversAllCompanies(progresses);
    });
});

function assertLastProgressCoversAllCompanies(progresses: IOperationProgress[]) {
    assertThat(progresses).isNotEmpty();
    const last = progresses.at(-1) as DeterminateProgress;
    assertThat(last.processed).isEqualTo(1500);
    assertThat(last.total).isEqualTo(1500);
}

async function put1500Companies(store: IDocumentStore) {
    const session = store.openSession();
    for (let i = 0; i < 1500; i++) {
        await session.store(Object.assign(new Company(), { name: "Company " + i }));
    }
    await session.saveChanges();
}
