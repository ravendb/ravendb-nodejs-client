import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Registration {
    public id: string;
    public registeredAt: Date;
    public name: string;
}

describe("CanDetectChanges", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can detect changes on new item", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new Registration(), { registeredAt: new Date(2010, 0, 1) }));
        assertThat(session.advanced.hasChanges()).isTrue();
        await session.saveChanges();
        assertThat(session.advanced.hasChanges()).isFalse();
    });

    it("can detect changes on existing item from query", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Registration(), { registeredAt: new Date(2010, 0, 1) }));
            await session.saveChanges();
        }

        const session = store.openSession();
        const registration = await session.advanced.documentQuery(Registration)
            .waitForNonStaleResults()
            .single();
        assertThat(session.advanced.hasChanges()).isFalse();
        assertThat(session.advanced.hasChanged(registration)).isFalse();
        registration.registeredAt = new Date(2010, 1, 1);
        assertThat(session.advanced.hasChanges()).isTrue();
        assertThat(session.advanced.hasChanged(registration)).isTrue();
        await session.saveChanges();
        assertThat(session.advanced.hasChanges()).isFalse();
        assertThat(session.advanced.hasChanged(registration)).isFalse();
    });
});
