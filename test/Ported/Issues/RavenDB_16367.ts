import {
    CreateDatabaseOperation,
    DatabaseLockMode,
    DeleteDatabasesOperation,
    GetDatabaseRecordOperation,
    SetDatabasesLockOperation,
    SetDatabasesLockParameters,
    IDocumentStore,
    ToggleDatabasesStateOperation,
    BackupOperation,
    IOperationResult,
    RestoreBackupConfiguration,
    RestoreBackupOperation
} from "../../../src/index.js";
import path from "node:path";
import { disposeTestDocumentStore, TemporaryDirContext, testContext } from "../../Utils/TestUtil.js";
import { Company } from "../../Assets/Entities.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";


describe("RavenDB_16367Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canLockDatabase", async () => {
        const databaseName1 = store.database + "_LockMode_1";

        await assertThrows(async () => {
            const lockOperation = new SetDatabasesLockOperation(databaseName1,"PreventDeletesError");
            await store.maintenance.server.send(lockOperation);
        }, err => {
            assertThat(err.name)
                .isEqualTo("DatabaseDoesNotExistException");
        });

        await store.maintenance.server.send(new CreateDatabaseOperation({
            databaseName: databaseName1
        }));

        try {

            let databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName1));
            assertThat(databaseRecord.lockMode)
                .isEqualTo("Unlock");

            await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName1, "Unlock"));

            databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName1));
            assertThat(databaseRecord.lockMode)
                .isEqualTo("Unlock");

            await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName1, "PreventDeletesError"));

            databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName1));
            assertThat(databaseRecord.lockMode)
                .isEqualTo("PreventDeletesError");

            await assertThrows(() => store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [databaseName1],
                hardDelete: true
            })), err => {
                assertThat(err.message)
                    .contains("cannot be deleted because of the set lock mode");
            });

            await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName1, "PreventDeletesIgnore"));

            databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName1));
            assertThat(databaseRecord.lockMode)
                .isEqualTo("PreventDeletesIgnore");

            const result = await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [databaseName1],
                hardDelete: true
            }));

            assertThat(result.raftCommandIndex)
                .isEqualTo(-1);

            databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName1));
            assertThat(databaseRecord)
                .isNotNull();
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [databaseName1],
                hardDelete: true
            }))
        }
    });

    it("canLockDatabase_Multiple", async function () {
        const databaseName1 = store.database + "_LockMode_1";
        const databaseName2 = store.database + "_LockMode_2";
        const databaseName3 = store.database + "_LockMode_3";

        const databases = [ databaseName1, databaseName2, databaseName3 ];

        await assertThrows(async () => {
            const parameters: SetDatabasesLockParameters = {
                databaseNames: databases,
                mode: "PreventDeletesError"
            };

            await store.maintenance.server.send(new SetDatabasesLockOperation(parameters));
        }, err => {
            assertThat(err.name)
                .isEqualTo("DatabaseDoesNotExistException");
        });

        await store.maintenance.server.send(new CreateDatabaseOperation({
            databaseName: databaseName1
        }));

        await assertThrows(async () => {
            const parameters: SetDatabasesLockParameters = {
                databaseNames: databases,
                mode: "PreventDeletesError"
            };

            await store.maintenance.server.send(new SetDatabasesLockOperation(parameters));
        }, err => {
            assertThat(err.name)
                .isEqualTo("DatabaseDoesNotExistException");
        });

        await assertLockMode(store, databaseName1, "Unlock");

        await store.maintenance.server.send(new CreateDatabaseOperation({
            databaseName: databaseName2
        }));
        await store.maintenance.server.send(new CreateDatabaseOperation({
            databaseName: databaseName3
        }));

        await assertLockMode(store, databaseName2, "Unlock");
        await assertLockMode(store, databaseName3, "Unlock");

        const p2: SetDatabasesLockParameters = {
            databaseNames: databases,
            mode: "PreventDeletesError"
        };
        await store.maintenance.server.send(new SetDatabasesLockOperation(p2));

        await assertLockMode(store, databaseName1, "PreventDeletesError");
        await assertLockMode(store, databaseName2, "PreventDeletesError");
        await assertLockMode(store, databaseName3, "PreventDeletesError");

        await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName2, "PreventDeletesIgnore"));

        await assertLockMode(store, databaseName1, "PreventDeletesError");
        await assertLockMode(store, databaseName2, "PreventDeletesIgnore");
        await assertLockMode(store, databaseName3, "PreventDeletesError");

        p2.databaseNames = databases;
        p2.mode = "PreventDeletesIgnore";

        await store.maintenance.server.send(new SetDatabasesLockOperation(p2));

        await assertLockMode(store, databaseName1, "PreventDeletesIgnore");
        await assertLockMode(store, databaseName2, "PreventDeletesIgnore");
        await assertLockMode(store, databaseName3, "PreventDeletesIgnore");

        p2.databaseNames = databases;
        p2.mode = "Unlock";

        await store.maintenance.server.send(new SetDatabasesLockOperation(p2));

        await store.maintenance.server.send(new DeleteDatabasesOperation({
            databaseNames: [ databaseName1 ],
            hardDelete: true
        }));
        await store.maintenance.server.send(new DeleteDatabasesOperation({
            databaseNames: [ databaseName2 ],
            hardDelete: true
        }));
        await store.maintenance.server.send(new DeleteDatabasesOperation({
            databaseNames: [ databaseName3 ],
            hardDelete: true
        }));
    });

    it("canLockDatabase_Disabled", async () => {
        const databaseName = store.database + "_LockMode_1";

        await store.maintenance.server.send(new CreateDatabaseOperation({
            databaseName
        }));

        await assertLockMode(store, databaseName, "Unlock");

        await store.maintenance.server.send(new ToggleDatabasesStateOperation(databaseName, true));

        await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName, "PreventDeletesError"));

        await assertLockMode(store, databaseName, "PreventDeletesError");

        await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName, "Unlock"));

        await store.maintenance.server.send(new DeleteDatabasesOperation({
            databaseNames: [ databaseName ],
            hardDelete: true
        }));
    });

    it("canLockDatabase_Backup_Restore", async () => {
        const temporaryDirContext = new TemporaryDirContext();
        const backupPath = path.join(temporaryDirContext.tempDir, "backup");
        const databaseName1 = store.database + "_LockMode_1";
        const databaseName2 = store.database + "_LockMode_2";

        try {
            await store.maintenance.server.send(new CreateDatabaseOperation({
                databaseName: databaseName1,
                lockMode: "PreventDeletesError"
            }));

            await assertLockMode(store, databaseName1, "PreventDeletesError");

            const session = store.openSession(databaseName1);
            await session.store(Object.assign(new Company(), { name: "HR" }));
            await session.saveChanges();

            const operation = await store.maintenance.forDatabase(databaseName1).send(new BackupOperation({
                localSettings: {
                    folderPath: backupPath
                }
            }));

            const result = await operation.waitForCompletion<BackupResult>(30_000);

            await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName1, "Unlock"));
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [ databaseName1 ],
                hardDelete: true
            }));

            const restoreOperation = await store.maintenance.server.send(new RestoreBackupOperation({
                databaseName: databaseName2,
                backupLocation: path.join(backupPath, result.localBackup.backupDirectory),
                type: "Local"
            } as RestoreBackupConfiguration));
            await restoreOperation.waitForCompletion(30_000);

            await assertLockMode(store, databaseName2, "PreventDeletesError");

            await assertThrows(() => store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [ databaseName2 ],
                hardDelete: true
            })), err => {
                assertThat(err.message)
                    .contains("cannot be deleted because of the set lock mode ('PreventDeletesError')");
            });

            await store.maintenance.server.send(new SetDatabasesLockOperation(databaseName2, "Unlock"));
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [ databaseName2 ],
                hardDelete: true
            }));
            temporaryDirContext.dispose();
        }
    });
});

interface BackupResult extends IOperationResult {
    localBackup: {
        backupDirectory: string;
    };
}

async function assertLockMode(store: IDocumentStore, databaseName: string, mode: DatabaseLockMode) {
    const databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName));
    assertThat(databaseRecord.lockMode)
        .isEqualTo(mode);
}