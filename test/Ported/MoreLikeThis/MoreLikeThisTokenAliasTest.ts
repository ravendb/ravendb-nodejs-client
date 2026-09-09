import assert from "node:assert";
import { AbstractJavaScriptIndexCreationTask, IDocumentStore, MoreLikeThisOptions, QueryData } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { DocumentQuery } from "../../../src/Documents/Session/DocumentQuery.js";

class Article {
    public id: string;
    public body: string;

    constructor(body?: string) {
        this.body = body;
    }
}

class ArticleIndex extends AbstractJavaScriptIndexCreationTask<Article, Pick<Article, "body">> {
    constructor() {
        super();
        this.map(Article, a => ({ body: a.body }));
        this.index("body", "Search");
        this.termVector("body", "Yes");
    }
}

class ArticleResult {
    public id: string;
    public body: string;
    public meta: string;
}

describe("MoreLikeThisTokenAliasTest", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("moreLikeThis token survives the from-alias when the projection is a JS object", async () => {
        {
            const session = store.openSession();
            await session.store(new Article("test test test"));
            await session.store(new Article("cake is great"));
            await session.saveChanges();
        }

        await new ArticleIndex().execute(store);
        await testContext.waitForIndexing(store);

        const session = store.openSession();

        const options: MoreLikeThisOptions = {
            minimumTermFrequency: 1,
            minimumDocumentFrequency: 1,
            minimumWordLength: 0
        };

        const query = session.query(Article, ArticleIndex)
            .moreLikeThis(f => f.usingDocument(JSON.stringify({ body: "test" })).withOptions(options))
            .selectFields(QueryData.customFunction("d", "{ id: id(d), body: d.body, meta: getMetadata(d)['@last-modified'] }"), ArticleResult);

        // the projection alias is applied to the where tokens; moreLikeThis() has no field to prefix
        (query as unknown as DocumentQuery<ArticleResult>).addFromAliasToWhereTokens("d");

        const rql = query.toString();
        assert.ok(rql.includes("moreLikeThis("), rql);
        assert.ok(rql.includes(" as d "), rql);
        assert.ok(!rql.includes("d.moreLikeThis") && !rql.includes("d.undefined"), rql);

        const results = await query.all();

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].body, "test test test");
        assert.ok(results[0].meta);
    });
});
