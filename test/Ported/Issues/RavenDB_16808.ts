import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestObj {
    public id: string;
    public largeContent: string;
}

describe("RavenDB_16808", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("shouldIncrementOnlySessionAdvancedNumberOfRequests", async () => {
        const requestExecutor = store.getRequestExecutor();
        const entity = new TestObj();

        {
            const session = store.openSession();
            await session.store(entity);
            await session.saveChanges();
        }

        await store.openSession().load(entity.id, TestObj);

        const session = store.openSession();
        await store.aggressivelyCacheFor(Number.MAX_SAFE_INTEGER, { mode: "DoNotTrackChanges" }, async () => {
            const reBefore = requestExecutor.numberOfServerRequests;
            const sessionBefore = session.advanced.numberOfRequests;

            await session.load(entity.id, TestObj);

            assertThat(session.advanced.numberOfRequests - sessionBefore).isEqualTo(1);
            assertThat(requestExecutor.numberOfServerRequests - reBefore).isEqualTo(0);
        });
    });
});
