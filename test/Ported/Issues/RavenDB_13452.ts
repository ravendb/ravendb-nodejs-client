import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_13452", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canModifyDictionaryWithPatch_Add", async () => {
        {
            const session = store.openSession();
            const item = new Item();
            item.values = {};
            item.values["Key1"] = "Value1";
            item.values["Key2"] = "Value2";

            await session.store(item, "items/1");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const item = await session.load("items/1", Item);
            session.advanced.patchObject(item, "values", m => m.set("Key3", "Value3"));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const item = await session.load<Item>("items/1", Item);
            assertThat(item.values["Key1"])
                .isEqualTo("Value1");
            assertThat(item.values["Key2"])
                .isEqualTo("Value2");
            assertThat(item.values["Key3"])
                .isEqualTo("Value3");
        }
    });

    it("canModifyDictionaryWithPatch_Remove", async () => {
        {
            const session = store.openSession();
            const item = new Item();
            item.values = {};

            item.values["Key1"] = "Value1";
            item.values["Key2"] = "Value2";
            item.values["Key3"] = "Value3";

            await session.store(item, "items/1");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const item = await session.load<Item>("items/1", Item);
            session.advanced.patchObject(item, "values", m => m.remove("Key2"));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const item = await session.load<Item>("items/1", Item);
            assertThat(Object.keys(item.values))
                .hasSize(2);
            assertThat(item.values["Key1"])
                .isEqualTo("Value1");
            assertThat(item.values["Key3"])
                .isEqualTo("Value3");
        }
    });
});

class Item {
    public values: Record<string, string>;
}