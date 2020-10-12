import { IDocumentStore, SessionOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_14989", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("shouldWork", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const user = new User();
            user.name = "egor";

            session.advanced.clusterTransaction.createCompareExchangeValue("e".repeat(513), user);

            await assertThrows(() => session.saveChanges(), e => {
                assertThat(e.name)
                    .isEqualTo("CompareExchangeKeyTooBigException");
            });
        }
    });
});