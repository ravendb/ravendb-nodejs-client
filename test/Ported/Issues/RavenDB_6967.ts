import {
    GetIndexErrorsOperation,
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation,
    StopIndexingOperation
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { RavenTestHelper } from "../../Utils/RavenTestHelper";
import { DeleteIndexErrorsOperation } from "../../../src/Documents/Operations/Indexes/DeleteIndexErrorsOperation";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { Company } from "../../Assets/Entities";

describe("RavenDB_6967", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canDeleteIndexErrors", async () => {
        await RavenTestHelper.assertNoIndexErrors(store);

        await store.maintenance.send(new DeleteIndexErrorsOperation());

        await assertThrows(() => store.maintenance.send(new DeleteIndexErrorsOperation(["DoesNotExist"])),
            err => {
            assertThat(err.name)
                .isEqualTo("IndexDoesNotExistException");
            });

        const index1 = new IndexDefinition();
        index1.name = "Index1";
        index1.maps = new Set(["from doc in docs let x = 0 select new { Total = 3/x };"]);

        await store.maintenance.send(new PutIndexesOperation(index1));

        const index2 = new IndexDefinition();
        index2.name = "Index2";
        index2.maps = new Set(["from doc in docs let x = 0 select new { Total = 4/x };"]);

        await store.maintenance.send(new PutIndexesOperation(index2));

        const index3 = new IndexDefinition();
        index3.name = "Index3";
        index3.maps = new Set(["from doc in docs let x = 0 select new { Total = 5/x };"]);

        await store.maintenance.send(new PutIndexesOperation(index3));

        await testContext.waitForIndexing(store);

        await RavenTestHelper.assertNoIndexErrors(store);

        await store.maintenance.send(new DeleteIndexErrorsOperation());

        await store.maintenance.send(new DeleteIndexErrorsOperation(["Index1", "Index2", "Index3"]));

        await assertThrows(() => store.maintenance.send(new DeleteIndexErrorsOperation(["Index1", "DoesNotExist"])), err => {
            assertThat(err.name)
                .isEqualTo("IndexDoesNotExistException");
        });

        {
            const session = store.openSession();
            await session.store(new Company());
            await session.store(new Company());
            await session.store(new Company());

            await session.saveChanges();
        }

        await testContext.indexes.waitForIndexingErrors(store, 60_000, "Index1");
        await testContext.indexes.waitForIndexingErrors(store, 60_000, "Index2");
        await testContext.indexes.waitForIndexingErrors(store, 60_000, "Index3");

        await store.maintenance.send(new StopIndexingOperation());

        let indexErrors1 = await store.maintenance.send(new GetIndexErrorsOperation(["Index1"]));
        let indexErrors2 = await store.maintenance.send(new GetIndexErrorsOperation(["Index2"]));
        let indexErrors3 = await store.maintenance.send(new GetIndexErrorsOperation(["Index3"]));

        assertThat(indexErrors1.find(x => x.errors.length))
            .isNotNull();
        assertThat(indexErrors2.find(x => x.errors.length))
            .isNotNull();
        assertThat(indexErrors3.find(x => x.errors.length))
            .isNotNull();

        await store.maintenance.send(new DeleteIndexErrorsOperation(["Index2"]));

        indexErrors1 = await store.maintenance.send(new GetIndexErrorsOperation(["Index1"]));
        indexErrors2 = await store.maintenance.send(new GetIndexErrorsOperation(["Index2"]));
        indexErrors3 = await store.maintenance.send(new GetIndexErrorsOperation(["Index3"]));

        assertThat(indexErrors1.find(x => x.errors.length))
            .isNotNull();
        assertThat(indexErrors2.find(x => x.errors.length))
            .isNull();
        assertThat(indexErrors3.find(x => x.errors.length))
            .isNotNull();

        await store.maintenance.send(new DeleteIndexErrorsOperation());

        indexErrors1 = await store.maintenance.send(new GetIndexErrorsOperation(["Index1"]));
        indexErrors2 = await store.maintenance.send(new GetIndexErrorsOperation(["Index2"]));
        indexErrors3 = await store.maintenance.send(new GetIndexErrorsOperation(["Index3"]));

        assertThat(indexErrors1.find(x => x.errors.length))
            .isNull();
        assertThat(indexErrors2.find(x => x.errors.length))
            .isNull();
        assertThat(indexErrors3.find(x => x.errors.length))
            .isNull();

        await RavenTestHelper.assertNoIndexErrors(store);
    });
});
