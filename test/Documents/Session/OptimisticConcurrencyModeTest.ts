import { DocumentConventions, IDocumentStore, SessionOptions } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("OptimisticConcurrencyModeTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => await disposeTestDocumentStore(store));

    it("modeSetter_updatesUseOptimisticConcurrencyField_whenCalledAfterSessionOptions", async () => {
        const session = store.openSession({ optimisticConcurrencyMode: "WritesAndReads" } as SessionOptions);
        // mode setter also updates the boolean field
        session.advanced.optimisticConcurrencyMode = "None";
        assertThat(session.advanced.useOptimisticConcurrency).isFalse();
        assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("None");
    });

    it("modeSetter_updatesUseOptimisticConcurrencyField", async () => {
        const session = store.openSession();
        assertThat(session.advanced.useOptimisticConcurrency).isFalse();

        // mode setter keeps both fields in sync
        session.advanced.optimisticConcurrencyMode = "WritesAndReads";
        assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("WritesAndReads");
        assertThat(session.advanced.useOptimisticConcurrency).isTrue();

        session.advanced.optimisticConcurrencyMode = "None";
        assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("None");
        assertThat(session.advanced.useOptimisticConcurrency).isFalse();
    });

    it("plainFieldWrite_doesNotUpdateMode", async () => {
        const session = store.openSession({ optimisticConcurrencyMode: "Writes" } as SessionOptions);
        assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("Writes");
        assertThat(session.advanced.useOptimisticConcurrency).isTrue();

        // direct field write only updates the boolean — mode is unchanged
        session.advanced.useOptimisticConcurrency = false;
        assertThat(session.advanced.useOptimisticConcurrency).isFalse();
        assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("Writes");
    });

    it("canConfigureOptimisticConcurrencyModeForSessions", async () => {
        {
            const session = store.openSession({ optimisticConcurrencyMode: "WritesAndReads" } as SessionOptions);
            assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("WritesAndReads");
        }
        {
            const session = store.openSession({ optimisticConcurrencyMode: "Writes" } as SessionOptions);
            assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("Writes");
        }
        {
            const session = store.openSession({ optimisticConcurrencyMode: "None" } as SessionOptions);
            assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("None");
        }
    });

    it("conventions_mutualExclusion_modeFirst_thenUseOptimistic_shouldThrow", async () => {
        const conventions = new DocumentConventions();
        conventions.optimisticConcurrencyMode = "WritesAndReads";

        await assertThrows(() => {
            conventions.useOptimisticConcurrency = true;
        }, err => {
            assertThat(err.message).contains("useOptimisticConcurrency");
        });
    });

    it("conventions_mutualExclusion_useOptimisticFirst_thenMode_shouldThrow", async () => {
        const conventions = new DocumentConventions();
        conventions.useOptimisticConcurrency = true;

        await assertThrows(() => {
            conventions.optimisticConcurrencyMode = "Writes";
        }, err => {
            assertThat(err.message).contains("optimisticConcurrencyMode");
        });
    });

    it("conventions_setWritesAndReads_roundTrips", async () => {
        const conventions = new DocumentConventions();
        conventions.optimisticConcurrencyMode = "WritesAndReads";
        assertThat(conventions.optimisticConcurrencyMode).isEqualTo("WritesAndReads");
    });

    it("sessionOptionsMode_doesNotPreventUseOptimisticConcurrencyChange", async () => {
        const session = store.openSession({ optimisticConcurrencyMode: "WritesAndReads" } as SessionOptions);
        assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("WritesAndReads");

        session.advanced.useOptimisticConcurrency = false;
        // plain field write — no guard on session; mode field is not updated
        assertThat(session.advanced.useOptimisticConcurrency).isFalse();
        assertThat(session.advanced.optimisticConcurrencyMode).isEqualTo("WritesAndReads");
    });
});
