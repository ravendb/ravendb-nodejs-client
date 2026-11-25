import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("Advanced", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        await session.store(Object.assign(new User(), { name: "Name" }), "users/1");
        await session.saveChanges();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canAggressivelyCacheFor", async () => {
        {
            const session = store.openSession();
            assertThat(session.advanced.numberOfRequests).isEqualTo(0);
            await session.load("users/1", User);
            assertThat(session.advanced.requestExecutor.cache.numberOfItems).isEqualTo(1);
            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        }

        const session = store.openSession();
        await session.load("users/1", User);
        assertThat(session.advanced.requestExecutor.cache.numberOfItems).isEqualTo(1);
        assertThat(session.advanced.numberOfRequests).isEqualTo(1);

        for (let i = 0; i <= 20; i++) {
            await store.aggressivelyCacheFor(30_000, () => session.load("users/1", User));
        }

        assertThat(session.advanced.numberOfRequests).isEqualTo(1);
    });

    it("canAggressivelyCacheAfterModification", async () => {
        {
            const session = store.openSession();
            assertThat(session.advanced.numberOfRequests).isEqualTo(0);
            await session.load("users/1", User);
            assertThat(session.advanced.requestExecutor.cache.numberOfItems).isEqualTo(1);
            assertThat(session.advanced.requestExecutor.cache.generation).isEqualTo(0);
            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        }

        await store.aggressivelyCacheFor(60 * 60_000, async () => {
            const requestExecutor = store.getRequestExecutor();

            {
                const session = store.openSession();
                await session.store(Object.assign(new User(), { name: "Grisha" }), "users/2");
                await session.saveChanges();
            }

            assertThat(await testContext.waitForValue(async () => requestExecutor.cache.generation, 1)).isEqualTo(1);

            const before = requestExecutor.numberOfServerRequests;
            for (let i = 0; i < 20; i++) {
                await store.openSession().load("users/1", User);
            }

            assertThat(requestExecutor.numberOfServerRequests - before).isEqualTo(1);
        });
    });
});
