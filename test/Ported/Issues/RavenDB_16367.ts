import {
    CreateDatabaseOperation, DatabaseLockMode,
    DeleteDatabasesOperation,
    GetDatabaseRecordOperation,
    IDocumentStore, ToggleDatabasesStateOperation
} from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import {
    SetDatabasesLockOperation,
    SetDatabasesLockParameters
} from "../../../src/ServerWide/Operations/OngoingTasks/SetDatabasesLockOperation";


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
            databaseNames: [ databaseName1 ],
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
            databaseNames: [ databaseName1 ],
            hardDelete: true
        }));

        assertThat(result.raftCommandIndex)
            .isEqualTo(-1);

        databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName1));
        assertThat(databaseRecord)
            .isNotNull();
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
});

async function assertLockMode(store: IDocumentStore, databaseName: string, mode: DatabaseLockMode) {
    const databaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(databaseName));
    assertThat(databaseRecord.lockMode)
        .isEqualTo(mode);
}