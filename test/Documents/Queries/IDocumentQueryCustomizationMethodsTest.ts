import {
    AbstractJavaScriptIndexCreationTask,
    IDocumentStore,
    IndexQuery
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import assert from "node:assert"

describe("IDocumentQueryCustomizationMethodsTest", function () {

    class BlogPost {
        public id: string;
        public title: string;
        public body: string;
        public tags: string[];
    }

    class TagResult {
        public tag: string;
    }

    class BlogPosts_ByTag extends AbstractJavaScriptIndexCreationTask<BlogPost> {
        public constructor() {
            super();

            this.map(BlogPost, b => {
                const result: TagResult[] = [];

                // eslint-disable-next-line unicorn/no-array-for-each
                b.tags.forEach(item => {
                    result.push({
                        tag: item
                    });
                })
                
                return result;
            })
        }
    }
    
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("beforeQueryExecuted", async () => {
        await store.executeIndex(new BlogPosts_ByTag());
        
        const session = store.openSession();
        
        await session.store(Object.assign(new BlogPost(),
            {body: "postBody", title: "postTitle", tags: ["Oren", "Danielle"]}));
        
        await session.saveChanges();

        await testContext.waitForIndexing(store);

        const results = await session
            .query(BlogPost, BlogPosts_ByTag)
            .on("beforeQueryExecuted", query => (query as IndexQuery).skipDuplicateChecking = true)
            .all();

        assert.strictEqual(results.length, 2);
    });

    it("afterQueryExecuted", async () => {
        const session = store.openSession();

        let counter = 0;

        const results = await session
            .query<BlogPost>({ collection: "blogPosts" })
            .on("afterQueryExecuted", queryResult => counter++)
            .all();

        assert.strictEqual(results.length, 0);
        assert.strictEqual(counter, 1);
        
    });

    it("afterStreamExecuted is raised for every streamed result", async () => {
        const session = store.openSession();
        for (let i = 0; i < 3; i++) {
            await session.store(Object.assign(new BlogPost(), { title: "postTitle_" + i }));
        }
        await session.saveChanges();

        const streamedResults: object[] = [];
        const query = session
            .query(BlogPost)
            .on("afterStreamExecuted", result => streamedResults.push(result));

        const queryStream = await session.advanced.stream(query);
        const titles: string[] = [];
        for await (const item of queryStream) {
            titles.push(item.document.title);
        }

        assert.strictEqual(titles.length, 3);
        assert.strictEqual(streamedResults.length, 3);
        assert.deepStrictEqual(
            streamedResults.map(x => x["title"]).sort(),
            titles.sort());
        for (const result of streamedResults) {
            assert.ok(result["@metadata"]);
        }
    });

    it("noCaching", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new BlogPost(),
            {body: "postBody", title: "postTitle", tags: ["Oren", "Danielle"]}));
        await session.saveChanges();

        let responseCode = 0;
        
        session.advanced.requestExecutor.on("succeedRequest", event => {
            responseCode = event.response.status;
        });
        
        const results1 = await session.query<BlogPost>({ collection: "blogPosts" })
            .all();

        assert.strictEqual(responseCode, 200);
        
        const results2 = await session.query<BlogPost>({ collection: "blogPosts" })
            .all();

        assert.strictEqual(responseCode, 304); // Not modified

        const results3 = await session.query<BlogPost>({ collection: "blogPosts" })
            .noCaching()
            .all();

        assert.strictEqual(responseCode, 200);
    });
    
    it("noTracking", async () => {
        const session1 = store.openSession();

        await session1.store(Object.assign(new BlogPost(),
            {body: "postBody", title: "postTitle", tags: ["Oren", "Danielle"]}));
        
        await session1.saveChanges();
        assert.ok(session1.advanced.isLoaded("BlogPosts/1-A"));
        
        const session2 = store.openSession();

        let posts = await session2.query(BlogPost)
            .noTracking()
            .all();

        assert.strictEqual(posts.length, 1);
        assert.ok(!session2.advanced.isLoaded("BlogPosts/1-A"));

        const session3 = store.openSession();

        posts = await session3.query(BlogPost)
            .all();

        assert.strictEqual(posts.length, 1);
        assert.ok(session3.advanced.isLoaded("BlogPosts/1-A"));
    });
});

