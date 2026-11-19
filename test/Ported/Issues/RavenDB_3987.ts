import {
    AbstractCsharpIndexCreationTask,
    DeleteByQueryOperation,
    IDocumentStore
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Person {
    public name: string;
    public age: number;
}

class Person_ByName extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from person in docs.People select new { person.name }";
    }
}

class Person_ByAge extends AbstractCsharpIndexCreationTask {
    public constructor() {
        super();
        this.map = "from person in docs.People select new { person.age }";
    }
}

const newPersons = (): [string, number][] => [
    ["Bob", 40], ["Bob", 25], ["Bob", 42], ["Bob", 40],
    ["Bobina", 30], ["Bob", 43], ["Adi", 40], ["Adina", 20]
];

describe("RavenDB_3987", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("delete by query async", async () => {
        {
            const session = store.openSession();
            for (const [name, age] of newPersons()) {
                await session.store(Object.assign(new Person(), { name, age }));
            }
            await session.saveChanges();
        }

        await new Person_ByName().execute(store);
        await new Person_ByAge().execute(store);

        await testContext.waitForIndexing(store);

        const operation1 = await store.operations.send(
            new DeleteByQueryOperation("from index 'Person/ByName' where name = 'Bob'"));
        await operation1.waitForCompletion();

        await testContext.waitForIndexing(store);

        const operation2 = await store.operations.send(
            new DeleteByQueryOperation(`from index '${new Person_ByAge().getIndexName()}' where age < 35`));
        await operation2.waitForCompletion();

        {
            const session = store.openSession();
            const persons = await session.advanced.documentQuery(Person).all();

            assertThat(persons).hasSize(1);
            assertThat(persons[0].name).isEqualTo("Adi");
        }
    });
});
