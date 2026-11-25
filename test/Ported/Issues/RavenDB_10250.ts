import { IDocumentStore, PutCommandDataWithJson } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("RavenDB_10250", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can use before store to add new docs to save changes", async () => {
        store.addSessionListener("beforeStore", event => {
            event.session.defer(new PutCommandDataWithJson(event.documentId + "/companion", null, null, {
                "@metadata": {
                    "@collection": "Friends"
                },
                Name: event.getEntity().constructor.name
            }, "None"));
        });

        {
            const session = store.openSession();
            await session.store(new User(), "users/fred");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const c = await session.load<{ Name: string }>("users/fred/companion");
            assertThat(typeof c.Name).isEqualTo("string");
        }
    });
});
