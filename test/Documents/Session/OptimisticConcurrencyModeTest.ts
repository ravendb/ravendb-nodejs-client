import { DocumentConventions, IDocumentSession, IDocumentStore, SessionOptions } from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class SimpleDoc {
    public id?: string;
    public name: string;
}

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

    (RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("registerForConcurrencyCheck", function () {

        async function storeDocs(...docs: [string, string][]): Promise<void> {
            const session = store.openSession();
            for (const [id, name] of docs) {
                await session.store(Object.assign(new SimpleDoc(), { name }), id);
            }
            await session.saveChanges();
        }

        async function getChangeVector(id: string): Promise<string> {
            const session = store.openSession();
            return session.advanced.getChangeVectorFor(await session.load(id, SimpleDoc));
        }

        async function renameInBackground(id: string, name: string): Promise<void> {
            const session = store.openSession();
            const doc = await session.load(id, SimpleDoc);
            doc.name = name;
            await session.saveChanges();
        }

        async function rename(session: IDocumentSession, id: string, name: string): Promise<void> {
            const doc = await session.load(id, SimpleDoc);
            doc.name = name;
        }

        async function assertName(id: string, expectedName: string): Promise<void> {
            const session = store.openSession();
            const doc = await session.load(id, SimpleDoc);
            assertThat(doc.name).isEqualTo(expectedName);
        }

        async function assertConcurrencyException(session: IDocumentSession, id: string): Promise<void> {
            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name).isEqualTo("ConcurrencyException");
                assertThat(err.message).contains(id);
            });
        }

        it("withEmptyId_shouldThrow", async () => {
            const session = store.openSession();

            for (const id of [null, ""]) {
                await assertThrows(() => session.advanced.registerForConcurrencyCheck(id, "cv"), err => {
                    assertThat(err.name).isEqualTo("InvalidArgumentException");
                });
            }
        });

        it("throwsWhenRegisteredDocumentWasModified", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);
            const changeVector = await getChangeVector("docs/watched");
            await renameInBackground("docs/watched", "Changed");

            // the default None mode proves the registered check is honored regardless of mode
            const session = store.openSession();
            await rename(session, "docs/other", "Edited");
            session.advanced.registerForConcurrencyCheck("docs/watched", changeVector);

            await assertConcurrencyException(session, "docs/watched");

            await assertName("docs/other", "Other");
        });

        it("succeedsWhenRegisteredDocumentUnchanged", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);
            const changeVector = await getChangeVector("docs/watched");

            const session = store.openSession();
            await rename(session, "docs/other", "Edited");
            session.advanced.registerForConcurrencyCheck("docs/watched", changeVector);
            await session.saveChanges();

            await assertName("docs/other", "Edited");
        });

        it("emptyChangeVectorAssertsDocumentDoesNotExist", async () => {
            await storeDocs(["docs/other", "Other"]);
            await storeDocs(["docs/watched", "Now exists"]);

            const session = store.openSession();
            await rename(session, "docs/other", "Edited");
            session.advanced.registerForConcurrencyCheck("docs/watched", "");

            await assertConcurrencyException(session, "docs/watched");
        });

        it("emptyChangeVectorSucceedsWhenDocumentStillAbsent", async () => {
            await storeDocs(["docs/other", "Other"]);

            const session = store.openSession();
            await rename(session, "docs/other", "Edited");
            session.advanced.registerForConcurrencyCheck("docs/missing", "");
            await session.saveChanges();

            await assertName("docs/other", "Edited");
        });

        it("nullChangeVectorDisablesCheckForId", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);

            const session = store.openSession({ optimisticConcurrencyMode: "WritesAndReads" });
            await session.load("docs/watched", SimpleDoc);
            await rename(session, "docs/other", "Edited");

            await renameInBackground("docs/watched", "Changed");

            session.advanced.registerForConcurrencyCheck("docs/watched", null);
            await session.saveChanges();

            await assertName("docs/other", "Edited");
        });

        it("isConsumedByASuccessfulSaveChanges_afterModify", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);

            const session = store.openSession();
            const watched = await session.load("docs/watched", SimpleDoc);
            session.advanced.registerForConcurrencyCheck("docs/watched", session.advanced.getChangeVectorFor(watched));

            watched.name = "Changed";
            await session.saveChanges();

            // must not re-assert the change vector this session already replaced
            await rename(session, "docs/other", "Edited");
            await session.saveChanges();

            await assertName("docs/watched", "Changed");
            await assertName("docs/other", "Edited");
        });

        it("isConsumedByASuccessfulSaveChanges_afterDelete", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);

            const session = store.openSession();
            const watched = await session.load("docs/watched", SimpleDoc);
            session.advanced.registerForConcurrencyCheck("docs/watched", session.advanced.getChangeVectorFor(watched));

            await session.delete(watched);
            await session.saveChanges();

            // must not assert the old change vector against this session's own tombstone
            await rename(session, "docs/other", "Edited");
            await session.saveChanges();

            await assertName("docs/other", "Edited");
        });

        it("isKeptWhenSaveChangesFails", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);
            const staleChangeVector = await getChangeVector("docs/watched");
            await renameInBackground("docs/watched", "Changed");

            const session = store.openSession();
            await rename(session, "docs/other", "Edited");
            session.advanced.registerForConcurrencyCheck("docs/watched", staleChangeVector);

            await assertConcurrencyException(session, "docs/watched");
            await assertConcurrencyException(session, "docs/watched");
        });

        it("explicitChangeVector_isNotOverwrittenByALaterLoad", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);
            const staleChangeVector = await getChangeVector("docs/watched");
            await renameInBackground("docs/watched", "Changed");

            const session = store.openSession({ optimisticConcurrencyMode: "WritesAndReads" });
            session.advanced.registerForConcurrencyCheck("docs/watched", staleChangeVector);
            await session.load("docs/watched", SimpleDoc);
            await rename(session, "docs/other", "Edited");

            await assertConcurrencyException(session, "docs/watched");
        });

        it("disabledCheck_survivesALaterLoad", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);

            const session = store.openSession({ optimisticConcurrencyMode: "WritesAndReads" });
            session.advanced.registerForConcurrencyCheck("docs/watched", null);
            await session.load("docs/watched", SimpleDoc);

            await renameInBackground("docs/watched", "Changed");

            await rename(session, "docs/other", "Edited");
            await session.saveChanges();

            await assertName("docs/other", "Edited");
        });

        it("isHonored_whenDocumentIsAlsoWrittenWithItsOwnConcurrencyCheck", async () => {
            await storeDocs(["docs/watched", "Original"]);
            const staleChangeVector = await getChangeVector("docs/watched");
            await renameInBackground("docs/watched", "Changed");

            const session = store.openSession({ optimisticConcurrencyMode: "Writes" });
            const watched = await session.load("docs/watched", SimpleDoc);
            session.advanced.registerForConcurrencyCheck("docs/watched", staleChangeVector);
            watched.name = "Edited";

            // the write carries the current change vector and would pass, so only the registered check can fail
            await assertConcurrencyException(session, "docs/watched");
        });

        it("updatesSessionStateOfDocumentsWrittenInTheSameBatch", async () => {
            await storeDocs(["docs/watched", "Original"]);
            const changeVector = await getChangeVector("docs/watched");

            const session = store.openSession();
            const created = Object.assign(new SimpleDoc(), { name: "Created" });
            await session.store(created, "docs/created");
            session.advanced.registerForConcurrencyCheck("docs/watched", changeVector);
            await session.saveChanges();

            assertThat(session.advanced.getChangeVectorFor(created)).isNotNull();
        });

        it("lastRegistrationForAnIdWins", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);

            const session = store.openSession();
            session.advanced.registerForConcurrencyCheck("docs/watched", "A:1-aaaaaaaaaaaaaaaaaaaaaa");
            session.advanced.registerForConcurrencyCheck("docs/watched", null);

            await rename(session, "docs/other", "Edited");
            await session.saveChanges();

            await assertName("docs/other", "Edited");
        });

        it("isClearedByAdvancedClear", async () => {
            await storeDocs(["docs/watched", "Original"], ["docs/other", "Other"]);
            const staleChangeVector = await getChangeVector("docs/watched");
            await renameInBackground("docs/watched", "Changed");

            const session = store.openSession();
            session.advanced.registerForConcurrencyCheck("docs/watched", staleChangeVector);
            session.advanced.clear();

            await rename(session, "docs/other", "Edited");
            await session.saveChanges();

            await assertName("docs/other", "Edited");
        });

        it("onItsOwn_sendsExactlyOneRequest", async () => {
            await storeDocs(["docs/watched", "Original"]);
            const changeVector = await getChangeVector("docs/watched");

            const session = store.openSession();
            session.advanced.registerForConcurrencyCheck("docs/watched", changeVector);
            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        });

        it("disabledOnly_sendsNoRequest", async () => {
            const session = store.openSession();
            session.advanced.registerForConcurrencyCheck("docs/watched", "A:1-aaaaaaaaaaaaaaaaaaaaaa");
            session.advanced.registerForConcurrencyCheck("docs/watched", null);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests).isEqualTo(0);
        });

        it("isNotSupportedInANoTrackingSession", async () => {
            const session = store.openSession({ noTracking: true });
            session.advanced.registerForConcurrencyCheck("docs/watched", "A:1-aaaaaaaaaaaaaaaaaaaaaa");

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name).isEqualTo("InvalidOperationException");
            });
        });

        it("isNotSupportedInAClusterWideSession", async () => {
            const session = store.openSession({ transactionMode: "ClusterWide" });
            session.advanced.registerForConcurrencyCheck("docs/watched", "A:1-aaaaaaaaaaaaaaaaaaaaaa");

            await assertThrows(() => session.saveChanges(), err => {
                assertThat(err.name).isEqualTo("InvalidOperationException");
                assertThat(err.message).contains("registerForConcurrencyCheck");
            });
        });
    });
});
