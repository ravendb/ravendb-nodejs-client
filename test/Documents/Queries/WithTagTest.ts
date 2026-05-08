import { IDocumentStore } from "../../../src/index.js";
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
});
