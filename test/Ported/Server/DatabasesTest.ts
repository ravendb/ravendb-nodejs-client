import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import {
    CreateDatabaseOperation,
    DatabaseRecord,
    DeleteDatabasesOperation,
    GetDatabaseRecordOperation,
    IDocumentStore
} from "../../../src";
import { ToggleDatabasesStateOperation } from "../../../src/Documents/Operations/ToggleDatabasesStateOperation";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { AddDatabaseNodeOperation } from "../../../src/ServerWide/Operations/AddDatabaseNodeOperation";
import { Genre } from "../../Assets/Graph";

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

        try {
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
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [dbRecord.databaseName],
                hardDelete: true
            }));
        }
    });

    it("Cannot add node if single node cluster - database is on all nodes", async () => {
        await assertThrows(async () => {
            // we assert this by throwing - we are running single node cluster
            await store.maintenance.server.send(new AddDatabaseNodeOperation(store.database));
        }, err => {
            assertThat(err.message)
                .contains("already exists on all the nodes of the cluster");
        });
    });

    it("canGetInfoAutoIndexInfo", async () => {
        await testContext.samples.createMoviesData(store);

        {
            const session = store.openSession();

            await session.query(Genre)
                .whereEquals("name", "Fantasy")
                .all();
        }

        const record = await store.maintenance.server
            .send(new GetDatabaseRecordOperation(store.database));

        assertThat(record.autoIndexes)
            .hasSize(1);
        assertThat(Object.keys(record.autoIndexes))
            .contains("Auto/Genres/Byname");

        const autoIndexDefinition = record.autoIndexes["Auto/Genres/Byname"];
        assertThat(autoIndexDefinition)
            .isNotNull();

        assertThat(autoIndexDefinition.type)
            .isEqualTo("AutoMap");
        assertThat(autoIndexDefinition.name)
            .isEqualTo("Auto/Genres/Byname");
        assertThat(autoIndexDefinition.priority)
            .isEqualTo("Normal");
        assertThat(autoIndexDefinition.collection)
            .isEqualTo("Genres");
        assertThat(autoIndexDefinition.mapFields)
            .hasSize(1);
        assertThat(autoIndexDefinition.groupByFields)
            .hasSize(0);

        const fieldOptions = autoIndexDefinition.mapFields["name"];

        assertThat(fieldOptions.storage)
            .isEqualTo("No");
        assertThat(fieldOptions.indexing)
            .isEqualTo("Default");
        assertThat(fieldOptions.aggregation)
            .isEqualTo("None");
        assertThat(fieldOptions.spatial)
            .isNull();
        assertThat(fieldOptions.groupByArrayBehavior)
            .isEqualTo("NotApplicable");
        assertThat(fieldOptions.suggestions)
            .isFalse();
        assertThat(fieldOptions.isNameQuoted)
            .isFalse();
    });
});
