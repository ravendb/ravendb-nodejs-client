import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_10977", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("on session created event works", async () => {
        store.on("sessionCreated", args => {
            args.session.maxNumberOfRequestsPerSession = 999;
        });

        const session = store.openSession();
        assertThat(session.advanced.maxNumberOfRequestsPerSession).isEqualTo(999);
    });
});
