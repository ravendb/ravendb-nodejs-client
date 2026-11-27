import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class TextHolder {
    public txt: string;
}

describe("RavenDB_11243", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can serialize string property of exactly 32766 chars", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new TextHolder(), { txt: " ".repeat(32766) }));
        await session.saveChanges();
    });
});
