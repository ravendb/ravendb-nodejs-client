import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_2209", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("lazyLoadResultShouldBeUpToDateEvenIfAggressiveCacheIsEnabled", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { id: "users/1", name: "Arek" }));
            await session.saveChanges();
        }

        await store.aggressivelyCache(async () => {
            {
                const users = await store.openSession().load(["users/1"], User);
                assertThat(users["users/1"].name).isEqualTo("Arek");
            }

            const lazilyLoadName = async () => {
                const session = store.openSession();
                const users = session.advanced.lazily.load(["users/1"], User);
                session.advanced.lazily.load(["users/2"], User);
                return (await users.getValue())["users/1"].name;
            };

            assertThat(await lazilyLoadName()).isEqualTo("Arek");

            const requestExecutor = store.getRequestExecutor();
            const before = requestExecutor.cache.generation;

            {
                const session = store.openSession();
                await session.store(Object.assign(new User(), { id: "users/1", name: "Adam" }));
                await session.saveChanges();
            }

            await testContext.waitForValue(async () => requestExecutor.cache.generation > before, true);

            assertThat(await lazilyLoadName()).isEqualTo("Adam");
        });
    });
});
