import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15531", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("shouldWork", async () => {
        const session = store.openSession();

        const doc = Object.assign(new SimpleDoc(), {
            id: "TestDoc",
            name: "State1"
        });

        await session.store(doc);
        await session.saveChanges();

        doc.name = "State2";
        let changes1 = session.advanced.whatChanged();

        let changes = changes1["TestDoc"];
        assertThat(changes)
            .isNotNull()
            .hasSize(1);

        assertThat(changes[0].change)
            .isEqualTo("FieldChanged");
        assertThat(changes[0].fieldName)
            .isEqualTo("name");
        assertThat(changes[0].fieldOldValue)
            .isEqualTo("State1");
        assertThat(changes[0].fieldNewValue)
            .isEqualTo("State2");

        await session.saveChanges();

        doc.name = "State3";

        changes1 = session.advanced.whatChanged();

        changes = changes1["TestDoc"];

        assertThat(changes)
            .isNotNull()
            .hasSize(1);

        assertThat(changes[0].change)
            .isEqualTo("FieldChanged");
        assertThat(changes[0].fieldName)
            .isEqualTo("name");
        assertThat(changes[0].fieldOldValue)
            .isEqualTo("State2");
        assertThat(changes[0].fieldNewValue)
            .isEqualTo("State3");

        await session.advanced.refresh(doc);

        doc.name = "State4";

        changes1 = session.advanced.whatChanged();
        changes = changes1["TestDoc"];

        assertThat(changes)
            .isNotNull()
            .hasSize(1);

        assertThat(changes[0].change)
            .isEqualTo("FieldChanged");
        assertThat(changes[0].fieldName)
            .isEqualTo("name");
        assertThat(changes[0].fieldOldValue)
            .isEqualTo("State2");
        assertThat(changes[0].fieldNewValue)
            .isEqualTo("State4");
    });
});

class SimpleDoc {
    public id: string;
    public name: string;
}