import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    AbstractMultiMapIndexCreationTask, GetIndexOperation,
    IDocumentStore,
} from "../../../src";

describe("SimpleMultiMapTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can crate multi map index", async () => {
        await new CatsAndDogs().execute(store);

        const indexDefinition = await store.maintenance.send(new GetIndexOperation("CatsAndDogs"));
        assert.strictEqual(indexDefinition.maps.size, 2);
    });

    it("can query using multi map", async () => {
        await new CatsAndDogs().execute(store);

        {
            const session = store.openSession();

            const cat = new Cat();
            cat.name = "Tom";

            const dog = new Dog();
            dog.name = "Oscar";

            await session.store(cat);
            await session.store(dog);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const haveNames = await session.query<IHaveName>({
                indexName: "CatsAndDogs"
            })
                .waitForNonStaleResults()
                .orderBy("name")
                .all();

            assert.strictEqual(haveNames.length, 2);
            assert.ok(haveNames[0] instanceof Dog);
            assert.ok(haveNames[1] instanceof Cat);
        }
    });
});

export class CatsAndDogs extends AbstractMultiMapIndexCreationTask {
    public constructor() {
        super();
        this.addMap("from cat in docs.Cats select new { cat.name }");
        this.addMap("from dog in docs.Dogs select new { dog.name }");
    }
}

export class IHaveName {
    public name: string;
}

export class Cat implements IHaveName {
    public name: string;
}

export class Dog implements IHaveName {
    public name: string;
}
