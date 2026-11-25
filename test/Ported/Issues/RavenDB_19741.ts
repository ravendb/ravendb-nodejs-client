import {
    IDocumentStore,
    PutServerWideClientConfigurationOperation,
    ToggleDatabasesStateOperation
} from "../../../src/index.js";
import { User } from "../../Assets/Entities.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

describe("RavenDB_19741", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeWithIdentityId() {
        const session = store.openSession();
        const user = new User();
        await session.store(user, "users|");
        await session.saveChanges();
        return user.id;
    }

    it("will respect server wide client configuration for identity parts separator", async () => {
        try {
            await store.maintenance.server.send(new PutServerWideClientConfigurationOperation({
                disabled: true,
                identityPartsSeparator: "^"
            }));

            assertThat(await storeWithIdentityId())
                .isEqualTo("users/1");

            await store.maintenance.server.send(new PutServerWideClientConfigurationOperation({
                disabled: false,
                identityPartsSeparator: "^"
            }));

            assertThat(await storeWithIdentityId())
                .isEqualTo("users^2");

            await store.maintenance.server.send(new ToggleDatabasesStateOperation(store.database, true));
            await store.maintenance.server.send(new ToggleDatabasesStateOperation(store.database, false));

            assertThat(await storeWithIdentityId())
                .isEqualTo("users^3");
        } finally {
            await store.maintenance.server.send(new PutServerWideClientConfigurationOperation({ disabled: true }));
        }
    });
});
