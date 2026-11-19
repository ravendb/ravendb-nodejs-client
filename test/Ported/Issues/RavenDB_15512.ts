import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";

describe("RavenDB_15512", function () {
    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("should not throw on write assurance", async () => {
        const session = store.openSession();
        session.advanced.waitForReplicationAfterSaveChanges({
            replicas: 13,
            timeout: 1,
            throwOnTimeout: false
        });

        await session.store(new User(), "users/1");
        await session.saveChanges();
    });
});
