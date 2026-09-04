import { AbstractJavaScriptIndexCreationTask, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_26935Test", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("nonAsciiTermTruncationTest", async () => {
        await new DocIndex().execute(store);

        {
            const session = store.openSession();
            await session.store(Object.assign(new Doc(), { id: "doc-1", strVal: "a".repeat(3000) }));
            await session.store(Object.assign(new Doc(), { id: "doc-2", strVal: "Jiří Krasnec" }));
            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();

            const full = await session.query(Doc, DocIndex)
                .search("strVal", "krasnec")
                .all();

            const truncated = await session.query(Doc, DocIndex)
                .search("strVal", "krasn")
                .all();

            assertThat(truncated)
                .hasSize(0);
            assertThat(full)
                .hasSize(1);
        }
    });
});

class Doc {
    public id: string;
    public strVal: string;
}

class DocIndex extends AbstractJavaScriptIndexCreationTask<Doc, Pick<Doc, "id" | "strVal">> {
    public constructor() {
        super();

        this.map(Doc, doc => {
            return {
                id: doc.id,
                strVal: doc.strVal
            }
        });

        this.index("strVal", "Search");

        this.searchEngineType = "Lucene";
    }
}
