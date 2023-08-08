import { testContext, disposeTestDocumentStore } from "../../../Utils/TestUtil";

import {
    AbstractCsharpIndexCreationTask, DocumentStore,
    IDocumentStore,
    StreamQueryStatistics,
    StreamResult, TimeSeriesRawResult,
} from "../../../../src";
import * as assert from "assert";
import { User } from "../../../Assets/Entities";
import * as StreamUtil from "../../../../src/Utility/StreamUtil";
import { CONSTANTS } from "../../../../src/Constants";
import { parseJsonStreamVerbose, parseJsonVerbose } from "../../../Utils/Json";
import { getStringWritable } from "../../../Utils/Streams";
import { assertThat } from "../../../Utils/AssertExtensions";
import * as Parser from "stream-json/Parser";

describe("query streaming", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    let usersByNameIndex: Users_ByName;
    let usersByNameIndexPascal: Users_ByNamePascal;

    beforeEach(function () {
        usersByNameIndex = new Users_ByName();
        usersByNameIndexPascal = new Users_ByNamePascal();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function argError(): never {
        throw new Error("Arg is required.");
    }

    async function prepareData(storeToUse: IDocumentStore, n: number = argError(), withTimeSeries: boolean = false) {
        const session = storeToUse.openSession();

        for (let i = 0; i < n; i++) {
            const user = Object.assign(new User(), {
                name: "jon" + i,
                lastName: "snow" + i
            });
            await session.store(user);

            if (withTimeSeries) {
                session.timeSeriesFor(user, "Heartrate")
                    .append(new Date(), i);
            }
        }
        await session.saveChanges();
    }

    function assertStreamResultEntry<T extends object>(
        entry: StreamResult<T>, docAssert: (doc: T) => void) {
        assert.ok(entry);
        assert.strictEqual(entry.constructor.name, Object.name);
        assert.ok(entry.changeVector);
        assert.ok(entry.id);
        assert.ok(entry.metadata);
        assert.ok(entry.metadata[CONSTANTS.Documents.Metadata.ID]);
        assert.ok(entry.metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE]);
        assert.ok(entry.metadata[CONSTANTS.Documents.Metadata.LAST_MODIFIED]);

        const doc = entry.document;
        assert.ok(doc);
        docAssert(doc);
    }

    if (/^1\d\./.test(process.versions.node)) {
        it("can use for-await-of on nodejs > 10");
    }

    it("can stream query results", async () => {
        await prepareData(store, 200);

        await usersByNameIndex.execute(store);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.query<User>({
                index: Users_ByName
            });

            const queryStream = await session.advanced.stream(query);

            const items = [];
            queryStream.on("data", item => {
                items.push(item);
                assertStreamResultEntry<User>(item, doc => {
                    assert.ok(doc instanceof User);
                    assert.ok(doc.name);
                    assert.ok(doc.lastName);
                });
            });

            await StreamUtil.finishedAsync(queryStream);

            assert.strictEqual(items.length, 200);
        }
    });

    it.skip("can stream query results with time series", async () => {
        await prepareData(store, 200, true);

        await usersByNameIndex.execute(store);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.query({ documentType: User })
                .selectTimeSeries(x => x.raw("from Heartrate"), TimeSeriesRawResult);

            const queryStream = await session.advanced.stream(query);

            const items = [];
            queryStream.on("data", item => {
                assertThat(item.document instanceof TimeSeriesRawResult)
                    .isTrue();
                const result = item.document as TimeSeriesRawResult;
                assertThat(result.results)
                    .hasSize(1);
                assertThat(result.results[0].value)
                    .isEqualTo(items.length);

                items.push(item);
            });

            await StreamUtil.finishedAsync(queryStream);

            assert.strictEqual(items.length, 200);
        }
    });

    it("can stream query results with query statistics", async () => {
        await Promise.all([
            prepareData(store, 100),
            await usersByNameIndex.execute(store)
        ]);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.query(User, Users_ByName);

            let statsFromCallback;
            const reader = await session.advanced.stream(query, s => statsFromCallback = s);

            const items = [];
            reader.on("data", item => {
                items.push(item);
                assertStreamResultEntry<User>(item, doc => {
                    assert.ok(doc.name);
                    assert.ok(doc.lastName);
                });
            });

            let statsFromEvent: StreamQueryStatistics;
            reader.on("stats", s => statsFromEvent = s);

            await StreamUtil.finishedAsync(reader);

            assert.strictEqual(items.length, 100);

            // eslint-disable-next-line no-inner-declarations
            function assertStats(stats) {
                assert.ok(stats);
                assert.strictEqual(stats.indexName, "Users/ByName");
                assert.strictEqual(stats.totalResults, 100);
                assert.ok(stats.indexTimestamp instanceof Date);
                assert.strictEqual(stats.indexTimestamp.toDateString(), new Date().toDateString());
            }

            assertStats(statsFromEvent);
            assertStats(statsFromCallback);
            assert.equal(statsFromCallback, statsFromEvent);

            items.forEach(x => assertStreamResultEntry<User>(x, doc => {
                assert.ok(doc instanceof User);
                assert.ok(doc.name);
                assert.ok(doc.lastName);
            }));
        }
    });

    it("can stream raw query results", async () => {
        await Promise.all([
            prepareData(store, 200),
            await usersByNameIndex.execute(store)
        ]);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.advanced.rawQuery<User>("from index 'Users/ByName'");
            const queryStream = await session.advanced.stream(query);

            const items = [];
            queryStream.on("data", item => {
                items.push(item);
                assertStreamResultEntry<User>(item, doc => {
                    assert.ok(doc instanceof User);
                    assert.ok(doc.name);
                    assert.ok(doc.lastName);
                });
            });

            await StreamUtil.finishedAsync(queryStream);
            assert.strictEqual(items.length, 200);
        }

    });

    async function streamRawQueryResults(format: "json" | "jsonl", remoteCasing : "camel" | "pascal" = "camel") {
        const newStore = new DocumentStore(store.urls, store.database);
        newStore.conventions.useJsonlStreaming = format === "jsonl";

        if (remoteCasing === "pascal") {
            newStore.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
            newStore.conventions.entityFieldNameConvention = "camel";
            newStore.conventions.remoteEntityFieldNameConvention = "pascal";
            newStore.conventions.identityProperty = "Id";
            newStore.conventions.registerEntityIdPropertyName(Object, "Id");
        }

        const indexToUse = remoteCasing === "pascal" ? usersByNameIndexPascal : usersByNameIndex;

        newStore.initialize();

        newStore.conventions.registerJsType(User);
        try {
            await Promise.all([
                prepareData(newStore, 100),
                await indexToUse.execute(store)
            ]);

            await testContext.waitForIndexing(store);


            {
                const session = newStore.openSession();
                const query = session.advanced.rawQuery<User>("from index '" + indexToUse.getIndexName() + "'");

                let stats = null as StreamQueryStatistics;
                const queryStream = await session.advanced.stream(query, s => stats = s);
                const items = [];
                queryStream.on("data", item => {
                    items.push(item);
                    assertStreamResultEntry<User>(item, doc => {
                        assert.ok(doc instanceof User);
                        assert.ok(doc.name);
                        assert.ok(doc.lastName);
                    });
                });

                await StreamUtil.finishedAsync(queryStream);
                assert.strictEqual(items.length, 100);

                assert.ok(stats);
                assert.strictEqual(stats.indexName, indexToUse.getIndexName());
                assert.strictEqual(stats.totalResults, 100);
                assert.ok(stats.indexTimestamp instanceof Date);
                assert.strictEqual(stats.indexTimestamp.toDateString(), new Date().toDateString());
            }
        } finally {
            newStore.dispose();
        }
    }

    it("can stream raw query results with query statistics - json - camel", async () => {
        await streamRawQueryResults("json");
    });

    it("can stream raw query results with query statistics - jsonl - camel", async () => {
        await streamRawQueryResults("jsonl");
    });

    it("can stream raw query results with query statistics - json - pascal", async () => {
        await streamRawQueryResults("json", "pascal");
    });

    it("can stream raw query results with query statistics - jsonl - pascal", async () => {
        await streamRawQueryResults("jsonl", "pascal");
    });

    it("can stream raw query into stream", async () => {
        await Promise.all([
            prepareData(store, 10),
            await usersByNameIndex.execute(store)
        ]);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.advanced.rawQuery<User>("from index 'Users/ByName'");

            const targetStream = getStringWritable();
            session.advanced.streamInto(query, targetStream);
            await StreamUtil.finishedAsync(targetStream);

            const result: string = targetStream["string"];
            assert.ok(result);

            const json = await parseJsonStreamVerbose(result);
            assert.ok(json);
        }
    });
});

class Users_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from u in docs.Users select new { u.name, lastName = u.lastName.Boost(10) }";
        this.index("name", "Search");
        this.indexSuggestions.add("name");
        this.store("name", "Yes");
    }
}


class Users_ByNamePascal extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from u in docs.Users select new { u.Name, LastName = u.LastName.Boost(10) }";
        this.index("Name", "Search");
        this.indexSuggestions.add("Name");
        this.store("Name", "Yes");
    }
}
