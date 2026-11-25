import { IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class Entity {
    public id: string;
}

describe("WithBase64Characters", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can load entity", async () => {
        const specialId = "SHA1-UdVhzPmv0o+wUez+Jirt0OFBcUY=";

        {
            const session = store.openSession();
            await session.store(Object.assign(new Entity(), { id: specialId }));
            await session.saveChanges();
        }

        const session = store.openSession();
        const entity1 = await session.load(specialId);
        assertThat(entity1).isNotNull();
    });
});
