import { IDocumentStore, PatchCommandData, PatchRequest } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("CustomerMetadataAfterSaveChanges", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can patch dictionary using args", async () => {
        {
            const session = store.openSession();
            await session.store(new Item(), "items/first");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const patch = Object.assign(PatchRequest.forScript("this.items[args.key] = args.value;"), {
                values: { key: "A", value: "B" }
            });
            session.advanced.defer(new PatchCommandData("items/first", null, patch, null));
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const item = new Item();
            await session.store(item, "items/first");
            session.advanced.getMetadataFor(item)["Items"] = { lang: "en" };

            await session.saveChanges();
        }
    });
});

class Page {
    public pageId: string;
}

class Item {
    public trie: Record<string, Page> = {};
    public items: Record<string, string> = {};
}
