import path from "node:path";
import {
    AdoptOrphanedRevisionsOperation,
    AdoptOrphanedRevisionsResult,
    CONSTANTS,
    ConfigureRevisionsOperation,
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

describe("RavenDB_21381", function () {

    let store: IDocumentStore;
    let temporaryDirContext: TemporaryDirContext;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
        temporaryDirContext.dispose();
    });

    async function importOrphanedRevisions(userId: string) {
        const sourceStore = await testContext.getDocumentStore();
        const dumpFile = path.join(temporaryDirContext.tempDir, "revisions." + CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION);
        try {
            const configuration = new RevisionsConfiguration();
            const usersConfiguration = new RevisionsCollectionConfiguration();
            usersConfiguration.disabled = false;
            configuration.collections = new Map([["Users", usersConfiguration]]);
            await sourceStore.maintenance.send(new ConfigureRevisionsOperation(configuration));

            const session = sourceStore.openSession();
            const user = Object.assign(new User(), { name: "Shahar" });
            await session.store(user, userId);
            await session.saveChanges();
            for (let i = 1; i <= 10; i++) {
                user.name = "Shahar" + i;
                await session.saveChanges();
            }

            const exportOptions = new DatabaseSmugglerExportOptions();
            exportOptions.operateOnTypes = ["RevisionDocuments"];
            await (await sourceStore.smuggler.export(exportOptions, dumpFile)).waitForCompletion();
        } finally {
            await disposeTestDocumentStore(sourceStore);
        }

        const importOptions = new DatabaseSmugglerImportOptions();
        importOptions.operateOnTypes = ["RevisionDocuments"];
        await (await store.smuggler.import(importOptions, dumpFile)).waitForCompletion();
    }

    async function lastRevisionFlags(id: string) {
        const metadata = await store.openSession().advanced.revisions.getMetadataFor(id);
        return metadata[0]["@flags"] as string;
    }

    it("adoptOrphanedRevisionsTest", async () => {
        const userId = "Users/1-A";
        await importOrphanedRevisions(userId);

        assertThat(await store.openSession().advanced.revisions.getCountFor(userId)).isEqualTo(11);
        assertThat((await lastRevisionFlags(userId)).includes("DeleteRevision")).isFalse();

        const otherCollection = await store.operations.send(
            new AdoptOrphanedRevisionsOperation({ collections: ["Orders"] }));
        const otherCollectionResult = await otherCollection.waitForCompletion<AdoptOrphanedRevisionsResult>();
        assertThat(otherCollectionResult.adoptedCount).isEqualTo(0);
        assertThat(await store.openSession().advanced.revisions.getCountFor(userId)).isEqualTo(11);

        const operation = await store.operations.send(new AdoptOrphanedRevisionsOperation());
        const result = await operation.waitForCompletion<AdoptOrphanedRevisionsResult>();
        assertThat(result.adoptedCount).isEqualTo(1);

        assertThat(await store.openSession().advanced.revisions.getCountFor(userId)).isEqualTo(12);
        assertThat(await lastRevisionFlags(userId)).contains("DeleteRevision");
    });

    it("throwsOnNullParameters", async () => {
        await assertThrows(() => new AdoptOrphanedRevisionsOperation(null),
            err => assertThat(err.name).isEqualTo("InvalidArgumentException"));
    });
});
