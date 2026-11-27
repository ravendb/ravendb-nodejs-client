import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class TestEntity {
    public id: string;
    public items: Record<string, string>;
}

describe("RavenDB_3276", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("dictionary with empty string as key should fail storing in db", async () => {
        {
            const session = store.openSession();
            const entity = new TestEntity();
            entity.items = { "": "value for empty string" };
            await session.store(entity);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const entity = await session.load("TestEntities/1-A", TestEntity);

            assertThat(entity).isNotNull();
            assertThat(entity.items).hasSize(1);
            assertThat(Object.keys(entity.items)[0]).isEqualTo("");
            assertThat(entity.items[""]).isEqualTo("value for empty string");
        }
    });
});
