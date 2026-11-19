import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class User {
    public id: string;
    public name: string;
}

describe("KeyLength", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("different keys with the same first 127 characters are different", async () => {
        const identicalPrefix = "x".repeat(127);
        const aId = identicalPrefix + "a";
        const bId = identicalPrefix + "b";

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { id: aId, name: "a" }));
            await session.saveChanges();
        }

        const session = store.openSession();
        await session.store(Object.assign(new User(), { id: bId, name: "b" }));
        await session.saveChanges();
    });
});
