import { testContext, disposeTestDocumentStore } from "../../../Utils/TestUtil";

import {
    AbstractIndexCreationTask,
    IDocumentSession,
    IDocumentStore,
    StreamQueryStatistics,
    StreamResult,
} from "../../../../src";
import * as assert from "assert";
import {User} from "../../../Assets/Entities";
import * as stream from "readable-stream";
import * as StreamUtil from "../../../../src/Utility/StreamUtil";
import * as os from "os";
import { CONSTANTS } from "../../../../src/Constants";
import { parseJsonVerbose } from "../../../Utils/Json";
import { getStringWritable } from "../../../Utils/Streams";

describe("query streaming", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    let usersByNameIndex: Users_ByName;

    beforeEach(function () {
        usersByNameIndex = new Users_ByName();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));
    
    function argError(): never {
        throw new Error("Arg is required.");
    }

    async function prepareData(n: number = argError()) {
        const session = store.openSession();

        for (let i = 0; i < n; i++) {
            await session.store(Object.assign(new User(), {
                name: "jon" + i,
                lastName: "snow" + i
            }));
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
        await prepareData(200);

        await usersByNameIndex.execute(store);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.query<User>({ 
                indexName: usersByNameIndex.getIndexName()
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

    it("can stream query results with query statistics", async () => {
        await Promise.all([
            prepareData(100), 
            await usersByNameIndex.execute(store)
        ]);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.query<User>({ indexName: usersByNameIndex.getIndexName() });

            const reader = await session.advanced.stream(query, s => stats = s);

            const items = [];
            reader.on("data", item => {
                items.push(item);
                assertStreamResultEntry<User>(item, doc => {
                    assert.ok(doc.name);
                    assert.ok(doc.lastName);
                });
            });

            let stats: StreamQueryStatistics;
            reader.on("stats", s => stats = s);

            await StreamUtil.finishedAsync(reader);
            assert.strictEqual(items.length, 100);
            assert.ok(stats);
            assert.strictEqual(stats.indexName, "Users/ByName");
            assert.strictEqual(stats.totalResults, 100);
            assert.ok(stats.indexTimestamp instanceof Date);
            assert.strictEqual(stats.indexTimestamp.toDateString(), new Date().toDateString());

            items.forEach(x => assertStreamResultEntry<User>(x, doc => {
                assert.ok(doc instanceof User);
                assert.ok(doc.name);
                assert.ok(doc.lastName);
            }));
        }
    });

    it("can stream raw query results", async () => {
        await Promise.all([
            prepareData(200), 
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

    it("can stream raw query results with query statistics", async () => {
        await Promise.all([
            prepareData(100), 
            await usersByNameIndex.execute(store)
        ]);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.advanced.rawQuery<User>("from index 'Users/ByName'");

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
            assert.strictEqual(stats.indexName, "Users/ByName");
            assert.strictEqual(stats.totalResults, 100);
            assert.ok(stats.indexTimestamp instanceof Date);
            assert.strictEqual(stats.indexTimestamp.toDateString(), new Date().toDateString());
        }
    });

    it("can stream raw query into stream", async () => {
        await Promise.all([
            prepareData(10), 
            await usersByNameIndex.execute(store)
        ]);

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const query = session.advanced.rawQuery<User>("from index 'Users/ByName'");

            const targetStream = getStringWritable();
            let result;
            targetStream.once("content", _ => result = _);
            await session.advanced.streamInto(query, targetStream);
            assert.ok(result);
            const json = parseJsonVerbose(result);
            assert.ok(json);
            const res = json.results;
            assert.ok(res);
            assert.strictEqual(json.indexName, "Users/ByName");
            assert.ok(json.indexTimestamp);
            assert.strictEqual(json.isStale, false);
            assert.ok("resultEtag" in json);
        }
    });
});

// tslint:disable-next-line:class-name
class Users_ByName extends AbstractIndexCreationTask {
    public constructor() {
        super();

        this.map = "from u in docs.Users select new { u.name, lastName = u.lastName.Boost(10) }";
        this.index("name", "Search");
        this.indexSuggestions.add("name");
        this.store("name", "Yes");
    }
}
