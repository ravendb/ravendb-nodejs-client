import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { AbstractJavaScriptMultiMapIndexCreationTask, GetIndexErrorsOperation, IDocumentStore } from "../../../src";
import { assertThat } from "../../Utils/AssertExtensions";

describe("MultiMapWithCustomProperties", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can_create_index", async () => {
        {
            const session = store.openSession();
            const cat = new Cat();
            cat.name = "Tom";
            cat.catsOnlyProperty = "Miau";
            await session.store(cat);

            const dog = new Dog();
            dog.name = "Oscar";
            await session.store(dog);

            await session.saveChanges();
        }

        await new CatsAndDogs().execute(store);

        await testContext.waitForIndexing(store);

        const errorsCount = await store.maintenance.send(new GetIndexErrorsOperation());
        assertThat(errorsCount[0].errors)
            .hasSize(0);

        {
            const s = store.openSession();
            assertThat(await s.query<Cat>({
                documentType: Cat,
                index: CatsAndDogs
            }).whereEquals("catsOnlyProperty", "Miau").all())
                .hasSize(1);

            assertThat(await s.query<Dog>({
                documentType: Dog,
                index: CatsAndDogs
            }).whereEquals("name", "Oscar").all())
                .hasSize(1);
        }
    });

});

class CatsAndDogs extends AbstractJavaScriptMultiMapIndexCreationTask<{ name: string, catsOnlyProperty?: string }> {
    public constructor() {
        super();

        this.map<Cat>(Cat, c => {
            return {
                name: c.name,
                catsOnlyProperty: c.catsOnlyProperty
            }
        });

        this.map<Dog>(Dog, d => {
            return {
                name: d.name,
                catsOnlyProperty: null
            }
        })
    }
}

interface IHaveName {
    name: string;
}

class Cat implements IHaveName {
    public name: string;
    public catsOnlyProperty: string;
}

class Dog implements IHaveName {
    public name: string;
}