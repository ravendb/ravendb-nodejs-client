import * as assert from "assert";
import { EntitiesCollectionObject, IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Lazy } from "../../../src/Documents/Lazy";

export class Abc {
    public id: string;
}

export class Xyz {
    public id: string;
}

describe("LoadAllStartingWith", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can load all starting with", async () => {
        const doc1 = new Abc();
        doc1.id = "abc/1";

        const doc2 = new Xyz();
        doc2.id = "xyz/1";

        {
            const session = store.openSession();
            await session.store(doc1);
            await session.store(doc2);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const testClassesLazy: Lazy<EntitiesCollectionObject<Abc>> =
                session.advanced.lazily.loadStartingWith<Abc>("abc/");
            const test2Classes: Xyz[] = await session.query<Xyz>({
                collection: store.conventions.getCollectionNameForType(Xyz)
            })
                .waitForNonStaleResults()
                .lazily()
                .getValue();

            const testClasses = await testClassesLazy.getValue();

            assert.strictEqual(Object.keys(testClasses).length, 1);
            assert.strictEqual(test2Classes.length, 1);
            assert.strictEqual(testClasses["abc/1"].id, "abc/1");
            assert.strictEqual(test2Classes[0].id, "xyz/1");
        }
    });
});
