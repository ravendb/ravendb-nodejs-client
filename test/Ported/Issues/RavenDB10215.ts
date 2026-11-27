import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class MyEntity {
    public name: string;
    public description: string;
    public id: string;
}

describe("RavenDB10215", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can use document store before store", async () => {
        store.addSessionListener("beforeStore", event => {
            const entity = event.getEntity();
            if (entity instanceof MyEntity) {
                entity.description = new Date().toISOString();
            }
        });

        const session = store.openSession();
        const entity = Object.assign(new MyEntity(), { name: "Async session" });

        await session.store(entity);
        await session.saveChanges();
        assertThat(entity.description).isNotNull();
    });
});
