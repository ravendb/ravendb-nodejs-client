import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15539", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.customizeStore = async s => {
            s.conventions.shouldIgnoreEntityChanges = ((sessionOperations, entity, documentId) => entity instanceof User && entity.ignoreChanges);
        }
        store = await testContext.getDocumentStore();
    });

    afterEach(function () {
        testContext.customizeStore = null;
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canIgnoreChanges", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Oren";
            await session.store(user, "users/oren");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/oren", User);
            user.name = "Arava";
            user.ignoreChanges = true;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>("users/oren", User);
            assertThat(user.name)
                .isEqualTo("Oren");
        }
    });

});

class User {
    public name: string;
    public ignoreChanges: boolean;
}
