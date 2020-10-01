import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15521", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("shouldWork", async () => {
        {
            const session = store.openSession();
            const doc = Object.assign(new SimpleDoc(), {
                id: "TestDoc",
                name: "State1"
            });

            await session.store(doc);

            const attachment = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

            session.advanced.attachments.store(doc, "TestAttachment", attachment);

            await session.saveChanges();

            const changeVector1 = session.advanced.getChangeVectorFor(doc);
            await session.advanced.refresh(doc);
            const changeVector2 = session.advanced.getChangeVectorFor(doc);
            assertThat(changeVector2)
                .isEqualTo(changeVector1);
        }
    });
});

class SimpleDoc {
    public id: string;
    public name: string;
}
