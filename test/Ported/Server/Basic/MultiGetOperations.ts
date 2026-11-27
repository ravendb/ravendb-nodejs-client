import { IDocumentStore } from "../../../../src/index.js";
import { User } from "../../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

describe("MultiGetOperations", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("unless accessed lazy loads are no op", async () => {
        const session = store.openSession();
        session.advanced.lazily.load<User>("users/1");
        session.advanced.lazily.load<User>("users/2");

        assertThat(session.advanced.numberOfRequests)
            .isEqualTo(0);
    });
});
