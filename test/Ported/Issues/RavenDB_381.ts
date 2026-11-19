import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("RavenDB_381", function () {

    it("can change convention just for one type async", async () => {
        testContext.customizeStore = async s => {
            s.conventions.registerIdConvention(User, (dbName, user: User) => Promise.resolve("users/" + user.name));
        };
        let store: IDocumentStore;
        try {
            store = await testContext.getDocumentStore();
        } finally {
            testContext.customizeStore = null;
        }
        try {
            const session = store.openSession();
            const entity = Object.assign(new User(), { name: "Ayende" });
            await session.store(entity);
            await session.saveChanges();
            assertThat(session.advanced.getDocumentId(entity)).isEqualTo("users/Ayende");
        } finally {
            await disposeTestDocumentStore(store);
        }
    });
});
