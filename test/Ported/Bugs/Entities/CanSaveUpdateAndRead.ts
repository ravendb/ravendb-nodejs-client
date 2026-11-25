import { IDocumentStore } from "../../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil.js";
import { assertThat } from "../../../Utils/AssertExtensions.js";

class Event {
    public id: string;
    public happy: boolean;
}

describe("CanSaveUpdateAndRead", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeHappyEvent() {
        const session = store.openSession();
        await session.store(Object.assign(new Event(), { happy: true }));
        await session.saveChanges();
    }

    async function makeEventUnhappy() {
        const session = store.openSession();
        const event = await session.load("events/1-A", Event);
        event.happy = false;
        await session.saveChanges();
    }

    it("can read entity name after update", async () => {
        await storeHappyEvent();
        await makeEventUnhappy();

        const session = store.openSession();
        const e = await session.load("events/1-A", Event);
        const entityName = session.advanced.getMetadataFor(e)["@collection"];
        assertThat(entityName).isEqualTo("Events");
    });

    it("can read entity name after update from query", async () => {
        await storeHappyEvent();
        await makeEventUnhappy();

        const session = store.openSession();
        const events = await session.query(Event).waitForNonStaleResults().all();
        assertThat(events).isNotEmpty();
    });

    it("can read entity name after update from query after entity is in cache", async () => {
        await storeHappyEvent();

        {
            const session = store.openSession();
            await session.load("events/1-A", Event);
        }

        await makeEventUnhappy();

        const session = store.openSession();
        const events = await session.query(Event).waitForNonStaleResults().all();
        assertThat(events).isNotEmpty();
    });
});
