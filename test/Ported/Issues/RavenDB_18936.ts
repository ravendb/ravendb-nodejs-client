import { AbstractJavaScriptIndexCreationTask, GetTermsOperation, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";


describe("RavenDB_18936Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("CanCreateDynamicFieldsInsideMapJsIndex", async () => {
        const index = new CreateFieldInsideMapJavaScript();
        await index.execute(store);

        {
            const s = store.openSession();

            const attributes = [
                new Attribute("T1", 10.99),
                new Attribute("T2", 12.99),
                new Attribute("T3", 13.99)
            ];

            const item = new Item();
            item.attributes = attributes;

            await s.store(item);

            const item2 = new Item();
            item2.attributes = [
                new Attribute("T1", 11.99)
            ];

            await s.store(item2);

            await s.saveChanges();
        }

        {
            const s = store.openSession();
            const items = await s.advanced.documentQuery(Item, CreateFieldInsideMapJavaScript)
                .waitForNonStaleResults()
                .orderByDescending("T1")
                .all();

            assertThat(items)
                .hasSize(2);

            await assertTerm(store, index.getIndexName(), "T1", ["10.99", "11.99"]);
            await assertTerm(store, index.getIndexName(), "T2", ["12.99"]);
            await assertTerm(store, index.getIndexName(), "T3", ["13.99"]);
        }
    });

    it("CanCreateDynamicFieldFromArray", async function () {

        {
            const session = store.openSession();
            const item = new Item();
            item.id = "Maciej";
            await session.store(item);
            await session.saveChanges();
        }

        const index = new CreateFieldInsideArrayJavaScript();
        await index.execute(store);

        await testContext.waitForIndexing(store);

        await assertTerm(store, index.getIndexName(), "name", ["john"]);
    })
});


async function assertTerm(store: IDocumentStore, index: string, fieldName: string, termsThatShouldBeStored: string[]) {
    const terms = await store.maintenance.send(new GetTermsOperation(index, fieldName, null, 1024));

    assertThat(termsThatShouldBeStored)
        .hasSize(terms.length);

    for (const term of termsThatShouldBeStored) {
        assertThat(terms)
            .contains(term);
    }
}

class CreateFieldInsideArrayJavaScript extends AbstractJavaScriptIndexCreationTask<Item> {
    constructor() {
        super();

        const { createField } = this.mapUtils();

        this.map("Items", p => {
            // noinspection JSVoidFunctionReturnValueUsed
            return {
                _: [ createField("name", "john", {
                    indexing: "Exact",
                    storage: false,
                    termVector: null
                }) ]
            }
        })
    }
}

class CreateFieldInsideMapJavaScript extends AbstractJavaScriptIndexCreationTask<Item> {

    constructor() {
        super();

        const { createField } = this.mapUtils();

        this.map("Items", p => {
            return {
                _: p.attributes.map(x => createField(x.name, x.value, {
                    indexing: "Exact",
                    storage: true,
                    termVector: null
                }))
            }
        })
    }
}


class Item {
    id: string;
    attributes: Attribute[];
}

class Attribute {
    name: string;
    value: number;

    constructor(name?: string, value?: number) {
        this.name = name;
        this.value = value;
    }
}
