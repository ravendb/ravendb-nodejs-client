import { milliseconds } from "date-fns";
import {
    AbstractCsharpIndexCreationTask,
    IDocumentStore,
    StopIndexingOperation,
    TransactionMode
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class TestObj {
    public id: string;
    public prop: string;
}

class Simple_Map_Index extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from c in docs.TestObjs select new { Name = \"\" }";
    }
}

describe("RavenDB_18373", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const transactionMode: TransactionMode = "SingleNode";

    it("waiting for index doesnt work for cluster wide transaction (SingleNode)", async () => {
        const index = new Simple_Map_Index();
        await index.execute(store);
        await store.maintenance.send(new StopIndexingOperation());

        const session = store.openSession({ transactionMode });
        session.advanced.waitForIndexesAfterSaveChanges({ timeout: milliseconds({ seconds: 3 }) });

        await session.store(new TestObj(), "testObjs/0");
        await assertThrows(() => session.saveChanges(), err => {
            assertThat(err.name)
                .isEqualTo("RavenTimeoutException");
            assertThat(err.message)
                .contains(`total stale indexes: 1 (${index.getIndexName()})`);
        });
    });

    it("waiting for index doesnt work for cluster wide transaction delete (SingleNode)", async () => {
        await new Simple_Map_Index().execute(store);

        {
            const session = store.openSession({ transactionMode });
            session.advanced.waitForIndexesAfterSaveChanges({ timeout: milliseconds({ seconds: 3 }) });
            await session.store(new TestObj(), "testObjs/0");
            await session.store(new TestObj(), "testObjs/1");
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store, store.database, milliseconds({ seconds: 15 }));

        await store.maintenance.send(new StopIndexingOperation());

        {
            const session = store.openSession({ transactionMode });
            session.advanced.waitForIndexesAfterSaveChanges({ timeout: milliseconds({ seconds: 3 }) });

            await session.delete("testObjs/0");
            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenTimeoutException");
            });
        }
    });
});
