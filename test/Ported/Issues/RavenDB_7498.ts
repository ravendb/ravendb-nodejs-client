import { DocumentStore, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_7498", function () {

    let store: IDocumentStore;
    let anotherStore: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async s => {
            s.conventions.aggressiveCache.mode = "DoNotTrackChanges";
        };
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        await session.store(new User(), "users/1-A");
        await session.saveChanges();

        anotherStore = new DocumentStore(store.urls, store.database);
        anotherStore.initialize();
    });

    afterEach(async () => {
        testContext.customizeStore = null;
        anotherStore.dispose();
        await disposeTestDocumentStore(store);
    });

    async function withBackgroundUpdates(action: () => Promise<void>) {
        let stop = false;
        const updates = (async () => {
            while (!stop) {
                const session = anotherStore.openSession();
                await session.store(new User(), "users|");
                await session.store(new User(), "users/1-A");
                await session.saveChanges();
            }
        })();

        try {
            await action();
        } finally {
            stop = true;
            await updates;
        }
    }

    async function countRequests(action: () => Promise<void>) {
        const requestExecutor = store.getRequestExecutor();
        const before = requestExecutor.numberOfServerRequests;

        await withBackgroundUpdates(async () => {
            for (let i = 0; i < 10; i++) {
                await action();
            }
        });

        return requestExecutor.numberOfServerRequests - before;
    }

    it("canAggressivelyCacheLoads_404", async () => {
        const requests = await countRequests(async () => {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.load("users/not-there", User));
        });

        assertThat(requests).isEqualTo(1);
    });

    it("canAggressivelyCacheLoads", async () => {
        const requests = await countRequests(async () => {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.load("users/1-A", User));
        });

        assertThat(requests).isEqualTo(1);
    });

    it("canAggressivelyCacheQueries", async () => {
        const requests = await countRequests(async () => {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.query(User).all());
        });

        assertThat(requests).isEqualTo(1);
    });

    it("waitForNonStaleResultsIgnoresAggressiveCaching", async () => {
        const requestExecutor = store.getRequestExecutor();
        const before = requestExecutor.numberOfServerRequests;

        for (let i = 0; i < 5; i++) {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, () => session.query(User).waitForNonStaleResults().all());
        }

        assertThat(requestExecutor.numberOfServerRequests - before).isNotEqualTo(1);
    });
});
