import { GetCollectionStatisticsOperation, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_14525", function () {

    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    it("case insensitive collection name", async () => {
        let count = 0;
        const collectionNames = ["Users", "users"];

        testContext.customizeStore = async s => {
            s.conventions.findCollectionName = () => collectionNames[count++];
        };
        store = await testContext.getDocumentStore();

        {
            const session = store.openSession();
            const user1 = Object.assign(new User(), { name: "Grisha" });
            const user2 = Object.assign(new User(), { name: "Igal" });
            await session.store(user1, "users/1");
            await session.store(user2, "users/2");
            assertThat(session.advanced.getMetadataFor(user1)["@collection"]).isEqualTo("Users");
            assertThat(session.advanced.getMetadataFor(user2)["@collection"]).isEqualTo("users");
            await session.saveChanges();
        }

        const stats = await store.maintenance.send(new GetCollectionStatisticsOperation());
        assertThat(Object.keys(stats.collections).length).isEqualTo(1);
        assertThat(stats.countOfDocuments).isEqualTo(2);
    });
});
