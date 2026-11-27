import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Article {
    public title: string;
    public description: string;
    public isDeleted: boolean;
}

describe("QueryTests", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("query create clauses for query dynamically", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Article(), { title: "foo", description: "bar", isDeleted: false }), "users/1");
            await session.store(Object.assign(new Article(), { title: "foo", description: "bar", isDeleted: true }), "users/2");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const query = session.advanced.documentQuery(Article)
                .search("title", "foo")
                .search("description", "bar", "OR")
                .andAlso(true)
                .whereEquals("isDeleted", false);

            assertThat(query.getIndexQuery().query)
                .isEqualTo("from 'Articles' where (search(title, $p0) or search(description, $p1)) and isDeleted = $p2");

            const result = await query.all();
            assertThat(result).hasSize(1);
        }
    });
});
