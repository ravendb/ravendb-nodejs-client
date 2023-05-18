import {AbstractJavaScriptIndexCreationTask, IDocumentStore, IndexQuery } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import * as assert from "assert";

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

                b.tags.forEach(item => {
                    result.push({
                        tag: item
                    });
                });
                
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

    // TBD - enable test when RDBC-713 is done
    it.skip("afterStreamExecuted", async () => {
        const session = store.openSession();
        
        // prepare data
        for (let i = 0; i < 200; i++) {
            const docToStore= Object.assign(new BlogPost(),
                {body: "postBody_" + i, title: "postTitle_" + i, tags: ["Oren_" + i, "Danielle_" + i]});
            await session.store(docToStore);
        }
       
        await session.saveChanges();

        // define query
        let totalStreamedResultsSize = 0;
        let counter = 0;

        const query = session
            .query<BlogPost>({ collection: "blogPosts" })
            .on("afterStreamExecuted", streamResult => {
                totalStreamedResultsSize += streamResult.durationInMs;
                counter++;
            });

        // stream query
        const queryStream = await session.advanced.stream(query);
        
        queryStream.on("end", () => {
            assert.strictEqual(counter, 200);
        });
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

