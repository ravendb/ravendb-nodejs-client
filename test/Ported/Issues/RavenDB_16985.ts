import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_16985Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("checkIfHasChangesIsTrueAfterAddingAttachment", async () => {

        const session = store.openSession();
        const user = new User();
        await session.store(user);
        await session.saveChanges();

        session.advanced.attachments.store(user, "my-test.txt", Buffer.from([1]));

        const hasChanges = session.advanced.hasChanges();
        assertThat(hasChanges)
            .isTrue();
    });
});
