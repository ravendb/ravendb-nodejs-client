import { IDocumentStore } from "../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../Utils/AssertExtensions.js";
import { User } from "../Assets/Entities.js";

describe("AggressiveCachingScopeTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        const session = store.openSession();
        await session.store(new User(), "users/1");
        await session.saveChanges();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function requests() {
        return store.getRequestExecutor().numberOfServerRequests;
    }

    async function load() {
        await store.openSession().load("users/1", User);
    }

    it("applies to the action and what it awaits, and returns its result", async () => {
        const result = await store.aggressivelyCacheFor(60_000, async () => {
            await load();
            const before = requests();
            await load();
            return requests() - before;
        });

        assertThat(result).isEqualTo(0);
    });

    it("does not leak to the caller after the action", async () => {
        await store.aggressivelyCacheFor(60_000, () => load());

        assertThat(store.getRequestExecutor().aggressiveCaching).isNull();
        const before = requests();
        await load();
        assertThat(requests() - before).isEqualTo(1);
    });

    it("does not apply to work running next to the action", async () => {
        await store.aggressivelyCacheFor(60_000, () => load());

        let outside: number;
        await Promise.all([
            store.aggressivelyCacheFor(60_000, () => load()),
            (async () => {
                const before = requests();
                await load();
                outside = requests() - before;
            })()
        ]);

        assertThat(outside).isGreaterThan(0);
    });

    it("disableAggressiveCaching turns it off inside an aggressive action", async () => {
        await store.aggressivelyCacheFor(60_000, async () => {
            await load();

            const before = requests();
            await store.disableAggressiveCaching(() => load());
            assertThat(requests() - before).isEqualTo(1);
        });
    });

    it("aggressivelyCache uses the conventions", async () => {
        const options = await store.aggressivelyCache(() => store.getRequestExecutor().aggressiveCaching);

        assertThat(options.duration).isEqualTo(store.conventions.aggressiveCache.duration);
        assertThat(options.mode).isEqualTo("TrackChanges");
    });

    it("rejects a missing action", async () => {
        await assertThrows(
            () => store.aggressivelyCacheFor(60_000, null),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });
});
