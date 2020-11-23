import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../../src";
import { AbstractJavaScriptIndexCreationTask } from "../../../src/Documents/Indexes/AbstractJavaScriptIndexCreationTask";

describe("Issue RavenDB-5669", function () {

    let store: IDocumentStore;
    let index;

    beforeEach(async function () {
        index = new Animal_Index();
        store = await testContext.getDocumentStore();
        await store.executeIndex(index);
        await storeAnimals(store);
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("working with different search term order", async () => {
        const session = store.openSession();
        const query = session.advanced.documentQuery({
            documentType: Animal,
            indexName: index.getIndexName()
        });

        query.openSubclause()
            .whereEquals("type", "Cat")
            .orElse()
            .search("name", "Peter*")
            .andAlso()
            .search("name", "Pan*")
            .closeSubclause();

        const results = await query.all();
        assert.strictEqual(results.length, 1);
    });

    it("working with subclause", async () => {
        const session = store.openSession();

        const query = session.advanced.documentQuery({
            documentType: Animal,
            indexName: index.getIndexName()
        });

        query.openSubclause()
            .whereEquals("type", "Cat")
            .orElse()
            .openSubclause()
            .search("name", "Peter*")
            .andAlso()
            .search("name", "Pan*")
            .closeSubclause()
            .closeSubclause();

        const results = await query.all();
        assert.strictEqual(results.length, 1);
    });
});

async function storeAnimals(store: IDocumentStore) {
    {
        const session = store.openSession();
        const animal1 = new Animal();
        animal1.name = "Peter Pan";
        animal1.type = "Dog";

        const animal2 = new Animal();
        animal2.name = "Peter Poo";
        animal2.type = "Dog";

        const animal3 = new Animal();
        animal3.name = "Peter Foo";
        animal3.type = "Dog";

        await session.store(animal1);
        await session.store(animal2);
        await session.store(animal3);
        await session.saveChanges();
    }

    await testContext.waitForIndexing(store, store.database);
}

class Animal {
    public type: string;
    public name: string;
}

// tslint:disable-next-line:class-name
class Animal_Index extends AbstractJavaScriptIndexCreationTask<Animal, Pick<Animal, "name" | "type">> {
    public constructor() {
        super();

        this.map(Animal, a => {
            return {
                name: a.name,
                type: a.type
            }
        });

        this.analyze("name", "StandardAnalyzer");
        this.index("name", "Search");
    }
}
