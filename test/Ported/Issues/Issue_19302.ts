import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("Issue_19302", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("conditional load async in same session", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "RavenDB";
            await session.store(user, "users/1");
            await session.saveChanges();
        }

        const newSession = store.openSession();
        const user = await newSession.load("users/1", User);
        const cv = newSession.advanced.getChangeVectorFor(user);
        assertThat(user).isNotNull();
        assertThat(user.name).isEqualTo("RavenDB");
        user.name = "RavenDB Async";
        await newSession.saveChanges();

        const conditional = await newSession.advanced.conditionalLoad("users/1", cv, User);

        assertThat(conditional.entity.name).isEqualTo("RavenDB Async");
    });
});
