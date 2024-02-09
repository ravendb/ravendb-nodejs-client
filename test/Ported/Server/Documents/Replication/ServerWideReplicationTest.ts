import {
    CreateDatabaseOperation, DeleteDatabasesOperation,
    ExternalReplication,
    GetDatabaseRecordOperation,
    IDocumentStore, PutConnectionStringOperation, RavenConnectionString, UpdateExternalReplicationOperation
} from "../../../../../src";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../Utils/TestUtil";
import { ServerWideExternalReplication } from "../../../../../src/ServerWide/Operations/OngoingTasks/ServerWideExternalReplication";
import { PutServerWideExternalReplicationOperation } from "../../../../../src/ServerWide/Operations/OngoingTasks/PutServerWideExternalReplicationOperation";
import { GetServerWideExternalReplicationOperation } from "../../../../../src/ServerWide/Operations/OngoingTasks/GetServerWideExternalReplicationOperation";
import { ServerWideExternalReplicationResponse } from "../../../../../src/ServerWide/Operations/OngoingTasks/ServerWideTaskResponse";
import { assertThat } from "../../../../Utils/AssertExtensions";
import { DeleteServerWideTaskOperation } from "../../../../../src/ServerWide/Operations/OngoingTasks/DeleteServerWideTaskOperation";
import { v4 as uuidv4 } from "uuid";
import { PutConnectionStringResult } from "../../../../../src/Documents/Operations/ConnectionStrings/PutConnectionStringOperation";

(RavenTestContext.isPullRequest ? describe.skip : describe)("ServerWideReplicationTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canStoreServerWideExternalReplication", async () => {
        const putConfiguration: ServerWideExternalReplication = {
            disabled: true,
            topologyDiscoveryUrls: store.urls,
            delayReplicationFor: "00:03:00",
            mentorNode: "A"
        };

        let result: ServerWideExternalReplicationResponse = await store.maintenance.server.send(new PutServerWideExternalReplicationOperation(putConfiguration));
        let serverWideConfiguration = await store.maintenance.server.send(new GetServerWideExternalReplicationOperation(result.name));
        assertThat(serverWideConfiguration)
            .isNotNull();

        try {
            validateServerWideConfiguration(serverWideConfiguration, putConfiguration);

            // the configuration is applied to existing databases

            let record1 = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
            const externalReplications1 = record1.externalReplications;
            assertThat(externalReplications1)
                .hasSize(1);

            validateConfiguration(serverWideConfiguration, externalReplications1[0], store.database);

            // the configuration is applied to new databases
            const newDbName = store.database + "-testDatabase";
            try {
                await store.maintenance.server.send(new CreateDatabaseOperation({
                    databaseName: newDbName
                }));
                const externalReplications = record1.externalReplications;
                assertThat(externalReplications)
                    .hasSize(1);

                let record2 = await store.maintenance.server.send(new GetDatabaseRecordOperation(newDbName));
                validateConfiguration(serverWideConfiguration, record2.externalReplications[0], newDbName);

                // update the external replication configuration

                putConfiguration.topologyDiscoveryUrls = [store.urls[0], "http://localhost:8080"];
                putConfiguration.name = serverWideConfiguration.name;

                result = await store.maintenance.server.send(new PutServerWideExternalReplicationOperation(putConfiguration));
                serverWideConfiguration = await store.maintenance.server.send(new GetServerWideExternalReplicationOperation(result.name));

                validateServerWideConfiguration(serverWideConfiguration, putConfiguration);

                record1 = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
                assertThat(record1.externalReplications)
                    .hasSize(1);
                validateConfiguration(serverWideConfiguration, record1.externalReplications[0], store.database);

                record2 = await store.maintenance.server.send(new GetDatabaseRecordOperation(newDbName));
                assertThat(record2.externalReplications)
                    .hasSize(1);

                validateConfiguration(serverWideConfiguration, record2.externalReplications[0], newDbName);
            } finally {
                await store.maintenance.server.send(new DeleteDatabasesOperation({
                    databaseNames: [newDbName],
                    hardDelete: true
                }));
            }
        } finally {
            await store.maintenance.server.send(new DeleteServerWideTaskOperation(serverWideConfiguration.name, "Replication"));
        }
    });

    it("canExcludeDatabase", async function () {
        const serverWideExternalReplication: ServerWideExternalReplication = {
            disabled: true,
            topologyDiscoveryUrls: store.urls
        };

        const result = await store.maintenance.server.send(new PutServerWideExternalReplicationOperation(serverWideExternalReplication));
        serverWideExternalReplication.name = result.name;

        try {
            let record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));

            assertThat(record.externalReplications)
                .hasSize(1);
            assertThat(record.ravenConnectionStrings)
                .hasSize(1);

            const dbName = "db/" + uuidv4();
            const csName = "cs/" + uuidv4();

            const connectionString: RavenConnectionString = {
                name: csName,
                type: "Raven",
                database: dbName,
                topologyDiscoveryUrls: [ "http://127.0.0.1:12345" ]
            };

            const putConnectionStringResult: PutConnectionStringResult = await store.maintenance.send(new PutConnectionStringOperation(connectionString));
            assertThat(putConnectionStringResult.raftCommandIndex > 0)
                .isGreaterThan(0);

            const externalReplication: ExternalReplication = {
                database: dbName,
                connectionStringName: csName,
                name: "Regular Task",
                disabled: true
            };

            await store.maintenance.send(new UpdateExternalReplicationOperation(externalReplication));

            record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));

            assertThat(record.externalReplications)
                .hasSize(2);
            assertThat(record.ravenConnectionStrings)
                .hasSize(2);

            serverWideExternalReplication.excludedDatabases = [ store.database ];
            await store.maintenance.server.send(new PutServerWideExternalReplicationOperation(serverWideExternalReplication));

            record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
            assertThat(record.externalReplications)
                .hasSize(1);
            assertThat(record.ravenConnectionStrings)
                .hasSize(1);
            assertThat(record.externalReplications[0].name)
                .isEqualTo(externalReplication.name);

        } finally {
            await store.maintenance.server.send(new DeleteServerWideTaskOperation(serverWideExternalReplication.name, "Replication"));
        }
    });
});

