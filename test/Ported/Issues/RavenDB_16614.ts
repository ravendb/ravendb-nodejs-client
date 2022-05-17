
import { DocumentStore, SessionOptions } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB_16614Test", function () {

    let store: DocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("modificationInAnotherTransactionWillFailWithDelete", async () => {
        const sessionOptions: SessionOptions = {
            transactionMode: "ClusterWide"
        };

        {
            const session = store.openSession(sessionOptions);
            const user1 = new User();
            user1.name = "arava";

            const user2 = new User();
            user2.name = "phoebe";

            await session.store(user1, "users/arava");
            await session.store(user2, "users/phoebe");
            await session.saveChanges();
            session.dispose();
        }

        {
            const session = store.openSession(sessionOptions);

            const user = await session.load("users/arava", User);
            await session.delete(user);
            const user2 = await session.load("users/phoebe", User);
            user2.name = "Phoebe Eini";

            {
                const conflictedSession = store.openSession(sessionOptions);
                const conflictedArava = await conflictedSession.load("users/arava", User);
                conflictedArava.name = "Arava!";
                await conflictedSession.saveChanges();
                conflictedSession.dispose();
            }

            await assertThrows(async () => await session.saveChanges(), e => {
                assertThat(e.name)
                    .isEqualTo("ClusterTransactionConcurrencyException");
            });
        }
    });
});
