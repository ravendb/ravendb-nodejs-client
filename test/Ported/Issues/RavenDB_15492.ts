import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15492Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("willCallOnBeforeDeleteWhenCallingDeleteById", async () => {
        const session = store.openSession();
        let called = false;

        session.advanced.on("beforeDelete", eventArgs => {
            called = eventArgs.documentId === "users/1";
        });

        await session.delete("users/1");
        await session.saveChanges();

        assertThat(called)
            .isTrue();
    });
});