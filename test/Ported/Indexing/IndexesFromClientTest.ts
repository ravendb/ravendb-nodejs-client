import * as assert from "assert";
import {
    testContext,
    disposeTestDocumentStore
} from "../../Utils/TestUtil";
import { UsersIndex } from "../../Assets/Indexes";
import { Post, User } from "../../Assets/Entities";
import {
    IDocumentStore,
    GetStatisticsCommand,
    DatabaseStatistics,
    ResetIndexOperation,
    GetIndexNamesOperation,
    IndexQuery,
    ExplainQueryCommand,
    GetIndexingStatusOperation,
    StopIndexingOperation,
    StartIndexingOperation,
    StopIndexOperation,
    GetIndexesOperation,
    GetIndexStatisticsOperation,
    SetIndexesLockOperation,
    SetIndexesPriorityOperation,
    GetTermsOperation,
    AbstractJavaScriptIndexCreationTask,
} from "../../../src";
import { DeleteIndexOperation } from "../../../src/Documents/Operations/Indexes/DeleteIndexOperation";
import { QueryStatistics } from "../../../src/Documents/Session/QueryStatistics";
import { MoreLikeThisOptions } from "../../../src/Documents/Queries/MoreLikeThis/MoreLikeThisOptions";
import { IndexCreation } from "../../../src/Documents/Indexes/IndexCreation";
import { delay } from "../../../src/Utility/PromiseUtil";

