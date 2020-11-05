import {
    GetStatisticsOperation,
    IDocumentStore,
    DatabaseSmugglerExportOptions,
    DatabaseSmugglerImportOptions
} from "../../src";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../Utils/TestUtil";
import { User } from "../Assets/Entities";
import { UsersByName } from "./QueryTest";
import { assertThat } from "../Utils/AssertExtensions";
import * as fs from "fs";
import { CONSTANTS } from "../../src/Constants";
import * as path from "path";
import { BackupUtils } from "../../src/Documents/Smuggler/BackupUtils";

describe("SmugglerTest", function () {

    let temporaryDirContext: TemporaryDirContext;
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        temporaryDirContext = new TemporaryDirContext();
    });

    afterEach(async () => {
        await disposeTestDocumentStore(store);
        temporaryDirContext.dispose();
    });

    it("can export database", async () => {
        await addUsers(store);

        const exportFile: string = path.join(temporaryDirContext.tempDir, "exported-db." + CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION);

        const options = new DatabaseSmugglerExportOptions();
        const operation = await store.smuggler.export(options, exportFile);
        await operation.waitForCompletion();

        assertThat(fs.existsSync(exportFile))
            .isTrue();
        assertThat(fs.statSync(exportFile).size)
            .isGreaterThan(0);
    });

    it("can import exported database", async () => {
        const exportFile: string = path.join(temporaryDirContext.tempDir, "exported-db-2." + CONSTANTS.Documents.PeriodicBackup.FULL_BACKUP_EXTENSION);

        const sourceStore = await testContext.getDocumentStore();

        try {
            await addUsers(sourceStore);

            const options = new DatabaseSmugglerExportOptions();
            const operation = await sourceStore.smuggler.export(options, exportFile);
            await operation.waitForCompletion();
        } finally {
            sourceStore.dispose();
        }

        const dstStore = await testContext.getDocumentStore();

        try {
            const options = new DatabaseSmugglerImportOptions()
            const operation = await dstStore.smuggler.import(options, exportFile);
            await operation.waitForCompletion();

            const stats = await dstStore.maintenance.send(new GetStatisticsOperation());
            assertThat(stats.countOfIndexes)
                .isEqualTo(1);
            assertThat(stats.countOfDocuments)
                .isEqualTo(3);
            assertThat(stats.countOfTimeSeriesSegments)
                .isEqualTo(1);
            assertThat(stats.countOfCounterEntries)
                .isEqualTo(1);
        } finally {
            dstStore.dispose();
        }
    });

    it("can use between option", async () => {
        const sourceStore = await testContext.getDocumentStore();

        try {
            await addUsers(sourceStore);

            const targetStore = await testContext.getDocumentStore();
            try {
                const options = new DatabaseSmugglerExportOptions();
                options.operateOnTypes = ["Documents"];
                const exportOperation = await sourceStore.smuggler.export(options, targetStore.smuggler);

                await exportOperation.waitForCompletion();

                const stats = await targetStore.maintenance.send(new GetStatisticsOperation());
                assertThat(stats.countOfIndexes)
                    .isEqualTo(0);  // we didn't request indexes to be copied
                assertThat(stats.countOfDocuments)
                    .isEqualTo(3);

            } finally {
                targetStore.dispose();
            }
        } finally {
            sourceStore.dispose();
        }
    });

    it("can sort files", () => {
        const files = [
            "2018-11-08-10-47.ravendb-incremental-backup",
            "2018-11-08-10-46.ravendb-incremental-backup",
            "2018-11-08-10-46.ravendb-full-backup"
        ];

        const sortedFiles = files.sort(BackupUtils.comparator);

        assertThat(sortedFiles[0])
            .isEqualTo("2018-11-08-10-46.ravendb-full-backup");
        assertThat(sortedFiles[1])
            .isEqualTo("2018-11-08-10-46.ravendb-incremental-backup");
        assertThat(sortedFiles[2])
            .isEqualTo("2018-11-08-10-47.ravendb-incremental-backup");
    })

    const addUsers = async (store: IDocumentStore) => {
        const session = store.openSession();

        const user1 = Object.assign(new User(), { name: "John", age: 3 });
        const user2 = Object.assign(new User(), { name: "Jane", age: 5 });
        const user3 = Object.assign(new User(), { name: "Tarzan", age: 2 });
        await session.store(user1, "users/1");
        await session.store(user2, "users/2");
        await session.store(user3, "users/3");

        session.countersFor("users/1")
            .increment("stars");

        session.timeSeriesFor("users/1", "Stars")
            .append(new Date(), 5);

        await session.saveChanges();

        await store.executeIndex(new UsersByName());
        await testContext.waitForIndexing(store);
    }
});
