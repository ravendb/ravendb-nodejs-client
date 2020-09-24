import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";

describe("RDBC_339", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("invalidAttachmentsFormat", async () => {
        {
            const session = store.openSession();
            const u = Object.assign(new User(), { name: "John" });
            await session.store(u);

            await session.advanced.attachments.store(u, "data", Buffer.from([1, 2, 3]));
            await session.saveChanges();

            const u2 = Object.assign(new User(), { name: "Oz" });
            await session.store(u2);
            await session.saveChanges();
        }
    });

});
