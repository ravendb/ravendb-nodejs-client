import {
    DocumentStore,
    GetStatisticsOperation,
    IDocumentStore,
    PatchCommandData,
    PatchRequest,
    TransactionMode
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Foo {
    public name: string;
}

class TestObj {
    public id: string;
    public prop: string;
}

function assertConcurrencyException(err: Error) {
    assertThat(err.name).isEqualTo("ConcurrencyException");
}

describe("OptimisticConcurrency", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeFooOne(fooId: string) {
        const session = store.openSession();
        await session.store(Object.assign(new Foo(), { name: "One" }), fooId);
        await session.saveChanges();
    }

    it("store should throw exception if doc exists and optimistic concurrency is enabled", async () => {
        const fooId = "Foos/1";
        await storeFooOne(fooId);

        const newSession = store.openSession();
        newSession.advanced.useOptimisticConcurrency = true;
        await newSession.store(Object.assign(new Foo(), { name: "Two" }), fooId);
        await assertThrows(() => newSession.saveChanges(), err => {
            assertConcurrencyException(err);
            assertThat(err.message).startsWith("Document Foos/1 has change vector A:1-");
        });
    });

    for (const changeVector of ["", "A:1-dummyDbId"]) {
        it(`store should throw exception if doc exists and optimistic concurrency is enabled with invalid change vector "${changeVector}"`, async () => {
            const fooId = "Foos/1";
            await storeFooOne(fooId);

            const newSession = store.openSession();
            newSession.advanced.useOptimisticConcurrency = true;
            await newSession.store(Object.assign(new Foo(), { name: "Two" }), fooId, { changeVector });
            await assertThrows(() => newSession.saveChanges(), err => {
                assertConcurrencyException(err);
                assertThat(err.message).startsWith("Document Foos/1 has change vector A:1-");
            });
        });
    }

    it("delete should throw exception if doc exists and optimistic concurrency is enabled", async () => {
        const fooId = "Foos/1";
        await storeFooOne(fooId);

        const newSession = store.openSession();
        newSession.advanced.useOptimisticConcurrency = true;
        newSession.delete(fooId, "A:1-dummy");
        await assertThrows(() => newSession.saveChanges(), err => {
            assertConcurrencyException(err);
            assertThat(err.message).startsWith("Document Foos/1 has change vector A:1-");
        });
    });

    describe("with tombstone cleanup disabled", function () {

        let tombstoneStore: DocumentStore;

        beforeEach(async () => {
            testContext.customizeStore = async s => {
                s.conventions.useOptimisticConcurrency = true;
            };
            try {
                tombstoneStore = await testContext.getDocumentStore("OptimisticConcurrency", false, null, record => {
                    record.settings["Tombstones.CleanupIntervalInMin"] = String(2_147_483_647);
                });
            } finally {
                testContext.customizeStore = null;
            }
        });

        afterEach(async () => await disposeTestDocumentStore(tombstoneStore));

        async function countOfTombstones(): Promise<number> {
            const stats = await tombstoneStore.maintenance.send(new GetStatisticsOperation());
            return stats.countOfTombstones;
        }

        const id = "TestObjs/1";

        async function storeAndDeleteTestObj() {
            const session = tombstoneStore.openSession();
            await session.store(new TestObj(), id);
            await session.saveChanges();

            session.delete(id);
            await session.saveChanges();
        }

        it("merged batch command put when document already deleted and fail on concurrency should not delete tombstone", async () => {
            await storeAndDeleteTestObj();

            assertThat(await countOfTombstones()).isGreaterThan(0);
            const session = tombstoneStore.openSession();
            await session.store(new TestObj(), id, { changeVector: "someConflictedChangeVector" });
            await assertThrows(() => session.saveChanges(), assertConcurrencyException);
            assertThat(await countOfTombstones()).isGreaterThan(0);
        });

        it("merged batch command patch when document already deleted and fail on concurrency should not delete tombstone", async () => {
            await storeAndDeleteTestObj();

            assertThat(await countOfTombstones()).isGreaterThan(0);
            const session = tombstoneStore.openSession();
            session.advanced.defer(new PatchCommandData(id, "someConflictedChangeVector", PatchRequest.forScript("this.Prop = Changed"), null));
            await assertThrows(() => session.saveChanges(), assertConcurrencyException);
            assertThat(await countOfTombstones()).isGreaterThan(0);
        });
    });

    const transactionModes: TransactionMode[] = ["ClusterWide", "SingleNode"];
    for (const transactionMode of transactionModes) {
        it(`trx merger when merge trx of success put following by any failing command should return the right change vector for put (${transactionMode})`, async () => {
            const concurrencyFailedId = "TestObj/concurrencyFailed";
            const checkedId = "TestObj/checked";

            for (let i = 0; i < 10; i++) {
                {
                    const session = store.openSession();
                    await session.store(new TestObj(), concurrencyFailedId);
                    await session.saveChanges();
                }

                const failingSession = store.openSession();
                failingSession.advanced.useOptimisticConcurrency = true;
                await failingSession.store(new TestObj(), concurrencyFailedId, { changeVector: "wrongChangedVector" });

                const checkedSession = store.openSession({ transactionMode });
                const checkedEntity = new TestObj();
                await checkedSession.store(checkedEntity, checkedId);

                await Promise.all([
                    assertThrows(() => failingSession.saveChanges(), assertConcurrencyException),
                    checkedSession.saveChanges()
                ]);

                const session2 = store.openSession({ transactionMode });
                const loadedCheck = await session2.load(checkedId, TestObj);
                assertThat(session2.advanced.getChangeVectorFor(loadedCheck))
                    .isEqualTo(checkedSession.advanced.getChangeVectorFor(checkedEntity));

                const cleanupSession = store.openSession({ transactionMode });
                cleanupSession.delete(concurrencyFailedId);
                cleanupSession.delete(checkedId);
                await cleanupSession.saveChanges();
            }
        });
    }
});
