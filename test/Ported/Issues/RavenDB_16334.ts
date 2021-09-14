import { AbstractCsharpIndexCreationTask, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_16334", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canWaitForIndexesWithLoadAfterSaveChangesAllIndexes", async () => {
        await canWaitForIndexesWithLoadAfterSaveChangesInternal(true);
    });

    it("canWaitForIndexesWithLoadAfterSaveChangesSingleIndex", async () => {
        await canWaitForIndexesWithLoadAfterSaveChangesInternal(false);
    });

    async function canWaitForIndexesWithLoadAfterSaveChangesInternal(allIndexes: boolean) {
        await new MyIndex().execute(store);

        {
            const session = store.openSession();

            const mainDocument = new MainDocument();
            mainDocument.id = "main/A";
            mainDocument.name = "A";
            await session.store(mainDocument);

            const relatedDocument = new RelatedDocument();
            relatedDocument.name = "A";
            relatedDocument.value = 21.5;
            relatedDocument.id = "related/A";
            await session.store(relatedDocument);

            await session.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const session = store.openSession();
            const result = await session.query({
                indexName: new MyIndex().getIndexName()
            })
                .selectFields<MyIndexResult>(["name", "value"], MyIndexResult)
                .single();

            assertThat(result.value)
                .isEqualTo("21.5");
        }

        // act
        {
            const session = store.openSession();
            session.advanced.waitForIndexesAfterSaveChanges({
                timeout: 15_000,
                indexes: allIndexes ? null : ["MyIndex"],
                throwOnTimeout: true
            });

            const related = await session.load<RelatedDocument>("related/A");
            related.value = 42;
            await session.saveChanges();
        }

        // assert
        {
            const session = store.openSession();
            const result = await session.query({
                indexName: new MyIndex().getIndexName()
            })
                .selectFields<MyIndexResult>(["name", "value"], MyIndexResult)
                .single();

            assertThat(result.value)
                .isEqualTo("42");
        }
    }
})

class MainDocument {
    public name: string;
    public id: string;
}

class RelatedDocument {
    public name: string;
    public value: number;
    public id: string;
}


class MyIndex extends AbstractCsharpIndexCreationTask {
    constructor() {
        super();

        this.map = "docs.MainDocuments.Select(mainDocument => new {" +
            "    mainDocument = mainDocument," +
            "    related = this.LoadDocument(String.Format(\"related/{0}\", mainDocument.name), \"RelatedDocuments\")" +
            "}).Select(this0 => new {" +
            "    name = this0.mainDocument.name,\n" +
            "    value = this0.related != null ? ((decimal ? ) this0.related.value) : ((decimal ? ) null)\n" +
            "})";

        this.storeAllFields("Yes");
    }
}

class MyIndexResult {
    public name: string;
    public value: number;
}
