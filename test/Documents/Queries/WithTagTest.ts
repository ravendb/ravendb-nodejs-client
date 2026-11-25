import {
    DocumentQuery,
    IDocumentSession,
    IDocumentStore,
    IndexQuery,
    InMemoryDocumentSessionOperations,
    LazyAggregationQueryOperation,
    LazyQueryOperation,
    LazySuggestionQueryOperation,
    ServerNode
} from "../../../src/index.js";
import { QueryCommand } from "../../../src/Documents/Commands/QueryCommand.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("WithTagTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    it("withTag_setsTagOnIndexQuery", async () => {
        const session = store.openSession();
        const indexQuery = session.query({ collection: "orders" })
            .withTag("my-tag")
            .getIndexQuery();

        assertThat(indexQuery.tag).isEqualTo("my-tag");
    });

    it("withTag_withNoTag_tagIsUndefined", async () => {
        const session = store.openSession();
        const indexQuery = session.query({ collection: "orders" })
            .getIndexQuery();

        assertThat(indexQuery.tag).isUndefined();
    });

    it("withTag_isChainable", async () => {
        const session = store.openSession();
        const query = session.query({ collection: "orders" });
        const returned = query.withTag("x");

        // withTag returns the same query instance
        assertThat(returned).isSameAs(query);
        assertThat(returned.getIndexQuery().tag).isEqualTo("x");
    });

    it("withTag_emptyOrWhitespace_throws", async () => {
        const session = store.openSession();
        const query = session.query({ collection: "orders" });

        await assertThrows(() => query.withTag(""), err => {
            assertThat(err.message).contains("Query tag cannot be null or whitespace");
        });
        await assertThrows(() => query.withTag("   "), err => {
            assertThat(err.message).contains("Query tag cannot be null or whitespace");
        });
    });

    it("withTag_onCustomization_reachesQueryUrl", async () => {
        await storeOrder();

        const session = store.openSession();
        let indexQuery: IndexQuery;
        session.advanced.on("beforeQuery", e => e.queryCustomization.withTag("customization-tag"));
        const query = session.query({ collection: "Orders" });
        query.on("beforeQueryExecuted", iq => indexQuery = iq);

        assertThat(await query.all()).hasSize(1);

        assertThat(indexQuery.tag).isEqualTo("customization-tag");
        assertThat(queryUrl(session, indexQuery)).contains("&tag=customization-tag");
    });

    it("withTag_isEncodedInQueryUrl", async () => {
        const session = store.openSession();
        const indexQuery = session.query({ collection: "Orders" })
            .withTag("tag with space")
            .getIndexQuery();

        assertThat(queryUrl(session, indexQuery)).contains("&tag=tag%20with%20space");
    });

    it("withTag_isKeptOnProjection", async () => {
        const session = store.openSession();
        const indexQuery = session.query({ collection: "Orders" })
            .withTag("projection-tag")
            .selectFields("name")
            .getIndexQuery();

        assertThat(indexQuery.tag).isEqualTo("projection-tag");
    });

    it("withTag_reachesLazyQueryRequests", async () => {
        await storeOrder();

        const session = store.openSession();
        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;
        const query = session.query({ collection: "Orders" }).withTag("lazy-query-tag") as DocumentQuery<object>;

        const lazyQueryRequest = new LazyQueryOperation(inMemorySession, query.initializeQueryOperation(), query, Object)
            .createRequest();
        assertThat(lazyQueryRequest.query).contains("&tag=lazy-query-tag");

        const lazySuggestionRequest = new LazySuggestionQueryOperation(inMemorySession,
            Object.assign(new IndexQuery("from Orders"), { tag: "lazy-suggestion-tag" }), null, null)
            .createRequest();
        assertThat(lazySuggestionRequest.query).contains("&tag=lazy-suggestion-tag");

        const lazyAggregationRequest = new LazyAggregationQueryOperation(inMemorySession,
            Object.assign(new IndexQuery("from Orders"), { tag: "lazy-aggregation-tag" }), null, null)
            .createRequest();
        assertThat(lazyAggregationRequest.query).contains("&tag=lazy-aggregation-tag");

        const lazyResults = await session.query({ collection: "Orders" }).withTag("lazy-query-tag").lazily().getValue();
        assertThat(lazyResults).hasSize(1);
    });

    function queryUrl(session: IDocumentSession, indexQuery: IndexQuery): string {
        const command = new QueryCommand(session as unknown as InMemoryDocumentSessionOperations, indexQuery, null);
        return command.createRequest(new ServerNode({ url: "http://localhost:8080", database: "db" })).uri;
    }

    async function storeOrder() {
        const session = store.openSession();
        await session.store({ name: "order", "@metadata": { "@collection": "Orders" } }, "orders/1");
        await session.saveChanges();
    }
});
