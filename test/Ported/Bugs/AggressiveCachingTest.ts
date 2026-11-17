import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("AggressiveCaching", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        await session.store(new User(), "users/1-A");
        await session.saveChanges();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function countRequests(action: () => Promise<void>) {
        const requestExecutor = store.getRequestExecutor();
        const before = requestExecutor.numberOfServerRequests;

        for (let i = 0; i < 5; i++) {
            await action();
        }

        return requestExecutor.numberOfServerRequests - before;
    }

    function assertCachedAfterFirstRequest(requests: number) {
        assertThat(requests >= 1 && requests <= 2).isTrue();
    }

    it("canAggressivelyCacheLoads_404", async () => {
        assertCachedAfterFirstRequest(await countRequests(async () => {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.load("users/not-there", User));
        }));
    });

    it("canAggressivelyCacheLoads", async () => {
        assertCachedAfterFirstRequest(await countRequests(async () => {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.load("users/1-A", User));
        }));
    });

    it("canAggressivelyCacheQueries", async () => {
        assertCachedAfterFirstRequest(await countRequests(async () => {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.query(User).all());
        }));
    });

    it("waitForNonStaleResultsIgnoresAggressiveCaching", async () => {
        const requests = await countRequests(async () => {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.query(User).waitForNonStaleResults().all());
        });

        assertThat(requests).isNotEqualTo(1);
    });
});
