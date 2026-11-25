import assert from "node:assert";
import {
    GetIndexOperation,
    IDocumentStore,
    IndexDefinition,
    PutIndexesOperation,
    StartIndexingOperation,
    StopIndexingOperation
} from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class UserAndAge {
    public name: string;
    public age: number;
}

function indexDefinition(map: string): IndexDefinition {
    const definition = new IndexDefinition();
    definition.name = "Users_ByName";
    definition.maps = new Set([map]);
    definition.type = "Map";
    return definition;
}

function assertSameDefinition(expected: IndexDefinition, actual: IndexDefinition) {
    assertThat(actual.name)
        .isEqualTo(expected.name);
    assertThat(actual.type)
        .isEqualTo(expected.type);
    assert.deepStrictEqual(actual.maps, expected.maps);
}

describe("StaticIndexesFromClient", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeUsers() {
        const session = store.openSession();
        await session.store(Object.assign(new UserAndAge(), { name: "Boki", age: 14 }));
        await session.store(Object.assign(new UserAndAge(), { name: "Toli", age: 5 }));
        await session.saveChanges();
    }

    it("can put and replace", async () => {
        await storeUsers();

        const input = indexDefinition("from user in docs.UserAndAges select new { user.name }");
        const input2 = indexDefinition("from user in docs.UserAndAges select new { user.age }");

        await store.maintenance.send(new PutIndexesOperation(input));

        const output1 = await store.maintenance.send(new GetIndexOperation("Users_ByName"));
        assertSameDefinition(input, output1);

        await store.maintenance.send(new PutIndexesOperation(input2));

        await testContext.waitForIndexing(store);

        const output2 = await store.maintenance.send(new GetIndexOperation("Users_ByName"));
        assertThat(output2.name)
            .isEqualTo("Users_ByName");
        assertSameDefinition(input2, output2);
    });

    it("can put replace and back to original", async () => {
        await storeUsers();

        const input = indexDefinition("from user in docs.UserAndAges select new { user.name }");
        const input2 = indexDefinition("from user in docs.UserAndAges select new { user.age }");

        await store.maintenance.send(new PutIndexesOperation(input));

        const output1 = await store.maintenance.send(new GetIndexOperation("Users_ByName"));
        assertSameDefinition(input, output1);

        await store.maintenance.send(new StopIndexingOperation());
        await store.maintenance.send(new PutIndexesOperation(input2));
        await store.maintenance.send(new PutIndexesOperation(input));
        await store.maintenance.send(new StartIndexingOperation());

        await testContext.waitForIndexing(store);

        const output2 = await store.maintenance.send(new GetIndexOperation("Users_ByName"));
        assertSameDefinition(input, output2);
    });
});
