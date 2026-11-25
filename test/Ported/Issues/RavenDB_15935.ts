import { AbstractJavaScriptIndexCreationTask, DocumentStore, IDocumentStore } from "../../../src/index.js";
import { Company } from "../../Assets/Orders.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Companies_ByName extends AbstractJavaScriptIndexCreationTask<Company, Pick<Company, "name">> {
    public constructor() {
        super();

        this.map(Company, c => ({ name: c.name }));
    }
}

describe("RavenDB_15935", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("executing index on empty default database should throw", async () => {
        const storeWithoutDatabase = new DocumentStore(store.urls, null);
        storeWithoutDatabase.initialize();

        try {
            await assertThrows(() => new Companies_ByName().execute(storeWithoutDatabase), err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
                assertThat(err.message).contains("Cannot determine database to operate on");
            });
        } finally {
            storeWithoutDatabase.dispose();
        }
    });
});