describe("Indexes from client", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can create indexes using index creation", async () => {
        await IndexCreation.createIndexes([new Users_ByName()], store);

        {
            const session = store.openSession();
            const user1 = new User();
            user1.name = "Marcin";
            await session.store(user1, "users/1");
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const users = await session.query(User, Users_ByName)
                .all();

            assert.strictEqual(users.length, 1);
        }
    });

    it("can reset", async () => {
        {
            const session = store.openSession();
            const user1 = Object.assign(new User(), {
                name: "Marcin"
            });
            await session.store(user1, "users/1");
            await session.saveChanges();
        }

        await store.executeIndex(new UsersIndex());
        await testContext.waitForIndexing(store);

        const command = new GetStatisticsCommand();
        await (store.getRequestExecutor().execute(command));

        const statistics: DatabaseStatistics = command.result;
        const firstIndexingTime = statistics.indexes[0].lastIndexingTime;

        const indexName = new UsersIndex().getIndexName();

        await delay(2000);

        await store.maintenance.send(new ResetIndexOperation(indexName));
        await testContext.waitForIndexing(store);

        const command2 = new GetStatisticsCommand();
        await (store.getRequestExecutor().execute(command2));

        const statistics2: DatabaseStatistics = command2.result;
        const secondIndexingTime = statistics2.indexes[0].lastIndexingTime;

        assert.ok(firstIndexingTime.valueOf() < secondIndexingTime.valueOf());
    });

    it("can execute many indexes", async () => {
        await store.executeIndexes([new UsersIndex()]);

        const indexNamesOperation = new GetIndexNamesOperation(0, 10);
        const indexNames = await store.maintenance.send(indexNamesOperation);

        assert.strictEqual(indexNames.length, 1);
    });

    it("can delete index", async () => {
        const index = new UsersIndex();
        await store.executeIndex(index);

        await store.maintenance.send(new DeleteIndexOperation(index.getIndexName()));

        const command = new GetStatisticsCommand();
        await (store.getRequestExecutor().execute(command));

        const statistics = command.result;

        assert.strictEqual(statistics.indexes.length, 0);
    });

    it("can stop and start", async () => {
        await new Users_ByName().execute(store);

        let status = await store.maintenance.send(new GetIndexingStatusOperation());

        assert.strictEqual(status.status, "Running");
        assert.strictEqual(1, status.indexes.length);

        assert.strictEqual(status.indexes[0].status, "Running");

        await store.maintenance.send(new StopIndexingOperation());

        status = await store.maintenance.send(new GetIndexingStatusOperation());

        assert.strictEqual(status.status, "Paused");
        assert.strictEqual(1, status.indexes.length);

        assert.strictEqual(status.indexes[0].status, "Paused");

        await store.maintenance.send(new StartIndexingOperation());
        status = await store.maintenance.send(new GetIndexingStatusOperation());

        assert.strictEqual(status.status, "Running");
        assert.strictEqual(1, status.indexes.length);

        assert.strictEqual(status.indexes[0].status, "Running");

        await store.maintenance.send(new StopIndexOperation(status.indexes[0].name));
        status = await store.maintenance.send(new GetIndexingStatusOperation());

        assert.strictEqual(status.status, "Running");
        assert.strictEqual(1, status.indexes.length);

        assert.strictEqual(status.indexes[0].status, "Paused");
    });

    it("can set lock mode and priority", async () => {
        await new Users_ByName().execute(store);

        const user1 = Object.assign(new User(), { name: "Fitzchak" });
        const user2 = Object.assign(new User(), { name: "Arek" });

        {
            const session = store.openSession();
            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const users = await session.query<User>({ index: Users_ByName })
                .waitForNonStaleResults()
                .whereEquals("name", "Arek")
                .all();

            assert.strictEqual(users.length, 1);
        }

        const indexes = await store.maintenance.send(new GetIndexesOperation(0, 128));
        assert.strictEqual(indexes.length, 1);

        const index = indexes[0];
        let stats = await store.maintenance.send(new GetIndexStatisticsOperation(index.name));
        assert.strictEqual(stats.lockMode, "Unlock");
        assert.strictEqual(stats.priority, "Normal");

        await store
            .maintenance
            .send(new SetIndexesLockOperation(index.name, "LockedIgnore"));
        await store
            .maintenance
            .send(new SetIndexesPriorityOperation(index.name, "Low"));

        stats = await store.maintenance.send(new GetIndexStatisticsOperation(index.name));
        assert.strictEqual(stats.lockMode, "LockedIgnore");
        assert.strictEqual(stats.priority, "Low");
    });

    it("can get terms", async () => {
        const user1 = Object.assign(new User(), { name: "Fitzchak" });
        const user2 = Object.assign(new User(), { name: "Arek" });

        {
            const session = store.openSession();
            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();
        }

        let indexName: string;

        {
            const session = store.openSession();
            let statsRef: QueryStatistics;

            const users = await session
                .query(User)
                .waitForNonStaleResults()
                .statistics(s => statsRef = s)
                .whereEquals("name", "Arek")
                .all();

            indexName = statsRef.indexName;
        }

        const terms = await store
            .maintenance
            .send(new GetTermsOperation(indexName, "name", null, 128));

        assert.strictEqual(terms.length, 2);
        assert.ok(terms.find(x => x === "fitzchak"));
        assert.ok(terms.find(x => x === "arek"));
    });

    it("can get index names", async () => {
        const user1 = Object.assign(new User(), { name: "Fitzchak" });
        const user2 = Object.assign(new User(), { name: "Arek" });

        {
            const session = store.openSession();
            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();
        }

        let indexName: string;

        {
            const session = store.openSession();
            let statsRef: QueryStatistics;

            const users = await session
                .query(User)
                .waitForNonStaleResults()
                .statistics(s => statsRef = s)
                .whereEquals("name", "Arek")
                .all();

            indexName = statsRef.indexName;
        }

        const indexNames = await store
            .maintenance
            .send(new GetIndexNamesOperation(0, 10));

        assert.strictEqual(indexNames.length, 1);
        assert.ok(indexNames.find(x => x === indexName));
    });

    it("can explain query", async () => {
        const user1 = Object.assign(new User(), { name: "Fitzchak" });
        const user2 = Object.assign(new User(), { name: "Arek" });

        {
            const session = store.openSession();
            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();
        }

        {
            // make queries to create auto indexes
            const session = store.openSession();
            let stats: QueryStatistics;
            let users = await session.query(User)
                .statistics(_stats => stats = _stats)
                .whereEquals("name", "Arek")
                .all();

            users = await session.query(User)
                .statistics(_stats => stats = _stats)
                .whereGreaterThan("age", 10)
                .all();
        }

        const indexQuery = new IndexQuery("from users");
        const command = new ExplainQueryCommand(store.conventions, indexQuery);

        await store.getRequestExecutor().execute(command);

        const explanations = command.result;
        assert.strictEqual(explanations.length, 1);
        assert.ok(explanations[0].index);
        assert.ok(explanations[0].reason);
    });

    it("can get more like this", async () => {
        {
            const session = store.openSession();
            const post1 = Object.assign(new Post(), { id: "posts/1", title: "doduck", desc: "prototype" });
            const post2 = Object.assign(new Post(), { id: "posts/2", title: "doduck", desc: "prototype your idea" });
            const post3 = Object.assign(new Post(), { id: "posts/3", title: "doduck", desc: "love programming" });
            const post4 = Object.assign(new Post(), { id: "posts/4", title: "We do", desc: "prototype" });
            const post5 = Object.assign(new Post(), { id: "posts/5", title: "We love", desc: "challenge" });

            await session.store(post1);
            await session.store(post2);
            await session.store(post3);
            await session.store(post4);
            await session.store(post5);

            await session.saveChanges();
        }

        await new Posts_ByTitleAndDesc().execute(store);
        await testContext.waitForIndexing(store);

        {
            const options = {
                minimumDocumentFrequency: 1,
                minimumTermFrequency: 0
            } as MoreLikeThisOptions;

            const session = store.openSession();
            const list = await session.query<Post>({ index: Posts_ByTitleAndDesc })
                .moreLikeThis(f => f.usingDocument(x => x.whereEquals("id()", "posts/1")).withOptions(options))
                .all();

            assert.strictEqual(list.length, 3);

            assert.strictEqual(list[0].title, "doduck");
            assert.strictEqual(list[0].desc, "prototype your idea");

            assert.strictEqual(list[1].title, "doduck");
            assert.strictEqual(list[1].desc, "love programming");

            assert.strictEqual(list[2].title, "We do");
            assert.strictEqual(list[2].desc, "prototype");
        }
    });
});

export class Posts_ByTitleAndDesc extends AbstractJavaScriptIndexCreationTask<Post, Pick<Post, "title" | "desc">> {

    constructor() {
        super();

        this.map(Post, p => {
            return {
                title: p.title,
                desc: p.desc
            }
        });

        this.index("title", "Search");
        this.store("title", "Yes");
        this.analyze("title", "Lucene.Net.Analysis.SimpleAnalyzer");

        this.index("desc", "Search");
        this.store("desc", "Yes");
        this.analyze("desc", "Lucene.Net.Analysis.SimpleAnalyzer");
    }
}

export class Users_ByName extends AbstractJavaScriptIndexCreationTask<User, Pick<User, "name">> {

    constructor() {
        super();

        this.map(User, u => {
            return {
                name: u.name
            }
        });

        this.index("name", "Search");
        this.indexSuggestions.add("name");
        this.store("name", "Yes");
    }
}
