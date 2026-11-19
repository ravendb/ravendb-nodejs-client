import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class User {
    public id: string;
}

describe("RavenDB_10720", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can save document with metadata", async () => {
        const session = store.openSession();
        const entity = new User();
        await session.store(entity);
        const metadata = session.advanced.getMetadataFor(entity);
        metadata["property--length-19"] = true;
        await session.saveChanges();
    });
});
