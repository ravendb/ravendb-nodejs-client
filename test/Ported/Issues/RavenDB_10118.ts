import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_10118", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("should not throw all topologies down exception", async () => {
        const session = store.openSession();
        session.dispose();

        await assertThrows(() => session.query(User).all(), err => {
            assertThat(err.name).isEqualTo("InvalidOperationException");
            assertThat(err.message).contains("session has already been disposed");
        });
    });
});
