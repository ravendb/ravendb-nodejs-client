import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("DatabaseChangesTests", function () {
    let store: IDocumentStore;

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
    });

    async function storeWithTopologyUpdates(disableTopologyUpdates: boolean) {
        testContext.customizeStore = async s => {
            s.conventions.disableTopologyUpdates = disableTopologyUpdates;
        };
        store = await testContext.getDocumentStore();
        testContext.customizeStore = null;
    }

    for (const disableTopologyUpdates of [true, false]) {
        it(`database changes when dispose database changes should set connection state disposed (disableTopologyUpdates: ${disableTopologyUpdates})`, async () => {
            await storeWithTopologyUpdates(disableTopologyUpdates);

            const changes = store.changes();
            const obs = changes.forDocumentsInCollection(User);
            await obs.ensureSubscribedNow();

            changes.dispose();
            await assertThrows(() => obs.ensureSubscribedNow(), err => {
                assertThat(err.name).isEqualTo("InvalidOperationException");
                assertThat(err.message).contains("disposed");
            });
        });
    }
});
