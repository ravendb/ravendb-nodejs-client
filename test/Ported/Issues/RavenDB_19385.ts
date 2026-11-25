import { AbstractCsharpIndexCreationTask, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Doc {
    public id: string;
    public name: string;
}

class DocIndex extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();

        this.map = "from doc in docs.Docs select new { doc.name }";
        this.storeAllFields("Yes");
    }
}

const slowQuery = `
declare function output(row) {
    for (var i = 0; i < 5000; i++) {}
    return(row);
}

from index 'DocIndex' as row select output(row)`;

describe("RavenDB_19385", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("timeoutInLazyQueriesTest", async () => {
        await new DocIndex().execute(store);

        const bulkInsert = store.bulkInsert();
        for (let i = 1; i <= 1000; i++) {
            const doc = new Doc();
            doc.id = "doc-" + i;
            doc.name = "name-" + i;
            await bulkInsert.store(doc);
        }
        await bulkInsert.finish();

        await testContext.waitForIndexing(store);

        const session = store.openSession();
        const scope = session.advanced.documentStore.requestTimeout(50);
        try {
            await assertThrows(() => session.advanced.rawQuery<Doc>(slowQuery).all(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("failed with timeout after");
            });

            const lazyQuery = session.advanced.rawQuery<Doc>(slowQuery).lazily();
            await assertThrows(() => lazyQuery.getValue(), err => {
                assertThat(err.name)
                    .isEqualTo("RavenException");
                assertThat(err.message)
                    .contains("failed with timeout after");
            });
        } finally {
            scope.dispose();
        }
    });
});