function validateServerWideConfiguration(serverWideConfiguration: ServerWideExternalReplication, putConfiguration: ServerWideExternalReplication) {
    if (putConfiguration.name) {
        assertThat(putConfiguration.name)
            .isEqualTo(serverWideConfiguration.name);
    }

    assertThat(putConfiguration.disabled)
        .isEqualTo(serverWideConfiguration.disabled);

    assertThat(putConfiguration.mentorNode)
        .isEqualTo(serverWideConfiguration.mentorNode);

    assertThat(putConfiguration.delayReplicationFor)
        .isEqualTo(serverWideConfiguration.delayReplicationFor);

    assertThat(putConfiguration.topologyDiscoveryUrls.join(","))
        .isEqualTo(serverWideConfiguration.topologyDiscoveryUrls.join(","));
}

function validateConfiguration(serverWideConfiguration: ServerWideExternalReplication, externalReplication: ExternalReplication, databaseName: string) {
    assertThat(externalReplication.name)
        .contains(serverWideConfiguration.name);

    assertThat(externalReplication.disabled)
        .isEqualTo(serverWideConfiguration.disabled);

    assertThat(externalReplication.mentorNode)
        .isEqualTo(serverWideConfiguration.mentorNode);

    assertThat(externalReplication.delayReplicationFor)
        .isEqualTo(serverWideConfiguration.delayReplicationFor);

    assertThat(externalReplication.database)
        .isEqualTo(databaseName);

    assertThat(externalReplication.connectionStringName)
        .contains(serverWideConfiguration.name);
}