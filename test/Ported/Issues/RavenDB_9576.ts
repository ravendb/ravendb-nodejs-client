import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("RavenDB_9576", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("identities should not overwrite existing documents", async () => {
        const session = store.openSession();
        for (let i = 0; i < 5; i++) {
            await session.store(new User(), "users/" + i);
        }
        await session.saveChanges();

        const fitzchak = new User();
        fitzchak.name = "Fitzchak";
        await session.store(fitzchak, "users|");
        await assertThrows(() => session.saveChanges(), err => {
            assertThat(err.name).isEqualTo("ConcurrencyException");
            assertThat(err.message).contains("Document users/1 has change vector ");
            assertThat(err.message).contains(", but Put was called with expecting new document. Optimistic concurrency violation, transaction will be aborted.");
        });

        const fitzchak2 = new User();
        fitzchak2.name = "Fitzchak";
        await session.store(fitzchak2, "users|", { changeVector: "ExpectedChangeVector" });
        await assertThrows(() => session.saveChanges(), err => {
            assertThat(err.name).isEqualTo("RavenException");
            assertThat(err.message).contains("System.InvalidOperationException: You cannot use change vector (ExpectedChangeVector) when using identity in the document ID (users/3).");
        });
    });
});
