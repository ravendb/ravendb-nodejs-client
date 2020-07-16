import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { CreateDatabaseOperation, DatabaseRecord, GetDatabaseRecordOperation, IDocumentStore } from "../../../src";
import { ToggleDatabasesStateOperation } from "../../../src/Documents/Operations/ToggleDatabasesStateOperation";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { AddDatabaseNodeOperation } from "../../../src/ServerWide/Operations/AddDatabaseNodeOperation";

describe("DatabasesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canDisableAndEnableDatabase", async () => {
        const dbRecord: DatabaseRecord = {
            databaseName: "enableDisable"
        };

        const databaseOperation = new CreateDatabaseOperation(dbRecord);
        await store.maintenance.server.send(databaseOperation);

        let toggleResult = await store.maintenance.server.send(
            new ToggleDatabasesStateOperation("enableDisable", true));

        assertThat(toggleResult)
            .isNotNull();
        assertThat(toggleResult.name)
            .isNotNull();

        const disabledDatabaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation("enableDisable"));
        assertThat(disabledDatabaseRecord.disabled)
            .isTrue();

        // now enable database

        toggleResult = await store.maintenance.server.send(
            new ToggleDatabasesStateOperation("enableDisable", false));

        assertThat(toggleResult)
            .isNotNull();
        assertThat(toggleResult.name)
            .isNotNull();

        const enabledDatabaseRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation("enableDisable"));
        assertThat(enabledDatabaseRecord.disabled)
            .isFalse();
    });

    it("canAddNode", async () => {
        await assertThrows(async () => {
            // we assert this by throwing - we are running single node cluster
            await store.maintenance.server.send(new AddDatabaseNodeOperation(store.database));
        }, err => {
            assertThat(err.message)
                .contains("Can't add node");
        });
    });
});