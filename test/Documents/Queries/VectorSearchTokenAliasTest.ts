import assert from "node:assert";
import { IDocumentStore, IndexDefinition, PutIndexesOperation, QueryData } from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { INDEXES } from "../../../src/Constants.js";
import { DocumentQuery } from "../../../src/Documents/Session/DocumentQuery.js";

class VecDoc {
    public id: string;
    public vector: number[];
    public name: string;
}

class VecResult {
    public id: string;
    public name: string;
    public score: number;
}

(RavenTestContext.isRavenDbServerVersion("7.0") ? describe : describe.skip)("VectorSearchTokenAliasTest", function () {

    let store: IDocumentStore;

    beforeEach(async () => {
        store = await testContext.getDocumentStore("VectorSearchTokenAlias", false, null, record => {
            record.settings[INDEXES.INDEXING_AUTO_SEARCH_ENGINE_TYPE] = "Corax";
            record.settings[INDEXES.INDEXING_STATIC_SEARCH_ENGINE_TYPE] = "Corax";
            // vector search scores are only reported when explicitly enabled
            record.settings["Indexing.Corax.IncludeDocumentScore"] = "true";
        });
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    async function seedDocs(): Promise<void> {
        {
            const session = store.openSession();
            await session.store(Object.assign(new VecDoc(), { vector: [0.1, 0.2], name: "match" }));
            await session.store(Object.assign(new VecDoc(), { vector: [-0.9, -0.9], name: "nomatch" }));
            await session.saveChanges();
        }

        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "VecIndex";
        indexDefinition.maps = new Set([`
            from doc in docs.VecDocs
            select new
            {
                Vector = CreateVector(doc.vector),
                name = doc.name
            }`]);
        indexDefinition.fields = {
            Vector: {
                vector: {
                    sourceEmbeddingType: "Single",
                    destinationEmbeddingType: "Single"
                }
            }
        };
        await store.maintenance.send(new PutIndexesOperation(indexDefinition));
        await testContext.waitForIndexing(store);
    }

    function aliasedQuery(session: ReturnType<IDocumentStore["openSession"]>, isExact: boolean) {
        const query = session.query<VecDoc>({ indexName: "VecIndex" })
            .vectorSearch(f => f.withField("Vector"), v => v.byEmbedding([0.1, 0.2]), { similarity: 0.5, isExact })
            .orderByScore()
            .selectFields(QueryData.customFunction("d", "{ id: id(d), name: d.name, score: getMetadata(d)['@index-score'] }"), VecResult);

        // the projection alias is applied to the where tokens; vector.search keeps its shape
        (query as unknown as DocumentQuery<VecResult>).addFromAliasToWhereTokens("d");
        return query;
    }

    it("vector search token survives the from-alias when the projection is a JS object", async () => {
        await seedDocs();

        const session = store.openSession();
        const query = aliasedQuery(session, false);

        const rql = query.toString();
        assert.ok(rql.includes("vector.search(d.Vector,"), rql);
        assert.ok(!rql.includes("d.Vector = "), rql);

        const results = await query.all();

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].name, "match");
        assert.ok(results[0].score > 0, `expected a positive score, got ${results[0].score}`);
    });

    it("exact vector search token survives the from-alias when the projection is a JS object", async () => {
        await seedDocs();

        const session = store.openSession();
        const query = aliasedQuery(session, true);

        const rql = query.toString();
        assert.ok(rql.includes("exact(vector.search(d.Vector,"), rql);
        assert.ok(!rql.includes("d.Vector = "), rql);

        const results = await query.all();

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].name, "match");
        assert.ok(results[0].score > 0, `expected a positive score, got ${results[0].score}`);
    });
});
