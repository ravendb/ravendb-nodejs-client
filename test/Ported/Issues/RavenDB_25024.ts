import { addDays } from "date-fns";
import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_25024", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("change metadata does not show changes", async () => {
        const id = "users/1";

        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "user1" }), id);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load(id, User);
            session.advanced.getMetadataFor(user)["@refresh"] = addDays(new Date(), 1).toISOString();

            const whatChanged = session.advanced.whatChanged();
            const sessionHasChanges = session.advanced.hasChanges();
            const entityHasChanges = session.advanced.hasChanged(user);

            assertThat(Object.keys(whatChanged)).isNotEmpty();
            assertThat(entityHasChanges).isTrue();
            assertThat(sessionHasChanges).isTrue();
        }
    });
});
