import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class List {
    public id: string;
    public items: string[];
}

class ListItem {
    public id: string;
}

describe("RavenDB_3632", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("include with load async", async () => {
        let listId: string;
        {
            const session = store.openSession();
            const item1 = new ListItem();
            const item2 = new ListItem();
            await session.store(item1);
            await session.store(item2);
            const list = Object.assign(new List(), { items: [item1.id, item2.id] });
            await session.store(list);
            listId = list.id;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const list = await session.include("items").load(listId, List);
            const enumer = list.items.map(it => it.toString());
            await session.load(enumer, ListItem);
            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        }
    });
});
