import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public name: string;
}

describe("RavenDB_19629", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    const openClusterWideSession = () => store.openSession({ transactionMode: "ClusterWide" });

    it("can load and save non existing document", async () => {
        const session = openClusterWideSession();
        const arava = await session.load("users/arava", User) ?? new User();
        await session.store(arava, "users/arava");
        await session.saveChanges();
    });

    it("can delete cmp xchg value2", async () => {
        {
            const session = openClusterWideSession();
            await session.store(Object.assign(new User(), { name: "arava" }), "users/arava");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            await session.delete("users/arava");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name: "arava-new" }), "users/arava");
            await session.saveChanges();
        }
        {
            const session = openClusterWideSession();
            const arava = await session.load("users/arava", User);
            arava.name = "new-new";
            await session.saveChanges();
        }
    });

    it("test session mixture2", async () => {
        {
            const session = openClusterWideSession();
            await session.store(new User(), "foo/bar");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            await session.delete("foo/bar");
            await session.saveChanges();
        }
        {
            const session = openClusterWideSession();
            const user = await session.load("foo/bar", User);
            assertThat(user).isNull();
            await session.store(new User(), "foo/bar");
            await session.saveChanges();
        }
    });
});
