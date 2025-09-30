import assert from "node:assert";
import {IDocumentStore, IndexDefinition, PutIndexesOperation} from "../../src/index.js";
import {disposeTestDocumentStore, RavenTestContext, testContext} from "../Utils/TestUtil.js";
import {INDEXES} from "../../src/Constants.js";

(RavenTestContext.isRavenDbServerVersion("7.0") ? describe : describe.skip)("[RDBC-946]", () => {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore("RDBC-946", false, null, (record) => {
            record.settings[INDEXES.INDEXING_AUTO_SEARCH_ENGINE_TYPE] = "Corax";
            record.settings[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = "Corax";
        });
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can use task to query pregenerated embedding - RQL generation with byText", async () => {
        await setupVectorIndex(store);

        const session = store.openSession();

        const rqlResult = session.query({indexName: "VectorIndex"})
            .vectorSearch(f => f.withField("Vector"),
                v => v.byText("car", "localaitask"))
            .toString();

        assert.strictEqual(rqlResult, "from index 'VectorIndex' where vector.search(Vector, embedding.text($p0, ai.task('localaitask')))");
    });

    it("can use task to query pregenerated embedding - RQL generation with byTexts", async () => {
        await setupVectorIndex(store);

        const session = store.openSession();

        const rqlResult = session.query({indexName: "VectorIndex"})
            .vectorSearch(f => f.withField("Vector"),
                v => v.byTexts(["car", "planet"], "localaitask"))
            .toString();

        assert.strictEqual(rqlResult, "from index 'VectorIndex' where vector.search(Vector, embedding.text($p0, ai.task('localaitask')))");
    });

    it("can use task to query pregenerated embedding - document query with byText", async () => {
        await setupVectorIndex(store);

        const session = store.openSession();

        const rqlResult = session.advanced.documentQuery({indexName: "VectorIndex"})
            .vectorSearch(f => f.withField("Vector"),
                v => v.byText("animal", "localaitask"))
            .toString();

        assert.strictEqual(rqlResult, "from index 'VectorIndex' where vector.search(Vector, embedding.text($p0, ai.task('localaitask')))");
    });

    it("can use task to query pregenerated embedding - document query with byTexts", async () => {
        await setupVectorIndex(store);

        const session = store.openSession();

        const rqlResult = session.advanced.documentQuery({indexName: "VectorIndex"})
            .vectorSearch(f => f.withField("Vector"),
                v => v.byTexts(["car", "cosmos"], "localaitask"))
            .toString();

        assert.strictEqual(rqlResult, "from index 'VectorIndex' where vector.search(Vector, embedding.text($p0, ai.task('localaitask')))");
    });

    it("should generate RQL for vector search with byText, task identifier and similarity options", async () => {
        await setupVectorIndex(store);

        const session = store.openSession();

        const query = session.query({indexName: "VectorIndex"})
            .vectorSearch(field => field.withField("Vector"),
                factory => factory.byText("query text", "openai-task"), {
                    similarity: 0.8,
                    numberOfCandidates: 50
                })
            .toString();

        assert.strictEqual(query, "from index 'VectorIndex' where vector.search(Vector, embedding.text($p0, ai.task('openai-task')), 0.8, 50)");
    });

    it("should generate RQL for vector search with byTexts, task identifier and exact matching", async () => {
        await setupVectorIndex(store);

        const session = store.openSession();

        const query = session.query({indexName: "VectorIndex"})
            .vectorSearch(field => field.withField("Vector"),
                factory => factory.byTexts(["query one", "query two"], "embedding-task"), {
                    isExact: true
                })
            .toString();

        assert.strictEqual(query, "from index 'VectorIndex' where exact(vector.search(Vector, embedding.text($p0, ai.task('embedding-task'))))");
    });

    it("should throw error when both field factory and value factory task identifiers are set", async () => {
        const session = store.openSession();

        assert.throws(() => {
            session.query({collection: "Dtos"})
                .vectorSearch(field => field.withText("TextualValue").usingTask("field-task"),
                    factory => factory.byText("query text", "value-task"))
                .toString();
        }, /Embeddings generation task identifier set in value factory cannot be used with field factory/);
    });

    async function setupVectorIndex(store: IDocumentStore) {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "VectorIndex";
        indexDefinition.maps = new Set([`
            from dto in docs.Dtos
            let attachment = LoadAttachment(dto, "vector")
            select new { Vector = CreateVector(attachment.GetContentAsStream())}`]);

        const putIndexesOperation = new PutIndexesOperation(indexDefinition);
        await store.maintenance.send(putIndexesOperation);
    }
});