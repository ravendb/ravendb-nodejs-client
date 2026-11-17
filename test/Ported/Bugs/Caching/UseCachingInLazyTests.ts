import {
    AggressiveCacheMode,
    IDocumentSession,
    IDocumentStore,
    InMemoryDocumentSessionOperations,
    MultiGetOperation
} from "../../../../src/index.js";
import { GetRequest } from "../../../../src/Documents/Commands/MultiGet/GetRequest.js";
import { StatusCodes } from "../../../../src/Http/StatusCode.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class Doc {
    public version: string;
}

type LoadFunc = (session: IDocumentSession, id: string) => Promise<unknown>;

const loadFuncs: [string, LoadFunc][] = [
    ["load", (session, id) => session.load(id, Doc)],
    ["lazilyLoad", (session, id) => session.advanced.lazily.load(id, Doc).getValue()]
];

describe("UseCachingInLazyTests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    // load only warms the cache; the check always uses a lazy load, like C#
    async function aggressiveCacheTest(load: LoadFunc, mode: AggressiveCacheMode, createVersion2: boolean) {
        const docId = "doc-1";

        {
            const session = store.openSession();
            await session.store(new Doc(), docId);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            await store.aggressivelyCacheFor(5 * 60_000, { mode: "TrackChanges" }, () => load(session, docId));
        }

        if (createVersion2) {
            const cache = store.getRequestExecutor().cache;
            const prev = cache.generation;

            const session = store.openSession();
            await session.store(Object.assign(new Doc(), { version: "2" }), docId);
            await session.saveChanges();

            await testContext.waitForValue(async () => cache.generation > prev, true);
        }

        const session = store.openSession();
        return store.aggressivelyCacheFor(5 * 60_000, { mode }, async () => {
            await session.advanced.lazily.load(docId, Doc).getValue();
            return session.advanced.numberOfRequests;
        });
    }

    for (const [name, load] of loadFuncs) {
        it(`${name}_WhenDoNotTrackChanges_ShouldNotCreateExtraRequest`, async () => {
            assertThat(await aggressiveCacheTest(load, "DoNotTrackChanges", true)).isEqualTo(0);
        });

        it(`${name}_WhenTrackChangesAndChange_ShouldCreateExtraRequest`, async () => {
            assertThat(await aggressiveCacheTest(load, "TrackChanges", true)).isEqualTo(1);
        });

        it(`${name}_WhenTrackChangesAndDoesntChange_ShouldNotCreateExtraRequest`, async () => {
            assertThat(await aggressiveCacheTest(load, "TrackChanges", false)).isEqualTo(0);
        });
    }

    it("lazilyLoad_WhenOneOfLoadedIsCachedAndNotModified_ShouldNotBeNull", async () => {
        const cachedId = "TestObjs/cached";
        const notCachedId = "TestObjs/notCached";

        {
            const session = store.openSession();
            await session.store(new Doc(), cachedId);
            await session.store(new Doc(), notCachedId);
            await session.saveChanges();
        }

        await store.aggressivelyCacheFor(5 * 60_000, async () => {
            await store.openSession().advanced.lazily.load(cachedId, Doc).getValue();

            const session = store.openSession();
            const lazy = session.advanced.lazily.load(cachedId, Doc);
            await session.advanced.lazily.load(notCachedId, Doc).getValue();
            assertThat(await lazy.getValue()).isNotNull();
        });
    });

    it("lazilyLoad_WhenUseNotFoundCacheItem_ShouldUseItReleaseAtTheEnd", async () => {
        const notExistDocId = "NotExistDocId";

        await store.aggressivelyCache(async () => {
            await store.openSession().advanced.lazily.load(notExistDocId, Doc).getValue();

            const session = store.openSession();
            await session.advanced.lazily.load(notExistDocId, Doc).getValue();
            assertThat(session.advanced.numberOfRequests).isEqualTo(0);
        });
    });

    it("lazilyLoad_WhenQueryForNotFoundNotModified_ShouldUseCache", async () => {
        const notExistDocId = "NotExistDocId";

        await store.openSession().advanced.lazily.load(notExistDocId, Doc).getValue();

        const session = store.openSession() as unknown as InMemoryDocumentSessionOperations;
        const request = new GetRequest();
        request.url = "/docs";
        request.query = "?&id=" + encodeURIComponent(notExistDocId);

        const command = new MultiGetOperation(session).createRequest([request]);
        try {
            await store.getRequestExecutor().execute(command);
            assertThat(command.result[0].statusCode).isEqualTo(StatusCodes.NotModified);
        } finally {
            command.dispose();
        }
    });

    describe("lazy and direct loads share cached responses", function () {

        async function countServerRequests(action: () => Promise<void>) {
            const requestExecutor = store.getRequestExecutor();
            const before = requestExecutor.numberOfServerRequests;
            await action();
            return requestExecutor.numberOfServerRequests - before;
        }

        it("load reads a document cached by a lazy load", async () => {
            const docId = "doc-1";
            {
                const session = store.openSession();
                await session.store(Object.assign(new Doc(), { version: "1" }), docId);
                await session.saveChanges();
            }

            await store.aggressivelyCacheFor(5 * 60_000, { mode: "DoNotTrackChanges" }, async () => {
                await store.openSession().advanced.lazily.load(docId, Doc).getValue();

                let doc: Doc;
                const requests = await countServerRequests(async () => {
                    doc = await store.openSession().load(docId, Doc);
                });

                assertThat(requests).isEqualTo(0);
                assertThat(doc instanceof Doc).isTrue();
                assertThat(doc.version).isEqualTo("1");
            });
        });

        it("lazy load reads a document cached by a load", async () => {
            const docId = "doc-1";
            {
                const session = store.openSession();
                await session.store(Object.assign(new Doc(), { version: "1" }), docId);
                await session.saveChanges();
            }

            await store.aggressivelyCacheFor(5 * 60_000, { mode: "DoNotTrackChanges" }, async () => {
                await store.openSession().load(docId, Doc);

                let doc: Doc;
                const requests = await countServerRequests(async () => {
                    doc = await store.openSession().advanced.lazily.load(docId, Doc).getValue();
                });

                assertThat(requests).isEqualTo(0);
                assertThat(doc.version).isEqualTo("1");
            });
        });
    });
});
