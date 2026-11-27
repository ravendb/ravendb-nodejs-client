import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("RavenDB_2233", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("can multiple query", async () => {
        {
            const session = store.openSession();
            for (const id of ["users/1", "users/2", "users/3"]) {
                const user = new User();
                user.name = "user1";
                await session.store(user, id);
            }
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const results = await session.load(["users/3", "users/2", "users/1", "users/999", "users/2"], User);
            assertThat(results).hasSize(4);
            assertThat(session.advanced.getMetadataFor(results["users/3"])["@id"]).isEqualTo("users/3");
            assertThat(session.advanced.getMetadataFor(results["users/2"])["@id"]).isEqualTo("users/2");
            assertThat(session.advanced.getMetadataFor(results["users/1"])["@id"]).isEqualTo("users/1");
            assertThat(results).containsKey("users/999");
            assertThat(results["users/999"]).isEqualTo(null);
            assertThat(session.advanced.getMetadataFor(results["users/2"])["@id"]).isEqualTo("users/2");
        }
    });
});
